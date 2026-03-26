import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { books, getBook, getChapterVerseCount } from './bible.js';

describe('Bible metadata', () => {
  it('contains all canonical books', () => {
    assert.equal(books.length, 66);
    assert.equal(books[0].name, 'Genesis');
    assert.equal(books[65].name, 'Revelation');
  });

  it('returns verse counts for known chapters', () => {
    assert.equal(getBook(43).name, 'John');
    assert.equal(getChapterVerseCount(43, 11), 57);
    assert.equal(getChapterVerseCount(19, 119), 176);
  });
});
