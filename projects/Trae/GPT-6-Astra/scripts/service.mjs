import {spawn} from 'node:child_process';
import {execFileSync} from 'node:child_process';
import {openSync,closeSync,writeFileSync,readFileSync,existsSync,unlinkSync,mkdirSync} from 'node:fs';
import {get} from 'node:http';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./serve.mjs',import.meta.url));
const runtime=fileURLToPath(new URL('../.runtime/',import.meta.url));
const state=fileURLToPath(new URL('../.runtime/deployment-process.json',import.meta.url));
const logfile=fileURLToPath(new URL('../.runtime/deployment.log',import.meta.url));
const action=process.argv[2]||'status';
const port=Number(process.env.PORT||4177);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be an integer between 1 and 65535.');
function current(){
  if(!existsSync(state))return null;
  try {
    const value=JSON.parse(readFileSync(state,'utf8'));
    if(!Number.isInteger(value.pid)||value.pid<1||!Number.isInteger(value.port)||value.port<1||value.port>65535)return null;
    process.kill(value.pid,0);
    const command=execFileSync('/bin/ps',['-p',String(value.pid),'-o','command='],{encoding:'utf8'});
    return command.includes(script)?value:null;
  }catch{return null;}
}
function health(port){
  return new Promise((resolve,reject)=>{
    const request=get({hostname:'127.0.0.1',port,path:'/healthz',timeout:2000},response=>{
      let body='';response.setEncoding('utf8');response.on('data',chunk=>body+=chunk);response.on('end',()=>response.statusCode===200?resolve(body):reject(new Error(`Health check returned ${response.statusCode}`)));
    });
    request.on('timeout',()=>request.destroy(new Error('Health check timed out')));request.on('error',reject);
  });
}
if(action==='start'){
  if(current()){console.log(JSON.stringify(current()));process.exit(0);}
  mkdirSync(runtime,{recursive:true,mode:0o700});
  const log=openSync(logfile,'a');
  const child=spawn(process.execPath,[script],{detached:true,stdio:['ignore',log,log],env:{NODE_ENV:'production',PORT:String(port),TZ:'Asia/Shanghai'}});
  child.unref();closeSync(log);
  const data={pid:child.pid,port,url:`http://127.0.0.1:${port}`,startedAt:new Date().toISOString()};
  writeFileSync(state,JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify(data));
}else if(action==='stop'){
  const value=current();if(value){process.kill(value.pid,'SIGTERM');console.log(`Stopped PROJECT ASCENT (PID ${value.pid})`);}else console.log('PROJECT ASCENT is not running');
  if(existsSync(state))unlinkSync(state);
}else if(action==='status'){
  const value=current();if(!value){console.log('PROJECT ASCENT is not running');process.exitCode=1;}else {console.log(JSON.stringify(value,null,2));console.log(await health(value.port));}
}else{throw new Error('Use start, status or stop');}
