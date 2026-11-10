/**
 * Carrusel de lanzamiento para LinkedIn (1080×1350) con capturas REALES de la extensión.
 *
 *   node scripts/linkedin-carousel.mjs
 *
 * Salida: marketing/linkedin/slide-01.png … slide-09.png y subme-now-carrusel.pdf
 * (LinkedIn publica los carruseles como "documento" PDF).
 */
import { createRequire } from 'node:module';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { VIDEO_ID, TITLE, pickResponse, playerResponse, initialData, transcriptJson } from './demo-data.mjs';

process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'marketing', 'linkedin');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'subme-li-'));
fs.mkdirSync(OUT, { recursive: true });

const iconSandbox = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src/shared/icons.js'), 'utf8'), { globalThis: iconSandbox });
const ICON = (n, size = 22) => iconSandbox.SubmeIcons.icon(n).replace('width="16" height="16"', `width="${size}" height="${size}"`);
const img64 = (file) => `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;

/* ---------- API de IA simulada ---------- */
const sse = (text) => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`;
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.end(sse(pickResponse(JSON.parse(body).messages.at(-1).content)));
  });
});
await new Promise((r) => server.listen(0, r));
const API = `http://127.0.0.1:${server.address().port}/v1`;

/* ---------- página base para las capturas ---------- */
const capturePage = (dark) => `<!doctype html><html lang="es"${dark ? ' dark' : ''}><head><meta charset="utf-8"><title>${TITLE}</title>
<style>body{margin:0;background:${dark ? '#0f0f0f' : '#fff'};font-family:Roboto,sans-serif}ytd-watch-flexy{display:flex;gap:24px;padding:24px}#primary{flex:1}
#secondary{width:440px;display:block}#secondary-inner{display:block}video{display:none}</style></head>
<body><ytd-app><ytd-watch-flexy><div id="primary"><video class="html5-main-video" muted></video>
${dark ? '<ytd-shorts><ytd-reel-video-renderer is-active><video muted></video></ytd-reel-video-renderer></ytd-shorts>' : ''}</div>
${dark ? '' : '<div id="secondary"><div id="secondary-inner"></div></div>'}</ytd-watch-flexy></ytd-app>
<script>var ytInitialPlayerResponse = ${JSON.stringify(playerResponse)};</script>
<script>var ytInitialData = ${JSON.stringify(initialData)};</script>
<script>var ytcfg={set(){}};ytcfg.set({"INNERTUBE_API_KEY":"K","INNERTUBE_CLIENT_VERSION":"2.2026"});</script></body></html>`;

