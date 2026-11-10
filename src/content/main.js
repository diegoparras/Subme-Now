/* Subme Now — punto de entrada: detecta la navegación SPA de YouTube y monta el panel. */
(function () {
  const SN = (globalThis.SubmeNow = globalThis.SubmeNow || {});
  if (SN.started) return;
  SN.started = true;

  let panel = null;
  let lastUrl = '';

  /** Devuelve {id, mode} para /watch?v=ID y /shorts/ID; null en otras páginas. */
  function currentVideo() {
    if (location.pathname === '/watch') {
      const id = new URLSearchParams(location.search).get('v');
      return id ? { id, mode: 'watch' } : null;
    }
    const m = location.pathname.match(/^\/shorts\/([\w-]{6,})/);
    return m ? { id: m[1], mode: 'shorts' } : null;
  }

  function tick() {
    const cur = currentVideo();
    if (!cur) {
      if (panel?.host.isConnected) panel.unmount();
      if (panel) panel.videoId = null;
      if (lastUrl !== location.href) notifySide(null);
      lastUrl = location.href;
      return;
    }
    panel = panel || new SN.Panel();
    if (!panel.mount(cur.mode)) return; // el layout aún no está listo; se reintenta
    if (location.href !== lastUrl || panel.videoId !== cur.id) {
      lastUrl = location.href;
      panel.loadVideo(cur.id);
      notifySide(cur);
    }
    panel.attachVideo();
  }

  /** Avisa al panel lateral de Chrome (si está abierto) que cambió el video de esta pestaña. */
  function notifySide(cur) {
    try { chrome.runtime.sendMessage({ type: 'subme-nav', video: cur }).catch(() => {}); } catch { /* extensión recargada */ }
  }

  // Ventanas aparte (popout) y el panel lateral de Chrome se conectan a esta pestaña.
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'subme-popout') panel?.attachPopoutPort(port);
    if (port.name === 'subme-side') {
      panel = panel || new SN.Panel();
      panel.attachSidePort(port);
    }
  });

  /** Pedidos del panel lateral: la transcripción se obtiene desde la página de YouTube. */
  async function remote(msg) {
    const T = SN.transcript;
    if (msg.fn === 'whoami') return currentVideo();
    if (msg.fn === 'getVideoInfo') return T.getVideoInfo(String(msg.args[0]));
    if (msg.fn === 'loadTranscript') return T.loadTranscript(await T.getVideoInfo(String(msg.args[0])), msg.args[1] || null, msg.args[2] || {});
    throw new Error('Pedido desconocido');
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    // Atajos de teclado enviados por el service worker.
    if (msg?.type === 'subme-command') panel?.handleCommand(msg.command);
    if (msg?.type === 'subme-remote') {
      remote(msg).then((value) => sendResponse({ ok: true, value }), (e) => sendResponse({ ok: false, error: e.message, code: e.code, detail: e.detail }));
      return true;
    }
    return false;
  });

  document.addEventListener('yt-navigate-finish', () => setTimeout(tick, 50));
  window.addEventListener('popstate', () => setTimeout(tick, 50));
  setInterval(tick, 1000);
  tick();
})();
