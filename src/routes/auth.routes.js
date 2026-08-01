import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";

import {
  loginController,
  signupController,
  otpController,
  resetOtpController,
  forgetPassController,
  changePassController,
  logoutController,
  logoutAllDevicesController
} from "../controllers/auth.controller.js";

import { protectRoute } from "../middlewares/auth.middleware.js";
import { SessionModel } from "../models/session.model.js";
import "../config/passport.js"; // Ensures all strategies initialize on startup

export const authRoute = express.Router();

// Standard Auth Endpoints
authRoute.post("/signup", signupController);
authRoute.post("/otp-verify", otpController);
authRoute.post("/reset-otp", resetOtpController);
authRoute.post("/login", loginController);
authRoute.post("/forget-password", forgetPassController);
authRoute.post("/change-password", changePassController);
authRoute.post("/logout", protectRoute, logoutController);
authRoute.post("/logout-all", protectRoute, logoutAllDevicesController);

/* =========================================================
   GOOGLE AUTH ROUTES (LOGIN / SIGNUP)
========================================================= */

// 1. Redirect user to Google Login Page
authRoute.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    prompt: "select_account"
  })
);

// 2. Google OAuth Callback
authRoute.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  async (req, res) => {
    try {
      const user = req.user;

      // Generate JWT Token
      const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: "24h" });

      // Save active session
      await SessionModel.create({
        userId: user._id,
        token: token,
        deviceInfo: req.headers["user-agent"] || "Google Login Device",
      });

      // Redirect to frontend with token
      const FRONTEND_URL = process.env.FRONTEND_URL || process.env.REACT_URL || "http://localhost:3000";
      return res.redirect(`${FRONTEND_URL}/dashboard?token=${token}`);

    } catch (error) {
      console.error("Google Auth Callback Error:", error.message, error);
      return res.status(500).json({ message: "Google Authentication Failed", status: false });
    }
  }
);

/* =========================================================
   FACEBOOK AUTH ROUTES (LOGIN / SIGNUP)
========================================================= */

// 1. Redirect user to Facebook Login Page
authRoute.get(
  "/facebook",
  passport.authenticate("facebook", {
    scope: ["email", "public_profile"],
    session: false
  })
);

// 2. Facebook OAuth Callback
authRoute.get(
  "/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login", session: false }),
  async (req, res) => {
    try {
      const user = req.user;

      // Generate JWT Token
      const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: "24h" });

      // Save active session
      await SessionModel.create({
        userId: user._id,
        token: token,
        deviceInfo: req.headers["user-agent"] || "Facebook Login Device",
      });

      // Redirect to frontend with token
      const FRONTEND_URL = process.env.FRONTEND_URL || process.env.REACT_URL || "http://localhost:3000";
      return res.redirect(`${FRONTEND_URL}/dashboard?token=${token}`);

    } catch (error) {
      console.error("Facebook Auth Callback Error:", error.message, error);
      return res.status(500).json({ message: "Facebook Authentication Failed", status: false });
    }
  }
);