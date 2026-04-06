import { utcDateKey } from './streaks.js';

const dailyThemes = [
  'Anxiety',
  'Comfort',
  'Faith',
  'Forgiveness',
  'Guidance',
  'Hope',
  'Peace',
];

export const missionTemplates = [
  {
    id: 'rate-three',
    title: 'Rate 3 verses',
    description: 'Add three ratings anywhere in the heat map today.',
    target: 3,
    metric: 'ratingsToday',
    actionLabel: 'Open heat map',
  },
  {
    id: 'favorite-one',
    title: 'Mark a favorite',
    description: 'Favorite one verse that stands out today.',
    target: 1,
    metric: 'favoritesToday',
    actionLabel: 'Find a favorite',
  },
  {
    id: 'save-one',
    title: 'Save a verse',
    description: 'Add one verse to any collection today.',
    target: 1,
    metric: 'collectionSavesToday',
    actionLabel: 'Open collections',
  },
  {
    id: 'theme-focus',
    title: 'Theme focus',
    description: 'Rate two verses connected to today\'s theme.',
    target: 2,
    metric: 'themeRatingsToday',
    actionLabel: 'Open theme',
  },
];

function hashString(value) {
  let hash = 0;

  for (const char of value) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function pickDailyTheme(userId, dateKey = utcDateKey()) {
  return dailyThemes[hashString(`${dateKey}:${userId}:theme`) % dailyThemes.length];
}

export function pickMissionTemplate(userId, dateKey = utcDateKey()) {
  return missionTemplates[hashString(`${dateKey}:${userId}:mission`) % missionTemplates.length];
}

export function buildDailyMission({ dateKey = utcDateKey(), progress = {}, theme, userId }) {
  const template = pickMissionTemplate(userId, dateKey);
  const missionTheme = theme || pickDailyTheme(userId, dateKey);
  const current = Math.min(template.target, progress[template.metric] || 0);
  const description = template.id === 'theme-focus'
    ? `Rate two verses connected to ${missionTheme}.`
    : template.description;

  return {
    id: `${dateKey}:${template.id}`,
    type: template.id,
    date: dateKey,
    title: template.id === 'theme-focus' ? `${missionTheme} focus` : template.title,
    description,
    target: template.target,
    current,
    remaining: Math.max(0, template.target - current),
    complete: current >= template.target,
    progress: Math.min(100, Math.round((current / template.target) * 100)),
    actionLabel: template.actionLabel,
    theme: template.id === 'theme-focus' ? missionTheme : null,
  };
}
