export function aggregateKey(item) {
  return [item.scope, item.bookId, item.chapter, item.verse || 'chapter'].join(':');
}

export function toAggregateMap(aggregates) {
  return new Map(aggregates.map((item) => [aggregateKey(item), item]));
}
