import axios from "axios";
import FormData from "form-data";

const GRAPH_API_VERSION = "v20.0";
const BASE_GRAPH_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * 1. Exchange short-lived User Access Token for a Long-Lived User Access Token (~60 days)
 */
export const getLongLivedMetaToken = async (shortLivedToken) => {
    try {
        const url = `${BASE_GRAPH_URL}/oauth/access_token`;
        const response = await axios.get(url, {
            params: {
                grant_type: "fb_exchange_token",
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                fb_exchange_token: shortLivedToken,
            },
        });
        return response.data.access_token;
    } catch (error) {
        console.error("Meta Token Exchange Error:", error.response?.data || error.message);
        throw new Error(
            error.response?.data?.error?.message || "Failed to exchange short-lived Meta token."
        );
    }
};

/**
 * 2. Fetch Facebook Pages & Linked Instagram Accounts for the user
 */
export const getMetaAccounts = async (longLivedToken) => {
    try {
        const url = `${BASE_GRAPH_URL}/me/accounts`;
        const response = await axios.get(url, {
            params: {
                fields: "id,name,picture,access_token,instagram_business_account{id,username,profile_picture_url}",
                access_token: longLivedToken,
            },
        });
        return response.data.data;
    } catch (error) {
        console.error("Fetch Meta Accounts Error:", error.response?.data || error.message);
        throw new Error(
            error.response?.data?.error?.message || "Failed to fetch connected Meta accounts."
        );
    }
};

/**
 * 3. Post to Facebook Page (Handles both Images and Videos via multipart/form-data)
 */
export const postToFacebookPage = async ({ pageId, pageAccessToken, message, fileBuffer, mimeType }) => {
    try {
        if (!fileBuffer) {
            const url = `${BASE_GRAPH_URL}/${pageId}/feed`;
            const response = await axios.post(url, {
                message: message || "",
                access_token: pageAccessToken,
            });
            return response.data;
        }

        const isVideo = mimeType.startsWith("video");
        const url = `${BASE_GRAPH_URL}/${pageId}/${isVideo ? "videos" : "photos"}`;

        const formData = new FormData();
        formData.append(isVideo ? "description" : "caption", message || "");
        formData.append("access_token", pageAccessToken);

        const fileExtension = mimeType.split("/")[1] || (isVideo ? "mp4" : "jpeg");
        formData.append("source", fileBuffer, { filename: `media.${fileExtension}` });

        const response = await axios.post(url, formData, {
            headers: formData.getHeaders(),
        });

        return response.data;
    } catch (error) {
        console.error("Facebook Publishing Error:", error.response?.data || error.message);
        throw new Error(
            error.response?.data?.error?.message || "Failed to publish post to Facebook Page."
        );
    }
};

/**
 * 4. Post to Instagram Professional Account (Container Flow via Public Media URL with status polling)
 */
export const postToInstagram = async ({ instagramAccountId, accessToken, caption, mediaUrl, mimeType, isVideo }) => {
    try {
        const baseUrl = `${BASE_GRAPH_URL}/${instagramAccountId}`;
        const checkIsVideo = isVideo ?? (mimeType && mimeType.startsWith("video"));

        const containerParams = {
            caption: caption || "",
            access_token: accessToken,
        };

        if (checkIsVideo) {
            containerParams.media_type = "REELS";
            containerParams.video_url = mediaUrl;
        } else {
            containerParams.image_url = mediaUrl;
        }

        const containerRes = await axios.post(`${baseUrl}/media`, null, { params: containerParams });
        const creationId = containerRes.data.id;

        if (checkIsVideo) {
            let isReady = false;
            let attempts = 0;
            const maxAttempts = 12;

            while (!isReady && attempts < maxAttempts) {
                await new Promise((res) => setTimeout(res, 3000));

                const statusRes = await axios.get(`${BASE_GRAPH_URL}/${creationId}`, {
                    params: { fields: "status_code,status", access_token: accessToken },
                });

                const statusCode = statusRes.data.status_code;

                if (statusCode === "FINISHED") {
                    isReady = true;
                } else if (statusCode === "ERROR") {
                    throw new Error("Meta processing failed for this video container.");
                } else if (statusCode === "EXPIRED") {
                    throw new Error("Meta video container expired before publishing.");
                }

                attempts++;
            }

            if (!isReady) {
                throw new Error("Video processing timed out on Meta servers. Please try again.");
            }
        }

        const publishRes = await axios.post(`${baseUrl}/media_publish`, null, {
            params: {
                creation_id: creationId,
                access_token: accessToken
            },
        });

        return publishRes.data;
    } catch (error) {
        console.error("Instagram Publishing Error:", error.response?.data || error.message);
        throw new Error(
            error.response?.data?.error?.message || "Failed to publish post to Instagram."
        );
    }
};

export const metaService = {
    getLongLivedMetaToken,
    getMetaAccounts,
    postToFacebookPage,
    postToInstagram,
};