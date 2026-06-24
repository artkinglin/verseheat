import { Router } from 'express';
import { z } from 'zod';
import { hashPassword, signToken, verifyPassword, requireAuth } from '../auth.js';
import { query } from '../db.js';

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
  displayName: z.string().trim().min(1).max(80).optional(),
});

const loginSchema = credentialsSchema.pick({ email: true, password: true });

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

router.post('/signup', async (req, res, next) => {
  try {
    const input = credentialsSchema.parse(req.body);
    const passwordHash = await hashPassword(input.password);
    const result = await query(
      `insert into users (email, password_hash, display_name)
       values ($1, $2, $3)
       returning id, email, display_name, created_at`,
      [input.email, passwordHash, input.displayName || null],
    );
    const user = publicUser(result.rows[0]);
    res.status(201).json({ user, token: signToken(user) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email is already registered' });
    }
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await query(
      'select id, email, display_name, password_hash, created_at from users where email = $1',
      [input.email],
    );
    const userRow = result.rows[0];

    if (!userRow || !(await verifyPassword(input.password, userRow.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = publicUser(userRow);
    return res.json({ user, token: signToken(user) });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      'select id, email, display_name, created_at from users where id = $1',
      [req.user.sub],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

export default router;
