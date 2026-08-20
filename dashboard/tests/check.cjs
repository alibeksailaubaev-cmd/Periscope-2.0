/**
 * Проверка дэшборда на локальном стенде (нужен Playwright).
 *
 *   npm i playwright plotly.js-dist-min@2.27.0 xlsx@0.18.5 jszip@3.10.1 html2canvas@1.4.1
 *   pip install openpyxl
 *   python3 dashboard/tests/make_fixtures.py
 *   python3 dashboard/tests/build_stand.py
 *   python3 -m http.server 8099 --directory dashboard/tests/stand &
 *   node dashboard/tests/check.cjs
 *
 * Загружает тестовые Excel в панель «Цех инкубации» и проверяет, что данные
 * реально отрисовались: график виден (opacity 1, есть svg), посчитаны KPI,
 * заполнены таблица и карточки NOK, в консоли нет ошибок.
 */
const { chromium } = require('playwright');

const BASE = process.env.STAND_URL || 'http://127.0.0.1:8099';
const PAGE = process.argv[2] || 'incubation-themed';
const FIXTURES = __dirname + '/stand';

(async () => {
  // PW_CHROMIUM — путь к готовому бинарю Chromium, если браузеры Playwright не скачаны
  const launchOptions = { args: ['--no-proxy-server'] };
  if (process.env.PW_CHROMIUM) launchOptions.executablePath = process.env.PW_CHROMIUM;
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });

  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => {
    const t = m.text();
    // 404 на favicon и прочие сетевые мелочи стенда игнорируем — ловим ошибки скриптов
    if (m.type() === 'error' && !/Failed to load resource/.test(t)) errors.push('CONSOLE ' + t.slice(0, 200));
  });

  await page.goto(`${BASE}/${PAGE}.html`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.setInputFiles('#file-act', `${FIXTURES}/act.xlsx`);
  await page.waitForTimeout(2500);
  await page.setInputFiles('#file-mb', `${FIXTURES}/mb.xlsx`);
  await page.waitForTimeout(4000);

  const state = await page.evaluate(() => {
    const op = sel => getComputedStyle(document.querySelector(sel)).opacity;
    const text = sel => document.querySelector(sel).textContent.trim();
    return {
      actChartOpacity: op('#actChart'),
      actChartSvg: document.querySelectorAll('#actChart svg').length,
      kpiChartOpacity: op('#kpiChart'),
      kpiChartSvg: document.querySelectorAll('#kpiChart svg').length,
      statCount: text('#statMbCount'),
      statNok: text('#statMbNok'),
      byDateRows: document.querySelectorAll('#mbByDateBody tr').length,
      nokCards: document.querySelectorAll('#mbNokWrap .nok-card').length
    };
  });

  const problems = [];
  if (state.actChartOpacity !== '1' || !state.actChartSvg) problems.push('график «Динамика мойки» не виден');
  if (state.kpiChartOpacity !== '1' || !state.kpiChartSvg) problems.push('график КПИ не виден');
  if (state.statCount === '–' || !state.byDateRows) problems.push('KPI/таблица не заполнены');
  if (!state.nokCards) problems.push('нет карточек NOK');
  if (errors.length) problems.push('ошибки в консоли: ' + errors.slice(0, 3).join(' | '));

  console.log(PAGE, JSON.stringify(state, null, 1));
  console.log(problems.length ? 'ПРОВАЛЕНО:\n - ' + problems.join('\n - ') : 'OK — данные отображаются');

  await browser.close();
  process.exit(problems.length ? 1 : 0);
})();
