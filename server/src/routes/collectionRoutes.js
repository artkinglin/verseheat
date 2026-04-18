import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth, requireAuth } from '../auth.js';
import { getBook, getChapterVerseCount } from '../data/bible.js';
import { query } from '../db.js';

const router = Router();

const collectionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  isPublic: z.boolean().optional().default(true),
});

const collectionUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  isPublic: z.boolean().optional(),
});

const verseSchema = z.object({
  bookId: z.number().int().min(1).max(66),
  chapter: z.number().int().min(1),
  verse: z.number().int().min(1),
});

const collectionIdSchema = z.string().uuid();
const exportSchema = z.object({
  format: z.enum(['txt', 'md', 'csv']).default('txt'),
});

function validateReference(input) {
  const book = getBook(input.bookId);
  if (!book) return { error: 'Book not found' };
  if (input.chapter > book.chapters) return { error: 'Chapter not found' };
  if (input.verse > getChapterVerseCount(input.bookId, input.chapter)) {
    return { error: 'Verse not found' };
  }
  return { book };
}

async function assertCollectionOwner(collectionId, userId) {
  const result = await query(
    `select id, name, user_id, is_public as "isPublic", created_at as "createdAt", updated_at as "updatedAt"
     from collections
     where id = $1 and user_id = $2`,
    [collectionId, userId],
  );
  return result.rows[0] || null;
}

function collectionFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    isPublic: row.isPublic ?? true,
    owner: row.ownerUsername ? {
      id: row.userId,
      displayName: row.ownerDisplayName,
      username: row.ownerUsername,
      profilePicture: row.ownerProfilePicture,
    } : undefined,
    verseCount: row.verseCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    verses: Array.isArray(row.verses) ? row.verses : [],
  };
}

async function loadCollectionDetail({ collectionId, viewerId, ownerOnly = false, publicOnly = false }) {
  const collectionResult = await query(
    `select c.id,
            c.name,
            c.user_id as "userId",
            c.is_public as "isPublic",
            c.created_at as "createdAt",
            c.updated_at as "updatedAt",
            u.display_name as "ownerDisplayName",
            u.username as "ownerUsername",
            u.profile_picture as "ownerProfilePicture"
     from collections c
     join users u on u.id = c.user_id
     where c.id = $1
       and ($2::uuid is null or c.user_id = $2)
       and ($3::boolean = false or c.is_public = true)`,
    [collectionId, ownerOnly ? viewerId : null, publicOnly],
  );
  const collection = collectionResult.rows[0];
  if (!collection) return null;

  const verses = await query(
    `select cv.id,
            'verse' as scope,
            cv.book_id as "bookId",
            cv.book_name as "bookName",
            cv.chapter,
            cv.verse,
            cv.created_at as "createdAt",
            ur.score as "myScore",
            ur.favorite as "favorite",
            ur.note,
            round(avg(all_ratings.score)::numeric, 2)::float as "averageRating",
            count(all_ratings.score)::int as "ratingCount"
     from collection_verses cv
     left join verse_ratings ur
       on ur.user_id = $2
      and ur.book_id = cv.book_id
      and ur.chapter = cv.chapter
      and ur.verse = cv.verse
     left join verse_ratings all_ratings
       on all_ratings.book_id = cv.book_id
      and all_ratings.chapter = cv.chapter
      and all_ratings.verse = cv.verse
     where cv.collection_id = $1
     group by cv.id, ur.score, ur.favorite, ur.note
     order by cv.created_at desc`,
    [collectionId, viewerId || null],
  );

  return collectionFromRow({
    ...collection,
    verseCount: verses.rows.length,
    verses: verses.rows,
  });
}

function referenceLabel(verse) {
  return `${verse.bookName} ${verse.chapter}:${verse.verse}`;
}

function exportCollection(collection, format) {
  const verses = Array.isArray(collection.verses) ? collection.verses : [];

  if (format === 'csv') {
    const rows = ['Reference,Your Rating,Community Rating,Note'];
    verses.forEach((verse) => {
      rows.push([
        referenceLabel(verse),
        verse.myScore || '',
        verse.averageRating || '',
        verse.note || '',
      ].map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','));
    });
    return { contentType: 'text/csv; charset=utf-8', body: rows.join('\n') };
  }

  if (format === 'md') {
    const rows = [`# ${collection.name}`, ''];
    verses.forEach((verse) => {
      rows.push(`- **${referenceLabel(verse)}**${verse.myScore ? ` - rated ${verse.myScore}/10` : ''}${verse.note ? `\n  ${verse.note}` : ''}`);
    });
    return { contentType: 'text/markdown; charset=utf-8', body: rows.join('\n') };
  }

  return {
    contentType: 'text/plain; charset=utf-8',
    body: [
      collection.name,
      '',
      ...verses.map((verse) => `${referenceLabel(verse)}${verse.myScore ? ` - rated ${verse.myScore}/10` : ''}${verse.note ? `\n${verse.note}` : ''}`),
    ].join('\n'),
  };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `select c.id,
              c.name,
              c.is_public as "isPublic",
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
              ) as verses
       from collections c
       left join collection_verses cv on cv.collection_id = c.id
       where c.user_id = $1
       group by c.id
       order by c.updated_at desc, c.created_at desc`,
      [req.user.sub],
    );

    return res.json({ collections: result.rows.map(collectionFromRow) });
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const input = collectionSchema.parse(req.body);
    const result = await query(
      `insert into collections (user_id, name, is_public)
       values ($1, $2, $3)
       returning id, name, is_public as "isPublic", created_at as "createdAt", updated_at as "updatedAt", 0::int as "verseCount"`,
      [req.user.sub, input.name, input.isPublic],
    );

    return res.status(201).json({ collection: collectionFromRow(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Collection name already exists' });
    }
    return next(error);
  }
});