const context = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'subme-li-prof-')), {
  headless: true,
  channel: 'chromium',
  viewport: { width: 1280, height: 1000 },
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`, '--lang=es'],
});
let dark = false;
await context.route('https://openrouter.ai/**', (route) => {
  const last = JSON.parse(route.request().postData() || '{}').messages?.at(-1)?.content || '';
  return route.fulfill({ status: 200, headers: { 'Content-Type': 'text/event-stream' }, body: sse(last.includes('OK') ? 'OK' : pickResponse(last)) });
});
await context.route('https://i.ytimg.com/**', (route) => route.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(path.join(ROOT, 'scripts/assets/demo-thumb.jpg')) }));
await context.route('https://www.youtube.com/**', (route) => {
  const url = route.request().url();
  if (url.includes('/youtubei/v1/get_transcript')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(transcriptJson) });
  if (url.includes('/watch') || url.includes('/shorts/')) return route.fulfill({ contentType: 'text/html', body: capturePage(dark) });
  return route.fulfill({ status: 404, body: '' });
});

const shots = {};
try {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  const extId = new URL(sw.url()).host;
  const opts = await context.newPage();
  await opts.goto(`chrome-extension://${extId}/src/options/options.html`);
  await opts.waitForSelector('.provider');

  // Captura de la configuración: proveedores y métodos de protección.
  await opts.evaluate(async () => {
    await chrome.storage.local.set({ settings: { onboardingDone: true, provider: 'anthropic', providers: { anthropic: { apiKey: 'demo', model: '' }, openrouter: { apiKey: 'demo' }, openai: { apiKey: 'demo' }, gemini: { apiKey: 'demo' } } } });
  });
  await opts.reload();
  await opts.waitForSelector('.provider.active');
  await opts.locator('#providers').screenshot({ path: (shots.providers = path.join(TMP, 'providers.png')) });
  await opts.locator('#security .sn-methods').screenshot({ path: (shots.methods = path.join(TMP, 'methods.png')) });

  // Mostrar OpenRouter en el selector (las llamadas se interceptan); si no se puede, la API local.
  await opts.evaluate(async () => {
    await chrome.storage.local.set({ settings: { onboardingDone: true, provider: 'openrouter', providers: { openrouter: { apiKey: 'demo', model: 'anthropic/claude-opus-5.5' } }, responseLanguage: 'es' } });
  });
  const probe = await opts.evaluate(() => chrome.runtime.sendMessage({ type: 'testProvider', providerId: 'openrouter' }));
  if (!probe.ok) {
    await opts.evaluate(async (api) => {
      await chrome.storage.local.set({ settings: { onboardingDone: true, provider: 'custom', providers: { custom: { baseUrl: api, model: 'claude-opus-5-5', apiKey: '' } }, responseLanguage: 'es' } });
    }, API);
  }

  const sr = '#subme-now-host';
  const open = async (shorts = false) => {
    dark = shorts;
    const p = await context.newPage();
    if (shorts) await p.emulateMedia({ colorScheme: 'dark' });
    await p.goto(shorts ? 'https://www.youtube.com/shorts/demoShort001' : `https://www.youtube.com/watch?v=${VIDEO_ID}`);
    await p.waitForFunction(() => document.querySelector('#subme-now-host')?.shadowRoot.querySelector('.sn-seg'), null, { timeout: 15000 });
    await p.evaluate(() => document.fonts.ready);
    return p;
  };
  const waitOut = (p, sel) => p.waitForFunction((s) => {
    const el = document.querySelector('#subme-now-host').shadowRoot.querySelector(s);
    return el && el.textContent.length > 50 && !el.querySelector('.sn-spinner');
  }, sel, { timeout: 15000 });
  const hideGrid = (p) => p.evaluate(() => {
    const r = document.querySelector('#subme-now-host').shadowRoot;
    r.querySelector('[data-ref="actions"]').style.display = 'none';
    r.querySelector('.sn-free').style.display = 'none';
    r.querySelector('.sn-output').style.maxHeight = '660px';
  });
  const snapHost = async (p, name) => { await p.waitForTimeout(400); await p.locator(sr).screenshot({ path: (shots[name] = path.join(TMP, `${name}.png`)) }); };

  // Resumen
  let p = await open();
  await p.locator(`${sr} [data-tab="ai"]`).click();
  await p.locator(`${sr} [data-action="summary"]`).click();
  await waitOut(p, '.sn-output');
  await hideGrid(p);
  await snapHost(p, 'summary');
  // Escuchar + Exportar sobre el mismo resultado
  await p.evaluate(() => {
    const r = document.querySelector('#subme-now-host').shadowRoot;
    r.querySelector('[data-ref="tts"]').hidden = false;
    r.querySelector('[data-ref="ttsprogress"]').textContent = 'Leyendo · 3/9';
    r.querySelector('[data-ref="ttsvoice"]').innerHTML = '<option>Voz natural (Español)</option>';
    r.querySelectorAll('.sn-output li')[1]?.classList.add('sn-reading');
    r.querySelector('.sn-output').style.maxHeight = '520px';
  });
  await p.locator(`${sr} [data-act="exportmenu"]`).click();
  await snapHost(p, 'export');
  await p.close();

  // Chat
  p = await open();
  await p.locator(`${sr} [data-tab="chat"]`).click();
  await p.locator(`${sr} [data-ref="chatinput"]`).fill('¿Cuál es la rutina diaria que recomienda?');
  await p.locator(`${sr} [data-ref="chatinput"]`).press('Enter');
  await waitOut(p, '.sn-msg.assistant');
  await snapHost(p, 'chat');
  await p.close();

  // Transcripción con la línea actual resaltada
  p = await open();
  await p.evaluate(() => {
    const r = document.querySelector('#subme-now-host').shadowRoot;
    r.querySelectorAll('.sn-seg').forEach((e) => e.classList.remove('current'));
    r.querySelectorAll('.sn-seg')[6].classList.add('current');
    r.querySelector('.sn-segments').style.maxHeight = '560px';
  });
  await snapHost(p, 'transcript');
  await p.close();

  // Mapa mental ampliado
  p = await open();
  await p.setViewportSize({ width: 1180, height: 820 });
  await p.locator(`${sr} [data-tab="ai"]`).click();
  await p.locator(`${sr} [data-action="mindmap"]`).click();
  await p.locator(`${sr} .mm-view svg`).waitFor({ timeout: 15000 });
  await p.locator(`${sr} [data-mm="expand"]`).click();
  await p.locator(`${sr} [data-mm="full"]`).click();
  await p.locator(`${sr} .mm-overlay .mm-view svg`).waitFor();
  await p.waitForTimeout(500);
  await p.locator(`${sr} .mm-overlay-card`).screenshot({ path: (shots.mindmap = path.join(TMP, 'mindmap.png')) });
  await p.close();

  // Shorts en modo oscuro
  p = await open(true);
  await p.locator(`${sr} [data-tab="ai"]`).click();
  await p.locator(`${sr} [data-action="keypoints"]`).click();
  await waitOut(p, '.sn-output');
  await p.waitForTimeout(800);
  await hideGrid(p);
  await p.evaluate(() => { const r = document.querySelector('#subme-now-host').shadowRoot; r.querySelector('.sn-output').style.maxHeight = '520px'; r.querySelector('.sn-body').scrollTop = 0; });
  await snapHost(p, 'shorts');
  await p.close();
} finally {
  server.close();
}

