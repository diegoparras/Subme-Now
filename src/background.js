/* Subme Now — service worker: realiza las llamadas a las APIs de IA (evita CORS y mantiene las claves fuera de la página). */
importScripts('shared/settings.js', 'shared/providers.js');

const { getSettings } = SubmeSettings;
const P = SubmeProviders;

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') chrome.runtime.openOptionsPage();
});

/** Lector SSE genérico. Llama a onEvent(eventName, data) por cada evento. */
async function readSSE(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let ev = { event: null, data: [] };
  const flush = () => {
    if (ev.data.length) onEvent(ev.event, ev.data.join('\n'));
    ev = { event: null, data: [] };
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).replace(/\r$/, '');
      buffer = buffer.slice(idx + 1);
      if (line === '') { flush(); continue; }
      if (line.startsWith(':')) continue; // comentario / keep-alive
      const c = line.indexOf(':');
      const field = c < 0 ? line : line.slice(0, c);
      let val = c < 0 ? '' : line.slice(c + 1);
      if (val.startsWith(' ')) val = val.slice(1);
      if (field === 'data') ev.data.push(val);
      else if (field === 'event') ev.event = val;
    }
  }
  if (buffer.trim()) {
    const line = buffer.trim();
    if (line.startsWith('data:')) ev.data.push(line.slice(5).trim());
  }
  flush();
}

async function runChat({ system, messages, providerId }, signal, onText) {
  const settings = await getSettings();
  const cfg = P.resolveConfig(settings, providerId);
  P.validateConfig(cfg);
  const { url, init } = P.buildChatRequest(cfg, { system, messages });
  const res = await fetch(url, { ...init, signal });
  if (!res.ok) throw await P.readError(res);

  let notice = '';
  await readSSE(res, (eventName, data) => {
    let parsed;
    try {
      parsed = P.parseStreamEvent(cfg, eventName, data);
    } catch (e) {
      if (e instanceof SyntaxError) return; // fragmento no JSON: ignorar
      throw e;
    }
    if (parsed.text) onText(parsed.text);
    if (parsed.notice) notice = parsed.notice;
  });
  return { notice, model: cfg.model, provider: cfg.label };
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'subme-ai') return;
  let controller = null;
  let alive = true;
  const post = (msg) => { if (alive) try { port.postMessage(msg); } catch { alive = false; } };

  port.onDisconnect.addListener(() => { alive = false; controller?.abort(); });
  port.onMessage.addListener(async (msg) => {
    if (msg.type === 'abort') { controller?.abort(); return; }
    if (msg.type !== 'run') return; // 'ping' solo mantiene vivo el service worker
    controller = new AbortController();
    try {
      const meta = await runChat(msg.payload, controller.signal, (text) => post({ type: 'delta', text }));
      post({ type: 'done', ...meta });
    } catch (e) {
      if (e.name !== 'AbortError') post({ type: 'error', message: e.message || String(e) });
    }
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === 'openOptions') {
        await chrome.runtime.openOptionsPage();
        return { ok: true };
      }
      if (msg.type === 'listModels') {
        const settings = await getSettings();
        const cfg = P.resolveConfig(settings, msg.providerId);
        if (!cfg.baseUrl) throw new Error('Falta la URL base.');
        const { url, init } = P.buildModelsRequest(cfg);
        const res = await fetch(url, init);
        if (!res.ok) throw await P.readError(res);
        const models = P.parseModels(cfg, await res.json()).sort();
        return { ok: true, models };
      }
      if (msg.type === 'testProvider') {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 60000);
        let text = '';
        try {
          const meta = await runChat(
            { providerId: msg.providerId, system: 'Eres un verificador de conexión.', messages: [{ role: 'user', content: 'Responde únicamente con: OK' }] },
            controller.signal,
            (t) => { text += t; },
          );
          return { ok: true, text: text.trim(), ...meta };
        } finally {
          clearTimeout(timer);
        }
      }
      return { ok: false, error: 'Mensaje desconocido' };
    } catch (e) {
      return { ok: false, error: e.name === 'AbortError' ? 'Tiempo de espera agotado.' : e.message || String(e) };
    }
  })().then(sendResponse);
  return true;
});
