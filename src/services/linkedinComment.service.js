// src/services/linkedinComment.service.js
import axios from "axios";

const LINKEDIN_API_HEADERS = (accessToken) => ({
    Authorization: `Bearer ${accessToken}`,
    "LinkedIn-Version": "202606",
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
});

/**
 * 1. Fetch Comments for a LinkedIn Post URN
 * @param {string} postUrn - e.g., "urn:li:share:12345" or "urn:li:ugcPost:12345"
 * @param {string} accessToken
 */
export async function getPostComments(postUrn, accessToken) {
    const encodedUrn = encodeURIComponent(postUrn);
    const url = `https://api.linkedin.com/rest/socialActions/${encodedUrn}/comments`;

    const response = await axios.get(url, {
        headers: LINKEDIN_API_HEADERS(accessToken),
    });

    return response.data?.elements || [];
}

/**
 * 2. Post a Comment or Reply to a Post
 * @param {string} actorUrn - urn:li:person:XXXXXX
 * @param {string} postUrn - Target Post URN
 * @param {string} message - Comment text
 * @param {string} accessToken
 * @param {string} [parentCommentUrn] - Optional composite URN for replying to a comment
 */
export async function createComment({
    actorUrn,
    postUrn,
    message,
    accessToken,
    parentCommentUrn = null,
}) {
    const encodedUrn = encodeURIComponent(postUrn);
    const url = `https://api.linkedin.com/rest/socialActions/${encodedUrn}/comments`;

    const payload = {
        actor: actorUrn,
        message: {
            text: message,
        },
        ...(parentCommentUrn && { parentComment: parentCommentUrn }),
    };

    const response = await axios.post(url, payload, {
        headers: LINKEDIN_API_HEADERS(accessToken),
    });

    return {
        commentUrn: response.headers["x-restli-id"] || response.data?.id,
        success: true,
    };
}

export const linkedinCommentService = {
    getPostComments,
    createComment,
};