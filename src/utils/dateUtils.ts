/**
 * Bangladesh Standard Time (Asia/Dhaka - UTC+6) Utility Functions
 * Ensures system date and time match Bangladesh timezone regardless of server environment.
 */

export function getBangladeshNow(): Date {
  const now = new Date();
  const bdTimeString = now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
  return new Date(bdTimeString);
}

export function getBangladeshDateStr(date?: Date): string {
  const target = date || getBangladeshNow();
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getBangladeshTomorrowStr(): string {
  const bdNow = getBangladeshNow();
  bdNow.setDate(bdNow.getDate() + 1);
  return getBangladeshDateStr(bdNow);
}

export function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getDayOfWeekFromDateStr(dateStr: string): number {
  return parseDateStr(dateStr).getDay();
}

export function fillMissingDeclarationsForDateRange<T extends { date: string; userId: string }>(
  existingDecs: T[],
  startDateStr: string,
  endDateStr: string,
  userId: string
): T[] {
  const decMap = new Map<string, T>();
  existingDecs.forEach((d) => {
    if (d.userId === userId) {
      decMap.set(d.date, d);
    }
  });

  const result: T[] = [];
  const start = parseDateStr(startDateStr);
  const end = parseDateStr(endDateStr);

  const cur = new Date(start);
  while (cur <= end) {
    const dateStr = getBangladeshDateStr(cur);
    if (decMap.has(dateStr)) {
      result.push(decMap.get(dateStr)!);
    } else {
      result.push({
        id: `auto-${dateStr}`,
        userId,
        date: dateStr,
        breakfast: true,
        lunch: true,
        dinner: true,
        isAutoCopied: true,
        updatedAt: new Date().toISOString(),
      } as unknown as T);
    }
    cur.setDate(cur.getDate() + 1);
  }

  return result;
}

