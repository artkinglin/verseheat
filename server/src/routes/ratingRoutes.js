import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { query } from '../db.js';
import { getBaselineBookRating, getBaselineChapterRating, getBaselineVerseRating } from '../data/baselineRatings.js';
import { getBook, getChapterVerseCount } from '../data/bible.js';
import { normalizeStruggleList, struggleGroups, struggleNames } from '../data/struggles.js';

const router = Router();

const ratingSchema = z.object({
  scope: z.literal('verse').optional().default('verse'),
  bookId: z.number().int().min(1).max(66),
  chapter: z.number().int().min(1),
  verse: z.number().int().min(1),
  score: z.number().int().min(1).max(10),
  favorite: z.boolean().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
});

const aggregateSchema = z.object({
  scope: z.enum(['verse', 'chapter', 'book']).optional(),
  bookId: z.coerce.number().int().min(1).max(66).optional(),
  chapter: z.coerce.number().int().min(1).optional(),
});

const strugglesSchema = z.object({
  struggle: z.union([z.string(), z.array(z.string())]).optional(),
  struggles: z.string().optional(),
});

const noteSchema = z.object({
  note: z.string().trim().max(2000).nullable().optional(),
});

function validateReference(input) {
  const book = getBook(input.bookId);
  if (!book) return 'Book not found';
  if (input.chapter > book.chapters) return 'Chapter not found';
  const verseCount = getChapterVerseCount(input.bookId, input.chapter);
  if (!input.verse || input.verse > verseCount) return 'Verse not found';
  return null;
}

function emptyBookRating(book) {
  const baselineRating = getBaselineBookRating(book.id);
  return {
    scope: 'book',
    bookId: book.id,
    bookName: book.name,
    ratingCount: 0,
    averageRating: baselineRating,
    baselineRating,
    lastRatedAt: null,
  };
}

function emptyChapterRating(book, chapter) {
  const baselineRating = getBaselineChapterRating(book.id, chapter);
  return {
    scope: 'chapter',
    bookId: book.id,
    bookName: book.name,
    chapter,
    ratingCount: 0,
    averageRating: baselineRating,
    baselineRating,
    lastRatedAt: null,
  };
}

function emptyVerseRating(book, chapter, verse) {
  const baselineRating = getBaselineVerseRating(book.id, chapter, verse);
  return {
    scope: 'verse',
    bookId: book.id,
    bookName: book.name,
    chapter,
    verse,
    ratingCount: 0,
    averageRating: baselineRating,
    baselineRating,
    lastRatedAt: null,
  };
}

function applyUserAggregate(emptyRating, row) {
  if (!row || !row.ratingCount || row.averageRating === null) {
    return emptyRating;
  }

  return {
    ...emptyRating,
    ...row,
    baselineRating: emptyRating.baselineRating,
  };
}

function bookRatingRows(rows) {
  const rowMap = new Map(rows.map((row) => [row.bookId, row]));
  return Array.from({ length: 66 }, (_, index) => {
    const book = getBook(index + 1);
    return applyUserAggregate(emptyBookRating(book), rowMap.get(book.id));
  });
}

function chapterRatingRows(book, rows) {
  const rowMap = new Map(rows.map((row) => [row.chapter, row]));
  return Array.from({ length: book.chapters }, (_, index) => {
    const chapter = index + 1;
    return applyUserAggregate(emptyChapterRating(book, chapter), rowMap.get(chapter));
  });
}

function verseRatingRows(book, chapter, rows) {
  const verseCount = getChapterVerseCount(book.id, chapter);
  const rowMap = new Map(rows.map((row) => [row.verse, row]));
  return Array.from({ length: verseCount }, (_, index) => {
    const verse = index + 1;
    return applyUserAggregate(emptyVerseRating(book, chapter, verse), rowMap.get(verse));
  });
}

