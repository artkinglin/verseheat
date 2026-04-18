import { Router } from 'express';
import { z } from 'zod';
import { books, getBook, getBookVerseCount, getChapterVerseCount } from '../data/bible.js';

const router = Router();
const resolveSchema = z.object({
  q: z.string().trim().min(1).max(120),
});

function resolveReference(value) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  const orderedBooks = [...books].sort((a, b) => b.name.length - a.name.length);

  for (const book of orderedBooks) {
    const aliases = [book.name, book.abbr].filter(Boolean);
    for (const alias of aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = normalized.match(new RegExp(`^${escaped}\\s+(\\d+)(?::(\\d+))?`, 'i'));
      if (!match) continue;

      const chapter = Number(match[1]);
      const verse = match[2] ? Number(match[2]) : 1;
      if (chapter < 1 || chapter > book.chapters) return null;
      if (verse < 1 || verse > getChapterVerseCount(book.id, chapter)) return null;
      return { bookId: book.id, bookName: book.name, chapter, verse };
    }
  }

  return null;
}

router.get('/books', (req, res) => {
  res.json({
    books: books.map(({ id, name, abbr, chapters }) => ({ id, name, abbr, chapters, verseCount: getBookVerseCount(id) })),
  });
});

router.get('/resolve', (req, res, next) => {
  try {
    const { q } = resolveSchema.parse(req.query);
    const reference = resolveReference(q);

    if (!reference) {
      return res.status(404).json({ error: 'Reference not found' });
    }

    return res.json({ reference });
  } catch (error) {
    return next(error);
  }
});

router.get('/books/:bookId', (req, res) => {
  const book = getBook(req.params.bookId);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  return res.json({
    book: {
      id: book.id,
      name: book.name,
      abbr: book.abbr,
      chapters: book.verses.map((verseCount, index) => ({
        chapter: index + 1,
        verseCount,
      })),
    },
  });
});

export default router;
