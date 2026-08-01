import { SocialAccount } from "../models/socialAccount.model.js";
import { ScheduledPost } from "../models/scheduledPost.model.js";
import { TrackedPost } from "../models/trackedPost.model.js";
import { metaService } from "../services/meta.service.js";
import { youtubeService } from "../services/youtube.service.js";
import { linkedinService } from "../services/linkedin.service.js";
import { linkedinCommentService } from "../services/linkedinComment.service.js";
import { uploadToCloudinary } from "../services/scheduledPost.service.js";

// Helper: Ensure LinkedIn Access Token is refreshed if expired
const getValidLinkedInToken = async (account) => {
    if (account.refreshToken && account.expiresAt && new Date() >= new Date(account.expiresAt)) {
        try {
            console.log(`🔄 Refreshing expired LinkedIn access token for ${account.accountName}...`);
            const tokenData = await linkedinService.refreshAccessToken(account.refreshToken);

            account.accessToken = tokenData.access_token;
            if (tokenData.refresh_token) {
                account.refreshToken = tokenData.refresh_token;
            }
            account.expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
            await account.save();

            console.log(`✅ LinkedIn token refreshed for ${account.accountName}`);
        } catch (err) {
            console.error(`⚠️ Failed to refresh LinkedIn token for ${account.accountName}:`, err.message);
        }
    }
    return account.accessToken;
};

// ==========================================
// 1. CONNECT YOUTUBE CALLBACK CONTROLLER
// ==========================================
export const youtubeCallbackController = async (req, res) => {
    try {
        const { accessToken, refreshToken, profile } = req.user;
        const userId = req.query.state;

        if (!userId) {
            return res.status(400).json({ message: "User context missing from OAuth state", status: false });
        }

        const channelId = profile.id;
        const channelName = profile.displayName;
        const profilePic = profile.photos?.[0]?.value || "";

        await SocialAccount.findOneAndUpdate(
            { user: userId, platform: "youtube", platformAccountId: channelId },
            {
                accountName: channelName,
                profilePicture: profilePic,
                accessToken,
                ...(refreshToken && { refreshToken }),
                expiresAt: new Date(Date.now() + 3600 * 1000),
            },
            { upsert: true, new: true }
        );

        const FRONTEND_URL = process.env.FRONTEND_URL || process.env.REACT_URL || "http://localhost:3000";
        return res.redirect(`${FRONTEND_URL}/dashboard/connections?status=success&platform=youtube`);
    } catch (error) {
        console.error("YouTube Callback Error:", error);
        return res.status(500).json({ message: error.message || "Failed to connect YouTube account", status: false });
    }
};

// ==========================================
// 2. CONNECT META (FACEBOOK / INSTAGRAM) CALLBACK
// ==========================================
export const metaCallbackController = async (req, res) => {
    try {
        const { accessToken: shortLivedToken } = req.user;
        const userId = req.query.state;

        if (!userId) {
            return res.status(400).json({ message: "User context missing from OAuth state", status: false });
        }

        const longLivedToken = await metaService.getLongLivedMetaToken(shortLivedToken);
        const pages = await metaService.getMetaAccounts(longLivedToken);

        for (const page of pages) {
            await SocialAccount.findOneAndUpdate(
                { user: userId, platform: "facebook", platformAccountId: page.id },
                {
                    accountName: page.name,
                    profilePicture: page.picture?.data?.url || "",
                    accessToken: page.access_token,
                    refreshToken: longLivedToken,
                    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                },
                { upsert: true, new: true }
            );

            if (page.instagram_business_account) {
                const ig = page.instagram_business_account;
                await SocialAccount.findOneAndUpdate(
                    { user: userId, platform: "instagram", platformAccountId: ig.id },
                    {
                        accountName: ig.username || page.name,
                        profilePicture: ig.profile_picture_url || "",
                        accessToken: page.access_token,
                        refreshToken: longLivedToken,
                        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                    },
                    { upsert: true, new: true }
                );
            }
        }

        const FRONTEND_URL = process.env.FRONTEND_URL || process.env.REACT_URL || "http://localhost:3000";
        return res.redirect(`${FRONTEND_URL}/dashboard/connections?status=success&platform=meta`);
    } catch (error) {
        console.error("Meta Callback Error:", error);
        return res.status(500).json({ message: error.message || "Failed to connect Meta accounts", status: false });
    }
};

