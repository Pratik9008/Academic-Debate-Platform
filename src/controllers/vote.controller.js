const Argument = require("../models/Argument");
const Comment = require("../models/Comment");
const Vote = require("../models/Vote");
const User = require("../models/User");
const { requiredString } = require("../middleware/validate");

async function castVote(req, res) {
  const targetType = requiredString(req.body.targetType, 20);
  const targetId = requiredString(req.body.targetId, 80);
  const value = Number(req.body.value);

  if (!["argument", "comment"].includes(targetType)) return res.status(400).json({ message: "Invalid targetType" });
  if (!targetId) return res.status(400).json({ message: "targetId is required" });
  if (![1, -1].includes(value)) return res.status(400).json({ message: "value must be 1 or -1" });

  let target;
  if (targetType === "argument") target = await Argument.findById(targetId);
  else target = await Comment.findById(targetId);
  if (!target) return res.status(404).json({ message: "Target not found" });

  const existing = await Vote.findOne({ user: req.user._id, targetType, targetId });

  let delta = value;
  if (!existing) {
    await Vote.create({ user: req.user._id, targetType, targetId, value });
  } else if (existing.value === value) {
    await existing.deleteOne();
    delta = -value;
  } else {
    existing.value = value;
    await existing.save();
    delta = value * 2; // -1 -> +1 = +2, +1 -> -1 = -2
  }

  if (targetType === "argument") {
    target.score += delta;
    if (delta > 0) target.likes += 1;
    else target.dislikes += 1;
    await target.save();
  } else {
    if (delta > 0) target.likes += 1;
    else target.dislikes += 1;
    await target.save();
  }

  if (targetType === "argument") {
    await User.findByIdAndUpdate(target.author, { $inc: { reputation: delta } });
    const io = req.app.get("io");
    if (io && target.debate) {
      io.to(`debate_${target.debate}`).emit("vote_update", { argumentId: target._id, score: target.score });
    }
  }

  return res.json({ ok: true, delta });
}

module.exports = { castVote };

