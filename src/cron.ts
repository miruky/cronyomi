// 5フィールドcron式(分 時 日 月 曜日)のパーサ。
// vixie cron互換: 名前(jan/mon等)、リスト、範囲、ステップ、曜日7=日曜に対応する。

export interface CronField {
  values: number[]; // 昇順・重複なし
  isStar: boolean; // 元のトークンが * か。日・曜日のOR判定で「制限なし」を表す(*/n は制限とみなす)
  raw: string;
}

export interface CronSpec {
  minute: CronField;
  hour: CronField;
  dom: CronField;
  month: CronField;
  dow: CronField;
  raw: string;
}

export class CronParseError extends Error {
  constructor(
    message: string,
    readonly fieldLabel: string | null = null,
  ) {
    super(fieldLabel ? `${fieldLabel}: ${message}` : message);
  }
}

interface FieldDef {
  key: keyof Omit<CronSpec, 'raw'>;
  label: string;
  min: number;
  max: number;
  names: Record<string, number>;
  normalize: (value: number) => number;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const DOW_NAMES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

const identity = (value: number): number => value;

const FIELD_DEFS: FieldDef[] = [
  { key: 'minute', label: '分', min: 0, max: 59, names: {}, normalize: identity },
  { key: 'hour', label: '時', min: 0, max: 23, names: {}, normalize: identity },
  { key: 'dom', label: '日', min: 1, max: 31, names: {}, normalize: identity },
  { key: 'month', label: '月', min: 1, max: 12, names: MONTH_NAMES, normalize: identity },
  // 7は日曜の別表記
  { key: 'dow', label: '曜日', min: 0, max: 7, names: DOW_NAMES, normalize: (v) => (v === 7 ? 0 : v) },
];

// vixie cron互換の別名マクロ。@reboot は時刻が定まらないため別扱いにする。
const NICKNAMES: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

export function parseCron(expression: string): CronSpec {
  const trimmed = expression.trim();
  if (!trimmed) {
    throw new CronParseError('式が空です');
  }

  let source = trimmed;
  if (source.startsWith('@')) {
    const key = source.toLowerCase();
    if (key === '@reboot') {
      throw new CronParseError('@reboot は起動時に動くため、実行時刻を計算できません');
    }
    const expanded = NICKNAMES[key];
    if (!expanded) {
      throw new CronParseError(`'${trimmed}' は対応していない別名です`);
    }
    source = expanded;
  }

  const tokens = source.split(/\s+/);
  if (tokens.length !== 5) {
    throw new CronParseError(
      `フィールドは5つ必要です(分 時 日 月 曜日)。今は${tokens.length}つあります`,
    );
  }
  const spec = { raw: source } as CronSpec;
  FIELD_DEFS.forEach((def, index) => {
    spec[def.key] = parseField(tokens[index]!, def);
  });
  return spec;
}

function parseField(raw: string, def: FieldDef): CronField {
  const values = new Set<number>();
  for (const part of raw.split(',')) {
    if (part === '') {
      throw new CronParseError('リストに空の要素があります', def.label);
    }
    addPart(part, def, values);
  }
  return {
    values: [...values].sort((a, b) => a - b),
    isStar: raw === '*',
    raw,
  };
}

function addPart(part: string, def: FieldDef, values: Set<number>): void {
  const segments = part.split('/');
  if (segments.length > 2) {
    throw new CronParseError(`'${part}' を解釈できません(/が多すぎます)`, def.label);
  }
  const body = segments[0]!;
  let step = 1;
  if (segments.length === 2) {
    const stepStr = segments[1]!;
    if (!/^\d+$/.test(stepStr)) {
      throw new CronParseError(`ステップ '${stepStr}' は正の整数で指定します`, def.label);
    }
    step = Number(stepStr);
    if (step === 0) {
      throw new CronParseError('ステップに0は使えません', def.label);
    }
  }

  let start: number;
  let end: number;
  if (body === '*') {
    start = def.min;
    end = def.max;
  } else if (body.includes('-')) {
    const [left, right, extra] = body.split('-');
    if (extra !== undefined || !left || !right) {
      throw new CronParseError(`範囲 '${body}' を解釈できません`, def.label);
    }
    start = resolveToken(left, def);
    end = resolveToken(right, def);
    if (start > end) {
      throw new CronParseError(`範囲 '${body}' は左が右以下である必要があります`, def.label);
    }
  } else {
    start = resolveToken(body, def);
    // '3/5' のような形は3から最大値までのステップ(vixie互換)
    end = segments.length === 2 ? def.max : start;
  }

  for (let value = start; value <= end; value += step) {
    values.add(def.normalize(value));
  }
}

function resolveToken(token: string, def: FieldDef): number {
  const named = def.names[token.toLowerCase()];
  if (named !== undefined) {
    return named;
  }
  if (!/^\d+$/.test(token)) {
    throw new CronParseError(`'${token}' を解釈できません`, def.label);
  }
  const value = Number(token);
  if (value < def.min || value > def.max) {
    throw new CronParseError(`'${token}' は${def.min}〜${def.max}の範囲で指定します`, def.label);
  }
  return value;
}
