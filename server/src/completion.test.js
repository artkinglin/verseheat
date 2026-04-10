import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCompletionSummary, compactCompletionSummary } from './completion.js';

describe('completion summaries', () => {
  it('builds whole-Bible and book completion from unique ratings', () => {
    const summary = buildCompletionSummary([
      { book_id: 43, chapter: 1, verse: 1 },
      { book_id: 43, chapter: 1, verse: 2 },
      { book_id: 43, chapter: 1, verse: 2 },
      { book_id: 45, chapter: 8, verse: 28 },
    ]);

    const john = summary.books.find((book) => book.bookId === 43);
    const johnOne = john.chapters.find((chapter) => chapter.chapter === 1);

    assert.equal(summary.ratedVerses, 3);
    assert.equal(summary.totalBooks, 66);
    assert.equal(john.ratedVerses, 2);
    assert.equal(john.totalVerses, 879);
    assert.equal(johnOne.ratedVerses, 2);
    assert.equal(johnOne.totalVerses, 51);
  });

  it('removes chapter detail from compact summaries', () => {
    const compact = compactCompletionSummary(buildCompletionSummary([]));

    assert.equal(Object.hasOwn(compact.books[0], 'chapters'), false);
  });
});
