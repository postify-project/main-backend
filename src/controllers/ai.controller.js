import axios from 'axios';

// Base URL env se lene ke liye
const AI_BASE_URL = process.env.PYTHON_API_BASE_URL || 'http://127.0.0.1:8000';

// 1. Generate Auto Reply
export const generateAutoReply = async (req, res) => {
  try {
    const { platform, comment, context } = req.body;

    const response = await axios.post(`${AI_BASE_URL}/api/ai/reply/`, {
      platform,
      comment,
      context
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

// 2. Generate Metadata (Title, Hashtags, Description)
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

// 3. Generate Post
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

// 4. Generate Improvements
export const generateImprovements = async (req, res) => {
  try {
    const { content, platform } = req.body;

    const response = await axios.post(`${AI_BASE_URL}/api/ai/improve/`, {
      content,
      platform
    });

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

// 6. Get Video Status (Job Polling)
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