import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loopbackTestUrl } from './test-url.mjs';

// Repeatable review views. The camera, viewport, lighting and journey position
// are fixed across iterations so a new angle cannot conceal a regression.
const label = process.env.ITERATION || 'current';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid iteration label');
const out = join(tmpdir(), 'ascent-iterations', label);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = { label, viewport: [1440, 960], frames: [], errors: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' || /GL_INVALID|GL_OUT_OF_MEMORY|FRAMEBUFFER_INCOMPLETE/.test(m.text())) report.errors.push(m.text()); });
  await page.goto(loopbackTestUrl(process.env.TEST_URL), { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__ASCENT__?.getState().ready, null, { timeout: 60000 });
  await page.locator('#progress').fill('42');
  await page.locator('#progress').dispatchEvent('input');
  async function capture(name) {
    await page.waitForFunction(() => !window.__ASCENT__.getState().transitioning);
    await page.screenshot({ path: join(out, name + '.png') });
    await page.locator('#viewport canvas').screenshot({ path: join(out, name + '-model.png'), omitBackground: true });
    report.frames.push({ name, state: await page.evaluate(() => window.__ASCENT__.getState()) });
    console.log('CAPTURE', label, name);
  }
  for (const view of ['climber', 'base', 'station', 'overview']) {
    await page.locator(`[data-view=${view}]`).click();
    await capture(view);
  }
  await page.locator('[data-view=climber]').click();
  await page.waitForFunction(() => !window.__ASCENT__.getState().transitioning);
  await page.locator('#lighting').click(); await capture('climber-structure');
  await page.locator('#lighting').click();
  await page.locator('#shield').click();
  await page.waitForFunction(() => window.__ASCENT__.getState().shieldAmount === 1);
  await capture('ice-shield');
  await page.locator('#enter-cabin').click();
  for (const preset of ['aisle', 'seat', 'control', 'cutaway']) {
    await page.locator(`[data-cabin=${preset}]`).click();
    await capture('cabin-' + preset);
  }
  if (report.errors.length) throw new Error(report.errors.join('\n'));
} finally {
  await writeFile(join(out, 'capture.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
console.log('OUTPUT ' + out);
