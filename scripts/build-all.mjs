/**
 * 合集统一构建编排。
 *
 *   node scripts/build-all.mjs install   仅安装全部 vite 子项目依赖（公共 registry）
 *   node scripts/build-all.mjs build     安装（按需）→ 构建 → 汇总到根 dist/ → 注入返回按钮 → 生成首页
 *
 * 设计原则：
 * - 所有子项目使用公共 npm registry（显式 --registry，避免本机/CI 全局配置指向私有源）
 * - vite 类：在子项目目录执行 npm install + npm run build，产物 dist/ 拷贝到根 dist 的两级目录
 * - static 类：无源码无构建，直接整目录拷贝（静态包的脱敏在迁移阶段已完成）
 * - 汇总后统一注入「返回合集首页」悬浮按钮
 */
import { spawnSync } from 'node:child_process';
import { cpSync, rmSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECTS, projectPath } from '../projects.registry.mjs';
import { injectChrome } from './inject-chrome.mjs';
import { buildHub } from './build-hub.mjs';

const ROOT = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const PUBLIC_REGISTRY = 'https://registry.npmjs.org/';
const DIST = join(ROOT, 'dist');

const mode = process.argv[2] ?? 'build';
if (!['install', 'build'].includes(mode)) {
  console.error(`unknown mode: ${mode} (expected install|build)`);
  process.exit(1);
}

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed (exit ${r.status}) in ${cwd}`);
}

function copyDirContents(src, dest, { skip = new Set() } = {}) {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    if (name === '.DS_Store' || skip.has(name)) continue;
    cpSync(join(src, name), join(dest, name), { recursive: true });
  }
}

const results = [];

// 1) 干净的汇总目录（仅 build 模式）
if (mode === 'build') rmSync(DIST, { recursive: true, force: true });

for (const p of PROJECTS) {
  const src = join(ROOT, projectPath(p));
  const out = join(DIST, 'projects', ...p.dir);
  console.log(`\n=== [${p.id}] ${p.agent} × ${p.model} (${p.type}) ===`);

  if (p.type === 'vite') {
    // 依赖：无 node_modules 时安装（显式公共 registry）
    if (!existsSync(join(src, 'node_modules'))) {
      console.log('-> npm install');
      run('npm', ['install', '--no-audit', '--no-fund', `--registry=${PUBLIC_REGISTRY}`], src);
    }
    if (mode === 'install') { results.push({ ...p, status: 'deps-ready' }); continue; }

    console.log('-> npm run build');
    run('npm', ['run', 'build'], src);
    const projDist = join(src, 'dist');
    if (!existsSync(projDist)) throw new Error(`${p.id}: build produced no dist/`);
    copyDirContents(projDist, out);
  } else if (p.type === 'static') {
    if (mode === 'install') { results.push({ ...p, status: 'static' }); continue; }
    console.log('-> copy static package');
    // docs/（README 效果截图等）只随源码存档，不进入网页产物
    copyDirContents(src, out, { skip: new Set(['docs', '.gitignore']) });
  } else {
    throw new Error(`${p.id}: unknown project type "${p.type}"`);
  }

  // 2) 注入返回按钮（入口 + 额外 html，如 blockout）。
  //    页面位于 dist/projects/<Agent>/<Model>/x.html，回到根需要 1(projects)+dir.length 层
  const depth = 1 + p.dir.length;
  const entries = ['index.html', ...(p.extraEntries ?? [])];
  for (const entry of entries) {
    const html = join(out, entry);
    if (existsSync(html)) {
      injectChrome(html, { depth });
      console.log(`   chrome injected: ${entry}`);
    }
  }

  // 体积统计
  let bytes = 0;
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const fp = join(d, n);
      const st = statSync(fp);
      if (st.isDirectory()) walk(fp); else bytes += st.size;
    }
  };
  walk(out);
  results.push({ ...p, status: 'built', sizeMB: (bytes / 1024 / 1024).toFixed(1) });
}

if (mode === 'install') {
  console.log('\n✓ 全部子项目依赖就绪');
  process.exit(0);
}

// 3) 生成首页（内联 registry 元数据）
console.log('\n=== hub ===');
buildHub(DIST, results);

console.log('\n✓ 合集构建完成 -> dist/');
for (const r of results) console.log(`  ${r.sizeMB ?? '-'} MB  projects/${r.dir.join('/')}/`);
console.log('\n本地预览：npm run serve');
