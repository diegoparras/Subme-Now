/* Subme Now — obtención de la transcripción de YouTube.
 * Estrategias (en orden):
 *   1. API interna de YouTube (youtubei/v1/get_transcript) — la misma que usa el panel "Mostrar transcripción".
 *   2. Pistas de subtítulos (timedtext, formato json3) — permite elegir idioma y traducción automática.
 *   3. Lectura del panel de transcripción del DOM como último recurso.
 */
(function () {
  const SN = (globalThis.SubmeNow = globalThis.SubmeNow || {});
  const infoCache = new Map();

  function extractJsonAfter(text, markers) {
    for (const marker of markers) {
      let from = 0;
      for (;;) {
        const i = text.indexOf(marker, from);
        if (i < 0) break;
        from = i + marker.length;
        const start = text.indexOf('{', from);
        if (start < 0 || start - from > 20) continue;
        let depth = 0;
        let inStr = false;
        let esc = false;
        for (let j = start; j < text.length; j++) {
          const c = text[j];
          if (inStr) {
            if (esc) esc = false;
            else if (c === '\\') esc = true;
            else if (c === '"') inStr = false;
            continue;
          }
          if (c === '"') inStr = true;
          else if (c === '{') depth++;
          else if (c === '}' && --depth === 0) {
            try { return JSON.parse(text.slice(start, j + 1)); } catch { break; }
          }
        }
      }
    }
    return null;
  }

  function findKey(obj, key, seen = new Set()) {
    if (!obj || typeof obj !== 'object' || seen.has(obj)) return undefined;
    seen.add(obj);
    if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
    for (const v of Object.values(obj)) {
      const r = findKey(v, key, seen);
      if (r !== undefined) return r;
    }
    return undefined;
  }

  function collectKey(obj, key, out = []) {
    if (!obj || typeof obj !== 'object') return out;
    if (Array.isArray(obj)) { for (const v of obj) collectKey(v, key, out); return out; }
    for (const [k, v] of Object.entries(obj)) {
      if (k === key) out.push(v);
      else collectKey(v, key, out);
    }
    return out;
  }

  const textOf = (o) => (o ? o.simpleText ?? (o.runs || []).map((r) => r.text).join('') : '');
  const cleanText = (t) => String(t || '').replace(/[​\n]+/g, ' ').replace(/\s+/g, ' ').trim();

  /** Descarga la página del video y extrae metadatos, pistas y parámetros de la API interna. */
  async function getVideoInfo(videoId, { force = false } = {}) {
    if (!force && infoCache.has(videoId)) return infoCache.get(videoId);
    const res = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=${encodeURIComponent(hl())}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`No se pudo cargar la página del video (HTTP ${res.status}).`);
    const html = await res.text();

    const player = extractJsonAfter(html, ['var ytInitialPlayerResponse = ', 'ytInitialPlayerResponse = ', 'ytInitialPlayerResponse=']);
    const data = extractJsonAfter(html, ['var ytInitialData = ', 'window["ytInitialData"] = ', 'ytInitialData = ']);
    const cfg = (k) => (html.match(new RegExp(`"${k}"\\s*:\\s*"([^"]+)"`)) || [])[1];

    const details = player?.videoDetails || {};
    const tracklist = player?.captions?.playerCaptionsTracklistRenderer || {};
    const tracks = (tracklist.captionTracks || []).map((t) => ({
      baseUrl: t.baseUrl,
      languageCode: t.languageCode,
      name: textOf(t.name) || t.languageCode,
      kind: t.kind || '',
      isTranslatable: !!t.isTranslatable,
    }));
    const translationLanguages = (tracklist.translationLanguages || []).map((l) => ({
      code: l.languageCode,
      name: textOf(l.languageName) || l.languageCode,
    }));

    const info = {
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title: details.title || document.title.replace(/ - YouTube$/, ''),
      author: details.author || '',
      lengthSeconds: Number(details.lengthSeconds) || 0,
      tracks,
      translationLanguages,
      transcriptParams: findKey(data, 'getTranscriptEndpoint')?.params || null,
      apiKey: cfg('INNERTUBE_API_KEY'),
      clientVersion: cfg('INNERTUBE_CLIENT_VERSION') || '2.20250101.00.00',
      visitorData: cfg('VISITOR_DATA'),
      playability: player?.playabilityStatus?.status,
    };
    infoCache.set(videoId, info);
    return info;
  }

  function hl() {
    return (document.documentElement.lang || navigator.language || 'en').split('-')[0];
  }

  async function fetchInnertube(info, params) {
    const url = `https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false${info.apiKey ? `&key=${info.apiKey}` : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Youtube-Client-Name': '1',
        'X-Youtube-Client-Version': info.clientVersion,
        ...(info.visitorData ? { 'X-Goog-Visitor-Id': info.visitorData } : {}),
      },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion: info.clientVersion, hl: hl(), visitorData: info.visitorData } },
        params,
      }),
    });
    if (!res.ok) throw new Error(`get_transcript HTTP ${res.status}`);
    const json = await res.json();
    const segments = collectKey(json, 'transcriptSegmentRenderer')
      .map((r) => ({ start: Number(r.startMs) / 1000, end: Number(r.endMs) / 1000, text: cleanText(textOf(r.snippet)) }))
      .filter((s) => s.text && Number.isFinite(s.start));
    const menu = findKey(json, 'languageMenu');
    const languages = (menu?.sortFilterSubMenuRenderer?.subMenuItems || [])
      .map((it) => ({ title: it.title, selected: !!it.selected, params: it.continuation?.reloadContinuationData?.continuation }))
      .filter((l) => l.params);
    if (!segments.length) throw new Error('get_transcript sin segmentos');
    return { segments, languages };
  }

  async function fetchTimedText(track, tlang) {
    const u = new URL(track.baseUrl, 'https://www.youtube.com');
    u.searchParams.set('fmt', 'json3');
    if (tlang) u.searchParams.set('tlang', tlang);
    const res = await fetch(u.toString(), { credentials: 'include' });
    if (!res.ok) throw new Error(`timedtext HTTP ${res.status}`);
    const body = await res.text();
    if (!body.trim()) throw new Error('timedtext vacío');
    const json = JSON.parse(body);
    const segments = (json.events || [])
      .filter((e) => e.segs)
      .map((e) => ({
        start: (e.tStartMs || 0) / 1000,
        end: ((e.tStartMs || 0) + (e.dDurationMs || 0)) / 1000,
        text: cleanText(e.segs.map((s) => s.utf8).join('')),
      }))
      .filter((s) => s.text);
    if (!segments.length) throw new Error('timedtext sin segmentos');
    return segments;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Busca una petición de subtítulos del propio reproductor que ya incluya el token "pot". */
  function findPlayerCaptionUrl(videoId) {
    const entries = performance.getEntriesByType('resource').map((e) => e.name).reverse();
    for (const name of entries) {
      if (!name.includes('/api/timedtext')) continue;
      try {
        const u = new URL(name);
        if (u.searchParams.get('pot') && (!videoId || u.searchParams.get('v') === videoId)) return u;
      } catch { /* URL inválida */ }
    }
    return null;
  }

  /** Envía una orden al puente del reproductor (page-bridge.js) y espera la respuesta. */
  function bridge(type, extra = {}, timeout = 1500) {
    const id = `sn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve) => {
      const onMsg = (e) => {
        if (e.source !== window || e.data?.source !== 'subme-bridge' || e.data.id !== id) return;
        window.removeEventListener('message', onMsg);
        clearTimeout(t);
        resolve({ ...e.data, id });
      };
      const t = setTimeout(() => { window.removeEventListener('message', onMsg); resolve({ ok: false, id, error: 'sin respuesta' }); }, timeout);
      window.addEventListener('message', onMsg);
      window.postMessage({ source: 'subme-content', id, type, ...extra }, '*');
    });
  }

  /**
   * YouTube exige un token de prueba de origen ("pot") en las pistas de subtítulos.
   * Se obtiene pidiéndole al reproductor (video o Short) que cargue los subtítulos un instante
   * y leyendo su petición. Como respaldo, en videos normales se pulsa el botón CC.
   */
  async function getPlayerCaptionUrl(videoId, languageCode) {
    let u = findPlayerCaptionUrl(videoId);
    if (u) return u;

    const on = await bridge('captions-on', { languageCode });
    if (on.ok) {
      for (let i = 0; i < 30 && !u; i++) { await sleep(150); u = findPlayerCaptionUrl(videoId); }
      await bridge('captions-restore', { ref: on.id });
      if (u) return u;
    }

    const btn = document.querySelector('#movie_player .ytp-subtitles-button, .ytp-subtitles-button');
    if (!btn || btn.offsetParent === null) return null;
    const wasOn = btn.getAttribute('aria-pressed') === 'true';
    if (wasOn) { btn.click(); await sleep(150); }
    btn.click();
    for (let i = 0; i < 20 && !u; i++) { await sleep(150); u = findPlayerCaptionUrl(videoId); }
    if (!wasOn && btn.getAttribute('aria-pressed') === 'true') btn.click();
    return u;
  }

  async function fetchTimedTextWithPot(info, track, tlang) {
    const captured = await getPlayerCaptionUrl(info.videoId, track.languageCode);
    if (!captured) throw new Error('sin token del reproductor');
    const u = new URL(track.baseUrl, 'https://www.youtube.com');
    for (const k of ['pot', 'potc', 'c', 'cver', 'cplayer', 'cos', 'cosver', 'cbr', 'cbrver', 'xorb', 'xobt', 'xovt']) {
      const v = captured.searchParams.get(k);
      if (v !== null) u.searchParams.set(k, v);
    }
    return fetchTimedText({ baseUrl: u.toString() }, tlang);
  }

  /** Respaldo: pide las pistas a la API del reproductor como cliente móvil (no requiere token). */
  async function fetchTimedTextViaPlayerApi(info, track, tlang) {
    const res = await fetch(`https://www.youtube.com/youtubei/v1/player?prettyPrint=false${info.apiKey ? `&key=${info.apiKey}` : ''}`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38', hl: hl() } }, videoId: info.videoId }),
    });
    if (!res.ok) throw new Error(`player HTTP ${res.status}`);
    const json = await res.json();
    const tracks = json?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    const match = tracks.find((t) => t.languageCode === track.languageCode && (t.kind || '') === (track.kind || ''))
      || tracks.find((t) => t.languageCode === track.languageCode) || tracks[0];
    if (!match?.baseUrl) throw new Error('player sin pistas');
    return fetchTimedText({ baseUrl: match.baseUrl.replace(/&fmt=[^&]*/, '') }, tlang);
  }

  async function fetchTimedTextAny(info, track, tlang) {
    const errors = [];
    for (const attempt of [fetchTimedText.bind(null, track, tlang), () => fetchTimedTextWithPot(info, track, tlang), () => fetchTimedTextViaPlayerApi(info, track, tlang)]) {
      try { return await attempt(); } catch (e) { errors.push(e.message); }
    }
    throw new Error(errors.join(' · '));
  }

  /** Último recurso: abre el panel nativo "Mostrar transcripción" y lo lee. */
  async function fetchFromDom() {
    const SEG_SEL = 'ytd-transcript-segment-renderer, transcript-segment-view-model';
    const read = () => [...document.querySelectorAll(SEG_SEL)].map((el) => {
      const ts = el.querySelector('.segment-timestamp, .ytwTranscriptSegmentViewModelTimestamp, [class*="timestamp" i]')?.textContent || '';
      const text = el.querySelector('.segment-text, yt-formatted-string, span[role="text"], .yt-core-attributed-string')?.textContent || '';
      return { start: SubmeUtils.parseTime(ts.trim()), text: cleanText(text) };
    }).filter((s) => s.text && s.start !== null);

    let segs = read();
    if (!segs.length) {
      const btn = document.querySelector('ytd-video-description-transcript-section-renderer button, button[aria-label*="transcript" i], button[aria-label*="transcripción" i]');
      if (!btn) throw new Error('Este video no tiene transcripción disponible.');
      btn.click();
      for (let i = 0; i < 40 && !segs.length; i++) { await sleep(250); segs = read(); }
      // Cerrar el panel nativo que abrimos solo para leerlo.
      const panel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id*="transcript"]');
      const close = panel?.querySelector('#visibility-button button, button[aria-label*="Cerrar" i], button[aria-label*="Close" i]');
      if (close) close.click();
      else panel?.setAttribute('visibility', 'ENGAGEMENT_PANEL_VISIBILITY_HIDDEN');
    }
    if (!segs.length) throw new Error('No se pudo leer la transcripción del panel de YouTube.');
    return segs;
  }

  function pickTrack(tracks, pref) {
    if (!tracks.length) return -1;
    if (pref) {
      const p = pref.toLowerCase();
      const manual = tracks.findIndex((t) => t.languageCode.toLowerCase().startsWith(p) && t.kind !== 'asr');
      if (manual >= 0) return manual;
      const asr = tracks.findIndex((t) => t.languageCode.toLowerCase().startsWith(p));
      if (asr >= 0) return asr;
    }
    return 0;
  }

  /**
   * Carga la transcripción.
   * choice: null (automático) | {kind:'it', params} | {kind:'tt', trackIndex, tlang}
   * Devuelve {segments, source, languages, selected}
   */
  async function loadTranscript(info, choice, { preferredLanguage = '', languages = [] } = {}) {
    const errors = [];

    if (choice?.kind === 'it') {
      const r = await fetchInnertube(info, choice.params);
      return { segments: r.segments, source: 'innertube', languages: r.languages.length ? r.languages : languages, selected: `it:${choice.params}` };
    }
    if (choice?.kind === 'tt') {
      const track = info.tracks[choice.trackIndex];
      if (!track) throw new Error('Pista de subtítulos no encontrada.');
      const segments = await fetchTimedTextAny(info, track, choice.tlang);
      return { segments, source: 'timedtext', languages, selected: `tt:${choice.trackIndex}:${choice.tlang || ''}` };
    }

    // Automático
    const noCaptions = () => Object.assign(
      new Error(location.pathname.startsWith('/shorts/')
        ? 'Este Short no tiene subtítulos en YouTube, así que no hay transcripción para mostrar.'
        : 'Este video no tiene subtítulos en YouTube, así que no hay transcripción para mostrar.'),
      { code: 'NO_CAPTIONS' },
    );
    if (!info.tracks.length && !info.transcriptParams) throw noCaptions();

    if (info.transcriptParams) {
      try {
        let r = await fetchInnertube(info, info.transcriptParams);
        let selected = r.languages.find((l) => l.selected);
        if (preferredLanguage && r.languages.length) {
          const idx = pickTrack(info.tracks, preferredLanguage);
          const wanted = idx >= 0 && info.tracks[idx].languageCode.toLowerCase().startsWith(preferredLanguage.toLowerCase())
            ? r.languages.find((l) => l.title === info.tracks[idx].name) : null;
          if (wanted && !wanted.selected) {
            try {
              const r2 = await fetchInnertube(info, wanted.params);
              r = { segments: r2.segments, languages: r.languages };
              selected = wanted;
            } catch { /* usar el idioma por defecto */ }
          }
        }
        return { segments: r.segments, source: 'innertube', languages: r.languages, selected: selected ? `it:${selected.params}` : '' };
      } catch (e) { errors.push(e.message); }
    }

    const idx = pickTrack(info.tracks, preferredLanguage);
    if (idx >= 0) {
      try {
        const segments = await fetchTimedTextAny(info, info.tracks[idx]);
        return { segments, source: 'timedtext', languages: [], selected: `tt:${idx}:` };
      } catch (e) { errors.push(e.message); }
    }

    if (location.pathname === '/watch') {
      try {
        const segments = await fetchFromDom();
        return { segments, source: 'dom', languages: [], selected: '' };
      } catch (e) { errors.push(e.message); }
    }
    if (!info.tracks.length) throw noCaptions();
    throw Object.assign(new Error('YouTube no entregó la transcripción de este video. Prueba con "Reintentar" o recarga la página.'), { detail: errors.join(' · ') });
  }

  SN.transcript = { getVideoInfo, loadTranscript, _internals: { extractJsonAfter, findKey, collectKey } };
})();
