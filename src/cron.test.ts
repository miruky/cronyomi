import { describe, expect, it } from 'vitest';
import { CronParseError, parseCron } from './cron';

describe('parseCron 基本', () => {
  it('5つの星はすべての値に展開される', () => {
    const spec = parseCron('* * * * *');
    expect(spec.minute.values).toHaveLength(60);
    expect(spec.hour.values).toHaveLength(24);
    expect(spec.dom.values[0]).toBe(1);
    expect(spec.minute.isStar).toBe(true);
  });

  it('単一の値', () => {
    const spec = parseCron('30 8 * * *');
    expect(spec.minute.values).toEqual([30]);
    expect(spec.hour.values).toEqual([8]);
  });

  it('リスト', () => {
    expect(parseCron('0,15,30,45 * * * *').minute.values).toEqual([0, 15, 30, 45]);
  });

  it('範囲', () => {
    expect(parseCron('* * * * 1-5').dow.values).toEqual([1, 2, 3, 4, 5]);
  });

  it('ステップ', () => {
    expect(parseCron('*/15 * * * *').minute.values).toEqual([0, 15, 30, 45]);
    expect(parseCron('0 */6 * * *').hour.values).toEqual([0, 6, 12, 18]);
  });

  it('範囲とステップの組み合わせ', () => {
    expect(parseCron('0-30/10 * * * *').minute.values).toEqual([0, 10, 20, 30]);
  });

  it('開始値/ステップは最大値まで展開する', () => {
    expect(parseCron('5/20 * * * *').minute.values).toEqual([5, 25, 45]);
  });
});

describe('parseCron 名前と別表記', () => {
  it('曜日7と0はどちらも日曜', () => {
    expect(parseCron('* * * * 7').dow.values).toEqual([0]);
    expect(parseCron('* * * * 0').dow.values).toEqual([0]);
  });

  it('曜日の英名', () => {
    expect(parseCron('* * * * mon-fri').dow.values).toEqual([1, 2, 3, 4, 5]);
  });

  it('月の英名', () => {
    expect(parseCron('* * * jan,dec *').month.values).toEqual([1, 12]);
  });

  it('星のリストは重複を取り除き昇順', () => {
    expect(parseCron('5,5,1,3 * * * *').minute.values).toEqual([1, 3, 5]);
  });
});

describe('parseCron 別名マクロ', () => {
  it('@daily は毎日0時に展開する', () => {
    const spec = parseCron('@daily');
    expect(spec.minute.values).toEqual([0]);
    expect(spec.hour.values).toEqual([0]);
    expect(spec.dom.isStar).toBe(true);
  });

  it('@hourly は毎時0分', () => {
    const spec = parseCron('@hourly');
    expect(spec.minute.values).toEqual([0]);
    expect(spec.hour.isStar).toBe(true);
  });

  it('@weekly は日曜0時', () => {
    expect(parseCron('@weekly').dow.values).toEqual([0]);
  });

  it('@yearly と @annually は同じ', () => {
    expect(parseCron('@yearly').raw).toBe(parseCron('@annually').raw);
  });

  it('大文字小文字を区別しない', () => {
    expect(parseCron('@DAILY').hour.values).toEqual([0]);
  });

  it('@reboot は実行時刻を持たないとして拒否する', () => {
    expect(() => parseCron('@reboot')).toThrow(CronParseError);
  });

  it('未知の別名は拒否する', () => {
    expect(() => parseCron('@frequently')).toThrow(CronParseError);
  });
});

describe('parseCron 異常系', () => {
  it('フィールド数が違うと拒否する', () => {
    expect(() => parseCron('* * * *')).toThrow(CronParseError);
    expect(() => parseCron('* * * * * *')).toThrow(CronParseError);
  });

  it('空文字は拒否する', () => {
    expect(() => parseCron('   ')).toThrow(CronParseError);
  });

  it('範囲外の値は拒否しフィールド名を伝える', () => {
    expect(() => parseCron('60 * * * *')).toThrow(/分/);
    expect(() => parseCron('* 24 * * *')).toThrow(/時/);
    expect(() => parseCron('* * * 13 *')).toThrow(/月/);
  });

  it('ステップ0は拒否する', () => {
    expect(() => parseCron('*/0 * * * *')).toThrow(CronParseError);
  });

  it('逆順の範囲は拒否する', () => {
    expect(() => parseCron('30-10 * * * *')).toThrow(CronParseError);
  });

  it('解釈できないトークンは拒否する', () => {
    expect(() => parseCron('abc * * * *')).toThrow(CronParseError);
  });
});
