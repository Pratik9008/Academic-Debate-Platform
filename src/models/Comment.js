const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    argument: { type: mongoose.Schema.Types.ObjectId, ref: "Argument", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    reports: [
      {
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reason: { type: String, default: "Inappropriate" },
        at: { type: Date, default: Date.now }
      }
    ],
    deleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

commentSchema.index({ argument: 1, createdAt: 1 });

module.exports = mongoose.model("Comment", commentSchema);

