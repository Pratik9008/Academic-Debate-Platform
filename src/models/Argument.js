const mongoose = require("mongoose");

const argumentSchema = new mongoose.Schema(
  {
    debate: { type: mongoose.Schema.Types.ObjectId, ref: "Debate", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    round: { type: Number, enum: [1, 2, 3], required: true },
    parentArgument: { type: mongoose.Schema.Types.ObjectId, ref: "Argument", default: null },
    content: { type: String, required: true, trim: true, maxlength: 4000 },
    score: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    reports: [
      {
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reason: { type: String, default: "Inappropriate" },
        at: { type: Date, default: Date.now }
      }
    ],
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

argumentSchema.index({ debate: 1, round: 1, createdAt: 1 });
argumentSchema.index({ parentArgument: 1, createdAt: 1 });

module.exports = mongoose.model("Argument", argumentSchema);

