const express = require("express");
const router = express.Router();
const { chat, debateBot, judgeDebate, getHistory, getStats } = require("../controllers/ai.controller");
const { requireAuth, requireRole, optionalAuth } = require("../middleware/auth");

// Open AI route so guests can use the onboarding bot
router.post("/chat", optionalAuth, chat);
router.post("/bot", requireAuth, debateBot);
router.post("/judge", requireAuth, judgeDebate);
router.get("/history", requireAuth, getHistory);
router.get("/stats", requireAuth, requireRole("moderator", "admin"), getStats);

module.exports = router;
