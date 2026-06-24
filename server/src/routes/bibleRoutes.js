import { Router } from 'express';
import { books, getBook } from '../data/bible.js';

const router = Router();

router.get('/books', (req, res) => {
  res.json({
    books: books.map(({ id, name, abbr, chapters }) => ({ id, name, abbr, chapters })),
  });
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
