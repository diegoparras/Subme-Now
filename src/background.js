/* Subme Now — service worker: realiza las llamadas a las APIs de IA (evita CORS y mantiene las claves fuera de la página). */
importScripts('shared/settings.js', 'shared/providers.js', 'shared/vault.js', 'shared/history.js', 'shared/logo.js');

const { getSettings } = SubmeSettings;
const P = SubmeProviders;

// Seguridad: las API keys solo se pueden leer desde contextos de la extensión (service worker y
// página de opciones). Los content scripts que corren dentro de YouTube no tienen acceso al storage.
chrome.storage.local.setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' })?.catch?.(() => {});

/** Configuración sin secretos, para la página de YouTube. */
async function publicSettings(settings) {
  const out = structuredClone(settings);
  const vault = await SubmeVault.status();
  for (const [id, conf] of Object.entries(out.providers || {})) {
    const hasKey = vault.enabled ? !!vault.hasKey[id] : !!conf.apiKey;
    out.providers[id] = { ...conf, hasKey, apiKey: '' };
  }
  out.vault = { enabled: vault.enabled, locked: vault.locked };
  return out;
}

/**
 * Configuración con las API keys, solo para uso interno del service worker.
 * Si las claves están protegidas con contraseña y bloqueadas, lanza un error con code 'LOCKED'.
 */
async function settingsWithKeys() {
  const settings = await getSettings();
  if (!(await SubmeVault.isEnabled())) return settings;
  const session = await SubmeVault.touch();
  if (!session) {
    throw Object.assign(new Error('Tus API keys están protegidas con contraseña. Desbloquéalas para usar la IA.'), { code: 'LOCKED' });
  }
  for (const [id, key] of Object.entries(session.keys || {})) {
    settings.providers[id] = { ...settings.providers[id], apiKey: key };
  }
  return settings;
}

function openUnlockWindow() {
  return chrome.windows.create({ url: chrome.runtime.getURL('src/unlock/unlock.html'), type: 'popup', width: 440, height: 720, focused: true });
}

/** Agrega los atajos de teclado asignados (para mostrarlos en el panel). */
async function withShortcuts(settings) {
  const shortcuts = {};
  try { (await chrome.commands.getAll()).forEach((c) => { if (c.name && c.shortcut) shortcuts[c.name] = c.shortcut; }); } catch { /* sin atajos */ }
  return { ...settings, shortcuts };
}

const CONTENT_WRITABLE = ['panelCollapsed', 'shortsCollapsed', 'showTimestamps', 'autoScroll', 'responseLanguage', 'provider', 'ttsVoice', 'ttsRate', 'windows', 'onboardingDone'];

async function updateFromContent({ patch = {}, model }) {
  const s = await getSettings();
  for (const k of CONTENT_WRITABLE) if (k in patch) s[k] = patch[k];
  if (!P.PROVIDERS[s.provider]) s.provider = 'openrouter';
  if (typeof model === 'string') {
    const id = s.provider;
    const m = model.trim().slice(0, 200);
    s.providers[id] = { ...s.providers[id], model: m };
    if (m) s.recentModels = { ...(s.recentModels || {}), [id]: [m, ...((s.recentModels || {})[id] || []).filter((x) => x !== m)].slice(0, 8) };
  }
  await SubmeSettings.saveSettings(s);
  return publicSettings(s);
}

// Atajos de teclado (se configuran en chrome://extensions/shortcuts).
chrome.commands?.onCommand.addListener((command, tab) => {
  if (tab?.id != null) chrome.tabs.sendMessage(tab.id, { type: 'subme-command', command }).catch(() => {});
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

/** Ícono de la barra con el color de acento, y comportamiento del ícono (panel lateral u opciones). */
async function applyChrome(settings) {
  try {
    const imageData = await SubmeLogo.actionIcon(settings.iconColor);
    if (imageData) await chrome.action.setIcon({ imageData });
    else await chrome.action.setIcon({ path: { 16: '/icons/icon16.png', 32: '/icons/icon32.png', 48: '/icons/icon48.png' } });
  } catch { /* se mantiene el ícono por defecto */ }
  try { await chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: settings.sidePanelOnAction !== false }); } catch { /* sin panel lateral */ }
}

let lastIconColor = null;
let lastSideBehavior = null;
SubmeSettings.onSettingsChanged((s) => {
  if (s.iconColor === lastIconColor && s.sidePanelOnAction === lastSideBehavior) return;
  lastIconColor = s.iconColor;
  lastSideBehavior = s.sidePanelOnAction;
  applyChrome(s);
});

/** Limpieza automática del historial (como mucho una vez por hora). */
let lastPrune = 0;
async function maybePrune(force = false) {
  if (!force && Date.now() - lastPrune < 3600000) return;
  lastPrune = Date.now();
  try { await SubmeHistory.prune((await getSettings()).historyDays); } catch { /* sin historial */ }
}

async function startup() {
  const s = await getSettings();
  lastIconColor = s.iconColor;
  lastSideBehavior = s.sidePanelOnAction;
  await applyChrome(s);
  maybePrune(true);
}
chrome.runtime.onStartup.addListener(startup);

chrome.runtime.onInstalled.addListener((details) => {
  startup();
  if (details.reason === 'install') chrome.runtime.openOptionsPage();
});

/** Datos del video que el panel de YouTube puede guardar en el historial. */
function cleanVideo(v = {}) {
  return {
    title: String(v.title || '').slice(0, 300),
    author: String(v.author || '').slice(0, 200),
    channelId: String(v.channelId || '').slice(0, 64),
    lengthSeconds: Number(v.lengthSeconds) || 0,
    isShort: !!v.isShort,
  };
}

