import { chromium } from 'playwright';

const BASE = process.env.APP_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__spaceElevator?.ready === true, null, { timeout: 120000 });
await page.waitForTimeout(3800);
await page.evaluate(() => window.__spaceElevator.setBasePreset('overview', true));
await page.waitForTimeout(600);

const read = () =>
  page.evaluate(() => ({
    camera: window.__spaceElevator.camera,
    target: window.__spaceElevator.target,
    mode: window.__spaceElevator.mode,
    theme: window.__spaceElevator.theme,
    launch: window.__spaceElevator.launch,
  }));

// 1. drag rotate
const beforeDrag = await read();
await page.mouse.move(720, 430);
await page.mouse.down();
await page.mouse.move(960, 430, { steps: 24 });
await page.mouse.up();
await page.waitForTimeout(800);
const afterDrag = await read();
const azimuth = (s) => Math.atan2(s.camera[0] - s.target[0], s.camera[2] - s.target[2]);
let delta = Math.abs(azimuth(afterDrag) - azimuth(beforeDrag));
delta = Math.min(delta, Math.PI * 2 - delta);
check('drag rotates camera', delta > 0.08, `azimuth delta ${delta.toFixed(3)} rad`);

// 2. wheel zoom
const dist = (s) => Math.hypot(...s.camera.map((v, i) => v - s.target[i]));
const d0 = dist(await read());
await page.mouse.move(720, 430);
await page.mouse.wheel(0, -480);
await page.waitForTimeout(900);
const d1 = dist(await read());
check('wheel zooms in', d1 < d0 * 0.97, `${d0.toFixed(0)} -> ${d1.toFixed(0)}`);

// 3. preset button tween
await page.locator('.segment[data-group="base"] button[data-preset="base"]').click();
await page.waitForTimeout(300);
const activeBase = await page
  .locator('.segment[data-group="base"] button[data-preset="base"]')
  .evaluate((el) => el.classList.contains('active'));
check('preset button activates', activeBase);
await page.waitForFunction(
  () => Math.abs(window.__spaceElevator.target[1] - 500) < 30,
  null,
  { timeout: 20000 },
).catch(() => {});
const presetState = await read();
check('preset tween reaches base target', Math.abs(presetState.target[1] - 500) < 30, `target y ${presetState.target[1].toFixed(0)}`);

// 4. theme toggle
await page.locator('[data-action="theme"]').click();
await page.waitForTimeout(700);
let st = await read();
check('theme switches to night', st.theme === 'night', st.theme);
const themeLabel = await page.locator('#theme-label').textContent();
check('theme label updates', /深夜|夜间/.test(themeLabel || ''), themeLabel || '');
await page.locator('[data-action="theme"]').click();
await page.waitForTimeout(700);
st = await read();
check('theme switches back to dawn', st.theme === 'dawn', st.theme);

// 5. launch
await page.evaluate(() => window.__spaceElevator.setBasePreset('base', true));
await page.locator('#btn-launch').click();
await page.waitForTimeout(900);
st = await read();
check('launch enters climbing state', st.launch?.state === 'climbing', JSON.stringify(st.launch));
const alt0 = st.launch?.altitude ?? 0;
await page.waitForTimeout(5000);
st = await read();
check('car altitude increases', (st.launch?.altitude ?? 0) > alt0 + 1, `${alt0.toFixed(0)} -> ${(st.launch?.altitude ?? 0).toFixed(0)} m`);

// 6. orbit mode
await page.locator('#btn-orbit').click();
await page.waitForTimeout(1600);
st = await read();
check('switches to orbital mode', st.mode === 'orbit', st.mode);
const ui = await page.evaluate(() => ({
  rulerVisible: !document.getElementById('ruler').hidden,
  orbitGroupVisible: document.querySelector('.segment[data-group="orbit"]').offsetParent !== null,
  baseGroupHidden: document.querySelector('.segment[data-group="base"]').offsetParent === null,
  labelsOn: document.querySelectorAll('.map-label.on').length,
  orbitLabel: document.querySelector('#btn-orbit span')?.textContent,
}));
check('orbit UI reveals scale + labels', ui.rulerVisible && ui.orbitGroupVisible && ui.baseGroupHidden && ui.labelsOn >= 2, JSON.stringify(ui));
check('orbit toggle label changes', ui.orbitLabel === '返回地面', ui.orbitLabel || '');

// 7. orbit preset
await page.locator('.segment[data-group="orbit"] button[data-preset="station"]').click();
await page.waitForTimeout(300);
const stationActive = await page
  .locator('.segment[data-group="orbit"] button[data-preset="station"]')
  .evaluate((el) => el.classList.contains('active'));
check('orbit preset activates', stationActive);
await page.waitForFunction(
  () => window.__spaceElevator.target[0] > 6.3,
  null,
  { timeout: 20000 },
).catch(() => {});
st = await read();
check('station camera target reached', st.target[0] > 6.3, `target x ${st.target[0].toFixed(2)}`);

// 8. back to base
await page.locator('#btn-orbit').click();
await page.waitForTimeout(1600);
st = await read();
check('returns to base mode', st.mode === 'base', st.mode);
const rulerHidden = await page.evaluate(() => document.getElementById('ruler').hidden);
check('ruler hides in base mode', rulerHidden);

check('no console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
console.log('\nSUMMARY', JSON.stringify(results, null, 2));
await page.screenshot({ path: 'artifacts/30-interaction-final.png' });
await browser.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);
