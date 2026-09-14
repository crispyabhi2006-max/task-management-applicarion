import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import http from 'http';
import authRoutes from './routes/authRoutes.ts';
import taskRoutes from './routes/taskRoutes.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { getPool, initDatabase } from './config/db.ts';
import { initSocketIO } from './socket/index.ts';

dotenv.config();

export function createExpressApp(): Express {
  const app = express();

  // Security headers with relaxed CSP for local/embedded development
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS middleware allowing requests from local React frontend (e.g. port 3000, 5173, or preview)
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
      const [rows] = await pool.query<any[]>('SELECT 1 + 1 AS health_check, VERSION() AS db_version');
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

import { fileURLToPath } from 'url';
import path from 'path';

const __currentFile = fileURLToPath(import.meta.url);

// Standalone runner for local development in VS Code (e.g., `cd server && npm run dev`)
const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__currentFile);

if (isDirectRun) {
  const PORT = Number(process.env.PORT) || 5000;
  initDatabase()
    .then(() => {
      const app = createExpressApp();
      const server = http.createServer(app);
      initSocketIO(server);
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`==================================================`);
        console.log(`[LOCAL-SERVER] Backend running at http://localhost:${PORT}`);
        console.log(
          `[LOCAL-SERVER] MySQL Target: ${process.env.DB_USER || 'root'}@${
            process.env.DB_HOST || 'localhost'
          }:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || 'task_management'}`
        );
        console.log(`[LOCAL-SERVER] Health Check: http://localhost:${PORT}/api/health`);
        console.log(`==================================================`);
      });
    })
    .catch((err) => {
      console.error('[LOCAL-SERVER] Failed to start:', err);
    });
}

export { initDatabase };
