/**
 * Genera las imágenes para la Chrome Web Store usando la interfaz REAL de la extensión
 * (cargada en Chromium) sobre una composición de marketing, con contenido de ejemplo.
 *
 *   node scripts/store-assets.mjs
 *
 * Salida: store/screenshots/*.png (1280x800), store/promo-small-440x280.png, store/marquee-1400x560.png
 */
import { createRequire } from 'node:module';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
import vm from 'node:vm';
const iconSandbox = {};
vm.runInNewContext(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/shared/icons.js'), 'utf8'), { globalThis: iconSandbox });
const ICON = (n) => iconSandbox.SubmeIcons.icon(n).replace('width="16" height="16"', 'width="18" height="18"');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'store');
const SHOTS = path.join(OUT, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

/* ---------------- contenido de ejemplo ---------------- */
import { VIDEO_ID, TITLE, LINES, RESPONSES, pickResponse, playerResponse, initialData, transcriptJson } from './demo-data.mjs';

/* ---------------- API de IA simulada ---------------- */
const sse = (text) => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`;
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const last = JSON.parse(body).messages.at(-1).content;
    const text = pickResponse(last);
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`);
    res.end();
  });
});
await new Promise((r) => server.listen(0, r));
const API = `http://127.0.0.1:${server.address().port}/v1`;

/* ---------------- composición ---------------- */
const css = `
  * { box-sizing: border-box; margin: 0; }
  body { width: 1280px; height: 800px; overflow: hidden; font-family: Inter, "Segoe UI", Roboto, system-ui, sans-serif;
    background: radial-gradient(1200px 700px at 0% 0%, #efe9ff 0%, #f7f5ff 45%, #fff 100%); color: #14121f; }
  body.dark { background: radial-gradient(1200px 700px at 0% 0%, #2a1f55 0%, #15131f 55%, #0e0d14 100%); color: #f3f1ff; }
  ytd-watch-flexy { display: flex; gap: 40px; padding: 48px 48px 0 64px; height: 800px; }
  #primary { flex: 1; padding-top: 24px; }
  #secondary { width: 440px; flex: none; height: 752px; overflow: hidden; display: block; }
  #secondary-inner { display: block; }
  .kicker { display: inline-flex; gap: 8px; align-items: center; font-weight: 600; color: #6d4aff; background: rgba(109,74,255,.1); padding: 6px 12px; border-radius: 999px; font-size: 15px; }
  body.dark .kicker { color: #b9a8ff; background: rgba(155,133,255,.16); }
  h1 { font-size: 46px; line-height: 1.1; letter-spacing: -0.02em; margin: 22px 0 16px; font-weight: 800; }
  h1 em { font-style: normal; background: linear-gradient(90deg, #6d4aff, #ff3d7f); -webkit-background-clip: text; color: transparent; }
  p.lead { font-size: 20px; line-height: 1.5; color: #4b4860; max-width: 600px; }
  body.dark p.lead { color: #c4c0d8; }
  .video { margin-top: 34px; width: 620px; aspect-ratio: 16/9; border-radius: 18px; position: relative; overflow: hidden;
    background: linear-gradient(135deg, #3b2a8f, #ff6a8b 120%); box-shadow: 0 18px 50px rgba(60, 30, 140, .25); }
  .video::before { content: ""; position: absolute; inset: 0; background: radial-gradient(400px 220px at 75% 30%, rgba(255,255,255,.25), transparent); }
  .video .play { position: absolute; left: 50%; top: 45%; transform: translate(-50%,-50%); width: 84px; height: 84px; border-radius: 50%; background: rgba(255,255,255,.92); display: grid; place-items: center; }
  .video .play::after { content: ""; border-left: 26px solid #3b2a8f; border-top: 16px solid transparent; border-bottom: 16px solid transparent; margin-left: 6px; }
  .video .vt { position: absolute; left: 22px; bottom: 18px; right: 22px; color: #fff; font-size: 22px; font-weight: 700; text-shadow: 0 2px 10px rgba(0,0,0,.3); }
  .video .bar { position: absolute; left: 0; bottom: 0; height: 5px; width: 38%; background: #ff3d7f; }
  video { display: none; }
  .short { margin: 18px 0 0 120px; width: 300px; height: 533px; border-radius: 22px; background: linear-gradient(180deg, #ff6a8b, #3b2a8f); position: relative; box-shadow: 0 18px 50px rgba(0,0,0,.45); }
  .short .vt { position: absolute; left: 18px; right: 18px; bottom: 26px; color: #fff; font-weight: 700; font-size: 19px; }
  .short .play { position: absolute; left: 50%; top: 45%; transform: translate(-50%,-50%); width: 70px; height: 70px; border-radius: 50%; background: rgba(255,255,255,.9); }
  .short .play::after { content: ""; position: absolute; left: 27px; top: 20px; border-left: 22px solid #3b2a8f; border-top: 15px solid transparent; border-bottom: 15px solid transparent; }
`;

