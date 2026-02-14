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

// battles[battleId] = {
//   timer: NodeJS.Timeout,
//   timeLeft: number,
//   status: 'waiting' | 'in_progress' | 'finished',
//   participants: Set<string>,
//   hostId: string,
//   participantData: { userId: { username, imageData, votes } },
//   votes: { voterId: targetUserId },
// }

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

function getSafeUsername(socket, userId) {
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
  const authUser = socket.data.user;
  socketToUser.set(socket.id, authUser.id);

  console.log('User connected:', socket.id);

  socket.on('join_battle', (data) => {
    const { battleId, user = {} } = data || {};
    const userId = getUserId(socket);

    if (!battleId || !userId) return;

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
      if (battle.host_id !== authUser.id) {
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
