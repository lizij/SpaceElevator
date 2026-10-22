/**
 * 为各子项目 README 拍摄效果预览图 -> projects/<Agent>/<Model>/docs/screenshots/<file>.png
 *
 *   node scripts/capture-readme-shots.mjs           # 全部项目
 *   node scripts/capture-readme-shots.mjs dsh op55  # 仅指定 id
 *
 * registry 中每条 readmeShots 支持的字段：
 *   { file, url?, wait?, click?, clickText?+text?, actions?: [['click', selector, waitMs], ...] }
 * 前置：npm run build 且 npm run serve 正在运行（默认 http://127.0.0.1:4177）
 */
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { PROJECTS } from '../projects.registry.mjs';

const ROOT = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const PORT = process.env.SE_PORT || 4177;
const only = process.argv.slice(2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function resolveBrowser() {
  if (process.env.SE_CHROME && existsSync(process.env.SE_CHROME)) return process.env.SE_CHROME;
  const cacheRoot = join(process.env.HOME || process.env.USERPROFILE, 'Library/Caches/ms-playwright');
  const candidates = [
    join(cacheRoot, 'chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
    join(cacheRoot, 'chromium-1248/chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  try {
    const out = execFileSync('sh', ['-c', `ls -d ${cacheRoot}/chromium-*/chrome-mac*/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing 2>/dev/null | head -1`], { encoding: 'utf8' }).trim();
    if (out && existsSync(out)) return out;
  } catch {}
  for (const sys of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ]) if (existsSync(sys)) return sys;
  throw new Error('未找到可用的 Chromium/Chrome，请设置 SE_CHROME');
}

async function doAction(page, action) {
  const [kind, ...rest] = action;
  if (kind === 'click') {
    const [selector, afterMs = 2000] = rest;
    await page.click(selector, { timeout: 15000 });
    await wait(afterMs);
  } else if (kind === 'clickText') {
    const [selector, text, afterMs = 2000] = rest;
    await page.locator(selector, { hasText: text }).first().click({ timeout: 15000 });
    await wait(afterMs);
  } else if (kind === 'wait') {
    await wait(rest[0] ?? 2000);
  } else {
    throw new Error('unknown action: ' + kind);
  }
}

const browser = await chromium.launch({
  executablePath: resolveBrowser(),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

const targets = PROJECTS.filter((p) => p.readmeShots?.length && (!only.length || only.includes(p.id)));
let failed = 0;

for (const p of targets) {
  const base = `http://127.0.0.1:${PORT}/projects/${p.dir.join('/')}/index.html`;
  const outDir = join(ROOT, 'projects', ...p.dir, 'docs', 'screenshots');
  mkdirSync(outDir, { recursive: true });

  for (const shot of p.readmeShots) {
    const url = base + (shot.url ?? '');
    process.stdout.write(`[${p.id}] ${shot.file.padEnd(10)} ... `);
    try {
      const errors = [];
      const onErr = (m) => { if (m.type() === 'error') errors.push(m.text()); };
      page.on('console', onErr);
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      await wait(shot.wait ?? 6000);

      if (shot.actions) for (const a of shot.actions) await doAction(page, a);
      if (shot.click) await doAction(page, ['click', shot.click, shot.afterWait ?? 4000]);
      if (shot.clickText) await doAction(page, ['clickText', shot.clickText, shot.text, shot.afterWait ?? 4000]);

      await page.evaluate(() => window.dispatchEvent(new Event('resize'))).catch(() => {});
      await wait(1200);

      const canvas = await page.locator('canvas').count();
      const outPath = join(outDir, `${shot.file}.png`);
      await page.screenshot({ path: outPath });
      page.off('console', onErr);
      const real = errors.filter((e) => !/NormalPass/.test(e));
      console.log(`done (canvas=${canvas})${real.length ? '  ⚠ ' + real[0].slice(0, 80) : ''}`);
    } catch (e) {
      console.log('FAILED: ' + e.message.split('\n')[0]);
      failed++;
    }
  }
}

await browser.close();
if (failed) process.exit(1);
console.log('\nREADME 截图完成。它们在各项目 docs/screenshots/（随源码提交，不进入网页产物）。');
