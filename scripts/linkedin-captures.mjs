/**
 * Capturas REALES de Subme Now para el kit de LinkedIn (video y carrusel), en alta resolución (2×).
 * La extensión corre de verdad en Chromium sobre una página de video con un reproductor real
 * (el video es una clase generada en un canvas). La IA se simula con respuestas de ejemplo.
 * También captura la ficha real de la Chrome Web Store.
 *
 *   node scripts/linkedin-captures.mjs
 *
 * Salida: marketing/linkedin-v17/capturas/*.png
 */
import { createRequire } from 'node:module';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { VIDEO_ID, TITLE, LINES_EN, STRUCTURED, RESPONSES, LIBRARY_DEMO, pickResponse, playerResponse, initialData, transcriptJson } from './demo-data.mjs';

process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'marketing', 'linkedin-v17', 'capturas');
fs.mkdirSync(OUT, { recursive: true });
const STORE_URL = 'https://chromewebstore.google.com/detail/subme-now-ai-yt-transcrip/jjjlomnjhajkhgkjcbikjpfdkplkehna?hl=es';
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';

/* ---------- IA simulada ---------- */
const sse = (text) => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`;
const aiText = (body) => {
  const raw = body.messages.at(-1).content;
  if (Array.isArray(raw) && raw.some((p) => p.type === 'image_url')) {
    return 'En la diapositiva se lee:\n\n> **Los 3 pilares del método**\n> 1. Exposición diaria al idioma\n> 2. Hablar desde el primer día\n> 3. Repetición espaciada (20 palabras por día)\n\nEs el resumen visual de lo que explica en este momento [01:12]: primero entrenas el oído, después la voz y al final fijas el vocabulario.';
  }
  const last = Array.isArray(raw) ? raw.map((p) => p.text || '').join(' ') : raw;
  if (last.includes('número|traducción')) return last.split('\n').map((l) => /^(\d+)\|/.exec(l)).filter(Boolean).map((m) => `${m[1]}|${LINES_EN[Number(m[1])] || ''}`).join('\n');
  if (body.messages[0]?.role === 'system' && body.messages[0].content.includes('biblioteca personal')) {
    return 'Tres de tus videos coinciden: **poco, pero todos los días**.\n\n- En el de idiomas, *la constancia gana a la intensidad*: 30 minutos diarios rinden más que 5 horas un domingo [[V1 00:14]].\n- El de productividad propone bloques fijos en el calendario para no depender de la motivación [[V7]].\n- El de finanzas aplica lo mismo al ahorro: automatizar un porcentaje fijo cada mes [[V2]].\n\n**Para empezar hoy:** elige un hábito, ponle horario y mide tu progreso una vez por mes [[V1 10:00]].';
  }
  if (last.includes('OK')) return 'OK';
  return pickResponse(last);
};
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => { res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.end(sse(aiText(JSON.parse(body)))); });
});
await new Promise((r) => server.listen(0, r));
const API = `http://127.0.0.1:${server.address().port}/v1`;

