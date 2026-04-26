const Debate = require("../models/Debate");
const User = require("../models/User");
const { requiredString } = require("../middleware/validate");

async function toggleBookmark(req, res) {
  const debateId = requiredString(req.body.debateId, 80);
  if (!debateId) return res.status(400).json({ message: "debateId is required" });

  const debate = await Debate.findById(debateId);
  if (!debate || !debate.approved) return res.status(404).json({ message: "Debate not found" });

  const user = await User.findById(req.user._id);
  const has = user.bookmarks.some((id) => String(id) === String(debate._id));

  if (has) {
    user.bookmarks = user.bookmarks.filter((id) => String(id) !== String(debate._id));
    debate.bookmarksCount = Math.max(0, (debate.bookmarksCount || 0) - 1);
  } else {
    user.bookmarks.push(debate._id);
    debate.bookmarksCount = (debate.bookmarksCount || 0) + 1;
  }

  await Promise.all([user.save(), debate.save()]);
  return res.json({ bookmarked: !has });
}

async function listBookmarks(req, res) {
  const user = await User.findById(req.user._id).populate("bookmarks");
  return res.json({ bookmarks: user.bookmarks || [] });
}

module.exports = { toggleBookmark, listBookmarks };

