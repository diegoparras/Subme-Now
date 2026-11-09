/* Subme Now — lectura en voz alta con las voces del sistema (Web Speech API).
 * Lee bloque por bloque (títulos, párrafos, viñetas) y resalta el que se está leyendo.
 * Los bloques largos se dividen en oraciones para evitar el corte de Chrome en textos largos.
 */
(function () {
  const SN = (globalThis.SubmeNow = globalThis.SubmeNow || {});
  const synth = globalThis.speechSynthesis;

  let queue = [];
  let idx = 0;
  let opts = {};
  let state = 'idle'; // idle | playing | paused
  let token = 0;

  const available = () => !!synth && typeof SpeechSynthesisUtterance === 'function';

  function getVoices() {
    if (!available()) return Promise.resolve([]);
    const v = synth.getVoices();
    if (v.length) return Promise.resolve(v);
    return new Promise((resolve) => {
      const done = () => resolve(synth.getVoices());
      synth.addEventListener('voiceschanged', done, { once: true });
      setTimeout(done, 1200);
    });
  }

  /** Elige la voz guardada o la mejor para el idioma. */
  function pickVoice(voices, lang, saved) {
    if (saved) {
      const v = voices.find((x) => x.voiceURI === saved);
      if (v) return v;
    }
    const base = (lang || 'es').toLowerCase().split('-')[0];
    const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
    const pref = (v) => (/natural|neural|online|google/i.test(v.name) ? 0 : 1) + (v.localService ? 0 : 0.5);
    return matching.sort((a, b) => pref(a) - pref(b))[0] || voices.find((v) => v.default) || voices[0] || null;
  }

  /** Extrae los bloques legibles del resultado renderizado. */
  function blocksOf(container) {
    const els = [...container.querySelectorAll('h2, h3, h4, h5, h6, p, li, blockquote, td, th')]
      .filter((el) => {
        const hidden = el.closest('[hidden]');
        return !el.closest('.sn-code, .mm-host') && (!hidden || hidden === container);
      });
    const out = [];
    for (const el of els) {
      const clone = el.cloneNode(true);
      clone.querySelectorAll('ul, ol, a.sn-ts, .sn-copy-code').forEach((x) => x.remove());
      const text = clone.textContent.replace(/\s+/g, ' ').trim();
      if (!text) continue;
      // Dividir en trozos de ~220 caracteres por oraciones.
      const sentences = text.match(/[^.!?…]+[.!?…]*\s*/g) || [text];
      let chunk = '';
      for (const s of sentences) {
        if ((chunk + s).length > 220 && chunk) { out.push({ el, text: chunk.trim() }); chunk = ''; }
        chunk += s;
      }
      if (chunk.trim()) out.push({ el, text: chunk.trim() });
    }
    return out;
  }

  function mark(el) {
    opts.container?.querySelectorAll('.sn-reading').forEach((x) => x.classList.remove('sn-reading'));
    if (el) {
      el.classList.add('sn-reading');
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function emit() {
    opts.onState?.({ state, index: Math.min(idx + 1, queue.length), total: queue.length });
  }

  function speakNext(myToken) {
    if (myToken !== token) return;
    if (idx >= queue.length) { stop(); return; }
    const item = queue[idx];
    const u = new SpeechSynthesisUtterance(item.text);
    if (opts.voice) { u.voice = opts.voice; u.lang = opts.voice.lang; } else if (opts.lang) u.lang = opts.lang;
    u.rate = opts.rate || 1;
    u.onend = () => { if (myToken !== token) return; idx++; speakNext(myToken); };
    u.onerror = (e) => {
      if (myToken !== token || e.error === 'interrupted' || e.error === 'canceled') return;
      idx++;
      speakNext(myToken);
    };
    mark(item.el);
    emit();
    synth.speak(u);
  }

  async function start(container, options = {}) {
    if (!available()) throw new Error('Este navegador no tiene lectura en voz alta disponible.');
    stop();
    const voices = await getVoices();
    opts = { ...options, container, voice: pickVoice(voices, options.lang, options.voiceURI) };
    queue = blocksOf(container);
    if (!queue.length) throw new Error('No hay texto para leer.');
    idx = 0;
    state = 'playing';
    token++;
    speakNext(token);
  }

  function pause() {
    if (state !== 'playing') return;
    synth.pause();
    state = 'paused';
    emit();
  }

  function resume() {
    if (state !== 'paused') return;
    synth.resume();
    state = 'playing';
    emit();
  }

  function stop() {
    token++;
    if (available()) synth.cancel();
    const wasActive = state !== 'idle';
    state = 'idle';
    mark(null);
    if (wasActive) emit();
  }

  /** Cambia velocidad o voz sin perder la posición. */
  async function update(changes) {
    Object.assign(opts, changes);
    if (changes.voiceURI !== undefined) opts.voice = pickVoice(await getVoices(), opts.lang, changes.voiceURI);
    if (state === 'playing') { token++; synth.cancel(); speakNext(token); }
  }

  SN.tts = { available, getVoices, pickVoice, start, pause, resume, stop, update, get state() { return state; } };
})();
