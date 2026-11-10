/* Subme Now — panel lateral de Chrome.
 * Reutiliza el mismo panel que se integra en YouTube. La transcripción se obtiene desde la pestaña
 * (que es la que puede leer YouTube) y el panel le pide saltos en el video y recibe el tiempo actual.
 */
(async function () {
  const SN = globalThis.SubmeNow;
  const empty = document.getElementById('empty');
  let windowId = null;
  try { windowId = (await chrome.windows.getCurrent()).id; } catch { /* ventana desconocida */ }

  let tabId = null;
  let port = null;
  let panel = null;
  let bindToken = 0;

  async function remote(fn, args = []) {
    if (tabId == null) throw new Error('No hay una pestaña de YouTube activa.');
    let r;
    try { r = await chrome.tabs.sendMessage(tabId, { type: 'subme-remote', fn, args }); } catch { r = null; }
    if (!r) throw new Error('La pestaña de YouTube no responde. Recárgala e inténtalo de nuevo.');
    if (!r.ok) throw Object.assign(new Error(r.error), { code: r.code, detail: r.detail });
    return r.value;
  }

  // La transcripción la obtiene la pestaña de YouTube.
  SN.transcript = {
    getVideoInfo: (videoId) => remote('getVideoInfo', [videoId]),
    loadTranscript: (info, choice, opts) => remote('loadTranscript', [info.videoId, choice, opts]),
  };

  class SidePanel extends SN.Panel {
    constructor() {
      super();
      this.videoEl = { currentTime: 0, paused: true };
    }

    mount() {
      this.mode = 'side';
      this.host.setAttribute('data-mode', 'side');
      if (!this.host.isConnected) document.body.appendChild(this.host);
      return true;
    }

    applyCollapsed() {
      this.root.classList.remove('collapsed');
      this.refs.body.hidden = false;
    }

    findVideoElement() { return null; }

    attachVideo() {}

    seek(seconds) {
      this.videoEl.currentTime = seconds;
      try { port?.postMessage({ type: 'seek', t: seconds }); } catch { this.toast('La pestaña de YouTube no está disponible'); }
      this.highlightCurrent(true);
    }

    watchTheme() {
      const mq = matchMedia('(prefers-color-scheme: dark)');
      const apply = () => this.host.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
      apply();
      mq.addEventListener('change', apply);
    }

    applySettings(s, initial) {
      super.applySettings(s, initial);
      SubmeLogo.applyTo(document.querySelectorAll('img[data-logo]'), s.iconColor);
    }

    handleAct(act) {
      if (act === 'toggle') return; // en el panel lateral no se colapsa
      super.handleAct(act);
    }
  }

  function showEmpty(msg) {
    if (panel) panel.host.hidden = true;
    if (msg) document.getElementById('emptyMsg').textContent = msg;
    empty.hidden = false;
  }

  function disconnect() {
    try { port?.disconnect(); } catch { /* ya cerrado */ }
    port = null;
  }

  /** Sigue a la pestaña activa de esta ventana. */
  async function bind(id) {
    const token = ++bindToken;
    if (id !== tabId) disconnect();
    tabId = id ?? null;
    let video = null;
    try { video = tabId == null ? null : await remote('whoami'); } catch { video = null; }
    if (token !== bindToken) return;
    if (!video) {
      disconnect();
      panel?.abortAll();
      showEmpty('Abre un video o un Short de YouTube en esta ventana y aparecerá aquí su transcripción, las acciones de IA y el chat.');
      return;
    }
    show(video);
  }

  function show(video) {
    panel = panel || new SidePanel();
    panel.mount();
    panel.host.hidden = false;
    empty.hidden = true;
    if (!port) {
      try {
        port = chrome.tabs.connect(tabId, { name: 'subme-side' });
        port.onMessage.addListener((m) => {
          if (m.type === 'time') { panel.videoEl.currentTime = m.t; panel.highlightCurrent(); }
          if (m.type === 'command') panel.handleCommand(m.command);
        });
        port.onDisconnect.addListener(() => { port = null; });
      } catch { port = null; }
    }
    panel.remoteShort = video.mode === 'shorts';
    if (panel.videoId !== video.id) {
      panel.videoId = null;
      panel.loadVideo(video.id);
    }
  }

  chrome.tabs.onActivated.addListener((info) => {
    if (windowId == null || info.windowId === windowId) bind(info.tabId);
  });

  // La pestaña avisa cuando cambia de video (YouTube navega sin recargar la página).
  chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg?.type !== 'subme-nav' || sender.tab?.id !== tabId) return;
    if (msg.video) show(msg.video);
    else { disconnect(); showEmpty(); }
  });

  // Si la pestaña se recarga, se vuelve a conectar.
  chrome.tabs.onUpdated.addListener((id, info) => {
    if (id === tabId && info.status === 'complete') setTimeout(() => bind(id), 400);
  });

  document.getElementById('openLibrary').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'openLibrary' }));

  // Logo del estado vacío con el color elegido.
  try {
    const r = await chrome.runtime.sendMessage({ type: 'getPublicSettings' });
    SubmeLogo.applyTo(document.querySelectorAll('img[data-logo]'), r?.settings?.iconColor);
  } catch { /* logo por defecto */ }

  // "#tab=ID" fija la pestaña (útil para abrir el panel en una ventana aparte o en pruebas).
  const fixed = /^#tab=(\d+)$/.exec(location.hash);
  if (fixed) { windowId = -1; bind(Number(fixed[1])); return; }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  bind(tab?.id);
})();