/* ---------- diseño de las diapositivas ---------- */
const LOGO = img64(path.join(ROOT, 'icons/icon128.png'));
const I = (n, s) => ICON(n, s);

const videoFrame = ({ progress = 32, time = '4:05 / 12:34' } = {}) => `
  <div class="video">
    <div class="vslide">
      <div class="vk">Clase 3 · Idiomas</div>
      <div class="vt">${TITLE}</div>
      <div class="vbars"><span style="height:38%"></span><span style="height:55%"></span><span style="height:72%"></span><span style="height:90%"></span></div>
      <div class="vcap">La constancia gana a la intensidad</div>
    </div>
    <div class="controls">
      <div class="prog"><span style="width:${progress}%"></span><i style="left:${progress}%"></i></div>
      <div class="crow">${I('pause', 22)}${I('volume', 22)}<span class="time">${time}</span><span class="sp"></span>${I('settings', 22)}</div>
    </div>
  </div>
  <div class="vmeta">
    <div class="vtitle">${TITLE}</div>
    <div class="chan"><span class="av">A+</span><span><b>Aprende+</b><small>1,2 M suscriptores</small></span><span class="sub">Suscribirse</span></div>
  </div>`;

const browser = (inner, url = `youtube.com/watch?v=${VIDEO_ID}`) => `
  <div class="browser">
    <div class="bbar"><span class="dots"><i></i><i></i><i></i></span><span class="url">${url}</span></div>
    <div class="bbody">${inner}</div>
  </div>`;

const withPanel = (panelImg, { panelWidth = 470, panelTop = 130 } = {}) => `
  <div class="stage">
    ${browser(`<div class="vcol">${videoFrame()}</div>`)}
    <div class="panelwrap" style="width:${panelWidth}px;top:${panelTop}px;max-height:calc(100% - ${panelTop}px)"><img src="${img64(panelImg)}"></div>
  </div>`;

