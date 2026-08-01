// src/routes/cron.routes.js
import express from "express";
import { triggerAutoReply, getAutoReplyHistory } from "../controllers/autoReply.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Cron trigger — secured with CRON_SECRET query param (no JWT needed for external cron)
router.get("/auto-reply", triggerAutoReply);

// History — needs user auth
router.get("/auto-reply/history", protectRoute, getAutoReplyHistory);

export default router;
