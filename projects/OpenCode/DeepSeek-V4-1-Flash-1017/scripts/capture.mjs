import { chromium } from 'playwright';

const BASE = process.env.APP_URL || 'http://127.0.0.1:4173/';
const OUT = 'artifacts';

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__spaceElevator?.ready === true, null, { timeout: 120000 });
await page.waitForTimeout(3200);

async function shot(name) {
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
}

async function basePreset(preset) {
  await page.evaluate((p) => window.__spaceElevator.setBasePreset(p, true), preset);
}

async function orbitPreset(preset) {
  await page.evaluate((p) => window.__spaceElevator.setOrbitPreset(p, true), preset);
}

await basePreset('overview');
await shot('10-overview');

await basePreset('base');
await shot('11-base');

await basePreset('car');
await shot('12-car');

await page.evaluate(() => window.__spaceElevator.toggleTheme());
await page.waitForTimeout(700);
await basePreset('overview');
await shot('13-night-overview');

await basePreset('car');
await shot('14-night-car');

await page.evaluate(() => window.__spaceElevator.toggleTheme());
await page.waitForTimeout(700);
await basePreset('base');
await page.evaluate(() => window.__spaceElevator.startLaunch());
await page.waitForTimeout(2600);
await shot('15-launch');
await page.waitForTimeout(9000);
await shot('16-launch-top');

// orbital mode
await page.evaluate(() => window.__spaceElevator.setMode('orbit'));
await page.waitForTimeout(800);
await orbitPreset('system');
await shot('17-orbit-system');

await orbitPreset('earth');
await shot('18-orbit-earth');

await orbitPreset('station');
await shot('19-orbit-station');

await orbitPreset('counterweight');
await shot('20-orbit-counterweight');

const state = await page.evaluate(() => ({
  mode: window.__spaceElevator.mode,
  camera: window.__spaceElevator.camera?.map((v) => Math.round(v * 1000) / 1000),
  target: window.__spaceElevator.target?.map((v) => Math.round(v * 1000) / 1000),
}));
console.log('state', state);
console.log('errors', errors);
await browser.close();
