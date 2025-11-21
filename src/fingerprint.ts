import type { CronSpec } from './cron';

// スケジュールの「指紋」: 曜日・時(と、指定があるときだけ月)の活動セルを返す。
// どの曜日・時間帯に動くのかを一目で掴むための、塗り分け用データ。
// 分は粒度が細かすぎて帯にならないため読み(describe)に委ね、ここでは扱わない。

export interface Cell {
  label: string;
  active: boolean;
}

export interface Track {
  key: 'dow' | 'hour' | 'month' | 'dom';
  label: string;
  cells: Cell[];
}

const DOW_LABEL = ['日', '月', '火', '水', '木', '金', '土'];

function range(n: number, from = 0): number[] {
  return Array.from({ length: n }, (_, i) => i + from);
}

export function fingerprint(spec: CronSpec): Track[] {
  const tracks: Track[] = [];

  // 月は指定があるときだけ。12セルは横に長いので帯にすると情報が増える。
  if (!spec.month.isStar) {
    const months = new Set(spec.month.values);
    tracks.push({
      key: 'month',
      label: '月',
      cells: range(12, 1).map((m) => ({ label: String(m), active: months.has(m) })),
    });
  }

  // 日(月内)は指定があるときだけ。* のとき毎日=全セルではノイズなので出さない。
  if (!spec.dom.isStar) {
    const days = new Set(spec.dom.values);
    tracks.push({
      key: 'dom',
      label: '日',
      cells: range(31, 1).map((d) => ({ label: String(d), active: days.has(d) })),
    });
  }

  // 曜日。dow が * なら曜日の制限はない=どの曜日も対象。
  const dows = new Set(spec.dow.values);
  tracks.push({
    key: 'dow',
    label: '曜日',
    cells: range(7).map((d) => ({ label: DOW_LABEL[d]!, active: spec.dow.isStar || dows.has(d) })),
  });

  // 時。hour が * なら毎時=全セル active。
  const hours = new Set(spec.hour.values);
  tracks.push({
    key: 'hour',
    label: '時',
    cells: range(24).map((h) => ({ label: String(h), active: spec.hour.isStar || hours.has(h) })),
  });

  return tracks;
}
