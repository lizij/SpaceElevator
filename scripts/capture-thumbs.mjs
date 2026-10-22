/**
 * 统一重拍各项目首页缩略图 -> hub/thumbs/<Agent>/<Model>.png
 *
 *   node scripts/capture-thumbs.mjs          # 全部
 *   node scripts/capture-thumbs.mjs dsh op55 # 仅指定 id
 *
 * 前置：npm install（devDependency playwright-core）。
 * 浏览器解析顺序：环境变量 SE_CHROME > 本机 Playwright 缓存的 Chrome for Testing >
 * 系统 Google Chrome。软件 WebGL（SwiftShader）保证无头环境也有画面。
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

function resolveBrowser() {
  if (process.env.SE_CHROME && existsSync(process.env.SE_CHROME)) return process.env.SE_CHROME;
  // Playwright 缓存目录（chrome-mac-arm64 / chrome-mac / chrome-linux / chrome-win）
  const cacheRoot = join(process.env.HOME || process.env.USERPROFILE, 'Library/Caches/ms-playwright');
  const candidates = [
    join(cacheRoot, 'chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
    join(cacheRoot, 'chromium-1248/chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  // 通配探测
  try {
    const out = execFileSync('sh', ['-c', `ls -d ${cacheRoot}/chromium-*/chrome-mac*/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing 2>/dev/null | head -1`], { encoding: 'utf8' }).trim();
    if (out && existsSync(out)) return out;
  } catch {}
  for (const sys of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ]) if (existsSync(sys)) return sys;
  throw new Error('未找到可用的 Chromium/Chrome，请设置 SE_CHROME 环境变量指向浏览器可执行文件');
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shoot(page, url, outPath) {
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  // 给程序化场景留出模型构建与首帧时间（软件渲染较慢）
  await wait(9000);
  // 触发一次 resize 确保画布铺满
  await page.evaluate(() => window.dispatchEvent(new Event('resize'))).catch(() => {});
  await wait(1500);
  await page.screenshot({ path: outPath });
  return errors;
}

const browser = await chromium.launch({
  executablePath: resolveBrowser(),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

const targets = PROJECTS.filter((p) => !only.length || only.includes(p.id));
let failed = 0;

for (const p of targets) {
  const url = `http://127.0.0.1:${PORT}/projects/${p.dir.join('/')}/index.html${p.thumbQuery ?? ''}`;
  const outPath = join(ROOT, 'hub', 'thumbs', ...p.dir) + '.png';
  mkdirSync(dirname(outPath), { recursive: true });
  process.stdout.write(`[${p.id}] ${url} ... `);
  try {
    const errors = await shoot(page, url, outPath);
    // 平台 SDK 死代码可能产生网络 404 报错，只展示不判失败；真正的页面异常需人工看
    console.log(errors.length ? `done (${errors.length} 条控制台错误)\n        ${errors.slice(0, 3).join('\n        ')}` : 'done ✓');
  } catch (e) {
    console.log('FAILED:', e.message);
    failed++;
  }
}

await browser.close();
if (failed) process.exit(1);
console.log('\n缩略图已生成到 hub/thumbs/。重新运行 npm run build 使其进入 dist/。');
