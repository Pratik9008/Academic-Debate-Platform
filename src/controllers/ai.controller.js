const Groq = require("groq-sdk");
const Match = require("../models/Match");
const Debate = require("../models/Debate");
const Notification = require("../models/Notification");
const User = require("../models/User");

async function chat(req, res) {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    let prompt = `User Message: ${message}`;
    
    if (req.user && (req.user.role === 'admin' || req.user.role === 'moderator')) {
      const totalUsers = await require("../models/User").countDocuments();
      const totalDebates = await Debate.countDocuments();
      const aiMatches = await Match.countDocuments({ mode: "ai" });
      const liveMatches = await Match.countDocuments({ mode: "live" });
      
      prompt = `System: You are the SaaS Platform Growth Consultant for an Academic Debate Platform. 
Current Platform Stats: ${totalUsers} Users, ${totalDebates} Debates, ${aiMatches} AI Matches, ${liveMatches} Live Matches.
Your goal is to advise the administrator on platform growth, user engagement, and moderation strategies.
IMPORTANT RULES: 
1. You must ONLY answer questions related to the Academic Debate Platform, its stats, debates, moderation, or platform growth. 
2. If the user asks a question unrelated to the platform or debates, politely decline and steer them back to platform management.
Be extremely helpful, analytical, and concise (max 3 short paragraphs). Provide actionable advice based on the stats if relevant.
User: ${message}`;
    } else {
      prompt = `System: You are the AI Assistant for the 'Academic Debate Platform'. This is a premium platform for structured, intellectual debates. 
IMPORTANT RULES:
1. You must ONLY answer questions related to the Academic Debate Platform, how to debate, structuring arguments, or using the website.
2. If the user asks general knowledge questions, coding questions, or anything unrelated to this platform, politely decline and steer them back to debates.
Your goal is to help new users understand the platform, write better arguments, and navigate the interface. Be extremely helpful, concise, and professional.
User: ${message}`;
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant"
    });

    return res.json({ reply: chatCompletion.choices[0]?.message?.content || "" });
  } catch (error) {
    console.error("AI Error:", error);
    const msg = error?.status === 429 
      ? "AI is cooling down (API Rate Limit Exceeded). Please wait 30 seconds and try again!" 
      : `Error: ${error.message || "Failed to generate AI response"}`;
    return res.status(500).json({ error: msg });
  }
}

async function debateBot(req, res) {
  const { history, userMessage } = req.body;
  if (!userMessage) return res.status(400).json({ error: "Message required" });

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    // Convert history to string for context
    const context = history.map(h => `${h.role === 'user' ? 'Human' : 'Robot'}: ${h.text}`).join('\n');
    const prompt = `Context:\n${context}\n\nHuman: ${userMessage}\n\nYou are a highly intellectual debate opponent. Counter the Human's argument concisely (max 3 sentences).`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant"
    });

    return res.json({ reply: chatCompletion.choices[0]?.message?.content || "" });
  } catch (error) {
    console.error("AI Error:", error);
    const msg = error?.status === 429 ? "AI is cooling down (API Rate Limit Exceeded). Please wait 30 seconds and try again!" : "Bot failed to respond.";
    return res.status(500).json({ error: msg });
  }
}

async function judgeDebate(req, res) {
  const { transcript, mode, opponent } = req.body;
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const prompt = `Read this debate transcript:\n${transcript}\n\nGrade the Human's performance out of 100 based on logic, evidence, and structure. Provide a concise feedback paragraph.\nFormat exactly like this:\nSCORE: 85\nFEEDBACK: Your logic was good but...`;
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant"
    });
    
    const text = chatCompletion.choices[0]?.message?.content || "";
    const scoreMatch = text.match(/SCORE:\s*(\d+)/);
    const feedbackMatch = text.split("FEEDBACK:");
    
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;
    const feedback = feedbackMatch.length > 1 ? feedbackMatch[1].trim() : text;

    // Save to database
    const newMatch = await Match.create({
      userId: req.user._id,
      opponent: opponent || "Unknown",
      mode: mode || "ai",
      score,
      feedback,
      transcript
    });

    // Notify the user
    await Notification.create({
      user: req.user._id,
      type: "system",
      title: "Debate Scored!",
      body: `You scored ${score}/100 against ${opponent || "AI Robot"}. Check your Match History for the full scorecard and PDF.`,
      link: "/tracking.html"
    });

    // Notify all admins
    const admins = await User.find({ role: { $in: ["admin", "moderator"] } });
    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        type: "moderation",
        title: "Match Completed",
        body: `${req.user.name || "A student"} completed a ${mode || "ai"} debate and scored ${score}/100.`,
        link: "/admin.html"
      });
    }

    return res.json({ score, feedback, matchId: newMatch._id });
  } catch (err) {
    console.error("AI Judge Error:", err);
    const msg = err?.status === 429 ? "AI Judge is busy (API Rate Limit). Please wait 30 seconds and click end again!" : "Judging failed.";
    return res.status(500).json({ error: msg });
  }
}

async function getHistory(req, res) {
  try {
    const matches = await Match.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.json({ matches });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch history" });
  }
}

async function getStats(req, res) {
  try {
    const totalUsers = await require("../models/User").countDocuments();
    const totalDebates = await Debate.countDocuments();
    const pendingDebates = await Debate.countDocuments({ approved: false });
    
    const aiMatches = await Match.countDocuments({ mode: "ai" });
    const liveMatches = await Match.countDocuments({ mode: "live" });
    
    // Get recent matches for the admin table
    const recentMatches = await Match.find()
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    // Calculate growth over last 6 months
    const growthData = [];
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const count = await Match.countDocuments({
        createdAt: { $gte: startDate, $lt: endDate }
      });
      
      months.push(startDate.toLocaleString('default', { month: 'short' }));
      growthData.push(count);
    }

    return res.json({
      totalUsers,
      totalDebates,
      pendingDebates,
      aiMatches,
      liveMatches,
      recentMatches,
      growth: {
        labels: months,
        data: growthData
      }
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
}

module.exports = { chat, debateBot, judgeDebate, getHistory, getStats };
