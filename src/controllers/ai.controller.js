import axios from 'axios';

// Base URL from environment variables
const AI_BASE_URL = process.env.AI_BACKEND_URL || process.env.PYTHON_API_BASE_URL || 'http://127.0.0.1:8000';

// 1. Generate Auto Reply
export const generateAutoReply = async (req, res) => {
  try {
    const { platform, comment, context } = req.body;

    const response = await axios.post(`${AI_BASE_URL}/api/ai/reply/`, {
      platform,
      comment,
      context: context || "Social media post"
    });

    return res.status(200).json({
      success: true,
      data: response.data
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
    const { video_transcript, platform } = req.body;

    const response = await axios.post(`${AI_BASE_URL}/api/ai/metadata/`, {
      video_transcript,
      platform: platform || "YouTube"
    });

    return res.status(200).json({
      success: true,
      data: response.data
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
    const { topic, platform, tone } = req.body;

    const response = await axios.post(`${AI_BASE_URL}/api/ai/post/`, {
      topic,
      platform,
      tone: tone || "Professional"
    });

    return res.status(200).json({
      success: true,
      data: response.data
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
    // Railway API expects: { video_title, views, avg_watch_time_percentage, click_through_rate, likes, comments }
    const response = await axios.post(`${AI_BASE_URL}/api/ai/improve/`, req.body);

    return res.status(200).json({
      success: true,
      data: response.data
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
  console.log("Video Gen", AI_BASE_URL)
  try {
    const response = await axios.post(`${AI_BASE_URL}/api/ai/video/`, req.body, {
      timeout: 120000 // 2 minutes timeout
    });

    return res.status(200).json({
      success: true,
      data: response.data
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

    const response = await axios.get(`${AI_BASE_URL}/api/ai/video/status/${job_id}`);

    return res.status(200).json({
      success: true,
      data: response.data
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
    const response = await axios.post(`${AI_BASE_URL}/api/ai/thumbnail/`, req.body, {
      timeout: 120000
    });

    return res.status(200).json({
      success: true,
      data: response.data
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

    const response = await axios.get(`${AI_BASE_URL}/api/ai/thumbnail/status/${job_id}`);

    return res.status(200).json({
      success: true,
      data: response.data
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
    const response = await axios.post(`${AI_BASE_URL}/api/ai/translate/`, req.body, {
      timeout: 120000
    });

    return res.status(200).json({
      success: true,
      data: response.data
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

    const response = await axios.get(`${AI_BASE_URL}/api/ai/translate/status/${job_id}`);

    return res.status(200).json({
      success: true,
      data: response.data
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
    const response = await axios.get(`${AI_BASE_URL}/api/ai/context/questions`);

    return res.status(200).json({
      success: true,
      data: response.data
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
    const response = await axios.get(`${AI_BASE_URL}/api/ai/context/`);

    return res.status(200).json({
      success: true,
      data: response.data
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
    const response = await axios.post(`${AI_BASE_URL}/api/ai/context/`, req.body);

    return res.status(200).json({
      success: true,
      data: response.data
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