import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { firmsProxyRouter } from './api/firms-proxy';
import { alsatProxyRouter } from './api/alsat-proxy';

// Load local environment variables (.env / secrets)
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health and System Diagnostics Endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'AWIS Tactical Backend & Proxy Engine',
      timestamp: new Date().toISOString()
    });
  });

  // G-03: NASA FIRMS Thermal Hotspots Secure Proxy Gateway
  app.use('/api/firms', firmsProxyRouter);

  // ASAL: Algerian Space Agency ALSAT Satellite Fleet & WMS/WMTS Gateway
  app.use('/api/alsat', alsatProxyRouter);

  // Vite middleware for development; static assets for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AWIS Server] System listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
