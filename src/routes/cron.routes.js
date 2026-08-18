// src/routes/cron.routes.js
import express from "express";
import {
  triggerAutoReply,
  triggerScheduledPostsOnly,
  getAutoReplyHistory
} from "../controllers/autoReply.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Cron trigger — secured with CRON_SECRET query param, x-cron-secret, or Bearer auth
router.get("/auto-reply", triggerAutoReply);
router.get("/run", triggerAutoReply); // Convenient alias
router.get("/process-scheduled", triggerScheduledPostsOnly); // Scheduled posts only trigger

// History — needs user auth
router.get("/auto-reply/history", protectRoute, getAutoReplyHistory);

export default router;
