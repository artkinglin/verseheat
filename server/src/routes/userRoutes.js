import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth, requireAuth } from '../auth.js';
import { query } from '../db.js';

const router = Router();

const userIdSchema = z.string().uuid();
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
const profileUpdateSchema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  displayName: z.string().trim().min(1).max(80).nullable().optional(),
  bio: z.string().trim().max(180).nullable().optional(),
  profilePicture: z.string().trim().url().max(500).nullable().or(z.literal('')).optional(),
});

const ratingScores = Array.from({ length: 10 }, (_, index) => index + 1);
const ratingMilestones = [10, 25, 50, 100, 250, 500, 1000];
const streakMilestones = [3, 7, 14, 30, 60, 100];

function publicUser(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    username: row.username,
    bio: row.bio,
    profilePicture: row.profile_picture,
    createdAt: row.created_at,
  };
}

async function getUser(userId) {
  const result = await query(
    `select id, display_name, username, bio, profile_picture, created_at
     from users
     where id = $1`,
    [userId],
  );
  return result.rows[0] ? publicUser(result.rows[0]) : null;
}

async function getFollowSummary(userId, viewerId) {
  const result = await query(
    `select
       (select count(*)::int from user_follows where following_id = $1) as "followerCount",
       (select count(*)::int from user_follows where follower_id = $1) as "followingCount",
       exists (
         select 1 from user_follows
         where follower_id = $2 and following_id = $1
       ) as "isFollowing"`,
    [userId, viewerId || null],
  );

  return {
    followerCount: result.rows[0]?.followerCount || 0,
    followingCount: result.rows[0]?.followingCount || 0,
    isFollowing: Boolean(result.rows[0]?.isFollowing),
  };
}

async function getStats(userId) {
  const [summary, favoriteBook] = await Promise.all([
    query(
    `select count(*)::int as "totalVersesRated",
            count(distinct book_id)::int as "bookCount",
            round(avg(score)::numeric, 2)::float as "averageRatingGiven",
            count(*) filter (where favorite)::int as "favoriteCount"
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
       order by count(*) desc, avg(score) desc, book_id asc
       limit 1`,
      [userId],
    ),
  ]);

  return {
    totalVersesRated: summary.rows[0]?.totalVersesRated || 0,
    bookCount: summary.rows[0]?.bookCount || 0,
    averageRatingGiven: summary.rows[0]?.averageRatingGiven || null,
    favoriteCount: summary.rows[0]?.favoriteCount || 0,
    favoriteBook: favoriteBook.rows[0] || null,
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

async function getProfilePayload(userId, viewerId) {
  const user = await getUser(userId);

  if (!user) {
    return null;
  }

  const [stats, topRatedVerses, collections, favoriteStruggles, follow] = await Promise.all([
    getStats(userId),
    getTopRatedVerses(userId),
    getCollections(userId),
    getFavoriteStruggles(userId),
    getFollowSummary(userId, viewerId),
  ]);

  return {
    user,
    stats,
    follow,
    topRatedVerses,
    collections,
    favoriteStruggles,
  };
}

router.patch('/me/profile', requireAuth, async (req, res, next) => {
  try {
    const input = profileUpdateSchema.parse(req.body);
    const profilePicture = input.profilePicture === '' ? null : input.profilePicture;
    const result = await query(
      `update users
       set username = coalesce($2, username),
           display_name = case when $3::boolean then $4 else display_name end,
           bio = case when $5::boolean then $6 else bio end,
           profile_picture = case when $7::boolean then $8 else profile_picture end
       where id = $1
       returning id, email, display_name, username, bio, profile_picture, created_at`,
      [
        req.user.sub,
        input.username || null,
        Object.hasOwn(input, 'displayName'),
        input.displayName || null,
        Object.hasOwn(input, 'bio'),
        input.bio || null,
        Object.hasOwn(input, 'profilePicture'),
        profilePicture || null,
      ],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        displayName: result.rows[0].display_name,
        username: result.rows[0].username,
        bio: result.rows[0].bio,
        profilePicture: result.rows[0].profile_picture,
        createdAt: result.rows[0].created_at,
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Username is already taken' });
    }
    return next(error);
  }
});

router.get('/me/following', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `select u.id,
              u.display_name,
              u.username,
              u.bio,
              u.profile_picture,
              u.created_at,
              uf.created_at as "followedAt"
       from user_follows uf
       join users u on u.id = uf.following_id
       where uf.follower_id = $1
       order by uf.created_at desc`,
      [req.user.sub],
    );

    return res.json({
      following: result.rows.map((row) => ({
        ...publicUser(row),
        followedAt: row.followedAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:userId/profile', optionalAuth, async (req, res, next) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const profile = await getProfilePayload(userId, req.user?.sub);

    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(profile);
  } catch (error) {
    return next(error);
  }
});

router.get('/:userId', optionalAuth, async (req, res, next) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const profile = await getProfilePayload(userId, req.user?.sub);

    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(profile);
  } catch (error) {
    return next(error);
  }
});

router.post('/:userId/follow', requireAuth, async (req, res, next) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    if (userId === req.user.sub) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    const user = await getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await query(
      `insert into user_follows (follower_id, following_id)
       values ($1, $2)
       on conflict do nothing`,
      [req.user.sub, userId],
    );

    return res.status(201).json({ follow: await getFollowSummary(userId, req.user.sub) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:userId/follow', requireAuth, async (req, res, next) => {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    await query(
      `delete from user_follows
       where follower_id = $1 and following_id = $2`,
      [req.user.sub, userId],
    );

    return res.json({ follow: await getFollowSummary(userId, req.user.sub) });
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
