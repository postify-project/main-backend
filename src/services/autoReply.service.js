// src/services/autoReply.service.js
// Main orchestrator — finds new comments, generates AI replies, posts them
import axios from "axios";
import { UserModel } from "../models/user.model.js";
import { SocialAccount } from "../models/socialAccount.model.js";
import { TrackedPost } from "../models/trackedPost.model.js";
import { RepliedComment } from "../models/repliedComment.model.js";
import { getValidLinkedInToken } from "./linkedinAuth.service.js";
import {
  fetchLinkedInComments,
  replyToLinkedInComment,
  fetchFacebookComments,
  replyToFacebookComment,
  fetchInstagramComments,
  replyToInstagramComment,
  fetchYouTubeComments,
  replyToYouTubeComment,
} from "./comments.service.js";

const AI_BASE_URL = process.env.AI_BACKEND_URL || process.env.PYTHON_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * Call AI API to generate a context-aware reply
 */
async function getAIReply(platform, commentText, postContext) {
  try {
    const response = await axios.post(`${AI_BASE_URL}/api/ai/reply/`, {
      platform,
      comment: commentText,
      context: postContext || "Social media post",
    });

    return {
      reply: response.data?.suggested_reply || null,
      sentiment: response.data?.sentiment || "neutral",
    };
  } catch (error) {
    console.error("AI Reply Generation Error:", error.response?.data || error.message);
    return null;
  }
}

/**
 * Process comments for a single tracked post
 */
async function processPostComments(user, post, account) {
  const results = { processed: 0, replied: 0, errors: 0 };

  try {
    // 1. Fetch comments based on platform
    let comments = [];

    switch (post.platform) {
      case "linkedin": {
        const validToken = await getValidLinkedInToken(account);
        comments = await fetchLinkedInComments(post.postId, validToken);
        break;
      }
      case "facebook":
        comments = await fetchFacebookComments(post.postId, account.accessToken);
        break;
      case "instagram":
        comments = await fetchInstagramComments(post.postId, account.accessToken);
        break;
      case "youtube":
        comments = await fetchYouTubeComments(
          post.postId,
          account.accessToken,
          account.refreshToken
        );
        break;
    }

    if (!comments.length) return results;

    // 2. Get already-replied comment IDs to avoid duplicates
    const existingReplies = await RepliedComment.find({
      user: user._id,
      platform: post.platform,
      postId: post.postId,
    }).select("commentId");

    const repliedIds = new Set(existingReplies.map((r) => r.commentId));

    // 3. Filter to only new (unreplied) comments
    const newComments = comments.filter((c) => !repliedIds.has(c.commentId));

    if (!newComments.length) return results;

    // 4. Process each new comment
    for (const comment of newComments) {
      results.processed++;

      try {
        // Skip empty comments
        if (!comment.text?.trim()) continue;

        // Generate AI reply
        const aiResult = await getAIReply(
          post.platform,
          comment.text,
          post.caption
        );

        if (!aiResult?.reply) {
          console.error(`AI failed to generate reply for comment: ${comment.commentId}`);
          results.errors++;
          continue;
        }

        // Post the reply on the platform
        let replyResult;

        switch (post.platform) {
          case "linkedin": {
            const validToken = await getValidLinkedInToken(account);
            replyResult = await replyToLinkedInComment({
              postId: post.postId,
              commentId: comment.commentId,
              replyText: aiResult.reply,
              accessToken: validToken,
              actorUrn: account.platformAccountId,
            });
            break;
          }
          case "facebook":
            replyResult = await replyToFacebookComment({
              commentId: comment.commentId,
              replyText: aiResult.reply,
              accessToken: account.accessToken,
            });
            break;
          case "instagram":
            replyResult = await replyToInstagramComment({
              mediaId: post.postId,
              commentId: comment.commentId,
              replyText: aiResult.reply,
              accessToken: account.accessToken,
            });
            break;
          case "youtube":
            replyResult = await replyToYouTubeComment({
              commentId: comment.commentId,
              replyText: aiResult.reply,
              accessToken: account.accessToken,
              refreshToken: account.refreshToken,
            });
            break;
        }

        if (replyResult?.success) {
          // Save to RepliedComment collection (prevents future duplicate)
          await RepliedComment.create({
            user: user._id,
            platform: post.platform,
            postId: post.postId,
            commentId: comment.commentId,
            originalComment: comment.text,
            generatedReply: aiResult.reply,
            sentiment: aiResult.sentiment,
          });

          results.replied++;
          console.log(
            `✅ Auto-replied on ${post.platform} | Post: ${post.postId} | Comment by: ${comment.authorName}`
          );
        } else {
          results.errors++;
          console.error(
            `❌ Failed to reply on ${post.platform} | Comment: ${comment.commentId}`
          );
        }
      } catch (commentError) {
        results.errors++;
        console.error(
          `Error processing comment ${comment.commentId}:`,
          commentError.message
        );
      }
    }
  } catch (error) {
    console.error(
      `Error processing post ${post.postId} on ${post.platform}:`,
      error.message
    );
    results.errors++;
  }

  return results;
}

/**
 * Main entry point — called by cron endpoint
 * Processes all users with auto-reply enabled
 */
export async function runAutoReplyJob() {
  const startTime = Date.now();
  const stats = {
    usersProcessed: 0,
    postsScanned: 0,
    commentsProcessed: 0,
    repliesSent: 0,
    errors: 0,
  };

  try {
    // 1. Find all users with auto-reply enabled
    const users = await UserModel.find({
      "autoReply.enabled": true,
      "autoReply.platforms.0": { $exists: true }, // At least 1 platform enabled
    }).select("_id autoReply");

    if (!users.length) {
      console.log("🔄 Auto-Reply Job: No users with auto-reply enabled.");
      return { ...stats, duration: Date.now() - startTime };
    }

    console.log(`🔄 Auto-Reply Job: Processing ${users.length} user(s)...`);

    // 2. Process each user
    for (const user of users) {
      stats.usersProcessed++;

      try {
        // Get tracked posts only for enabled platforms
        const trackedPosts = await TrackedPost.find({
          user: user._id,
          platform: { $in: user.autoReply.platforms },
        }).sort({ createdAt: -1 }).limit(20); // Last 20 posts per user max

        if (!trackedPosts.length) continue;

        for (const post of trackedPosts) {
          stats.postsScanned++;

          // Get the user's social account for this platform
          const account = await SocialAccount.findOne({
            user: user._id,
            platform: post.platform,
          });

          if (!account) continue;

          const postResults = await processPostComments(user, post, account);

          stats.commentsProcessed += postResults.processed;
          stats.repliesSent += postResults.replied;
          stats.errors += postResults.errors;
        }
      } catch (userError) {
        stats.errors++;
        console.error(
          `Error processing user ${user._id}:`,
          userError.message
        );
      }
    }

    stats.duration = Date.now() - startTime;
    console.log(
      `✅ Auto-Reply Job Complete | Users: ${stats.usersProcessed} | Posts: ${stats.postsScanned} | Replies: ${stats.repliesSent} | Errors: ${stats.errors} | Duration: ${stats.duration}ms`
    );

    return stats;
  } catch (error) {
    console.error("Auto-Reply Job Fatal Error:", error.message);
    stats.errors++;
    stats.duration = Date.now() - startTime;
    return stats;
  }
}
