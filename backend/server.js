// server.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  maxHttpBufferSize: 1e8, // ✅ 100 MB limit
});

app.use(cors());
app.get("/", (_, res) => res.send("AnonChat Server Running 🚀"));

/* ---------------------- MATCHING ---------------------- */
let waitingQueue = []; // Array of socket IDs
const activePairs = new Map(); // Map<roomId, { aId, bId }>

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  // Initialize metadata
  socket.data.name = `User-${socket.id.slice(0, 5)}`;
  socket.data.gender = "Unknown";
  socket.data.location = "Unknown";
  socket.data.chatStart = null;
  socket.data.partnerName = null;
  socket.data.videoReady = false;

  /* ---------------------- FIND PARTNER ---------------------- */
  socket.on("find-partner", ({ name, gender, location }) => {
    socket.data.name = name || `User-${socket.id.slice(0, 5)}`;
    socket.data.gender = gender || "Unknown";
    socket.data.location = location || "Unknown";

    console.log(
      `🔍 ${socket.data.name} (${socket.data.gender}, ${socket.data.location}) is finding a partner...`
    );

    // Find a waiting partner
    const partnerId = waitingQueue.find((id) => id !== socket.id);
    if (partnerId) {
      waitingQueue = waitingQueue.filter((id) => id !== partnerId);

      const partner = io.sockets.sockets.get(partnerId);
      if (!partner) {
        queueUser(socket);
        return;
      }

      const roomId = `${socket.id}-${partner.id}`;
      socket.join(roomId);
      partner.join(roomId);

      const start = Date.now();
      socket.data.chatStart = start;
      partner.data.chatStart = start;

      socket.data.partnerName = partner.data.name;
      partner.data.partnerName = socket.data.name;

      socket.data.videoReady = false;
      partner.data.videoReady = false;

      activePairs.set(roomId, { aId: socket.id, bId: partner.id });

      // ✅ Notify both users with name, gender, and location
      io.to(socket.id).emit("partner-found", {
        roomId,
        partnerName: partner.data.name,
        partnerGender: partner.data.gender,
        partnerLocation: partner.data.location,
      });

      io.to(partner.id).emit("partner-found", {
        roomId,
        partnerName: socket.data.name,
        partnerGender: socket.data.gender,
        partnerLocation: socket.data.location,
      });

      console.log(
        `✅ Paired: ${socket.data.name} (${socket.data.gender}, ${socket.data.location}) ↔ ${partner.data.name} (${partner.data.gender}, ${partner.data.location})`
      );
    } else {
      queueUser(socket);
    }
  });

  /* ---------------------- CHAT HANDLERS ---------------------- */
  socket.on("message", ({ roomId, message, name }) => {
    socket.to(roomId).emit("message", { from: "partner", name, text: message });
  });

  socket.on("file-message", ({ roomId, file, name }) => {
    socket.to(roomId).emit("file-message", {
      from: "partner",
      name,
      ...file,
    });
  });

  /* ---------------------- NEXT / END / DISCONNECT ---------------------- */
  socket.on("next", () => {
    handleLeave(socket);
    io.to(socket.id).emit("waiting");
  });

  socket.on("end", () => {
    handleLeave(socket, { requeueCaller: false });
    console.log(`❌ Ended by: ${socket.data.name || socket.id}`);
  });

  socket.on("disconnect", () => {
    waitingQueue = waitingQueue.filter((id) => id !== socket.id);
    handleLeave(socket, { requeueCaller: false });
    console.log("🔴 Disconnected:", socket.data.name || socket.id);
  });

  /* ---------------------- VIDEO SIGNALING ---------------------- */
  socket.on("start-video", ({ roomId }) => {
    const pair = activePairs.get(roomId);
    if (!pair) return;

    socket.data.videoReady = true;
    const partnerId = pair.aId === socket.id ? pair.bId : pair.aId;
    const partner = io.sockets.sockets.get(partnerId);

    if (partner?.data?.videoReady) {
      // Deterministic caller selection
      const callerId = [socket.id, partnerId].sort()[0];
      const calleeId = callerId === socket.id ? partnerId : socket.id;

      io.to(callerId).emit("video-start", { roomId, youAreCaller: true });
      io.to(calleeId).emit("video-start", { roomId, youAreCaller: false });
    } else {
      socket.emit("video-waiting");
      partner && io.to(partner.id).emit("partner-video-intent");
    }
  });

  socket.on("stop-video", ({ roomId }) => {
    const pair = activePairs.get(roomId);
    if (!pair) return;
    socket.data.videoReady = false;
    const partnerId = pair.aId === socket.id ? pair.bId : pair.aId;
    io.to(partnerId).emit("stop-video");
  });

  // SDP + ICE relay
  socket.on("webrtc-offer", ({ roomId, sdp }) => {
    socket.to(roomId).emit("webrtc-offer", { from: socket.data.name, sdp, roomId });
  });

  socket.on("webrtc-answer", ({ roomId, sdp }) => {
    socket.to(roomId).emit("webrtc-answer", { from: socket.data.name, sdp, roomId });
  });

  socket.on("webrtc-ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("webrtc-ice-candidate", { candidate, roomId });
  });
});

/* ---------------------- HELPERS ---------------------- */
function queueUser(socket) {
  if (!waitingQueue.includes(socket.id)) {
    waitingQueue.push(socket.id);
    io.to(socket.id).emit("waiting");
    console.log(
      `⌛ ${socket.data.name} (${socket.data.gender}, ${socket.data.location}) is waiting...`
    );
  }
}

function handleLeave(socket, opts = { requeueCaller: true }) {
  waitingQueue = waitingQueue.filter((id) => id !== socket.id);

  let foundRoomId = null;
  let partnerId = null;

  for (const [roomId, pair] of activePairs.entries()) {
    if (pair.aId === socket.id || pair.bId === socket.id) {
      foundRoomId = roomId;
      partnerId = pair.aId === socket.id ? pair.bId : pair.aId;
      break;
    }
  }

  if (!foundRoomId) return;

  const partner = io.sockets.sockets.get(partnerId);
  const endTime = Date.now();
  const socketDuration = socket.data.chatStart ? endTime - socket.data.chatStart : 0;

  io.to(socket.id).emit("chat-summary", {
    partnerName: partner?.data?.name || "Unknown",
    partnerGender: partner?.data?.gender || "Unknown",
    partnerLocation: partner?.data?.location || "Unknown",
    durationMs: socketDuration,
    endedAt: endTime,
  });

  if (partner) {
    const partnerDuration = partner.data.chatStart
      ? endTime - partner.data.chatStart
      : socketDuration;
    io.to(partner.id).emit("chat-summary", {
      partnerName: socket?.data?.name || "Unknown",
      partnerGender: socket?.data?.gender || "Unknown",
      partnerLocation: socket?.data?.location || "Unknown",
      durationMs: partnerDuration,
      endedAt: endTime,
    });
    io.to(partner.id).emit("partner-left");
    partner.data.videoReady = false;
  }

  // cleanup
  const socketsInRoom = io.sockets.adapter.rooms.get(foundRoomId);
  if (socketsInRoom) {
    for (const id of socketsInRoom) {
      const s = io.sockets.sockets.get(id);
      s?.leave(foundRoomId);
      if (s) {
        s.data.chatStart = null;
        s.data.partnerName = null;
        s.data.videoReady = false;
      }
    }
  }

  activePairs.delete(foundRoomId);

  if (opts.requeueCaller) {
    io.to(socket.id).emit("waiting");
  }
}

/* ---------------------- SERVER START ---------------------- */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("✅ Backend running on port", PORT));
