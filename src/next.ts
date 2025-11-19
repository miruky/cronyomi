import type { CronSpec } from './cron';

// 次回実行日時の計算。日単位で候補日を進め、一致した日の中で時・分を走査する。
// 日と曜日が両方制限されている場合はどちらかが一致すれば良い(vixie cron互換)。

const SEARCH_DAYS = 366 * 5;

export function nextRuns(spec: CronSpec, from: Date, count: number): Date[] {
  const results: Date[] = [];
  const start = new Date(from.getTime());
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + 1);

  const monthSet = new Set(spec.month.values);
  const domSet = new Set(spec.dom.values);
  const dowSet = new Set(spec.dow.values);
  const domRestricted = !spec.dom.isStar;
  const dowRestricted = !spec.dow.isStar;

  const dayMatches = (day: Date): boolean => {
    if (!monthSet.has(day.getMonth() + 1)) return false;
    const domOk = domSet.has(day.getDate());
    const dowOk = dowSet.has(day.getDay());
    if (domRestricted && dowRestricted) return domOk || dowOk;
    if (domRestricted) return domOk;
    if (dowRestricted) return dowOk;
    return true;
  };

  const day = new Date(start.getTime());
  day.setHours(0, 0, 0, 0);

  for (let i = 0; i < SEARCH_DAYS && results.length < count; i += 1) {
    if (dayMatches(day)) {
      for (const hour of spec.hour.values) {
        if (results.length >= count) break;
        for (const minute of spec.minute.values) {
          const candidate = new Date(day.getTime());
          candidate.setHours(hour, minute, 0, 0);
          if (candidate.getTime() >= start.getTime()) {
            results.push(candidate);
            if (results.length >= count) break;
          }
        }
      }
    }
    day.setDate(day.getDate() + 1);
  }
  return results;
}
