import './style.css';
import { CronParseError, parseCron, type CronSpec } from './cron';
import { describe } from './describe';
import { nextRuns } from './next';
import { formatDateTime, formatRelative } from './format';
import { PRESETS } from './presets';
import { applyTheme, loadTheme, nextTheme, THEME_LABEL, type ThemeMode } from './theme';
import { readSharedExpression, sharedExpressionQuery } from './share';

const FIELD_LABELS: Array<[keyof Omit<CronSpec, 'raw'>, string, string]> = [
  ['minute', '分', '0-59'],
  ['hour', '時', '0-23'],
  ['dom', '日', '1-31'],
  ['month', '月', '1-12'],
  ['dow', '曜日', '0-7'],
];

const CLOCK_MARK = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/>
  <path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const COPY_ICON = `
<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
  <rect x="9" y="9" width="11" height="11" rx="2"/>
  <path d="M5 15V5a2 2 0 0 1 2-2h8" stroke-linecap="round"/>
</svg>`;

const THEME_ICON: Record<ThemeMode, string> = {
  light: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
    <circle cx="12" cy="12" r="4.2"/>
    <path d="M12 3v2.4M12 18.6V21M4.5 4.5l1.7 1.7M17.8 17.8l1.7 1.7M3 12h2.4M18.6 12H21M4.5 19.5l1.7-1.7M17.8 6.2l1.7-1.7"/>
  </svg>`,
  dark: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 14.2A7.5 7.5 0 0 1 9.8 4 7.5 7.5 0 1 0 20 14.2z"/>
  </svg>`,
  auto: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7">
    <circle cx="12" cy="12" r="8.4"/>
    <path d="M12 3.6a8.4 8.4 0 0 1 0 16.8z" fill="currentColor" stroke="none"/>
  </svg>`,
};

const app = document.getElementById('app');
if (!app) throw new Error('#app が見つからない');

app.innerHTML = `
  <a class="skip-link" href="#main">本文へ移動</a>
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="./" aria-label="cronyomi ホーム">
        <span class="brand-mark">${CLOCK_MARK}</span>
        <span class="brand-name">cronyomi</span>
      </a>
      <button id="theme" class="theme-toggle" type="button"></button>
    </div>
  </header>

  <main id="main" class="shell">
    <p class="kicker">cron expression reader</p>
    <p class="lede">cron式を入力すると、その意味を日本語で読み解き、フィールドの内訳と次に実行される時刻を表示します。</p>

    <div class="field">
      <div class="field-head">
        <label class="field-label" for="expr">cron 式</label>
        <button id="copy" class="copy-btn" type="button" aria-label="cron式をコピー">
          ${COPY_ICON}<span id="copy-label">コピー</span>
        </button>
      </div>
      <input id="expr" type="text" spellcheck="false" autocomplete="off"
        value="30 8 * * 1-5" placeholder="* * * * *" />
      <div class="presets" id="presets" aria-label="よく使う設定"></div>
      <p id="error" class="error" role="alert" hidden></p>
      <span id="copy-status" class="sr-only" role="status" aria-live="polite"></span>
    </div>

    <section id="reading" class="reading" aria-live="polite">
      <p class="reading-kicker">この式の意味</p>
      <p id="description" class="description"></p>
    </section>

    <div class="panels">
      <section class="panel" aria-labelledby="fields-title">
        <h2 id="fields-title" class="panel-title">フィールド</h2>
        <table class="fields"><tbody id="fields"></tbody></table>
      </section>
      <section class="panel" aria-labelledby="runs-title">
        <h2 id="runs-title" class="panel-title">次に実行される時刻</h2>
        <ol class="runs" id="runs"></ol>
      </section>
    </div>
  </main>

  <footer class="site-footer">
    <span>ブラウザ内で完結。外部APIにもサーバーにも送信しません。</span>
    <a href="https://github.com/miruky/cronyomi" rel="noreferrer">ソースコード</a>
  </footer>
`;

const exprInput = app.querySelector<HTMLInputElement>('#expr')!;
const errorEl = app.querySelector<HTMLParagraphElement>('#error')!;
const readingEl = app.querySelector<HTMLElement>('#reading')!;
const descEl = app.querySelector<HTMLParagraphElement>('#description')!;
const fieldsBody = app.querySelector<HTMLTableSectionElement>('#fields')!;
const runsEl = app.querySelector<HTMLOListElement>('#runs')!;
const presetsEl = app.querySelector<HTMLDivElement>('#presets')!;
const themeBtn = app.querySelector<HTMLButtonElement>('#theme')!;
const copyBtn = app.querySelector<HTMLButtonElement>('#copy')!;
const copyLabel = app.querySelector<HTMLSpanElement>('#copy-label')!;
const copyStatus = app.querySelector<HTMLSpanElement>('#copy-status')!;

// 入力の余分な空白をならし、プリセット一致判定や共有に使う正規形を得る
function normalize(expression: string): string {
  return expression.trim().replace(/\s+/g, ' ');
}

// ── テーマ切替(自動 → ライト → ダークの循環)──
let theme = loadTheme();
function renderTheme(): void {
  applyTheme(theme);
  const label = THEME_LABEL[theme];
  themeBtn.innerHTML = `${THEME_ICON[theme]}<span>${label}</span>`;
  themeBtn.setAttribute('aria-label', `配色: ${label}(クリックで切り替え)`);
}
themeBtn.addEventListener('click', () => {
  theme = nextTheme(theme);
  renderTheme();
});
renderTheme();

// ── プリセット ──
const presetChips: Array<{ el: HTMLButtonElement; expression: string }> = [];
for (const preset of PRESETS) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';
  chip.textContent = preset.label;
  chip.title = preset.expression;
  chip.addEventListener('click', () => {
    exprInput.value = preset.expression;
    render();
    exprInput.focus();
  });
  presetsEl.appendChild(chip);
  presetChips.push({ el: chip, expression: preset.expression });
}

// ── コピー(クリップボードへ式を写す)──
let copyResetTimer: number | undefined;
copyBtn.addEventListener('click', async () => {
  let message = 'コピーしました';
  try {
    await navigator.clipboard.writeText(exprInput.value);
  } catch {
    message = 'コピーできません';
  }
  copyLabel.textContent = message;
  copyStatus.textContent = message;
  copyBtn.classList.add('done');
  window.clearTimeout(copyResetTimer);
  copyResetTimer = window.setTimeout(() => {
    copyLabel.textContent = 'コピー';
    copyStatus.textContent = '';
    copyBtn.classList.remove('done');
  }, 1600);
});

// ── 共有リンクから式を復元 ──
const shared = readSharedExpression(location.search);
if (shared) exprInput.value = shared;

function summarizeField(spec: CronSpec, key: keyof Omit<CronSpec, 'raw'>): string {
  const field = spec[key];
  if (field.isStar && field.raw === '*') return 'すべて';
  if (field.values.length <= 8) return field.values.join(', ');
  return `${field.values.slice(0, 8).join(', ')} ほか${field.values.length - 8}件`;
}

// 結果が実際に変わったときだけアニメーションを再生する。
// 構築前に必ずクラスを外し(挿入時の自動再生を防ぐ)、変化時のみreflowを挟んで付け直す。
let lastReading = '';
let lastRunsSig = '';
function setUpdated(el: HTMLElement, changed: boolean): void {
  el.classList.remove('is-updated');
  if (changed) {
    void el.offsetWidth;
    el.classList.add('is-updated');
  }
}

// 現在の式に一致するプリセットを目立たせる
function updateActivePresets(normalized: string): void {
  for (const { el, expression } of presetChips) {
    const active = expression === normalized;
    el.classList.toggle('active', active);
    el.setAttribute('aria-pressed', String(active));
  }
}

function render(): void {
  const expression = exprInput.value;
  const normalized = normalize(expression);
  history.replaceState(null, '', normalized ? sharedExpressionQuery(normalized) : location.pathname);
  updateActivePresets(normalized);
  let spec: CronSpec;
  try {
    spec = parseCron(expression);
  } catch (error) {
    const message = error instanceof CronParseError ? error.message : '解釈できない式です';
    errorEl.textContent = message;
    errorEl.hidden = false;
    readingEl.classList.add('muted');
    descEl.textContent = '解釈できない式です';
    document.title = 'cronyomi | cron式を日本語で読む';
    descEl.classList.remove('is-updated');
    runsEl.classList.remove('is-updated');
    fieldsBody.innerHTML = '';
    runsEl.innerHTML = '';
    // 直すと再びアニメーションするよう、表示中の内容を空として記録する
    lastReading = '';
    lastRunsSig = '';
    return;
  }

  errorEl.hidden = true;
  readingEl.classList.remove('muted');
  const reading = describe(spec);
  descEl.textContent = reading;
  document.title = `${reading} | cronyomi`;
  setUpdated(descEl, reading !== lastReading);
  lastReading = reading;

  fieldsBody.innerHTML = '';
  for (const [key, label, range] of FIELD_LABELS) {
    const tr = document.createElement('tr');
    const name = document.createElement('th');
    name.innerHTML = `${label}<span class="range">${range}</span>`;
    const raw = document.createElement('td');
    raw.className = 'mono';
    raw.textContent = spec[key].raw;
    const detail = document.createElement('td');
    detail.className = 'detail';
    detail.textContent = summarizeField(spec, key);
    tr.append(name, raw, detail);
    fieldsBody.appendChild(tr);
  }

  const now = new Date();
  const runs = nextRuns(spec, now, 5);
  // 構築前にクラスを外し、li挿入時に毎回アニメーションしてしまうのを防ぐ
  runsEl.classList.remove('is-updated');
  runsEl.innerHTML = '';
  if (runs.length === 0) {
    const li = document.createElement('li');
    li.className = 'run-empty';
    li.textContent = '直近5年以内に該当する時刻はありません';
    runsEl.appendChild(li);
  } else {
    for (const run of runs) {
      const li = document.createElement('li');
      const abs = document.createElement('span');
      abs.className = 'run-abs';
      abs.textContent = formatDateTime(run);
      const rel = document.createElement('span');
      rel.className = 'run-rel';
      rel.textContent = formatRelative(run, now);
      li.append(abs, rel);
      runsEl.appendChild(li);
    }
  }

  const runsSig = runs.length ? runs.map((r) => r.getTime()).join(',') : 'none';
  setUpdated(runsEl, runsSig !== lastRunsSig);
  lastRunsSig = runsSig;
}

exprInput.addEventListener('input', render);
render();
