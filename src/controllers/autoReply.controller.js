// src/controllers/autoReply.controller.js
import { runAutoReplyJob } from "../services/autoReply.service.js";
import { processScheduledPosts } from "../services/scheduledPost.service.js";
import { RepliedComment } from "../models/repliedComment.model.js";

// Helper to verify cron secret from query, x-cron-secret, or Authorization header
const isCronAuthorized = (req) => {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) return false;

  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  const providedSecret =
    req.query.secret ||
    req.headers["x-cron-secret"] ||
    bearerToken;

  return providedSecret === expectedSecret;
};

/**
 * Main Cron endpoint — triggered periodically (e.g. every 5-10 mins) by external cron service
 * Secured with CRON_SECRET to prevent unauthorized access
 */
export const triggerAutoReply = async (req, res) => {
  try {
    // 1. Verify cron secret (prevent random hits)
    if (!isCronAuthorized(req)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized — invalid or missing cron secret",
      });
    }

    // 2. Run background jobs (Scheduled Posts publishing + Comment Auto-Replies)
    console.log("🚀 Cron triggered: Running scheduled posts executor & auto-reply job...");
    const scheduledStats = await processScheduledPosts();
    const autoReplyStats = await runAutoReplyJob();

    return res.status(200).json({
      success: true,
      message: "Cron background jobs completed successfully",
      timestamp: new Date().toISOString(),
      data: {
        scheduledPosts: scheduledStats,
        autoReply: autoReplyStats,
      },
    });
  } catch (error) {
    console.error("Cron Auto-Reply Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Cron job execution failed",
      error: error.message,
    });
  }
};

/**
 * Dedicated Scheduled Posts execution trigger
 */
export const triggerScheduledPostsOnly = async (req, res) => {
  try {
    if (!isCronAuthorized(req)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized — invalid or missing cron secret",
      });
    }

    console.log("⏰ Dedicated Cron Trigger: Processing Scheduled Posts...");
    const stats = await processScheduledPosts();

    return res.status(200).json({
      success: true,
      message: "Scheduled posts processed successfully",
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get auto-reply history for the logged-in user
 */
export const getAutoReplyHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { platform, page = 1, limit = 20 } = req.query;

    const filter = { user: userId };
    if (platform) filter.platform = platform;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [replies, total] = await Promise.all([
      RepliedComment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      RepliedComment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Auto-reply history fetched",
      data: {
        replies,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch auto-reply history",
    });
  }
};
