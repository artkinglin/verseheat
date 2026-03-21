import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';

const router = Router();

const passageSchema = z.object({
  q: z.string().trim().min(1).max(120),
});

const searchSchema = z.object({
  q: z.string().trim().min(1).max(120),
  page: z.coerce.number().int().min(1).default(1),
});

async function esvFetch(path, params) {
  if (!config.esvApiKey) {
    const error = new Error('ESV API key is not configured');
    error.status = 503;
    throw error;
  }

  const url = new URL(`https://api.esv.org${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    headers: { Authorization: `Token ${config.esvApiKey}` },
  });

  if (!response.ok) {
    const error = new Error(`ESV API request failed with ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

router.get('/passage', async (req, res, next) => {
  try {
    const { q } = passageSchema.parse(req.query);
    const data = await esvFetch('/v3/passage/text/', {
      q,
      'include-footnotes': 'false',
      'include-headings': 'false',
      'include-copyright': 'true',
      'line-length': '0',
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const { q, page } = searchSchema.parse(req.query);
    const data = await esvFetch('/v3/passage/search/', {
      q,
      page: String(page),
      'page-size': '20',
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
