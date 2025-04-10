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

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    const roomUsers = rooms.get(roomId);
    roomUsers.add(userId);
    socket.join(roomId);

    // tell everyone else in the room that I joined
    socket.to(roomId).emit('user-connected', userId);
    // tell me who’s already here
    socket.emit(
      'room-users',
      Array.from(roomUsers).filter(id => id !== userId)
    );

    socket.on('disconnect', () => {
      roomUsers.delete(userId);
      if (roomUsers.size === 0) rooms.delete(roomId);
      socket.to(roomId).emit('user-disconnected', userId);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
