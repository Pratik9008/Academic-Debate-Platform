const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    opponent: { type: String, required: true }, // "AI Robot" or Opponent Name
    mode: { type: String, enum: ["ai", "live"], required: true },
    score: { type: Number, required: true },
    feedback: { type: String, required: true },
    transcript: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Match", matchSchema);
