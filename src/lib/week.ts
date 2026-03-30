export function getCurrentWeekStartUtc(now: Date): Date {
  const weekStart = new Date(now);
  const dayOfWeek = weekStart.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  weekStart.setUTCDate(weekStart.getUTCDate() - daysFromMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  return weekStart;
}

export function getCurrentWeekEndUtc(weekStart: Date): Date {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  return weekEnd;
}
