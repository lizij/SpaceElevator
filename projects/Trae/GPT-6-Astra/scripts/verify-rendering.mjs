import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loopbackTestUrl } from './test-url.mjs';

// High-DPI regression for the black hull seen at ~71% of the journey.
// Listen to GPU warnings as well as JS errors: the bad depth resolve is a warning.
const out = join(tmpdir(), 'ascent-rendering-verification');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const result = { checks: [], errors: [], frames: [], gpu: null, output: out };
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2 });
page.on('pageerror', e => result.errors.push(e.message));
page.on('console', m => {
  if (m.type() === 'error' || /GL_INVALID|GL_OUT_OF_MEMORY|FRAMEBUFFER_INCOMPLETE/.test(m.text())) result.errors.push(m.text());
});
const state = () => page.evaluate(() => window.__ASCENT__.getState());
function check(name, condition) { assert.ok(condition, name); result.checks.push(name); console.log('PASS ' + name); }

async function capture(name, hull = true) {
  const png = await page.screenshot({ path: join(out, name + '.png') });
  // Decode the actual composited screenshot, rather than reading an empty or
  // MSAA-bound WebGL drawing buffer. Bounds are in the fixed CSS viewport.
  const regions = await page.evaluate(async data => {
    const image = new Image(); image.src = data; await image.decode();
    const scratch = document.createElement('canvas'); scratch.width = 1440; scratch.height = 960;
    const c = scratch.getContext('2d'); c.drawImage(image, 0, 0, 1440, 960);
    const boxes = { shoulder: [756, 422, 86, 28], doors: [705, 469, 136, 23], pod: [966, 540, 45, 24] };
    return Object.fromEntries(Object.entries(boxes).map(([key, box]) => {
      const pixels = c.getImageData(...box).data; let total = 0, black = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const rgb = pixels[i] + pixels[i + 1] + pixels[i + 2];
        total += rgb; if (rgb < 15) black++;
      }
      return [key, { mean: total / (pixels.length / 4) / 3, blackFraction: black / (pixels.length / 4) }];
    }));
  }, 'data:image/png;base64,' + png.toString('base64'));
  const frame = { name, state: await state(), regions };
  result.frames.push(frame);
  if (hull) check(name + ': hull remains lit', Object.values(regions).every(r => r.mean > 45 && r.blackFraction < .05));
}

try {
  await page.goto(loopbackTestUrl(process.env.TEST_URL));
  await page.waitForFunction(() => window.__ASCENT__?.getState().ready, null, { timeout: 60000 });
  result.gpu = await page.evaluate(() => {
    const gl = document.querySelector('canvas').getContext('webgl2'), ext = gl.getExtension('WEBGL_debug_renderer_info');
    return { renderer: ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL), dpr: devicePixelRatio };
  });
  await page.locator('#follow').click();
  await page.waitForFunction(() => !window.__ASCENT__.getState().transitioning);
  await page.locator('#progress').fill('71'); await page.locator('#progress').dispatchEvent('input');
  await capture('paused-71');
  await page.locator('#play').click();
  for (let i = 0; i < 8; i++) await capture('follow-' + i);
  check('Every sampled region stays stable during following', ['shoulder', 'doors', 'pod'].every(key => {
    const values = result.frames.slice(1).map(f => f.regions[key].mean);
    return Math.max(...values) - Math.min(...values) < 12;
  }));
  await page.locator('#play').click();
  for (const id of ['quality', 'quality', 'lighting', 'lighting']) {
    await page.locator('#' + id).click(); await capture('switch-' + result.frames.length);
  }
  await page.locator('#enter-cabin').click();
  for (const preset of ['aisle', 'control', 'cutaway']) {
    await page.locator(`[data-cabin=${preset}]`).click(); await capture('cabin-' + preset, false);
  }
  await page.locator('#enter-cabin').click(); await capture('return-exterior');
  await page.setViewportSize({ width: 1280, height: 800 });
  await capture('resize', false);
  await page.setViewportSize({ width: 1440, height: 960 });
  await capture('resize-restored');
  const error = await page.evaluate(() => document.querySelector('canvas').getContext('webgl2').getError());
  check('WebGL error state is clear', error === 0);
  check('No GPU framebuffer warnings or JavaScript errors', result.errors.length === 0);
  console.log(JSON.stringify({ checks: result.checks.length, errors: result.errors, frames: result.frames.length, output: out }));
} finally {
  await writeFile(join(out, 'verification.json'), JSON.stringify(result, null, 2));
  await browser.close();
}
