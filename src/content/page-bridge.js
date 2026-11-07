/* Subme Now — puente con el reproductor de YouTube (corre en el contexto de la página).
 *
 * YouTube exige un token del reproductor para entregar los subtítulos. La forma más confiable
 * de obtenerlo es pedirle al propio reproductor (de un video o de un Short) que cargue los
 * subtítulos un instante; el content script lee la petición resultante.
 *
 * No maneja datos sensibles: solo activa y restaura los subtítulos del reproductor.
 */
(function () {
  if (window.__submeBridge) return;
  window.__submeBridge = true;

  function activePlayer() {
    const candidates = [
      document.querySelector('ytd-reel-video-renderer[is-active] #shorts-player'),
      document.querySelector('#shorts-player'),
      document.querySelector('#movie_player'),
    ];
    return candidates.find((p) => p && typeof p.setOption === 'function' && p.offsetParent !== null)
      || candidates.find((p) => p && typeof p.setOption === 'function')
      || null;
  }

  const previous = new Map();

  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.source !== 'subme-content') return;
    const { id, type, languageCode } = e.data;
    const reply = (payload) => window.postMessage({ source: 'subme-bridge', id, ...payload }, '*');
    try {
      const p = activePlayer();
      if (!p) return reply({ ok: false, error: 'sin reproductor' });
      if (type === 'captions-on') {
        let track = null;
        try { track = p.getOption('captions', 'track'); } catch { /* módulo sin cargar */ }
        previous.set(id, track && track.languageCode ? track : null);
        p.loadModule?.('captions');
        p.setOption('captions', 'reload', true);
        if (languageCode) p.setOption('captions', 'track', { languageCode });
        return reply({ ok: true });
      }
      if (type === 'captions-restore') {
        const prev = previous.get(e.data.ref);
        previous.delete(e.data.ref);
        if (prev) p.setOption('captions', 'track', prev);
        else {
          try { p.setOption('captions', 'track', {}); } catch { /* noop */ }
          p.unloadModule?.('captions');
        }
        return reply({ ok: true });
      }
      return reply({ ok: false, error: 'tipo desconocido' });
    } catch (err) {
      return reply({ ok: false, error: String(err && err.message || err) });
    }
  });
})();
