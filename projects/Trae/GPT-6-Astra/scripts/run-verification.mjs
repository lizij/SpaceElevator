import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const port='4188';
const requestedScript=process.argv[2]||'verify.mjs';
const allowedScripts=new Set(['verify.mjs','verify-rendering.mjs','capture-iteration.mjs','capture-v2.mjs','inspect.mjs']);
if(!allowedScripts.has(requestedScript))throw new Error(`Unsupported verification script: ${requestedScript}`);
const server=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{env:{...process.env,PORT:port},stdio:['ignore','pipe','inherit']});
try {
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error(`Server exited ${code}`)));});
  const test=spawn(process.execPath,[fileURLToPath(new URL(`./${requestedScript}`,import.meta.url))],{env:{...process.env,TEST_URL:`http://127.0.0.1:${port}/`},stdio:'inherit'});
  process.exitCode=await new Promise((resolve,reject)=>{test.once('exit',resolve);test.once('error',reject);});
} finally {server.kill('SIGTERM');await new Promise(resolve=>{if(server.exitCode!==null)resolve();else server.once('exit',resolve);});}
