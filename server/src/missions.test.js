import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDailyMission,
  pickDailyTheme,
  pickMissionTemplate,
} from './missions.js';

describe('daily mission helpers', () => {
  it('selects a stable mission for a user and day', () => {
    const first = pickMissionTemplate('user-1', '2026-07-27');
    const second = pickMissionTemplate('user-1', '2026-07-27');

    assert.equal(first.id, second.id);
  });

  it('selects a stable theme for a user and day', () => {
    const first = pickDailyTheme('user-1', '2026-07-27');
    const second = pickDailyTheme('user-1', '2026-07-27');

    assert.equal(first, second);
  });

  it('caps mission progress at the target', () => {
    const mission = buildDailyMission({
      dateKey: '2026-07-27',
      progress: {
        ratingsToday: 99,
        favoritesToday: 99,
        collectionSavesToday: 99,
        themeRatingsToday: 99,
      },
      userId: 'user-1',
    });

    assert.equal(mission.current, mission.target);
    assert.equal(mission.complete, true);
    assert.equal(mission.progress, 100);
  });

  it('includes selected theme details for theme missions', () => {
    const mission = buildDailyMission({
      dateKey: '2026-07-27',
      progress: {},
      theme: 'Hope',
      userId: 'theme-user',
    });

    if (mission.type !== 'theme-focus') {
      assert.equal(mission.theme, null);
      return;
    }

    assert.equal(mission.theme, 'Hope');
    assert.match(mission.title, /Hope/);
    assert.match(mission.description, /Hope/);
  });
});
