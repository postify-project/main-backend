import { google } from "googleapis";
import { Readable } from "stream";

const bufferToStream = (buffer) => {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
};

export const uploadYouTubeVideo = async ({
    accessToken,
    refreshToken,
    fileBuffer,
    videoBuffer,
    mimeType,
    title,
    description,
    thumbnailBuffer,
    thumbnailMimeType,
}) => {
    const bufferToUse = fileBuffer || videoBuffer;
    if (!bufferToUse) {
        throw new Error("Video file buffer is required for YouTube upload.");
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.YOUTUBE_CALLBACK_URL
    );

    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
    });

    try {
        const tokenInfo = await oauth2Client.getAccessToken();
        if (!tokenInfo.token) {
            const { credentials } = await oauth2Client.refreshAccessToken();
            oauth2Client.setCredentials(credentials);
        }
    } catch (tokenErr) {
        console.error("Failed to refresh YouTube token:", tokenErr.message);
        throw new Error("YouTube session expired. Please reconnect your YouTube account.");
    }

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const videoResponse = await youtube.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
            snippet: {
                title: title || "New Upload",
                description: description || "",
                categoryId: "22",
            },
            status: {
                privacyStatus: "public",
            },
        },
        media: {
            mimeType: mimeType || "video/mp4",
            body: bufferToStream(bufferToUse),
        },
    });

    const videoData = videoResponse.data;

    let thumbnailSuccess = false;
    let thumbnailWarning = null;

    if (thumbnailBuffer && videoData.id) {
        try {
            await youtube.thumbnails.set({
                videoId: videoData.id,
                auth: oauth2Client,
                media: {
                    mimeType: thumbnailMimeType || "image/jpeg",
                    body: bufferToStream(thumbnailBuffer),
                },
            });
            thumbnailSuccess = true;
        } catch (thumbnailError) {
            const errData = thumbnailError.response?.data?.error || {};
            const message = errData.message || thumbnailError.message;

            console.error("YouTube Thumbnail Error:", message);

            if (
                message.includes("channelNotVerified") ||
                message.includes("forbidden") ||
                thumbnailError.response?.status === 403
            ) {
                thumbnailWarning = "Video uploaded, but custom thumbnail failed: Your YouTube channel is not phone-verified.";
            } else {
                thumbnailWarning = `Video uploaded, but thumbnail failed: ${message}`;
            }
        }
    }

    return {
        ...videoData,
        thumbnailUploaded: thumbnailSuccess,
        ...(thumbnailWarning && { warning: thumbnailWarning }),
    };
};

export const youtubeService = {
    uploadYouTubeVideo,
    uploadVideo: uploadYouTubeVideo,
};