function page({ kicker, title, lead, dark = false, shorts = false }) {
  const left = shorts
    ? `<div class="kicker">${kicker}</div><h1>${title}</h1><p class="lead">${lead}</p><div class="short"><div class="play"></div><div class="vt">3 trucos para recordar vocabulario</div></div>`
    : `<div class="kicker">${kicker}</div><h1>${title}</h1><p class="lead">${lead}</p><div class="video"><div class="play"></div><div class="vt">${TITLE}</div><div class="bar"></div></div>`;
  return `<!doctype html><html lang="es"${dark ? ' dark' : ''}><head><meta charset="utf-8"><title>${TITLE}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet"><style>${css}</style></head>
  <body class="${dark ? 'dark' : ''}"><ytd-app><ytd-watch-flexy>
    <div id="primary">${left}<video class="html5-main-video" muted></video>${shorts ? '<ytd-shorts><ytd-reel-video-renderer is-active><video muted></video></ytd-reel-video-renderer></ytd-shorts>' : ''}</div>
    ${shorts ? '' : '<div id="secondary"><div id="secondary-inner"></div></div>'}
  </ytd-watch-flexy></ytd-app>
  <script>var ytInitialPlayerResponse = ${JSON.stringify(playerResponse)};</script>
  <script>var ytInitialData = ${JSON.stringify(initialData)};</script>
  <script>var ytcfg={set(){}};ytcfg.set({"INNERTUBE_API_KEY":"K","INNERTUBE_CLIENT_VERSION":"2.2026"});</script>
  </body></html>`;
}

const SCENES = {
  transcript: { kicker: `${ICON('transcript')} Transcripción`, title: 'La transcripción completa, <em>al lado del video</em>', lead: 'Busca palabras, haz clic en cualquier línea para saltar a ese momento y descárgala en TXT, SRT, VTT o Markdown.' },
  summary: { kicker: `${ICON('sparkles')} Resúmenes con IA`, title: 'Entiende un video de 15 minutos <em>en 30 segundos</em>', lead: 'Resúmenes, puntos clave, apuntes, quizzes y flashcards con tu propia API key, del proveedor de IA que prefieras.' },
  chapters: { kicker: `${ICON('mindmap')} Mapa mental`, title: 'Capítulos con marcas de tiempo <em>clicables</em>', lead: 'Cada marca de tiempo de la IA te lleva directo a ese momento del video.' },
  chat: { kicker: `${ICON('chat')} Chat`, title: 'Hazle preguntas <em>al video</em>', lead: 'Responde a partir de lo que realmente se dice e indica en qué minuto lo encuentras.', dark: true },
  shorts: { kicker: `${ICON('phone')} YouTube Shorts`, title: 'También funciona <em>en Shorts</em>', lead: 'Un panel flotante con la transcripción y todas las acciones de IA.', dark: true, shorts: true },
};

/* ---------------- navegador ---------------- */
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'subme-store-'));
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: true,
  channel: 'chromium',
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  args: [`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`, '--lang=es'],
});

let scene = 'transcript';
let openrouterRouted = false;
await context.route('https://openrouter.ai/**', (route) => {
  openrouterRouted = true;
  const last = JSON.parse(route.request().postData()).messages.at(-1).content;
  return route.fulfill({ status: 200, headers: { 'Content-Type': 'text/event-stream' }, body: sse(pickResponse(last)) });
});
await context.route('https://i.ytimg.com/**', (route) => route.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(path.join(ROOT, 'scripts/assets/demo-thumb.jpg')) }));
await context.route('https://www.youtube.com/**', (route) => {
  const url = route.request().url();
  if (url.includes('/youtubei/v1/get_transcript')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(transcriptJson) });
  if (url.includes('/watch') || url.includes('/shorts/')) return route.fulfill({ contentType: 'text/html', body: page(SCENES[scene]) });
  return route.fulfill({ status: 404, body: '' });
});

