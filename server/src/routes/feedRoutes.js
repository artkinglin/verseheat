import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { query } from '../db.js';

const router = Router();

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get('/following', requireAuth, async (req, res, next) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const offset = (page - 1) * limit;

    const [activity, total] = await Promise.all([
      query(
        `with followed_users as (
           select following_id
           from user_follows
           where follower_id = $1
         ),
         events as (
           select 'rating' as type,
                  vr.id,
                  vr.user_id,
                  vr.book_id as "bookId",
                  vr.book_name as "bookName",
                  vr.chapter,
                  vr.verse,
                  vr.score,
                  vr.favorite,
                  vr.updated_at as "createdAt",
                  null::text as "collectionName",
                  null::uuid as "collectionId"
           from verse_ratings vr
           join followed_users fu on fu.following_id = vr.user_id
           union all
           select 'collection' as type,
                  c.id,
                  c.user_id,
                  null::integer as "bookId",
                  null::text as "bookName",
                  null::integer as chapter,
                  null::integer as verse,
                  null::integer as score,
                  null::boolean as favorite,
                  c.created_at as "createdAt",
                  c.name as "collectionName",
                  c.id as "collectionId"
           from collections c
           join followed_users fu on fu.following_id = c.user_id
         )
         select e.*,
                e.user_id as "userId",
                u.display_name as "userDisplayName",
                u.username as "username",
                u.profile_picture as "profilePicture"
         from events e
         join users u on u.id = e.user_id
         order by e."createdAt" desc
         limit $2 offset $3`,
        [req.user.sub, limit, offset],
      ),
      query(
        `with followed_users as (
           select following_id
           from user_follows
           where follower_id = $1
         )
         select (
           (select count(*) from verse_ratings vr join followed_users fu on fu.following_id = vr.user_id) +
           (select count(*) from collections c join followed_users fu on fu.following_id = c.user_id)
         )::int as total`,
        [req.user.sub],
      ),
    ]);

    return res.json({
      activity: activity.rows,
      page,
      limit,
      total: total.rows[0]?.total || 0,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