const slides = [
  {
    cls: 'dark cover',
    pill: ['sparkles', 'Lanzamiento'],
    h1: 'Conversa con cualquier video de <em>YouTube</em>',
    p: 'Subme Now es tu asistente de IA dentro de YouTube: resume, responde y ordena las ideas de cada video.',
    visual: withPanel(shots.summary, { panelWidth: 450, panelTop: 90 }),
    swipe: true,
  },
  {
    pill: ['summary', 'Resúmenes'],
    h1: 'Un video de 40 minutos, <em>entendido en 30 segundos</em>',
    p: 'TL;DR, ideas principales y conclusión, con el minuto exacto de cada idea.',
    visual: withPanel(shots.summary),
  },
  {
    pill: ['chat', 'Chat con el video'],
    h1: 'Pregúntale <em>lo que quieras</em> al video',
    p: 'Responde con lo que realmente se dice y te indica en qué minuto encontrarlo.',
    visual: withPanel(shots.chat, { panelTop: 170 }),
  },
  {
    pill: ['mindmap', 'Mapa mental'],
    h1: 'Las ideas del video, <em>de un vistazo</em>',
    p: 'Un mapa mental interactivo: expande las ramas y salta al momento exacto del video.',
    visual: `<div class="stage wide"><img class="shot" src="${img64(shots.mindmap)}"></div>`,
  },
  {
    pill: ['transcript', 'Transcripción'],
    h1: 'La transcripción completa, <em>siempre a mano</em>',
    p: 'Busca palabras, haz clic en una línea para ir a ese momento y descárgala en el formato que necesites.',
    visual: withPanel(shots.transcript),
  },
  {
    pill: ['volume', 'Escuchar y exportar'],
    h1: 'Escúchalo o <em>llévalo a tus notas</em>',
    p: 'Lectura en voz alta y exportación con formato a Google Docs, Notion, Obsidian, Word o PDF.',
    visual: withPanel(shots.export),
  },
  {
    cls: 'dark',
    pill: ['phone', 'YouTube Shorts'],
    h1: 'También <em>en Shorts</em>',
    p: 'Un panel flotante con todas las funciones, en modo claro u oscuro.',
    visual: `<div class="stage shorts">
      <div class="phone"><div class="pscreen"><div class="pcap">3 trucos para recordar vocabulario</div><div class="pplay">${I('play', 40)}</div></div></div>
      <div class="panelwrap" style="width:470px;top:20px;right:30px;max-height:calc(100% - 20px)"><img src="${img64(shots.shorts)}"></div>
    </div>`,
  },
  {
    pill: ['shield', 'Tu IA, tu control'],
    h1: 'Usa <em>el modelo que prefieras</em>',
    p: 'OpenAI, Claude, Gemini, Grok, OpenRouter o modelos locales, con tu propia clave.',
    visual: `<div class="stage privacy">
      <img class="shot soft" src="${img64(shots.providers)}">
      <ul class="checks">
        <li>${I('check', 24)}Sin servidores intermedios ni publicidad</li>
        <li>${I('check', 24)}Tus claves quedan en tu navegador</li>
        <li>${I('check', 24)}Opcional: cífralas con contraseña, imágenes o patrón</li>
      </ul>
      <img class="shot soft" src="${img64(shots.methods)}">
    </div>`,
  },
  {
    cls: 'dark cta',
    pill: ['rocket', 'Ya disponible'],
    h1: 'Pruébalo <em>gratis</em>',
    p: 'Extensión para Chrome. La transcripción funciona sin ninguna clave; la IA, con la tuya.',
    visual: `<div class="cta-box">
      <img src="${LOGO}" class="biglogo">
      <div class="brand-big">Subme Now</div>
      <div class="tag">Tu asistente de IA para YouTube</div>
      <div class="chips">${[['summary', 'Resúmenes'], ['chat', 'Chat'], ['mindmap', 'Mapas mentales'], ['transcript', 'Transcripción'], ['volume', 'Escuchar'], ['share', 'Exportar']].map(([i, t]) => `<span>${I(i, 20)}${t}</span>`).join('')}</div>
      <div class="link">github.com/diegoparras/Subme-Now</div>
      <div class="ask">¿Qué video vas a resumir primero?</div>
    </div>`,
  },
];

