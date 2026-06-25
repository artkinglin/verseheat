import { Router } from 'express';
import { z } from 'zod';
import { hashPassword, signToken, verifyPassword, requireAuth } from '../auth.js';
import { query } from '../db.js';

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
  displayName: z.string().trim().min(1).max(80).optional(),
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/).optional(),
});

const loginSchema = credentialsSchema.pick({ email: true, password: true });

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    username: row.username,
    bio: row.bio,
    profilePicture: row.profile_picture,
    createdAt: row.created_at,
  };
}

function usernameBase(input) {
  const normalized = String(input || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  return normalized.length >= 3 ? normalized : 'user';
}

async function availableUsername(preferred) {
  const base = usernameBase(preferred);

  for (let index = 0; index < 10; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`;
    const result = await query('select 1 from users where lower(username) = lower($1)', [candidate]);
    if (result.rowCount === 0) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`.slice(0, 32);
}

router.post('/signup', async (req, res, next) => {
  try {
    const input = credentialsSchema.parse(req.body);
    const passwordHash = await hashPassword(input.password);
    const username = await availableUsername(input.username || input.displayName || input.email.split('@')[0]);
    const result = await query(
      `insert into users (email, password_hash, display_name, username)
       values ($1, $2, $3, $4)
       returning id, email, display_name, username, bio, profile_picture, created_at`,
      [input.email, passwordHash, input.displayName || null, username],
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
      'select id, email, display_name, username, bio, profile_picture, password_hash, created_at from users where email = $1',
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
      'select id, email, display_name, username, bio, profile_picture, created_at from users where id = $1',
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
