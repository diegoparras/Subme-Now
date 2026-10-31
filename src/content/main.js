/* Subme Now — punto de entrada: detecta la navegación SPA de YouTube y monta el panel. */
(function () {
  const SN = (globalThis.SubmeNow = globalThis.SubmeNow || {});
  if (SN.started) return;
  SN.started = true;

  let panel = null;
  let lastUrl = '';

  function currentVideoId() {
    if (location.pathname !== '/watch') return null;
    return new URLSearchParams(location.search).get('v');
  }

  function tick() {
    const id = currentVideoId();
    if (!id) {
      if (panel?.host.isConnected) panel.unmount();
      if (panel) panel.videoId = null;
      lastUrl = location.href;
      return;
    }
    panel = panel || new SN.Panel();
    if (!panel.mount()) return; // el layout aún no está listo; se reintenta
    if (location.href !== lastUrl || panel.videoId !== id) {
      lastUrl = location.href;
      panel.loadVideo(id);
    }
    panel.attachVideo();
  }

  document.addEventListener('yt-navigate-finish', () => setTimeout(tick, 50));
  window.addEventListener('popstate', () => setTimeout(tick, 50));
  setInterval(tick, 1500);
  tick();
})();
