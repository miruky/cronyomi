import './style.css';
import { CronParseError, parseCron, type CronSpec } from './cron';
import { describe } from './describe';
import { nextRuns } from './next';
import { formatDateTime, formatRelative } from './format';
import { PRESETS } from './presets';

const FIELD_LABELS: Array<[keyof Omit<CronSpec, 'raw'>, string, string]> = [
  ['minute', '分', '0-59'],
  ['hour', '時', '0-23'],
  ['dom', '日', '1-31'],
  ['month', '月', '1-12'],
  ['dow', '曜日', '0-7'],
];

const CLOCK_ICON = `
<svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
  <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/>
  <path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;

const app = document.getElementById('app');
if (!app) throw new Error('#app が見つからない');

app.innerHTML = `
  <main class="wrap">
    <header class="head">
      <h1>cronyomi</h1>
      <p class="sub">cron式を日本語で読み解き、次に動く時刻を確かめる</p>
    </header>

    <section class="editor">
      <label class="field-input">
        <span class="field-input-label">cron式</span>
        <input id="expr" type="text" spellcheck="false" autocomplete="off"
          value="30 8 * * 1-5" aria-label="cron式" />
      </label>
      <div class="presets" id="presets" aria-label="よく使う設定"></div>
    </section>

    <p id="error" class="error" role="alert" hidden></p>

    <section id="reading" class="reading">
      <span class="reading-icon">${CLOCK_ICON}</span>
      <p id="description" class="description"></p>
    </section>

    <section class="grid">
      <div class="card">
        <h2>フィールド</h2>
        <table class="fields" id="fields"><tbody></tbody></table>
      </div>
      <div class="card">
        <h2>次に実行される時刻</h2>
        <ol class="runs" id="runs"></ol>
      </div>
    </section>
  </main>
`;

const exprInput = app.querySelector<HTMLInputElement>('#expr')!;
const errorEl = app.querySelector<HTMLParagraphElement>('#error')!;
const readingEl = app.querySelector<HTMLElement>('#reading')!;
const descEl = app.querySelector<HTMLParagraphElement>('#description')!;
const fieldsBody = app.querySelector<HTMLTableSectionElement>('#fields tbody')!;
const runsEl = app.querySelector<HTMLOListElement>('#runs')!;
const presetsEl = app.querySelector<HTMLDivElement>('#presets')!;

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
}

function summarizeField(spec: CronSpec, key: keyof Omit<CronSpec, 'raw'>): string {
  const field = spec[key];
  if (field.isStar && field.raw === '*') return 'すべて';
  if (field.values.length <= 8) return field.values.join(', ');
  return `${field.values.slice(0, 8).join(', ')} ほか${field.values.length - 8}件`;
}

function render(): void {
  const expression = exprInput.value;
  let spec: CronSpec;
  try {
    spec = parseCron(expression);
  } catch (error) {
    const message = error instanceof CronParseError ? error.message : '解釈できない式です';
    errorEl.textContent = message;
    errorEl.hidden = false;
    readingEl.classList.add('muted');
    descEl.textContent = '—';
    fieldsBody.innerHTML = '';
    runsEl.innerHTML = '';
    return;
  }

  errorEl.hidden = true;
  readingEl.classList.remove('muted');
  descEl.textContent = describe(spec);

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
  runsEl.innerHTML = '';
  if (runs.length === 0) {
    const li = document.createElement('li');
    li.className = 'run-empty';
    li.textContent = '直近5年以内に該当する時刻はありません';
    runsEl.appendChild(li);
    return;
  }
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

exprInput.addEventListener('input', render);
render();
