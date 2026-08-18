import mongoose, { model } from "mongoose";

const scheduledPostSchema = new mongoose.Schema(
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
    title: {
      type: String, // Title for YouTube or video posts
      default: "",
    },
    caption: {
      type: String,
      default: "",
    },
    mediaUrl: {
      type: String, // Cloudinary URL for uploaded media
      default: null,
    },
    mimeType: {
      type: String, // e.g., image/png, video/mp4
      default: null,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "published", "failed"],
      default: "pending",
    },
    errorMessage: {
      type: String,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for fast querying of due posts by cron
scheduledPostSchema.index({ status: 1, scheduledAt: 1 });
scheduledPostSchema.index({ user: 1, status: 1 });

export const ScheduledPost = model("ScheduledPost", scheduledPostSchema);
