import { describe, expect, it } from 'vitest';
import { formatDateTime, formatRelative } from './format';

describe('formatDateTime', () => {
  it('曜日つきでゼロ埋めした時刻を返す', () => {
    // 2026-06-12 は金曜
    expect(formatDateTime(new Date(2026, 5, 12, 8, 5, 0))).toBe('2026/6/12(金) 08:05');
  });

  it('深夜0時を00:00と表す', () => {
    expect(formatDateTime(new Date(2027, 0, 1, 0, 0, 0))).toBe('2027/1/1(金) 00:00');
  });
});

describe('formatRelative', () => {
  const base = new Date(2026, 5, 12, 10, 0, 0);
  const after = (ms: number): string => formatRelative(new Date(base.getTime() + ms), base);

  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it('30秒未満はまもなく', () => {
    expect(after(20_000)).toBe('まもなく');
  });

  it('分・時間・日・月・年の単位で丸める', () => {
    expect(after(5 * MIN)).toBe('約5分後');
    expect(after(3 * HOUR)).toBe('約3時間後');
    expect(after(5 * DAY)).toBe('約5日後');
    expect(after(60 * DAY)).toBe('約2か月後');
    expect(after(400 * DAY)).toBe('約1年後');
  });
});
