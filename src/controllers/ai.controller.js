import axios from 'axios';
import { uploadBufferToCloudinary } from "../config/cloudinary.js";

// Base URL env se lene ke liye
const AI_BASE_URL = process.env.PYTHON_AI_BASE_URL || 'http://192.168.83.146:8000';

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
    const { 
      video_title, 
      views, 
      avg_watch_time_percentage, 
      click_through_rate, 
      likes, 
      comments 
    } = req.body;

    const response = await axios.post(`${AI_BASE_URL}/api/ai/improve/`, {
      video_title,
      views,
      avg_watch_time_percentage,
      click_through_rate,
      likes,
      comments
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

    console.log("response", response.body)

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


// Thumbnail And Caption Generator 
export const generateThumbnailAndCaption = async (req, res) => {
  try {
    let videoUrl = req.body?.video_url;

    // File handling: Agar user local file upload kare toh Cloudinary par upload karo
    if (req.file) {
      const cloudinaryRes = await uploadBufferToCloudinary(
        req.file.buffer,
        req.file.mimetype
      );
      videoUrl = cloudinaryRes.secure_url;
    }

    // Validation check
    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        message: "Please provide a video_url in body or upload a video file.",
      });
    }

    // 🎯 FastAPI python server par request hit karein
    const response = await axios.post(`${AI_BASE_URL}/api/ai/thumbnail/`, {
      video_url: videoUrl
    });

    // Response returns job_id and status (e.g. queued)
    return res.status(200).json({
      success: true,
      message: "Thumbnail generation job started successfully!",
      data: response.data
    });

  } catch (error) {
    console.error("AI Thumbnail Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to start thumbnail generation job",
      error: error.response?.data || error.message,
    });
  }
};

// 2. Status Polling Controller
export const getThumbnailStatus = async (req, res) => {
  try {
    let { job_id } = req.params;

    // Safety check for accidental 'job_' prefix
    const cleanJobId = job_id.replace(/^job_/, '');

    const response = await axios.get(`${AI_BASE_URL}/api/ai/thumbnail/status/${cleanJobId}`);

    return res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error("Thumbnail Status Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to fetch thumbnail job status",
      error: error.response?.data || error.message,
    });
  }
};