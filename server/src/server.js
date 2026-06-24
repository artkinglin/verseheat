import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZodError } from 'zod';
import { config } from './config.js';
import authRoutes from './routes/authRoutes.js';
import bibleRoutes from './routes/bibleRoutes.js';
import esvRoutes from './routes/esvRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/', rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  app.use('/api/ratings', rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/bible', bibleRoutes);
  app.use('/api/esv', esvRoutes);
  app.use('/api/ratings', ratingRoutes);

  if (config.nodeEnv === 'production') {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const clientDist = path.resolve(__dirname, '../../client/dist');
    app.use(express.static(clientDist));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((error, req, res, next) => {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.flatten() });
    }

    const status = error.status || 500;
    if (status >= 500) {
      console.error(error);
    }
    return res.status(status).json({ error: error.message || 'Server error' });
  });

  return app;
}
