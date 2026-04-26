const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { isEmail, requiredString } = require("../middleware/validate");
const { signToken } = require("../utils/jwt");
const Notification = require("../models/Notification");

async function signup(req, res) {
  const name = requiredString(req.body.name, 80);
  const emailRaw = requiredString(req.body.email, 200);
  const password = requiredString(req.body.password, 200);
  const confirmPassword = requiredString(req.body.confirmPassword, 200);

  if (!name) return res.status(400).json({ message: "Name is required" });
  if (!emailRaw || !isEmail(emailRaw)) return res.status(400).json({ message: "Valid email is required" });
  if (!String(emailRaw).toLowerCase().endsWith("@gmail.com")) return res.status(400).json({ message: "Only @gmail.com emails are allowed" });
  if (!password || password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
  if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });

  const email = emailRaw.toLowerCase();
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 12);
  const avatarSeed = `${name}:${Date.now()}`;

  const user = await User.create({ name, email, passwordHash, avatarSeed });
  const token = signToken(user);

  await Notification.create({
    user: user._id,
    type: "system",
    title: "Welcome to Academic Debate Platform!",
    body: "Your account has been successfully created. Head over to the Play Arena to start your first debate!",
    link: "/play.html"
  });

  return res.status(201).json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, bio: user.bio, reputation: user.reputation }
  });
}

async function login(req, res) {
  const emailRaw = requiredString(req.body.email, 200);
  const password = requiredString(req.body.password, 200);

  if (!emailRaw || !isEmail(emailRaw)) return res.status(400).json({ message: "Valid email is required" });
  if (!String(emailRaw).toLowerCase().endsWith("@gmail.com")) return res.status(400).json({ message: "Only @gmail.com emails are allowed" });
  if (!password) return res.status(400).json({ message: "Password is required" });

  const email = emailRaw.toLowerCase();
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  if (user.banned) return res.status(403).json({ message: "User is banned" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = signToken(user);

  if (user.role === "admin" || user.role === "moderator") {
    await Notification.create({
      user: user._id,
      type: "system",
      title: `Welcome back, ${user.name}!`,
      body: "You have successfully logged into the Admin Portal. There may be new debates to review.",
      link: "/admin.html"
    });
  } else {
    await Notification.create({
      user: user._id,
      type: "system",
      title: `Welcome back, ${user.name}!`,
      body: "You have successfully logged in. Ready for your next debate?",
      link: "/play.html"
    });
  }
  return res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, bio: user.bio, reputation: user.reputation }
  });
}

module.exports = { signup, login };

