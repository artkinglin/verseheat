import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';

const router = Router();

const userIdSchema = z.string().uuid();
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const ratingScores = Array.from({ length: 10 }, (_, index) => index + 1);
const ratingMilestones = [10, 25, 50, 100, 250, 500, 1000];
const streakMilestones = [3, 7, 14, 30, 60, 100];

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

function currentUtcDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function previousDateKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function currentStreak(activeDays) {
  const activeSet = new Set(activeDays);
  let cursor = currentUtcDateKey();
  let streak = 0;

  while (activeSet.has(cursor)) {
    streak += 1;
    cursor = previousDateKey(cursor);
  }

  return streak;
}

function nextMilestone(value, milestones) {
  return milestones.find((milestone) => milestone > value) || null;
}

function achievementBadges(totalVersesRated, streak) {
  const badges = [];

  if (totalVersesRated >= 10) badges.push({ id: 'rated-10', label: 'First 10', description: 'Rated 10 verses' });
  if (totalVersesRated >= 50) badges.push({ id: 'rated-50', label: 'Verse Collector', description: 'Rated 50 verses' });
  if (totalVersesRated >= 100) badges.push({ id: 'rated-100', label: 'Century Reader', description: 'Rated 100 verses' });
  if (streak >= 3) badges.push({ id: 'streak-3', label: 'Three Day Flame', description: 'Rated verses 3 days in a row' });
  if (streak >= 7) badges.push({ id: 'streak-7', label: 'Weeklong Heat', description: 'Rated verses 7 days in a row' });

  return badges;
}

async function getStatistics(userId) {
  const [
    stats,
    bookBreakdown,
    distribution,
    struggleCategory,
    activeDays,
  ] = await Promise.all([
    query(
      `select count(*)::int as "totalVersesRated",
              count(distinct book_id)::int as "totalBooksTouched",
              round(avg(score)::numeric, 2)::float as "averageRatingGiven"
       from verse_ratings
       where user_id = $1`,
      [userId],
    ),
    query(
      `select book_id as "bookId",
              max(book_name) as "bookName",
              count(*)::int as "verseCount",
              round(avg(score)::numeric, 2)::float as "averageRating"
       from verse_ratings
       where user_id = $1
       group by book_id
       order by count(*) desc, book_id asc`,
      [userId],
    ),
    query(
      `select score, count(*)::int as count
       from verse_ratings
       where user_id = $1
       group by score
       order by score asc`,
      [userId],
    ),
    query(
      `select vs.category,
              count(*)::int as "ratingCount",
              round(avg(vr.score)::numeric, 2)::float as "averageScore"
       from verse_ratings vr
       join verse_struggles vs
         on vs.book_id = vr.book_id
        and vs.chapter = vr.chapter
        and vs.verse = vr.verse
       where vr.user_id = $1
       group by vs.category
       order by count(*) desc, avg(vr.score) desc, vs.category asc
       limit 1`,
      [userId],
    ),
    query(
      `select distinct (updated_at at time zone 'UTC')::date::text as day
       from verse_ratings
       where user_id = $1
       order by day desc
       limit 60`,
      [userId],
    ),
  ]);

  const summary = {
    totalVersesRated: stats.rows[0]?.totalVersesRated || 0,
    totalBooksTouched: stats.rows[0]?.totalBooksTouched || 0,
    averageRatingGiven: stats.rows[0]?.averageRatingGiven || null,
  };
  const distributionMap = new Map(distribution.rows.map((row) => [row.score, row.count]));
  const days = activeDays.rows.map((row) => row.day);
  const streak = currentStreak(days);
  const nextRatingMilestone = nextMilestone(summary.totalVersesRated, ratingMilestones);
  const nextStreakMilestone = nextMilestone(streak, streakMilestones);

  return {
    ...summary,
    versesRatedPerBook: bookBreakdown.rows,
    favoriteBook: bookBreakdown.rows[0] || null,
    mostRatedStruggleCategory: struggleCategory.rows[0] || null,
    ratingDistribution: ratingScores.map((score) => ({
      score,
      count: distributionMap.get(score) || 0,
    })),
    streak,
    activeDays: days,
    achievements: achievementBadges(summary.totalVersesRated, streak),
    nextMilestone: nextRatingMilestone ? {
      target: nextRatingMilestone,
      remaining: nextRatingMilestone - summary.totalVersesRated,
      progress: Math.min(100, Math.round((summary.totalVersesRated / nextRatingMilestone) * 100)),
    } : null,
    nextStreakMilestone: nextStreakMilestone ? {
      target: nextStreakMilestone,
      remaining: nextStreakMilestone - streak,
      progress: Math.min(100, Math.round((streak / nextStreakMilestone) * 100)),
    } : null,
  };
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

router.get('/:userId/statistics', async (req, res, next) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const user = await getUser(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ statistics: await getStatistics(userId) });
  } catch (error) {
    return next(error);
  }
});

export default router;
