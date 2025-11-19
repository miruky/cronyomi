export interface Preset {
  expression: string;
  label: string;
}

// よく使うスケジュールの雛形。クリックで式に流し込む。
export const PRESETS: Preset[] = [
  { expression: '* * * * *', label: '毎分' },
  { expression: '*/5 * * * *', label: '5分おき' },
  { expression: '*/30 * * * *', label: '30分おき' },
  { expression: '0 * * * *', label: '毎時0分' },
  { expression: '0 9 * * *', label: '毎日9時' },
  { expression: '30 8 * * 1-5', label: '平日8:30' },
  { expression: '0 0 * * 0', label: '日曜0時' },
  { expression: '0 9 1 * *', label: '毎月1日9時' },
  { expression: '0 0 1 1 *', label: '元日0時' },
];
