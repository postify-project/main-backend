import express from 'express';
import {
  generateAutoReply,
  generateMetadata,
  generatePost,
  generateImprovements,
  startVideoGeneration,
  getVideoStatus,
  startThumbnailGeneration,
  getThumbnailStatus,
  startVideoTranslation,
  getTranslationStatus,
  getContextQuestions,
  getUserContext,
  updateUserContext
} from '../controllers/ai.controller.js';
import { protectRoute } from '../middlewares/auth.middleware.js';

const router = express.Router();

// 1. AI Content Generation
router.post('/reply', protectRoute, generateAutoReply);
router.post('/metadata', protectRoute, generateMetadata);
router.post('/post', protectRoute, generatePost);
router.post('/improve', protectRoute, generateImprovements);

// 2. AI Video Generator
router.post('/video', protectRoute, startVideoGeneration);
router.get('/video/status/:job_id', protectRoute, getVideoStatus);

// 3. AI Thumbnail Generator
router.post('/thumbnail', protectRoute, startThumbnailGeneration);
router.get('/thumbnail/status/:job_id', protectRoute, getThumbnailStatus);

// 4. AI Video Translator
router.post('/translate', protectRoute, startVideoTranslation);
router.get('/translate/status/:job_id', protectRoute, getTranslationStatus);

// 5. User & Brand Context
router.get('/context/questions', protectRoute, getContextQuestions);
router.get('/context', protectRoute, getUserContext);
router.post('/context', protectRoute, updateUserContext);

export default router;