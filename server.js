const express = require("express");
const { ExpressPeerServer } = require("peer");
const http = require("http");
const socketIO = require("socket.io");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // Your service account key
require("dotenv").config();

// Log the database URL to verify it's loaded
console.log("FIREBASE_DATABASE_URL:", process.env.FIREBASE_DATABASE_URL);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL, // Make sure this is set in your .env file
});

const adminDb = admin.database();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, { cors: { origin: "*" } });

const peerServer = ExpressPeerServer(server, { debug: true });
app.use("/peerjs", peerServer);

const PORT = process.env.PORT || 5000;
const rooms = new Map();
const ROOM_EXPIRY_MS = 30 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [roomId, { createdAt }] of rooms) {
    if (now - createdAt >= ROOM_EXPIRY_MS) {
      rooms.delete(roomId);
      io.to(roomId).emit("room-expired");
    }
  }
}, 60 * 1000);

io.on("connection", (socket) => {
  socket.on("join-room", async (roomId, userId) => {
    try {
      const snap = await adminDb
        .ref("appointments")
        .orderByChild("roomId")
        .equalTo(roomId)
        .once("value");
      const data = snap.val();
      if (!data) {
        socket.emit("room-expired");
        return socket.disconnect(true);
      }
      const [apptId, appt] = Object.entries(data)[0];
      const now = Date.now();
      if (!appt.generatedAt || now > appt.generatedAt + ROOM_EXPIRY_MS) {
        await adminDb.ref(`appointments/${apptId}`).update({
          status: "completed",
          meetingLink: null,
          generatedAt: null,
          roomId: null,
        });
        socket.emit("room-expired");
        return socket.disconnect(true);
      }
    } catch (err) {
      console.error("Firebase guard error:", err);
      socket.emit("room-expired");
      return socket.disconnect(true);
    }

    // In-memory guard
    const now = Date.now();
    if (rooms.has(roomId)) {
      const { createdAt } = rooms.get(roomId);
      if (now - createdAt >= ROOM_EXPIRY_MS) {
        socket.emit("room-expired");
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

    socket.to(roomId).emit("user-connected", userId);
    socket.emit("room-users", Array.from(room.users).filter((id) => id !== userId));
    const remainingTime = ROOM_EXPIRY_MS - (now - room.createdAt);
    socket.emit("room-timer", Math.floor(remainingTime / 1000));

    socket.on("disconnect", () => {
      if (!rooms.has(roomId)) return;
      room.users.delete(userId);
      if (room.users.size === 0) rooms.delete(roomId);
      socket.to(roomId).emit("user-disconnected", userId);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
