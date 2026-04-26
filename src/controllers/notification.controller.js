const Notification = require("../models/Notification");

async function listNotifications(req, res) {
  const items = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  return res.json({ notifications: items });
}

async function markRead(req, res) {
  await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
  return res.json({ ok: true });
}

module.exports = { listNotifications, markRead };

