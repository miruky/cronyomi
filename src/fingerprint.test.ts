import { describe, expect, it } from 'vitest';
import { parseCron } from './cron';
import { fingerprint } from './fingerprint';

type TrackKey = 'dow' | 'hour' | 'month' | 'dom';

function track(expr: string, key: TrackKey) {
  return fingerprint(parseCron(expr)).find((t) => t.key === key);
}

function activeLabels(expr: string, key: TrackKey): string[] {
  return (track(expr, key)?.cells ?? []).filter((c) => c.active).map((c) => c.label);
}

describe('fingerprint', () => {
  it('平日8:30は月〜金と8時が活動する', () => {
    expect(activeLabels('30 8 * * 1-5', 'dow')).toEqual(['月', '火', '水', '木', '金']);
    expect(activeLabels('30 8 * * 1-5', 'hour')).toEqual(['8']);
  });

  it('曜日が * のときは全曜日を活動扱いにする', () => {
    expect(activeLabels('0 9 * * *', 'dow')).toEqual(['日', '月', '火', '水', '木', '金', '土']);
  });

  it('時が * のときは24時間すべて活動する', () => {
    expect(track('* * * * *', 'hour')?.cells.every((c) => c.active)).toBe(true);
    expect(track('* * * * *', 'hour')?.cells).toHaveLength(24);
  });

  it('月の指定があるときだけ月トラックを出す', () => {
    expect(track('0 0 1 1 *', 'month')).toBeDefined();
    expect(activeLabels('0 0 1 1 *', 'month')).toEqual(['1']);
    expect(track('0 9 * * *', 'month')).toBeUndefined();
  });

  it('日の指定があるときだけ日トラックを出し、31セルで塗る', () => {
    expect(track('0 9 * * *', 'dom')).toBeUndefined();
    expect(track('0 9 1,15 * *', 'dom')?.cells).toHaveLength(31);
    expect(activeLabels('0 9 1,15 * *', 'dom')).toEqual(['1', '15']);
  });

  it('トラックは曜日と時を必ず含む', () => {
    const keys = fingerprint(parseCron('0 9 * * *')).map((t) => t.key);
    expect(keys).toEqual(['dow', 'hour']);
  });

  it('月・日の両方を指定すると月→日→曜日→時の順に並ぶ', () => {
    const keys = fingerprint(parseCron('0 9 1,15 6 *')).map((t) => t.key);
    expect(keys).toEqual(['month', 'dom', 'dow', 'hour']);
  });

  it('ステップ指定の時を正しく塗る', () => {
    expect(activeLabels('0 */6 * * *', 'hour')).toEqual(['0', '6', '12', '18']);
  });
});
