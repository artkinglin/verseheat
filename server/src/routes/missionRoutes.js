import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { query } from '../db.js';
import { buildDailyMission, pickDailyTheme } from '../missions.js';
import { utcDateKey } from '../streaks.js';

const router = Router();

async function getMissionProgress(userId, dateKey, theme) {
  const start = `${dateKey}T00:00:00.000Z`;
  const result = await query(
    `select
       (
         select count(*)::int
         from verse_ratings
         where user_id = $1
           and updated_at >= $2::timestamptz
           and updated_at < $2::timestamptz + interval '1 day'
       ) as "ratingsToday",
       (
         select count(*)::int
         from verse_ratings
         where user_id = $1
           and favorite = true
           and updated_at >= $2::timestamptz
           and updated_at < $2::timestamptz + interval '1 day'
       ) as "favoritesToday",
       (
         select count(*)::int
         from collection_verses cv
         join collections c on c.id = cv.collection_id
         where c.user_id = $1
           and cv.created_at >= $2::timestamptz
           and cv.created_at < $2::timestamptz + interval '1 day'
       ) as "collectionSavesToday",
       (
         select count(distinct (vr.book_id, vr.chapter, vr.verse))::int
         from verse_ratings vr
         join verse_struggles vs
           on vs.book_id = vr.book_id
          and vs.chapter = vr.chapter
          and vs.verse = vr.verse
         where vr.user_id = $1
           and vs.struggle = $3
           and vr.updated_at >= $2::timestamptz
           and vr.updated_at < $2::timestamptz + interval '1 day'
       ) as "themeRatingsToday"`,
    [userId, start, theme],
  );

  return result.rows[0] || {};
}

export async function getDailyMissionPayload(userId, dateKey = utcDateKey()) {
  const theme = pickDailyTheme(userId, dateKey);
  const progress = await getMissionProgress(userId, dateKey, theme);

  return buildDailyMission({
    dateKey,
    progress,
    theme,
    userId,
  });
}

router.get('/today', requireAuth, async (req, res, next) => {
  try {
    return res.json({ mission: await getDailyMissionPayload(req.user.sub) });
  } catch (error) {
    return next(error);
  }
});

export default router;
