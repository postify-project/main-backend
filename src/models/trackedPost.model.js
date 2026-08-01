import mongoose, { model } from "mongoose";

const trackedPostSchema = new mongoose.Schema(
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
      type: String, // Platform-specific ID (LinkedIn URN, FB Post ID, IG Media ID, YT Video ID)
      required: true,
    },
    caption: {
      type: String, // Original post text — sent as "context" to AI for better reply generation
      default: "",
    },
  },
  { timestamps: true }
);

// Ek post sirf ek baar track ho — duplicate entry na bane
trackedPostSchema.index({ user: 1, platform: 1, postId: 1 }, { unique: true });

// Purane posts automatically clean up (optional: 30 days ke baad monitoring band)
trackedPostSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const TrackedPost = model("TrackedPost", trackedPostSchema);
