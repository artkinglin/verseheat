import { Router } from 'express';
import { query } from '../db.js';
import { esvFetch } from '../esv.js';

const router = Router();
const msPerDay = 24 * 60 * 60 * 1000;

function utcDayNumber(now = new Date()) {
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / msPerDay);
}

function nextUtcMidnight(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
}

function compactPassageText(data) {
  return (data.passages?.[0] || '')
    .replace(/\s+/g, ' ')
    .trim();
}

router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `select 'verse' as scope,
              book_id as "bookId",
              book_name as "bookName",
              chapter,
              verse,
              count(*)::int as "ratingCount",
              round(avg(score)::numeric, 2)::float as "averageRating"
       from verse_ratings
       group by book_id, book_name, chapter, verse
       having count(*) > 0
       order by avg(score) desc,
                count(*) desc,
                max(updated_at) desc,
                book_id asc,
                chapter asc,
                verse asc
       limit 100`,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No rated verses are available yet' });
    }

    const now = new Date();
    const dayNumber = utcDayNumber(now);
    const selected = result.rows[dayNumber % result.rows.length];
    const reference = `${selected.bookName} ${selected.chapter}:${selected.verse}`;
    const passageData = await esvFetch('/v3/passage/text/', {
      q: reference,
      'include-footnotes': 'false',
      'include-headings': 'false',
      'include-passage-references': 'false',
      'include-verse-numbers': 'false',
      'include-first-verse-numbers': 'false',
      'include-copyright': 'false',
      'line-length': '0',
    });

    return res.json({
      verse: {
        ...selected,
        reference,
        text: compactPassageText(passageData),
        copyright: passageData.copyright,
        date: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString().slice(0, 10),
        nextRotationAt: nextUtcMidnight(now),
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
