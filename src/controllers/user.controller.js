const User = require("../models/User");
const Debate = require("../models/Debate");
const Argument = require("../models/Argument");
const Match = require("../models/Match");
const { requiredString } = require("../middleware/validate");

async function me(req, res) {
  return res.json({ user: req.user });
}

async function updateProfile(req, res) {
  const bio = requiredString(req.body.bio, 280);
  const name = requiredString(req.body.name, 80);

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (typeof bio === "string") user.bio = bio;
  if (typeof name === "string") user.name = name;
  await user.save();

  return res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, bio: user.bio, reputation: user.reputation } });
}

async function leaderboard(req, res) {
  const topMatches = await Match.aggregate([
    {
      $group: {
        _id: "$userId",
        totalScore: { $sum: "$score" },
        matchesPlayed: { $sum: 1 }
      }
    },
    { $sort: { totalScore: -1 } },
    { $limit: 10 }
  ]);

  const populated = await User.populate(topMatches, { path: "_id", select: "name role bio reputation avatarSeed banned" });
  const activeUsers = populated.filter(p => p._id && !p._id.banned).map(p => ({
    user: p._id,
    totalScore: p.totalScore,
    matchesPlayed: p.matchesPlayed
  }));

  return res.json({ leaderboard: activeUsers });
}

async function participation(req, res) {
  const userId = req.user._id;
  const debates = await Debate.find({ participants: userId, approved: true })
    .select("title category status updatedAt")
    .sort({ updatedAt: -1 })
    .limit(30);

  const argumentsCount = await Argument.countDocuments({ author: userId, deleted: false });
  return res.json({ debates, argumentsCount });
}

module.exports = { me, updateProfile, leaderboard, participation };

