import { Router } from 'express';
import { z } from 'zod';
import { esvFetch } from '../esv.js';

const router = Router();

const passageSchema = z.object({
  q: z.string().trim().min(1).max(120),
});

const searchSchema = z.object({
  q: z.string().trim().min(1).max(120),
  page: z.coerce.number().int().min(1).default(1),
});

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