// ==========================================
// 3. CONNECT LINKEDIN CALLBACK CONTROLLER
// ==========================================
export const linkedinCallbackController = async (req, res) => {
    try {
        const { accessToken, refreshToken, profile } = req.user;
        const userId = req.query.state;

        if (!userId) {
            return res.status(400).json({
                message: "User context missing from OAuth state",
                status: false,
            });
        }

        const linkedinId = profile.id || profile.sub;
        const accountName = profile.displayName || profile.name || "LinkedIn User";
        const profilePic = profile.photos?.[0]?.value || profile.picture || "";

        if (!linkedinId) {
            return res.status(400).json({
                message: "Failed to extract LinkedIn User ID from profile.",
                status: false,
            });
        }

        const personUrn = `urn:li:person:${linkedinId}`;

        await SocialAccount.findOneAndUpdate(
            { user: userId, platform: "linkedin", platformAccountId: personUrn },
            {
                accountName,
                profilePicture: profilePic,
                accessToken,
                ...(refreshToken && { refreshToken }),
                expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            },
            { upsert: true, new: true }
        );

        const FRONTEND_URL = process.env.FRONTEND_URL || process.env.REACT_URL || "http://localhost:3000";
        return res.redirect(
            `${FRONTEND_URL}/dashboard/connections?status=success&platform=linkedin`
        );
    } catch (error) {
        console.error("LinkedIn Callback Error:", error);
        return res.status(500).json({
            message: error.message || "Failed to connect LinkedIn account",
            status: false,
        });
    }
};

// ==========================================
// 4. GET CONNECTED SOCIAL ACCOUNTS LIST
// ==========================================
export const getConnectedAccounts = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const accounts = await SocialAccount.find({ user: userId }).select("-accessToken -refreshToken");
        return res.status(200).json({
            message: "Connected accounts fetched successfully",
            status: true,
            success: true,
            data: accounts,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message, status: false, success: false });
    }
};

// ==========================================
// 5. PUBLISH / SCHEDULE POST CONTROLLER
// ==========================================
export const handlePublishPost = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const { platform, caption, title, isScheduled, postTime } = req.body;
        const file = req.file;

        if (!platform) {
            return res.status(400).json({ message: "Target platform is required", status: false });
        }

        const targetPlatform = platform.toLowerCase();

        if (isScheduled === "true" || isScheduled === true) {
            if (!postTime) {
                return res.status(400).json({ message: "postTime is required for scheduled posts", status: false });
            }

            let mediaUrl = "";
            let mimeType = "";

            if (file) {
                const cloudRes = await uploadToCloudinary(file.buffer, file.originalname);
                mediaUrl = cloudRes.secure_url;
                mimeType = file.mimetype;
            }

            const scheduledPost = await ScheduledPost.create({
                user: userId,
                platform: targetPlatform,
                title: title || "",
                caption: caption || "",
                mediaUrl,
                mimeType,
                scheduledAt: new Date(postTime),
                status: "pending",
            });

            return res.status(201).json({
                message: `Post successfully scheduled for ${targetPlatform} at ${new Date(postTime).toLocaleString()}`,
                status: true,
                success: true,
                data: scheduledPost,
            });
        }

        const account = await SocialAccount.findOne({ user: userId, platform: targetPlatform });
        if (!account) {
            return res.status(400).json({
                message: `No connected account found for ${platform}. Please connect your account first.`,
                status: false,
            });
        }

        let result;
        switch (targetPlatform) {
            case "facebook": {
                result = await metaService.postToFacebookPage({
                    pageId: account.platformAccountId,
                    pageAccessToken: account.accessToken,
                    message: caption || title || "",
                    fileBuffer: file?.buffer,
                    mimeType: file?.mimetype,
                });
                break;
            }

            case "instagram": {
                if (!file) {
                    return res.status(400).json({
                        message: "Media file (Image or Video) is required to post on Instagram.",
                        status: false,
                    });
                }
                const cloudRes = await uploadToCloudinary(file.buffer, file.originalname);
                const isVideo = file.mimetype.startsWith("video/");

                result = await metaService.postToInstagram({
                    igUserId: account.platformAccountId,
                    accessToken: account.accessToken,
                    mediaUrl: cloudRes.secure_url,
                    caption: caption || "",
                    isVideo,
                });
                break;
            }

            case "youtube": {
                if (!file) {
                    return res.status(400).json({
                        message: "Video file is required for YouTube upload.",
                        status: false,
                    });
                }

                result = await youtubeService.uploadVideo({
                    accessToken: account.accessToken,
                    refreshToken: account.refreshToken,
                    title: title || caption || "Uploaded via Postify",
                    description: caption || "",
                    videoBuffer: file.buffer,
                    mimeType: file.mimetype,
                });
                break;
            }

            case "linkedin": {
                const validToken = await getValidLinkedInToken(account);

                result = await linkedinService.publishToLinkedIn({
                    authorUrn: account.platformAccountId,
                    accessToken: validToken,
                    caption: caption || "",
                    fileBuffer: file?.buffer,
                    mimeType: file?.mimetype,
                });
                break;
            }

            default:
                return res.status(400).json({
                    message: `Platform '${platform}' is not supported yet.`,
                    status: false,
                });
        }

        try {
            const postId = result?.postUrn || result?.id || result?.post_id || null;
            if (postId) {
                await TrackedPost.findOneAndUpdate(
                    { user: userId, platform: targetPlatform, postId: String(postId) },
                    { caption: caption || title || "" },
                    { upsert: true, new: true }
                );
            }
        } catch (trackErr) {
            console.warn("Post tracking failed:", trackErr);
        }

        return res.status(200).json({
            message: `Post successfully published to ${targetPlatform}!`,
            status: true,
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("Publish Post Controller Error:", error);
        return res.status(500).json({
            message: error.message || "Failed to publish post to social platform.",
            status: false,
        });
    }
};

