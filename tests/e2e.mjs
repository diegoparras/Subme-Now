/**
 * Prueba end-to-end de Subme Now.
 * Carga la extensión en Chromium, simula una página de YouTube (sin red real) y una API
 * compatible con OpenAI local con streaming SSE, y verifica el flujo completo.
 *
 *   node tests/e2e.mjs
 */
import { createRequire } from 'node:module';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO_ID = 'abc123XYZ00';
const results = [];
let failInnertube = false;
const timedtextRequests = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`); };

// ---------- API de IA falsa (compatible con OpenAI) ----------
const requests = [];
const geminiRequests = [];
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', async () => {
    if (req.url.endsWith('/models')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: [{ id: 'fake-model' }, { id: 'fake-model-2' }] }));
      return;
    }
    if (req.url.includes(':streamGenerateContent')) {
      // Gemini: transcripción de un video sin subtítulos.
      geminiRequests.push({ url: req.url, key: req.headers['x-goog-api-key'], body: JSON.parse(body || '{}') });
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      const lines = ['[00:00] Hola, esto lo transcribió la IA.\n', '[00:05] Hablamos de pronunciación ', 'y acentos.\n', '[01:10] Fin del video.\n'];
      for (const text of lines) {
        res.write(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }], role: 'model' } }] })}\n\n`);
        await new Promise((r) => setTimeout(r, 30));
      }
      res.end();
      return;
    }
    const json = JSON.parse(body || '{}');
    requests.push(json);
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const last = json.messages.at(-1).content;
    const STRUCT = {
      '"cards"': { cards: [{ front: '¿Qué es la constancia?', back: 'Estudiar todos los días un poco.', t: '00:14' }, { front: '¿Cuántas palabras por día?', back: 'Veinte.', t: '04:05' }, { front: '¿Qué pilar es el primero?', back: 'La exposición diaria.', t: '01:12' }] },
      '"questions"': { questions: [{ q: '¿Qué gana a la intensidad?', options: ['La suerte', 'La constancia', 'El talento', 'La gramática'], answer: 1, explanation: 'Lo dice al inicio.', t: '00:14' }, { q: '¿Cuántas palabras por día?', options: ['5', '10', '20', '100'], answer: 2, explanation: 'Con flashcards.', t: '04:05' }] },
      '"chapters"': { chapters: [{ t: '00:00', title: 'Introducción', summary: 'Presentación' }, { t: '00:08', title: 'El método', summary: 'Los pilares' }, { t: '00:20', title: 'Cierre', summary: 'Resumen final' }] },
      '"points"': { points: [{ title: 'Constancia', detail: 'Mejor poco cada día.', t: '00:14' }, { title: 'Exposición', detail: 'Podcasts y series.', t: '01:12' }] },
      '"quotes"': { quotes: [{ text: 'La constancia gana a la intensidad.', t: '00:14', why: 'Resume la idea central.' }] },
      '"steps"': { kind: 'tutorial', requirements: ['App de flashcards'], steps: [{ title: 'Escuchar un podcast', detail: 'En el viaje.', t: '01:12' }, { title: 'Repasar 20 palabras', detail: 'Por la mañana.', t: '04:05' }], warnings: ['No estudiar solo gramática'] },
      '"claims"': { claims: [{ claim: '1.000 palabras cubren el 80%', t: '05:40', verdict: 'correcto', explanation: 'Coincide con estudios.' }, { claim: 'Se aprende en 6 meses', t: '00:09', verdict: 'dudoso', explanation: 'Depende del idioma.' }], opinions: ['La gramática es secundaria'], missing: ['No cita fuentes'] },
      '"posts"': { posts: ['Aprender un idioma en 6 meses es posible.', 'El secreto: constancia diaria.', 'Conclusión: empieza hoy.'] },
      '"hashtags"': { text: 'Aprendí algo valioso hoy.\n\nLa constancia gana a la intensidad.\n\n¿Y tú qué idioma estudias?', hashtags: ['Idiomas', 'Aprendizaje', 'Productividad'] },
    };
    const structKey = Object.keys(STRUCT).find((k) => last.includes(k) && !last.includes('"tldr"'));
    const answer = structKey ? JSON.stringify(STRUCT[structKey]) : last.includes('mapa mental') ? [
      '- Aprender idiomas en 6 meses',
      '  - Exposición diaria [01:12]',
      '    - Podcasts',
      '    - Series con subtítulos',
      '  - Hablar desde el día uno [02:30]',
      '    - Perder el miedo',
      '      - Intercambio de idiomas',
      '  - Repetición espaciada [04:05]',
      '    - 20 palabras por día',
      '  - Rutina diaria [08:30]',
    ].join('\n') : last.includes('OK') ? 'OK'
      : `**TL;DR:** Un video de prueba.\n\n## Ideas principales\n- Saludo inicial [00:00]\n- Tema central [00:08]\n\n| A | B |\n|---|---|\n| 1 | 2 |`;
    for (const piece of answer.match(/[\s\S]{1,12}/g)) {
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: piece } }] })}\n\n`);
      await new Promise((r) => setTimeout(r, 10));
    }
    res.write(': keep-alive\n\ndata: [DONE]\n\n');
    res.end();
  });
});
await new Promise((r) => server.listen(0, r));
const API = `http://127.0.0.1:${server.address().port}/v1`;

// ---------- Página de YouTube falsa ----------
const playerResponse = {
  videoDetails: { videoId: VIDEO_ID, title: 'Video de prueba', author: 'Canal Test', lengthSeconds: '30' },
  captions: { playerCaptionsTracklistRenderer: {
    captionTracks: [{ baseUrl: 'https://www.youtube.com/api/timedtext?v=x&lang=es', name: { simpleText: 'Español' }, languageCode: 'es', isTranslatable: true }],
    translationLanguages: [{ languageCode: 'en', languageName: { simpleText: 'Inglés' } }],
  } },
};
const initialData = { engagementPanels: [{ engagementPanelSectionListRenderer: { content: { continuationItemRenderer: { continuationEndpoint: { getTranscriptEndpoint: { params: 'PARAMS_ES' } } } } } }] };
const watchHtml = `<!doctype html><html lang="es"><head><title>Video de prueba - YouTube</title></head><body>
<ytd-app><ytd-watch-flexy style="display:flex;gap:16px">
  <div id="primary" style="width:640px"><video class="html5-main-video" width="640" height="360" muted></video><div id="below"></div></div>
  <div id="secondary" style="width:400px;display:block;transform:translateZ(0)"><div id="secondary-inner" style="display:block"></div></div>
</ytd-watch-flexy></ytd-app>
<script>var ytInitialPlayerResponse = ${JSON.stringify(playerResponse)};</script>
<script>var ytInitialData = ${JSON.stringify(initialData)};</script>
<script>var ytcfg = { set() {} }; ytcfg.set({"INNERTUBE_API_KEY":"KEY","INNERTUBE_CLIENT_VERSION":"2.2025","VISITOR_DATA":"VD"});</script>
</body></html>`;

const transcriptResponse = (lang) => ({
  actions: [{ updateEngagementPanelAction: { content: { transcriptRenderer: { content: { transcriptSearchPanelRenderer: {
    body: { transcriptSegmentListRenderer: { initialSegments: [
      { transcriptSegmentRenderer: { startMs: '0', endMs: '4000', snippet: { runs: [{ text: lang === 'en' ? 'Hello everyone' : 'Hola a todos' }] } } },
      { transcriptSegmentRenderer: { startMs: '4000', endMs: '8000', snippet: { runs: [{ text: lang === 'en' ? 'welcome to the video' : 'bienvenidos al video' }] } } },
      { transcriptSegmentRenderer: { startMs: '8000', endMs: '15000', snippet: { runs: [{ text: lang === 'en' ? 'today we talk about extensions' : 'hoy hablamos de extensiones' }] } } },
    ] } },
    footer: { transcriptFooterRenderer: { languageMenu: { sortFilterSubMenuRenderer: { subMenuItems: [
      { title: 'Español', selected: lang !== 'en', continuation: { reloadContinuationData: { continuation: 'PARAMS_ES' } } },
      { title: 'English', selected: lang === 'en', continuation: { reloadContinuationData: { continuation: 'PARAMS_EN' } } },
    ] } } } },
  } } } } } }],
});

// ---------- Navegador ----------
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'subme-e2e-'));
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: true,
  channel: 'chromium',
  args: [`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`],
});
const errors = [];

