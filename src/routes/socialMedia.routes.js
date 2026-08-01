import express from "express";
import passport from "passport";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { upload, handleMulterUpload } from "../middlewares/multerMiddleware.js";
import {
    youtubeCallbackController,
    metaCallbackController,
    handlePublishPost,
    getConnectedAccounts,
    linkedinCallbackController,
    getLinkedInComments,
    postLinkedInComment,
    disconnectAccount,
    getScheduledPosts,
    deleteScheduledPost,
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
socialMediaRoute.get(["/connect/youtube", "/youtube/connect"], protectRoute, (req, res, next) => {
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
socialMediaRoute.get(["/connect/meta", "/meta/connect", "/facebook/connect"], protectRoute, (req, res, next) => {
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

// LinkedIn Connect (Passes req.user._id into state)
socialMediaRoute.get(["/connect/linkedin", "/linkedin/connect"], protectRoute, (req, res, next) => {
    passport.authenticate("linkedin-connect", {
        scope: ["openid", "profile", "email", "w_member_social"],
        state: req.user._id.toString(),
        session: false,
    })(req, res, next);
});

// LinkedIn OAuth Callback
socialMediaRoute.get(
    "/callback/linkedin",
    passport.authenticate("linkedin-connect", {
        session: false,
        failureRedirect: "/login",
    }),
    linkedinCallbackController
);

// Fetch comments for a post
socialMediaRoute.get(
    "/linkedin/comments/:postUrn",
    protectRoute,
    getLinkedInComments
);

// Submit a new comment or reply
socialMediaRoute.post(
    "/linkedin/comments",
    protectRoute,
    postLinkedInComment
);

/* =========================================================
   2. MANAGEMENT & PUBLISHING ENDPOINTS
========================================================= */

// Get connected social accounts list
socialMediaRoute.get("/accounts", protectRoute, getConnectedAccounts);

// Disconnect / Delete a connected social account by ID or platform name
socialMediaRoute.delete("/accounts/:id", protectRoute, disconnectAccount);
socialMediaRoute.delete("/disconnect/:id", protectRoute, disconnectAccount);

// Scheduled posts management
socialMediaRoute.get("/scheduled", protectRoute, getScheduledPosts);
socialMediaRoute.delete("/scheduled/:id", protectRoute, deleteScheduledPost);

// Publish post (Media memory buffer upload)
socialMediaRoute.post("/publish", protectRoute, handleMulterUpload(upload.single("media")), handlePublishPost);