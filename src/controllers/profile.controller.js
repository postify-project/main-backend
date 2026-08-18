import { cloudinaryUploader } from "../config/cloudinary.js"; // Cloudinary config uploader
import { UserModel } from "../models/user.model.js";

export const getProfileData = async (req, res) => {
    try {
        // protectRoute aapko user ki id 'req.user.id' ya 'req.userId' mein deta hai (apne middleware ke hisab se use karein)
        const userId = req.userId || req.user?.id;

        const user = await UserModel.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error("Error fetching profile:", error.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}


export const profileUpdate = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { name, phoneNumber, bio } = req.body;

    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (phoneNumber) fieldsToUpdate.phoneNumber = phoneNumber;
    if (bio !== undefined) fieldsToUpdate.bio = bio;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: fieldsToUpdate },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error.message);
    res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
}


export const uploadProfileImage = async (req, res) => {
    const userId = req.userId || req.user?.id;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select an image to upload."
            });
        }

        // 1. Helper function to upload RAM Buffer using your existing `cloudinaryUploader`
        const uploadFromBuffer = (buffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinaryUploader.upload_stream(
                    { folder: "social_media_profiles" },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                stream.end(buffer); // Pushes the buffer from memory to Cloudinary
            });
        };

        // 2. Upload directly from req.file.buffer
        const imageRes = await uploadFromBuffer(req.file.buffer);

        console.log("Cloudinary URL generated:", imageRes.secure_url);

        // 3. Save secure_url to user's database document
        const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            { imageUrl: imageRes.secure_url },
            { new: true }
        ).select("-password");

        return res.status(200).json({
            success: true,
            message: "Image uploaded and database updated!",
            url: imageRes.secure_url,
            data: updatedUser
        });

    } catch (error) {
        console.error("Error uploading image:", error.message);
        return res.status(500).json({
            success: false,
            message: "Image upload failed. Server Error."
        });
    }
    // Note: No finally block needed! RAM automatically clears after the request cycle.
};


// ==========================================
// 4. UPDATE Auto-Reply Settings 🤖
// ==========================================
export const updateAutoReplySettings = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { enabled, platforms } = req.body;

    const validPlatforms = ["linkedin", "facebook", "instagram", "youtube"];

    // Validate platforms array
    if (platforms && !Array.isArray(platforms)) {
      return res.status(400).json({
        success: false,
        message: "Platforms must be an array",
      });
    }

    if (platforms) {
      const invalidPlatforms = platforms.filter((p) => !validPlatforms.includes(p));
      if (invalidPlatforms.length) {
        return res.status(400).json({
          success: false,
          message: `Invalid platforms: ${invalidPlatforms.join(", ")}`,
        });
      }
    }

    const updateFields = {};
    if (typeof enabled === "boolean") updateFields["autoReply.enabled"] = enabled;
    if (platforms) updateFields["autoReply.platforms"] = platforms;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("autoReply");

    return res.status(200).json({
      success: true,
      message: "Auto-reply settings updated",
      data: updatedUser.autoReply,
    });
  } catch (error) {
    console.error("Auto-Reply Settings Error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update auto-reply settings",
    });
  }
};


// ==========================================
// 5. GET BRAND CONTEXT 🎯
// ==========================================
export const getBrandContext = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;

    const user = await UserModel.findById(userId).select("brandContext");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Brand context fetched successfully",
      data: user.brandContext || {},
    });
  } catch (error) {
    console.error("Error fetching brand context:", error.message);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

// ==========================================
// 6. SAVE / UPDATE BRAND CONTEXT 💾
// ==========================================
export const saveBrandContext = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const contextData = req.body;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { brandContext: contextData } },
      { new: true, runValidators: true }
    ).select("brandContext");

    // Also sync context with Railway AI Backend (if accessible)
    try {
      const AI_BASE_URL = process.env.AI_BACKEND_URL || process.env.PYTHON_API_BASE_URL || 'http://127.0.0.1:8000';
      const axios = (await import('axios')).default;
      await axios.post(`${AI_BASE_URL}/api/ai/context/`, contextData);
      console.log("🎯 Brand Context synced with AI Backend successfully.");
    } catch (aiErr) {
      console.warn("AI Backend sync warning (non-critical):", aiErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Brand context saved & updated successfully!",
      data: updatedUser.brandContext,
    });
  } catch (error) {
    console.error("Error saving brand context:", error.message);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

// ==========================================
// 7. DELETE / RESET BRAND CONTEXT 🗑️
// ==========================================
export const deleteBrandContext = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;

    const defaultContext = {
      accountType: "Business / Company",
      brandName: "",
      brandTagline: "",
      brandDescription: "",
      industry: "B2B SaaS & Tech",
      creatorNiche: "Software Development & AI",
      website: "",
      primaryColor: "#ec4899",
      secondaryColor: "#1e293b",
      logoUrl: "",
      tone: "Professional & Corporate",
      creatorPersona: "The Educational Mentor (Informative & Clear)",
      imageryStyle: "Minimalist & Light Mode",
      contentFormat: "Short-form Reels & Shorts",
      emojiRule: "Moderate (Bullet points & key accents)",
      primaryCTA: "Link in bio for more details",
      keywords: "",
      hashtags: "",
    };

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { brandContext: defaultContext } },
      { new: true }
    ).select("brandContext");

    return res.status(200).json({
      success: true,
      message: "Brand context deleted & reset to defaults successfully!",
      data: updatedUser.brandContext,
    });
  } catch (error) {
    console.error("Error deleting brand context:", error.message);
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};