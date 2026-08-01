import express from "express";
import fs from "fs";
import { protectRoute } from "../middlewares/auth.middleware.js"; // Existing common auth middleware
// Aapka multer configuration middleware
import { upload } from "../middlewares/multerMiddleware.js";
import {
  getProfileData,
  profileUpdate,
  uploadProfileImage,
  updateAutoReplySettings,
  getBrandContext,
  saveBrandContext,
  deleteBrandContext
} from "../controllers/profile.controller.js"; // Profile controller
export const profileRoute = express.Router();

// ==========================================
// 1. GET Current Logged-in User 👤
// ==========================================
profileRoute.get("/me", protectRoute, getProfileData );

// ==========================================
// 2. UPDATE User Name, Phone & Bio 📝
// ==========================================
profileRoute.put("/update", protectRoute, profileUpdate);

// ==========================================
// 3. UPLOAD Profile Image to Cloudinary 📸
// ==========================================
profileRoute.post(
  "/upload",
  protectRoute,
  upload.single("profileImage"),
  uploadProfileImage
);

// ==========================================
// 4. UPDATE Auto-Reply Settings 🤖
// ==========================================
profileRoute.put("/auto-reply", protectRoute, updateAutoReplySettings);

// ==========================================
// 5. BRAND CONTEXT & VOICE ENGINE ROUTES 🎯
// ==========================================
profileRoute.get("/brand-context", protectRoute, getBrandContext);
profileRoute.post("/brand-context", protectRoute, saveBrandContext);
profileRoute.delete("/brand-context", protectRoute, deleteBrandContext);