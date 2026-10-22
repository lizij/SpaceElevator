/**
 * 向构建产物 html 注入「返回合集首页」悬浮按钮。
 * - 纯字符串注入：在 </body> 前插入 <style> + <a>，不修改各项目源码逻辑。
 * - 链接使用相对路径，深度固定为 dist/projects/<Agent>/<Model>/index.html，即 ../../index.html。
 *
 * 导出 injectChrome(htmlPath, { depth })：depth 为回到站点根需要的 ../ 层数。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const MARK = 'data-se-hub-chrome';

const CHROME = (depth) => `<!-- ${MARK}: 合集返回按钮（构建时注入） -->
<style>
  #se-back-home{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483000;
    display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;
    min-width:32px;height:32px;padding:0 9px;border-radius:999px;text-decoration:none;
    color:#e8f1f7;font:600 12px/1 -apple-system,"PingFang SC","Noto Sans SC",system-ui,sans-serif;letter-spacing:.04em;
    background:rgba(8,14,20,.45);border:1px solid rgba(180,205,225,.25);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    box-shadow:0 3px 14px rgba(0,0,0,.3);opacity:.55;overflow:hidden;white-space:nowrap;
    transition:opacity .2s,background .2s,border-color .2s;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:none}
  #se-back-home:hover,#se-back-home:focus-visible{opacity:1;background:rgba(22,34,46,.85);border-color:rgba(255,255,255,.55);outline:none}
  #se-back-home svg{width:14px;height:14px;flex:none}
  #se-back-home .se-bh-txt{max-width:0;opacity:0;margin-left:0;transition:max-width .22s ease,opacity .18s ease,margin-left .22s ease}
  #se-back-home:hover .se-bh-txt,#se-back-home:focus-visible .se-bh-txt{max-width:120px;opacity:1;margin-left:7px}
</style>
<a id="se-back-home" href="${'../'.repeat(depth)}index.html" aria-label="返回合集首页" title="返回合集首页">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
  <span class="se-bh-txt">合集首页</span>
</a>`;

export function injectChrome(htmlPath, { depth = 2 } = {}) {
  if (!existsSync(htmlPath)) return false;
  let html = readFileSync(htmlPath, 'utf8');
  if (html.includes(MARK)) return false;
  if (!/</i.test(html)) return false;

  // 返回按钮含一处内联 <style>，若页面声明了 CSP，需要给 style-src 放行内联
  html = html.replace(
    /(<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>)/i,
    (meta) => {
      if (meta.includes("'unsafe-inline'")) return meta;
      if (/style-src[^;]*/.test(meta)) {
        return meta.replace(/(style-src[^;]*)/, "$1 'unsafe-inline'");
      }
      return meta;
    },
  );

  // 独立 html（如 blockout）若无 favicon 声明，补一个内联图标，避免浏览器请求 /favicon.ico 产生 404
  if (!/rel=["'](?:shortcut )?icon["']/i.test(html)) {
    const fav = '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Cpath d=%27M16 2v28M4 8h24M7 15h18M10 22h12%27 stroke=%27%237fd4ff%27 stroke-width=%272%27 stroke-linecap=%27round%27/%3E%3C/svg%3E" />';
    html = html.includes('</head>')
      ? html.replace('</head>', `    ${fav}\n</head>`)
      : html.replace(/<head[^>]*>/i, (m) => `${m}${fav}`);
  }

  if (html.includes('</body>')) {
    html = html.replace('</body>', `${CHROME(depth)}</body>`);
  } else {
    html += CHROME(depth);
  }
  writeFileSync(htmlPath, html);
  return true;
}

// CLI: node scripts/inject-chrome.mjs <htmlPath> [depth]
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , htmlPath, depthArg] = process.argv;
  if (!htmlPath) {
    console.error('usage: node scripts/inject-chrome.mjs <htmlPath> [depth]');
    process.exit(1);
  }
  const changed = injectChrome(htmlPath, { depth: Number(depthArg) || 2 });
  console.log(changed ? `injected: ${htmlPath}` : `skipped: ${htmlPath}`);
}
