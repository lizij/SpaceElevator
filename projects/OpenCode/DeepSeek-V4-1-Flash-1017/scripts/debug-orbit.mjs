import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
await page.goto('http://127.0.0.1:4199/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__spaceElevator?.ready === true, null, { timeout: 120000 });
await page.waitForTimeout(3800);
await page.evaluate(() => window.__spaceElevator.setMode('orbit'));
await page.waitForTimeout(1200);
await page.evaluate(() => window.__spaceElevator.setOrbitPreset('system', true));
await page.waitForTimeout(1200);
const s = await page.evaluate(() => ({
  camera: window.__spaceElevator.camera,
  target: window.__spaceElevator.target,
  labels: [...document.querySelectorAll('.map-label')].map((l) => ({ id: l.id, cls: l.className, text: l.textContent?.slice(0, 20), rect: (() => { const r = l.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })() })),
}));
console.log(JSON.stringify(s, null, 2));
await page.screenshot({ path: 'artifacts/45-mobile-orbit-debug.png' });
await browser.close();
