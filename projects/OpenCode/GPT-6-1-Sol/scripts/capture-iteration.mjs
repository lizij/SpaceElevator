import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';

const stage = process.argv[2];
if (!['baseline', 'round-1', 'round-2', 'round-3'].includes(stage)) throw new Error('Specify baseline or round-1/2/3');
const directory = `.runtime/iterations/${stage}`;
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const results = {};
try {
  for (const [name, view, width, height, night] of [
    ['overview', 'overview', 1440, 900, false], ['tower', 'tower', 1440, 900, false],
    ['launch', 'launch', 1440, 900, false], ['climber', 'climber', 1440, 900, false],
    ['night', 'overview', 1440, 900, true], ['mobile', 'overview', 390, 844, false],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce', hasTouch: width < 700 });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(`http://127.0.0.1:4176/?test=1&motion=0&view=${view}&night=${night ? 1 : 0}`);
    await page.waitForFunction(() => document.documentElement.dataset.sceneReady === 'true');
    await page.waitForTimeout(700);
    results[name] = await page.evaluate(() => ({ ...window.__ELEVATOR__.inspect(), overflow: document.documentElement.scrollWidth > innerWidth }));
    await page.screenshot({ path: `${directory}/${name}.png` });
    if (stage === 'round-3' && ['tower', 'launch', 'climber'].includes(name)) {
      const previous = JSON.parse(await readFile('.runtime/iterations/round-2/results.json', 'utf8')).results[name];
      await page.evaluate(({ camera, target }) => window.__ELEVATOR__.setInspectionCamera(camera, target), previous);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${directory}/${name}-comparison.png` });
    }
    await page.close();
  }
  await writeFile(`${directory}/results.json`, JSON.stringify({ stage, results, errors }, null, 2));
  console.log(JSON.stringify({ stage, results, errors }, null, 2));
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }
