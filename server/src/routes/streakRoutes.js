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

router.post('/restore', requireAuth, async (req, res, next) => {
  try {
    const streak = await getStreakPayload(req.user.sub);

    if (!streak.canRestore) {
      return res.status(409).json({ error: 'No streak restore is available right now', streak });
    }

    await query(
      `insert into streak_restores (user_id, restored_day, week_key)
       values ($1, $2::date, $3::date)`,
      [req.user.sub, streak.restoreDay, streak.weekKey],
    );

    return res.status(201).json({ streak: await getStreakPayload(req.user.sub) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'This streak restore has already been used' });
    }
    return next(error);
  }
});

export default router;