/* ---------- página de video con reproductor real ---------- */
const watchPage = (dark) => `<!doctype html><html lang="es"${dark ? ' dark' : ''}><head><meta charset="utf-8"><title>${TITLE}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  body { margin: 0; background: ${dark ? '#0f0f0f' : '#fff'}; color: ${dark ? '#f1f1f1' : '#0f0f0f'}; font-family: Inter, Roboto, sans-serif; }
  ytd-watch-flexy { display: flex; gap: 24px; padding: 20px 24px; }
  #primary { flex: 1; min-width: 0; }
  #secondary { width: 420px; flex: none; display: block; }
  #secondary-inner { display: block; }
  .html5-video-player { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #000; border-radius: 14px; overflow: hidden; }
  .html5-video-player video { width: 100%; height: 100%; display: block; object-fit: cover; }
  .ytp-chrome-bottom { position: absolute; left: 0; right: 0; bottom: 0; height: 54px; background: linear-gradient(0deg, rgba(0,0,0,.65), transparent); }
  .ytp-progress-bar { position: absolute; left: 14px; right: 14px; bottom: 40px; height: 5px; background: rgba(255,255,255,.3); border-radius: 3px; }
  .ytp-progress-bar .played { position: absolute; left: 0; top: 0; bottom: 0; width: 26%; background: #f03; border-radius: 3px; }
  .ytp-time { position: absolute; left: 16px; bottom: 12px; color: #fff; font-size: 14px; font-weight: 600; }
  h1 { font-size: 22px; margin: 14px 2px 8px; }
  .chan { display: flex; align-items: center; gap: 10px; font-size: 14px; }
  .chan i { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #6d4aff, #ff3d7f); display: inline-block; }
</style></head>
<body><ytd-app><ytd-watch-flexy>
  <div id="primary">
    <div class="html5-video-player"><video class="html5-main-video" muted playsinline></video>
      <div class="ytp-chrome-bottom"><div class="ytp-progress-bar"><div class="played"></div></div><span class="ytp-time">3:12 / 12:34</span></div></div>
    <h1>${TITLE}</h1><div class="chan"><i></i><b>Aprende+</b></div>
  </div>
  <div id="secondary"><div id="secondary-inner"></div></div>
</ytd-watch-flexy></ytd-app>
<script>var ytInitialPlayerResponse = ${JSON.stringify(playerResponse)};</script>
<script>var ytInitialData = ${JSON.stringify(initialData)};</script>
<script>var ytcfg={set(){}};ytcfg.set({"INNERTUBE_API_KEY":"K","INNERTUBE_CLIENT_VERSION":"2.2026"});</script>
</body></html>`;

/** El "video": una clase de 12:34 (una diapositiva) en un archivo WebM real, generado con ffmpeg. */
const LECTURE = path.join(os.tmpdir(), `subme-clase-${process.pid}.webm`);
async function buildLecture() {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await pg.setContent(`<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;800&display=swap" rel="stylesheet"><body style="margin:0"><canvas width="1280" height="720"></canvas></body>`);
  await pg.evaluate(async () => {
    await document.fonts.load('800 70px Inter'); await document.fonts.load('500 46px Inter'); await document.fonts.load('600 30px Inter');
    const x = document.querySelector('canvas').getContext('2d');
    const g = x.createLinearGradient(0, 0, 1280, 720);
    g.addColorStop(0, '#16123d'); g.addColorStop(1, '#4b2380');
    x.fillStyle = g; x.fillRect(0, 0, 1280, 720);
    x.fillStyle = 'rgba(255,255,255,.06)'; x.beginPath(); x.arc(1080, 140, 220, 0, 7); x.fill();
    x.fillStyle = '#b9a8ff'; x.font = '600 30px Inter'; x.fillText('CLASE 3 · IDIOMAS', 96, 132);
    x.fillStyle = '#fff'; x.font = '800 70px Inter'; x.fillText('Los 3 pilares del método', 92, 220);
    x.fillStyle = '#ff3d7f'; x.fillRect(96, 252, 240, 9);
    x.font = '500 46px Inter';
    ['1.  Exposición diaria al idioma', '2.  Hablar desde el primer día', '3.  Repetición espaciada (20 palabras/día)'].forEach((t, i) => { x.fillStyle = 'rgba(255,255,255,.92)'; x.fillText(t, 110, 380 + i * 96); });
  });
  const png = LECTURE.replace('.webm', '.png');
  await pg.locator('canvas').screenshot({ path: png });
  await b.close();
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-loop', '1', '-i', png, '-t', '754', '-r', '1', '-c:v', 'libvpx-vp9', '-b:v', '150k', '-pix_fmt', 'yuv420p', LECTURE]);
}
await buildLecture();
const LECTURE_B64 = fs.readFileSync(LECTURE).toString('base64');

/** Carga la clase en el <video> real del reproductor y la deja en el segundo indicado. */
async function startLecture(p, at = 192) {
  await p.evaluate(async ({ b64, at }) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const v = document.querySelector('video.html5-main-video');
    v.src = URL.createObjectURL(new Blob([bytes], { type: 'video/webm' }));
    await new Promise((r) => { v.addEventListener('loadeddata', r, { once: true }); setTimeout(r, 8000); });
    v.pause();
    v.currentTime = at;
    await new Promise((r) => { v.addEventListener('seeked', r, { once: true }); setTimeout(r, 4000); });
  }, { b64: LECTURE_B64, at });
}

