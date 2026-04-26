const mongoose = require("mongoose");

const debateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, enum: ["Science", "Tech", "Politics"], required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    approved: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "upcoming", "active", "completed"], default: "pending" },
    round: { type: Number, enum: [1, 2, 3], default: 1 }, // 1=Opening,2=Counter,3=Final
    roundState: { type: String, enum: ["open", "closed"], default: "open" },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    bookmarksCount: { type: Number, default: 0 },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    aiGraded: { type: Boolean, default: false },
    rankings: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        score: Number,
        feedback: String,
        rank: Number
      }
    ]
  },
  { timestamps: true }
);

debateSchema.index({ title: "text", description: "text" });
debateSchema.index({ category: 1, status: 1, approved: 1, createdAt: -1 });

module.exports = mongoose.model("Debate", debateSchema);

