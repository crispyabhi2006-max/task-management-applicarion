import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.ts';
import taskRoutes from './routes/taskRoutes.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { getPool, initDatabase } from './config/db.ts';

dotenv.config();

export function createExpressApp(): Express {
  const app = express();

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Health Check
  app.get('/api/health', async (req, res) => {
    try {
      const pool = getPool();

      const [rows] = await pool.query<any[]>(
        'SELECT 1 + 1 AS health_check, VERSION() AS db_version'
      );

      res.status(200).json({
        success: true,
        message: 'API is running',
        database: {
          status: 'connected',
          engine: 'MySQL',
          version: rows[0]?.db_version || '10.11.x',
          database: process.env.DB_NAME || 'task_management',
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: 'API is running but MySQL database connection failed',
        error: err.message,
      });
    }
  });

  // Mount API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/tasks', taskRoutes);

  // Centralized error handling
  app.use(errorHandler);

  return app;
}

export { initDatabase };