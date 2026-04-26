const path = require("path");

const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");

const { connectDb } = require("./src/config/db");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let matchQueue = [];

io.on("connection", (socket) => {
  socket.on("joinDebate", (debateId) => {
    socket.join(`debate_${debateId}`);
  });

  socket.on("findMatch", (userData) => {
    if (matchQueue.length > 0) {
      const opponent = matchQueue.shift();
      const roomId = `live_${opponent.socket.id}_${socket.id}`;
      
      socket.join(roomId);
      opponent.socket.join(roomId);
      
      io.to(roomId).emit("matchFound", { 
        roomId, 
        p1: opponent.user, 
        p2: userData 
      });
    } else {
      matchQueue.push({ socket, user: userData });
    }
  });

  socket.on("liveMessage", ({ roomId, text, sender }) => {
    io.to(roomId).emit("newLiveMessage", { text, sender });
  });

  socket.on("endLiveMatch", (roomId) => {
    socket.to(roomId).emit("matchEndedByOpponent");
  });

  socket.on("disconnect", () => {
    matchQueue = matchQueue.filter(m => m.socket.id !== socket.id);
  });
});
app.set("io", io);

// Default entry: show login first
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "*",
    credentials: true,
  })
);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("dev"));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 180,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/debates", require("./src/routes/debate.routes"));
app.use("/api/arguments", require("./src/routes/argument.routes"));
app.use("/api/vote", require("./src/routes/vote.routes"));
app.use("/api/archive", require("./src/routes/archive.routes"));
app.use("/api/notifications", require("./src/routes/notification.routes"));
app.use("/api/bookmarks", require("./src/routes/bookmark.routes"));
app.use("/api/users", require("./src/routes/user.routes"));
app.use("/api/ai", require("./src/routes/ai.routes"));
app.use("/api/admin", require("./src/routes/admin.routes"));

// Initialize Auto-Moderator
require("./src/jobs/cron").initCronJobs();

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const port = process.env.PORT || 3000;

connectDb()
  .then(() => {
    server.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", err);
    process.exit(1);
  });

