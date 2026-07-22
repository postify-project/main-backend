import { SocialAccount } from "../models/socialAccount.model.js";
import * as youtubeService from "../services/youtube.service.js";
import * as metaService from "../services/meta.service.js";
import { cloudinaryUploader as uploadToCloudinary } from "../config/cloudinary.js"; // Standard Cloudinary uploader function

// ==========================================
// 1. CONNECT YOUTUBE CALLBACK
// ==========================================
export const youtubeCallbackController = async (req, res) => {
    try {
        
        const { accessToken, refreshToken, profile } = req.user;
        const userId = req.query.state; // Passed during passport redirect

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

        const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
        return res.redirect(`${FRONTEND_URL}/dashboard/accounts?status=success&platform=youtube`);
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

        // Step A: Exchange for 60-day token
        const longLivedToken = await metaService.getLongLivedMetaToken(shortLivedToken);

        // Step B: Fetch managed Pages and linked Instagram accounts
        const pages = await metaService.getMetaAccounts(longLivedToken);

        for (const page of pages) {
            // Upsert Facebook Page
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

            // Upsert linked Instagram account
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

        const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
        return res.redirect(`${FRONTEND_URL}/dashboard/accounts?status=success&platform=meta`);
    } catch (error) {
        console.error("Meta Callback Error:", error);
        return res.status(500).json({ message: error.message || "Failed to connect Meta accounts", status: false });
    }
};

// ==========================================
// 3. PUBLISH POST CONTROLLER
// ==========================================
export const handlePublishPost = async (req, res) => {
    try {
        const { platform, caption, title } = req.body;
        const userId = req.user._id || req.user.id;

        const mediaFile = req.files?.media?.[0] || req.file;
        const thumbnailFile = req.files?.thumbnail?.[0]; // Optional YouTube thumbnail

        if (!mediaFile) {
            return res.status(400).json({ message: "Media file is required to publish post!", status: false });
        }

        if (!platform) {
            return res.status(400).json({ message: "Target platform is required!", status: false });
        }

        // Lookup user's account for target platform
        const account = await SocialAccount.findOne({
            user: userId,
            platform: platform.toLowerCase(),
        });

        if (!account) {
            return res.status(404).json({
                message: `No connected ${platform} account found. Please connect your account first.`,
                status: false,
            });
        }

        let result;

        switch (platform.toLowerCase()) {
            case "youtube": {
                // 💡 FIX 2: Pass thumbnail parameters to your YouTube service
                result = await youtubeService.uploadYouTubeVideo({
                    accessToken: account.accessToken,
                    refreshToken: account.refreshToken,
                    fileBuffer: mediaFile.buffer,
                    mimeType: mediaFile.mimetype,
                    title,
                    description: caption,
                    thumbnailBuffer: thumbnailFile?.buffer,
                    thumbnailMimeType: thumbnailFile?.mimetype,
                });
                break;
            }

            case "facebook": {
                result = await metaService.postToFacebookPage({
                    pageId: account.platformAccountId,
                    pageAccessToken: account.accessToken,
                    message: caption || "",
                    fileBuffer: mediaFile.buffer,
                    mimeType: mediaFile.mimetype,
                });
                break;
            }

            case "instagram": {
                // Upload memory buffer to Cloudinary to generate public HTTPS URL required by Meta API
                const uploadRes = await uploadToCloudinary(mediaFile.buffer);

                result = await metaService.postToInstagram({
                    instagramAccountId: account.platformAccountId,
                    accessToken: account.accessToken,
                    caption: caption || "",
                    mediaUrl: uploadRes.secure_url,
                    mimeType: mediaFile.mimetype,
                });
                break;
            }

            default:
                return res.status(400).json({ message: `Platform '${platform}' is not supported yet.`, status: false });
        }

        return res.status(200).json({
            message: `Post successfully published to ${platform}!`,
            status: true,
            data: result,
        });
    } catch (error) {
        console.error("Publishing Error:", error);
        return res.status(500).json({ message: error.message || "Failed to publish post.", status: false });
    }
};

// ==========================================
// 4. GET CONNECTED ACCOUNTS
// ==========================================
export const getConnectedAccounts = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const accounts = await SocialAccount.find({ user: userId }).select("-accessToken -refreshToken");

        return res.status(200).json({
            message: "Connected accounts fetched successfully",
            status: true,
            data: accounts,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message, status: false });
    }
};