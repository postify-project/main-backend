import axios from 'axios';

// Get AI Base URL dynamically from environment variables
const getAiBaseUrl = () => {
  const envUrl = process.env.AI_BACKEND_URL || process.env.PYTHON_API_BASE_URL;
  return (envUrl && envUrl.trim()) ? envUrl.trim() : 'http://127.0.0.1:8000';
};

// Helper for POST requests with route fallbacks
async function postToAiService(endpoints, payload, config = {}) {
  const baseUrl = getAiBaseUrl();
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const url = `${baseUrl}${endpoint}`;
      const response = await axios.post(url, payload, config);
      return response.data;
    } catch (err) {
      lastError = err;
      if (err.response && err.response.status === 404) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// Helper for GET requests with route fallbacks
async function getFromAiService(endpoints, config = {}) {
  const baseUrl = getAiBaseUrl();
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const url = `${baseUrl}${endpoint}`;
      const response = await axios.get(url, config);
      return response.data;
    } catch (err) {
      lastError = err;
      if (err.response && err.response.status === 404) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// 1. Generate Auto Reply
export const generateAutoReply = async (req, res) => {
  try {
    const { platform, comment, context } = req.body;

    const data = await postToAiService(
      ['/api/ai/reply/', '/api/ai/generate-post'],
      {
        platform,
        comment,
        context: context || `Comment on ${platform || 'social media'}: "${comment}"`
      }
    );

    return res.status(200).json({
      success: true,
      data: data.data || data
    });
  } catch (error) {
    console.error("Auto-Reply Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to generate AI auto-reply",
      error: error.response?.data || error.message
    });
  }
};

// 2. Generate Metadata (Title, Description, Tags)
export const generateMetadata = async (req, res) => {
  try {
    const { video_transcript, platform, video_meta, platforms } = req.body;

    const payload = video_meta ? req.body : {
      video_meta: { transcript: video_transcript || "Video content" },
      platforms: platforms || [platform || "YouTube"]
    };

    const data = await postToAiService(
      ['/api/ai/generate-metadata', '/api/ai/metadata/'],
      payload
    );

    return res.status(200).json({
      success: true,
      data: data.data || data
    });
  } catch (error) {
    console.error("Metadata Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to generate metadata",
      error: error.response?.data || error.message
    });
  }
};

// 3. Generate Social Media Post (Caption, Hashtags, CTA, Image Prompt, Image URL)
export const generatePost = async (req, res) => {
  try {
    const { topic, platform, tone, context } = req.body;

    const payload = context ? req.body : {
      context: `Topic: ${topic}. Platform: ${platform || 'General'}. Tone: ${tone || 'Professional'}`,
      topic,
      platform,
      tone: tone || "Professional"
    };

    const data = await postToAiService(
      ['/api/ai/generate-post', '/api/ai/post/'],
      payload
    );

    return res.status(200).json({
      success: true,
      data: data.data || data
    });
  } catch (error) {
    console.error("Post Gen Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to generate post",
      error: error.response?.data || error.message
    });
  }
};

// 4. Generate Improvements / Stats Analysis
export const generateImprovements = async (req, res) => {
  try {
    const data = await postToAiService(
      ['/api/ai/improve/', '/api/ai/generate-post'],
      req.body
    );

    return res.status(200).json({
      success: true,
      data: data.data || data
    });
  } catch (error) {
    console.error("Improvement Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to generate improvements",
      error: error.response?.data || error.message
    });
  }
};

// 5. Video Generation (Start Job)
export const startVideoGeneration = async (req, res) => {
  try {
    const payload = {
      topic: req.body.topic || req.body.prompt || "Social Media Video",
      language: req.body.language || "English",
      ...req.body
    };

    const data = await postToAiService(
      ['/api/ai/generate-video', '/api/ai/video/'],
      payload,
      { timeout: 120000 }
    );

    return res.status(200).json({
      success: true,
      data: data.data || data
    });
  } catch (error) {
    console.error("Video Gen Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to start video generation",
      error: error.response?.data || error.message
    });
  }
};

// 6. Get Video Generation Status (Job Polling)
export const getVideoStatus = async (req, res) => {
  try {
    const { job_id } = req.params;

    const data = await getFromAiService([
      `/api/ai/tasks/${job_id}`,
      `/api/ai/video/status/${job_id}`
    ]);

    return res.status(200).json({
      success: true,
      data: data.data || data
    });
  } catch (error) {
    console.error("Video Status Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to fetch video status",
      error: error.response?.data || error.message
    });
  }
};

// 7. Thumbnail Generation (Start Job)
export const startThumbnailGeneration = async (req, res) => {
  try {
    const data = await postToAiService(
      ['/api/ai/extract-thumbnail', '/api/ai/thumbnail/'],
      req.body,
      { timeout: 120000 }
    );

    return res.status(200).json({
      success: true,
      data: data.data || data
    });
  } catch (error) {
    console.error("Thumbnail Gen Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to start thumbnail generation",
      error: error.response?.data || error.message
    });
  }
};

// 8. Get Thumbnail Generation Status
export const getThumbnailStatus = async (req, res) => {
  try {
    const { job_id } = req.params;

    const data = await getFromAiService([
      `/api/ai/tasks/${job_id}`,
      `/api/ai/thumbnail/status/${job_id}`
    ]);

    return res.status(200).json({
      success: true,
      data: data.data || data
    });
  } catch (error) {
    console.error("Thumbnail Status Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to fetch thumbnail status",
      error: error.response?.data || error.message
    });
  }
};

// 9. Video Translation (Start Job)
export const startVideoTranslation = async (req, res) => {
  try {
    const data = await postToAiService(
      ['/api/ai/translate-video', '/api/ai/translate/'],
      req.body,
      { timeout: 120000 }
    );

    return res.status(200).json({
      success: true,
      data: data.data || data
    });
  } catch (error) {
    console.error("Translation Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to start video translation",
      error: error.response?.data || error.message
    });
  }
};

// 10. Get Translation Status
export const getTranslationStatus = async (req, res) => {
  try {
    const { job_id } = req.params;

    const data = await getFromAiService([
      `/api/ai/tasks/${job_id}`,
      `/api/ai/translate/status/${job_id}`
    ]);

    return res.status(200).json({
      success: true,
      data: data.data || data
    });
  } catch (error) {
    console.error("Translation Status Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to fetch translation status",
      error: error.response?.data || error.message
    });
  }
};

// 11. Get Context Onboarding Questions
export const getContextQuestions = async (req, res) => {
  try {
    const data = await getFromAiService([
      '/api/ai/context/questions',
      '/api/ai/questions'
    ]);

    return res.status(200).json({
      success: true,
      data: data.data || data
    });
  } catch (error) {
    console.error("Context Questions Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to fetch context questions",
      error: error.response?.data || error.message
    });
  }
};

// 12. Get User Brand Context
export const getUserContext = async (req, res) => {
  try {
    const data = await getFromAiService([
      '/api/ai/context/',
      '/api/ai/context'
    ]);

    return res.status(200).json({
      success: true,
      data: data.data || data
    });
  } catch (error) {
    console.error("Get Context Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to fetch user context",
      error: error.response?.data || error.message
    });
  }
};

// 13. Update User Brand Context
export const updateUserContext = async (req, res) => {
  try {
    const data = await postToAiService(
      ['/api/ai/context/', '/api/ai/context'],
      req.body
    );

    return res.status(200).json({
      success: true,
      data: data.data || data
    });
  } catch (error) {
    console.error("Update Context Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to update user context",
      error: error.response?.data || error.message
    });
  }
};