const VIDEO_ID = /^[\w-]{6,20}$/;

/** Transcripción con Gemini leyendo el video de YouTube directamente. */
async function runTranscribe({ videoId }, signal, onText) {
  if (!VIDEO_ID.test(videoId || '')) throw new Error('Video no válido.');
  const settings = await settingsWithKeys();
  const cfg = P.resolveConfig(settings, 'gemini');
  if (!cfg.apiKey) throw Object.assign(new Error('Para transcribir con IA necesitas una API key de Gemini. Agrégala en la configuración de Subme Now.'), { code: 'NO_GEMINI' });
  const { url, init } = P.buildTranscribeRequest(cfg, `https://www.youtube.com/watch?v=${videoId}`);
  const res = await fetch(url, { ...init, signal });
  if (!res.ok) {
    const err = await P.readError(res);
    if (res.status === 400 || res.status === 403) err.message += ' Solo se pueden transcribir videos públicos.';
    throw err;
  }
  let notice = '';
  await readSSE(res, (eventName, data) => {
    let parsed;
    try { parsed = P.parseStreamEvent(cfg, eventName, data); } catch (e) { if (e instanceof SyntaxError) return; throw e; }
    if (parsed.text) onText(parsed.text);
    if (parsed.notice) notice = parsed.notice;
  });
  return { notice, model: cfg.model };
}

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
  const settings = await settingsWithKeys();
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
  if (port.name !== 'subme-ai' && port.name !== 'subme-transcribe') return;
  let controller = null;
  let alive = true;
  const post = (msg) => { if (alive) try { port.postMessage(msg); } catch { alive = false; } };

  port.onDisconnect.addListener(() => { alive = false; controller?.abort(); });
  port.onMessage.addListener(async (msg) => {
    if (msg.type === 'abort') { controller?.abort(); return; }
    if (msg.type !== 'run') return; // 'ping' solo mantiene vivo el service worker
    controller = new AbortController();
    try {
      const run = port.name === 'subme-transcribe' ? runTranscribe : runChat;
      const meta = await run(msg.payload, controller.signal, (text) => post({ type: 'delta', text }));
      post({ type: 'done', ...meta });
    } catch (e) {
      if (e.name !== 'AbortError') post({ type: 'error', message: e.message || String(e), code: e.code });
    }
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === 'openOptions') {
        await chrome.runtime.openOptionsPage();
        return { ok: true };
      }
      if (msg.type === 'historyGet') {
        const s = await getSettings();
        if (s.historyEnabled === false || !VIDEO_ID.test(msg.videoId || '')) return { ok: true, record: null };
        return { ok: true, record: await SubmeHistory.get(msg.videoId) };
      }
      if (msg.type === 'historySave') {
        const s = await getSettings();
        if (s.historyEnabled === false || !VIDEO_ID.test(msg.videoId || '')) return { ok: true, saved: false };
        const patch = { ...msg.patch, video: cleanVideo(msg.patch?.video) };
        delete patch.meta; // favoritos y etiquetas solo desde la biblioteca
        await SubmeHistory.applyPatch(msg.videoId, patch);
        maybePrune();
        return { ok: true, saved: true };
      }
      if (msg.type === 'openLibrary') {
        const hash = VIDEO_ID.test(msg.videoId || '') ? `#v=${msg.videoId}` : '';
        await chrome.tabs.create({ url: chrome.runtime.getURL(`src/library/library.html${hash}`) });
        return { ok: true };
      }
      if (msg.type === 'openSidePanel') {
        const tabId = sender?.tab?.id;
        if (tabId == null || !chrome.sidePanel) throw new Error('Tu versión de Chrome no tiene panel lateral.');
        await chrome.sidePanel.open({ tabId });
        return { ok: true };
      }
      if (msg.type === 'getPublicSettings') {
        return { ok: true, settings: await withShortcuts(await publicSettings(await getSettings())) };
      }
      if (msg.type === 'updateSettings') {
        return { ok: true, settings: await withShortcuts(await updateFromContent(msg)) };
      }
      if (msg.type === 'openPopout') {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await chrome.storage.session.set({ [`popout:${id}`]: { ...msg.payload, tabId: sender?.tab?.id } });
        await chrome.windows.create({
          url: chrome.runtime.getURL(`src/popout/popout.html#${id}`),
          type: 'popup',
          width: Math.min(Number(msg.width) || 620, 1600),
          height: Math.min(Number(msg.height) || 800, 1200),
          focused: true,
        });
        return { ok: true };
      }
      if (msg.type === 'printDoc') {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await chrome.storage.session.set({ [`print:${id}`]: { title: String(msg.title || 'Subme Now').slice(0, 300), html: String(msg.html || '') } });
        await chrome.tabs.create({ url: chrome.runtime.getURL(`src/print/print.html#${id}`) });
        return { ok: true };
      }
      if (msg.type === 'openUnlock') {
        await openUnlockWindow();
        return { ok: true };
      }
      if (msg.type === 'lockKeys') {
        await SubmeVault.lock();
        return { ok: true };
      }
      if (msg.type === 'listModels') {
        const settings = await settingsWithKeys();
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
      return { ok: false, code: e.code, error: e.name === 'AbortError' ? 'Tiempo de espera agotado.' : e.message || String(e) };
    }
  })().then(sendResponse);
  return true;
});
