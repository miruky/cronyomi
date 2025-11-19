import type { CronField, CronSpec } from './cron';

// CronSpecを日本語の平易な説明に変換する。
// よく使う形(毎分・N分おき・毎時・特定時刻・曜日指定・月指定)を読みやすく扱い、
// 複雑な組み合わせはリスト列挙にフォールバックする。
// 出力は「日付部分 + 半角空白 + 時刻部分」を基本とし、不自然な助詞の重なりを避ける。

const DOW_LABEL = ['日', '月', '火', '水', '木', '金', '土'];
const MONTH_LABEL = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
];

// 時刻表現。clock=true は H:MM の具体的な時刻、false は「毎分」などの頻度表現。
interface TimePhrase {
  text: string;
  clock: boolean;
}

export function describe(spec: CronSpec): string {
  const time = describeTime(spec.minute, spec.hour);
  const day = describeDay(spec);
  if (!day) {
    // 日付の制限が無いとき、具体時刻なら毎日であることを補う
    return time.clock ? `毎日 ${time.text}` : time.text;
  }
  return `${day} ${time.text}`;
}

// raw が */n 形式ならステップ値を返す
function stepOf(field: CronField): number | null {
  const m = /^\*\/(\d+)$/.exec(field.raw);
  return m ? Number(m[1]) : null;
}

function describeTime(minute: CronField, hour: CronField): TimePhrase {
  const minStep = stepOf(minute);
  const hourStep = stepOf(hour);

  if (minute.isStar && hour.isStar) {
    return { text: '毎分', clock: false };
  }
  if (minStep !== null && hour.isStar) {
    return { text: `${minStep}分おき`, clock: false };
  }
  if (minute.values.length === 1 && hour.isStar) {
    return { text: `毎時${minute.values[0]}分`, clock: false };
  }
  if (hourStep !== null && minute.values.length === 1) {
    return { text: `${hourStep}時間おきの${minute.values[0]}分`, clock: false };
  }
  if (minStep !== null && hour.values.length >= 1) {
    return { text: `${listHours(hour)}の${minStep}分おき`, clock: false };
  }
  if (minute.isStar && hour.values.length >= 1) {
    return { text: `${listHours(hour)}の毎分`, clock: false };
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
    return { text: `${listHours(hour)}の${listMinutes(minute)}`, clock: false };
  }
  return { text: times.join('、'), clock: true };
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
  const monthRestricted = !spec.month.isStar;
  const domRestricted = !spec.dom.isStar;
  const dowRestricted = !spec.dow.isStar;

  const monthPart = monthRestricted
    ? spec.month.values.map((m) => MONTH_LABEL[m - 1]).join('・')
    : '';

  let dayPart = '';
  if (domRestricted && dowRestricted) {
    // cron仕様では日と曜日はORになる
    dayPart = `${describeDom(spec.dom, monthRestricted)}または${describeDow(spec.dow)}`;
  } else if (domRestricted) {
    dayPart = describeDom(spec.dom, monthRestricted);
  } else if (dowRestricted) {
    dayPart = describeDow(spec.dow);
  }

  if (monthPart && dayPart) return `${monthPart}${dayPart}`;
  if (monthPart) return `${monthPart}の毎日`;
  return dayPart;
}

// 月が指定されていない日付は「毎月」を冠して周期であることを明示する
function describeDom(dom: CronField, monthRestricted: boolean): string {
  const step = stepOf(dom);
  if (step !== null) return `${step}日おき`;
  const days = dom.values.map((d) => `${d}日`).join('・');
  return monthRestricted ? days : `毎月${days}`;
}

function describeDow(dow: CronField): string {
  if (isWeekdayPreset(dow.values)) return '平日';
  if (dow.values.length === 2 && dow.values.includes(0) && dow.values.includes(6)) {
    return '土日';
  }
  return `${dow.values.map((d) => `${DOW_LABEL[d]}曜`).join('・')}`;
}

function isWeekdayPreset(values: number[]): boolean {
  return values.length === 5 && [1, 2, 3, 4, 5].every((d) => values.includes(d));
}
