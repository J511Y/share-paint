require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_battle', (battleId) => {
    socket.join(battleId);
    console.log(`User ${socket.id} joined battle ${battleId}`);
    io.to(battleId).emit('user_joined', { userId: socket.id });
  });

  socket.on('leave_battle', (battleId) => {
    socket.leave(battleId);
    console.log(`User ${socket.id} left battle ${battleId}`);
    io.to(battleId).emit('user_left', { userId: socket.id });
  });

  socket.on('draw_event', (data) => {
    // data: { battleId, x, y, color, size, type, ... }
    socket.to(data.battleId).emit('draw_event', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