const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800&display=swap');
* { box-sizing: border-box; margin: 0; }
html, body { background: #fff; }
body { font-family: Inter, "Segoe UI", Roboto, system-ui, sans-serif; color: #14121f; }
.slide { width: 1080px; height: 1350px; position: relative; overflow: hidden; padding: 72px 72px 0;
  background: radial-gradient(1100px 800px at 0% 0%, #ece6ff 0%, #f7f5ff 45%, #ffffff 100%); page-break-after: always; break-after: page; }
.slide.dark { color: #f4f2ff; background: radial-gradient(1100px 900px at 0% 0%, #3a2a8f 0%, #1a1530 50%, #0e0d16 100%); }
.pill { display: inline-flex; align-items: center; gap: 10px; font-weight: 600; font-size: 24px; color: #6d4aff; background: rgba(109,74,255,.1); padding: 10px 20px; border-radius: 999px; }
.dark .pill { color: #c9bbff; background: rgba(155,133,255,.18); }
h1 { font-size: 66px; line-height: 1.06; letter-spacing: -0.025em; font-weight: 800; margin: 26px 0 18px; }
h1 em { font-style: normal; background: linear-gradient(90deg, #6d4aff, #ff3d7f); -webkit-background-clip: text; background-clip: text; color: transparent; }
.dark h1 em { background: linear-gradient(90deg, #a48cff, #ff6a9a); -webkit-background-clip: text; background-clip: text; }
.lead { font-size: 29px; line-height: 1.42; color: #4b4860; max-width: 900px; }
.dark .lead { color: #c9c4e0; }
.foot { position: absolute; left: 72px; right: 72px; bottom: 40px; display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 22px; }
.foot img { width: 38px; height: 38px; border-radius: 10px; }
.foot .num { margin-left: auto; font-weight: 500; color: #8a87a0; font-size: 20px; }
.foot .swipe { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; font-weight: 600; color: #c9bbff; }
.foot .swipe + .num { margin-left: 18px; }
.stage { position: absolute; left: 72px; right: 72px; top: 440px; bottom: 120px; }
.cover .stage { top: 470px; }
.browser { position: absolute; left: 0; top: 0; width: 700px; border-radius: 18px; overflow: hidden; background: #fff; box-shadow: 0 30px 80px rgba(40,20,120,.22), 0 2px 6px rgba(0,0,0,.06); }
.dark .browser { box-shadow: 0 30px 90px rgba(0,0,0,.55); }
.bbar { height: 44px; background: #f1f0f5; display: flex; align-items: center; gap: 16px; padding: 0 16px; }
.dots i { display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #e0dde8; margin-right: 6px; }
.dots i:nth-child(1) { background: #ff6159; } .dots i:nth-child(2) { background: #ffbd2e; } .dots i:nth-child(3) { background: #28c941; }
.url { flex: 1; background: #fff; border-radius: 999px; padding: 6px 16px; font-size: 15px; color: #55545f; }
.bbody { padding: 18px; background: #fff; color: #0f0f0f; }
.vcol { width: 100%; }
.video { position: relative; aspect-ratio: 16/9; border-radius: 14px; overflow: hidden; background: linear-gradient(135deg, #1d1a3a 0%, #3a2470 55%, #7a2c6a 100%); }
.vslide { position: absolute; inset: 0; padding: 36px 40px; color: #fff; }
.vk { font-size: 15px; letter-spacing: .12em; text-transform: uppercase; opacity: .7; font-weight: 600; }
.vt { font-size: 31px; font-weight: 800; line-height: 1.15; margin-top: 12px; max-width: 420px; }
.vbars { position: absolute; right: 44px; bottom: 76px; display: flex; gap: 12px; align-items: flex-end; height: 150px; }
.vbars span { width: 34px; border-radius: 8px 8px 0 0; background: linear-gradient(180deg, #ff8fb3, #ff3d7f); opacity: .9; }
.vcap { position: absolute; left: 50%; transform: translateX(-50%); bottom: 64px; background: rgba(0,0,0,.72); padding: 6px 14px; border-radius: 6px; font-size: 19px; white-space: nowrap; }
.controls { position: absolute; left: 0; right: 0; bottom: 0; padding: 0 16px 10px; background: linear-gradient(0deg, rgba(0,0,0,.6), transparent); color: #fff; }
.prog { position: relative; height: 4px; background: rgba(255,255,255,.3); border-radius: 2px; margin-bottom: 8px; }
.prog span { position: absolute; left: 0; top: 0; bottom: 0; background: #ff3d4f; border-radius: 2px; }
.prog i { position: absolute; top: -5px; width: 14px; height: 14px; margin-left: -7px; border-radius: 50%; background: #ff3d4f; }
.crow { display: flex; align-items: center; gap: 16px; }
.crow .sn-i { color: #fff; }
.time { font-size: 15px; } .sp { flex: 1; }
.vmeta { padding: 14px 4px 4px; }
.vtitle { font-size: 21px; font-weight: 700; }
.chan { display: flex; align-items: center; gap: 12px; margin-top: 12px; font-size: 16px; }
.chan b { display: block; } .chan small { color: #606060; font-size: 14px; }
.av { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-weight: 800; background: linear-gradient(135deg, #6d4aff, #ff3d7f); }
.sub { margin-left: 12px; background: #0f0f0f; color: #fff; border-radius: 999px; padding: 8px 16px; font-weight: 600; font-size: 15px; }
.panelwrap { position: absolute; right: 0; border-radius: 14px; overflow: hidden; box-shadow: 0 36px 90px rgba(40,20,120,.35), 0 0 0 1px rgba(0,0,0,.04); }
.panelwrap.clip { -webkit-mask-image: linear-gradient(180deg, #000 80%, transparent 100%); mask-image: linear-gradient(180deg, #000 80%, transparent 100%); }
.panelwrap img { display: block; width: 100%; }
.dark .panelwrap { box-shadow: 0 36px 100px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.06); }
.stage.wide { display: grid; place-items: start center; }
.shot { max-width: 100%; border-radius: 16px; box-shadow: 0 30px 80px rgba(40,20,120,.22); }
.shot.soft { box-shadow: 0 16px 48px rgba(40,20,120,.14); }
.stage.privacy { display: flex; flex-direction: column; justify-content: center; gap: 40px; }
.checks { list-style: none; padding: 0; display: grid; gap: 14px; font-size: 27px; font-weight: 500; }
.checks li { display: flex; align-items: center; gap: 14px; }
.checks .sn-i { color: #fff; background: #6d4aff; border-radius: 50%; padding: 5px; width: 36px; height: 36px; flex: none; }
.stage.shorts .phone { position: absolute; left: 30px; top: 20px; width: 360px; height: 640px; border-radius: 44px; background: #000; padding: 12px; box-shadow: 0 30px 90px rgba(0,0,0,.6); }
.pscreen { position: relative; width: 100%; height: 100%; border-radius: 34px; overflow: hidden; background: linear-gradient(180deg, #ff6a8b 0%, #8a3fd0 55%, #2a1f70 100%); }
.pcap { position: absolute; left: 22px; right: 22px; bottom: 34px; color: #fff; font-weight: 800; font-size: 25px; line-height: 1.2; }
.pplay { position: absolute; left: 50%; top: 45%; transform: translate(-50%,-50%); width: 92px; height: 92px; border-radius: 50%; background: rgba(255,255,255,.9); display: grid; place-items: center; }
.pplay .sn-i { color: #3a2470; fill: #3a2470; margin-left: 6px; }
.cta-box { position: absolute; left: 72px; right: 72px; top: 450px; bottom: 140px; border-radius: 32px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 14px; }
.biglogo { width: 150px; height: 150px; border-radius: 36px; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
.brand-big { font-size: 64px; font-weight: 800; letter-spacing: -0.02em; margin-top: 10px; }
.tag { font-size: 28px; color: #c9c4e0; }
.chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; max-width: 760px; margin: 18px 0 8px; }
.chips span { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,.1); padding: 10px 18px; border-radius: 999px; font-size: 21px; }
.chips .sn-i { color: #c9bbff; }
.link { font-size: 26px; font-weight: 600; background: #fff; color: #3a2470; padding: 14px 28px; border-radius: 14px; margin-top: 10px; }
.ask { font-size: 26px; color: #c9bbff; margin-top: 18px; font-weight: 600; }
.sn-i { flex: none; }
`;

const slideHtml = (s, i) => `<section class="slide ${s.cls || ''}">
  <div class="pill">${I(s.pill[0], 26)}${s.pill[1]}</div>
  <h1>${s.h1}</h1>
  <p class="lead">${s.p}</p>
  ${s.visual}
  <div class="foot"><img src="${LOGO}">Subme Now${s.swipe ? `<span class="swipe">Desliza ${I('chevronDown', 22).replace('<svg', '<svg style="transform:rotate(-90deg)"')}</span>` : ''}<span class="num">${i + 1}/${slides.length}</span></div>
</section>`;

const doc = (body) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;

/** Desvanece el borde inferior solo de los paneles que no entran completos. */
const markClipped = () => document.querySelectorAll('.panelwrap').forEach((w) => {
  if (w.querySelector('img').offsetHeight > w.clientHeight + 2) w.classList.add('clip');
});
const page = await context.newPage();
await page.setViewportSize({ width: 1080, height: 1350 });
for (let i = 0; i < slides.length; i++) {
  await page.setContent(doc(slideHtml(slides[i], i)), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(markClipped);
  await page.screenshot({ path: path.join(OUT, `slide-${String(i + 1).padStart(2, '0')}.png`) });
}
await page.setContent(doc(slides.map(slideHtml).join('')), { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(markClipped);
await page.pdf({ path: path.join(OUT, 'subme-now-carrusel.pdf'), width: '1080px', height: '1350px', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
await context.close();
console.log('Carrusel generado en', OUT);
