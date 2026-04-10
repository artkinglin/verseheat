import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { buildCompletionSummary, compactCompletionSummary } from '../completion.js';
import { query } from '../db.js';

const router = Router();

const completionQuerySchema = z.object({
  bookId: z.coerce.number().int().min(1).max(66).optional(),
});

async function getUserRatingReferences(userId) {
  const result = await query(
    `select book_id, chapter, verse
     from verse_ratings
     where user_id = $1`,
    [userId],
  );

  return result.rows;
}

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { bookId } = completionQuerySchema.parse(req.query);
    const summary = buildCompletionSummary(await getUserRatingReferences(req.user.sub));

    if (bookId) {
      const book = summary.books.find((item) => item.bookId === bookId);
      if (!book) return res.status(404).json({ error: 'Book not found' });
      return res.json({ completion: { ...compactCompletionSummary(summary), book } });
    }

    return res.json({ completion: compactCompletionSummary(summary) });
  } catch (error) {
    return next(error);
  }
});

export default router;
