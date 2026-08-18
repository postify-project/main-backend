import mongoose, { model } from "mongoose";

const repliedCommentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    platform: {
      type: String,
      enum: ["linkedin", "facebook", "instagram", "youtube"],
      required: true,
    },
    postId: {
      type: String, // Kis post par comment tha
      required: true,
    },
    commentId: {
      type: String, // Platform-specific comment ID (duplicate reply se bachne ke liye)
      required: true,
    },
    originalComment: {
      type: String, // User ne kya likha tha
      required: true,
    },
    generatedReply: {
      type: String, // AI ne kya jawab diya
      required: true,
    },
    sentiment: {
      type: String, // AI-detected sentiment (positive, negative, neutral)
      default: "neutral",
    },
  },
  { timestamps: true }
);

// Ek comment par sirf ek reply — duplicate se bachao
repliedCommentSchema.index(
  { user: 1, platform: 1, commentId: 1 },
  { unique: true }
);

export const RepliedComment = model("RepliedComment", repliedCommentSchema);