async function getBookRatings() {
  const result = await query(
    `with chapter_ratings as (
       select book_id,
              max(book_name) as book_name,
              chapter,
              avg(score)::numeric as average_rating,
              max(updated_at) as last_rated_at
       from verse_ratings
       group by book_id, chapter
     )
     select 'book' as scope,
            book_id as "bookId",
            max(book_name) as "bookName",
            count(*)::int as "ratingCount",
            round(avg(average_rating), 2)::float as "averageRating",
            max(last_rated_at) as "lastRatedAt"
     from chapter_ratings
     group by book_id
     order by book_id asc`,
  );

  return bookRatingRows(result.rows);
}

async function getChapterRatings(bookId) {
  const book = getBook(bookId);
  if (!book) return null;

  const result = await query(
    `select 'chapter' as scope,
            book_id as "bookId",
            max(book_name) as "bookName",
            chapter,
            count(*)::int as "ratingCount",
            round(avg(score)::numeric, 2)::float as "averageRating",
            max(updated_at) as "lastRatedAt"
     from verse_ratings
     where book_id = $1
     group by book_id, chapter
     order by chapter asc`,
    [book.id],
  );

  return chapterRatingRows(book, result.rows);
}

async function getVerseRatings(bookId, chapter) {
  const book = getBook(bookId);
  if (!book || chapter > book.chapters) return null;

  const result = await query(
    `select 'verse' as scope,
            book_id as "bookId",
            max(book_name) as "bookName",
            chapter,
            verse,
            count(*)::int as "ratingCount",
            round(avg(score)::numeric, 2)::float as "averageRating",
            max(updated_at) as "lastRatedAt"
     from verse_ratings
     where book_id = $1 and chapter = $2
     group by book_id, chapter, verse
     order by verse asc`,
    [book.id, chapter],
  );

  return verseRatingRows(book, chapter, result.rows);
}

async function getBookRating(bookId) {
  const book = getBook(bookId);
  if (!book) return null;

  const result = await query(
    `with chapter_ratings as (
       select chapter,
              avg(score)::numeric as average_rating,
              max(updated_at) as last_rated_at
       from verse_ratings
       where book_id = $1
       group by chapter
     )
     select count(*)::int as "ratingCount",
            round(avg(average_rating), 2)::float as "averageRating",
            max(last_rated_at) as "lastRatedAt"
     from chapter_ratings`,
    [book.id],
  );

  return applyUserAggregate(emptyBookRating(book), result.rows[0]);
}

async function getChapterRating(bookId, chapter) {
  const book = getBook(bookId);
  if (!book || chapter > book.chapters) return null;

  const result = await query(
    `select count(*)::int as "ratingCount",
            round(avg(score)::numeric, 2)::float as "averageRating",
            max(updated_at) as "lastRatedAt"
     from verse_ratings
     where book_id = $1 and chapter = $2`,
    [book.id, chapter],
  );

  return applyUserAggregate(emptyChapterRating(book, chapter), result.rows[0]);
}

async function getVerseRating(bookId, chapter, verse) {
  const book = getBook(bookId);
  if (!book || chapter > book.chapters || verse > getChapterVerseCount(bookId, chapter)) return null;

  const result = await query(
    `select count(*)::int as "ratingCount",
            round(avg(score)::numeric, 2)::float as "averageRating",
            max(updated_at) as "lastRatedAt"
     from verse_ratings
     where book_id = $1 and chapter = $2 and verse = $3`,
    [book.id, chapter, verse],
  );

  return applyUserAggregate(emptyVerseRating(book, chapter, verse), result.rows[0]);
}

