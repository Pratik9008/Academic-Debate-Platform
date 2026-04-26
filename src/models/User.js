const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "moderator", "admin"], default: "user" },
    bio: { type: String, default: "", maxlength: 280 },
    reputation: { type: Number, default: 0 },
    banned: { type: Boolean, default: false },
    avatarSeed: { type: String, default: "" },
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Debate" }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

