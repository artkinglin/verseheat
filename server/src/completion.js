import { books, getBibleVerseCount, getBookVerseCount, getChapterVerseCount } from './data/bible.js';

function percent(rated, total) {
  return total > 0 ? Math.round((rated / total) * 100) : 0;
}

function referenceKey(row) {
  return `${row.book_id}:${row.chapter}:${row.verse}`;
}

export function buildCompletionSummary(ratingRows = []) {
  const uniqueRatings = Array.from(new Map(ratingRows.map((row) => [referenceKey(row), row])).values());
  const ratedByBook = new Map();
  const ratedByChapter = new Map();

  for (const row of uniqueRatings) {
    const bookId = Number(row.book_id);
    const chapter = Number(row.chapter);
    const chapterKey = `${bookId}:${chapter}`;

    ratedByBook.set(bookId, (ratedByBook.get(bookId) || 0) + 1);
    ratedByChapter.set(chapterKey, (ratedByChapter.get(chapterKey) || 0) + 1);
  }

  const bookCompletion = books.map((book) => {
    const ratedVerses = ratedByBook.get(book.id) || 0;
    const totalVerses = getBookVerseCount(book.id);
    const chapters = book.verses.map((totalChapterVerses, index) => {
      const chapter = index + 1;
      const chapterRatedVerses = ratedByChapter.get(`${book.id}:${chapter}`) || 0;

      return {
        bookId: book.id,
        bookName: book.name,
        chapter,
        ratedVerses: chapterRatedVerses,
        totalVerses: totalChapterVerses,
        completionPercent: percent(chapterRatedVerses, totalChapterVerses),
        complete: chapterRatedVerses >= totalChapterVerses,
      };
    });

    return {
      bookId: book.id,
      bookName: book.name,
      ratedVerses,
      totalVerses,
      completionPercent: percent(ratedVerses, totalVerses),
      chaptersCompleted: chapters.filter((chapter) => chapter.complete).length,
      totalChapters: book.chapters,
      chapters,
      complete: ratedVerses >= totalVerses,
    };
  });

  const totalVerses = getBibleVerseCount();
  const ratedVerses = uniqueRatings.length;

  return {
    ratedVerses,
    totalVerses,
    completionPercent: percent(ratedVerses, totalVerses),
    booksCompleted: bookCompletion.filter((book) => book.complete).length,
    totalBooks: books.length,
    chaptersCompleted: bookCompletion.reduce((sum, book) => sum + book.chaptersCompleted, 0),
    totalChapters: books.reduce((sum, book) => sum + book.chapters, 0),
    books: bookCompletion,
  };
}

export function compactCompletionSummary(summary) {
  return {
    ...summary,
    books: summary.books.map(({ chapters, ...book }) => book),
  };
}
