const User = require("../models/User");
const { requiredString } = require("../middleware/validate");

async function banUser(req, res) {
  const userId = requiredString(req.body.userId, 80);
  const banned = Boolean(req.body.banned);
  if (!userId) return res.status(400).json({ message: "userId is required" });

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  user.banned = banned;
  await user.save();
  return res.json({ ok: true });
}

module.exports = { banUser };

