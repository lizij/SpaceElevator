/**
 * 公开发布前审计：扫描 projects/、hub/、scripts/ 与 dist/（如存在）。
 * - 文本文件逐行规则匹配（代码/文档/配置/SVG/压缩后 JS 等）
 * - 二进制与图片文件做字符串级匹配（防元数据/内嵌文本泄露）
 * - 异常敏感文件类型检查（密钥/证书/环境文件/压缩包等）
 * 退出码：发现命中返回 1，否则 0。
 *
 * 用法：node scripts/audit-sensitive.mjs [--dist]
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** (pattern, why) —— 命中即需处理 */
const RULES = [
  [/lizijian/i, '本机用户名 / 个人路径'],
  [/\/Users\/[a-z]/i, 'macOS 本机绝对路径'],
  [/[a-z0-9.-]*(bytedance|byted\.org|bytednsdoc|bytedance\.net|feishu|larksuite|kundou|aiforce)[a-z0-9.-]*/i, '非公开域名/平台标识'],
  [/\bida-app\b/i, '内部托管标识'],
  [/\b(slardar|tea[-_]?collect)\b/i, '非公开监控标识'],
  [/妙搭|豆包/, '平台产品名'],
  [/\bmiaoda\b|MiaoDa|MIAODA|doubao|Doubao/i, '平台英文标识'],
  [/app_17gc76zyew9/, '原平台应用 ID'],
  [/(window\.(tenantId|csrfToken|appId|userId)\s*=\s*["'`][^"'`]+|x-miaoda-token|["'`]tenantId["'`]\s*:\s*["'`]\d)/i, '平台鉴权字面量'],
  [/(?:https?:\/\/|["'`])10\.\d{1,3}\.\d{1,3}\.\d{1,3}/, '内网 IP'],
  [/\b192\.168\.\d{1,3}\.\d{1,3}\b/, '内网 IP'],
  [/[a-z0-9._%+-]+@(bytedance|feishu|larksuite|byted)\.[a-z]+/i, '公司邮箱'],
  [/-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, '私钥'],
  [/(xox[baprs]-|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,})/, '凭据样式 token'],
];

/** 文件名层面禁止入库的类型（node_modules/dist 已在跳过目录中） */
const BAD_NAMES = [
  /\.pem$/i, /\.key$/i, /\.p12$/i, /\.pfx$/i, /\.keystore$/i, /\.jks$/i,
  /^\.env(\.|$)/i, /\.env\./i,
  /\.(zip|tar|gz|rar|7z|dmg|exe|dylib|so|dll|node|wasm)$/i,
  /credentials?/i, /id_rsa/i,
];

const TEXT_EXT = new Set(['.js', '.mjs', '.ts', '.tsx', '.json', '.html', '.css', '.md', '.yml', '.yaml', '.svg', '.txt', '.sh', '.npmrc', '.gitignore', '.map']);
const BIN_SCAN_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.runtime', '.screenshots']);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else yield { path: p, name, size: st.size };
  }
}

// 审计器自身包含全部检测特征词（检测规则必须如此），扫描时跳过
const SELF = fileURLToPath(import.meta.url);
const targets = ['projects', 'hub', 'scripts', '.github'];
if (process.argv.includes('--dist') && existsSync(join(ROOT, 'dist'))) targets.push('dist');

const hits = [];
let scannedText = 0;
let scannedBin = 0;

for (const t of targets) {
  const base = join(ROOT, t);
  if (!existsSync(base)) continue;
  for (const { path: file, name } of walk(base)) {
    if (file === SELF) continue;
    const ext = extname(name);
    for (const re of BAD_NAMES) {
      if (re.test(name)) hits.push(`${relative(ROOT, file)} [禁止入库的文件类型/文件名]`);
    }
    const buf = readFileSync(file);
    if (TEXT_EXT.has(ext) || name === '.npmrc' || name === '.gitignore') {
      scannedText++;
      const text = buf.toString('utf8');
      text.split('\n').forEach((line, i) => {
        for (const [re, why] of RULES) {
          if (re.test(line)) hits.push(`${relative(ROOT, file)}:${i + 1} [${why}] ${line.trim().slice(0, 120)}`);
        }
      });
    } else if (BIN_SCAN_EXT.has(ext)) {
      scannedBin++;
      // 图片：扫描可打印 ASCII 串（元数据/编辑器痕迹可能在 tEXt/iTXt 段）
      const text = buf.toString('latin1');
      for (const [re, why] of RULES) {
        const m = text.match(re);
        if (m) hits.push(`${relative(ROOT, file)} [图片内嵌: ${why}] …${text.slice(Math.max(0, m.index - 30), m.index + 60).replace(/[^\x20-\x7e]+/g, ' ')}…`);
      }
    }
  }
}

// 根目录零散文件
for (const name of ['.npmrc', 'package.json', 'package-lock.json', 'README.md', 'AGENTS.md', 'PROMPT.md', 'projects.registry.mjs']) {
  const file = join(ROOT, name);
  if (!existsSync(file)) continue;
  scannedText++;
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    for (const [re, why] of RULES) {
      if (re.test(line)) hits.push(`${name}:${i + 1} [${why}] ${line.trim().slice(0, 120)}`);
    }
  });
}

console.log(`扫描文本文件 ${scannedText} 个，图片 ${scannedBin} 张`);
if (hits.length) {
  console.error(`✗ 审计发现 ${hits.length} 处：\n`);
  console.error(hits.join('\n'));
  process.exit(1);
}
console.log('✓ 公开发布审计通过：0 命中');
