export function aggregateKey(item) {
  return [item.scope, item.bookId, item.chapter, item.verse || 'chapter'].join(':');
}

export function toAggregateMap(aggregates) {
  return new Map(aggregates.map((item) => [aggregateKey(item), item]));
}

export function averageBookRating(book, aggregates) {
  const chapters = aggregates.filter((item) => item.scope === 'chapter' && item.bookId === book.id);
  if (!chapters.length) return null;
  const weighted = chapters.reduce((sum, item) => sum + item.averageRating * item.ratingCount, 0);
  const total = chapters.reduce((sum, item) => sum + item.ratingCount, 0);
  return total ? weighted / total : null;
}
