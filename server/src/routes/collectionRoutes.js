import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { getBook, getChapterVerseCount } from '../data/bible.js';
import { query } from '../db.js';

const router = Router();

const collectionSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

const verseSchema = z.object({
  bookId: z.number().int().min(1).max(66),
  chapter: z.number().int().min(1),
  verse: z.number().int().min(1),
});

const collectionIdSchema = z.string().uuid();

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
    `select id, name, user_id, created_at as "createdAt", updated_at as "updatedAt"
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
    verseCount: row.verseCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    verses: Array.isArray(row.verses) ? row.verses : [],
  };
}

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
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

router.post('/', async (req, res, next) => {
  try {
    const input = collectionSchema.parse(req.body);
    const result = await query(
      `insert into collections (user_id, name)
       values ($1, $2)
       returning id, name, created_at as "createdAt", updated_at as "updatedAt", 0::int as "verseCount"`,
      [req.user.sub, input.name],
    );

    return res.status(201).json({ collection: collectionFromRow(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Collection name already exists' });
    }
    return next(error);
  }
});

router.get('/:collectionId', async (req, res, next) => {
  try {
    const collectionId = collectionIdSchema.parse(req.params.collectionId);
    const collection = await assertCollectionOwner(collectionId, req.user.sub);

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

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
       group by cv.id, ur.score, ur.favorite
       order by cv.created_at desc`,
      [collectionId, req.user.sub],
    );

    return res.json({
      collection: collectionFromRow({
        ...collection,
        verseCount: verses.rows.length,
        verses: verses.rows,
      }),
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:collectionId', async (req, res, next) => {
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

router.post('/:collectionId/verses', async (req, res, next) => {
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

router.delete('/:collectionId/verses/:bookId/:chapterNum/:verseNum', async (req, res, next) => {
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
