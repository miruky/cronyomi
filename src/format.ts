const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土'];

export function formatDateTime(date: Date): string {
  const y = date.getFullYear();
  const mo = date.getMonth() + 1;
  const d = date.getDate();
  const w = WEEKDAY[date.getDay()];
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${y}/${mo}/${d}(${w}) ${h}:${mi}`;
}

// fromを基準にした相対表現。「約3時間後」「明日」など大まかに伝える。
export function formatRelative(target: Date, from: Date): string {
  const diffMs = target.getTime() - from.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'まもなく';
  if (minutes < 60) return `約${minutes}分後`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `約${hours}時間後`;
  const days = Math.round(hours / 24);
  if (days < 30) return `約${days}日後`;
  const months = Math.round(days / 30);
  if (months < 12) return `約${months}か月後`;
  return `約${Math.round(months / 12)}年後`;
}
