import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { query } from '../db.js';
import { getBook, getChapterVerseCount } from '../data/bible.js';

const router = Router();

const scopeSchema = z.enum(['verse', 'chapter']);
const ratingSchema = z.object({
  scope: scopeSchema,
  bookId: z.number().int().min(1).max(66),
  chapter: z.number().int().min(1),
  verse: z.number().int().min(1).nullable().optional(),
  score: z.number().int().min(1).max(10),
  favorite: z.boolean().optional(),
});

const aggregateSchema = z.object({
  scope: scopeSchema.optional(),
  bookId: z.coerce.number().int().min(1).max(66).optional(),
  chapter: z.coerce.number().int().min(1).optional(),
});

function validateReference(input) {
  const book = getBook(input.bookId);
  if (!book) return 'Book not found';
  if (input.chapter > book.chapters) return 'Chapter not found';
  if (input.scope === 'chapter' && input.verse) return 'Chapter ratings cannot include a verse';
  if (input.scope === 'verse') {
    const verseCount = getChapterVerseCount(input.bookId, input.chapter);
    if (!input.verse || input.verse > verseCount) return 'Verse not found';
  }
  return null;
}

function aggregateSelect(whereSql, params) {
  return query(
    `select
       scope,
       book_id as "bookId",
       book_name as "bookName",
       chapter,
       verse,
       count(*)::int as "ratingCount",
       round(avg(score)::numeric, 2)::float as "averageRating",
       max(updated_at) as "lastRatedAt"
     from ratings
     ${whereSql}
     group by scope, book_id, book_name, chapter, verse
     order by book_id asc, chapter asc, verse asc nulls first`,
    params,
  );
}

router.get('/aggregates', async (req, res, next) => {
  try {
    const filters = aggregateSchema.parse(req.query);
    const clauses = [];
    const params = [];

    Object.entries({
      scope: filters.scope,
      book_id: filters.bookId,
      chapter: filters.chapter,
    }).forEach(([column, value]) => {
      if (value !== undefined) {
        params.push(value);
        clauses.push(`${column} = $${params.length}`);
      }
    });

    const result = await aggregateSelect(
      clauses.length ? `where ${clauses.join(' and ')}` : '',
      params,
    );
    res.json({ aggregates: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const input = ratingSchema.parse(req.body);
    const error = validateReference(input);

    if (error) {
      return res.status(400).json({ error });
    }

    const book = getBook(input.bookId);
    const result = await query(
      `insert into ratings (user_id, scope, book_id, book_name, chapter, verse, score, favorite)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (user_id, scope, book_id, chapter, verse)
       do update set score = excluded.score, favorite = excluded.favorite, updated_at = now()
       returning id, scope, book_id as "bookId", book_name as "bookName", chapter, verse, score, favorite, updated_at as "updatedAt"`,
      [
        req.user.sub,
        input.scope,
        input.bookId,
        book.name,
        input.chapter,
        input.scope === 'verse' ? input.verse : null,
        input.score,
        input.favorite || false,
      ],
    );

    return res.status(201).json({ rating: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.get('/leaderboard', async (req, res, next) => {
  try {
    const result = await query(
      `select scope, book_id as "bookId", book_name as "bookName", chapter, verse,
              count(*)::int as "ratingCount",
              round(avg(score)::numeric, 2)::float as "averageRating"
       from ratings
       where scope = 'verse'
       group by scope, book_id, book_name, chapter, verse
       having count(*) > 0
       order by avg(score) desc, count(*) desc
       limit 50`,
    );
    res.json({ leaderboard: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/trending', async (req, res, next) => {
  try {
    const result = await query(
      `select scope, book_id as "bookId", book_name as "bookName", chapter, verse,
              count(*)::int as "ratingCount",
              round(avg(score)::numeric, 2)::float as "averageRating"
       from ratings
       where updated_at >= now() - interval '7 days'
       group by scope, book_id, book_name, chapter, verse
       order by count(*) desc, avg(score) desc
       limit 20`,
    );
    res.json({ trending: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `select id, scope, book_id as "bookId", book_name as "bookName", chapter, verse,
              score, favorite, updated_at as "updatedAt"
       from ratings
       where user_id = $1
       order by updated_at desc`,
      [req.user.sub],
    );
    res.json({ ratings: result.rows });
  } catch (error) {
    next(error);
  }
});

export default router;