router.get('/aggregates', async (req, res, next) => {
  try {
    const filters = aggregateSchema.parse(req.query);
    const scopes = filters.scope ? [filters.scope] : ['book'];
    const aggregates = [];

    for (const scope of scopes) {
      if (scope === 'book') {
        if (filters.bookId) {
          const rating = await getBookRating(filters.bookId);
          if (!rating) return res.status(404).json({ error: 'Book not found' });
          aggregates.push(rating);
        } else {
          aggregates.push(...await getBookRatings());
        }
      }

      if (scope === 'chapter' && filters.bookId) {
        if (filters.chapter) {
          const rating = await getChapterRating(filters.bookId, filters.chapter);
          if (!rating) return res.status(404).json({ error: 'Chapter not found' });
          aggregates.push(rating);
        } else {
          const ratings = await getChapterRatings(filters.bookId);
          if (!ratings) return res.status(404).json({ error: 'Book not found' });
          aggregates.push(...ratings);
        }
      }

      if (scope === 'verse' && filters.bookId && filters.chapter) {
        const ratings = await getVerseRatings(filters.bookId, filters.chapter);
        if (!ratings) return res.status(404).json({ error: 'Chapter not found' });
        aggregates.push(...ratings);
      }
    }

    return res.json({ aggregates });
  } catch (error) {
    return next(error);
  }
});

router.get('/struggles', async (req, res, next) => {
  try {
    const filters = strugglesSchema.parse(req.query);
    const selected = normalizeStruggleList(filters.struggle ?? filters.struggles);
    const invalid = selected.filter((struggle) => !struggleNames.includes(struggle));

    if (invalid.length > 0) {
      return res.status(400).json({ error: `Unknown struggle: ${invalid.join(', ')}` });
    }

    if (selected.length === 0) {
      return res.json({ struggles: struggleGroups, selected: [], verses: [] });
    }

    const result = await query(
      `select 'verse' as scope,
              vs.book_id as "bookId",
              max(vs.book_name) as "bookName",
              vs.chapter,
              vs.verse,
              array_agg(distinct vs.struggle order by vs.struggle) as struggles,
              array_agg(distinct vs.category order by vs.category) as categories,
              count(vr.score)::int as "ratingCount",
              round(avg(vr.score)::numeric, 2)::float as "averageRating",
              max(vr.updated_at) as "lastRatedAt"
       from verse_struggles vs
       left join verse_ratings vr
         on vr.book_id = vs.book_id
        and vr.chapter = vs.chapter
        and vr.verse = vs.verse
       where vs.struggle = any($1::text[])
       group by vs.book_id, vs.chapter, vs.verse
       order by avg(vr.score) desc nulls last,
                count(vr.score) desc,
                vs.book_id asc,
                vs.chapter asc,
                vs.verse asc
       limit 100`,
      [selected],
    );

    const verses = result.rows.map((row) => {
      const baselineRating = getBaselineVerseRating(row.bookId, row.chapter, row.verse);
      return {
        ...row,
        averageRating: row.ratingCount ? row.averageRating : baselineRating,
        baselineRating,
      };
    });

    return res.json({ struggles: struggleGroups, selected, verses });
  } catch (error) {
    return next(error);
  }
});

router.get('/book/:bookId', async (req, res, next) => {
  try {
    const bookId = z.coerce.number().int().min(1).max(66).parse(req.params.bookId);
    const rating = await getBookRating(bookId);
    if (!rating) return res.status(404).json({ error: 'Book not found' });
    return res.json({ rating });
  } catch (error) {
    return next(error);
  }
});

router.get('/chapter/:bookId/:chapterNum', async (req, res, next) => {
  try {
    const bookId = z.coerce.number().int().min(1).max(66).parse(req.params.bookId);
    const chapter = z.coerce.number().int().min(1).parse(req.params.chapterNum);
    const rating = await getChapterRating(bookId, chapter);
    if (!rating) return res.status(404).json({ error: 'Chapter not found' });
    return res.json({ rating });
  } catch (error) {
    return next(error);
  }
});

router.get('/verse/:bookId/:chapterNum/:verseNum', async (req, res, next) => {
  try {
    const bookId = z.coerce.number().int().min(1).max(66).parse(req.params.bookId);
    const chapter = z.coerce.number().int().min(1).parse(req.params.chapterNum);
    const verse = z.coerce.number().int().min(1).parse(req.params.verseNum);
    const rating = await getVerseRating(bookId, chapter, verse);
    if (!rating) return res.status(404).json({ error: 'Verse not found' });
    return res.json({ rating });
  } catch (error) {
    return next(error);
  }
});

