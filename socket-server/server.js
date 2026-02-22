/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const SOCKET_PROTOCOL_VERSION = 1;
const DEDUPE_TTL_MS = 1000 * 60 * 5;
const MAX_EVENT_LOG = 300;
const MAX_CANVAS_PAYLOAD_CHARS = 1_500_000;

const ENABLE_REDIS_ADAPTER = process.env.WS_REDIS_ADAPTER_ENABLED === 'true';
const ENABLE_AUDIT_LOG = process.env.WS_AUDIT_LOG_ENABLED === 'true';

const RATE_LIMITS = {
  join_battle: { limit: 5, windowMs: 60_000 },
  leave_battle: { limit: 20, windowMs: 60_000 },
  start_battle: { limit: 3, windowMs: 60_000 },
  canvas_update: { limit: 30, windowMs: 1_000 },
  vote: { limit: 10, windowMs: 60_000 },
  chat_message: { limit: 8, windowMs: 10_000 },
  ready_status: { limit: 15, windowMs: 10_000 },
};

const metrics = {
  ws_connections_total: 0,
  ws_disconnect_total: 0,
  ws_events_total: {},
  rate_limit_hits_total: {},
  ws_errors_total: 0,
  reconnect_resume_total: 0,
};

function bumpCounter(group, key = 'total', by = 1) {
  metrics[group] = metrics[group] || {};
  metrics[group][key] = (metrics[group][key] || 0) + by;
}

function log(level, message, context = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    service: 'socket-server',
    message,
    ...context,
  };

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
    return;
  }

  console.log(line);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  log('error', 'Missing Supabase env vars', {
    required: ['SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)', 'SUPABASE_SERVICE_ROLE_KEY'],
  });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const battles = {};
const socketToUser = new Map();
const socketToBattleIds = new Map();
const rateLimitBuckets = new Map();

