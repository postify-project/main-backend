// src/services/comments.service.js
// Unified comment fetching & replying for all 4 platforms
import axios from "axios";
import { google } from "googleapis";

const GRAPH_API_VERSION = "v20.0";
const BASE_GRAPH_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const LINKEDIN_HEADERS = (accessToken) => ({
  Authorization: `Bearer ${accessToken}`,
  "LinkedIn-Version": "202606",
  "X-Restli-Protocol-Version": "2.0.0",
  "Content-Type": "application/json",
});

// ==========================================
// LINKEDIN — Fetch & Reply
// ==========================================

export async function fetchLinkedInComments(postId, accessToken) {
  try {
    const encodedUrn = encodeURIComponent(postId);
    const url = `https://api.linkedin.com/rest/socialActions/${encodedUrn}/comments`;

    const response = await axios.get(url, {
      headers: LINKEDIN_HEADERS(accessToken),
    });

    const elements = response.data?.elements || [];

    return elements.map((c) => ({
      commentId: c["$URN"] || c.id || c.commentUrn,
      authorName: c.actor || "LinkedIn User",
      text: c.message?.text || "",
      timestamp: c.created?.time
        ? new Date(c.created.time).toISOString()
        : new Date().toISOString(),
    }));
  } catch (error) {
    console.error(
      "LinkedIn Fetch Comments Error:",
      error.response?.data || error.message
    );
    return [];
  }
}

export async function replyToLinkedInComment({
  postId,
  commentId,
  replyText,
  accessToken,
  actorUrn,
}) {
  try {
    const encodedUrn = encodeURIComponent(postId);
    const url = `https://api.linkedin.com/rest/socialActions/${encodedUrn}/comments`;

    const payload = {
      actor: actorUrn,
      message: { text: replyText },
      parentComment: commentId,
    };

    const response = await axios.post(url, payload, {
      headers: LINKEDIN_HEADERS(accessToken),
    });

    return {
      success: true,
      replyId: response.headers["x-restli-id"] || response.data?.id,
    };
  } catch (error) {
    console.error(
      "LinkedIn Reply Error:",
      error.response?.data || error.message
    );
    return { success: false, error: error.message };
  }
}

// ==========================================
// FACEBOOK — Fetch & Reply
// ==========================================

export async function fetchFacebookComments(postId, accessToken) {
  try {
    const url = `${BASE_GRAPH_URL}/${postId}/comments`;
    const response = await axios.get(url, {
      params: {
        fields: "id,from,message,created_time",
        access_token: accessToken,
        limit: 50,
      },
    });

    const comments = response.data?.data || [];

    return comments.map((c) => ({
      commentId: c.id,
      authorName: c.from?.name || "Facebook User",
      text: c.message || "",
      timestamp: c.created_time || new Date().toISOString(),
    }));
  } catch (error) {
    console.error(
      "Facebook Fetch Comments Error:",
      error.response?.data || error.message
    );
    return [];
  }
}

export async function replyToFacebookComment({
  commentId,
  replyText,
  accessToken,
}) {
  try {
    const url = `${BASE_GRAPH_URL}/${commentId}/comments`;
    const response = await axios.post(url, null, {
      params: {
        message: replyText,
        access_token: accessToken,
      },
    });

    return { success: true, replyId: response.data?.id };
  } catch (error) {
    console.error(
      "Facebook Reply Error:",
      error.response?.data || error.message
    );
    return { success: false, error: error.message };
  }
}

// ==========================================
// INSTAGRAM — Fetch & Reply
// ==========================================

export async function fetchInstagramComments(mediaId, accessToken) {
  try {
    const url = `${BASE_GRAPH_URL}/${mediaId}/comments`;
    const response = await axios.get(url, {
      params: {
        fields: "id,from,text,timestamp,username",
        access_token: accessToken,
        limit: 50,
      },
    });

    const comments = response.data?.data || [];

    return comments.map((c) => ({
      commentId: c.id,
      authorName: c.username || c.from?.username || "Instagram User",
      text: c.text || "",
      timestamp: c.timestamp || new Date().toISOString(),
    }));
  } catch (error) {
    console.error(
      "Instagram Fetch Comments Error:",
      error.response?.data || error.message
    );
    return [];
  }
}

export async function replyToInstagramComment({
  mediaId,
  commentId,
  replyText,
  accessToken,
}) {
  try {
    // Instagram replies are posted to the media, mentioning the parent comment
    const url = `${BASE_GRAPH_URL}/${mediaId}/comments`;
    const response = await axios.post(url, null, {
      params: {
        message: replyText,
        access_token: accessToken,
      },
    });

    return { success: true, replyId: response.data?.id };
  } catch (error) {
    console.error(
      "Instagram Reply Error:",
      error.response?.data || error.message
    );
    return { success: false, error: error.message };
  }
}

// ==========================================
// YOUTUBE — Fetch & Reply
// ==========================================

export async function fetchYouTubeComments(videoId, accessToken, refreshToken) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.YOUTUBE_CALLBACK_URL
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Force token refresh if needed
    try {
      const tokenInfo = await oauth2Client.getAccessToken();
      if (!tokenInfo.token) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
      }
    } catch {
      console.error("YouTube token refresh failed for comment fetch");
      return [];
    }

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const response = await youtube.commentThreads.list({
      part: ["snippet"],
      videoId: videoId,
      maxResults: 50,
      order: "time",
    });

    const threads = response.data?.items || [];

    return threads.map((t) => {
      const snippet = t.snippet?.topLevelComment?.snippet;
      return {
        commentId: t.snippet?.topLevelComment?.id || t.id,
        authorName: snippet?.authorDisplayName || "YouTube User",
        text: snippet?.textDisplay || "",
        timestamp:
          snippet?.publishedAt || new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error(
      "YouTube Fetch Comments Error:",
      error.response?.data || error.message
    );
    return [];
  }
}

export async function replyToYouTubeComment({
  commentId,
  replyText,
  accessToken,
  refreshToken,
}) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.YOUTUBE_CALLBACK_URL
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Force token refresh if needed
    try {
      const tokenInfo = await oauth2Client.getAccessToken();
      if (!tokenInfo.token) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
      }
    } catch {
      console.error("YouTube token refresh failed for comment reply");
      return { success: false, error: "Token refresh failed" };
    }

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const response = await youtube.comments.insert({
      part: ["snippet"],
      requestBody: {
        snippet: {
          parentId: commentId,
          textOriginal: replyText,
        },
      },
    });

    return { success: true, replyId: response.data?.id };
  } catch (error) {
    console.error(
      "YouTube Reply Error:",
      error.response?.data || error.message
    );
    return { success: false, error: error.message };
  }
}
