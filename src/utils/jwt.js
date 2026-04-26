const jwt = require("jsonwebtoken");

function signToken(user) {
  const payload = {
    sub: String(user._id),
    role: user.role,
    name: user.name,
    email: user.email
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

module.exports = { signToken };

