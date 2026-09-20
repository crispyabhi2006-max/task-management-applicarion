import http from 'http';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createExpressApp, initDatabase } from './server/server.ts';
import { initSocketIO } from './server/socket/index.ts';
import { seedDemoData } from './server/config/seed.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  // 1. Initialize MySQL database & tables
  console.log('[BOOT] Initializing MySQL database connection...');
  await initDatabase();
  await seedDemoData();

  // 2. Create Express app with all API routes
  const app = createExpressApp();

  // 3. Create HTTP server for Express and Socket.IO
  const httpServer = http.createServer(app);

  // 4. Attach Socket.IO for real-time synchronization
  initSocketIO(httpServer);
  console.log('[BOOT] Socket.IO attached successfully.');

  // 5. Mount Vite middleware for development
  //    or serve static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    console.log('[BOOT] Vite dev middleware mounted.');
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');

    console.log('[BOOT] Production dist path:', distPath);

    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    console.log('[BOOT] Serving static production files from dist.');
  }

  // 6. Listen on Render/local port
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[BOOT] Server running on http://0.0.0.0:${PORT}`
    );
  });
}

startServer().catch((err) => {
  console.error('[FATAL] Failed to start server:', err);
  process.exit(1);
});