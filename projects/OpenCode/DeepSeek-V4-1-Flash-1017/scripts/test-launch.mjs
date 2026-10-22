import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('console error', m.text()); });
await page.goto('http://127.0.0.1:4199/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__spaceElevator?.ready === true, null, { timeout: 120000 });
await page.waitForTimeout(3800);
await page.evaluate(() => window.__spaceElevator.setBasePreset('base', true));
await page.waitForTimeout(800);
await page.locator('#btn-launch').click();
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(2000);
  const s = await page.evaluate(() => ({
    launch: window.__spaceElevator.launch,
    tel: document.getElementById('tel-alt')?.textContent,
    camY: window.__spaceElevator.camera?.[1],
    targetY: window.__spaceElevator.target?.[1],
  }));
  console.log(i, JSON.stringify(s));
}
await browser.close();
