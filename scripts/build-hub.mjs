/**
 * 生成合集首页到 dist/：
 * - 读取 hub/index.html / hub.css / hub.js 与 PROMPT.md
 * - 将 registry 元数据 + prompt 内联进首页（零运行时数据依赖）
 * - 拷贝 hub/thumbs 缩略图
 */
import { readFileSync, writeFileSync, cpSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));

function extractPrompt() {
  const md = readFileSync(join(ROOT, 'PROMPT.md'), 'utf8');
  const m = md.match(/>\s*(我想做一个web项目[^\n]*)/);
  return m ? m[1].trim() : '';
}

export function buildHub(distDir, builtProjects) {
  const hubDir = join(ROOT, 'hub');
  let html = readFileSync(join(hubDir, 'index.html'), 'utf8');
  const js = readFileSync(join(hubDir, 'hub.js'), 'utf8');
  const css = readFileSync(join(hubDir, 'hub.css'), 'utf8');

  const data = {
    prompt: extractPrompt(),
    projects: builtProjects.map((p) => ({
      id: p.id,
      agent: p.agent,
      model: p.model,
      dir: p.dir,
      date: p.date,
      rounds: p.rounds,
      stack: p.stack,
      highlights: p.highlights,
    })),
  };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  html = html
    .replace('__DATA__', json)
    .replace('<link rel="stylesheet" href="./hub.css" />', `<style>\n${css}\n</style>`)
    .replace('<script src="./hub.js"></script>', `<script>\n${js}\n</script>`);

  writeFileSync(join(distDir, 'index.html'), html);

  // 缩略图（若已生成）
  const thumbsSrc = join(hubDir, 'thumbs');
  if (existsSync(thumbsSrc)) cpSync(thumbsSrc, join(distDir, 'thumbs'), { recursive: true });
  mkdirSync(join(distDir, 'thumbs'), { recursive: true });

  console.log('hub generated: dist/index.html');
}
