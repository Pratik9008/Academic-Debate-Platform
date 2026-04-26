const Debate = require("../models/Debate");
const Argument = require("../models/Argument");
const { requiredString } = require("../middleware/validate");

function roundLabel(round) {
  return round === 1 ? "Opening Argument" : round === 2 ? "Counterargument" : "Final Statement";
}

async function listDebates(req, res) {
  const { q, category, status } = req.query;

  const filter = { approved: true };
  if (category) filter.category = category;
  if (status) filter.status = status;

  if (q) {
    filter.$text = { $search: String(q) };
  }

  const debates = await Debate.find(filter)
    .populate("createdBy", "name role reputation")
    .sort({ createdAt: -1 })
    .limit(50);

  return res.json({ debates });
}

async function listPendingDebates(req, res) {
  const debates = await Debate.find({ approved: false }).populate("createdBy", "name").sort({ createdAt: -1 });
  return res.json({ debates });
}

async function tracking(req, res) {
  const debates = await Debate.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
  return res.json({ debates });
}

async function createDebate(req, res) {
  const title = requiredString(req.body.title, 140);
  const description = requiredString(req.body.description, 2000);
  const category = requiredString(req.body.category, 30);

  if (!title) return res.status(400).json({ message: "Title is required" });
  if (!description) return res.status(400).json({ message: "Description is required" });
  if (!["Science", "Tech", "Politics"].includes(category)) return res.status(400).json({ message: "Invalid category" });

  const debate = await Debate.create({
    title,
    description,
    category,
    createdBy: req.user._id,
    approved: req.user.role === "admin" || req.user.role === "moderator",
    status: req.user.role === "admin" || req.user.role === "moderator" ? "active" : "pending",
    round: 1,
    roundState: "open"
  });

  return res.status(201).json({ debate });
}

async function getDebate(req, res) {
  const debate = await Debate.findById(req.params.id).populate("createdBy", "name role reputation");
  if (!debate) return res.status(404).json({ message: "Debate not found" });
  if (!debate.approved && req.user?.role !== "moderator" && req.user?.role !== "admin") {
    return res.status(403).json({ message: "Debate not approved" });
  }

  const round = debate.round;
  const args = await Argument.find({ debate: debate._id, round, deleted: false })
    .populate("author", "name role reputation")
    .sort({ createdAt: 1 })
    .limit(500);

  return res.json({ debate, roundLabel: roundLabel(round), arguments: args });
}

async function approveDebate(req, res) {
  const debate = await Debate.findById(req.params.id);
  if (!debate) return res.status(404).json({ message: "Debate not found" });
  debate.approved = true;
  if (debate.status === "pending") debate.status = "active";
  await debate.save();
  return res.json({ debate });
}

async function setRoundState(req, res) {
  const debate = await Debate.findById(req.params.id);
  if (!debate) return res.status(404).json({ message: "Debate not found" });

  const action = requiredString(req.body.action, 20);
  if (!["start", "end", "advance"].includes(action)) return res.status(400).json({ message: "Invalid action" });

  if (action === "start") {
    debate.roundState = "open";
    if (debate.status === "pending") debate.status = "active";
  }

  if (action === "end") {
    debate.roundState = "closed";
    if (debate.round === 3) debate.status = "completed";
  }

  if (action === "advance") {
    if (debate.round < 3) {
      debate.round += 1;
      debate.roundState = "open";
    } else {
      debate.status = "completed";
      debate.roundState = "closed";
    }
  }

  await debate.save();
  return res.json({ debate });
}

async function deleteDebate(req, res) {
  const debate = await Debate.findById(req.params.id);
  if (!debate) return res.status(404).json({ message: "Debate not found" });
  await Debate.findByIdAndDelete(req.params.id);
  await Argument.deleteMany({ debate: req.params.id });
  return res.json({ message: "Debate deleted" });
}

async function overrideScore(req, res) {
  const debate = await Debate.findById(req.params.id);
  if (!debate) return res.status(404).json({ message: "Debate not found" });

  const { userId, newScore } = req.body;
  if (!userId || newScore === undefined) return res.status(400).json({ message: "userId and newScore are required" });

  const ranking = debate.rankings.find(r => r.user.toString() === userId);
  if (!ranking) return res.status(404).json({ message: "User not found in rankings" });

  ranking.score = Number(newScore);

  // resort rankings
  debate.rankings.sort((a, b) => b.score - a.score);
  debate.rankings.forEach((r, i) => r.rank = i + 1);

  await debate.save();

  // also update match if possible
  const Match = require('../models/Match');
  await Match.updateOne({ userId, opponent: "Forum Debate" }, { score: newScore }).sort({ createdAt: -1 });

  return res.json({ debate });
}

module.exports = { listDebates, listPendingDebates, createDebate, getDebate, approveDebate, deleteDebate, setRoundState, tracking, overrideScore };
