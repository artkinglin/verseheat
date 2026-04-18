import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getBaselineBibleRatings,
  getBaselineBookRating,
  getBaselineChapterRating,
  getBaselineVerseRating,
} from './baselineRatings.js';
import { getBibleVerseCount } from './bible.js';

describe('baseline verse ratings', () => {
  it('provides one rating for every verse in the Bible', () => {
    const ratings = getBaselineBibleRatings();
    assert.equal(ratings.length, getBibleVerseCount());
    assert.equal(new Set(ratings.map((rating) => (
      `${rating.bookId}:${rating.chapter}:${rating.verse}`
    ))).size, getBibleVerseCount());
    assert.ok(ratings.every((rating) => Number.isInteger(rating.score)));
    assert.ok(ratings.every((rating) => rating.score >= 4 && rating.score <= 10));
  });

  it('keeps the rubric anchors buffered from 4 to 10', () => {
    assert.equal(getBaselineVerseRating(43, 3, 16), 10);
    assert.equal(getBaselineVerseRating(40, 22, 37), 10);
    assert.equal(getBaselineVerseRating(40, 22, 38), 10);
    assert.equal(getBaselineVerseRating(40, 22, 39), 10);
    assert.equal(getBaselineVerseRating(1, 1, 1), 10);
    assert.equal(getBaselineVerseRating(19, 23, 1), 10);
    assert.equal(getBaselineVerseRating(40, 7, 12), 10);
    assert.equal(getBaselineVerseRating(50, 4, 13), 9);
    assert.equal(getBaselineVerseRating(24, 29, 11), 9);
    assert.equal(getBaselineVerseRating(45, 8, 28), 9);
    assert.equal(getBaselineVerseRating(49, 4, 32), 9);
    assert.equal(getBaselineVerseRating(33, 6, 8), 9);
    assert.equal(getBaselineVerseRating(59, 1, 2), 8);
    assert.equal(getBaselineVerseRating(58, 11, 1), 8);
    assert.equal(getBaselineVerseRating(21, 3, 1), 7);
    assert.equal(getBaselineVerseRating(60, 5, 7), 7);
    assert.equal(getBaselineVerseRating(44, 2, 42), 6);
    assert.equal(getBaselineVerseRating(13, 1, 1), 5);
    assert.equal(getBaselineVerseRating(2, 38, 24), 5);
    assert.equal(getBaselineVerseRating(7, 19, 29), 4);
    assert.equal(getBaselineVerseRating(9, 15, 3), 4);
  });

  it('rolls verse baselines up to chapter and book averages', () => {
    assert.equal(typeof getBaselineChapterRating(43, 3), 'number');
    assert.equal(typeof getBaselineBookRating(43), 'number');
    assert.ok(getBaselineChapterRating(43, 3) > 1);
    assert.ok(getBaselineBookRating(43) > 1);
  });
});
