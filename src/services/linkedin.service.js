// src/services/linkedin.service.js
import axios from "axios";

const LINKEDIN_API_HEADERS = (accessToken) => ({
    Authorization: `Bearer ${accessToken}`,
    "LinkedIn-Version": "202606", // YYYYMM format requirement
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
});

/**
 * 1. Initialize image upload asset on LinkedIn
 */
async function initializeImageUpload(authorUrn, accessToken) {
    const response = await axios.post(
        "https://api.linkedin.com/rest/images?action=initializeUpload",
        {
            initializeUploadRequest: {
                owner: authorUrn,
            },
        },
        { headers: LINKEDIN_API_HEADERS(accessToken) }
    );

    const { uploadUrl, image } = response.data.value;
    return { uploadUrl, imageUrn: image };
}

/**
 * 2. Upload binary file buffer to LinkedIn upload URL
 */
async function uploadMediaBuffer(uploadUrl, fileBuffer, mimeType, accessToken) {
    await axios.put(uploadUrl, fileBuffer, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": mimeType,
        },
    });
}

/**
 * Main Service Handler: Text-only OR Image Post to LinkedIn
 */
export async function publishToLinkedIn({
    authorUrn,
    accessToken,
    caption,
    fileBuffer,
    mimeType,
}) {
    let mediaContent = null;

    // Step 1 & 2: Handle media upload if buffer exists
    if (fileBuffer && mimeType) {
        const { uploadUrl, imageUrn } = await initializeImageUpload(
            authorUrn,
            accessToken
        );

        await uploadMediaBuffer(uploadUrl, fileBuffer, mimeType, accessToken);

        mediaContent = {
            media: {
                id: imageUrn,
            },
        };
    }

    // Step 3: Construct payload and create post via /rest/posts
    const postPayload = {
        author: authorUrn,
        commentary: caption,
        visibility: "PUBLIC",
        distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        ...(mediaContent && { content: mediaContent }),
    };

    const response = await axios.post(
        "https://api.linkedin.com/rest/posts",
        postPayload,
        { headers: LINKEDIN_API_HEADERS(accessToken) }
    );

    // LinkedIn returns the newly created Post URN in the 'x-restli-id' header
    const createdPostUrn = response.headers["x-restli-id"] || response.data?.id;

    return {
        postUrn: createdPostUrn,
        success: true,
    };
}

export const linkedinService = {
    publishToLinkedIn,
};