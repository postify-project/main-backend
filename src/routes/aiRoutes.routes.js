import express from "express";
import fs from "fs";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { generateMetadata } from "../controllers/ai.controller.js";

export const aiRoutes = express.Router();

aiRoutes.post("/generate-metadata", protectRoute, generateMetadata);