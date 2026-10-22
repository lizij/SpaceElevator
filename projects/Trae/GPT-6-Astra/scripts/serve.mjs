import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const port=Number(process.env.PORT||4177);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be an integer between 1 and 65535.');
const rootReal=await realpath(root);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const csp="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'; frame-src 'none'; media-src 'none'";
const securityHeaders={'Content-Security-Policy':csp,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Resource-Policy':'same-origin'};
const server=http.createServer(async(req,res)=>{
  try{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{...securityHeaders,Allow:'GET, HEAD'});return res.end();}
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname==='/healthz'){res.writeHead(200,{...securityHeaders,'Content-Type':'application/json'});return res.end(req.method==='HEAD'?undefined:JSON.stringify({status:'ok',app:'project-ascent',version:'4.1.0'}));}
    const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root)){res.writeHead(403,securityHeaders);return res.end('Forbidden');}
    const fileReal=await realpath(file);if(!fileReal.startsWith(`${rootReal}${path.sep}`)){res.writeHead(403,securityHeaders);return res.end('Forbidden');}
    const info=await stat(fileReal);if(!info.isFile()){res.writeHead(404,securityHeaders);return res.end('Not found');}
    const body=await readFile(fileReal);res.writeHead(200,{...securityHeaders,'Content-Type':types[path.extname(fileReal)]||'application/octet-stream','Content-Length':body.length,'Cache-Control':pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache'});res.end(req.method==='HEAD'?undefined:body);
  }catch(error){res.writeHead(error.code==='ENOENT'?404:400,securityHeaders);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`PROJECT ASCENT ready at http://127.0.0.1:${port}`));
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>server.close(()=>process.exit(0)));
