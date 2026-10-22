import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:4199/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__spaceElevator?.ready === true, null, { timeout: 120000 });
await page.waitForTimeout(1000);
await page.evaluate(() => window.__spaceElevator.setBasePreset('overview', true));
await page.waitForTimeout(500);
console.log(await page.evaluate(() => {
  const s = window.__spaceElevator;
  return {
    camera: s.camera,
    target: s.target,
    size: [innerWidth, innerHeight],
    canvas: (() => { const c = document.getElementById('webgl'); return [c.width, c.height, c.clientWidth, c.clientHeight]; })(),
  };
}));
await page.screenshot({ path: 'artifacts/measure.png' });
await browser.close();
