const streakMilestones = [3, 7, 14, 30, 60, 100];

export function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function shiftDateKey(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateKey(date);
}

export function startOfUtcWeek(dateKey) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  return utcDateKey(date);
}

export function currentStreak(activeDays, today = utcDateKey()) {
  const activeSet = new Set(activeDays);
  let cursor = today;
  let streak = 0;

  while (activeSet.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  return streak;
}

export function nextStreakMilestone(streak) {
  const target = streakMilestones.find((milestone) => milestone > streak);

  if (!target) return null;

  return {
    target,
    remaining: target - streak,
    progress: Math.min(100, Math.round((streak / target) * 100)),
  };
}

export function buildStreakSummary({ ratingDays = [], restoredDays = [], today = utcDateKey() }) {
  const activeDays = Array.from(new Set([...ratingDays, ...restoredDays])).sort().reverse();
  const streak = currentStreak(activeDays, today);
  const yesterday = shiftDateKey(today, -1);
  const activeSet = new Set(activeDays);

  return {
    streak,
    activeDays,
    activeToday: activeSet.has(today),
    missedYesterday: !activeSet.has(yesterday),
    nextStreakMilestone: nextStreakMilestone(streak),
    today,
    yesterday,
    weekKey: startOfUtcWeek(today),
  };
}

export function canRestoreStreak({ ratingDays = [], restoredDays = [], restoreUsedThisWeek = false, today = utcDateKey() }) {
  const summary = buildStreakSummary({ ratingDays, restoredDays, today });
  const activeSet = new Set(summary.activeDays);
  const dayBeforeMiss = shiftDateKey(summary.yesterday, -1);

  return {
    ...summary,
    restoreUsedThisWeek,
    restoresRemaining: restoreUsedThisWeek ? 0 : 1,
    canRestore: !restoreUsedThisWeek
      && !activeSet.has(summary.yesterday)
      && activeSet.has(dayBeforeMiss)
      && (summary.activeToday || summary.streak === 0),
    restoreDay: summary.yesterday,
  };
}
