export const struggleGroups = [
  {
    category: '7 Deadly Sins',
    struggles: ['Lust', 'Pride', 'Greed', 'Wrath', 'Gluttony', 'Envy', 'Sloth'],
  },
  {
    category: 'Spiritual',
    struggles: ['Seeking intimacy with God', 'Building faith', 'Finding peace', 'Dealing with doubt'],
  },
  {
    category: 'Life issues',
    struggles: ['Anxiety', 'Grief', 'Forgiveness', 'Anger', 'Loss'],
  },
];

export const struggleNames = struggleGroups.flatMap((group) => group.struggles);

export function normalizeStruggleList(value) {
  const rawValues = Array.isArray(value)
    ? value
    : String(value || '').split(',');

  return [...new Set(rawValues.map((item) => item.trim()).filter(Boolean))];
}
