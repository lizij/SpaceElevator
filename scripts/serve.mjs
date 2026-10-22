/**
 * 合集本地预览服务器（零依赖，仅 Node 内置模块）。
 *   node scripts/serve.mjs [port]   默认 4177，仅监听 127.0.0.1
 * 托管 dist/ 静态产物；未知路径回退到 index.html（仅在看起来像页面路径时）。
 */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../dist/', import.meta.url));
const PORT = Number(process.argv[2] || process.env.PORT || 4177);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    let rel = decodeURIComponent(url.pathname);

    // 预构建归档（Claude/Opus-5-5）中平台 SDK 的死代码仍会探测运行时接口；
    // 这些接口在纯静态部署中不存在，直接返回 404 JSON，避免 SPA 回退成 HTML 导致 JSON 解析报错。
    if (rel.includes('current_server_timestamp')) {
      // 归档应用平台 SDK 的对时探测：返回标准时间即可（无平台依赖）
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ status_code: 0, code: 0, data: { timestampNs: String(BigInt(Date.now()) * 1000000n) } }));
    }
    if (rel.includes('/__runtime__/') || rel.includes('/spark/') || rel.endsWith('/routes.json')) {
      res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
      return res.end('{"code":404,"message":"not available in static collection"}');
    }

    rel = normalize(rel).replace(/^(\.\.[/\\])+/, '');
    if (rel === '/' || rel === '.') rel = '/index.html';

    let filePath = join(ROOT, rel);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end('forbidden');
    }

    try {
      const s = await stat(filePath);
      if (s.isDirectory()) filePath = join(filePath, 'index.html');
    } catch {
      // 无扩展名的页面路径回退到 SPA 首页；带扩展名的资源保持 404
      if (!extname(rel)) filePath = join(ROOT, 'index.html');
    }

    const data = await readFile(filePath);
    const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' });
    res.end(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('404 not found');
    }
    res.writeHead(500);
    res.end('server error: ' + err.message);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`太空电梯实验合集：http://127.0.0.1:${PORT}/`);
});
