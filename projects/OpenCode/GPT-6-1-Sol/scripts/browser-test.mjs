import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { PNG } from 'pngjs';

const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4176/';
const browser = await chromium.launch({
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'chrome' }),
  headless: true,
  args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
await mkdir('.runtime', { recursive: true });
await mkdir('docs/screenshots', { recursive: true });
await mkdir('.runtime/launch-interior-tests', { recursive: true });
const errors = [];
const checks = [];
function watch(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`); });
}
const wait = page => page.waitForTimeout(1600);
const inspect = page => page.evaluate(() => window.__ELEVATOR__.inspect());
const moved = (a, b) => a.some((value, i) => Math.abs(value - b[i]) > .1);
let staticServer;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  watch(page);
  await page.goto(`${base}?test=1&motion=0`);
  await page.waitForFunction(() => document.documentElement.dataset.sceneReady === 'true');
  await wait(page);
  assert.deepEqual(await page.evaluate(() => window.__ELEVATOR__.counts), { mainTowers: 3, launchGroups: 12, cableChannels: 9, cables: 216, climbers: 9 });
  checks.push('生产构建 WebGL 首帧与模型数量');
  const canvasImage = PNG.sync.read(await page.locator('canvas').screenshot());
  const colors = new Set();
  for (let y = 150; y < 750; y += 7) {
    for (let x = 440; x < 1120; x += 7) {
      const i = (y * canvasImage.width + x) * 4;
      colors.add(`${canvasImage.data[i]},${canvasImage.data[i + 1]},${canvasImage.data[i + 2]}`);
    }
  }
  const pixels = colors.size;
  assert.ok(pixels > 100, `canvas 非空色彩数 ${pixels}`);
  checks.push('Canvas 非空：实际画面像素多样性');
  await page.screenshot({ path: 'docs/screenshots/overview.png' });
  const original = await inspect(page);
  await page.mouse.move(790, 460); await page.mouse.down(); await page.mouse.move(910, 510, { steps: 12 }); await page.mouse.up(); await wait(page);
  assert.ok(moved(original.camera, (await inspect(page)).camera));
  checks.push('鼠标左键拖动旋转');
  const distance = (await inspect(page)).distance;
  await page.mouse.wheel(0, -330); await wait(page);
  assert.ok((await inspect(page)).distance < distance);
  checks.push('滚轮放大');
  const target = (await inspect(page)).target;
  await page.mouse.move(740, 430); await page.mouse.down({ button: 'right' }); await page.mouse.move(830, 440, { steps: 10 }); await page.mouse.up({ button: 'right' }); await wait(page);
  assert.ok(moved(target, (await inspect(page)).target));
  checks.push('鼠标右键平移');
  await page.locator('#reset').click(); await wait(page);
  assert.ok(Math.abs((await inspect(page)).distance - original.distance) < 1);
  checks.push('当前视角重置');
  for (const view of ['tower', 'launch', 'climber', 'overview']) {
    await page.locator(`button[data-view=${view}]`).click(); await wait(page);
    assert.equal(await page.locator(`button[data-view=${view}]`).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => window.__ELEVATOR__.state.view), view);
    if (view !== 'overview') {
      await page.locator('.intro').waitFor({ state: 'hidden' });
      assert.equal(await page.locator('.intro').isVisible(), false);
    }
    if (view === 'climber') {
      assert.ok((await inspect(page)).visibleWindows >= 1, '轿厢预设镜头射线必须首先命中短窗，而非埋入壳体');
      checks.push('轿厢短窗实际可见，不被蒙皮遮挡');
    }
    await page.screenshot({ path: `docs/screenshots/${view}.png` });
  }
  checks.push('四个平滑预设镜头与近景隐藏标题');
  await page.locator('#enter-cabin').click(); await wait(page);
  assert.equal(await page.evaluate(() => window.__ELEVATOR__.state.view), 'interior');
  for (const [room, seats] of [['passenger', 24], ['control', 3], ['cargo', 0]]) {
    await page.locator(`button[data-cabin=${room}]`).click(); await wait(page);
    const current = await inspect(page);
    assert.equal(current.interior.room, room);
    assert.equal(current.interior.seats, seats);
    assert.equal(await page.locator(`button[data-cabin=${room}]`).getAttribute('aria-pressed'), 'true');
    assert.ok(current.triangles > 8000 && current.triangles < 30000);
    assert.ok(current.drawCalls < 70);
    await page.screenshot({ path: `docs/screenshots/interior-${room}.png` });
  }
  checks.push('第五机位及三舱：24 座乘客舱、3 席操控舱、顶置吊机货舱实际渲染');
  const interiorCamera = (await inspect(page)).camera;
  await page.mouse.move(750, 470); await page.mouse.down(); await page.mouse.move(810, 485, { steps: 8 }); await page.mouse.up(); await wait(page);
  assert.ok(moved(interiorCamera, (await inspect(page)).camera));
  const bounds = (await inspect(page)).camera;
  assert.ok(Math.abs(bounds[0]) <= 3.95 && bounds[1] >= .35 && bounds[1] <= 3.2 && Math.abs(bounds[2]) <= 6.3);
  await page.locator('#light').click(); await wait(page);
  assert.equal(await page.evaluate(() => window.__ELEVATOR__.state.night), true);
  await page.screenshot({ path: '.runtime/launch-interior-tests/interior-night.png' });
  await page.locator('#light').click();
  checks.push('舱内拖动、相机边界和昼夜照明');
  await page.locator('button[data-view=overview]').click(); await wait(page);
  await page.locator('#launch-trigger').click();
  await page.waitForFunction(() => window.__ELEVATOR__.inspect().launch.time > .2);
  assert.equal(await page.evaluate(() => window.__ELEVATOR__.state.view), 'launch');
  assert.equal((await inspect(page)).launch.phase, 'charge');
  await page.locator('#motion').click(); await wait(page);
  const launchPaused = (await inspect(page)).launch.time;
  await wait(page); assert.equal((await inspect(page)).launch.time, launchPaused);
  checks.push('发射准备和共享暂停：模拟时间及轿厢位置冻结');
  const seek = async time => {
    await page.locator('#launch-seek').evaluate((element, value) => { element.value = value; element.dispatchEvent(new Event('input', { bubbles: true })); }, String(time));
    await wait(page);
  };
  await seek(2.8);
  assert.equal((await inspect(page)).launch.phase, 'release');
  assert.ok((await inspect(page)).launch.arm > 0);
  await seek(4.8);
  const boost = await inspect(page);
  assert.equal(boost.launch.phase, 'boost');
  assert.ok(boost.launch.thrust > .9 && boost.launchHeight > 17);
  assert.ok(boost.visibleLaunch >= 1, '发射近景必须实际看见轿厢，不可被主塔/斜撑遮住');
  await page.screenshot({ path: 'docs/screenshots/launch-boost.png' });
  checks.push('连杆解锁、塔侧助推和发射轿厢真实射线可见性');
  await page.locator('#motion').click();
  await page.waitForFunction(y => window.__ELEVATOR__.inspect().launchHeight > y + .2, boost.launchHeight);
  const following = await inspect(page);
  assert.ok(following.target[1] > boost.target[1]);
  await page.locator('#motion').click();
  await seek(9);
  assert.equal((await inspect(page)).launch.phase, 'climb');
  await page.locator('#launch-seek').focus(); await page.keyboard.press('End'); await wait(page);
  assert.equal((await inspect(page)).launch.phase, 'complete');
  assert.equal((await inspect(page)).launchHeight, 175);
  await wait(page); assert.equal((await inspect(page)).launchHeight, 175);
  checks.push('真实播放驱动上升与镜头跟随；进度键盘操作、爬升与终点不循环跳回');
  const complete = await inspect(page);
  await seek(4.8);
  const scrubbed = await inspect(page);
  assert.ok(Math.abs(scrubbed.target[1] - complete.target[1] - (scrubbed.launchHeight - complete.launchHeight)) < .05);
  await page.locator('#launch-follow').uncheck();
  await seek(11);
  const detached = await inspect(page);
  assert.ok(Math.abs(detached.camera[1] - scrubbed.camera[1]) < .05);
  assert.ok(Math.abs(detached.target[1] - scrubbed.target[1]) < .05);
  await page.locator('#launch-follow').check(); await wait(page);
  assert.ok(Math.abs((await inspect(page)).target[1] - detached.launchHeight - 2) < .05);
  checks.push('进度回拖无重复位移；关闭跟随固定镜头、重新跟随对齐当前轿厢');
  await page.locator('#launch-trigger').click();
  assert.ok((await inspect(page)).launch.time < 1);
  await page.locator('#motion').click();
  await page.locator('#launch-reset').click(); await wait(page);
  assert.equal((await inspect(page)).launch.phase, 'ready');
  assert.equal((await inspect(page)).launchHeight, 17);
  assert.ok(Math.abs((await inspect(page)).target[1] - 19) < .05);
  await page.locator('button[data-view=overview]').click(); await wait(page);
  checks.push('发射重播、复位与外景返回');
  await page.locator('#auto').click(); const beforeAuto = await inspect(page); await wait(page);
  assert.ok(moved(beforeAuto.camera, (await inspect(page)).camera)); await page.locator('#auto').click();
  checks.push('自动环绕开关');
  await page.locator('#motion').click(); const beforeMotion = (await inspect(page)).climberY; await wait(page);
  assert.ok((await inspect(page)).climberY > beforeMotion); await page.locator('#motion').click();
  const paused = (await inspect(page)).climberY; await wait(page); assert.equal((await inspect(page)).climberY, paused);
  checks.push('轿厢运行与暂停');
  await page.locator('#light').click(); await wait(page);
  assert.equal(await page.evaluate(() => window.__ELEVATOR__.state.night), true);
  await page.screenshot({ path: 'docs/screenshots/night.png' });
  await page.locator('#light').click();
  checks.push('昼夜切换');
  await page.locator('#annotations').click();
  await page.waitForFunction(() => [...document.querySelectorAll('.model-label')].some(element => !element.hidden));
  assert.ok(await page.locator('.model-label:visible').count() > 0); await page.locator('#annotations').click();
  await page.waitForFunction(() => [...document.querySelectorAll('.model-label')].every(element => element.hidden));
  assert.equal(await page.locator('.model-label:visible').count(), 0);
  checks.push('结构标注开关');
  for (const dialog of ['structure', 'about']) {
    await page.locator(`#${dialog}-open`).click(); assert.ok(await page.locator(`#${dialog}-dialog`).isVisible());
    await page.keyboard.press('Escape'); assert.equal(await page.locator(`#${dialog}-dialog`).isVisible(), false);
  }
  checks.push('结构说明和来源弹窗 / Escape 关闭');
  await page.locator('#fullscreen').click(); await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => !!document.fullscreenElement)); await page.locator('#fullscreen').click();
  checks.push('浏览器全屏进入与退出');
  const perf = await inspect(page);
  await page.close();

  const mobile = await browser.newContext({ ...devices['iPhone 13'], defaultBrowserType: undefined });
  const touchPage = await mobile.newPage(); watch(touchPage);
  await touchPage.goto(`${base}?test=1&motion=0`); await touchPage.waitForFunction(() => document.documentElement.dataset.sceneReady === 'true'); await wait(touchPage);
  assert.equal(await touchPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await touchPage.screenshot({ path: 'docs/screenshots/mobile.png' });
  checks.push('390 × 664 CSS 移动视口 / 无横向溢出');
  const cdp = await mobile.newCDPSession(touchPage);
  const dispatch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id, radiusX: 5, radiusY: 5, force: 1 })) });
  const touchBefore = (await inspect(touchPage)).camera;
  await dispatch('touchStart', [[160, 400]]);
  for (let i = 1; i <= 8; i++) await dispatch('touchMove', [[160 + i * 12, 400 + i * 3]]);
  await dispatch('touchEnd', []); await wait(touchPage);
  assert.ok(moved(touchBefore, (await inspect(touchPage)).camera)); checks.push('Chromium 模拟真实 touch 单指旋转');
  const pinchBefore = (await inspect(touchPage)).distance;
  await dispatch('touchStart', [[130, 400], [240, 400]]);
  for (let i = 1; i <= 8; i++) await dispatch('touchMove', [[130 - i * 6, 400], [240 + i * 6, 400]]);
  await dispatch('touchEnd', []); await wait(touchPage);
  assert.ok((await inspect(touchPage)).distance < pinchBefore); checks.push('Chromium 模拟双指张开放大');
  const panBefore = (await inspect(touchPage)).target;
  await dispatch('touchStart', [[110, 380], [230, 380]]);
  for (let i = 1; i <= 6; i++) await dispatch('touchMove', [[110 + i * 5, 380 + i * 5], [230 + i * 5, 380 + i * 5]]);
  await dispatch('touchEnd', []); await wait(touchPage);
  assert.ok(moved(panBefore, (await inspect(touchPage)).target)); checks.push('Chromium 模拟双指平移');
  await touchPage.locator('button[data-view=climber]').tap(); await wait(touchPage);
  assert.equal(await touchPage.evaluate(() => window.__ELEVATOR__.state.view), 'climber');
  await touchPage.screenshot({ path: '.runtime/launch-interior-tests/mobile-climber-test.png' });
  checks.push('移动端预设镜头触控');
  assert.ok((await inspect(touchPage)).visibleWindows >= 1);
  for (const view of ['tower', 'launch', 'overview']) {
    await touchPage.locator(`button[data-view=${view}]`).tap(); await wait(touchPage);
    assert.equal(await touchPage.evaluate(() => window.__ELEVATOR__.state.view), view);
    assert.equal(await touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const cost = await inspect(touchPage);
    assert.ok(cost.drawCalls < 240 && cost.triangles < 320000);
    await touchPage.screenshot({ path: `.runtime/launch-interior-tests/mobile-${view}-test.png` });
  }
  checks.push('移动外景四机位、可见短窗与 <240 calls / <320000 triangles 预算');
  await touchPage.locator('button[data-view=interior]').tap(); await wait(touchPage);
  for (const room of ['passenger', 'control', 'cargo']) {
    await touchPage.locator(`button[data-cabin=${room}]`).tap(); await wait(touchPage);
    assert.equal((await inspect(touchPage)).interior.room, room);
    assert.equal(await touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await touchPage.screenshot({ path: `.runtime/launch-interior-tests/mobile-interior-${room}.png` });
  }
  checks.push('移动第五机位与三舱切换、无布局溢出');
  await touchPage.locator('button[data-view=launch]').tap(); await wait(touchPage);
  await touchPage.locator('#launch-trigger').tap();
  await touchPage.waitForFunction(() => window.__ELEVATOR__.inspect().launch.time > .1);
  await touchPage.locator('#motion').tap();
  await touchPage.locator('#launch-seek').evaluate(element => { element.value = 4.8; element.dispatchEvent(new Event('input', { bubbles: true })); });
  await wait(touchPage);
  assert.equal((await inspect(touchPage)).launch.phase, 'boost');
  assert.ok((await inspect(touchPage)).visibleLaunch >= 1);
  assert.equal(await touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await touchPage.screenshot({ path: '.runtime/launch-interior-tests/mobile-launch-boost.png' });
  checks.push('移动触控发射、暂停、进度和真实可见轿厢');
  await mobile.close();

  const prefix = '/nested/projects/OpenCode/GPT-6-1-Sol/';
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
  staticServer = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
    const path = resolve('dist', pathname.slice(prefix.length) || 'index.html');
    if (!path.startsWith(resolve('dist') + '/')) { response.writeHead(403).end(); return; }
    try { response.writeHead(200, { 'content-type': mime[extname(path)] || 'application/octet-stream' }).end(await readFile(path)); }
    catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => staticServer.listen(0, '127.0.0.1', resolve));
  const nestedPage = await browser.newPage(); watch(nestedPage);
  await nestedPage.goto(`http://127.0.0.1:${staticServer.address().port}${prefix}?test=1&motion=0`);
  await nestedPage.waitForFunction(() => document.documentElement.dataset.sceneReady === 'true');
  assert.ok((await inspect(nestedPage)).triangles > 0); checks.push('多级相对子路径静态部署可渲染');
  await nestedPage.goto(`http://127.0.0.1:${staticServer.address().port}${prefix}?test=1&view=interior&cabin=cargo&motion=0`);
  await nestedPage.waitForFunction(() => document.documentElement.dataset.sceneReady === 'true');
  assert.equal((await inspect(nestedPage)).interior.room, 'cargo');
  checks.push('深层部署 URL 可直接进入货舱，无外部运行时资源');
  await nestedPage.close();

  const reduced = await browser.newPage({ reducedMotion: 'reduce' });
  watch(reduced); await reduced.goto(`${base}?test=1`); await reduced.waitForFunction(() => document.documentElement.dataset.sceneReady === 'true');
  assert.equal(await reduced.evaluate(() => window.__ELEVATOR__.state.motion), false); checks.push('减少动态偏好默认暂停轿厢');
  assert.equal((await inspect(reduced)).launch.started, false);
  await reduced.locator('#launch-trigger').click();
  await reduced.waitForFunction(() => window.__ELEVATOR__.inspect().launch.time > .1);
  await reduced.locator('#motion').click();
  assert.equal((await inspect(reduced)).launch.playing, false);
  checks.push('减少动态偏好不自动发射；用户显式发射及暂停仍可用');
  await reduced.locator('#launch-seek').evaluate(element => { element.value = 15; element.dispatchEvent(new Event('input', { bubbles: true })); });
  await wait(reduced);
  await reduced.locator('#launch-trigger').click();
  await reduced.waitForFunction(() => window.__ELEVATOR__.inspect().launch.time > .1);
  await reduced.locator('#motion').click(); await wait(reduced);
  const replay = await inspect(reduced);
  assert.ok(replay.launch.time < 2.4);
  assert.ok(Math.abs(replay.target[1] - replay.launchHeight - 2) < .05);
  checks.push('减少动态偏好下完成后重播，即时镜头不重复叠加高度差');
  assert.ok(perf.drawCalls < 240);
  assert.ok(perf.triangles < 400000);
  checks.push(`全景绘制调用 ${perf.drawCalls} / 三角形 ${perf.triangles}，含离屏成像及阴影的预算 <240 / <400000`);
  assert.deepEqual(errors, []); checks.push('控制台异常、请求失败、HTTP 4xx/5xx 均为 0');
  const report = { result: 'passed', preview: base, browser: await browser.version(), checks, errors, performance: { overview: { drawCalls: perf.drawCalls, triangles: perf.triangles } }, note: 'Headless Chromium / SwiftShader：触屏为 CDP 模拟，非真机测试；不宣称真实设备帧率。' };
  await writeFile('.runtime/browser-results.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (staticServer) await new Promise(resolve => staticServer.close(resolve));
  await browser.close();
}
