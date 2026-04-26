const User = require('../models/User');
const Debate = require('../models/Debate');
const Match = require('../models/Match');
const { generateEngineeringDebates } = require('../jobs/cron');

async function getAllUsers(req, res) {
  try {
    const users = await User.find({}, 'name email role reputation banned createdAt').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

async function getAllDebates(req, res) {
  try {
    const debates = await Debate.find().populate('createdBy', 'name').sort({ createdAt: -1 });
    res.json({ debates });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch debates" });
  }
}

async function getAllMatches(req, res) {
  try {
    const matches = await Match.find().populate('userId', 'name').sort({ createdAt: -1 });
    res.json({ matches });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch matches" });
  }
}

async function generateDemo(req, res) {
  try {
    const success = await generateEngineeringDebates(3, true); // Create 3 demo debates
    if (!success) return res.status(500).json({ error: "Failed to generate demo schedule." });
    return res.json({ message: "Demo schedule generated successfully! 3 Debates created." });
  } catch (error) {
    res.status(500).json({ error: "Internal error" });
  }
}

async function deleteMatch(req, res) {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });
    res.json({ message: "Match deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete match" });
  }
}

module.exports = { getAllUsers, getAllDebates, getAllMatches, generateDemo, deleteMatch };
