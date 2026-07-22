import axios from "axios";
import FormData from "form-data";

// 1. Exchange short-lived token for long-lived user token (~60 days)
export const getLongLivedMetaToken = async (shortLivedToken) => {
    const url = `https://graph.facebook.com/v20.0/oauth/access_token`;
    const response = await axios.get(url, {
        params: {
            grant_type: "fb_exchange_token",
            client_id: process.env.FACEBOOK_APP_ID,
            client_secret: process.env.FACEBOOK_APP_SECRET,
            fb_exchange_token: shortLivedToken,
        },
    });
    return response.data.access_token;
};

// 2. Fetch Facebook Pages & Linked Instagram Accounts
export const getMetaAccounts = async (longLivedToken) => {
    const url = `https://graph.facebook.com/v20.0/me/accounts`;
    const response = await axios.get(url, {
        params: {
            fields: "id,name,picture,access_token,instagram_business_account{id,username,profile_picture_url}",
            access_token: longLivedToken,
        },
    });
    return response.data.data;
};

// 3. Post to Facebook Page
export const postToFacebookPage = async ({ pageId, pageAccessToken, message, fileBuffer, mimeType }) => {
    const isVideo = mimeType.startsWith("video");
    const url = `https://graph.facebook.com/v20.0/${pageId}/${isVideo ? "videos" : "photos"}`;

    const formData = new FormData();
    formData.append(isVideo ? "description" : "caption", message);
    formData.append("access_token", pageAccessToken);
    formData.append("source", fileBuffer, { filename: `media.${mimeType.split("/")[1]}` });

    const response = await axios.post(url, formData, {
        headers: formData.getHeaders(),
    });

    return response.data;
};

// 4. Post to Instagram (Container Flow via Public Cloudinary/Media URL)
export const postToInstagram = async ({ instagramAccountId, accessToken, caption, mediaUrl, mimeType }) => {
    const baseUrl = `https://graph.facebook.com/v20.0/${instagramAccountId}`;
    const isVideo = mimeType.startsWith("video");

    // Step A: Create Media Container
    const containerParams = {
        caption,
        access_token: accessToken,
    };

    if (isVideo) {
        containerParams.media_type = "REELS";
        containerParams.video_url = mediaUrl;
    } else {
        containerParams.image_url = mediaUrl;
    }

    const containerRes = await axios.post(`${baseUrl}/media`, null, { params: containerParams });
    const creationId = containerRes.data.id;

    // Step B: Brief wait for Meta processing
    if (isVideo) await new Promise((res) => setTimeout(res, 5000));

    // Step C: Publish Container
    const publishRes = await axios.post(`${baseUrl}/media_publish`, null, {
        params: { creation_id: creationId, access_token: accessToken },
    });

    return publishRes.data;
};