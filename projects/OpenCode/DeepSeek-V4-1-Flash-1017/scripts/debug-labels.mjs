import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:4199/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__spaceElevator?.ready === true, null, { timeout: 120000 });
await page.waitForTimeout(3800);
await page.evaluate(() => window.__spaceElevator.setMode('orbit'));
await page.waitForTimeout(1200);
await page.evaluate(() => window.__spaceElevator.setOrbitPreset('system', true));
await page.waitForTimeout(1200);
const s = await page.evaluate(() => [...document.querySelectorAll('.map-label')].map((el) => ({
  key: el.dataset.label,
  cls: el.className,
  transform: el.style.transform,
  width: el.offsetWidth,
  rect: (() => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top }; })(),
  html: el.textContent?.trim().slice(0, 40),
})));
console.log(JSON.stringify(s, null, 2));
await browser.close();
