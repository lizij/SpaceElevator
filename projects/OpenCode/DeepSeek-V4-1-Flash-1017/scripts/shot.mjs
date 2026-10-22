import { chromium } from 'playwright';
import fs from 'node:fs';

const url = process.env.URL ?? 'http://localhost:4199/';
const outDir = new URL('../artifacts/', import.meta.url).pathname;
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));

await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__spaceElevator?.ready === true, null, { timeout: 120000 });
await page.waitForTimeout(6500);
await page.screenshot({ path: `${outDir}01-overview.png` });
console.log('state', await page.evaluate(() => ({
  mode: window.__spaceElevator.mode,
  camera: window.__spaceElevator.camera,
  target: window.__spaceElevator.target,
  calls: window.__spaceElevator.calls,
  triangles: window.__spaceElevator.triangles,
})));

await page.evaluate(() => window.__spaceElevator.setBasePreset('base'));
await page.waitForTimeout(2800);
await page.screenshot({ path: `${outDir}02-base.png` });

await page.evaluate(() => window.__spaceElevator.setBasePreset('car'));
await page.waitForTimeout(2800);
await page.screenshot({ path: `${outDir}03-car.png` });

await page.evaluate(() => window.__spaceElevator.toggleTheme());
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outDir}04-night.png` });
await page.evaluate(() => window.__spaceElevator.toggleTheme());

await page.evaluate(() => window.__spaceElevator.setMode('orbit'));
await page.waitForTimeout(4000);
await page.screenshot({ path: `${outDir}05-orbit.png` });

await page.evaluate(() => window.__spaceElevator.setOrbitPreset('earth'));
await page.waitForTimeout(2600);
await page.screenshot({ path: `${outDir}06-earth.png` });

await page.evaluate(() => window.__spaceElevator.setOrbitPreset('station'));
await page.waitForTimeout(2600);
await page.screenshot({ path: `${outDir}07-station.png` });

await page.evaluate(() => window.__spaceElevator.setOrbitPreset('counterweight'));
await page.waitForTimeout(2600);
await page.screenshot({ path: `${outDir}08-counterweight.png` });

console.log('errors', errors);
await browser.close();
