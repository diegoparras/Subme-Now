/* Subme Now — cliente de IA del lado de la página (habla con el service worker por un puerto). */
(function () {
  const SN = (globalThis.SubmeNow = globalThis.SubmeNow || {});
  const U = SubmeUtils;
  const P = SubmePrompts;

  /**
   * Inicia una respuesta en streaming.
   * Devuelve {promise, abort}. promise resuelve con {text, notice}.
   */
  function stream(payload, onDelta) {
    let port = null;
    let ping = null;
    let finish = null;
    let full = '';
    let settled = false;

    const cleanup = () => {
      clearInterval(ping);
      try { port?.disconnect(); } catch { /* ya desconectado */ }
    };

    const promise = new Promise((resolve, reject) => {
      finish = (err, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (err) reject(err); else resolve(value);
      };
      try {
        port = chrome.runtime.connect({ name: 'subme-ai' });
      } catch {
        finish(new Error('Subme Now se actualizó o reinició. Recarga la página de YouTube.'));
        return;
      }
      port.onMessage.addListener((m) => {
        if (m.type === 'delta') { full += m.text; onDelta?.(m.text, full); }
        else if (m.type === 'done') finish(null, { text: full, notice: m.notice || '', model: m.model, provider: m.provider });
        else if (m.type === 'error') finish(Object.assign(new Error(m.message), { code: m.code }));
      });
      port.onDisconnect.addListener(() => finish(new Error('Se perdió la conexión con la extensión. Recarga la página.')));
      port.postMessage({ type: 'run', payload });
      // Mantiene vivo el service worker durante respuestas largas.
      ping = setInterval(() => { try { port.postMessage({ type: 'ping' }); } catch { /* noop */ } }, 15000);
    });

    return {
      promise,
      abort() {
        try { port?.postMessage({ type: 'abort' }); } catch { /* noop */ }
        finish?.(null, { text: full, notice: 'Generación detenida.', aborted: true });
      },
    };
  }

  /**
   * Prepara el system prompt para un video. Si la transcripción excede el límite,
   * la condensa por partes (map → reduce) y reutiliza ese resultado.
   */
  async function buildContext({ video, segments, settings, onProgress, signalRef, chat = false }) {
    const lines = U.groupSegments(segments).map((g) => `[${U.formatTime(g.start)}] ${g.text}`);
    const full = lines.join('\n');
    const limit = Math.max(20000, Number(settings.maxContextChars) || 200000);

    let transcriptText = full;
    let condensed = false;

    if (full.length > limit) {
      const chunks = [];
      let cur = [];
      let len = 0;
      for (const l of lines) {
        if (len + l.length > limit * 0.8 && cur.length) { chunks.push(cur.join('\n')); cur = []; len = 0; }
        cur.push(l); len += l.length + 1;
      }
      if (cur.length) chunks.push(cur.join('\n'));

      const notes = [];
      for (let i = 0; i < chunks.length; i++) {
        onProgress?.(`Video largo: condensando parte ${i + 1} de ${chunks.length}…`);
        const h = stream({
          system: P.buildSystemPrompt({ video, transcriptText: chunks[i], responseLanguage: settings.responseLanguage }),
          messages: [{ role: 'user', content: P.buildChunkNotesPrompt(i, chunks.length) }],
        });
        if (signalRef) signalRef.current = h;
        const r = await h.promise;
        if (r.aborted) throw Object.assign(new Error('Generación detenida.'), { aborted: true });
        notes.push(r.text.trim());
      }
      transcriptText = notes.join('\n\n');
      condensed = true;
    }

    return {
      condensed,
      transcriptText,
      system: P.buildSystemPrompt({ video, transcriptText, responseLanguage: settings.responseLanguage, condensed, chat }),
    };
  }

  SN.ai = { stream, buildContext };
})();
