import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loopbackTestUrl} from './test-url.mjs';
const out=join(tmpdir(),'ascent-verification-v3')+'/';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
 page.on('pageerror',e=>console.log('ERROR',e.message));page.on('console',m=>{if(m.type()==='error')console.log(m.text());});
 await page.goto(loopbackTestUrl(process.env.TEST_URL),{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__ASCENT__?.getState().ready,null,{timeout:60000});
 await page.locator('#play').click();await page.screenshot({path:out+'desktop-hero.png'});console.log('HERO',await page.evaluate(()=>window.__ASCENT__.getState()));
 for(const view of ['base','station','overview']){await page.locator(`[data-view=${view}]`).click();await page.waitForFunction(()=>!window.__ASCENT__.getState().transitioning);await page.screenshot({path:out+`desktop-${view}.png`});console.log('CAPTURED',view);}
}finally{await browser.close();}