router.get('/recommendations', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `with my_ratings as (
         select book_id, chapter, verse
         from verse_ratings
         where user_id = $1
       ),
       focus_struggles as (
         select vs.struggle, count(*) as count
         from verse_ratings vr
         join verse_struggles vs
           on vs.book_id = vr.book_id
          and vs.chapter = vr.chapter
          and vs.verse = vr.verse
         where vr.user_id = $1
         group by vs.struggle
         order by count(*) desc
         limit 3
       ),
       candidates as (
         select 'focus' as reason,
                vs.book_id,
                max(vs.book_name) as book_name,
                vs.chapter,
                vs.verse,
                array_agg(distinct vs.struggle order by vs.struggle) as tags,
                count(vr.score)::int as rating_count,
                round(avg(vr.score)::numeric, 2)::float as average_rating,
                max(vr.updated_at) as last_rated_at
         from verse_struggles vs
         join focus_struggles fs on fs.struggle = vs.struggle
         left join verse_ratings vr
           on vr.book_id = vs.book_id
          and vr.chapter = vs.chapter
          and vr.verse = vs.verse
         where not exists (
           select 1 from my_ratings mr
           where mr.book_id = vs.book_id
             and mr.chapter = vs.chapter
             and mr.verse = vs.verse
         )
         group by vs.book_id, vs.chapter, vs.verse
         union all
         select 'community' as reason,
                vr.book_id,
                max(vr.book_name) as book_name,
                vr.chapter,
                vr.verse,
                array[]::text[] as tags,
                count(vr.score)::int as rating_count,
                round(avg(vr.score)::numeric, 2)::float as average_rating,
                max(vr.updated_at) as last_rated_at
         from verse_ratings vr
         where not exists (
           select 1 from my_ratings mr
           where mr.book_id = vr.book_id
             and mr.chapter = vr.chapter
             and mr.verse = vr.verse
         )
         group by vr.book_id, vr.chapter, vr.verse
       )
       select book_id as "bookId",
              book_name as "bookName",
              chapter,
              verse,
              max(reason) as reason,
              max(rating_count)::int as "ratingCount",
              max(average_rating)::float as "averageRating",
              max(last_rated_at) as "lastRatedAt",
              coalesce(array_agg(distinct tag) filter (where tag is not null), array[]::text[]) as tags
       from candidates
       left join lateral unnest(tags) tag on true
       group by book_id, book_name, chapter, verse
       order by max(case when reason = 'focus' then 1 else 0 end) desc,
                max(average_rating) desc nulls last,
                max(rating_count) desc,
                max(last_rated_at) desc nulls last
       limit 12`,
      [req.user.sub],
    );

    return res.json({ recommendations: result.rows });
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const input = ratingSchema.parse(req.body);
    const error = validateReference(input);

    if (error) {
      return res.status(400).json({ error });
    }

    const book = getBook(input.bookId);
    const result = await query(
      `with updated as (
         update verse_ratings
         set score = $6,
             favorite = $7,
             note = case when $9::boolean then $8 else note end,
             updated_at = now()
         where user_id = $1
           and book_id = $2
           and chapter = $4
           and verse = $5
         returning id, 'verse' as scope, book_id as "bookId", book_name as "bookName", chapter, verse, score, favorite, note, updated_at as "updatedAt"
       ), inserted as (
         insert into verse_ratings (user_id, book_id, book_name, chapter, verse, score, favorite, note)
         select $1, $2, $3, $4, $5, $6, $7, $8
         where not exists (select 1 from updated)
         returning id, 'verse' as scope, book_id as "bookId", book_name as "bookName", chapter, verse, score, favorite, note, updated_at as "updatedAt"
       )
       select * from updated
       union all
       select * from inserted`,
      [
        req.user.sub,
        input.bookId,
        book.name,
        input.chapter,
        input.verse,
        input.score,
        input.favorite || false,
        input.note ?? null,
        Object.hasOwn(input, 'note'),
      ],
    );

    return res.status(201).json({ rating: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.patch('/verse/:bookId/:chapterNum/:verseNum/note', requireAuth, async (req, res, next) => {
  try {
    const input = {
      bookId: z.coerce.number().int().min(1).max(66).parse(req.params.bookId),
      chapter: z.coerce.number().int().min(1).parse(req.params.chapterNum),
      verse: z.coerce.number().int().min(1).parse(req.params.verseNum),
      ...noteSchema.parse(req.body),
    };
    const error = validateReference(input);

    if (error) {
      return res.status(400).json({ error });
    }

    const result = await query(
      `update verse_ratings
       set note = $5, updated_at = now()
       where user_id = $1
         and book_id = $2
         and chapter = $3
         and verse = $4
       returning id, 'verse' as scope, book_id as "bookId", book_name as "bookName", chapter, verse, score, favorite, note, updated_at as "updatedAt"`,
      [req.user.sub, input.bookId, input.chapter, input.verse, input.note || null],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Rate this verse before adding a note' });
    }

    return res.json({ rating: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.delete('/verse/:bookId/:chapterNum/:verseNum', requireAuth, async (req, res, next) => {
  try {
    const input = {
      bookId: z.coerce.number().int().min(1).max(66).parse(req.params.bookId),
      chapter: z.coerce.number().int().min(1).parse(req.params.chapterNum),
      verse: z.coerce.number().int().min(1).parse(req.params.verseNum),
    };
    const error = validateReference(input);

    if (error) {
      return res.status(400).json({ error });
    }

    const result = await query(
      `delete from verse_ratings
       where user_id = $1
         and book_id = $2
         and chapter = $3
         and verse = $4`,
      [req.user.sub, input.bookId, input.chapter, input.verse],
    );

    return res.json({ deleted: result.rowCount > 0 });
  } catch (error) {
    return next(error);
  }
});

router.get('/leaderboard', async (req, res, next) => {
  try {
    const result = await query(
       `with ranked_verses as (
          select 'verse' as scope,
                 book_id,
                 book_name,
                 chapter,
                 verse,
                 count(*)::int as rating_count,
                 round(avg(score)::numeric, 2)::float as average_rating
          from verse_ratings
          group by book_id, book_name, chapter, verse
          having count(*) > 0
          order by avg(score) desc, count(*) desc
          limit 50
        )
        select rv.scope,
               rv.book_id as "bookId",
               rv.book_name as "bookName",
               rv.chapter,
               rv.verse,
               rv.rating_count as "ratingCount",
               rv.average_rating as "averageRating",
               top_user.id as "topUserId",
               top_user.username as "topUserUsername",
               top_user.display_name as "topUserDisplayName",
               top_user.profile_picture as "topUserProfilePicture"
        from ranked_verses rv
        left join lateral (
          select u.id, u.username, u.display_name, u.profile_picture
          from verse_ratings vr
          join users u on u.id = vr.user_id
          where vr.book_id = rv.book_id
            and vr.chapter = rv.chapter
            and vr.verse = rv.verse
          order by vr.score desc, vr.updated_at desc
          limit 1
        ) top_user on true
        order by rv.average_rating desc, rv.rating_count desc`,
    );
    res.json({ leaderboard: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/trending', async (req, res, next) => {
  try {
    const result = await query(
       `select scope, book_id as "bookId", book_name as "bookName", chapter, verse,
              count(*)::int as "ratingCount",
              round(avg(score)::numeric, 2)::float as "averageRating"
       from (
         select 'verse' as scope, book_id, book_name, chapter, verse, score, updated_at
         from verse_ratings
       ) rated_verses
       where updated_at >= now() - interval '7 days'
       group by scope, book_id, book_name, chapter, verse
       order by count(*) desc, avg(score) desc
       limit 20`,
    );
    res.json({ trending: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
       `select id, 'verse' as scope, book_id as "bookId", book_name as "bookName", chapter, verse,
              score, favorite, note, updated_at as "updatedAt"
       from verse_ratings
       where user_id = $1
       order by updated_at desc`,
      [req.user.sub],
    );
    res.json({ ratings: result.rows });
  } catch (error) {
    next(error);
  }
});

export default router;
