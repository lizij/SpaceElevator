import { chromium } from 'playwright';
const BASE = process.env.APP_URL || 'http://127.0.0.1:4199/';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(e.message));
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__spaceElevator?.ready === true, null, { timeout: 120000 });
await page.waitForTimeout(3400);
async function shot(name, pos, target) {
  await page.evaluate(([p,t]) => { window.__spaceElevator.setBasePreset('overview', true); window.__spaceElevator.setBaseCamera(p,t); }, [pos,target]);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `artifacts/qa/${name}.png` });
  console.log('shot', name);
}
await shot('q01-anchor', [260, 560, 330], [0, 400, 0]);
await shot('q02-anchor-top', [150, 760, 200], [0, 620, 0]);
await shot('q03-tower-platform', [420, 620, 720], [0, 520, 340]);
await shot('q04-tower-top', [700, 2100, 900], [0, 1980, 340]);
await shot('q05-tower-foot', [520, 240, 760], [0, 180, 340]);
await shot('q06-launch-base', [260, 260, 1500], [0, 150, 1210]);
await shot('q07-ring-deck', [1780, 330, 960], [1230, 110, 960]);
await shot('q08-dock', [1750, 380, 1500], [1280, 100, 1250]);
console.log('errors', JSON.stringify(errors));
await browser.close();
