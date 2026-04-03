import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStreakSummary,
  canRestoreStreak,
  currentStreak,
  nextStreakMilestone,
  shiftDateKey,
  startOfUtcWeek,
} from './streaks.js';

describe('streak helpers', () => {
  it('counts consecutive active days through today', () => {
    assert.equal(currentStreak(['2026-07-24', '2026-07-25', '2026-07-26'], '2026-07-26'), 3);
  });

  it('stops counting when today is inactive', () => {
    assert.equal(currentStreak(['2026-07-24', '2026-07-25'], '2026-07-26'), 0);
  });

  it('merges rating and restored days', () => {
    const summary = buildStreakSummary({
      ratingDays: ['2026-07-24', '2026-07-26'],
      restoredDays: ['2026-07-25'],
      today: '2026-07-26',
    });

    assert.equal(summary.streak, 3);
    assert.deepEqual(summary.activeDays, ['2026-07-26', '2026-07-25', '2026-07-24']);
  });

  it('marks restore available after one missed day with prior activity', () => {
    const summary = canRestoreStreak({
      ratingDays: ['2026-07-24', '2026-07-26'],
      restoredDays: [],
      restoreUsedThisWeek: false,
      today: '2026-07-26',
    });

    assert.equal(summary.canRestore, true);
    assert.equal(summary.restoreDay, '2026-07-25');
    assert.equal(summary.restoresRemaining, 1);
  });

  it('blocks restore after weekly restore is spent', () => {
    const summary = canRestoreStreak({
      ratingDays: ['2026-07-24', '2026-07-26'],
      restoredDays: [],
      restoreUsedThisWeek: true,
      today: '2026-07-26',
    });

    assert.equal(summary.canRestore, false);
    assert.equal(summary.restoresRemaining, 0);
  });

  it('reports upcoming streak milestones', () => {
    assert.deepEqual(nextStreakMilestone(5), {
      target: 7,
      remaining: 2,
      progress: 71,
    });
  });

  it('shifts UTC date keys across month boundaries', () => {
    assert.equal(shiftDateKey('2026-08-01', -1), '2026-07-31');
  });

  it('uses Monday as the UTC weekly restore boundary', () => {
    assert.equal(startOfUtcWeek('2026-07-26'), '2026-07-20');
    assert.equal(startOfUtcWeek('2026-07-27'), '2026-07-27');
  });
});
