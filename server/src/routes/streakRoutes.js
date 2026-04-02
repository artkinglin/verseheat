import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { query } from '../db.js';
import { canRestoreStreak, startOfUtcWeek, utcDateKey } from '../streaks.js';

const router = Router();

async function getRatingDays(userId) {
  const result = await query(
    `select distinct (updated_at at time zone 'UTC')::date::text as day
     from verse_ratings
     where user_id = $1
     order by day desc
     limit 120`,
    [userId],
  );

  return result.rows.map((row) => row.day);
}

async function getRestoredDays(userId) {
  const result = await query(
    `select restored_day::text as day
     from streak_restores
     where user_id = $1
     order by restored_day desc
     limit 120`,
    [userId],
  );

  return result.rows.map((row) => row.day);
}

async function hasWeeklyRestore(userId, weekKey) {
  const result = await query(
    `select exists (
       select 1 from streak_restores
       where user_id = $1 and week_key = $2::date
     ) as "used"`,
    [userId, weekKey],
  );

  return Boolean(result.rows[0]?.used);
}

export async function getStreakPayload(userId, today = utcDateKey()) {
  const weekKey = startOfUtcWeek(today);
  const [ratingDays, restoredDays, restoreUsedThisWeek] = await Promise.all([
    getRatingDays(userId),
    getRestoredDays(userId),
    hasWeeklyRestore(userId, weekKey),
  ]);

  return canRestoreStreak({
    ratingDays,
    restoredDays,
    restoreUsedThisWeek,
    today,
  });
}

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    return res.json({ streak: await getStreakPayload(req.user.sub) });
  } catch (error) {
    return next(error);
  }
});

export default router;
