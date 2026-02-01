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
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// 인메모리 배틀 상태 관리
const battles = {};
// battles[battleId] = {
//   timer: NodeJS.Timeout,
//   timeLeft: number,
//   status: 'waiting' | 'in_progress' | 'finished',
//   participants: Set<string>,
//   hostId: string
// }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_battle', (data) => {
    // data: { battleId, user: { id, ... } }
    const { battleId, user } = data;
    socket.join(battleId);
    
    // 상태 초기화
    if (!battles[battleId]) {
      battles[battleId] = {
        timer: null,
        timeLeft: 0,
        status: 'waiting',
        participants: new Set(),
        participantData: {}, // { userId: { username, imageData, votes } }
        votes: {} // { voterId: targetUserId }
      };
    }
    battles[battleId].participants.add(socket.id);
    
    // 유저 데이터 초기화 (없으면)
    if (user.id && !battles[battleId].participantData[user.id]) {
      battles[battleId].participantData[user.id] = {
        username: user.username,
        imageData: null,
        votes: 0
      };
    }

    console.log(`User ${user.username} (${socket.id}) joined battle ${battleId}`);
    
    // 다른 참가자에게 알림
    socket.to(battleId).emit('battle_event', { 
      type: 'join', 
      payload: { user } 
    });

    // 현재 배틀 상태가 진행 중이라면 시간 정보 전송
    if (battles[battleId].status === 'in_progress') {
      socket.emit('battle_event', {
        type: 'timer_sync',
        payload: { timeLeft: battles[battleId].timeLeft }
      });
    }
  });

  socket.on('leave_battle', ({ battleId }) => {
    socket.leave(battleId);
    if (battles[battleId]) {
      battles[battleId].participants.delete(socket.id);
      // 참가자가 없으면 방 정리 로직이 필요할 수 있음
    }
    
    io.to(battleId).emit('battle_event', { 
      type: 'leave', 
      payload: { userId: socket.id } // Note: 실제로는 socket.id가 아니라 user.id를 써야 하는데, 매핑이 필요함. 
                                     // 여기서는 클라이언트에서 socket.id 대신 user.id를 보내도록 가정하거나,
                                     // 서버에서 socket.id -> user.id 매핑을 유지해야 함.
                                     // 간소화를 위해 클라이언트가 보낸 userId를 사용하도록 수정 필요.
                                     // 지금은 일단 socket.id로 둠 (수정 필요할 수 있음)
    });
  });

  // userId를 포함한 leave 처리를 위해 수정
  socket.on('leave_battle_user', ({ battleId, userId }) => {
     socket.leave(battleId);
     io.to(battleId).emit('battle_event', {
        type: 'leave',
        payload: { userId }
     });
  });

  socket.on('ready_status', ({ battleId, isReady }) => {
    // userId 식별 필요. 여기서는 socket.handshake.auth 등을 쓰거나 클라이언트가 보낸 데이터 사용
    // 편의상 클라이언트 구현에 의존하지 않고 socket.data에 저장이 이상적
    // 일단 broadcast
    // 클라이언트 쪽에서 누가 보냈는지 알 수 있도록 userId를 payload에 포함해서 보내는게 좋음
    // 여기서는 단순 중계
  });
  
  // ready_status 개선: 클라이언트가 userId를 보내도록 함
  socket.on('ready_update', ({ battleId, userId, isReady }) => {
     io.to(battleId).emit('battle_event', {
        type: 'ready',
        payload: { userId, isReady }
     });
  });

  socket.on('chat_message', (data) => {
    // data: { battleId, userId, content, ... }
    io.to(data.battleId).emit('battle_event', {
      type: 'chat',
      payload: data
    });
  });

  socket.on('draw_event', (data) => {
    socket.to(data.battleId).emit('draw_event', data);
  });
  
  socket.on('canvas_update', ({ battleId, userId, imageData }) => {
    // userId가 없으면 socket.id로 대체하거나 무시할 수 있음
    const senderId = userId || socket.id; // 임시 처방
    
    // 서버 메모리에 최신 캔버스 데이터 저장
    if (battles[battleId] && battles[battleId].participantData && battles[battleId].participantData[senderId]) {
      battles[battleId].participantData[senderId].imageData = imageData;
    }
    
    socket.to(battleId).emit('battle_event', {
      type: 'canvas_update',
      payload: { userId: senderId, imageData }
    });
  });

  socket.on('start_battle', async ({ battleId }) => {
    console.log(`Starting battle ${battleId}`);
    
    if (!supabase) {
      console.error('Supabase client not initialized');
      return;
    }

    try {
      // 1. DB에서 배틀 정보 가져오기
      const { data: battle, error } = await supabase
        .from('battles')
        .select('*')
        .eq('id', battleId)
        .single();
        
      if (error || !battle) {
        throw new Error('Battle not found');
      }

      // 2. DB 상태 업데이트
      await supabase
        .from('battles')
        .update({ 
          status: 'in_progress', 
          started_at: new Date().toISOString() 
        })
        .eq('id', battleId);

      // 3. 인메모리 상태 설정
      if (!battles[battleId]) battles[battleId] = { participants: new Set() };
      
      battles[battleId].status = 'in_progress';
      battles[battleId].timeLeft = battle.time_limit;

      // 4. 시작 이벤트 전송
      io.to(battleId).emit('battle_event', {
        type: 'start',
        payload: { 
          topic: battle.topic, // 랜덤 주제라면 여기서 생성 로직 필요
          startedAt: new Date().toISOString(),
          duration: battle.time_limit
        }
      });

      // 5. 타이머 시작
      if (battles[battleId].timer) clearInterval(battles[battleId].timer);
      
      battles[battleId].timer = setInterval(async () => {
        if (!battles[battleId]) return;

        battles[battleId].timeLeft--;

        // 1초마다 동기화는 너무 잦을 수 있으므로 5초마다 또는 중요 시점에만?
        // 아니면 그냥 1초마다 보냄 (단순하게)
        // io.to(battleId).emit('battle_event', {
        //   type: 'timer_update',
        //   payload: { timeLeft: battles[battleId].timeLeft }
        // });
        
        // 종료 체크
        if (battles[battleId].timeLeft <= 0) {
          clearInterval(battles[battleId].timer);
          battles[battleId].status = 'finished';
          
          // DB 업데이트
          await supabase
            .from('battles')
            .update({ 
              status: 'finished', 
              ended_at: new Date().toISOString() 
            })
            .eq('id', battleId);
            
          io.to(battleId).emit('battle_event', {
            type: 'finish',
            payload: { battleId }
          });
          
          // 초기 결과 집계 및 전송 (0표 상태)
          const paintings = Object.entries(battles[battleId].participantData || {}).map(([uid, data]) => ({
            userId: uid,
            username: data.username,
            imageUrl: data.imageData || '',
            votes: 0
          }));
          
          const battleResult = {
            battleId,
            paintings,
            winner: undefined
          };
          
          io.to(battleId).emit('battle_event', {
            type: 'finish',
            payload: battleResult
          });
        }
      }, 1000);

    } catch (err) {
      console.error('Failed to start battle:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // 모든 방에서 제거 및 매핑 제거 로직 필요
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
