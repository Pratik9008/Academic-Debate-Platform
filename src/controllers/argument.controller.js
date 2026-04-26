const Debate = require("../models/Debate");
const Argument = require("../models/Argument");
const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { requiredString } = require("../middleware/validate");

async function postArgument(req, res) {
  const debateId = requiredString(req.body.debateId, 80);
  const content = requiredString(req.body.content, 4000);
  const parentArgumentId = req.body.parentArgumentId ? requiredString(req.body.parentArgumentId, 80) : null;

  if (!debateId) return res.status(400).json({ message: "debateId is required" });
  if (!content) return res.status(400).json({ message: "content is required" });

  const debate = await Debate.findById(debateId);
  if (!debate) return res.status(404).json({ message: "Debate not found" });
  if (!debate.approved) return res.status(403).json({ message: "Debate not approved" });
  if (debate.status !== "active") return res.status(400).json({ message: "Debate is not active" });
  if (debate.roundState !== "open") return res.status(400).json({ message: "Round is closed" });

  const round = debate.round;

  const already = await Argument.findOne({
    debate: debate._id,
    author: req.user._id,
    round,
    deleted: false
  });
  if (already) return res.status(409).json({ message: "You already posted in this round" });

  let parentArgument = null;
  if (parentArgumentId) {
    parentArgument = await Argument.findById(parentArgumentId);
    if (!parentArgument || String(parentArgument.debate) !== String(debate._id)) {
      return res.status(400).json({ message: "Invalid parentArgumentId" });
    }
  }

  const arg = await Argument.create({
    debate: debate._id,
    author: req.user._id,
    round,
    parentArgument: parentArgument ? parentArgument._id : null,
    content
  });

  if (!debate.participants.some((id) => String(id) === String(req.user._id))) {
    debate.participants.push(req.user._id);
    await debate.save();
  }

  if (parentArgument) {
    await Notification.create({
      user: parentArgument.author,
      type: "reply",
      title: "New reply in a debate",
      body: "Someone replied to your argument.",
      link: `/debate.html?id=${debate._id}`
    });
  }

  // Notify the user themselves
  await Notification.create({
    user: req.user._id,
    type: "system",
    title: "Argument Posted",
    body: "You successfully posted an argument in a live debate. Keep up the good logic!",
    link: `/debate.html?id=${debate._id}`
  });

  // Notify all admins
  const admins = await User.find({ role: { $in: ["admin", "moderator"] } });
  for (const admin of admins) {
    await Notification.create({
      user: admin._id,
      type: "moderation",
      title: "New Debate Participation",
      body: `${req.user.name} posted a new argument in the debate "${debate.title}".`,
      link: `/debate.html?id=${debate._id}`
    });
  }

  const populated = await Argument.findById(arg._id).populate("author", "name role reputation");

  const io = req.app.get("io");
  if (io) {
    io.to(`debate_${debate._id}`).emit("new_argument", populated);
  }

  return res.status(201).json({ argument: populated });
}

async function replyToArgument(req, res) {
  const argumentId = requiredString(req.body.argumentId, 80);
  const content = requiredString(req.body.content, 2000);
  const parentCommentId = req.body.parentCommentId ? requiredString(req.body.parentCommentId, 80) : null;
  if (!argumentId) return res.status(400).json({ message: "argumentId is required" });
  if (!content) return res.status(400).json({ message: "content is required" });

  const arg = await Argument.findById(argumentId);
  if (!arg || arg.deleted) return res.status(404).json({ message: "Argument not found" });

  const debate = await Debate.findById(arg.debate);
  if (!debate || !debate.approved) return res.status(404).json({ message: "Debate not found" });

  let parentComment = null;
  if (parentCommentId) {
    parentComment = await Comment.findById(parentCommentId);
    if (!parentComment || String(parentComment.argument) !== String(arg._id)) {
      return res.status(400).json({ message: "Invalid parentCommentId" });
    }
  }

  const comment = await Comment.create({
    argument: arg._id,
    author: req.user._id,
    parentComment: parentComment ? parentComment._id : null,
    content
  });

  await Notification.create({
    user: arg.author,
    type: "reply",
    title: "New comment on your argument",
    body: "Someone commented on your argument.",
    link: `/debate.html?id=${debate._id}`
  });

  const populated = await Comment.findById(comment._id).populate("author", "name role reputation");
  return res.status(201).json({ comment: populated });
}

async function listComments(req, res) {
  const argumentId = requiredString(req.query.argumentId, 80);
  if (!argumentId) return res.status(400).json({ message: "argumentId is required" });

  const comments = await Comment.find({ argument: argumentId, deleted: false })
    .populate("author", "name role reputation")
    .sort({ createdAt: 1 })
    .limit(500);

  return res.json({ comments });
}

async function reportContent(req, res) {
  const targetType = requiredString(req.body.targetType, 20);
  const targetId = requiredString(req.body.targetId, 80);
  const reason = requiredString(req.body.reason, 120) || "Inappropriate";

  if (!["argument", "comment"].includes(targetType)) return res.status(400).json({ message: "Invalid targetType" });
  if (!targetId) return res.status(400).json({ message: "targetId is required" });

  if (targetType === "argument") {
    const arg = await Argument.findById(targetId);
    if (!arg) return res.status(404).json({ message: "Argument not found" });
    arg.reports.push({ by: req.user._id, reason });
    await arg.save();
  } else {
    const comment = await Comment.findById(targetId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    comment.reports.push({ by: req.user._id, reason });
    await comment.save();
  }

  return res.json({ ok: true });
}

async function modDeleteArgument(req, res) {
  const arg = await Argument.findById(req.params.id);
  if (!arg) return res.status(404).json({ message: "Argument not found" });
  arg.deleted = true;
  arg.deletedAt = new Date();
  await arg.save();
  return res.json({ ok: true });
}

module.exports = {
  postArgument,
  replyToArgument,
  listComments,
  reportContent,
  modDeleteArgument
};