try {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  const extId = new URL(sw.url()).host;

  const opts = context.pages().find((p) => p.url().includes('options.html')) || await context.newPage();
  if (!opts.url().includes('options.html')) await opts.goto(`chrome-extension://${extId}/src/options/options.html`);
  await opts.waitForSelector('.provider');

  // Captura de la configuración (con datos ficticios, sin clave real)
  await opts.evaluate(async () => {
    const { settings = {} } = await chrome.storage.local.get('settings');
    settings.provider = 'anthropic';
    settings.providers = { anthropic: { apiKey: 'sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx', model: '' }, openrouter: { apiKey: 'sk-or-xxxx', model: '' } };
    await chrome.storage.local.set({ settings });
  });
  await opts.reload();
  await opts.waitForSelector('.provider.active');
  await opts.emulateMedia({ colorScheme: 'light' });
  await opts.screenshot({ path: path.join(SHOTS, '6-configuracion.png') });

  // Si Playwright puede interceptar el service worker se muestra OpenRouter; si no, la API local.
  await opts.evaluate(async () => {
    await chrome.storage.local.set({ settings: { onboardingDone: true, provider: 'openrouter', providers: { openrouter: { apiKey: 'demo', model: 'anthropic/claude-opus-5.5' } }, responseLanguage: 'es' } });
  });
  const probe = await opts.evaluate(() => chrome.runtime.sendMessage({ type: 'testProvider', providerId: 'openrouter' }));
  if (!probe.ok || !openrouterRouted) {
    console.log('Sin intercepción del service worker; usando API local.');
    await opts.evaluate(async (api) => {
      await chrome.storage.local.set({ settings: { onboardingDone: true, provider: 'custom', providers: { custom: { baseUrl: api, model: 'claude-opus-5-5', apiKey: '' } }, responseLanguage: 'es' } });
    }, API);
  }

  const shoot = async (name, setup) => {
    scene = name;
    const p = await context.newPage();
    await p.goto(name === 'shorts' ? 'https://www.youtube.com/shorts/demoShort001' : `https://www.youtube.com/watch?v=${VIDEO_ID}`);
    await p.waitForFunction(() => document.querySelector('#subme-now-host')?.shadowRoot.querySelector('.sn-seg'), null, { timeout: 15000 });
    await p.evaluate(() => document.fonts.ready);
    if (setup) await setup(p);
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(SHOTS, `${name}.png`) });
    await p.close();
  };
  const sr = '#subme-now-host';
  const waitOutput = (p, sel) => p.waitForFunction((s) => {
    const el = document.querySelector('#subme-now-host').shadowRoot.querySelector(s);
    return el && el.textContent.length > 50 && !el.querySelector('.sn-spinner');
  }, sel, { timeout: 15000 }).catch(async (e) => {
    console.log('DEBUG', await p.evaluate((s) => document.querySelector('#subme-now-host').shadowRoot.querySelector(s)?.innerHTML, sel));
    throw e;
  });

  // Oculta la grilla de acciones para que el resultado se vea completo en la captura.
  const hideGrid = async (p) => { await p.waitForTimeout(800); return hideGridNow(p); };
  const hideGridNow = (p) => p.evaluate(() => {
    const r = document.querySelector('#subme-now-host').shadowRoot;
    r.querySelector('[data-ref="actions"]').style.display = 'none';
    r.querySelector('.sn-free').style.display = 'none';
    const sec = document.querySelector('#secondary');
    if (sec) sec.scrollTop = 0;
    r.querySelector('.sn-body').scrollTop = 0;
  });

  await shoot('transcript', async (p) => {
    await p.locator(`${sr} .sn-seg`).nth(5).click();
    await p.evaluate(() => {
      const r = document.querySelector('#subme-now-host').shadowRoot;
      r.querySelectorAll('.sn-seg').forEach((e) => e.classList.remove('current'));
      r.querySelectorAll('.sn-seg')[6].classList.add('current');
    });
  });
  await shoot('summary', async (p) => {
    await p.locator(`${sr} [data-tab="ai"]`).click();
    await p.locator(`${sr} [data-action="summary"]`).click();
    await waitOutput(p, '.sn-output');
    await hideGrid(p);
  });
  await shoot('chapters', async (p) => {
    await p.locator(`${sr} [data-tab="ai"]`).click();
    await p.locator(`${sr} [data-action="mindmap"]`).click();
    await p.locator(`${sr} .mm-view svg`).waitFor({ timeout: 15000 });
    await p.locator(`${sr} [data-mm="expand"]`).click();
    await p.locator(`${sr} [data-mm="full"]`).click();
    await p.locator(`${sr} .mm-overlay .mm-view svg`).waitFor({ timeout: 5000 });
  });
  await shoot('chat', async (p) => {
    await p.locator(`${sr} [data-tab="chat"]`).click();
    await p.locator(`${sr} [data-ref="chatinput"]`).fill('¿Cuál es la rutina diaria que recomienda?');
    await p.locator(`${sr} [data-ref="chatinput"]`).press('Enter');
    await waitOutput(p, '.sn-msg.assistant');
  });
  await shoot('shorts', async (p) => {
    await p.locator(`${sr} [data-tab="ai"]`).click();
    await p.locator(`${sr} [data-action="keypoints"]`).click();
    await waitOutput(p, '.sn-output');
    await hideGrid(p);
  });

  // Renombrar en orden
  const order = { transcript: '1-transcripcion.png', summary: '2-resumen-ia.png', chapters: '3-mapa-mental.png', chat: '4-chat.png', shorts: '5-shorts.png' };
  for (const [from, to] of Object.entries(order)) fs.renameSync(path.join(SHOTS, `${from}.png`), path.join(SHOTS, to));

  // Imágenes promocionales
  const promo = await context.newPage();
  const logo = `data:image/png;base64,${fs.readFileSync(path.join(ROOT, 'icons/icon128.png')).toString('base64')}`;
  const promoHtml = (w, h, big) => `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;800&display=swap" rel="stylesheet">
    <style>*{margin:0;box-sizing:border-box}body{width:${w}px;height:${h}px;overflow:hidden;font-family:Inter,system-ui,sans-serif;color:#fff;
    background:radial-gradient(${w}px ${h}px at 0% 0%,#7b5cff 0%,#4a2fd6 45%,#e2366f 120%);display:flex;align-items:center;padding:0 ${big ? 110 : 34}px;gap:${big ? 48 : 20}px}
    img{width:${big ? 190 : 92}px;height:${big ? 190 : 92}px;border-radius:${big ? 44 : 22}px;box-shadow:0 14px 40px rgba(0,0,0,.3)}
    h1{font-size:${big ? 78 : 38}px;font-weight:800;letter-spacing:-.02em;line-height:1}
    p{font-size:${big ? 30 : 16}px;font-weight:500;margin-top:${big ? 18 : 10}px;opacity:.92;line-height:1.3;max-width:${big ? 820 : 260}px}
    .chips{display:flex;gap:10px;margin-top:22px;flex-wrap:wrap}.chips span{background:rgba(255,255,255,.18);padding:8px 16px;border-radius:999px;font-size:20px;display:inline-flex;align-items:center;gap:8px}</style></head>
    <body><img src="${logo}"><div><h1>Subme Now</h1><p>Transcripciones y resúmenes con IA para YouTube</p>
    ${big ? `<div class="chips"><span>${ICON('transcript')} Transcripción</span><span>${ICON('sparkles')} Resúmenes</span><span>${ICON('mindmap')} Mapas mentales</span><span>${ICON('chat')} Chat</span><span>${ICON('phone')} Shorts</span></div>` : ''}</div></body></html>`;
  await promo.setViewportSize({ width: 440, height: 280 });
  await promo.setContent(promoHtml(440, 280, false));
  await promo.evaluate(() => document.fonts.ready);
  await promo.screenshot({ path: path.join(OUT, 'promo-small-440x280.png') });
  await promo.setViewportSize({ width: 1400, height: 560 });
  await promo.setContent(promoHtml(1400, 560, true));
  await promo.evaluate(() => document.fonts.ready);
  await promo.screenshot({ path: path.join(OUT, 'marquee-1400x560.png') });

  console.log('Imágenes generadas en', OUT);
} finally {
  await context.close();
  server.close();
}