// ==========================================
// 6. LINKEDIN COMMENTS ENDPOINTS
// ==========================================
export const getLinkedInComments = async (req, res) => {
    try {
        const { postUrn } = req.params;
        const userId = req.user._id || req.user.id;

        const account = await SocialAccount.findOne({ user: userId, platform: "linkedin" });
        if (!account) {
            return res.status(404).json({ message: "LinkedIn account not connected.", status: false });
        }
        const validToken = await getValidLinkedInToken(account);

        const comments = await linkedinCommentService.getPostComments(postUrn, validToken);
        return res.status(200).json({ message: "Comments fetched successfully", status: true, data: comments });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to fetch LinkedIn comments", status: false });
    }
};

export const postLinkedInComment = async (req, res) => {
    try {
        const { postUrn, message, parentCommentUrn } = req.body;
        const userId = req.user._id || req.user.id;

        if (!postUrn || !message) {
            return res.status(400).json({ message: "postUrn and message text are required.", status: false });
        }

        const account = await SocialAccount.findOne({ user: userId, platform: "linkedin" });
        if (!account) {
            return res.status(404).json({ message: "LinkedIn account not connected.", status: false });
        }

        const result = await linkedinCommentService.createComment({
            actorUrn: account.platformAccountId,
            postUrn,
            message,
            accessToken: account.accessToken,
            parentCommentUrn,
        });

        return res.status(201).json({ message: "Comment published successfully", status: true, data: result });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to post comment to LinkedIn", status: false });
    }
};

// ==========================================
// 7. DISCONNECT SOCIAL ACCOUNT
// ==========================================
export const disconnectAccount = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const { id } = req.params;

        let account;
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

        if (isObjectId) {
            account = await SocialAccount.findOneAndDelete({ _id: id, user: userId });
        } else {
            account = await SocialAccount.findOneAndDelete({ platform: id.toLowerCase(), user: userId });
        }

        if (!account) {
            return res.status(404).json({ message: "Connected account not found or unauthorized.", status: false });
        }

        return res.status(200).json({
            message: `Disconnected ${account.platform} account successfully!`,
            status: true,
            success: true,
            data: { id: account._id, platform: account.platform, accountName: account.accountName },
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Failed to disconnect social account.", status: false });
    }
};

// ==========================================
// 8. SCHEDULED POSTS MANAGEMENT
// ==========================================
export const getScheduledPosts = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const { status, platform } = req.query;

        const query = { user: userId };
        if (status) query.status = status;
        if (platform) query.platform = platform.toLowerCase();

        const posts = await ScheduledPost.find(query).sort({ scheduledAt: 1 });
        return res.status(200).json({ message: "Scheduled posts fetched successfully", status: true, success: true, data: posts });
    } catch (error) {
        return res.status(500).json({ message: error.message, status: false });
    }
};

export const deleteScheduledPost = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const { id } = req.params;

        const deletedPost = await ScheduledPost.findOneAndDelete({ _id: id, user: userId });
        if (!deletedPost) {
            return res.status(404).json({ message: "Scheduled post not found or unauthorized.", status: false });
        }

        return res.status(200).json({ message: "Scheduled post cancelled and deleted successfully!", status: true, success: true, data: deletedPost });
    } catch (error) {
        return res.status(500).json({ message: error.message, status: false });
    }
};