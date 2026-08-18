// src/app.js
import "dotenv/config";
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { mongoDB } from './config/db.js';
import { authRoute } from "./routes/auth.routes.js";
import { profileRoute } from "./routes/profile.route.js";
import { socialMediaRoute } from "./routes/socialMedia.routes.js";
import facebookRoutes from './routes/facebook.routes.js';
import aiRoutes from './routes/aiRoutes.routes.js';
import cronRoutes from './routes/cron.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    process.env.REACT_URL || 'http://localhost:5173',
  ],
  methods: ["POST", "GET", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Serverless DB Connection Middleware
app.use(async (req, res, next) => {
  try {
    await mongoDB();
    next();
  } catch (err) {
    console.error("Database connection failure on request:", err.message);
    return res.status(500).json({ message: "Database connection failed", status: false });
  }
});

// Root & Health Check Routes
app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Postify Backend is live and running smoothly!' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Auth & API Server is running smoothly!' });
});

// API Routes
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/profile", profileRoute);
app.use("/api/v1/social-media", socialMediaRoute);
app.use('/api/v1/auth', facebookRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/cron', cronRoutes);

// Global Error Handler (must be mounted after all routes)
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err.message);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

// Only listen on port when running standalone/local, not during Vercel serverless bundling
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
}

export default app;