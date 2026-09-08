import express from 'express';
import cors from 'cors';
import { createGroupRoutes } from './routes/groupRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { createAuthRoutes } from './routes/authRoutes.js';
import { createRequireAuth } from './middlewares/requireAuth.js';

export function createApp(repo) {
  const app = express();

  // JWT Secret
  const jwtSecret = process.env.JWT_SECRET || "my-secret-key";

  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Authentication Routes
  app.use('/api/auth', createAuthRoutes(repo, jwtSecret));

  // Protected Routes
app.use('/api', createGroupRoutes(repo));

  // Error Handler
  app.use(errorHandler);

  return app;
}