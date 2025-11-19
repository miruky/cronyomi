import { describe as group, expect, it } from 'vitest';
import { parseCron } from './cron';
import { describe } from './describe';

function read(expr: string): string {
  return describe(parseCron(expr));
}

group('describe 時刻', () => {
  it('毎分', () => {
    expect(read('* * * * *')).toBe('毎分');
  });

  it('N分おき', () => {
    expect(read('*/5 * * * *')).toBe('5分おき');
  });

  it('毎時の特定分', () => {
    expect(read('30 * * * *')).toBe('毎時30分');
  });

  it('N時間おき', () => {
    expect(read('0 */6 * * *')).toBe('6時間おきの0分');
  });

  it('特定時刻は毎日として読む', () => {
    expect(read('0 9 * * *')).toBe('毎日 9:00');
    expect(read('30 8 * * *')).toBe('毎日 8:30');
  });

  it('複数の時刻を列挙する', () => {
    expect(read('0 9,18 * * *')).toBe('毎日 9:00、18:00');
  });
});

group('describe 曜日・日・月', () => {
  it('平日', () => {
    expect(read('30 8 * * 1-5')).toBe('平日 8:30');
  });

  it('土日', () => {
    expect(read('0 10 * * 0,6')).toBe('土日 10:00');
  });

  it('特定曜日', () => {
    expect(read('0 0 * * 1')).toBe('月曜 0:00');
  });

  it('毎月の特定日は毎月を冠する', () => {
    expect(read('0 9 1 * *')).toBe('毎月1日 9:00');
  });

  it('特定の月日は月を冠する', () => {
    expect(read('0 0 1 1 *')).toBe('1月1日 0:00');
  });

  it('月だけの指定はその月の毎日と読む', () => {
    expect(read('0 0 * 12 *')).toBe('12月の毎日 0:00');
  });

  it('日と曜日の両方はORで表す', () => {
    expect(read('0 0 13 * 0')).toBe('毎月13日または日曜 0:00');
  });
});
