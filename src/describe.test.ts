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
    expect(read('30 * * * *')).toBe('毎時30分に');
  });

  it('特定時刻', () => {
    expect(read('0 9 * * *')).toBe('9:00 に');
    expect(read('30 8 * * *')).toBe('8:30 に');
  });
});

group('describe 曜日・日・月', () => {
  it('平日', () => {
    expect(read('30 8 * * 1-5')).toBe('平日に8:30 に');
  });

  it('土日', () => {
    expect(read('0 10 * * 0,6')).toBe('土日に10:00 に');
  });

  it('特定曜日', () => {
    expect(read('0 0 * * 1')).toBe('月曜に0:00 に');
  });

  it('毎月の特定日', () => {
    expect(read('0 9 1 * *')).toBe('1日に9:00 に');
  });

  it('特定の月日', () => {
    expect(read('0 0 1 1 *')).toBe('1月1日に0:00 に');
  });

  it('日と曜日の両方はORで表す', () => {
    expect(read('0 0 13 * 0')).toBe('13日または日曜に0:00 に');
  });
});
