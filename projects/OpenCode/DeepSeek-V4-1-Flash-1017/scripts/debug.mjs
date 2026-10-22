import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (msg) => console.log(`[console.${msg.type()}]`, msg.text()));
page.on('pageerror', (err) => console.log('[pageerror]', err.message, err.stack));
page.on('requestfailed', (req) => console.log('[requestfailed]', req.url(), req.failure()?.errorText));

await page.goto('http://localhost:4199/', { waitUntil: 'load' });
await page.waitForTimeout(12000);
console.log('state', await page.evaluate(() => ({
  ready: window.__spaceElevator?.ready,
  has: !!window.__spaceElevator,
  fatal: document.getElementById('fatal-text')?.textContent,
  fatalHidden: document.getElementById('fatal')?.hidden,
  loading: document.getElementById('loading')?.className,
  pct: document.getElementById('loader-pct')?.textContent,
})));
await page.screenshot({ path: 'artifacts/debug.png' });
await browser.close();
