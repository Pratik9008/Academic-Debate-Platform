const Debate = require("../models/Debate");

async function listArchive(req, res) {
  const { category, from, to } = req.query;
  const filter = { approved: true, status: "completed" };
  if (category) filter.category = category;
  if (from || to) {
    filter.updatedAt = {};
    if (from) filter.updatedAt.$gte = new Date(String(from));
    if (to) filter.updatedAt.$lte = new Date(String(to));
  }

  const debates = await Debate.find(filter)
    .populate("createdBy", "name role reputation")
    .sort({ updatedAt: -1 })
    .limit(100);

  return res.json({ debates });
}

module.exports = { listArchive };