router.get('/public/:collectionId', optionalAuth, async (req, res, next) => {
  try {
    const collectionId = collectionIdSchema.parse(req.params.collectionId);
    const collection = await loadCollectionDetail({ collectionId, viewerId: req.user?.sub, publicOnly: true });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    return res.json({ collection });
  } catch (error) {
    return next(error);
  }
});

router.get('/public/:collectionId/export', optionalAuth, async (req, res, next) => {
  try {
    const collectionId = collectionIdSchema.parse(req.params.collectionId);
    const { format } = exportSchema.parse(req.query);
    const collection = await loadCollectionDetail({ collectionId, viewerId: req.user?.sub, publicOnly: true });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const output = exportCollection(collection, format);
    res.setHeader('content-type', output.contentType);
    return res.send(output.body);
  } catch (error) {
    return next(error);
  }
});

router.get('/:collectionId', requireAuth, async (req, res, next) => {
  try {
    const collectionId = collectionIdSchema.parse(req.params.collectionId);
    const collection = await loadCollectionDetail({ collectionId, viewerId: req.user.sub, ownerOnly: true });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    return res.json({ collection });
  } catch (error) {
    return next(error);
  }
});

router.get('/:collectionId/export', requireAuth, async (req, res, next) => {
  try {
    const collectionId = collectionIdSchema.parse(req.params.collectionId);
    const { format } = exportSchema.parse(req.query);
    const collection = await loadCollectionDetail({ collectionId, viewerId: req.user.sub, ownerOnly: true });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const output = exportCollection(collection, format);
    res.setHeader('content-type', output.contentType);
    return res.send(output.body);
  } catch (error) {
    return next(error);
  }
});

router.patch('/:collectionId', requireAuth, async (req, res, next) => {
  try {
    const collectionId = collectionIdSchema.parse(req.params.collectionId);
    const input = collectionUpdateSchema.parse(req.body);
    const result = await query(
      `update collections
       set name = coalesce($3, name),
           is_public = case when $4::boolean then $5 else is_public end,
           updated_at = now()
       where id = $1 and user_id = $2
       returning id, name, is_public as "isPublic", created_at as "createdAt", updated_at as "updatedAt", 0::int as "verseCount"`,
      [
        collectionId,
        req.user.sub,
        input.name || null,
        Object.hasOwn(input, 'isPublic'),
        input.isPublic ?? false,
      ],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    return res.json({ collection: collectionFromRow(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Collection name already exists' });
    }
    return next(error);
  }
});

router.delete('/:collectionId', requireAuth, async (req, res, next) => {
  try {
    const collectionId = collectionIdSchema.parse(req.params.collectionId);
    const result = await query(
      `delete from collections
       where id = $1 and user_id = $2`,
      [collectionId, req.user.sub],
    );

    return res.json({ deleted: result.rowCount > 0 });
  } catch (error) {
    return next(error);
  }
});

router.post('/:collectionId/verses', requireAuth, async (req, res, next) => {
  try {
    const collectionId = collectionIdSchema.parse(req.params.collectionId);
    const input = verseSchema.parse(req.body);
    const collection = await assertCollectionOwner(collectionId, req.user.sub);

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const reference = validateReference(input);
    if (reference.error) {
      return res.status(400).json({ error: reference.error });
    }

    const result = await query(
      `with inserted as (
         insert into collection_verses (collection_id, book_id, book_name, chapter, verse)
         values ($1, $2, $3, $4, $5)
         on conflict (collection_id, book_id, chapter, verse) do nothing
         returning id, 'verse' as scope, book_id as "bookId", book_name as "bookName", chapter, verse, created_at as "createdAt"
       ), touched as (
         update collections
         set updated_at = now()
         where id = $1
       )
       select * from inserted`,
      [collectionId, input.bookId, reference.book.name, input.chapter, input.verse],
    );

    return res.status(201).json({
      added: result.rowCount > 0,
      verse: result.rows[0] || {
        scope: 'verse',
        bookId: input.bookId,
        bookName: reference.book.name,
        chapter: input.chapter,
        verse: input.verse,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:collectionId/verses/:bookId/:chapterNum/:verseNum', requireAuth, async (req, res, next) => {
  try {
    const collectionId = collectionIdSchema.parse(req.params.collectionId);
    const input = {
      bookId: z.coerce.number().int().min(1).max(66).parse(req.params.bookId),
      chapter: z.coerce.number().int().min(1).parse(req.params.chapterNum),
      verse: z.coerce.number().int().min(1).parse(req.params.verseNum),
    };
    const collection = await assertCollectionOwner(collectionId, req.user.sub);

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const reference = validateReference(input);
    if (reference.error) {
      return res.status(400).json({ error: reference.error });
    }

    const result = await query(
      `with deleted as (
         delete from collection_verses
         where collection_id = $1
           and book_id = $2
           and chapter = $3
           and verse = $4
         returning id
       ), touched as (
         update collections
         set updated_at = now()
         where id = $1
       )
       select * from deleted`,
      [collectionId, input.bookId, input.chapter, input.verse],
    );

    return res.json({ deleted: result.rowCount > 0 });
  } catch (error) {
    return next(error);
  }
});

export default router;
