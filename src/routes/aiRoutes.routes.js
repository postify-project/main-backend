import express from 'express';
import {
  generateAutoReply,
  generateMetadata,
  generatePost,
  generateImprovements,
  startVideoGeneration,
  getVideoStatus
} from '../controllers/ai.controller.js';
import { protectRoute } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Sabhi AI endpoints par Authentication Guard apply kar sakte hain
router.post('/reply', protectRoute, generateAutoReply);
router.post('/metadata', protectRoute, generateMetadata);
router.post('/post', protectRoute, generatePost);
router.post('/improve', protectRoute, generateImprovements);
router.post('/video', protectRoute, startVideoGeneration);
router.get('/video/status/:job_id', protectRoute, getVideoStatus);

export default router;