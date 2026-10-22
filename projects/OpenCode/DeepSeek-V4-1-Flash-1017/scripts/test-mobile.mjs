import { chromium } from 'playwright';

const BASE = process.env.APP_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
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
await page.waitForTimeout(900);
await page.screenshot({ path: 'artifacts/40-mobile-overview.png' });

const layout = await page.evaluate(() => {
  const rect = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  };
  return {
    innerWidth,
    innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    controlbar: rect('.controlbar'),
    brand: rect('.brand'),
    topActions: rect('.top-actions'),
    canvas: rect('#webgl'),
    specsDisplay: getComputedStyle(document.querySelector('.specs')).display,
    rulerDisplay: getComputedStyle(document.querySelector('.ruler')).display,
  };
});
console.log('layout', JSON.stringify(layout));
check('no horizontal page overflow', layout.scrollWidth <= layout.innerWidth + 1, `${layout.scrollWidth}`);
check('control bar fits viewport', !!layout.controlbar && layout.controlbar.left >= 0 && layout.controlbar.right <= layout.innerWidth + 0.5, JSON.stringify(layout.controlbar));
check('brand + top actions fit', !!layout.brand && !!layout.topActions && layout.topActions.right <= layout.innerWidth + 0.5);
check('specs hidden on mobile', layout.specsDisplay === 'none');

// one-finger drag
const cdp = await context.newCDPSession(page);
const az = () => page.evaluate(() => {
  const s = window.__spaceElevator;
  return Math.atan2(s.camera[0] - s.target[0], s.camera[2] - s.target[2]);
});
const beforeAz = await az();
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 400, id: 1 }] });
for (let i = 1; i <= 10; i++) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190 + i * 12, y: 400, id: 1 }] });
}
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(900);
const afterAz = await az();
let dAz = Math.abs(afterAz - beforeAz);
dAz = Math.min(dAz, Math.PI * 2 - dAz);
check('one-finger touch drag rotates', dAz > 0.08, `${dAz.toFixed(3)} rad`);

// two-finger pinch (spread = zoom in)
const dist = () => page.evaluate(() => {
  const s = window.__spaceElevator;
  return Math.hypot(...s.camera.map((v, i) => v - s.target[i]));
});
const dBefore = await dist();
await cdp.send('Input.dispatchTouchEvent', {
  type: 'touchStart',
  touchPoints: [{ x: 150, y: 430, id: 1 }, { x: 240, y: 430, id: 2 }],
});
for (let i = 1; i <= 10; i++) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 150 - i * 5, y: 430, id: 1 }, { x: 240 + i * 5, y: 430, id: 2 }],
  });
}
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(1000);
const dAfter = await dist();
check('two-finger pinch zooms', Math.abs(dAfter - dBefore) > dBefore * 0.01, `${dBefore.toFixed(0)} -> ${dAfter.toFixed(0)}`);

// preset tap
await page.locator('.segment[data-group="base"] button[data-preset="car"]').tap();
await page.waitForTimeout(600);
const carActive = await page
  .locator('.segment[data-group="base"] button[data-preset="car"]')
  .evaluate((el) => el.classList.contains('active'));
check('mobile preset tap activates', carActive);
await page.evaluate(() => window.__spaceElevator.setBasePreset('car', true));
await page.waitForTimeout(800);
await page.screenshot({ path: 'artifacts/41-mobile-car.png' });

// theme
await page.locator('[data-action="theme"]').tap();
await page.waitForTimeout(900);
check('mobile theme toggle', (await page.evaluate(() => window.__spaceElevator.theme)) === 'night');
await page.screenshot({ path: 'artifacts/42-mobile-night.png' });
await page.locator('[data-action="theme"]').tap();
await page.waitForTimeout(600);

// orbit
await page.locator('#btn-orbit').tap();
await page.waitForTimeout(1500);
check('mobile orbit mode', (await page.evaluate(() => window.__spaceElevator.mode)) === 'orbit');
await page.evaluate(() => window.__spaceElevator.setOrbitPreset('system', true));
await page.waitForTimeout(900);
const orbitLayout = await page.evaluate(() => {
  const el = document.querySelector('.controlbar');
  const r = el.getBoundingClientRect();
  const labels = [...document.querySelectorAll('.map-label.on')].map((l) => {
    const b = l.getBoundingClientRect();
    return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
  });
  return { controlbar: { left: r.left, right: r.right, top: r.top, bottom: r.bottom }, labels };
});
check('orbit control bar fits', orbitLayout.controlbar.left >= 0 && orbitLayout.controlbar.right <= 390.5, JSON.stringify(orbitLayout.controlbar));
check('orbit labels inside viewport', orbitLayout.labels.length >= 2 && orbitLayout.labels.every((l) => l.left >= -2 && l.right <= 392), JSON.stringify(orbitLayout.labels));
await page.screenshot({ path: 'artifacts/43-mobile-orbit.png' });

await page.locator('.segment[data-group="orbit"] button[data-preset="station"]').tap();
await page.waitForTimeout(1200);
await page.evaluate(() => window.__spaceElevator.setOrbitPreset('station', true));
await page.waitForTimeout(800);
await page.screenshot({ path: 'artifacts/44-mobile-station.png' });

check('no console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
console.log('\nSUMMARY', JSON.stringify(results, null, 2));
await browser.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);
