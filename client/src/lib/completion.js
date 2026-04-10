function percent(rated, total) {
  return total > 0 ? Math.round((rated / total) * 100) : 0;
}

export function verseKey(bookId, chapter, verse) {
  return `${bookId}:${chapter}:${verse}`;
}

export function toRatedVerseSet(ratings = []) {
  return new Set(ratings.map((rating) => verseKey(rating.bookId, rating.chapter, rating.verse)));
}

export function bookVerseTotal(book) {
  if (!book) return 0;
  if (Array.isArray(book.chapters)) {
    return book.chapters.reduce((sum, chapter) => sum + (chapter.verseCount || 0), 0);
  }
  return 0;
}

export function bookCompletion(book, ratings = []) {
  const rated = ratings.filter((rating) => rating.bookId === book.id).length;
  const total = bookVerseTotal(book);

  return {
    rated,
    total,
    percent: percent(rated, total),
    complete: total > 0 && rated >= total,
  };
}

export function chapterCompletion(bookId, chapter, ratings = []) {
  const rated = ratings.filter((rating) => rating.bookId === bookId && rating.chapter === chapter.chapter).length;
  const total = chapter.verseCount || 0;

  return {
    rated,
    total,
    percent: percent(rated, total),
    complete: total > 0 && rated >= total,
  };
}

export function verseCompletion(bookId, chapter, verse, ratedSet) {
  const complete = ratedSet.has(verseKey(bookId, chapter, verse));

  return {
    rated: complete ? 1 : 0,
    total: 1,
    percent: complete ? 100 : 0,
    complete,
  };
}
