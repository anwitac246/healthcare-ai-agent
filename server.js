const express = require('express');
const { ExpressPeerServer } = require('peer');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: '*' }
});

const peerServer = ExpressPeerServer(server, { debug: true });
app.use('/peerjs', peerServer);

const PORT = process.env.PORT || 5000;
const rooms = new Map();
const ROOM_EXPIRY_MS = 30 * 60 * 1000; 


setInterval(() => {
  const now = Date.now();
  for (const [roomId, { createdAt }] of rooms) {
    if (now - createdAt >= ROOM_EXPIRY_MS) {
      rooms.delete(roomId);
      io.to(roomId).emit('room-expired');
    }
  }
}, 60 * 1000);

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    const now = Date.now();

   
    if (rooms.has(roomId)) {
      const { createdAt } = rooms.get(roomId);
      if (now - createdAt >= ROOM_EXPIRY_MS) {
        socket.emit('room-expired');
        rooms.delete(roomId);
        return;
      }
    }

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { users: new Set(), createdAt: now });
    }

    const room = rooms.get(roomId);
    room.users.add(userId);
    socket.join(roomId);

   
    socket.to(roomId).emit('user-connected', userId);

    socket.emit(
      'room-users',
      Array.from(room.users).filter(id => id !== userId)
    );

    const remainingTime = ROOM_EXPIRY_MS - (now - room.createdAt);
    socket.emit('room-timer', Math.floor(remainingTime / 1000)); 

    socket.on('disconnect', () => {
      if (rooms.has(roomId)) {
        room.users.delete(userId);
        if (room.users.size === 0) {
          rooms.delete(roomId);
        }
        socket.to(roomId).emit('user-disconnected', userId);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
