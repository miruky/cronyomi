// 現在のcron式をURLのクエリに保存し、リンクで共有・復元できるようにする。
const PARAM = 'e';

// location.search から共有された式を取り出す。無ければnull。
export function readSharedExpression(search: string): string | null {
  const value = new URLSearchParams(search).get(PARAM);
  return value && value.trim() ? value : null;
}

// 式を ?e=... のクエリ文字列に変換する。replaceState にそのまま渡せる。
export function sharedExpressionQuery(expression: string): string {
  const params = new URLSearchParams();
  params.set(PARAM, expression);
  return `?${params.toString()}`;
}
