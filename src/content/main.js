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
      lastUrl = location.href;
      return;
    }
    panel = panel || new SN.Panel();
    if (!panel.mount(cur.mode)) return; // el layout aún no está listo; se reintenta
    if (location.href !== lastUrl || panel.videoId !== cur.id) {
      lastUrl = location.href;
      panel.loadVideo(cur.id);
    }
    panel.attachVideo();
  }

  // Atajos de teclado enviados por el service worker.
  // Ventanas aparte (popout) que se conectan a esta pestaña.
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'subme-popout') panel?.attachPopoutPort(port);
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'subme-command') panel?.handleCommand(msg.command);
  });

  document.addEventListener('yt-navigate-finish', () => setTimeout(tick, 50));
  window.addEventListener('popstate', () => setTimeout(tick, 50));
  setInterval(tick, 1000);
  tick();
})();
