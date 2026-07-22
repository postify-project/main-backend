import express from "express";
import passport from "passport";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multerMiddleware.js";
import {
    youtubeCallbackController,
    metaCallbackController,
    handlePublishPost,
    getConnectedAccounts,
} from "../controllers/socialMedia.controller.js";

export const socialMediaRoute = express.Router();

/* =========================================================
   1. OAUTH CONNECTION ENDPOINTS
========================================================= */
const extractTokenFromQuery = (req, res, next) => {
    if (!req.headers.authorization && req.query.token) {
        req.headers.authorization = `Bearer ${req.query.token}`;
    }
    next();
};


socialMediaRoute.use(extractTokenFromQuery)

// YouTube Connect (Passes req.user._id into state)
socialMediaRoute.get("/connect/youtube", protectRoute, (req, res, next) => {
    passport.authenticate("youtube-connect", {
        scope: [
            "profile",
            "email",
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube.readonly",
        ],
        accessType: "offline",
        prompt: "consent",
        state: req.user._id.toString(),
        session: false,
    })(req, res, next);
});

// YouTube OAuth Callback
socialMediaRoute.get(
    "/callback/youtube",
    passport.authenticate("youtube-connect", { session: false, failureRedirect: "/login" }),
    youtubeCallbackController
);

// Meta Connect (Facebook & Instagram)
socialMediaRoute.get("/connect/meta", protectRoute, (req, res, next) => {
    passport.authenticate("meta-connect", {
        scope: [
            "email",
            "public_profile",
            "pages_show_list",
            "pages_read_engagement",
            "pages_manage_posts",
            "instagram_basic",
            "instagram_content_publish",
        ],
        session: false,
        state: req.user._id.toString(),
    })(req, res, next);
});

// Meta OAuth Callback
socialMediaRoute.get(
    "/callback/meta",
    passport.authenticate("meta-connect", { session: false, failureRedirect: "/login" }),
    metaCallbackController
);

/* =========================================================
   2. MANAGEMENT & PUBLISHING ENDPOINTS
========================================================= */

// Get connected social accounts list
socialMediaRoute.get("/accounts", protectRoute, getConnectedAccounts);

// Publish post (Media memory buffer upload)
socialMediaRoute.post("/publish", protectRoute, upload.fields([
    { name: "media", maxCount: 1 },    
    { name: "thumbnail", maxCount: 1 },
]),  handlePublishPost);