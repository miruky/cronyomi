import { describe, expect, it } from 'vitest';
import { parseCron } from './cron';
import { nextRuns } from './next';

// 基準時刻は2026-06-12(金)10:30:00とする
const BASE = new Date(2026, 5, 12, 10, 30, 0);

describe('nextRuns', () => {
  it('毎分は次の分を返す', () => {
    const runs = nextRuns(parseCron('* * * * *'), BASE, 3);
    expect(runs[0]).toEqual(new Date(2026, 5, 12, 10, 31, 0));
    expect(runs[1]).toEqual(new Date(2026, 5, 12, 10, 32, 0));
    expect(runs).toHaveLength(3);
  });

  it('毎日9時は翌日の9時(基準は既に過ぎている)', () => {
    const runs = nextRuns(parseCron('0 9 * * *'), BASE, 2);
    expect(runs[0]).toEqual(new Date(2026, 5, 13, 9, 0, 0));
    expect(runs[1]).toEqual(new Date(2026, 5, 14, 9, 0, 0));
  });

  it('同日中のまだ来ていない時刻は当日に返す', () => {
    const runs = nextRuns(parseCron('0 18 * * *'), BASE, 1);
    expect(runs[0]).toEqual(new Date(2026, 5, 12, 18, 0, 0));
  });

  it('平日8:30は翌週月曜をまたいで進む', () => {
    // 6/12は金。次は月曜6/15
    const runs = nextRuns(parseCron('30 8 * * 1-5'), BASE, 1);
    expect(runs[0]).toEqual(new Date(2026, 5, 15, 8, 30, 0));
  });

  it('日と曜日が両方指定ならどちらか一致でよい(cron仕様)', () => {
    // 毎月13日 または 日曜の 0:00。基準6/12(金)の次は6/13(土・13日)0:00
    const runs = nextRuns(parseCron('0 0 13 * 0'), BASE, 2);
    expect(runs[0]).toEqual(new Date(2026, 5, 13, 0, 0, 0));
    // その次は6/14(日)0:00
    expect(runs[1]).toEqual(new Date(2026, 5, 14, 0, 0, 0));
  });

  it('該当しない月をまたぐ', () => {
    // 1月1日のみ。基準は6月なので翌年1/1
    const runs = nextRuns(parseCron('0 0 1 1 *'), BASE, 1);
    expect(runs[0]).toEqual(new Date(2027, 0, 1, 0, 0, 0));
  });

  it('要求した件数だけ返す', () => {
    expect(nextRuns(parseCron('*/30 * * * *'), BASE, 5)).toHaveLength(5);
  });
});