const context = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'subme-li17-')), {
  headless: true,
  channel: 'chromium',
  viewport: { width: 1280, height: 860 },
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`, '--lang=es', '--autoplay-policy=no-user-gesture-required'],
});
let dark = false;
await context.route('https://openrouter.ai/**', (route) => route.fulfill({ status: 200, headers: { 'Content-Type': 'text/event-stream' }, body: sse(aiText(JSON.parse(route.request().postData() || '{}'))) }));
await context.route('https://i.ytimg.com/**', (route) => route.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(path.join(ROOT, 'scripts/assets/demo-thumb.jpg')) }));
await context.route('https://www.youtube.com/**', (route) => {
  const url = route.request().url();
  if (url.includes('/youtubei/v1/get_transcript')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(transcriptJson) });
  if (url.includes('/watch')) return route.fulfill({ contentType: 'text/html', body: watchPage(dark) });
  return route.fulfill({ status: 404, body: '' });
});

const shot = (p, sel, name) => p.locator(sel).first().screenshot({ path: path.join(OUT, `${name}.png`) });
const sr = '#subme-now-host';
const R = (p, fn, arg) => p.evaluate(fn, arg);
const tick = (p, t) => R(p, async (x) => { const v = document.querySelector('video.html5-main-video'); v.currentTime = x; await new Promise((r) => { v.addEventListener('seeked', r, { once: true }); setTimeout(r, 1500); }); v.dispatchEvent(new Event('timeupdate')); }, t);
const waitOut = (p, sel) => p.waitForFunction((s) => {
  const el = document.querySelector('#subme-now-host').shadowRoot.querySelector(s);
  return el && el.textContent.length > 40 && !el.querySelector('.sn-spinner');
}, sel, { timeout: 20000 });
const hide = (p, sels) => R(p, (list) => { const r = document.querySelector('#subme-now-host').shadowRoot; list.forEach((s) => r.querySelectorAll(s).forEach((e) => e.style.setProperty('display', 'none', 'important'))); }, sels);

try {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  const extId = new URL(sw.url()).host;
  const opts = context.pages().find((p) => p.url().includes('options.html')) || await context.newPage();
  if (!opts.url().includes('options.html')) await opts.goto(`chrome-extension://${extId}/src/options/options.html`);
  await opts.waitForSelector('.provider');

  // Paso 2 de la instalación: elegir proveedor y pegar la clave (clave ficticia).
  await opts.evaluate(async () => {
    await chrome.storage.local.set({ settings: { onboardingDone: true, provider: 'openai', providers: { openai: { apiKey: 'sk-proj-demo-xxxxxxxxxxxxxxxxxxxxxxxx', model: '' } } } });
  });
  await opts.reload();
  await opts.waitForSelector('.provider.active');
  await opts.setViewportSize({ width: 900, height: 900 });
  await opts.evaluate(() => document.fonts.ready);
  await opts.locator('section.card').first().screenshot({ path: path.join(OUT, 'opciones-clave.png') });

  // Proveedor para el panel: OpenRouter interceptado (o la API local si no se puede).
  await opts.evaluate(async () => {
    await chrome.storage.local.set({ settings: { onboardingDone: true, provider: 'openrouter', providers: { openrouter: { apiKey: 'demo', model: 'anthropic/claude-haiku-5.5' } }, responseLanguage: 'es', autoSkip: true } });
  });
  const probe = await opts.evaluate(() => chrome.runtime.sendMessage({ type: 'testProvider', providerId: 'openrouter' }));
  if (!probe.ok) {
    await opts.evaluate(async (api) => {
      await chrome.storage.local.set({ settings: { onboardingDone: true, provider: 'custom', providers: { custom: { baseUrl: api, model: 'claude-haiku-5-5', apiKey: '' } }, responseLanguage: 'es', autoSkip: true } });
    }, API);
  }

  const open = async (isDark = false, at = 192) => {
    dark = isDark;
    const p = await context.newPage();
    if (isDark) await p.emulateMedia({ colorScheme: 'dark' });
    await p.goto(`https://www.youtube.com/watch?v=${VIDEO_ID}`);
    await p.waitForFunction(() => document.querySelector('#subme-now-host')?.shadowRoot.querySelector('.sn-seg'), null, { timeout: 20000 });
    await startLecture(p, at);
    return p;
  };

  // Vista general (video + panel) y resumen
  let p = await open();
  await p.locator(`${sr} [data-tab="ai"]`).click();
  await p.locator(`${sr} [data-action="summary"]`).click();
  await waitOut(p, '.sn-output');
  await p.waitForTimeout(500);
  await R(p, () => { scrollTo(0, 0); document.querySelector('#subme-now-host').shadowRoot.querySelector('.sn-body').scrollTop = 0; });
  await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(OUT, 'pagina-completa.png') });
  await hide(p, ['[data-ref="actions"]', '.sn-free', '[data-ref="live"]']);
  await p.waitForTimeout(300);
  await shot(p, sr, 'panel-resumen');

  // Saltar lo que sobra: tramos en la barra y aviso sobre el video
  await R(p, () => { document.querySelector('#subme-now-host').shadowRoot.querySelectorAll('[data-ref="live"]').forEach((e) => e.style.removeProperty('display')); });
  await p.locator(`${sr} [data-live="skip"]`).first().click();
  await p.locator(`${sr} .sn-output .vw-skip-row`).first().waitFor({ timeout: 20000 });
  await p.waitForTimeout(400);
  await shot(p, sr, 'panel-saltar');
  await tick(p, 186); await tick(p, 190.5);
  await p.waitForTimeout(400);
  await shot(p, '.html5-video-player', 'video-saltar');

  // Modo estudio: pregunta sobre el video
  await p.locator(`${sr} [data-live="study"]`).first().click();
  await p.locator(`${sr} .sn-output .vw-study-list`).waitFor({ timeout: 20000 });
  await p.waitForTimeout(300);
  await tick(p, 68); await tick(p, 70.5);
  await p.waitForTimeout(500);
  await shot(p, '.html5-video-player', 'video-estudio');
  await R(p, () => document.querySelector('#subme-live').shadowRoot.querySelector('.vw-option[data-j="1"]').click());
  await p.waitForTimeout(300);
  await shot(p, '.html5-video-player', 'video-estudio-correcto');
  await R(p, () => document.querySelector('#subme-live').shadowRoot.querySelector('[data-lv="go"]').click());

  // Podcast
  await R(p, () => document.querySelector('#subme-now-host').shadowRoot.querySelectorAll('[data-ref="actions"], .sn-free').forEach((e) => e.style.removeProperty('display')));
  await p.locator(`${sr} [data-action="podcast"]`).click();
  await p.locator(`${sr} .vw-pod-line`).first().waitFor({ timeout: 20000 });
  await hide(p, ['[data-ref="actions"]', '.sn-free', '[data-ref="live"]']);
  await R(p, () => document.querySelector('#subme-now-host').shadowRoot.querySelectorAll('.vw-pod-line')[2].classList.add('on'));
  await p.waitForTimeout(300);
  await shot(p, sr, 'panel-podcast');
  await p.close();

  // Subtítulos dobles sobre el video
  p = await open(false, 14);
  await p.locator(`${sr} [data-act="dualsubs"]`).click();
  await p.waitForFunction(() => { const r = document.querySelector('#subme-live')?.shadowRoot; return r && !r.querySelector('.lv-subs .st'); }, null, { timeout: 20000 }).catch(() => {});
  await tick(p, 15); await tick(p, 16);
  await p.waitForTimeout(400);
  await shot(p, '.html5-video-player', 'video-subtitulos');
  await p.locator(`${sr} [data-act="dualsubs"]`).click();
  await p.close();

  // Leer la pantalla
  p = await open(false, 72);
  await p.locator(`${sr} .sn-header [data-act="capture"]`).click();
  await p.locator(`${sr} [data-ref="attach"] img`).waitFor({ timeout: 10000 });
  await p.waitForTimeout(300);
  await shot(p, sr, 'panel-captura-adjunta');
  await p.locator(`${sr} [data-ref="suggestions"] .sn-chip`, { hasText: 'Lee todo el texto' }).click();
  await waitOut(p, '.sn-msg.assistant');
  await p.waitForTimeout(1800);
  await shot(p, sr, 'panel-leer-pantalla');

  // Chat
  await p.locator(`${sr} [data-act="chatclear"]`).click();
  await p.locator(`${sr} [data-ref="chatinput"]`).fill('¿Cuál es la rutina diaria que recomienda?');
  await p.locator(`${sr} [data-ref="chatinput"]`).press('Enter');
  await p.waitForFunction(() => document.querySelectorAll('#subme-now-host').length && document.querySelector('#subme-now-host').shadowRoot.querySelectorAll('.sn-msg.assistant').length === 1 && document.querySelector('#subme-now-host').shadowRoot.querySelector('.sn-msg.assistant').textContent.length > 60, null, { timeout: 20000 });
  await p.waitForTimeout(500);
  await shot(p, sr, 'panel-chat');

  // Mapa mental ampliado
  await p.setViewportSize({ width: 1180, height: 820 });
  await p.locator(`${sr} [data-tab="ai"]`).click();
  await p.locator(`${sr} [data-action="mindmap"]`).click();
  await p.locator(`${sr} .mm-view svg`).waitFor({ timeout: 20000 });
  await p.locator(`${sr} [data-mm="expand"]`).click();
  await p.locator(`${sr} [data-mm="full"]`).click();
  await p.locator(`${sr} .mm-overlay .mm-view svg`).waitFor();
  await p.waitForTimeout(600);
  await shot(p, `${sr} .mm-overlay-card`, 'mapa-mental');
  await p.close();

  // Biblioteca y "Preguntar"
  const lib = await context.newPage();
  await lib.setViewportSize({ width: 1280, height: 800 });
  await lib.goto(`chrome-extension://${extId}/src/library/library.html`);
  await lib.waitForFunction(() => window.SubmeHistory, null, { timeout: 10000 });
  await lib.evaluate(({ demo, structured, responses }) => {
    const now = Date.now();
    const DAY = 86400000;
    const label = { summary: 'Resumen', flashcards: 'Flashcards', quiz: 'Cuestionario', notes: 'Apuntes de estudio', mindmap: 'Mapa mental', keypoints: 'Puntos clave', steps: 'Pasos / tutorial', chapters: 'Capítulos', quotes: 'Citas destacadas' };
    const icon = { summary: 'summary', flashcards: 'flashcards', quiz: 'quiz', notes: 'notes', mindmap: 'mindmap', keypoints: 'target', steps: 'steps', chapters: 'chapters', quotes: 'quote' };
    const key = { summary: '"tldr"', flashcards: '"cards"', quiz: '"questions"', keypoints: '"points"', steps: '"steps"', chapters: '"chapters"', quotes: '"quotes"' };
    return Promise.all(demo.map((v, i) => {
      const results = {};
      for (const id of v.results) results[id] = { id, label: label[id], icon: icon[id], view: id === 'mindmap' ? 'mindmap' : 'structured', text: id === 'mindmap' ? responses.mindmap : structured[key[id]] ? JSON.stringify(structured[key[id]]) : responses.summary, at: now - v.days * DAY - i * 3600000, model: 'claude-haiku-5-5' };
      return SubmeHistory.put({ videoId: v.videoId, title: v.title, author: v.author, lengthSeconds: v.lengthSeconds, isShort: !!v.short, createdAt: now - v.days * DAY, updatedAt: now - v.days * DAY, favorite: !!v.fav, tags: v.tags || [], results, viewStates: {}, chat: [], transcript: null });
    }));
  }, { demo: LIBRARY_DEMO, structured: STRUCTURED, responses: RESPONSES });
  await lib.reload();
  await lib.locator('.vcard').nth(5).waitFor({ timeout: 10000 });
  await lib.evaluate(() => document.fonts.ready);
  await lib.waitForTimeout(600);
  await lib.screenshot({ path: path.join(OUT, 'biblioteca.png') });
  await lib.locator('#askBtn').click();
  await lib.locator('#askInput').fill('¿Qué me recomiendan mis videos para crear un hábito?');
  await lib.locator('#askInput').press('Enter');
  await lib.locator('.msg.ai .msg-sources').waitFor({ timeout: 20000 });
  await lib.waitForTimeout(400);
  await lib.locator('.ask-panel').screenshot({ path: path.join(OUT, 'biblioteca-preguntar.png') });
  await lib.close();
} finally {
  server.close();
  await context.close();
}

