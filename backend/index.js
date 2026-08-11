import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db.js';

// Import all route files
import authRoutes      from './routes/authRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import feedbackRoutes  from './routes/feedbackRoutes.js';
import transcriptRoutes from './routes/transcriptRoutes.js';
import generateRoutes  from './routes/generateRoutes.js';

// Create the Express app
const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────
// Build allowed origins list from environment & defaults
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
].filter(Boolean).map(url => url.trim().replace(/\/$/, ''));

// Allow requests from the frontend (with cookies & cross-origin credentials)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like curl, mobile apps, server-to-server)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/$/, '');
    
    // Check if origin is explicitly allowed or matches Vercel deployments
    if (
      allowedOrigins.includes(cleanOrigin) ||
      !process.env.FRONTEND_URL ||
      cleanOrigin.endsWith('.vercel.app')
    ) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback: allow origin dynamically for CORS preflights
    }
  },
  credentials: true,
}));

// Parse incoming cookies (used for session authentication)
app.use(cookieParser());

// Parse incoming JSON request bodies
app.use(express.json());

// ─── Routes ────────────────────────────────────────────────────────
// Root welcome route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'VoxTutor Backend API is running successfully!',
    health: '/api/health',
  });
});

app.use('/api/auth',          authRoutes);
app.use('/api/interviews',    interviewRoutes);
app.use('/api/feedback',      feedbackRoutes);
app.use('/api/transcript',    transcriptRoutes);
app.use('/api/vapi/generate', generateRoutes);

// A simple health-check route to confirm the server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Start server ──────────────────────────────────────────────────
// First connect to MongoDB, then start listening for requests
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ VoxTutor backend running on http://localhost:${PORT}`);
  });
});