async function setupRedisAdapter() {
  if (!ENABLE_REDIS_ADAPTER) {
    log('info', 'Redis adapter disabled by config');
    return;
  }

  if (!process.env.REDIS_URL) {
    log('warn', 'Redis adapter enabled but REDIS_URL missing');
    return;
  }

  try {
    const { createAdapter } = require('@socket.io/redis-adapter');
    const Redis = require('ioredis');

    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();

    io.adapter(createAdapter(pubClient, subClient));

    pubClient.on('error', (error) => {
      log('error', 'Redis pub client error', { error: error.message });
    });

    subClient.on('error', (error) => {
      log('error', 'Redis sub client error', { error: error.message });
    });

    log('info', 'Redis adapter enabled');
  } catch (error) {
    log('warn', 'Redis adapter unavailable; continuing in single-node mode', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function safeString(value, fallback = '') {
  if (typeof value === 'string') return value;
  return fallback;
}

function createCodeError(code, error, retryable = false) {
  return { code, error, retryable };
}

function emitAck(ack, ok, extra = {}) {
  if (typeof ack === 'function') {
    ack({ ok, ...extra });
  }
}

function getUserId(socket) {
  return socketToUser.get(socket.id);
}

function getSafeUsername(socket, userId) {
  const email = socket.data.user?.email || '';
  return email || `user-${userId.slice(0, 6)}`;
}

function getOrCreateBattleState(battleId) {
  if (!battles[battleId]) {
    battles[battleId] = {
      id: battleId,
      timer: null,
      timeLeft: 0,
      status: 'waiting',
      participants: new Set(),
      hostId: null,
      participantData: {},
      votes: {},
      seq: 0,
      dedupe: new Map(),
      events: [],
      rolesByUser: {},
      topic: null,
    };
  }

  return battles[battleId];
}

function cleanupDedupe(state) {
  const now = Date.now();
  for (const [opId, entry] of state.dedupe.entries()) {
    if (now - entry.ts > DEDUPE_TTL_MS) {
      state.dedupe.delete(opId);
    }
  }
}

function registerOperation(state, opId, clientSeq) {
  cleanupDedupe(state);

  if (opId && state.dedupe.has(opId)) {
    return {
      seq: state.dedupe.get(opId).seq,
      deduped: true,
    };
  }

  const nextSeq = Number.isInteger(clientSeq)
    ? Math.max(state.seq + 1, Number(clientSeq))
    : state.seq + 1;

  state.seq = nextSeq;

  if (opId) {
    state.dedupe.set(opId, { seq: nextSeq, ts: Date.now() });
  }

  return {
    seq: nextSeq,
    deduped: false,
  };
}

function appendBattleEvent(state, event) {
  state.events.push(event);
  if (state.events.length > MAX_EVENT_LOG) {
    state.events.splice(0, state.events.length - MAX_EVENT_LOG);
  }
}

function normalizeBattleResult(state) {
  const participantData = state.participantData || {};
  const votesByTarget = state.votes || {};

  const paintings = Object.entries(participantData).map(([uid, data]) => {
    const voteCount = Object.values(votesByTarget).filter((target) => target === uid).length;
    return {
      userId: uid,
      username: data.username || uid,
      imageUrl: data.imageData || '',
      votes: voteCount,
    };
  });

  let winner;
  if (paintings.length > 0) {
    const topVotes = Math.max(...paintings.map((entry) => entry.votes));
    const leaders = paintings.filter((entry) => entry.votes === topVotes);
    winner = leaders.length === 1 ? leaders[0] : undefined;
  }

  return {
    battleId: state.id,
    paintings,
    winner,
  };
}

function validateEnvelope(payload, expectedEvent, battleIdRequired = true) {
  if (!payload || typeof payload !== 'object') {
    return createCodeError('BAD_REQUEST', 'Invalid payload');
  }

  if (payload.v !== undefined && payload.v !== SOCKET_PROTOCOL_VERSION) {
    return createCodeError('BAD_REQUEST', 'Unsupported protocol version');
  }

  if (expectedEvent && payload.event && payload.event !== expectedEvent) {
    return createCodeError('BAD_REQUEST', `Unexpected event ${payload.event}`);
  }

  if (battleIdRequired && !safeString(payload.battleId || payload.battle_id || payload.id)) {
    return createCodeError('BAD_REQUEST', 'battleId is required');
  }

  return null;
}

function getBattleId(data) {
  return safeString(data?.battleId || data?.battle_id || data?.id);
}

function getEventPayload(data) {
  if (!data || typeof data !== 'object') return {};
  if (data.payload && typeof data.payload === 'object') return data.payload;
  return data;
}

function consumeRateLimit(eventType, battleId, userId) {
  const config = RATE_LIMITS[eventType];
  if (!config || !battleId || !userId) {
    return { limited: false };
  }

  const key = `${eventType}:${battleId}:${userId}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const recentHits = (rateLimitBuckets.get(key) || []).filter((ts) => ts > windowStart);
  if (recentHits.length >= config.limit) {
    bumpCounter('rate_limit_hits_total', eventType, 1);
    return { limited: true };
  }

  recentHits.push(now);
  rateLimitBuckets.set(key, recentHits);
  return { limited: false };
}

async function ensureBattleMembership(battleId, userId) {
  const { count, error } = await supabase
    .from('battle_participants')
    .select('*', { count: 'exact', head: true })
    .eq('battle_id', battleId)
    .eq('user_id', userId);

  if (error) {
    return { ok: false, error: createCodeError('INTERNAL_ERROR', 'Membership lookup failed') };
  }

  if (!count) {
    return { ok: false, error: createCodeError('FORBIDDEN', 'Battle membership required') };
  }

  return { ok: true };
}

function authorizeRole(state, userId, eventType) {
  const role = state.rolesByUser[userId] || 'spectator';

  if (eventType === 'start_battle' && role !== 'host' && role !== 'moderator') {
    return createCodeError('FORBIDDEN', 'Only host can start battle');
  }

  if (['canvas_update', 'vote', 'chat_message', 'ready_status'].includes(eventType) && role === 'spectator') {
    return createCodeError('FORBIDDEN', 'Spectator cannot perform this action');
  }

  return null;
}

async function persistBattleEvent(battleId, actorId, eventType, payload, requestId) {
  if (!ENABLE_AUDIT_LOG) {
    return;
  }

  try {
    await supabase.from('battle_events').insert({
      battle_id: battleId,
      actor_id: actorId,
      event_type: eventType,
      payload,
      request_id: requestId,
    });
  } catch (error) {
    log('warn', 'Failed to persist battle event (audit scaffold)', {
      battleId,
      actorId,
      eventType,
      error: error instanceof Error ? error.message : String(error),
      requestId,
    });
  }
}

app.get('/healthz', (_req, res) => {
  const activeRooms = Object.values(battles).filter((battle) => battle.participants.size > 0).length;
  res.status(200).json({
    ok: true,
    service: 'socket-server',
    activeRooms,
    wsConnections: socketToUser.size,
    redisAdapterEnabled: ENABLE_REDIS_ADAPTER,
    timestamp: new Date().toISOString(),
  });
});

app.get('/metrics', (_req, res) => {
  res.status(200).json(metrics);
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake?.auth?.token;
    if (!token) {
      return next(new Error('Unauthorized: missing access token'));
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return next(new Error('Unauthorized: invalid access token'));
    }

    socket.data.user = {
      id: data.user.id,
      email: data.user.email || null,
    };

    return next();
  } catch {
    return next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  const authUser = socket.data.user;
  socketToUser.set(socket.id, authUser.id);
  socketToBattleIds.set(socket.id, new Set());
  metrics.ws_connections_total += 1;

  log('info', 'Socket connected', {
    connectionId: socket.id,
    userId: authUser.id,
  });

  socket.on('join_battle', async (rawData = {}, ack) => {
    bumpCounter('ws_events_total', 'join_battle', 1);

    const envelopeError = validateEnvelope(rawData, 'join_battle');
    if (envelopeError) {
      emitAck(ack, false, envelopeError);
      return;
    }

    const battleId = getBattleId(rawData);
    const userId = getUserId(socket);
    const requestId = safeString(rawData.ackId, `ack-${Date.now()}`);

    if (!battleId || !userId) {
      emitAck(ack, false, createCodeError('AUTH_REQUIRED', 'battleId or user not found'));
      return;
    }

    if (consumeRateLimit('join_battle', battleId, userId).limited) {
      emitAck(ack, false, createCodeError('RATE_LIMITED', 'Too many join attempts', true));
      return;
    }

    const { data: battleRow, error: battleError } = await supabase
      .from('battles')
      .select('id, host_id, status, time_limit, topic')
      .eq('id', battleId)
      .maybeSingle();

    if (battleError || !battleRow) {
      emitAck(ack, false, createCodeError('NOT_FOUND', 'Battle not found'));
      return;
    }

    const membershipCheck = await ensureBattleMembership(battleId, userId);
    if (!membershipCheck.ok) {
      emitAck(ack, false, membershipCheck.error);
      return;
    }

    socket.join(battleId);
    socketToBattleIds.get(socket.id)?.add(battleId);

    const battle = getOrCreateBattleState(battleId);
    battle.hostId = battleRow.host_id;
    battle.status = battleRow.status;
    battle.timeLeft = battle.timeLeft > 0 ? battle.timeLeft : battleRow.time_limit;
    battle.topic = battleRow.topic;
    battle.participants.add(socket.id);

    battle.rolesByUser[userId] = userId === battle.hostId ? 'host' : 'participant';

    if (!battle.participantData[userId]) {
      const eventPayload = getEventPayload(rawData);
      battle.participantData[userId] = {
        username:
          safeString(eventPayload.user?.username) ||
          safeString(eventPayload.user?.displayName) ||
          getSafeUsername(socket, userId),
        imageData: null,
      };
    }

    const opId = safeString(rawData.opId, `join-${userId}`);
    const op = registerOperation(battle, opId, rawData.seq);

    const joinEvent = {
      type: 'join',
      payload: {
        user: {
          id: userId,
          username: battle.participantData[userId].username,
          displayName: battle.participantData[userId].username,
          avatarUrl: null,
          isHost: userId === battle.hostId,
          isReady: false,
        },
        seq: op.seq,
        opId,
      },
    };

    appendBattleEvent(battle, { seq: op.seq, type: 'join', userId, opId, payload: joinEvent, ts: Date.now() });
    socket.to(battleId).emit('battle_event', joinEvent);

    if (battle.status === 'in_progress') {
      socket.emit('battle_event', {
        type: 'timer_sync',
        payload: { timeLeft: battle.timeLeft, seq: battle.seq },
      });
    }

    await persistBattleEvent(battleId, userId, 'join', { seq: op.seq }, requestId);
    emitAck(ack, true, { seq: op.seq, opId, ackId: requestId });
  });

  socket.on('leave_battle', async (rawData = {}, ack) => {
    bumpCounter('ws_events_total', 'leave_battle', 1);

    const envelopeError = validateEnvelope(rawData, 'leave_battle');
    if (envelopeError) {
      emitAck(ack, false, envelopeError);
      return;
    }

    const battleId = getBattleId(rawData);
    const userId = getUserId(socket);

    if (!battleId || !userId) {
      emitAck(ack, false, createCodeError('AUTH_REQUIRED', 'battleId or user not found'));
      return;
    }

    if (consumeRateLimit('leave_battle', battleId, userId).limited) {
      emitAck(ack, false, createCodeError('RATE_LIMITED', 'Too many leave attempts', true));
      return;
    }

    const battle = battles[battleId];
    if (!battle) {
      emitAck(ack, false, createCodeError('NOT_FOUND', 'Battle state not found'));
      return;
    }

    socket.leave(battleId);
    socketToBattleIds.get(socket.id)?.delete(battleId);

    battle.participants.delete(socket.id);

    const opId = safeString(rawData.opId, `leave-${userId}`);
    const op = registerOperation(battle, opId, rawData.seq);

    const leaveEvent = {
      type: 'leave',
      payload: {
        userId,
        seq: op.seq,
        opId,
      },
    };

    appendBattleEvent(battle, { seq: op.seq, type: 'leave', userId, opId, payload: leaveEvent, ts: Date.now() });
    io.to(battleId).emit('battle_event', leaveEvent);

    emitAck(ack, true, { seq: op.seq, opId, ackId: safeString(rawData.ackId) });
  });

  socket.on('ready_status', (rawData = {}, ack) => {
    bumpCounter('ws_events_total', 'ready_status', 1);

    const battleId = getBattleId(rawData);
    const userId = getUserId(socket);

    if (!battleId || !userId || !socket.rooms.has(battleId)) {
      emitAck(ack, false, createCodeError('FORBIDDEN', '권한이 없거나 방에 없습니다'));
      return;
    }

    if (consumeRateLimit('ready_status', battleId, userId).limited) {
      emitAck(ack, false, createCodeError('RATE_LIMITED', '준비 상태 변경 요청이 너무 많습니다', true));
      return;
    }

    const battle = getOrCreateBattleState(battleId);
    const authzError = authorizeRole(battle, userId, 'ready_status');
    if (authzError) {
      emitAck(ack, false, authzError);
      return;
    }

    const opId = safeString(rawData.opId, `ready-${userId}`);
    const op = registerOperation(battle, opId, rawData.seq);

    const readyEvent = {
      type: 'ready',
      payload: {
        userId,
        isReady: Boolean(rawData.isReady),
        seq: op.seq,
        opId,
      },
    };

    appendBattleEvent(battle, { seq: op.seq, type: 'ready', userId, opId, payload: readyEvent, ts: Date.now() });
    io.to(battleId).emit('battle_event', readyEvent);

    emitAck(ack, true, { seq: op.seq, opId });
  });

  socket.on('chat_message', async (rawData = {}, ack) => {
    bumpCounter('ws_events_total', 'chat_message', 1);

    const battleId = safeString(rawData.battleId);
    const content = safeString(rawData.content).slice(0, 500);
    const userId = getUserId(socket);

    if (!battleId || !userId || !socket.rooms.has(battleId)) {
      emitAck(ack, false, createCodeError('FORBIDDEN', '권한이 없거나 방에 없습니다'));
      return;
    }

    if (!content.trim()) {
      emitAck(ack, false, createCodeError('BAD_REQUEST', '메시지는 비어 있을 수 없습니다'));
      return;
    }

    if (consumeRateLimit('chat_message', battleId, userId).limited) {
      emitAck(ack, false, createCodeError('RATE_LIMITED', '채팅 전송이 너무 빠릅니다', true));
      return;
    }

    const battle = getOrCreateBattleState(battleId);
    const authzError = authorizeRole(battle, userId, 'chat_message');
    if (authzError) {
      emitAck(ack, false, authzError);
      return;
    }

    const eventPayload = {
      type: 'chat',
      payload: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        battleId,
        userId,
        username: getSafeUsername(socket, userId),
        content,
        type: rawData.type || 'message',
        timestamp: new Date().toISOString(),
      },
    };

    io.to(battleId).emit('battle_event', eventPayload);

    await persistBattleEvent(battleId, userId, 'chat', { content }, safeString(rawData.ackId));
    emitAck(ack, true);
  });

  socket.on('draw_event', (data = {}) => {
    bumpCounter('ws_events_total', 'draw_event', 1);

    const battleId = safeString(data.battleId);
    const userId = getUserId(socket);

    if (!battleId || !userId || !socket.rooms.has(battleId)) return;

    socket.to(battleId).emit('draw_event', {
      battleId,
      userId,
      event: data.event,
    });
  });

  socket.on('canvas_update', async (rawData = {}, ack) => {
    bumpCounter('ws_events_total', 'canvas_update', 1);

    const envelopeError = validateEnvelope(rawData, 'canvas_update');
    if (envelopeError) {
      emitAck(ack, false, envelopeError);
      return;
    }

    const battleId = getBattleId(rawData);
    const senderId = getUserId(socket);
    const payload = getEventPayload(rawData);
    const imageData = safeString(payload.imageData || rawData.imageData);

    if (!battleId || !senderId || !socket.rooms.has(battleId)) {
      emitAck(ack, false, createCodeError('FORBIDDEN', '권한이 없거나 방에 없습니다'));
      return;
    }

    if (!imageData || imageData.length > MAX_CANVAS_PAYLOAD_CHARS) {
      emitAck(ack, false, createCodeError('VALIDATION_ERROR', 'canvas payload too large'));
      return;
    }

    if (consumeRateLimit('canvas_update', battleId, senderId).limited) {
      emitAck(ack, false, createCodeError('RATE_LIMITED', 'draw event rate exceeded', true));
      return;
    }

    const battle = getOrCreateBattleState(battleId);
    const authzError = authorizeRole(battle, senderId, 'canvas_update');
    if (authzError) {
      emitAck(ack, false, authzError);
      return;
    }

    const opId = safeString(rawData.opId, `canvas-${senderId}-${Date.now()}`);
    const op = registerOperation(battle, opId, rawData.seq);

    if (!battle.participantData[senderId]) {
      battle.participantData[senderId] = {
        username: getSafeUsername(socket, senderId),
        imageData: null,
      };
    }

    battle.participantData[senderId].imageData = imageData;

    if (!op.deduped) {
      const canvasEvent = {
        type: 'canvas_update',
        payload: {
          userId: senderId,
          imageData,
          seq: op.seq,
          opId,
        },
      };

      appendBattleEvent(battle, {
        seq: op.seq,
        type: 'canvas_update',
        userId: senderId,
        opId,
        payload: canvasEvent,
        ts: Date.now(),
      });

      socket.to(battleId).emit('battle_event', canvasEvent);
    }

    await persistBattleEvent(battleId, senderId, 'canvas_update', { seq: op.seq, opId }, safeString(rawData.ackId));
    emitAck(ack, true, { seq: op.seq, opId, ackId: safeString(rawData.ackId) });
  });

  socket.on('vote', async (rawData = {}, ack) => {
    bumpCounter('ws_events_total', 'vote', 1);

    const envelopeError = validateEnvelope(rawData, 'vote');
    if (envelopeError) {
      emitAck(ack, false, envelopeError);
      return;
    }

    const battleId = getBattleId(rawData);
    const voterId = getUserId(socket);
    const payload = getEventPayload(rawData);
    const paintingUserId = safeString(payload.paintingUserId || rawData.paintingUserId);

    if (!battleId || !voterId || !socket.rooms.has(battleId)) {
      emitAck(ack, false, createCodeError('FORBIDDEN', '권한이 없거나 방에 없습니다'));
      return;
    }

    if (!paintingUserId || voterId === paintingUserId) {
      emitAck(ack, false, createCodeError('BAD_REQUEST', '잘못된 투표 요청입니다'));
      return;
    }

    if (consumeRateLimit('vote', battleId, voterId).limited) {
      emitAck(ack, false, createCodeError('RATE_LIMITED', '투표 요청이 너무 많습니다', true));
      return;
    }

    const battle = getOrCreateBattleState(battleId);
    const authzError = authorizeRole(battle, voterId, 'vote');
    if (authzError) {
      emitAck(ack, false, authzError);
      return;
    }

    if (battle.status !== 'finished') {
      emitAck(ack, false, createCodeError('BAD_REQUEST', '배틀이 종료된 이후에만 투표할 수 있습니다'));
      return;
    }

    if (!battle.participantData[paintingUserId]) {
      emitAck(ack, false, createCodeError('BAD_REQUEST', '대상 참가자를 찾을 수 없습니다'));
      return;
    }

    const opId = safeString(rawData.opId, `vote-${voterId}-${Date.now()}`);
    const op = registerOperation(battle, opId, rawData.seq);

    battle.votes = battle.votes || {};
    battle.votes[voterId] = paintingUserId;

    const voteEvent = {
      type: 'vote',
      payload: {
        voterId,
        paintingUserId,
        seq: op.seq,
        opId,
      },
    };

    appendBattleEvent(battle, { seq: op.seq, type: 'vote', userId: voterId, opId, payload: voteEvent, ts: Date.now() });
    io.to(battleId).emit('battle_event', voteEvent);

    io.to(battleId).emit('battle_event', {
      type: 'finish',
      payload: normalizeBattleResult(battle),
    });

    await persistBattleEvent(battleId, voterId, 'vote', { paintingUserId, seq: op.seq }, safeString(rawData.ackId));
    emitAck(ack, true, { seq: op.seq, opId });
  });

  socket.on('start_battle', async (rawData = {}, ack) => {
    bumpCounter('ws_events_total', 'start_battle', 1);

    const envelopeError = validateEnvelope(rawData, 'start_battle');
    if (envelopeError) {
      emitAck(ack, false, envelopeError);
      return;
    }

    const battleId = getBattleId(rawData);
    const userId = getUserId(socket);

    if (!battleId || !userId) {
      emitAck(ack, false, createCodeError('AUTH_REQUIRED', 'battleId or user not found'));
      return;
    }

    if (consumeRateLimit('start_battle', battleId, userId).limited) {
      emitAck(ack, false, createCodeError('RATE_LIMITED', '배틀 시작 요청이 너무 많습니다', true));
      return;
    }

    try {
      const { data: battleRow, error } = await supabase
        .from('battles')
        .select('id, host_id, status, topic, time_limit')
        .eq('id', battleId)
        .single();

      if (error || !battleRow) {
        emitAck(ack, false, createCodeError('NOT_FOUND', 'Battle not found'));
        return;
      }

      if (battleRow.host_id !== userId) {
        emitAck(ack, false, createCodeError('FORBIDDEN', 'Only host can start battle'));
        return;
      }

      const battle = getOrCreateBattleState(battleId);
      battle.hostId = battleRow.host_id;
      battle.rolesByUser[userId] = 'host';

      const authzError = authorizeRole(battle, userId, 'start_battle');
      if (authzError) {
        emitAck(ack, false, authzError);
        return;
      }

      const opId = safeString(rawData.opId, `start-${userId}-${Date.now()}`);
      const op = registerOperation(battle, opId, rawData.seq);

      let currentTopic = battleRow.topic;
      if (!currentTopic) {
        const { data: topics } = await supabase.from('topics').select('content').limit(100);
        if (topics && topics.length > 0) {
          const randomTopic = topics[Math.floor(Math.random() * topics.length)];
          currentTopic = randomTopic.content;
        } else {
          currentTopic = '무작위 주제';
        }
      }

      await supabase
        .from('battles')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          topic: currentTopic,
        })
        .eq('id', battleId);

      battle.status = 'in_progress';
      battle.topic = currentTopic;
      battle.timeLeft = battleRow.time_limit;

      const startEvent = {
        type: 'start',
        payload: {
          topic: currentTopic,
          startedAt: new Date().toISOString(),
          duration: battleRow.time_limit,
          seq: op.seq,
          opId,
        },
      };

      appendBattleEvent(battle, { seq: op.seq, type: 'start', userId, opId, payload: startEvent, ts: Date.now() });
      io.to(battleId).emit('battle_event', startEvent);

      if (battle.timer) {
        clearInterval(battle.timer);
      }

      battle.timer = setInterval(async () => {
        const current = battles[battleId];
        if (!current) return;

        current.timeLeft -= 1;

        if (current.timeLeft <= 0) {
          clearInterval(current.timer);
          current.status = 'finished';

          await supabase
            .from('battles')
            .update({
              status: 'finished',
              ended_at: new Date().toISOString(),
            })
            .eq('id', battleId);

          const finishOp = registerOperation(current, `finish-${Date.now()}`);
          const finishEvent = {
            type: 'finish',
            payload: normalizeBattleResult(current),
          };

          appendBattleEvent(current, {
            seq: finishOp.seq,
            type: 'finish',
            userId,
            opId: `finish-${finishOp.seq}`,
            payload: finishEvent,
            ts: Date.now(),
          });

          io.to(battleId).emit('battle_event', finishEvent);
          return;
        }

        io.to(battleId).emit('battle_event', {
          type: 'timer_sync',
          payload: { timeLeft: current.timeLeft, seq: current.seq },
        });
      }, 1000);

      await persistBattleEvent(battleId, userId, 'start', { seq: op.seq, opId }, safeString(rawData.ackId));
      emitAck(ack, true, { seq: op.seq, opId });
    } catch (error) {
      metrics.ws_errors_total += 1;
      emitAck(ack, false, createCodeError('INTERNAL_ERROR', error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  });

  socket.on('resume_battle', (rawData = {}, ack) => {
    bumpCounter('ws_events_total', 'resume_battle', 1);
    metrics.reconnect_resume_total += 1;

    const battleId = safeString(rawData.battleId);
    const userId = getUserId(socket);
    const lastSeq = Number.isInteger(rawData.lastSeq) ? Number(rawData.lastSeq) : 0;

    if (!battleId || !userId || !socket.rooms.has(battleId)) {
      emitAck(ack, false, createCodeError('FORBIDDEN', '권한이 없거나 방에 없습니다'));
      return;
    }

    const battle = getOrCreateBattleState(battleId);

    const missedEvents = battle.events
      .filter((entry) => entry.seq > lastSeq)
      .map((entry) => entry.payload)
      .filter(Boolean);

    socket.emit('battle_resume_state', {
      battleId,
      serverSeq: battle.seq,
      status: battle.status,
      timeLeft: battle.timeLeft,
      missedEvents,
      snapshotByUser: Object.fromEntries(
        Object.entries(battle.participantData || {}).map(([participantId, data]) => [
          participantId,
          data.imageData || null,
        ])
      ),
    });

    emitAck(ack, true, { seq: battle.seq });
  });

  socket.on('disconnect', () => {
    metrics.ws_disconnect_total += 1;

    const userId = getUserId(socket);
    const battleIds = socketToBattleIds.get(socket.id) || new Set();

    for (const roomId of battleIds) {
      const battle = battles[roomId];
      if (!battle) continue;

      battle.participants.delete(socket.id);

      if (!userId) continue;

      const op = registerOperation(battle, `disconnect-${socket.id}-${Date.now()}`);
      const leaveEvent = {
        type: 'leave',
        payload: {
          userId,
          seq: op.seq,
          opId: `disconnect-${op.seq}`,
        },
      };

      appendBattleEvent(battle, {
        seq: op.seq,
        type: 'leave',
        userId,
        opId: `disconnect-${op.seq}`,
        payload: leaveEvent,
        ts: Date.now(),
      });

      io.to(roomId).emit('battle_event', leaveEvent);
    }

    socketToUser.delete(socket.id);
    socketToBattleIds.delete(socket.id);

    log('info', 'Socket disconnected', {
      connectionId: socket.id,
      userId,
      remainingConnections: socketToUser.size,
    });
  });
});

const PORT = process.env.PORT || 3001;

setupRedisAdapter().finally(() => {
  server.listen(PORT, () => {
    log('info', 'Socket server listening', { port: PORT });
  });
});