/* ---------- ficha real de la Chrome Web Store ---------- */
const browser = await chromium.launch();
try {
  const p = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2, locale: 'es-ES', userAgent: CHROME_UA });
  // La tienda detecta si el navegador es Google Chrome por sus "client hints".
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setUserAgentOverride', {
    userAgent: CHROME_UA,
    acceptLanguage: 'es-ES,es',
    userAgentMetadata: { brands: [{ brand: 'Google Chrome', version: '142' }, { brand: 'Chromium', version: '142' }, { brand: 'Not_A Brand', version: '24' }], fullVersion: '142.0.0.0', platform: 'Windows', platformVersion: '10.0.0', architecture: 'x86', model: '', mobile: false },
  });
  await p.goto(STORE_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(1500);
  for (const name of ['No, gracias', 'No gracias', 'Rechazar todo']) {
    const b = p.getByText(name, { exact: true }).first();
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
  }
  // Sin Chrome real el botón sale deshabilitado: se muestra como lo ve cualquier usuario de Chrome.
  await p.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((e) => /Añadir a Chrome|Add to Chrome/i.test(e.textContent));
    if (!btn) return;
    btn.removeAttribute('disabled');
    btn.style.cssText += ';background:#0b57d0 !important;color:#fff !important;opacity:1 !important;';
    btn.querySelectorAll('*').forEach((e) => { e.style.color = '#fff'; e.style.opacity = '1'; });
  });
  await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(OUT, 'tienda-pagina.png') });
  // Encabezado: ícono, nombre, "Añadir a Chrome" y usuarios.
  const box = await p.evaluate(() => {
    const h = [...document.querySelectorAll('h1')].find((e) => e.textContent.includes('Subme Now'));
    const btn = [...document.querySelectorAll('button')].find((e) => /Añadir a Chrome|Add to Chrome/i.test(e.textContent));
    const r = h.getBoundingClientRect();
    const b = btn?.getBoundingClientRect();
    return { h: { x: r.x, y: r.y, w: r.width, h: r.height }, b: b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null };
  });
  const top = Math.max(0, box.h.y - 40);
  const right = box.b ? box.b.x + box.b.w + 30 : 1250;
  await p.screenshot({ path: path.join(OUT, 'tienda-encabezado.png'), clip: { x: 0, y: top, width: Math.min(1280, right), height: 240 } });
  fs.writeFileSync(path.join(OUT, 'tienda-boton.json'), JSON.stringify({ button: box.b && { x: box.b.x, y: box.b.y - top, w: box.b.w, h: box.b.h }, width: Math.min(1280, right), height: 240 }));
  // Recorte de la página (sin la columna de otras extensiones): cabecera, nombre, botón y capturas.
  const cropW = Math.min(1000, Math.round(right));
  await p.screenshot({ path: path.join(OUT, 'tienda-recorte.png'), clip: { x: 0, y: 0, width: cropW, height: 640 } });
  fs.writeFileSync(path.join(OUT, 'tienda-recorte.json'), JSON.stringify({ button: box.b, width: cropW, height: 640 }));
} finally {
  await browser.close();
  fs.rmSync(LECTURE, { force: true });
  fs.rmSync(LECTURE.replace('.webm', '.png'), { force: true });
}
console.log('Capturas en', OUT);
