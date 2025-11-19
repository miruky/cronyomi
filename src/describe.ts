import type { CronField, CronSpec } from './cron';

// CronSpecを日本語の平易な説明に変換する。
// よく使う形(毎分・N分おき・毎時・特定時刻・曜日指定・月指定)を読みやすく扱い、
// 複雑な組み合わせはリスト列挙にフォールバックする。

const DOW_LABEL = ['日', '月', '火', '水', '木', '金', '土'];
const MONTH_LABEL = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
];

export function describe(spec: CronSpec): string {
  const time = describeTime(spec.minute, spec.hour);
  const day = describeDay(spec);
  return day ? `${day}${time}` : time;
}

// raw が */n 形式ならステップ値を返す
function stepOf(field: CronField): number | null {
  const m = /^\*\/(\d+)$/.exec(field.raw);
  return m ? Number(m[1]) : null;
}

function describeTime(minute: CronField, hour: CronField): string {
  const minStep = stepOf(minute);
  const hourStep = stepOf(hour);

  if (minute.isStar && hour.isStar) {
    return '毎分';
  }
  if (minStep !== null && hour.isStar) {
    return `${minStep}分おき`;
  }
  if (minute.values.length === 1 && hour.isStar) {
    return `毎時${minute.values[0]}分に`;
  }
  if (hourStep !== null && minute.values.length === 1) {
    return `${hourStep}時間おきの${minute.values[0]}分に`;
  }
  if (minStep !== null && hour.values.length >= 1) {
    return `${listHours(hour)}の${minStep}分おき`;
  }
  if (minute.isStar && hour.values.length >= 1) {
    return `${listHours(hour)}の毎分`;
  }

  // 時刻の直積を列挙する。多すぎる場合は要約する
  const times: string[] = [];
  for (const h of hour.values) {
    for (const m of minute.values) {
      times.push(`${h}:${String(m).padStart(2, '0')}`);
      if (times.length > 12) break;
    }
    if (times.length > 12) break;
  }
  if (times.length > 12) {
    return `${listHours(hour)}の${listMinutes(minute)}に`;
  }
  return `${times.join('、')} に`;
}

function listHours(hour: CronField): string {
  if (hour.isStar) return '毎時';
  return `${hour.values.map((h) => `${h}時`).join('、')}`;
}

function listMinutes(minute: CronField): string {
  if (minute.isStar) return '毎分';
  return `${minute.values.map((m) => `${m}分`).join('、')}`;
}

function describeDay(spec: CronSpec): string {
  const parts: string[] = [];

  if (!spec.month.isStar) {
    parts.push(spec.month.values.map((m) => MONTH_LABEL[m - 1]).join('・'));
  }

  const domRestricted = !spec.dom.isStar;
  const dowRestricted = !spec.dow.isStar;

  if (domRestricted && dowRestricted) {
    // cron仕様ではORになる
    parts.push(`${describeDom(spec.dom)}または${describeDow(spec.dow)}に`);
  } else if (domRestricted) {
    parts.push(`${describeDom(spec.dom)}に`);
  } else if (dowRestricted) {
    parts.push(`${describeDow(spec.dow)}に`);
  } else if (parts.length > 0) {
    parts.push('毎日');
  }

  return parts.join('');
}

function describeDom(dom: CronField): string {
  const step = stepOf(dom);
  if (step !== null) return `${step}日おき`;
  return dom.values.map((d) => `${d}日`).join('・');
}

function describeDow(dow: CronField): string {
  if (isWeekdayPreset(dow.values)) return '平日';
  if (dow.values.length === 2 && dow.values.includes(0) && dow.values.includes(6)) {
    return '土日';
  }
  return `${dow.values.map((d) => `${DOW_LABEL[d]}曜`).join('・')}`;
}

function isWeekdayPreset(values: number[]): boolean {
  return (
    values.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => values.includes(d))
  );
}
