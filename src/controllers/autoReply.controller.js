// src/controllers/autoReply.controller.js
import { runAutoReplyJob } from "../services/autoReply.service.js";
import { processScheduledPosts } from "../services/scheduledPost.service.js";
import { RepliedComment } from "../models/repliedComment.model.js";

/**
 * Cron endpoint — triggered every 10 mins by external cron service
 * Secured with CRON_SECRET to prevent unauthorized access
 */
export const triggerAutoReply = async (req, res) => {
  try {
    // 1. Verify cron secret (prevent random hits)
    const secret = req.query.secret || req.headers["x-cron-secret"];
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized — invalid cron secret",
      });
    }

    // 2. Run background jobs (Scheduled Posts publishing + Comment Auto-Replies)
    console.log("🚀 Cron triggered: Running scheduled posts executor & auto-reply job...");
    const scheduledStats = await processScheduledPosts();
    const autoReplyStats = await runAutoReplyJob();

    return res.status(200).json({
      success: true,
      message: "Cron background jobs completed successfully",
      data: {
        scheduledPosts: scheduledStats,
        autoReply: autoReplyStats,
      },
    });
  } catch (error) {
    console.error("Cron Auto-Reply Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Auto-reply job failed",
      error: error.message,
    });
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
