import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';

const router = Router();

const userIdSchema = z.string().uuid();
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

async function getUser(userId) {
  const result = await query(
    `select id, email, display_name, created_at
     from users
     where id = $1`,
    [userId],
  );
  return result.rows[0] ? publicUser(result.rows[0]) : null;
}

async function getStats(userId) {
  const result = await query(
    `select count(*)::int as "totalVersesRated",
            count(distinct book_id)::int as "bookCount",
            round(avg(score)::numeric, 2)::float as "averageRatingGiven",
            count(*) filter (where favorite)::int as "favoriteCount"
     from verse_ratings
     where user_id = $1`,
    [userId],
  );

  return {
    totalVersesRated: result.rows[0]?.totalVersesRated || 0,
    bookCount: result.rows[0]?.bookCount || 0,
    averageRatingGiven: result.rows[0]?.averageRatingGiven || null,
    favoriteCount: result.rows[0]?.favoriteCount || 0,
  };
}

async function getTopRatedVerses(userId, limit = 12) {
  const result = await query(
    `select id,
            'verse' as scope,
            book_id as "bookId",
            book_name as "bookName",
            chapter,
            verse,
            score,
            favorite,
            updated_at as "updatedAt"
     from verse_ratings
     where user_id = $1 and score >= 9
     order by score desc, updated_at desc
     limit $2`,
    [userId, limit],
  );
  return result.rows;
}

async function getFavoriteStruggles(userId) {
  const result = await query(
    `select vs.struggle,
            max(vs.category) as category,
            count(*)::int as "ratingCount",
            round(avg(vr.score)::numeric, 2)::float as "averageScore"
     from verse_ratings vr
     join verse_struggles vs
       on vs.book_id = vr.book_id
      and vs.chapter = vr.chapter
      and vs.verse = vr.verse
     where vr.user_id = $1
     group by vs.struggle
     order by count(*) desc, avg(vr.score) desc, vs.struggle asc
     limit 8`,
    [userId],
  );
  return result.rows;
}

async function getCollections(userId) {
  const result = await query(
    `select c.id,
            c.name,
            c.created_at as "createdAt",
            c.updated_at as "updatedAt",
            count(cv.id)::int as "verseCount",
            coalesce(
              json_agg(
                json_build_object(
                  'bookId', cv.book_id,
                  'bookName', cv.book_name,
                  'chapter', cv.chapter,
                  'verse', cv.verse
                )
                order by cv.created_at desc
              ) filter (where cv.id is not null),
              '[]'::json
            ) as "versePreviews"
     from collections c
     left join collection_verses cv on cv.collection_id = c.id
     where c.user_id = $1
     group by c.id
     order by c.updated_at desc, c.created_at desc`,
    [userId],
  );

  return result.rows.map((collection) => ({
    ...collection,
    versePreviews: Array.isArray(collection.versePreviews)
      ? collection.versePreviews.slice(0, 4)
      : [],
  }));
}

router.get('/:userId', async (req, res, next) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const user = await getUser(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [stats, topRatedVerses, collections, favoriteStruggles] = await Promise.all([
      getStats(userId),
      getTopRatedVerses(userId),
      getCollections(userId),
      getFavoriteStruggles(userId),
    ]);

    return res.json({
      user,
      stats,
      topRatedVerses,
      collections,
      favoriteStruggles,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:userId/ratings', async (req, res, next) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const { page, limit } = paginationSchema.parse(req.query);
    const user = await getUser(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const offset = (page - 1) * limit;
    const [ratings, total] = await Promise.all([
      query(
        `select id,
                'verse' as scope,
                book_id as "bookId",
                book_name as "bookName",
                chapter,
                verse,
                score,
                favorite,
                updated_at as "updatedAt"
         from verse_ratings
         where user_id = $1
         order by updated_at desc
         limit $2 offset $3`,
        [userId, limit, offset],
      ),
      query(
        `select count(*)::int as total
         from verse_ratings
         where user_id = $1`,
        [userId],
      ),
    ]);

    return res.json({
      ratings: ratings.rows,
      page,
      limit,
      total: total.rows[0]?.total || 0,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:userId/collections', async (req, res, next) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const user = await getUser(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ collections: await getCollections(userId) });
  } catch (error) {
    return next(error);
  }
});

export default router;
