// src/services/scheduledPost.service.js
import axios from "axios";
import { ScheduledPost } from "../models/scheduledPost.model.js";
import { SocialAccount } from "../models/socialAccount.model.js";
import { TrackedPost } from "../models/trackedPost.model.js";
import { cloudinary } from "../config/cloudinary.js";
import * as youtubeService from "./youtube.service.js";
import * as metaService from "./meta.service.js";
import * as linkedinService from "./linkedin.service.js";
import { getValidLinkedInToken } from "./linkedinAuth.service.js";

/**
 * Helper to upload buffer to Cloudinary
 */
export const uploadToCloudinary = (buffer, filename = "upload") => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: "auto", public_id: `postify_${Date.now()}` },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        stream.end(buffer);
    });
};

/**
 * Helper to download media file buffer from Cloudinary URL for upload to platforms
 */
async function fetchMediaBuffer(mediaUrl) {
  if (!mediaUrl) return null;
  const response = await axios.get(mediaUrl, { responseType: "arraybuffer" });
  return Buffer.from(response.data);
}

/**
 * Process single scheduled post execution
 */
async function executeScheduledPost(post) {
  const account = await SocialAccount.findOne({
    user: post.user,
    platform: post.platform,
  });

  if (!account) {
    throw new Error(`No connected ${post.platform} account found for this user.`);
  }

  let result;
  let fileBuffer = null;

  if (post.mediaUrl) {
    fileBuffer = await fetchMediaBuffer(post.mediaUrl);
  }

  switch (post.platform) {
    case "youtube": {
      if (!fileBuffer) {
        throw new Error("YouTube post requires a video file.");
      }
      result = await youtubeService.uploadYouTubeVideo({
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        fileBuffer: fileBuffer,
        mimeType: post.mimeType || "video/mp4",
        title: post.title || post.caption?.slice(0, 100) || "Scheduled Video",
        description: post.caption || "",
      });
      break;
    }

    case "facebook": {
      result = await metaService.postToFacebookPage({
        pageId: account.platformAccountId,
        pageAccessToken: account.accessToken,
        message: post.caption || "",
        fileBuffer: fileBuffer,
        mimeType: post.mimeType || "image/jpeg",
      });
      break;
    }

    case "instagram": {
      if (!post.mediaUrl) {
        throw new Error("Instagram post requires a media file.");
      }
      result = await metaService.postToInstagram({
        instagramAccountId: account.platformAccountId,
        accessToken: account.accessToken,
        caption: post.caption || "",
        mediaUrl: post.mediaUrl,
        mimeType: post.mimeType || "image/jpeg",
      });
      break;
    }

    case "linkedin": {
      const validToken = await getValidLinkedInToken(account);
      result = await linkedinService.publishToLinkedIn({
        authorUrn: account.platformAccountId,
        accessToken: validToken,
        caption: post.caption || "",
        fileBuffer: fileBuffer,
        mimeType: post.mimeType,
      });
      break;
    }

    default:
      throw new Error(`Unsupported platform: ${post.platform}`);
  }

  const publishedPostId =
    result?.postUrn ||
    result?.id ||
    result?.post_id ||
    null;

  if (publishedPostId) {
    try {
      await TrackedPost.findOneAndUpdate(
        { user: post.user, platform: post.platform, postId: String(publishedPostId) },
        { caption: post.caption || post.title || "" },
        { upsert: true, new: true }
      );
    } catch (trackErr) {
      console.error("Tracking error during scheduled post execution:", trackErr.message);
    }
  }

  return result;
}

/**
 * Main service to process due scheduled posts (called by cron)
 */
export async function processScheduledPosts() {
  const startTime = Date.now();
  const stats = {
    duePostsFound: 0,
    published: 0,
    failed: 0,
  };

  try {
    const now = new Date();

    const duePosts = await ScheduledPost.find({
      status: "pending",
      scheduledAt: { $lte: now },
    }).sort({ scheduledAt: 1 }).limit(20);

    stats.duePostsFound = duePosts.length;

    if (!duePosts.length) {
      return { ...stats, duration: Date.now() - startTime };
    }

    console.log(`⏰ Scheduled Posts Executor: Found ${duePosts.length} due post(s)...`);

    for (const post of duePosts) {
      try {
        await executeScheduledPost(post);

        post.status = "published";
        post.publishedAt = new Date();
        post.errorMessage = null;
        await post.save();

        stats.published++;
        console.log(`✅ Scheduled Post Published | Platform: ${post.platform} | User: ${post.user}`);
      } catch (error) {
        stats.failed++;
        post.status = "failed";
        post.errorMessage = error.message;
        await post.save();

        console.error(`❌ Scheduled Post Failed | Platform: ${post.platform} | Error: ${error.message}`);
      }
    }

    stats.duration = Date.now() - startTime;
    return stats;
  } catch (error) {
    console.error("Scheduled Posts Execution Fatal Error:", error.message);
    stats.duration = Date.now() - startTime;
    return stats;
  }
}
