import express from "express";
import fs from "fs";
import { protectRoute } from "../middlewares/auth.middleware.js"; // Existing common auth middleware
// Aapka multer configuration middleware
import { upload } from "../middlewares/multerMiddleware.js";
import { getProfileData, profileUpdate, uploadProfileImage } from "../controllers/profile.controller.js"; // Profile controller
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