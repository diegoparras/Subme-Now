/**
 * Galería de las vistas gráficas y de las ventanas desacoplables, con contenido de ejemplo.
 *
 *   node scripts/views-gallery.mjs
 *
 * Salida: marketing/vistas/*.png
 */
import { createRequire } from 'node:module';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { VIDEO_ID, pickResponse, playerResponse, initialData, transcriptJson, TITLE } from './demo-data.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'marketing', 'vistas');
fs.mkdirSync(OUT, { recursive: true });

const sse = (text) => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`;
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => { res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.end(sse(pickResponse(JSON.parse(body).messages.at(-1).content))); });
});
await new Promise((r) => server.listen(0, r));
const API = `http://127.0.0.1:${server.address().port}/v1`;

const page = (dark) => `<!doctype html><html lang="es"${dark ? ' dark' : ''}><head><meta charset="utf-8"><title>${TITLE}</title>
<style>body{margin:0;background:${dark ? '#0f0f0f' : '#f2f2f2'};font-family:Roboto,sans-serif}ytd-watch-flexy{display:flex;gap:24px;padding:24px}#primary{flex:1}
.fake{aspect-ratio:16/9;border-radius:12px;background:linear-gradient(135deg,#1d1a3a,#3a2470 55%,#7a2c6a);color:#fff;font:800 34px Inter,sans-serif;padding:40px;box-sizing:border-box}
#secondary{width:440px;display:block}#secondary-inner{display:block}video{display:none}</style></head>
<body><ytd-app><ytd-watch-flexy><div id="primary"><div class="fake">${TITLE}</div><video class="html5-main-video" muted></video></div><div id="secondary"><div id="secondary-inner"></div></div></ytd-watch-flexy></ytd-app>
<script>var ytInitialPlayerResponse = ${JSON.stringify(playerResponse)};</script>
<script>var ytInitialData = ${JSON.stringify(initialData)};</script>
<script>var ytcfg={set(){}};ytcfg.set({"INNERTUBE_API_KEY":"K","INNERTUBE_CLIENT_VERSION":"2.2026"});</script></body></html>`;

const context = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'subme-gal-')), {
  headless: true, channel: 'chromium', viewport: { width: 1360, height: 1000 }, deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`, '--lang=es'],
});
await context.route('https://i.ytimg.com/**', (route) => route.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(path.join(ROOT, 'scripts/assets/demo-thumb.jpg')) }));
await context.route('https://www.youtube.com/**', (route) => {
  const url = route.request().url();
  if (url.includes('/youtubei/v1/get_transcript')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(transcriptJson) });
  if (url.includes('/watch')) return route.fulfill({ contentType: 'text/html', body: page(false) });
  return route.fulfill({ status: 404, body: '' });
});

try {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  const extId = new URL(sw.url()).host;
  const opts = await context.newPage();
  await opts.goto(`chrome-extension://${extId}/src/options/options.html`);
  await opts.evaluate(async (api) => {
    await chrome.storage.local.set({ settings: { onboardingDone: true, provider: 'custom', providers: { custom: { baseUrl: api, model: 'claude-opus-5-5', apiKey: '' } }, responseLanguage: 'es' } });
  }, API);

  const p = await context.newPage();
  await p.goto(`https://www.youtube.com/watch?v=${VIDEO_ID}`);
  await p.waitForFunction(() => document.querySelector('#subme-now-host')?.shadowRoot.querySelector('.sn-seg'), null, { timeout: 15000 });
  await p.locator('#subme-now-host [data-tab="ai"]').click();
  const sr = '#subme-now-host';
  const shot = async (id, setup) => {
    await p.locator(`${sr} [data-action="${id}"]`).click();
    await p.waitForFunction(() => document.querySelector('#subme-now-host').shadowRoot.querySelector('.sn-output .vw'), null, { timeout: 15000 });
    await p.evaluate(() => {
      const r = document.querySelector('#subme-now-host').shadowRoot;
      r.querySelector('[data-ref="actions"]').style.display = 'none';
      r.querySelector('.sn-free').style.display = 'none';
      r.querySelector('.sn-output').style.maxHeight = 'none';
    });
    if (setup) await setup();
    await p.waitForTimeout(500);
    await p.locator(`${sr} .sn-output-wrap`).screenshot({ path: path.join(OUT, `${id}.png`) });
    await p.evaluate(() => {
      const r = document.querySelector('#subme-now-host').shadowRoot;
      r.querySelector('[data-ref="actions"]').style.display = '';
      r.querySelector('.sn-free').style.display = '';
    });
  };
  const o = (sel) => p.locator(`${sr} .sn-output ${sel}`);
  await shot('summary');
  await shot('keypoints');
  await shot('chapters', async () => { await o('.vw-seg').nth(3).click(); });
  await shot('quiz', async () => { await o('.vw-option').nth(1).click(); });
  await shot('flashcards', async () => { await o('.vw-flip').click(); });
  await shot('quotes');
  await shot('steps', async () => { await o('.vw-check').first().click(); });
  await shot('factcheck');
  await shot('thread');
  await shot('linkedin');

  // Ventana flotante con el mapa mental y la transcripción desacoplada
  await p.locator(`${sr} [data-action="mindmap"]`).click();
  await p.locator(`${sr} .mm-view svg`).waitFor({ timeout: 15000 });
  await p.locator(`${sr} [data-act="detachout"]`).click();
  await p.locator('.subme-now-window .mm-view svg').waitFor();
  await p.locator('.subme-now-window [data-mm="expand"]').click();
  await p.locator(`${sr} [data-tab="transcript"]`).click();
  await p.locator(`${sr} [data-act="detachtr"]`).click();
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    const ws = document.querySelectorAll('.subme-now-window');
    Object.assign(ws[0].style, { left: '24px', top: '120px', width: '760px', height: '540px' });
    Object.assign(ws[1].style, { left: '810px', top: '300px', width: '420px', height: '520px' });
  });
  await p.waitForTimeout(400);
  await p.locator('.subme-now-window [data-mm="fit"]').first().click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, 'ventanas-flotantes.png') });
} finally {
  await context.close();
  server.close();
}
console.log('Galería generada en', OUT);
