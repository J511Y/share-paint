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

// Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Socket] Missing Supabase env vars: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory battle state for realtime coordination.
const battles = {};
const socketToUser = new Map();
const socketRateBuckets = new Map();

// battles[battleId] = {
//   timer: NodeJS.Timeout,
//   timeLeft: number,
//   status: 'waiting' | 'in_progress' | 'finished',
//   participants: Set<string>,
//   hostId: string,
//   participantData: { userId: { username, imageData, votes } },
//   votes: { voterId: targetUserId },
// }

function isGuestId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9:-]{8,128}$/.test(value);
}

io.use(async (socket, next) => {
  try {
    const token = socket.handshake?.auth?.token;
    const guestId = socket.handshake?.auth?.guestId;
    const guestName = socket.handshake?.auth?.guestName;

    if (token) {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) {
        return next(new Error('Unauthorized: invalid access token'));
      }

      socket.data.user = {
        id: data.user.id,
        email: data.user.email || null,
      };

      socket.data.actor = {
        type: 'user',
        id: data.user.id,
        email: data.user.email || null,
      };

      return next();
    }

    if (isGuestId(guestId)) {
      socket.data.actor = {
        type: 'guest',
        id: `guest:${guestId}`,
        guestId,
        displayName:
          typeof guestName === 'string' && guestName.trim().length > 0
            ? guestName.trim().slice(0, 24)
            : `게스트 ${guestId.slice(0, 4)}`,
      };

      return next();
    }

    return next(new Error('Unauthorized: missing access token or guest identity'));
  } catch (err) {
    return next(new Error('Unauthorized'));
  }
});

function getUserId(socket) {
  return socketToUser.get(socket.id);
}

function isBattleParticipant(socket, battleId) {
  return typeof battleId === 'string' && socket.rooms.has(battleId);
}

function getBattleState(battleId) {
  if (!battleId || typeof battleId !== 'string') return null;
  return battles[battleId] || null;
}

function allowSocketAction(actorId, action, limit, windowMs) {
  const key = `${actorId}:${action}`;
  const now = Date.now();
  const existing = socketRateBuckets.get(key) || [];
  const recent = existing.filter((ts) => now - ts < windowMs);

  if (recent.length >= limit) {
    socketRateBuckets.set(key, recent);
    return false;
  }

  recent.push(now);
  socketRateBuckets.set(key, recent);
  return true;
}

function getSafeUsername(socket, userId) {
  const actor = socket.data.actor;

  if (actor?.type === 'guest') {
    return actor.displayName || `guest-${actor.guestId.slice(0, 6)}`;
  }

  const email = socket.data.user?.email || '';
  return email || `user-${userId.slice(0, 6)}`;
}

function normalizeBattleResult(battle) {
  const participantData = battle.participantData || {};
  const votesByTarget = battle.votes || {};

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
    const top = Math.max(...paintings.map((entry) => entry.votes));
    const leaders = paintings.filter((entry) => entry.votes === top);
    winner = leaders.length === 1 ? leaders[0] : undefined;
  }

  return {
    battleId: battle.id,
    paintings,
    winner,
  };
}

io.on('connection', (socket) => {
  const actor = socket.data.actor;
  const actorId = actor?.id;

  if (!actorId) {
    socket.disconnect(true);
    return;
  }

  socketToUser.set(socket.id, actorId);

  console.log('User connected:', socket.id, actorId);

  socket.on('join_battle', (data) => {
    const { battleId, user = {} } = data || {};
    const userId = getUserId(socket);

    if (!battleId || !userId) return;
    if (!allowSocketAction(userId, 'join_battle', 20, 60 * 1000)) return;

    const safeUser = {
      ...user,
      id: userId,
      username: user?.username || user?.display_name || user?.displayName || getSafeUsername(socket, userId),
    };

    socket.join(battleId);

    if (!battles[battleId]) {
      battles[battleId] = {
        timer: null,
        timeLeft: 0,
        status: 'waiting',
        participants: new Set(),
        participantData: {}, // { userId: { username, imageData, votes } }
        votes: {}, // { voterId: targetUserId }
      };
    }

    const battle = battles[battleId];
    battle.participants.add(socket.id);

    if (userId && !battle.participantData[userId]) {
      battle.participantData[userId] = {
        username: safeUser.username,
        imageData: null,
        votes: 0,
      };
    }

    socket.to(battleId).emit('battle_event', {
      type: 'join',
      payload: { user: safeUser },
    });

    if (battle.status === 'in_progress') {
      socket.emit('battle_event', {
        type: 'timer_sync',
        payload: { timeLeft: battle.timeLeft },
      });
    }
  });

  socket.on('leave_battle', ({ battleId }) => {
    const userId = getUserId(socket);
    if (!isBattleParticipant(socket, battleId) || !userId) return;

    socket.leave(battleId);
    if (battles[battleId]) {
      battles[battleId].participants.delete(socket.id);
    }

    io.to(battleId).emit('battle_event', {
      type: 'leave',
      payload: { userId },
    });
  });

  // Keep compatibility while preventing user spoofing.
  socket.on('leave_battle_user', ({ battleId, userId }) => {
    const requesterId = getUserId(socket);
    if (!requesterId || requesterId !== userId) return;
    if (!isBattleParticipant(socket, battleId)) return;

    socket.leave(battleId);
    io.to(battleId).emit('battle_event', {
      type: 'leave',
      payload: { userId },
    });
  });

  socket.on('ready_status', ({ battleId, isReady }) => {
    const userId = getUserId(socket);
    if (!isBattleParticipant(socket, battleId) || !userId) return;

    io.to(battleId).emit('battle_event', {
      type: 'ready',
      payload: { userId, isReady: !!isReady },
    });
  });

  socket.on('ready_update', ({ battleId, isReady }) => {
    const userId = getUserId(socket);
    if (!isBattleParticipant(socket, battleId) || !userId) return;

    io.to(battleId).emit('battle_event', {
      type: 'ready',
      payload: { userId, isReady: !!isReady },
    });
  });

  socket.on('chat_message', (data = {}) => {
    const { battleId, content = '', type = 'message' } = data;
    const userId = getUserId(socket);
    if (!isBattleParticipant(socket, battleId) || !userId) return;
    if (!allowSocketAction(userId, 'chat_message', 25, 30 * 1000)) return;

    io.to(battleId).emit('battle_event', {
      type: 'chat',
      payload: {
        battleId,
        userId,
        username: getSafeUsername(socket, userId),
        content,
        type,
        timestamp: new Date().toISOString(),
      },
    });
  });

  socket.on('draw_event', (data = {}) => {
    const { battleId, event } = data;
    const userId = getUserId(socket);
    if (!isBattleParticipant(socket, battleId) || !userId) return;

    socket.to(battleId).emit('draw_event', {
      battleId,
      userId,
      event,
    });
  });

  socket.on('canvas_update', ({ battleId, imageData }) => {
    const senderId = getUserId(socket);
    if (!isBattleParticipant(socket, battleId) || !senderId) return;
    if (!allowSocketAction(senderId, 'canvas_update', 120, 30 * 1000)) return;

    const battle = getBattleState(battleId);
    if (!battle) return;

    if (!battle.participantData[senderId]) {
      battle.participantData[senderId] = {
        username: getSafeUsername(socket, senderId),
        imageData: null,
        votes: 0,
      };
    }

    battle.participantData[senderId].imageData = imageData || null;

    socket.to(battleId).emit('battle_event', {
      type: 'canvas_update',
      payload: { userId: senderId, imageData },
    });
  });

  socket.on('vote', ({ battleId, paintingUserId }) => {
    const voterId = getUserId(socket);
    if (!isBattleParticipant(socket, battleId) || !voterId) return;
    if (!allowSocketAction(voterId, 'vote', 10, 10 * 1000)) return;
    if (!battleId || !paintingUserId || voterId === paintingUserId) return;

    const battle = getBattleState(battleId);
    if (!battle || battle.status !== 'finished') return;
    if (!battle.participantData || !battle.participantData[paintingUserId]) return;

    battle.votes = battle.votes || {};
    battle.votes[voterId] = paintingUserId;

    const voteResult = normalizeBattleResult(battle);
    io.to(battleId).emit('battle_event', {
      type: 'vote',
      payload: {
        voterId,
        paintingUserId,
      },
    });
    io.to(battleId).emit('battle_event', {
      type: 'finish',
      payload: voteResult,
    });
  });

  socket.on('start_battle', async ({ battleId }) => {
    if (!battleId) return;

    const requesterId = getUserId(socket);
    if (!requesterId || !allowSocketAction(requesterId, 'start_battle', 5, 60 * 1000)) return;

    console.log(`Starting battle ${battleId}`);

    try {
      const { data: battle, error } = await supabase
        .from('battles')
        .select('*')
        .eq('id', battleId)
        .single();

      if (error || !battle) {
        throw new Error('Battle not found');
      }
      const isHostUser = actor?.type === 'user' && battle.host_id === actor.id;
      const isHostGuest = actor?.type === 'guest' && battle.host_guest_id === actor.guestId;

      if (!isHostUser && !isHostGuest) {
        throw new Error('Forbidden: only host can start battle');
      }

      let currentTopic = battle.topic;
      if (!currentTopic) {
        try {
          const { data: topics } = await supabase.from('topics').select('content').limit(100);
          if (topics && topics.length > 0) {
            const randomTopic = topics[Math.floor(Math.random() * topics.length)];
            currentTopic = randomTopic.content;
          } else {
            currentTopic = '무작위 주제';
          }
        } catch (e) {
          console.error('Error fetching random topic:', e);
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

      if (!battles[battleId]) {
        battles[battleId] = {
          participants: new Set(),
          participantData: {},
          votes: {},
        };
      }

      battles[battleId].id = battleId;
      battles[battleId].status = 'in_progress';
      battles[battleId].timeLeft = battle.time_limit;

      io.to(battleId).emit('battle_event', {
        type: 'start',
        payload: {
          topic: currentTopic,
          startedAt: new Date().toISOString(),
          duration: battle.time_limit,
        },
      });

      if (battles[battleId].timer) clearInterval(battles[battleId].timer);
      battles[battleId].timer = setInterval(async () => {
        const current = getBattleState(battleId);
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

          io.to(battleId).emit('battle_event', {
            type: 'finish',
            payload: { battleId },
          });

          const battleResult = normalizeBattleResult(current);

          io.to(battleId).emit('battle_event', {
            type: 'finish',
            payload: battleResult,
          });
        }
      }, 1000);
    } catch (err) {
      console.error('Failed to start battle:', err);
    }
  });

  socket.on('disconnect', () => {
    const userId = getUserId(socket);
    console.log('User disconnected:', socket.id);

    socketToUser.delete(socket.id);

    if (userId) {
      for (const key of socketRateBuckets.keys()) {
        if (key.startsWith(`${userId}:`)) {
          socketRateBuckets.delete(key);
        }
      }
    }

    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue;
      const battle = battles[roomId];
      if (!battle) continue;

      if (battle.participants.has(socket.id)) {
        battle.participants.delete(socket.id);
      }

      if (!userId) continue;
      io.to(roomId).emit('battle_event', {
        type: 'leave',
        payload: { userId },
      });
    }

  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
