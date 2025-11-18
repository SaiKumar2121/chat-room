// server.js
'use strict';

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// In-memory room tracking: roomCode -> { maxMembers, members: Set(socketId) }
const rooms = new Map();

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join/create room
  socket.on('join-room', ({ roomCode, username, maxMembers }) => {
    roomCode = String(roomCode || '').trim().toUpperCase();
    username = String(username || 'Guest').trim() || 'Guest';

    if (!roomCode) {
      socket.emit('system-message', 'Room code is required.');
      return;
    }

    let room = rooms.get(roomCode);

    // First user creates the room
    if (!room) {
      const capacity = Number(maxMembers);
      const validCapacity = Number.isInteger(capacity) && capacity > 0 ? capacity : 2; // default 2
      room = {
        maxMembers: validCapacity,
        members: new Set()
      };
      rooms.set(roomCode, room);
      console.log(`Room ${roomCode} created with capacity ${room.maxMembers}`);
    }

    // Reject if room is full and this socket isn't already in it
    if (room.members.size >= room.maxMembers && !room.members.has(socket.id)) {
      socket.emit('room-full', {
        roomCode,
        maxMembers: room.maxMembers
      });
      return;
    }

    // Join room
    room.members.add(socket.id);
    socket.data.username = username;
    socket.data.roomCode = roomCode;

    socket.join(roomCode);

    console.log(`${username} joined room ${roomCode}. Now ${room.members.size}/${room.maxMembers}`);

    // Tell this user
    socket.emit('joined-room', {
      roomCode,
      maxMembers: room.maxMembers
    });

    // Tell others
    socket.to(roomCode).emit('system-message', `${username} joined the room.`);
  });

  // Chat message handler
  socket.on('chat-message', ({ roomCode, message }) => {
    roomCode = String(roomCode || socket.data.roomCode || '').trim().toUpperCase();
    const username = socket.data.username || 'Guest';
    const text = String(message || '').trim();

    if (!roomCode || !text) return;

    const payload = {
      username,
      message: text,
      time: new Date().toLocaleTimeString()
    };

    console.log('[server chat-message]:', roomCode, payload);

    io.to(roomCode).emit('chat-message', payload);
  });

  // Disconnect
  socket.on('disconnect', () => {
    const username = socket.data?.username;
    const roomCode = socket.data?.roomCode;

    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        room.members.delete(socket.id);

        if (room.members.size === 0) {
          rooms.delete(roomCode);
          console.log(`Room ${roomCode} deleted (no members left).`);
        } else {
          console.log(
            `${username || 'Unknown'} left room ${roomCode}. Now ${room.members.size}/${room.maxMembers}`
          );
        }
      }
    }

    if (roomCode && username) {
      socket.to(roomCode).emit('system-message', `${username} left the room.`);
    }

    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