try {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  const extId = new URL(sw.url()).host;
  check('Service worker cargado', !!extId);

  // Página de opciones
  const opts = context.pages().find((p) => p.url().includes('options.html')) || await context.newPage();
  if (!opts.url().includes('options.html')) await opts.goto(`chrome-extension://${extId}/src/options/options.html`);
  await opts.waitForSelector('.provider');
  check('Opciones: 6 proveedores', (await opts.locator('.provider').count()) === 6);
  await opts.evaluate(async (api) => {
    const { settings = {} } = await chrome.storage.local.get('settings');
    settings.provider = 'custom';
    settings.onboardingDone = true;
    settings.providers = { custom: { baseUrl: api, model: 'fake-model', apiKey: '' } };
    await chrome.storage.local.set({ settings });
  }, API);
  await opts.reload();
  await opts.waitForSelector('#baseUrl');
  check('Opciones: proveedor personalizado cargado', (await opts.inputValue('#baseUrl')) === API);
  const test = await opts.evaluate(() => chrome.runtime.sendMessage({ type: 'testProvider', providerId: 'custom' }));
  check('Probar conexión (streaming SSE)', test.ok && test.text === 'OK', JSON.stringify(test));
  const pub = await opts.evaluate(async () => {
    const { settings } = await chrome.storage.local.get('settings');
    settings.providers.anthropic = { apiKey: 'sk-secreto-de-prueba', model: '' };
    await chrome.storage.local.set({ settings });
    return chrome.runtime.sendMessage({ type: 'getPublicSettings' });
  });
  check('Las API keys no se exponen a la página de YouTube', pub.ok && !JSON.stringify(pub).includes('sk-secreto') && pub.settings.providers.anthropic.hasKey === true);
  const models = await opts.evaluate(() => chrome.runtime.sendMessage({ type: 'listModels', providerId: 'custom' }));
  check('Listar modelos', models.ok && models.models.length === 2);

  // YouTube simulado
  await context.route('https://www.youtube.com/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/timedtext')) {
      // Como YouTube real: sin el token "pot" del reproductor devuelve una respuesta vacía.
      timedtextRequests.push(url);
      if (!new URL(url).searchParams.get('pot')) return route.fulfill({ contentType: 'application/json', body: '' });
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: [
        { tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: 'Cuando me dicen' }] },
        { tStartMs: 2000, dDurationMs: 2000, segs: [{ utf8: 'que soy muy grande' }] },
      ] }) });
    }
    if (url.includes('/youtubei/v1/player')) return route.fulfill({ status: 400, body: '' });
    if (url.includes('/youtubei/v1/get_transcript') && failInnertube) return route.fulfill({ status: 400, body: '{}' });
    if (url.includes('/youtubei/v1/get_transcript')) {
      const body = JSON.parse(route.request().postData());
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(transcriptResponse(body.params === 'PARAMS_EN' ? 'en' : 'es')) });
    }
    if (url.includes('NOSUBS0001')) {
      const noSubs = watchHtml
        .replace(JSON.stringify(playerResponse), JSON.stringify({ videoDetails: { videoId: 'NOSUBS0001', title: 'Sin subtítulos', author: 'Canal', lengthSeconds: '60' } }))
        .replace(JSON.stringify(initialData), '{}');
      return route.fulfill({ contentType: 'text/html', body: noSubs });
    }
    if (url.includes('/watch')) return route.fulfill({ contentType: 'text/html', body: watchHtml });
    return route.fulfill({ status: 404, body: '' });
  });

  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
  await page.goto(`https://www.youtube.com/watch?v=${VIDEO_ID}`);

  const host = page.locator('#subme-now-host');
  await host.waitFor({ timeout: 10000 });
  check('Panel insertado en #secondary', await page.evaluate(() => !!document.querySelector('#secondary-inner > #subme-now-host')));

  await page.locator('#subme-now-host .sn-seg').first().waitFor({ timeout: 10000 });

  // El content script (que corre dentro de YouTube) no debe poder leer el storage con las claves.
  const cdp = await context.newCDPSession(page);
  const contexts = [];
  cdp.on('Runtime.executionContextCreated', (e) => contexts.push(e.context));
  await cdp.send('Runtime.enable');
  await page.waitForTimeout(200);
  const isolated = contexts.find((c) => c.auxData?.type === 'isolated' && c.origin?.startsWith('chrome-extension://'));
  const leak = isolated ? await cdp.send('Runtime.evaluate', {
    contextId: isolated.id,
    awaitPromise: true,
    returnByValue: true,
    expression: "chrome.storage.local.get('settings').then((r) => JSON.stringify(r)).catch((e) => 'ERROR: ' + e.message)",
  }) : null;
  const leakValue = leak?.result?.value || '';
  check('El content script no puede leer las API keys del storage', !!isolated && !leakValue.includes('sk-secreto'), leakValue.slice(0, 120));

  const segs = await page.locator('#subme-now-host .sn-seg').allInnerTexts();
  check('Transcripción cargada (3 segmentos)', segs.length === 3, segs.join(' | '));

  const langs = await page.locator('#subme-now-host [data-ref="lang"] option').allInnerTexts();
  check('Selector de idiomas + traducciones', langs.includes('Español') && langs.includes('English') && langs.some((l) => l.includes('Inglés')), langs.join(', '));

  await page.locator('#subme-now-host [data-ref="lang"]').selectOption('it:PARAMS_EN');
  await page.waitForFunction(() => document.querySelector('#subme-now-host').shadowRoot.querySelector('.sn-seg')?.textContent.includes('Hello'));
  check('Cambio de idioma', true);

  await page.locator('#subme-now-host [data-ref="search"]').fill('video');
  await page.waitForTimeout(300);
  check('Búsqueda filtra y resalta', (await page.locator('#subme-now-host .sn-seg').count()) === 1 && (await page.locator('#subme-now-host mark').count()) === 1);
  await page.locator('#subme-now-host [data-ref="search"]').fill('');
  await page.waitForTimeout(300);

  await page.locator('#subme-now-host .sn-seg').nth(2).click();
  check('Clic en segmento salta en el video', (await page.evaluate(() => document.querySelector('video').currentTime)) === 8);

  // Descarga SRT
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    (async () => {
      await page.locator('#subme-now-host [data-act="dlmenu"]').click();
      await page.locator('#subme-now-host [data-dl="srt"]').click();
    })(),
  ]);
  const srt = fs.readFileSync(await download.path(), 'utf8');
  check('Descarga SRT', download.suggestedFilename() === 'Video de prueba.srt' && srt.includes('00:00:04,000 --> 00:00:08,000'));

  // IA: resumen
  await page.locator('#subme-now-host [data-tab="ai"]').click();
  check('Sin aviso de API key', await page.locator('#subme-now-host [data-ref="nokey"]').isHidden());
  await page.locator('#subme-now-host [data-action="summary"]').click();
  await page.waitForFunction(() => document.querySelector('#subme-now-host').shadowRoot.querySelector('.sn-output table'), null, { timeout: 10000 });
  const outText = await page.locator('#subme-now-host .sn-output').innerText();
  check('Resumen generado y renderizado en Markdown', outText.includes('TL;DR') && outText.includes('Ideas principales'));
  const sys = requests.at(-1).messages[0].content;
  check('El prompt incluye transcripción con tiempos', sys.includes('[00:00] Hello everyone welcome to the video today we talk about extensions') && sys.includes('Video de prueba'));
  await page.locator('#subme-now-host .sn-output a.sn-ts', { hasText: '00:08' }).click();
  check('Marca de tiempo de la IA es clicable', (await page.evaluate(() => document.querySelector('video').currentTime)) === 8);

  // Color de los íconos elegido en la configuración
  await opts.bringToFront();
  await opts.reload();
  await opts.waitForSelector('#iconColors [data-color="#e8467c"]');
  await opts.click('#iconColors [data-color="#e8467c"]');
  await opts.waitForTimeout(500);
  const optColor = await opts.evaluate(() => getComputedStyle(document.querySelector('.swatch-preview .sn-i')).color);
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(400);
  const iconColor = () => page.evaluate(() => getComputedStyle(document.querySelector('#subme-now-host').shadowRoot.querySelector('.sn-action .sn-i')).color);
  const btnColor = () => page.evaluate(() => getComputedStyle(document.querySelector('#subme-now-host').shadowRoot.querySelector('[data-act="free"]')).backgroundColor);
  const optBtn = await opts.evaluate(() => getComputedStyle(document.querySelector('#test')).backgroundColor);
  check('Color de la interfaz: íconos del panel y de la configuración', (await iconColor()) === 'rgb(232, 70, 124)' && optColor === 'rgb(232, 70, 124)', `${await iconColor()} / ${optColor}`);
  check('Color de la interfaz: también botones (panel y configuración)', (await btnColor()) === 'rgb(232, 70, 124)' && optBtn === 'rgb(232, 70, 124)', `${await btnColor()} / ${optBtn}`);
  await opts.bringToFront();
  await opts.click('#iconColors [data-color=""]');
  await opts.waitForTimeout(500);
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(400);
  check('Color de la interfaz: "Automático" vuelve al violeta', (await iconColor()) === 'rgb(109, 74, 255)' && (await btnColor()) === 'rgb(109, 74, 255)', await iconColor());

  // Mapa mental como diagrama
  await page.locator('#subme-now-host [data-action="mindmap"]').click();
  await page.locator('#subme-now-host .mm-view svg').waitFor({ timeout: 10000 });
  const mmNodes = () => page.locator('#subme-now-host .mm-node').count();
  const n1 = await mmNodes();
  check('Mapa mental: se dibuja como diagrama', n1 >= 8, `${n1} nodos`);
  const rootText = await page.locator('#subme-now-host .mm-node').first().textContent();
  check('Mapa mental: tema central correcto', rootText.includes('Aprender idiomas'));
  await page.locator('#subme-now-host [data-mm="expand"]').click();
  const n2 = await mmNodes();
  await page.locator('#subme-now-host [data-mm="collapse"]').click();
  const n3 = await mmNodes();
  check('Mapa mental: expandir y contraer', n2 > n1 && n3 < n2, `${n1} → ${n2} → ${n3}`);
  await page.locator('#subme-now-host .mm-node', { hasText: 'Hablar desde el día uno' }).click();
  check('Mapa mental: clic en una rama salta al video', (await page.evaluate(() => document.querySelector('video').currentTime)) === 150);
  await page.locator('#subme-now-host .mm-toggle').nth(1).click();
  check('Mapa mental: el botón de la rama la expande', (await mmNodes()) > n3);
  await page.locator('#subme-now-host .mm-switch [data-view="text"]').click();
  check('Mapa mental: vista de texto disponible', await page.locator('#subme-now-host .mm-text').isVisible());
  await page.locator('#subme-now-host .mm-switch [data-view="diagram"]').click();
  await page.locator('#subme-now-host [data-mm="full"]').click();
  await page.locator('#subme-now-host .mm-overlay .mm-view svg').waitFor({ timeout: 5000 });
  const fsBox = await page.locator('#subme-now-host .mm-overlay-card').boundingBox();
  const vp = page.viewportSize();
  const closeBox = await page.locator('#subme-now-host .mm-overlay [data-close]').boundingBox();
  check('Mapa mental: pantalla completa ocupa la ventana (aunque YouTube transforme la columna)', fsBox.x < 60 && fsBox.width > vp.width * 0.85 && closeBox && closeBox.y >= 0 && closeBox.x + closeBox.width <= vp.width, JSON.stringify({ fsBox, closeBox }));
  await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'subme-e2e-mindmap-full.png') });
  await page.keyboard.press('Escape');
  const closedByEsc = await page.waitForFunction(() => !document.querySelector('#subme-now-host').shadowRoot.querySelector('.mm-overlay'), null, { timeout: 3000 }).then(() => true).catch(() => false);
  check('Mapa mental: pantalla completa abre y cierra con Esc', closedByEsc);
  await page.locator('#subme-now-host [data-mm="full"]').click();
  await page.locator('#subme-now-host .mm-overlay .mm-view svg').waitFor({ timeout: 5000 });
  await page.locator('#subme-now-host .mm-overlay [data-mm="zoomin"]').click();
  await page.locator('#subme-now-host .mm-overlay [data-mm="zoomin"]').click();
  const scrollable = await page.evaluate(() => { const v = document.querySelector('#subme-now-host').shadowRoot.querySelector('.mm-overlay .mm-view'); v.scrollLeft = 0; return v.getBoundingClientRect().left <= v.querySelector('svg').getBoundingClientRect().left + 1; });
  check('Mapa mental: con zoom se puede ver el borde izquierdo', scrollable);
  await page.locator('#subme-now-host .mm-overlay [data-close]').click();
  const closedByButton = await page.waitForFunction(() => !document.querySelector('#subme-now-host').shadowRoot.querySelector('.mm-overlay'), null, { timeout: 3000 }).then(() => true).catch(() => false);
  check('Mapa mental: el botón Cerrar cierra la vista ampliada', closedByButton);
  await page.locator('#subme-now-host .sn-output-wrap').screenshot({ path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'subme-e2e-mindmap.png') });
  const [svgDl] = await Promise.all([page.waitForEvent('download'), page.locator('#subme-now-host [data-mm="svg"]').first().click()]);
  check('Mapa mental: descarga SVG', svgDl.suggestedFilename().endsWith('mapa mental.svg') && fs.readFileSync(await svgDl.path(), 'utf8').startsWith('<svg'));
  const [pngDl] = await Promise.all([page.waitForEvent('download'), page.locator('#subme-now-host [data-mm="png"]').first().click()]);
  const pngBuf = fs.readFileSync(await pngDl.path());
  check('Mapa mental: descarga PNG', pngBuf.slice(1, 4).toString() === 'PNG');

  // ---------- v1.3: atajos, exportar y escuchar ----------
  const sendCommand = (command) => opts.evaluate(async (cmd) => {
    for (const t of await chrome.tabs.query({})) { try { await chrome.tabs.sendMessage(t.id, { type: 'subme-command', command: cmd }); } catch { /* sin content script */ } }
  }, command);
  await page.bringToFront();
  await sendCommand('toggle-panel');
  await page.waitForTimeout(300);
  const collapsedByKey = await page.locator('#subme-now-host [data-ref="body"]').isHidden();
  await sendCommand('run-summary');
  await page.waitForFunction(() => document.querySelector('#subme-now-host').shadowRoot.querySelector('[data-ref="outtitle"]')?.textContent.includes('Resumen'), null, { timeout: 10000 });
  check('Atajos: ocultar panel y resumir (lo vuelve a mostrar)', collapsedByKey && await page.locator('#subme-now-host [data-ref="body"]').isVisible());
  await page.waitForFunction(() => document.querySelector('#subme-now-host').shadowRoot.querySelector('.sn-output table'), null, { timeout: 10000 });
  const titleHint = await page.locator('#subme-now-host [data-action="summary"]').getAttribute('title');
  check('Atajos: el botón muestra su atajo', /Alt\+Shift\+S/.test(titleHint), titleHint);

  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://www.youtube.com' });
  await page.locator('#subme-now-host [data-act="exportmenu"]').click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'v13-exportar.png') });
  await page.locator('#subme-now-host [data-export="rich"]').click();
  await page.waitForTimeout(300);
  const clip = await page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    const html = await (await items[0].getType('text/html')).text();
    const text = await (await items[0].getType('text/plain')).text();
    return { html, text };
  });
  check('Exportar: copiar con formato (HTML + enlaces al minuto)', clip.html.includes('<strong>TL;DR:</strong>') && clip.html.includes('href="https://www.youtube.com/watch?v=abc123XYZ00&amp;t=8s">00:08</a>') && !clip.html.includes('(https'), clip.html.slice(0, 120));

  const exportDownload = async (kind) => {
    await page.locator('#subme-now-host [data-act="exportmenu"]').click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator(`#subme-now-host [data-export="${kind}"]`).click()]);
    return { name: dl.suggestedFilename(), file: await dl.path() };
  };
  const md = await exportDownload('md');
  const mdText = fs.readFileSync(md.file, 'utf8');
  check('Exportar: Markdown con metadatos y marcas de tiempo enlazadas', md.name.endsWith('Resumen.md') && mdText.startsWith('---\ntitle:') && mdText.includes('](https://www.youtube.com/watch?v=abc123XYZ00&t=0s)'), md.name);
  const docxFile = await exportDownload('docx');
  const { execFileSync } = await import('node:child_process');
  let docxCheck = '';
  try {
    docxCheck = execFileSync('python3', ['-I', '-c', 'import sys, docx; d = docx.Document(sys.argv[1]); print("|".join(p.style.name + ":" + p.text for p in d.paragraphs[:8]) + "|"); print("TABLES", len(d.tables))', docxFile.file]).toString();
  } catch (e) { docxCheck = `ERROR ${e.message}`; }
  check('Exportar: Word (.docx) válido con títulos, texto y tabla', docxFile.name.endsWith('.docx') && docxCheck.includes('Title:Resumen') && docxCheck.includes('TL;DR') && docxCheck.includes('TABLES 1') && docxCheck.includes('Saludo inicial 00:00|') && !docxCheck.includes('(https'), docxCheck.replace(/\n/g, ' ').slice(0, 160));

  await page.locator('#subme-now-host [data-act="exportmenu"]').click();
  const [printPage] = await Promise.all([context.waitForEvent('page'), page.locator('#subme-now-host [data-export="pdf"]').click()]);
  await printPage.waitForSelector('#doc h1', { timeout: 10000 });
  await printPage.screenshot({ path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'v13-pdf.png') });
  check('Exportar: página para imprimir o guardar PDF', (await printPage.textContent('#doc')).includes('TL;DR') && printPage.url().includes('print.html'));
  await printPage.close();
  await page.bringToFront();

  await page.locator('#subme-now-host [data-act="tts"]').click();
  await page.waitForTimeout(500);
  const ttsInfo = await page.evaluate(() => {
    const r = document.querySelector('#subme-now-host').shadowRoot;
    return { bar: !r.querySelector('[data-ref="tts"]').hidden, progress: r.querySelector('[data-ref="ttsprogress"]').textContent, reading: !!r.querySelector('.sn-reading'), voices: speechSynthesis.getVoices().length };
  });
  check('Escuchar: lectura iniciada o aviso claro si no hay voces', ttsInfo.bar || ttsInfo.voices === 0, JSON.stringify(ttsInfo));
  await page.evaluate(() => { const r = document.querySelector('#subme-now-host').shadowRoot; r.querySelector('[data-ref="tts"]').hidden = false; r.querySelector('[data-ref="ttsprogress"]').textContent = 'Leyendo · 3/9'; r.querySelectorAll('.sn-output p')[0]?.classList.add('sn-reading'); });
  await page.locator('#subme-now-host .sn-output-wrap').screenshot({ path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'v13-escuchar.png') });
  await page.locator('#subme-now-host [data-act="ttsstop"]').click().catch(() => {});

  // ---------- v1.5: vistas gráficas ----------
  const runView = async (id, sel) => {
    await page.locator(`#subme-now-host [data-action="${id}"]`).click();
    return page.waitForFunction((s) => document.querySelector('#subme-now-host').shadowRoot.querySelector(`.sn-output ${s}`), sel, { timeout: 10000 }).then(() => true).catch(() => false);
  };
  const sh = (sel) => `#subme-now-host .sn-output ${sel}`;
  check('Vista: flashcards como tarjeta que se da vuelta', await runView('flashcards', '.vw-flip'));
  await page.locator(sh('.vw-flip')).click();
  const flipped = await page.locator(sh('.vw-flip.flipped')).count();
  await page.locator(sh('.vw-know')).click();
  const fcMeta = await page.locator(sh('.vw-q-meta')).textContent();
  check('Vista: flashcards se dan vuelta y cuentan las sabidas', flipped === 1 && fcMeta.includes('Tarjeta 2 de 3') && fcMeta.includes('1 sabidas'), fcMeta);
  await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'v15-flashcards.png'), clip: { x: 640, y: 0, width: 640, height: 720 } });

  check('Vista: quiz interactivo', await runView('quiz', '.vw-option'));
  await page.locator(sh('.vw-option')).nth(0).click();
  const wrong = await page.locator(sh('.vw-option.bad')).count() === 1 && await page.locator(sh('.vw-option.ok')).count() === 1;
  await page.locator(sh('.vw-next')).click();
  await page.locator(sh('.vw-option')).nth(2).click();
  await page.locator(sh('.vw-next')).click();
  const score = await page.locator(sh('.vw-score-num')).textContent();
  check('Vista: quiz marca correcta/incorrecta y da el puntaje', wrong && score === '1/2', score);

  check('Vista: capítulos con línea de tiempo', await runView('chapters', '.vw-timeline .vw-seg'));
  await page.locator(sh('.vw-seg')).nth(1).click();
  check('Vista: clic en la línea de tiempo salta al capítulo', (await page.evaluate(() => document.querySelector('video').currentTime)) === 8);
  const chOn = await page.evaluate(() => [...document.querySelector('#subme-now-host').shadowRoot.querySelectorAll('.vw-chapters li')].findIndex((l) => l.classList.contains('on')));
  check('Vista: capítulos resalta el capítulo actual', chOn === 1, String(chOn));

  check('Vista: puntos clave en tarjetas', await runView('keypoints', '.vw-card'));
  check('Vista: citas en tarjetas', await runView('quotes', '.vw-quote'));
  check('Vista: pasos con casillas', await runView('steps', '.vw-check'));
  await page.locator(sh('.vw-check')).first().click();
  check('Vista: marcar un paso como hecho', (await page.locator(sh('.vw-steps li.done')).count()) === 1 && (await page.locator(sh('.vw-q-meta')).textContent()).includes('1 de 2'));
  check('Vista: afirmaciones con veredictos de color', await runView('factcheck', '.vw-claim.ok') && (await page.locator(sh('.vw-claim.warn')).count()) === 1);
  check('Vista: hilo con contador de caracteres', await runView('thread', '.vw-post') && (await page.locator(sh('.vw-post')).count()) === 3 && (await page.locator(sh('.vw-count')).first().textContent()).endsWith('/280'));
  check('Vista: post de LinkedIn con vista previa', await runView('linkedin', '.vw-li'));
  await page.locator(sh('.vw-li-copy')).click();
  const liClip = await page.evaluate(() => navigator.clipboard.readText());
  check('Vista: copiar el post incluye hashtags', liClip.includes('#Idiomas'), liClip.slice(-40));

  // ---------- v1.5: ventanas desacoplables ----------
  await page.locator('#subme-now-host [data-act="detachout"]').click();
  const winSel = '.subme-now-window';
  await page.locator(`${winSel} .vw-li`).waitFor({ timeout: 5000 });
  check('Ventana: el resultado se desacopla en una ventana flotante', (await page.locator(winSel).count()) === 1);
  const box0 = await page.locator(winSel).boundingBox();
  const head = await page.locator(`${winSel} .sn-win-head`).boundingBox();
  await page.mouse.move(head.x + 60, head.y + 20);
  await page.mouse.down();
  await page.mouse.move(head.x - 140, head.y + 80, { steps: 6 });
  await page.mouse.up();
  const box1 = await page.locator(winSel).boundingBox();
  check('Ventana: se arrastra desde la barra de título', Math.round(box1.x - box0.x) === -200 && Math.round(box1.y - box0.y) === 60, JSON.stringify({ dx: box1.x - box0.x, dy: box1.y - box0.y }));
  const grip = await page.locator(`${winSel} .sn-win-rs.se`).boundingBox();
  await page.mouse.move(grip.x + 8, grip.y + 8);
  await page.mouse.down();
  await page.mouse.move(grip.x + 8 + 80, grip.y + 8 - 100, { steps: 6 });
  await page.mouse.up();
  const box2 = await page.locator(winSel).boundingBox();
  check('Ventana: se redimensiona desde la esquina', Math.round(box2.width - box1.width) === 80 && Math.round(box2.height - box1.height) === -100, JSON.stringify({ dw: box2.width - box1.width, dh: box2.height - box1.height }));
  await page.locator(`${winSel} [data-win="min"]`).click();
  check('Ventana: se minimiza', Math.round((await page.locator(winSel).boundingBox()).height) === 44);
  await page.locator(`${winSel} [data-win="min"]`).click();
  await page.waitForTimeout(400);
  const savedWin = await opts.evaluate(async () => (await chrome.storage.local.get('settings')).settings.windows?.result);
  check('Ventana: recuerda posición y tamaño', savedWin && Math.round(savedWin.w) === Math.round(box2.width), JSON.stringify(savedWin));
  await page.locator(`${winSel} [data-win="close"]`).click();
  check('Ventana: se cierra', (await page.locator(winSel).count()) === 0);

  await page.locator('#subme-now-host [data-tab="transcript"]').click();
  await page.locator('#subme-now-host [data-act="detachtr"]').click();
  await page.locator(`${winSel} .sn-seg`).first().waitFor({ timeout: 5000 });
  await page.locator(`${winSel} .sn-seg`).nth(2).click();
  check('Ventana de transcripción: clic salta en el video', (await page.evaluate(() => document.querySelector('video').currentTime)) === 8);
  check('Ventana de transcripción: resalta la línea actual', (await page.locator(`${winSel} .sn-seg.current`).getAttribute('data-i')) === '2');
  await page.locator(`${winSel} .sf-search`).fill('video');
  check('Ventana de transcripción: búsqueda', (await page.locator(`${winSel} .sn-seg`).count()) === 1);
  await page.locator(`${winSel} [data-win="close"]`).click();

  await page.locator('#subme-now-host [data-tab="chat"]').click();
  await page.locator('#subme-now-host [data-act="detachchat"]').click();
  await page.locator(`${winSel} textarea`).fill('¿Qué dice del método?');
  await page.locator(`${winSel} textarea`).press('Enter');
  await page.waitForFunction(() => document.querySelector('.subme-now-window')?.shadowRoot.querySelectorAll('.sn-msg.assistant table').length > 0, null, { timeout: 10000 });
  check('Ventana de chat: se conversa desde la ventana', (await page.locator(`${winSel} .sn-msg.user`).count()) >= 1);

  // Ventana aparte del navegador (popout)
  const [pop] = await Promise.all([context.waitForEvent('page'), page.locator(`${winSel} [data-win="popout"]`).click()]);
  await pop.waitForSelector('#app');
  await pop.waitForFunction(() => document.querySelector('#app')?.shadowRoot?.querySelector('.sn-msg.assistant'), null, { timeout: 10000 });
  check('Ventana aparte: el chat se abre en otra ventana del navegador', pop.url().includes('popout.html') && (await page.locator(winSel).count()) === 0);
  await pop.locator('#app textarea').fill('¿Y la rutina?');
  await pop.locator('#app textarea').press('Enter');
  await pop.waitForFunction(() => (document.querySelector('#app')?.shadowRoot?.querySelectorAll('.sn-msg.user').length || 0) >= 2, null, { timeout: 10000 });
  check('Ventana aparte: enviar desde otra ventana usa el chat de la pestaña', true);
  await pop.close();
  await page.bringToFront();
  await page.locator('#subme-now-host [data-tab="chat"]').click();
  await page.locator('#subme-now-host [data-act="chatclear"]').click();

  await page.locator('#subme-now-host [data-tab="ai"]').click();
  await runView('chapters', '.vw-timeline');
  await page.locator('#subme-now-host [data-act="detachout"]').click();
  await page.locator(`${winSel} .vw-timeline`).waitFor();
  const [pop2] = await Promise.all([context.waitForEvent('page'), page.locator(`${winSel} [data-win="popout"]`).click()]);
  await pop2.waitForFunction(() => document.querySelector('#app')?.shadowRoot?.querySelector('.vw-seg'), null, { timeout: 10000 });
  await pop2.locator('#app .vw-chapters a.sn-ts').nth(2).click();
  await page.waitForFunction(() => document.querySelector('video').currentTime === 20, null, { timeout: 5000 }).catch(() => {});
  check('Ventana aparte: los capítulos controlan el video de la pestaña', (await page.evaluate(() => document.querySelector('video').currentTime)) === 20);
  await pop2.waitForFunction(() => document.querySelector('#app')?.shadowRoot?.querySelector('.vw-chapters li.on')?.dataset.i === '2', null, { timeout: 5000 }).catch(() => {});
  check('Ventana aparte: sigue el tiempo del video', (await pop2.evaluate(() => document.querySelector('#app')?.shadowRoot?.querySelector('.vw-chapters li.on')?.dataset.i)) === '2');
  await pop2.screenshot({ path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'v15-popout.png') });
  await pop2.close();
  await page.bringToFront();

  // Exportar una vista gráfica produce Markdown legible
  await runView('steps', '.vw-check');
  await page.locator('#subme-now-host [data-act="exportmenu"]').click();
  const [stepsDl] = await Promise.all([page.waitForEvent('download'), page.locator('#subme-now-host [data-export="md"]').click()]);
  const stepsMd = fs.readFileSync(await stepsDl.path(), 'utf8');
  check('Vista: exportar pasos como Markdown con casillas', stepsMd.includes('- [ ] **Escuchar un podcast**') && stepsMd.includes('[01:12](https://www.youtube.com/watch?v='), stepsMd.slice(-200));

  // Cambio de modelo desde el panel
  const bar = page.locator('#subme-now-host [data-ref="modelbar"]');
  check('Barra de modelo visible en IA', await bar.isVisible());
  check('Proveedor actual en el selector', (await page.locator('#subme-now-host [data-ref="provsel"]').inputValue()) === 'custom');
  await page.locator('#subme-now-host [data-ref="modelin"]').click();
  await page.waitForTimeout(300);
  const listed = await page.evaluate(() => [...document.querySelector('#subme-now-host').shadowRoot.querySelectorAll('#sn-models option')].map((o) => o.value));
  check('Lista de modelos cargada al enfocar', listed.includes('fake-model-2'), listed.join(','));
  await page.locator('#subme-now-host [data-ref="modelin"]').fill('fake-model-2');
  await page.locator('#subme-now-host [data-ref="modelin"]').press('Enter');
  await page.waitForTimeout(300);
  const saved = await opts.evaluate(async () => (await chrome.storage.local.get('settings')).settings);
  check('Modelo guardado desde el panel', saved.providers.custom.model === 'fake-model-2' && saved.recentModels.custom[0] === 'fake-model-2');
  await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'subme-e2e-modelbar.png'), clip: { x: 600, y: 0, width: 680, height: 420 } });
  await page.locator('#subme-now-host [data-action="summary"]').click();
  check('Historial: el resultado guardado se muestra sin llamar a la IA', await page.evaluate(() => document.querySelector('#subme-now-host').shadowRoot.querySelector('.sn-output').textContent.includes('Guardado el')));
  {
    const before = requests.length;
    await page.locator('#subme-now-host [data-act="regen"]').click();
    await page.waitForFunction(() => document.querySelector('#subme-now-host').shadowRoot.querySelector('.sn-output table') && !document.querySelector('#subme-now-host').shadowRoot.querySelector('[data-act="stop"]:not([hidden])'), null, { timeout: 10000 });
    check('El nuevo modelo se usa en la consulta', requests.length === before + 1 && requests.at(-1).model === 'fake-model-2');
  }

  // Chat
  await page.locator('#subme-now-host [data-tab="chat"]').click();
  await page.locator('#subme-now-host [data-ref="chatinput"]').fill('¿De qué trata?');
  await page.locator('#subme-now-host [data-ref="chatinput"]').press('Enter');
  await page.waitForFunction(() => document.querySelector('#subme-now-host').shadowRoot.querySelector('.sn-msg.assistant table'), null, { timeout: 10000 });
  const chatReq = requests.at(-1);
  check('Chat responde con historial', chatReq.messages.length === 2 && chatReq.messages[1].content === '¿De qué trata?');

  await page.locator('#subme-now-host [data-tab="ai"]').click();
  await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'subme-e2e.png') });

  // ---------- Protección de las API keys (contraseña, imágenes y patrón) ----------
  const IMG_SEQ = ['Gato', 'Cohete', 'Cactus', 'Guitarra', 'Manzana', 'Luna'];
  const PAT_SEQ = [0, 6, 12, 18, 24, 19, 14]; // diagonal + subida por la derecha
  const clickImages = async (p, scope, labels) => { for (const l of labels) await p.locator(`${scope} .sn-secret-images button[aria-label="${l}"]`).click(); };
  const drawPattern = async (p, svgSel, seq) => {
    await p.locator(svgSel).scrollIntoViewIfNeeded();
    const box = await p.locator(svgSel).boundingBox();
    const step = box.width / 5;
    const pt = (i) => [box.x + (i % 5) * step + step / 2, box.y + Math.floor(i / 5) * step + step / 2];
    await p.mouse.move(...pt(seq[0]));
    await p.mouse.down();
    for (const i of seq.slice(1)) await p.mouse.move(...pt(i), { steps: 6 });
    await p.mouse.up();
  };
  const unlockVia = async (fill) => {
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.locator('#subme-now-host .sn-output [data-act="unlock"], #subme-now-host [data-ref="lockbtn"]').first().click(),
    ]);
    await popup.waitForSelector('#secret.sn-secret');
    return { popup, run: () => fill(popup) };
  };
  const expectLockedInPanel = async (action) => {
    await page.bringToFront();
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.locator('#subme-now-host [data-tab="ai"]').click();
    await page.locator('#subme-now-host [data-ref="lockbtn"]').waitFor({ state: 'visible', timeout: 5000 });
    const before = requests.length;
    await page.locator(`#subme-now-host [data-action="${action}"]`).click();
    await page.locator('#subme-now-host [data-act="regen"]').click(); // puede estar guardado: forzar una consulta nueva
    await page.locator('#subme-now-host .sn-output [data-act="unlock"]').waitFor({ timeout: 10000 });
    return requests.length === before;
  };
  const expectWorksInPanel = async (action) => {
    await page.bringToFront();
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    const before = requests.length;
    await page.locator(`#subme-now-host [data-action="${action}"]`).click();
    await page.locator('#subme-now-host [data-act="regen"]').click();
    await page.waitForFunction(() => document.querySelector('#subme-now-host').shadowRoot.querySelector('.sn-output .vw') && !document.querySelector('#subme-now-host').shadowRoot.querySelector('[data-act="stop"]:not([hidden])'), null, { timeout: 10000 });
    return requests.length > before;
  };
  const lockFromOptions = async () => {
    await opts.bringToFront();
    await opts.click('#vLock');
    await opts.waitForSelector('#vUnlock');
  };

  // 1) Contraseña
  await opts.reload();
  await opts.waitForSelector('#vNext');
  await opts.fill('#vInput input', 'contraseña-segura-1');
  await opts.click('#vNext');
  await opts.fill('#vInput input', 'contraseña-segura-1');
  await opts.click('#vNext');
  await opts.waitForSelector('#vLock', { timeout: 15000 });
  const stored = await opts.evaluate(async () => JSON.stringify(await chrome.storage.local.get(null)));
  check('Contraseña: claves cifradas en disco (sin texto plano)', !stored.includes('sk-secreto') && stored.includes('"vault"'));
  await lockFromOptions();
  check('Contraseña: campo de API key deshabilitado al bloquear', await opts.isDisabled('#apiKey'));
  check('Contraseña: bloqueado no llama a la IA y ofrece desbloquear', await expectLockedInPanel('quiz'));
  {
    const { popup } = await unlockVia();
    await popup.fill('#secret input', 'incorrecta-123');
    await popup.click('#submit');
    await popup.waitForFunction(() => document.querySelector('#msg').textContent.includes('incorrecta'), null, { timeout: 15000 });
    check('Contraseña: rechaza una contraseña incorrecta', true);
    await popup.fill('#secret input', 'contraseña-segura-1');
    await Promise.all([popup.waitForEvent('close', { timeout: 15000 }), popup.click('#submit')]);
  }
  check('Contraseña: desbloqueada, la IA funciona', await expectWorksInPanel('quiz'));
  check('Contraseña: candado oculto tras desbloquear', await page.locator('#subme-now-host [data-ref="lockbtn"]').isHidden());
  const sessionKeys = await opts.evaluate(async () => (await SubmeVault.getSession())?.keys);
  check('Contraseña: la clave original se recupera intacta', sessionKeys?.anthropic === 'sk-secreto-de-prueba');

  // 2) Cambiar a imágenes
  await opts.bringToFront();
  await opts.reload();
  await opts.waitForSelector('#vChangeOpen');
  await opts.click('#vChangeOpen');
  await opts.click('#vChange [data-m="images"]');
  const order1 = await opts.$$eval('#vInput .sn-secret-images button', (bs) => bs.map((b) => b.getAttribute('aria-label')).join());
  await clickImages(opts, '#vInput', IMG_SEQ.slice(0, 3));
  await opts.click('#vNext');
  check('Imágenes: exige al menos 6', (await opts.textContent('#vMsg')).includes('al menos 6'));
  await opts.click('#vInput [data-k="clear"]');
  await clickImages(opts, '#vInput', IMG_SEQ);
  await opts.click('#vNext');
  const order2 = await opts.$$eval('#vInput .sn-secret-images button', (bs) => bs.map((b) => b.getAttribute('aria-label')).join());
  check('Imágenes: la grilla se mezcla en cada paso', order1 !== order2);
  await clickImages(opts, '#vInput', IMG_SEQ);
  await opts.click('#vNext');
  await opts.waitForFunction(() => document.querySelector('#vMsg')?.textContent.includes('cambiado'), null, { timeout: 15000 });
  check('Imágenes: método cambiado', (await opts.evaluate(async () => (await SubmeVault.status()).method)) === 'images');
  await lockFromOptions();
  check('Imágenes: bloqueado no llama a la IA', await expectLockedInPanel('notes'));
  {
    const { popup } = await unlockVia();
    await clickImages(popup, '#secret', [...IMG_SEQ].reverse());
    await popup.click('#submit');
    await popup.waitForFunction(() => document.querySelector('#msg').textContent.includes('no coinciden'), null, { timeout: 15000 });
    check('Imágenes: rechaza el orden incorrecto', true);
    await clickImages(popup, '#secret', IMG_SEQ);
    await Promise.all([popup.waitForEvent('close', { timeout: 15000 }), popup.click('#submit')]);
  }
  check('Imágenes: desbloqueadas, la IA funciona', await expectWorksInPanel('notes'));

  // 3) Cambiar a patrón
  await opts.bringToFront();
  await opts.reload();
  await opts.waitForSelector('#vChangeOpen');
  await opts.click('#vChangeOpen');
  await opts.click('#vChange [data-m="pattern"]');
  check('Patrón: tamaño correcto tras cambiar desde imágenes', (await opts.locator('#vInput svg').boundingBox()).width > 200);
  await drawPattern(opts, '#vInput svg', PAT_SEQ);
  const patText = await opts.textContent('#vInput .sn-secret-progress');
  check('Patrón: se dibuja con el mouse', patText.startsWith(`${PAT_SEQ.length} puntos`), patText);
  await opts.click('#vNext');
  await drawPattern(opts, '#vInput svg', PAT_SEQ);
  await opts.click('#vNext');
  await opts.waitForFunction(() => document.querySelector('#vMsg')?.textContent.includes('cambiado'), null, { timeout: 15000 });
  check('Patrón: método cambiado', (await opts.evaluate(async () => (await SubmeVault.status()).method)) === 'pattern');
  await lockFromOptions();
  check('Patrón: bloqueado no llama a la IA', await expectLockedInPanel('eli5'));
  {
    const { popup } = await unlockVia();
    await drawPattern(popup, '#secret svg', [0, 1, 2, 3, 4, 9]);
    await popup.waitForFunction(() => document.querySelector('#msg').textContent.includes('no coincide'), null, { timeout: 15000 });
    check('Patrón: rechaza un patrón incorrecto', true);
    await Promise.all([popup.waitForEvent('close', { timeout: 15000 }), drawPattern(popup, '#secret svg', PAT_SEQ)]);
    check('Patrón: se desbloquea solo al soltar el mouse', true);
  }
  check('Patrón: desbloqueado, la IA funciona', await expectWorksInPanel('eli5'));

  // Desactivar
  await opts.bringToFront();
  await opts.reload();
  await opts.waitForSelector('#vDisable');
  opts.once('dialog', (d) => d.accept());
  await opts.click('#vDisable');
  await opts.waitForSelector('#vNext');
  const plain = await opts.evaluate(async () => (await chrome.storage.local.get(['settings', 'vault'])));
  check('Desactivar protección restaura las claves', plain.settings.providers.anthropic.apiKey === 'sk-secreto-de-prueba' && !plain.vault);

  // ---------- v1.5: pulido ----------
  check('Tarjeta del video con título y canal', (await page.locator('#subme-now-host [data-ref="vtitle"]').textContent()) === 'Video de prueba' && (await page.locator('#subme-now-host [data-ref="vmeta"]').textContent()).includes('Canal Test'));
  await opts.evaluate(async () => { const { settings } = await chrome.storage.local.get('settings'); settings.density = 'compact'; settings.onboardingDone = false; await chrome.storage.local.set({ settings }); });
  await page.reload();
  await page.locator('#subme-now-host .sn-tour-card').waitFor({ timeout: 10000 });
  check('Recorrido guiado: aparece la primera vez', (await page.locator('#subme-now-host .sn-tour-step').textContent()).includes('1 de 3'));
  await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'v15-tour.png'), clip: { x: 600, y: 0, width: 680, height: 720 } });
  for (let k = 0; k < 3; k++) await page.locator('#subme-now-host [data-tour="next"]').click();
  await page.waitForTimeout(300);
  const tourDone = await opts.evaluate(async () => (await chrome.storage.local.get('settings')).settings.onboardingDone);
  check('Recorrido guiado: se completa y no vuelve a aparecer', (await page.locator('#subme-now-host .sn-tour').count()) === 0 && tourDone === true);
  check('Densidad compacta', await page.evaluate(() => document.querySelector('#subme-now-host').shadowRoot.querySelector('.sn-root').classList.contains('compact')));

  // Navegación SPA a otra página
  await page.evaluate(() => { history.pushState({}, '', '/'); document.dispatchEvent(new Event('yt-navigate-finish')); });
  await page.waitForTimeout(300);
  check('Panel se oculta fuera de /watch', !(await page.evaluate(() => !!document.querySelector('#subme-now-host'))));

  // YouTube Shorts: panel flotante
  await page.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend', '<ytd-shorts><ytd-reel-video-renderer is-active><video id="short-video" width="300" height="500" muted></video></ytd-reel-video-renderer></ytd-shorts>');
    history.pushState({}, '', '/shorts/SHORT123456');
    document.dispatchEvent(new Event('yt-navigate-finish'));
  });
  await page.locator('#subme-now-host [data-tab="transcript"]').click();
  await page.locator('#subme-now-host .sn-seg').first().waitFor({ timeout: 10000 });
  const float = await page.evaluate(() => {
    const h = document.querySelector('#subme-now-host');
    return { parent: h.parentElement.tagName, mode: h.dataset.mode, position: getComputedStyle(h).position };
  });
  check('Shorts: panel flotante', float.parent === 'BODY' && float.mode === 'float' && float.position === 'fixed', JSON.stringify(float));
  check('Shorts: transcripción cargada', (await page.locator('#subme-now-host .sn-seg').count()) === 3);
  await page.locator('#subme-now-host .sn-seg').nth(1).click();
  check('Shorts: clic salta en el video del Short', (await page.evaluate(() => document.querySelector('#short-video').currentTime)) === 4);
  await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'subme-e2e-shorts.png') });
  await page.locator('#subme-now-host [data-act="toggle"].sn-chevron').click();
  check('Shorts: se puede contraer', await page.locator('#subme-now-host [data-ref="body"]').isHidden());
  await page.locator('#subme-now-host [data-act="toggle"].sn-chevron').click();

  // Short donde la API interna falla (HTTP 400) y las pistas exigen el token del reproductor,
  // como en el caso real reportado. El reproductor simulado pide los subtítulos con "pot".
  failInnertube = true;
  await page.evaluate(() => {
    const host = document.querySelector('ytd-reel-video-renderer[is-active]');
    const p = document.createElement('div');
    p.id = 'shorts-player';
    p.style.cssText = 'width:10px;height:10px';
    let track = {};
    p.getOption = () => track;
    p.loadModule = () => {};
    p.unloadModule = () => { track = {}; };
    p.setOption = (mod, key, val) => {
      if (key !== 'track') return;
      track = val || {};
      if (track.languageCode) fetch(`/api/timedtext?v=SHORTPOT001&lang=${track.languageCode}&pot=TOKEN123&c=WEB&fmt=json3`);
    };
    host.appendChild(p);
    history.pushState({}, '', '/shorts/SHORTPOT001');
    document.dispatchEvent(new Event('yt-navigate-finish'));
  });
  await page.locator('#subme-now-host [data-tab="transcript"]').click();
  await page.waitForFunction(() => document.querySelector('#subme-now-host').shadowRoot.querySelector('.sn-seg')?.textContent.includes('Cuando me dicen'), null, { timeout: 15000 });
  check('Shorts: transcripción con el token del reproductor (API interna con error 400)', true);
  check('Shorts: la pista se pidió con el token capturado', timedtextRequests.some((u) => u.includes('lang=es') && u.includes('pot=TOKEN123') && u.includes('v=x')));
  const langLabel = await page.locator('#subme-now-host [data-ref="lang"]').evaluate((s) => s.options[s.selectedIndex]?.textContent || '');
  check('Shorts: el selector de idioma no queda vacío', langLabel.trim().length > 0, langLabel);
  failInnertube = false;

  // Volver a un video normal: el panel vuelve a la columna lateral
  await page.evaluate(() => {
    document.querySelector('ytd-shorts').remove();
    history.pushState({}, '', '/watch?v=abc123XYZ00');
    document.dispatchEvent(new Event('yt-navigate-finish'));
  });
  await page.waitForFunction(() => document.querySelector('#secondary-inner > #subme-now-host'), null, { timeout: 5000 });
  check('De Shorts a video: panel vuelve a la columna', true);

  // Video sin subtítulos en YouTube: aviso informativo, no un error.
  await page.evaluate(() => { history.pushState({}, '', '/watch?v=NOSUBS0001'); document.dispatchEvent(new Event('yt-navigate-finish')); });
  await page.locator('#subme-now-host [data-tab="transcript"]').click();
  await page.locator('#subme-now-host .sn-info').waitFor({ timeout: 10000 });
  const infoState = await page.evaluate(() => {
    const st = document.querySelector('#subme-now-host').shadowRoot.querySelector('[data-ref="status"]');
    return { error: st.classList.contains('error'), retry: !!st.querySelector('[data-act="retry"]'), text: st.textContent };
  });
  check('Sin subtítulos: aviso claro, sin error ni "Reintentar"', !infoState.error && !infoState.retry && infoState.text.includes('no tiene subtítulos'), infoState.text.slice(0, 80));


  // ---------- v1.6: transcripción con IA (Gemini) para videos sin subtítulos ----------
  check('Sin subtítulos: ofrece "Transcribir con IA"', await page.locator('#subme-now-host [data-act="transcribe"]').isVisible());
  await page.locator('#subme-now-host').screenshot({ path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'subme-e2e-nocaptions.png') });
  await page.locator('#subme-now-host [data-act="transcribe"]').click();
  await page.locator('#subme-now-host [data-ref="status"] [data-act="settings"]').waitFor({ timeout: 5000 });
  check('Transcribir con IA sin clave de Gemini: pide configurarla', geminiRequests.length === 0);
  await opts.evaluate(async (api) => {
    const { settings } = await chrome.storage.local.get('settings');
    settings.providers.gemini = { apiKey: 'g-key-de-prueba', model: 'gemini-2.5-flash', baseUrl: api };
    await chrome.storage.local.set({ settings });
  }, API);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(400);
  await page.evaluate(() => { history.pushState({}, '', '/watch?v=abc123XYZ00'); document.dispatchEvent(new Event('yt-navigate-finish')); });
  await page.waitForTimeout(600);
  await page.evaluate(() => { history.pushState({}, '', '/watch?v=NOSUBS0001'); document.dispatchEvent(new Event('yt-navigate-finish')); });
  await page.locator('#subme-now-host [data-act="transcribe"]').click({ timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('#subme-now-host').shadowRoot.querySelectorAll('.sn-seg').length === 3, null, { timeout: 10000 });
  const g = geminiRequests.at(-1);
  check('Gemini recibe la URL del video de YouTube', g && g.body.contents[0].parts[0].file_data.file_uri === 'https://www.youtube.com/watch?v=NOSUBS0001' && g.key === 'g-key-de-prueba' && g.url.includes('gemini-2.5-flash'));
  const aiTr = await page.evaluate(() => {
    const sh = document.querySelector('#subme-now-host').shadowRoot;
    return { lang: sh.querySelector('[data-ref="lang"]').selectedOptions[0]?.textContent, first: sh.querySelector('.sn-seg').textContent, second: sh.querySelectorAll('.sn-seg')[1].dataset.t };
  });
  check('Transcripción con IA en el panel, con marcas de tiempo', aiTr.lang === 'Transcripción con IA' && aiTr.first.includes('lo transcribió la IA') && aiTr.second === '5', JSON.stringify(aiTr));
  // Al volver al video, la transcripción hecha con IA se recupera del historial sin pagarla de nuevo.
  await page.evaluate(() => { history.pushState({}, '', '/watch?v=abc123XYZ00'); document.dispatchEvent(new Event('yt-navigate-finish')); });
  await page.waitForTimeout(800);
  await page.evaluate(() => { history.pushState({}, '', '/watch?v=NOSUBS0001'); document.dispatchEvent(new Event('yt-navigate-finish')); });
  await page.waitForFunction(() => document.querySelector('#subme-now-host').shadowRoot.querySelectorAll('.sn-seg').length === 3, null, { timeout: 10000 });
  check('Transcripción con IA guardada: no se vuelve a pedir', geminiRequests.length === 1);

  // ---------- v1.6: historial por video ----------
  await page.evaluate(() => { history.pushState({}, '', '/watch?v=abc123XYZ00'); document.dispatchEvent(new Event('yt-navigate-finish')); });
  await page.waitForTimeout(800);
  const rec = (await opts.evaluate((id) => chrome.runtime.sendMessage({ type: 'historyGet', videoId: id }), VIDEO_ID)).record;
  check('Historial: guarda resultados, chat y transcripción del video', rec && rec.results.summary && rec.results.flashcards && rec.chat.length >= 2 && rec.transcript.segments.length > 0 && rec.title === 'Video de prueba',
    rec ? Object.keys(rec.results).join(',') : 'sin registro');
  // Progreso de una vista: responder una pregunta del quiz.
  await page.locator('#subme-now-host [data-tab="ai"]').click();
  await page.locator('#subme-now-host [data-action="quiz"]').click();
  await page.locator('#subme-now-host .vw-option').first().waitFor({ timeout: 10000 });
  await page.evaluate(() => document.querySelector('#subme-now-host').shadowRoot.querySelectorAll('.vw-option')[1].click());
  await page.waitForTimeout(1200);
  const rec2 = (await opts.evaluate((id) => chrome.runtime.sendMessage({ type: 'historyGet', videoId: id }), VIDEO_ID)).record;
  check('Historial: guarda el progreso del quiz', rec2?.viewStates?.quiz?.answers?.[0] === 1, JSON.stringify(rec2?.viewStates?.quiz));
  // Recargar la página: todo vuelve sin llamar a la IA.
  const reqBefore = requests.length;
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#subme-now-host')?.shadowRoot.querySelectorAll('.sn-seg').length > 0, null, { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.locator('#subme-now-host [data-tab="ai"]').click();
  const badge = await page.evaluate(() => document.querySelector('#subme-now-host').shadowRoot.querySelector('[data-ref="aibadge"]').textContent);
  check('Historial: al volver al video se ven los resultados guardados', Number(badge) >= 5, `insignia ${badge}`);
  await page.locator('#subme-now-host [data-action="quiz"]').click();
  await page.locator('#subme-now-host .vw-option').first().waitFor({ timeout: 5000 });
  const quizState = await page.evaluate(() => {
    const sh = document.querySelector('#subme-now-host').shadowRoot;
    return { picked: [...sh.querySelectorAll('.vw-option')].findIndex((b) => b.className.includes('ok') || b.className.includes('bad') || b.className.includes('picked') || b.disabled), note: sh.querySelector('.sn-output').textContent.includes('Guardado el') };
  });
  check('Historial: el quiz vuelve con la respuesta dada y sin gastar IA', quizState.picked >= 0 && quizState.note && requests.length === reqBefore, JSON.stringify(quizState));
  await page.locator('#subme-now-host [data-tab="chat"]').click();
  await page.locator('#subme-now-host .sn-chat-tools').screenshot({ path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'subme-e2e-chattools.png') });
  check('Chat: los enlaces del pie no quedan pegados', await page.evaluate(() => { const [a, b] = document.querySelector('#subme-now-host').shadowRoot.querySelectorAll('.sn-chat-tools .sn-link'); return b.getBoundingClientRect().left - a.getBoundingClientRect().right >= 12; }));
  check('Historial: el chat se restaura', (await page.locator('#subme-now-host .sn-msg.user').count()) >= 1);
  // Pedido libre guardado
  await page.locator('#subme-now-host [data-tab="ai"]').click();
  await page.locator('#subme-now-host [data-ref="free"]').fill('Dame tres ideas para aplicar esto');
  await page.locator('#subme-now-host [data-act="free"]').click();
  await page.locator('#subme-now-host [data-ref="saved"] .sn-chip').waitFor({ timeout: 10000 });
  check('Historial: los pedidos libres quedan guardados', (await page.locator('#subme-now-host [data-ref="saved"] .sn-chip').textContent()).includes('Dame tres ideas'));
  await page.waitForTimeout(400);

  // ---------- v1.6: biblioteca ----------
  const lib = await context.newPage();
  lib.on('pageerror', (e) => errors.push(`biblioteca: ${e.message}`));
  await lib.goto(`chrome-extension://${extId}/src/library/library.html`);
  await lib.locator('.vcard').first().waitFor({ timeout: 10000 });
  check('Biblioteca: lista los videos guardados', (await lib.locator('.vcard').count()) === 2, `${await lib.locator('.vcard').count()} videos`);
  check('Biblioteca: tarjeta con miniatura, título y resultados', (await lib.locator('.vcard', { hasText: 'Video de prueba' }).locator('.chip').count()) >= 5);
  await lib.fill('#q', 'pronunciacion');
  await lib.locator('.hit', { hasText: 'pronunciación' }).first().waitFor({ timeout: 5000 });
  check('Biblioteca: busca sin importar acentos y da el minuto', (await lib.locator('.hit .ts').first().textContent()).includes('00:05'));
  await lib.fill('#q', 'Tema central');
  await lib.locator('.hit', { hasText: 'Tema central' }).first().waitFor({ timeout: 5000 });
  const hitTs = await lib.locator('.hit .ts').first().getAttribute('href');
  check('Biblioteca: busca dentro de los resultados con su minuto', hitTs.includes(`v=${VIDEO_ID}`) && hitTs.includes('t=8s'), hitTs);
  await lib.fill('#q', '');
  await lib.waitForTimeout(400);
  await lib.selectOption('#fType', 'ai-transcript');
  check('Biblioteca: filtro por tipo', (await lib.locator('.vcard').count()) === 1 && (await lib.locator('.vcard').textContent()).includes('Sin subtítulos'));
  await lib.selectOption('#fType', '');
  await lib.locator('.vcard', { hasText: 'Video de prueba' }).locator('.star').click();
  await lib.locator('#fFav').click();
  check('Biblioteca: favoritos', (await lib.locator('.vcard').count()) === 1);
  await lib.locator('#fFav').click();
  await lib.locator('.vcard', { hasText: 'Video de prueba' }).click();
  await lib.locator('#detail .d-nav [data-sel]').first().waitFor({ timeout: 5000 });
  await lib.locator('#tagInput').fill('idiomas');
  await lib.locator('#tagInput').press('Enter');
  await lib.waitForTimeout(300);
  await lib.locator('#detail [data-sel="r:flashcards"]').click();
  const libCards = await lib.evaluate(() => document.querySelector('#dView > div').shadowRoot.querySelectorAll('.vw-card, .vw-flip, .vw-face').length);
  check('Biblioteca: abre un resultado con su vista gráfica', libCards > 0);
  await lib.keyboard.press('Escape');
  check('Biblioteca: etiquetas', (await lib.locator('#fTag option').count()) === 2 && (await lib.locator('.vcard .chip.tag').first().textContent()) === '#idiomas');
  // Repaso combinado de tarjetas
  check('Biblioteca: botón de repaso con las tarjetas pendientes', (await lib.locator('#reviewBtn b').textContent()) === '3');
  await lib.locator('#reviewBtn').click();
  await lib.locator('.rv-card').click();
  await lib.locator('[data-grade="good"]').click();
  await lib.waitForTimeout(200);
  const deck = await lib.evaluate(() => SubmeHistory.deckAll());
  check('Biblioteca: repaso con repetición espaciada', deck.length === 1 && deck[0].box === 1 && deck[0].due > Date.now() + 3600000);
  await lib.keyboard.press('Escape');
  await lib.waitForTimeout(200);
  check('Biblioteca: quedan 2 tarjetas para hoy', (await lib.locator('#reviewBtn b').textContent()) === '2');
  // Exportar
  await lib.locator('#exportBtn').click();
  const [libDl] = await Promise.all([lib.waitForEvent('download'), lib.locator('[data-export="json"]').click()]);
  const backup = JSON.parse(fs.readFileSync(await libDl.path(), 'utf8'));
  check('Biblioteca: respaldo JSON completo', backup.videos.length === 2 && backup.deck.length === 1);
  await lib.locator('#exportBtn').click();
  const [libMd] = await Promise.all([lib.waitForEvent('download'), lib.locator('[data-export="md"]').click()]);
  const libText = fs.readFileSync(await libMd.path(), 'utf8');
  check('Biblioteca: exportar todo a Markdown', libText.includes('## Video de prueba') && libText.includes('### Resumen') && libText.includes('**P:**'));
  // Borrado automático por antigüedad (los favoritos se conservan)
  await lib.evaluate(async () => {
    for (const r of await SubmeHistory.all()) { r.updatedAt = Date.now() - 40 * 86400000; await SubmeHistory.put(r); }
  });
  await lib.locator('#settingsBtn').click();
  await lib.selectOption('#historyDays', '30');
  await lib.waitForTimeout(500);
  const left = await lib.evaluate(async () => (await SubmeHistory.all()).map((r) => r.videoId));
  check('Biblioteca: borra lo viejo y conserva favoritos', left.length === 1 && left[0] === 'abc123XYZ00', left.join(','));
  await lib.selectOption('#historyDays', '0');
  await lib.close();

  // ---------- v1.6: panel lateral de Chrome ----------
  const ytTabId = await opts.evaluate(async () => {
    for (const t of await chrome.tabs.query({})) {
      try { const r = await chrome.tabs.sendMessage(t.id, { type: 'subme-remote', fn: 'whoami' }); if (r?.ok && r.value) return t.id; } catch { /* no es YouTube */ }
    }
    return null;
  });
  const side = await context.newPage();
  side.on('pageerror', (e) => errors.push(`panel lateral: ${e.message}`));
  await side.goto(`chrome-extension://${extId}/src/sidepanel/sidepanel.html#tab=${ytTabId}`);
  await side.waitForFunction(() => document.querySelector('#subme-now-host')?.shadowRoot.querySelectorAll('.sn-seg').length > 0, null, { timeout: 15000 });
  check('Panel lateral: muestra la transcripción del video de la pestaña', (await side.evaluate(() => document.querySelector('#subme-now-host').getAttribute('data-mode'))) === 'side');
  check('Panel lateral: el panel dentro de YouTube se oculta', await page.evaluate(() => getComputedStyle(document.querySelector('#subme-now-host')).display === 'none'));
  await side.evaluate(() => document.querySelector('#subme-now-host').shadowRoot.querySelectorAll('.sn-seg')[2].click());
  await page.waitForTimeout(400);
  check('Panel lateral: clic en una línea salta en el video', Math.round(await page.evaluate(() => document.querySelector('video').currentTime)) === 8);
  await side.locator('#subme-now-host [data-tab="ai"]').click();
  await side.screenshot({ path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'subme-e2e-side.png') });
  check('Panel lateral: resultados guardados disponibles', Number(await side.evaluate(() => document.querySelector('#subme-now-host').shadowRoot.querySelector('[data-ref="aibadge"]').textContent)) >= 5);
  await side.close();
  await page.waitForTimeout(400);
  check('Panel lateral: al cerrarlo vuelve el panel en YouTube', await page.evaluate(() => getComputedStyle(document.querySelector('#subme-now-host')).display !== 'none'));

  // ---------- v1.6: el logo toma el color de acento ----------
  await opts.evaluate(async () => { const { settings } = await chrome.storage.local.get('settings'); settings.iconColor = '#2f7de1'; await chrome.storage.local.set({ settings }); });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(500);
  const logoBg = await page.evaluate(() => getComputedStyle(document.querySelector('#subme-now-host').shadowRoot.querySelector('.sn-logo')).backgroundImage);
  await page.locator('#subme-now-host').screenshot({ path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'subme-e2e-accent.png') });
  check('Logo: el degradé usa el color elegido (azul)', logoBg.includes('47, 125, 225') && !logoBg.includes('255, 61, 127'), logoBg);
  await opts.reload();
  await opts.waitForSelector('.provider');
  await opts.waitForTimeout(500);
  const optLogo = await opts.evaluate(() => {
    const img = document.querySelector('img[data-logo]');
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    return [...ctx.getImageData(Math.round(c.width * 0.12), Math.round(c.height * 0.5), 1, 1).data];
  });
  check('Logo: en la configuración también cambia de color', optLogo[2] > optLogo[0] + 60, optLogo.join(','));
  await opts.evaluate(async () => { const { settings } = await chrome.storage.local.get('settings'); settings.iconColor = ''; await chrome.storage.local.set({ settings }); });

  check('Sin errores en la consola', errors.length === 0, errors.join(' | '));
} finally {
  await context.close();
  server.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} pruebas OK`);
process.exit(failed ? 1 : 0);
