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
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`); };

// ---------- API de IA falsa (compatible con OpenAI) ----------
const requests = [];
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
    const json = JSON.parse(body || '{}');
    requests.push(json);
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const last = json.messages.at(-1).content;
    const answer = last.includes('OK') ? 'OK'
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
  <div id="secondary" style="width:400px;display:block"><div id="secondary-inner" style="display:block"></div></div>
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
    if (url.includes('/youtubei/v1/get_transcript')) {
      const body = JSON.parse(route.request().postData());
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(transcriptResponse(body.params === 'PARAMS_EN' ? 'en' : 'es')) });
    }
    if (url.includes('/watch')) return route.fulfill({ contentType: 'text/html', body: watchHtml });
    return route.fulfill({ status: 404, body: '' });
  });

  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
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
  await page.waitForFunction(() => document.querySelector('#subme-now-host').shadowRoot.querySelector('.sn-output table'), null, { timeout: 10000 });
  check('El nuevo modelo se usa en la consulta', requests.at(-1).model === 'fake-model-2');

  // Chat
  await page.locator('#subme-now-host [data-tab="chat"]').click();
  await page.locator('#subme-now-host [data-ref="chatinput"]').fill('¿De qué trata?');
  await page.locator('#subme-now-host [data-ref="chatinput"]').press('Enter');
  await page.waitForFunction(() => document.querySelector('#subme-now-host').shadowRoot.querySelector('.sn-msg.assistant table'), null, { timeout: 10000 });
  const chatReq = requests.at(-1);
  check('Chat responde con historial', chatReq.messages.length === 2 && chatReq.messages[1].content === '¿De qué trata?');

  await page.locator('#subme-now-host [data-tab="ai"]').click();
  await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'subme-e2e.png') });

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

  // Volver a un video normal: el panel vuelve a la columna lateral
  await page.evaluate(() => {
    document.querySelector('ytd-shorts').remove();
    history.pushState({}, '', '/watch?v=abc123XYZ00');
    document.dispatchEvent(new Event('yt-navigate-finish'));
  });
  await page.waitForFunction(() => document.querySelector('#secondary-inner > #subme-now-host'), null, { timeout: 5000 });
  check('De Shorts a video: panel vuelve a la columna', true);

  check('Sin errores en la consola', errors.length === 0, errors.join(' | '));
} finally {
  await context.close();
  server.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} pruebas OK`);
process.exit(failed ? 1 : 0);
