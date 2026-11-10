/* Subme Now — panel lateral integrado en la página de YouTube. */
(function () {
  const SN = (globalThis.SubmeNow = globalThis.SubmeNow || {});
  const U = SubmeUtils;
  const P = SubmePrompts;
  const MD = SubmeMarkdown;
  const PROVIDER_LABELS = {
    openrouter: 'OpenRouter', openai: 'OpenAI', grok: 'Grok (xAI)', anthropic: 'Anthropic', gemini: 'Gemini', custom: 'Personalizado',
  };
  const DEFAULT_MODELS = {
    openrouter: 'openrouter/auto', openai: 'gpt-5-mini', grok: 'grok-4', anthropic: 'claude-opus-5-5', gemini: 'gemini-2.5-flash', custom: '',
  };

  const I = (name, cls) => SubmeIcons.icon(name, cls);
  const TEMPLATE = `
<div class="sn-wrap">
<div class="sn-root">
  <header class="sn-header" data-act="toggle">
    <div class="sn-brand"><span class="sn-logo">S</span>Subme Now <span class="sn-sub" data-ref="sub"></span></div>
    <div class="sn-header-actions">
      <button class="sn-icon-btn" data-act="library" title="Biblioteca: todo lo que guardaste">${I('library')}</button>
      <button class="sn-icon-btn" data-act="sidepanel" title="Abrir en el panel lateral de Chrome">${I('sidebar')}</button>
      <button class="sn-icon-btn" data-act="settings" title="Configuración">${I('settings')}</button>
      <button class="sn-icon-btn sn-chevron" data-act="toggle" title="Mostrar / ocultar">${I('chevronDown')}</button>
    </div>
  </header>
  <div class="sn-body" data-ref="body">
    <div class="sn-video" data-ref="videocard" hidden>
      <img data-ref="vthumb" alt="" referrerpolicy="no-referrer">
      <div class="sn-video-info"><b data-ref="vtitle"></b><span data-ref="vmeta"></span></div>
    </div>
    <nav class="sn-tabs">
      <button class="sn-tab active" data-tab="transcript">${I('transcript')}Transcripción</button>
      <button class="sn-tab" data-tab="ai">${I('sparkles')}IA<span class="sn-badge" data-ref="aibadge" title="Resultados guardados de este video" hidden></span></button>
      <button class="sn-tab" data-tab="chat">${I('chat')}Chat</button>
    </nav>
    <div class="sn-modelbar" data-ref="modelbar" hidden>
      <select class="sn-select sn-mini" data-ref="provsel" title="Proveedor de IA"></select>
      <input class="sn-input sn-mini sn-model" data-ref="modelin" list="sn-models" spellcheck="false" autocomplete="off" title="Modelo: escribe para buscar o elige de la lista">
      <datalist id="sn-models" data-ref="modellist"></datalist>
      <select class="sn-select sn-mini sn-rlang" data-ref="rlang" title="Idioma de las respuestas"></select>
      <button class="sn-icon-btn sn-lock" data-act="unlock" data-ref="lockbtn" title="API keys bloqueadas: clic para desbloquear" hidden>${I('lock')}</button>
    </div>

    <section class="sn-pane" data-pane="transcript">
      <div class="sn-toolbar">
        <select class="sn-select" data-ref="lang" title="Idioma de la transcripción"></select>
        <input class="sn-input sn-search" data-ref="search" type="search" placeholder="Buscar en la transcripción…">
      </div>
      <div class="sn-toolbar">
        <button class="sn-btn" data-act="ts" title="Mostrar u ocultar marcas de tiempo">${I('clock')}Tiempos</button>
        <button class="sn-btn" data-act="autoscroll" title="Seguir el video automáticamente">${I('follow')}Seguir</button>
        <button class="sn-btn" data-act="copy" title="Copiar la transcripción">${I('copy')}Copiar</button>
        <button class="sn-btn" data-act="detachtr" title="Desacoplar la transcripción en una ventana">${I('detach')}Desacoplar</button>
        <div class="sn-dropdown">
          <button class="sn-btn" data-act="dlmenu">${I('download')}Descargar${I('chevronDown', 'sn-i-sm')}</button>
          <div class="sn-menu" data-ref="dlmenu" hidden>
            <button data-dl="txt">Texto con tiempos (.txt)</button>
            <button data-dl="plain">Texto sin tiempos (.txt)</button>
            <button data-dl="srt">Subtítulos (.srt)</button>
            <button data-dl="vtt">Subtítulos (.vtt)</button>
            <button data-dl="md">Markdown (.md)</button>
            <button data-dl="json">JSON (.json)</button>
          </div>
        </div>
      </div>
      <div class="sn-meta" data-ref="meta"></div>
      <div class="sn-status" data-ref="status"></div>
      <div class="sn-segments" data-ref="segments"></div>
    </section>

    <section class="sn-pane" data-pane="ai" hidden>
      <div class="sn-notice" data-ref="nokey" hidden>
        Para usar la IA agrega una API key de OpenRouter, OpenAI, Grok, Anthropic o Gemini.
        <div style="margin-top:8px"><button class="sn-btn primary" data-act="settings">Configurar API</button></div>
      </div>
      <div class="sn-grid" data-ref="actions"></div>
      <div class="sn-free">
        <textarea class="sn-textarea" data-ref="free" rows="1" placeholder="O pídele cualquier cosa sobre este video…"></textarea>
        <button class="sn-btn primary" data-act="free">Ejecutar</button>
      </div>
      <div class="sn-saved" data-ref="saved" hidden></div>
      <div class="sn-output-wrap" data-ref="outwrap" hidden>
        <div class="sn-output-head">
          <span class="sn-output-title" data-ref="outtitle"></span>
          <div class="sn-output-tools">
            <button class="sn-icon-btn" data-act="stop" title="Detener" hidden>${I('stop')}</button>
            <button class="sn-icon-btn" data-act="regen" title="Regenerar">${I('refresh')}</button>
            <button class="sn-icon-btn" data-act="copyout" title="Copiar">${I('copy')}</button>
            <button class="sn-icon-btn" data-act="tts" title="Escuchar">${I('volume')}</button>
            <button class="sn-icon-btn" data-act="detachout" title="Desacoplar en una ventana">${I('detach')}</button>
            <div class="sn-dropdown">
              <button class="sn-icon-btn" data-act="exportmenu" title="Exportar">${I('share')}</button>
              <div class="sn-menu" data-ref="exportmenu" hidden>
                <button data-export="rich">${I('clipboard')}Copiar con formato <small>Docs, Notion, Word</small></button>
                <button data-export="obsidian">${I('gem')}Enviar a Obsidian</button>
                <button data-export="md">${I('download')}Descargar Markdown (.md)</button>
                <button data-export="docx">${I('fileWord')}Descargar Word (.docx)</button>
                <button data-export="pdf">${I('printer')}Imprimir o guardar PDF</button>
              </div>
            </div>
            <button class="sn-icon-btn" data-act="closeout" title="Cerrar">${I('close')}</button>
          </div>
        </div>
        <div class="sn-tts" data-ref="tts" hidden>
          <button class="sn-icon-btn" data-act="ttsplay" data-ref="ttsplay" title="Pausar">${I('pause')}</button>
          <button class="sn-icon-btn" data-act="ttsstop" title="Detener lectura">${I('stop')}</button>
          <span class="sn-tts-progress" data-ref="ttsprogress"></span>
          <select class="sn-select sn-mini" data-ref="ttsrate" title="Velocidad">
            <option value="0.8">0.8×</option><option value="1">1×</option><option value="1.2">1.2×</option><option value="1.5">1.5×</option><option value="1.75">1.75×</option><option value="2">2×</option>
          </select>
          <select class="sn-select sn-mini sn-tts-voice" data-ref="ttsvoice" title="Voz"></select>
        </div>
        <div class="sn-output md" data-ref="output"></div>
      </div>
    </section>

    <section class="sn-pane" data-pane="chat" hidden>
      <div class="sn-chat-log" data-ref="chatlog"></div>
      <div class="sn-suggestions" data-ref="suggestions"></div>
      <form class="sn-chat-form" data-ref="chatform">
        <textarea class="sn-textarea" data-ref="chatinput" rows="2" placeholder="Pregunta algo sobre el video… (Enter para enviar)"></textarea>
        <button class="sn-btn primary" type="submit" data-ref="chatsend">Enviar</button>
      </form>
      <div class="sn-chat-tools"><button class="sn-link" data-act="detachchat">${I('detach')}Desacoplar</button><button class="sn-link" data-act="chatclear">Nueva conversación</button></div>
    </section>
  </div>
</div>
<div class="sn-toast" data-ref="toast"></div>
</div>`;

  class Panel {
    constructor() {
      this.host = document.createElement('div');
      this.host.id = 'subme-now-host';
      this.shadow = this.host.attachShadow({ mode: 'open' });
      this.shadow.innerHTML = `<style>${SN.styles}</style>${TEMPLATE}`;
      this.refs = {};
      this.shadow.querySelectorAll('[data-ref]').forEach((el) => { this.refs[el.dataset.ref] = el; });
      this.root = this.shadow.querySelector('.sn-root');

      this.settings = SubmeSettings.DEFAULT_SETTINGS;
      this.timeListeners = new Set();
      this.chatSurfaces = new Set();
      this.videoId = null;
      this.reset();

      this.bindEvents();
      this.watchTheme();
      this.refreshSettings(true);
      // La configuración se lee a través del service worker (las API keys nunca llegan a esta página).
      document.addEventListener('visibilitychange', () => { if (!document.hidden) this.refreshSettings(); });
      window.addEventListener('focus', () => this.refreshSettings());
    }

    reset() {
      this.abortAll();
      this.video = null;
      this.segments = [];
      this.languages = [];
      this.selectedLang = '';
      this.source = '';
      this.results = new Map();
      this.context = null;
      this.chat = [];
      this.viewStates = {};
      this.resultMeta = new Map();
      this.savedActions = new Map();
      this.transcriptSaved = false;
      this.historyPromise = Promise.resolve(null);
      clearTimeout(this.vsTimer);
      this.viewCtl = null;
      this.currentAction = null;
      this.segEls = [];
      this.currentIdx = -1;
      this.userScrollUntil = 0;
      this.loadToken = (this.loadToken || 0) + 1;
    }

    /* ---------- ciclo de vida ---------- */

    /** mode: 'watch' (columna lateral del video) | 'shorts' (panel flotante). */
    mount(mode = 'watch') {
      if (this.mode !== mode) { this.mode = mode; this.applyCollapsed(); }
      this.host.setAttribute('data-mode', mode === 'shorts' ? 'float' : 'inline');
      if (mode === 'shorts') {
        if (this.host.parentElement !== document.body) document.body.appendChild(this.host);
        return true;
      }
      if (this.host.isConnected && this.host.parentElement?.closest('#secondary, #below')) return true;
      const target = document.querySelector('ytd-watch-flexy #secondary-inner')
        || document.querySelector('ytd-watch-flexy #secondary')
        || document.querySelector('#secondary-inner, #secondary');
      if (!target || !target.offsetParent) {
        const below = document.querySelector('ytd-watch-flexy #below');
        if (!below) return false;
        below.prepend(this.host);
        return true;
      }
      target.prepend(this.host);
      return true;
    }

    unmount() {
      this.abortAll();
      SN.windows?.closeAll();
      this.host.remove();
    }

    async loadVideo(videoId) {
      if (this.videoId === videoId && (this.segments.length || this.loading)) return;
      this.reset();
      SN.windows?.closeAll(); // las ventanas mostraban el video anterior
      this.videoId = videoId;
      this.attachVideo();
      this.renderAll();
      this.historyPromise = this.loadHistory();
      await this.fetchTranscript(null);
    }

    /* ---------- historial ---------- */

    /** Restaura lo guardado de este video: resultados, chat y progreso de las vistas. */
    async loadHistory() {
      const token = this.loadToken;
      let rec = null;
      try { rec = (await chrome.runtime.sendMessage({ type: 'historyGet', videoId: this.videoId }))?.record || null; } catch { /* sin historial */ }
      if (token !== this.loadToken || !rec) return rec;
      for (const r of Object.values(rec.results || {})) {
        if (!r?.id || !r.text || this.results.has(r.id)) continue;
        this.results.set(r.id, r.text);
        this.resultMeta.set(r.id, { at: r.at, model: r.model, provider: r.provider });
        if (!this.findAction(r.id)) this.savedActions.set(r.id, { id: r.id, label: r.label || 'Pedido', icon: r.icon || 'sparkles', view: r.view || '', prompt: r.prompt || r.label || '' });
      }
      for (const [id, st] of Object.entries(rec.viewStates || {})) if (!this.viewStates[id]) this.viewStates[id] = st;
      if (!this.chat.length && rec.chat?.length) this.chat = rec.chat.map((m) => ({ role: m.role, content: m.content }));
      this.renderActions();
      this.renderChat();
      return rec;
    }

    /** Guarda un cambio en el historial local (no hace nada si el historial está desactivado). */
    saveHistory(patch = {}) {
      if (this.settings.historyEnabled === false || !this.videoId || !this.video) return;
      const v = this.video;
      const full = { ...patch, video: { title: v.title, author: v.author, channelId: v.channelId, lengthSeconds: v.lengthSeconds, isShort: this.isShort() } };
      if (!this.transcriptSaved && this.segments.length) {
        full.transcript = { segments: this.segments.map((x) => ({ start: x.start, text: x.text })), source: this.source, language: this.selectedLang };
        this.transcriptSaved = true;
      }
      try { chrome.runtime.sendMessage({ type: 'historySave', videoId: this.videoId, patch: full }).catch(() => {}); } catch { /* extensión recargada */ }
    }

    /** Guarda el progreso de las vistas (tarjetas sabidas, respuestas del quiz, pasos hechos). */
    persistViewStatesSoon() {
      clearTimeout(this.vsTimer);
      const id = this.videoId;
      this.vsTimer = setTimeout(() => {
        if (id !== this.videoId || !this.results.size) return;
        const viewStates = {};
        for (const [k, v] of Object.entries(this.viewStates || {})) if (this.results.has(k) && v && Object.keys(v).length) viewStates[k] = v;
        if (Object.keys(viewStates).length) this.saveHistory({ viewStates: JSON.parse(JSON.stringify(viewStates)) });
      }, 700);
    }

    isShort() {
      return this.mode === 'shorts' || !!this.remoteShort;
    }

    savedNote(id) {
      const m = this.resultMeta.get(id);
      if (!m?.at) return '';
      const d = new Date(m.at);
      return `Guardado el ${d.toLocaleDateString()} a las ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${m.model ? ` · ${m.model}` : ''}. Usa ↻ para generarlo de nuevo.`;
    }

    /** Muestra una transcripción que no viene de YouTube (p. ej. generada con IA). */
    applyTranscript(segments, source) {
      const list = segments.map((x) => ({ start: Number(x.start) || 0, text: String(x.text || '') })).filter((x) => x.text);
      list.forEach((x, i) => { x.end = list[i + 1] ? Math.min(list[i + 1].start, x.start + 20) : x.start + 4; });
      this.segments = list;
      this.languages = [];
      this.selectedLang = '';
      this.source = source;
      this.context = null;
      this.setStatus('');
      this.renderLanguages();
      this.renderSegments();
      this.renderActions();
    }

    /** Videos sin subtítulos: Gemini mira el video y escribe la transcripción con marcas de tiempo. */
    async transcribeWithAI() {
      if (this.transcribing || !this.videoId) return;
      if (!this.settings.providers?.gemini?.hasKey) {
        this.setInfo('Para transcribir con IA necesitas una API key de Gemini (Google AI Studio).', { settingsBtn: true });
        return;
      }
      const token = this.loadToken;
      const total = Number(this.video?.lengthSeconds) || 0;
      this.transcribing = true;
      const show = (n, last) => {
        const s = this.refs.status;
        s.classList.remove('error');
        s.hidden = false;
        const pct = total && last ? Math.min(99, Math.round((last / total) * 100)) : 0;
        s.innerHTML = `<div class="sn-info sn-transcribing"><span class="sn-spinner" style="display:inline-block;vertical-align:-2px;margin-right:6px"></span>Transcribiendo con IA…
          <div class="sn-info-sub">${n ? `${n} frases${last ? ` · ${U.formatTime(last)}${total ? ` de ${U.formatTime(total)}` : ''}` : ''}` : 'Gemini está mirando el video. Puede tardar unos minutos en videos largos.'}</div>
          ${total ? `<div class="sn-bar"><i style="width:${pct}%"></i></div>` : ''}
          <div style="margin-top:8px"><button class="sn-btn" data-act="stoptranscribe">${I('stop')}Detener</button></div></div>`;
      };
      show(0, 0);
      let pending = false;
      this.transcribeStream = SN.ai.transcribe(this.videoId, (_d, full) => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          if (token !== this.loadToken || !this.transcribing) return;
          const segs = U.parseTranscriptLines(full);
          show(segs.length, segs.length ? segs[segs.length - 1].start : 0);
        });
      });
      try {
        const r = await this.transcribeStream.promise;
        if (token !== this.loadToken) return;
        if (r.aborted) { this.setInfo(this.noCaptionsMsg || 'Transcripción detenida.', { transcribe: true }); return; }
        const segs = U.parseTranscriptLines(r.text);
        if (!segs.length) throw new Error('La IA no devolvió una transcripción con marcas de tiempo. Prueba de nuevo o con otro modelo de Gemini.');
        this.applyTranscript(segs, 'ai');
        this.transcriptSaved = false;
        this.saveHistory({});
        this.toast(r.notice ? 'Transcripción incompleta: se alcanzó el límite de salida' : 'Transcripción lista y guardada');
      } catch (e) {
        if (token !== this.loadToken) return;
        if (e.code === 'LOCKED') { this.refreshSettings(); this.refs.status.innerHTML = this.lockedHtml(e.message); this.refs.status.hidden = false; return; }
        this.setStatus(e.message, true);
        this.refs.status.insertAdjacentHTML('beforeend', ` <button class="sn-link" data-act="transcribe">Reintentar</button>`);
      } finally {
        this.transcribing = false;
        this.transcribeStream = null;
      }
    }

    async fetchTranscript(choice) {
      const token = this.loadToken;
      this.loading = true;
      this.setStatus('Cargando transcripción…');
      this.refs.segments.innerHTML = '';
      try {
        if (!this.video) this.video = await SN.transcript.getVideoInfo(this.videoId);
        if (token !== this.loadToken) return;
        this.refs.sub.textContent = '';
        this.renderVideoCard();
        const r = await SN.transcript.loadTranscript(this.video, choice, {
          preferredLanguage: this.settings.transcriptLanguage,
          languages: this.languages,
        });
        if (token !== this.loadToken) return;
        this.segments = r.segments;
        this.languages = r.languages || [];
        this.selectedLang = r.selected;
        this.source = r.source;
        this.context = null;
        this.setStatus('');
        this.renderLanguages();
        this.renderSegments();
        this.renderActions();
        if (this.settings.autoSummary && this.hasKey() && !choice) this.runAction(P.ACTIONS[0]);
      } catch (e) {
        if (token !== this.loadToken) return;
        this.loading = false;
        if (e.code === 'NO_CAPTIONS') {
          this.noCaptionsMsg = e.message;
          const rec = await this.historyPromise;
          if (token !== this.loadToken) return;
          if (rec?.transcript?.source === 'ai' && rec.transcript.segments?.length) {
            this.applyTranscript(rec.transcript.segments, 'ai');
            this.transcriptSaved = true;
            return;
          }
          this.setInfo(e.message, { transcribe: true });
        } else this.setStatus(e.message, true, true, e.detail);
        this.renderLanguages();
      } finally {
        if (token === this.loadToken) this.loading = false;
      }
    }

    findVideoElement() {
      if (this.mode === 'shorts') {
        return document.querySelector('ytd-reel-video-renderer[is-active] video')
          || document.querySelector('#shorts-player video')
          || [...document.querySelectorAll('ytd-shorts video, video')].find((v) => v.offsetParent && !v.paused)
          || document.querySelector('ytd-shorts video');
      }
      return document.querySelector('video.html5-main-video') || document.querySelector('#movie_player video');
    }

    attachVideo() {
      const v = this.findVideoElement();
      if (!v || v === this.videoEl) return;
      this.videoEl?.removeEventListener('timeupdate', this.onTimeUpdate);
      this.videoEl = v;
      this.onTimeUpdate = this.onTimeUpdate || (() => this.highlightCurrent());
      v.addEventListener('timeupdate', this.onTimeUpdate);
    }

    seek(seconds) {
      this.attachVideo();
      if (!this.videoEl) return;
      this.videoEl.currentTime = seconds;
      this.videoEl.play?.().catch(() => {});
      this.highlightCurrent(true);
    }

    /* ---------- configuración y tema ---------- */

    applySettings(s, initial = false) {
      this.settings = s;
      this.root.classList.toggle('compact', s.density === 'compact');
      // Color de acento de toda la interfaz (íconos, pestañas, botones, resaltados).
      const accent = /^#[0-9a-f]{6}$/i.test(s.iconColor || '') ? s.iconColor : '';
      this.accent = accent;
      if (accent) { this.host.setAttribute('data-accent', ''); this.host.style.setProperty('--sn-user-accent', accent); }
      else { this.host.removeAttribute('data-accent'); this.host.style.removeProperty('--sn-user-accent'); }
      SN.windows?.all().forEach((w) => w.setTheme(this.theme()));
      if (initial) {
        this.applyCollapsed();
        this.switchTab(s.defaultTab || 'transcript');
        setTimeout(() => this.maybeStartTour(), 600);
      }
      this.shadow.querySelector('[data-act="ts"]').classList.toggle('on', !!s.showTimestamps);
      this.shadow.querySelector('[data-act="autoscroll"]').classList.toggle('on', !!s.autoScroll);
      this.renderProvider();
      this.renderActions();
      if (this.segments.length) this.renderSegments();
    }

    collapseKey() {
      return this.mode === 'shorts' ? 'shortsCollapsed' : 'panelCollapsed';
    }

    applyCollapsed() {
      const collapsed = !!this.settings[this.collapseKey()];
      this.root.classList.toggle('collapsed', collapsed);
      this.refs.body.hidden = collapsed;
    }

    async refreshSettings(initial = false) {
      try {
        const r = await chrome.runtime.sendMessage({ type: 'getPublicSettings' });
        if (r?.ok) this.applySettings(SubmeSettings.merge(SubmeSettings.DEFAULT_SETTINGS, r.settings), initial);
      } catch { /* extensión recargada: se ignora */ }
    }

    async updateSettings(patch, model) {
      try {
        const r = await chrome.runtime.sendMessage({ type: 'updateSettings', patch, model });
        if (r?.ok) this.applySettings(SubmeSettings.merge(SubmeSettings.DEFAULT_SETTINGS, r.settings));
        return r?.settings;
      } catch {
        this.toast('Recarga la página: la extensión se actualizó');
        return null;
      }
    }

    patchSettings(patch) {
      this.settings = { ...this.settings, ...patch };
      this.updateSettings(patch);
    }

    watchTheme() {
      const apply = () => {
        const dark = document.documentElement.hasAttribute('dark')
          || (!document.querySelector('ytd-app') && matchMedia('(prefers-color-scheme: dark)').matches);
        this.host.setAttribute('data-theme', dark ? 'dark' : 'light');
        SN.windows?.all().forEach((w) => w.setTheme(this.theme()));
      };
      apply();
      new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ['dark'] });
    }

    hasKey() {
      const p = this.settings.provider;
      const cfg = this.settings.providers?.[p] || {};
      return p === 'custom' ? !!cfg.baseUrl : !!cfg.hasKey;
    }

    /* ---------- eventos ---------- */

    bindEvents() {
      const sh = this.shadow;

      sh.addEventListener('click', (e) => {
        const ts = e.target.closest('a.sn-ts');
        if (ts) { e.preventDefault(); this.seek(Number(ts.dataset.t)); return; }

        const copyCode = e.target.closest('.sn-copy-code');
        if (copyCode) {
          U.copyText(copyCode.parentElement.querySelector('code').textContent).then(() => this.toast('Copiado'));
          return;
        }

        const tab = e.target.closest('[data-tab]');
        if (tab) { this.switchTab(tab.dataset.tab); return; }

        const seg = e.target.closest('.sn-seg');
        if (seg) { this.seek(Number(seg.dataset.t)); return; }

        const dl = e.target.closest('[data-dl]');
        if (dl) { this.refs.dlmenu.hidden = true; this.downloadTranscript(dl.dataset.dl); return; }

        const ex = e.target.closest('[data-export]');
        if (ex) { this.refs.exportmenu.hidden = true; this.exportResult(ex.dataset.export); return; }

        const action = e.target.closest('[data-action]');
        if (action) { this.runAction(this.findAction(action.dataset.action)); return; }

        const chip = e.target.closest('.sn-chip');
        if (chip) { this.sendChat(chip.textContent); return; }

        const btn = e.target.closest('[data-act]');
        if (!btn) { this.refs.dlmenu.hidden = true; this.refs.exportmenu.hidden = true; return; }
        if (btn.dataset.act !== 'dlmenu') this.refs.dlmenu.hidden = true;
        if (btn.dataset.act !== 'exportmenu') this.refs.exportmenu.hidden = true;
        e.stopPropagation();
        this.handleAct(btn.dataset.act);
      });

      this.refs.search.addEventListener('input', () => {
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => this.renderSegments(), 150);
      });

      this.refs.lang.addEventListener('change', () => {
        const v = this.refs.lang.value;
        if (!v) return;
        let choice = null;
        if (v.startsWith('it:')) choice = { kind: 'it', params: v.slice(3) };
        else if (v.startsWith('tt:')) {
          const [, idx, tlang] = v.split(':');
          choice = { kind: 'tt', trackIndex: Number(idx), tlang: tlang || '' };
        }
        this.fetchTranscript(choice);
      });

      ['click', 'keyup'].forEach((t) => this.refs.output.addEventListener(t, () => this.persistViewStatesSoon()));

      this.refs.segments.addEventListener('wheel', () => { this.userScrollUntil = Date.now() + 4000; }, { passive: true });
      this.refs.segments.addEventListener('touchmove', () => { this.userScrollUntil = Date.now() + 4000; }, { passive: true });

      this.refs.ttsrate.addEventListener('change', () => {
        const rate = Number(this.refs.ttsrate.value) || 1;
        this.settings.ttsRate = rate;
        this.updateSettings({ ttsRate: rate });
        SN.tts.update({ rate });
      });
      this.refs.ttsvoice.addEventListener('change', () => {
        const voiceURI = this.refs.ttsvoice.value;
        this.settings.ttsVoice = voiceURI;
        this.updateSettings({ ttsVoice: voiceURI });
        SN.tts.update({ voiceURI });
      });
      this.refs.provsel.addEventListener('change', () => this.saveModelChoice({ provider: this.refs.provsel.value }));
      this.refs.rlang.addEventListener('change', () => this.saveModelChoice({ responseLanguage: this.refs.rlang.value }));
      this.refs.modelin.addEventListener('focus', () => { this.refs.modelin.select(); this.loadModelList(); });
      this.refs.modelin.addEventListener('change', () => {
        const model = this.refs.modelin.value.trim();
        if (model !== (this.settings.providers?.[this.settings.provider]?.model || '')) this.saveModelChoice({ model });
      });
      this.refs.modelin.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.refs.modelin.blur(); });

      this.refs.free.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleAct('free'); }
      });

      this.refs.chatform.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendChat(this.refs.chatinput.value);
      });
      this.refs.chatinput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendChat(this.refs.chatinput.value); }
      });

      // En Shorts, la rueda del mouse sobre el panel no debe pasar al siguiente Short.
      this.host.addEventListener('wheel', (e) => { if (this.mode === 'shorts') e.stopPropagation(); }, { passive: true });

      // Evita que los atajos de teclado de YouTube (k, j, l, f, números…) se disparen al escribir.
      ['keydown', 'keyup', 'keypress'].forEach((t) => sh.addEventListener(t, (e) => {
        if (e.target.matches?.('input, textarea, select')) e.stopPropagation();
      }));
    }

    handleAct(act) {
      switch (act) {
        case 'toggle': {
          const collapsed = !this.root.classList.contains('collapsed');
          this.root.classList.toggle('collapsed', collapsed);
          this.refs.body.hidden = collapsed;
          this.patchSettings({ [this.collapseKey()]: collapsed });
          break;
        }
        case 'settings':
          try { chrome.runtime.sendMessage({ type: 'openOptions' }); } catch { this.toast('Recarga la página: la extensión se actualizó'); }
          break;
        case 'ts':
          this.patchSettings({ showTimestamps: !this.settings.showTimestamps });
          this.shadow.querySelector('[data-act="ts"]').classList.toggle('on', this.settings.showTimestamps);
          this.renderSegments();
          break;
        case 'autoscroll':
          this.patchSettings({ autoScroll: !this.settings.autoScroll });
          this.shadow.querySelector('[data-act="autoscroll"]').classList.toggle('on', this.settings.autoScroll);
          break;
        case 'copy':
          if (!this.segments.length) return;
          U.copyText(U.toTXT(this.segments, this.settings.showTimestamps)).then(() => this.toast('Transcripción copiada'));
          break;
        case 'dlmenu':
          this.refs.dlmenu.hidden = !this.refs.dlmenu.hidden;
          break;
        case 'retry':
          this.video = null;
          this.fetchTranscript(null);
          break;
        case 'free': {
          const text = this.refs.free.value.trim();
          if (!text) return;
          const action = { id: `free-${Date.now()}`, icon: 'sparkles', label: text.length > 50 ? `${text.slice(0, 50)}…` : text, prompt: text };
          this.savedActions.set(action.id, action);
          this.runAction(action);
          break;
        }
        case 'stop':
          this.abortAll();
          break;
        case 'regen':
          if (this.currentAction) this.runAction(this.currentAction, { force: true });
          break;
        case 'copyout': {
          const r = this.results.get(this.currentAction?.id) || this.lastOutput;
          if (r) U.copyText(r).then(() => this.toast('Resultado copiado'));
          break;
        }
        case 'exportmenu':
          this.refs.exportmenu.hidden = !this.refs.exportmenu.hidden;
          break;
        case 'tts':
          this.startReading();
          break;
        case 'ttsplay':
          if (SN.tts.state === 'playing') SN.tts.pause();
          else if (SN.tts.state === 'paused') SN.tts.resume();
          else this.startReading();
          break;
        case 'ttsstop':
          SN.tts.stop();
          break;
        case 'closeout':
          this.abortAll();
          this.refs.outwrap.hidden = true;
          this.currentAction = null;
          this.renderActions();
          break;
        case 'transcribe':
          this.transcribeWithAI();
          break;
        case 'stoptranscribe':
          this.transcribeStream?.abort();
          break;
        case 'library':
          try { chrome.runtime.sendMessage({ type: 'openLibrary', videoId: this.videoId }); } catch { this.toast('Recarga la página: la extensión se actualizó'); }
          break;
        case 'sidepanel':
          try {
            chrome.runtime.sendMessage({ type: 'openSidePanel' }).then((r) => { if (!r?.ok) this.toast(r?.error || 'No se pudo abrir el panel lateral'); }).catch(() => this.toast('Recarga la página: la extensión se actualizó'));
          } catch { this.toast('Recarga la página: la extensión se actualizó'); }
          break;
        case 'unlock':
          try { chrome.runtime.sendMessage({ type: 'openUnlock' }); } catch { this.toast('Recarga la página: la extensión se actualizó'); }
          break;
        case 'detachout':
          this.detachResult();
          break;
        case 'detachtr':
          this.detachTranscript();
          break;
        case 'detachchat':
          this.detachChat();
          break;
        case 'chatclear':
          this.abortAll();
          this.chat = [];
          this.renderChat();
          this.saveHistory({ chat: [] });
          break;
        default:
      }
    }

    switchTab(name) {
      this.shadow.querySelectorAll('[data-tab]').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
      this.shadow.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== name; });
      this.refs.modelbar.hidden = name === 'transcript';
      if (name === 'chat') { this.renderChat(); setTimeout(() => this.refs.chatinput.focus({ preventScroll: true }), 0); }
      if (name === 'transcript') this.highlightCurrent(true);
    }

    toast(msg) {
      const t = this.refs.toast;
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
    }

    /* ---------- render: transcripción ---------- */

    renderAll() {
      this.renderLanguages();
      this.renderProvider();
      this.renderActions();
      this.renderChat();
      this.refs.outwrap.hidden = true;
      this.refs.meta.textContent = '';
      this.refs.search.value = '';
    }

    setStatus(msg, isError = false, retry = false, detail = '') {
      const s = this.refs.status;
      s.classList.toggle('error', isError);
      s.innerHTML = msg ? `${isError ? I('alert') : '<span class="sn-spinner" style="display:inline-block;vertical-align:-2px;margin-right:6px"></span>'}${U.escapeHtml(msg)}` : '';
      if (retry) s.insertAdjacentHTML('beforeend', ' <button class="sn-link" data-act="retry">Reintentar</button>');
      if (detail) s.insertAdjacentHTML('beforeend', `<details class="sn-detail"><summary>Detalles técnicos</summary>${U.escapeHtml(detail)}</details>`);
      s.hidden = !msg;
    }

    /** Aviso informativo (no es un error): p. ej. un video sin subtítulos. */
    setInfo(msg, { transcribe = false, settingsBtn = false } = {}) {
      const s = this.refs.status;
      s.classList.remove('error');
      const sub = transcribe
        ? 'Puedes generarla con IA: Gemini mira el video y escribe la transcripción con marcas de tiempo. Usa tu clave de Gemini, solo funciona con videos públicos y queda guardada para no pagarla dos veces.'
        : settingsBtn ? 'Agrégala en la configuración de Subme Now (proveedor Gemini). Tiene un nivel gratuito.' : 'Prueba con otro video o activa los subtítulos automáticos si el video es tuyo.';
      const btn = transcribe ? `<button class="sn-btn primary" data-act="transcribe">${I('mic')}Transcribir con IA</button>`
        : settingsBtn ? `<button class="sn-btn primary" data-act="settings">${I('key')}Configurar Gemini</button>` : '';
      s.innerHTML = `<div class="sn-info">${I('info')} ${U.escapeHtml(msg)}<div class="sn-info-sub">${sub}</div>${btn ? `<div style="margin-top:8px">${btn}</div>` : ''}</div>`;
      s.hidden = false;
    }

    renderLanguages() {
      const sel = this.refs.lang;
      const info = this.video;
      let html = '';
      if (this.source === 'dom') {
        html += '<option value="">Transcripción de YouTube</option>';
      }
      if (this.source === 'ai') {
        sel.innerHTML = '<option value="">Transcripción con IA</option>';
        sel.selectedIndex = 0;
        return;
      }
      if (this.languages.length) {
        html += this.languages.map((l) => `<option value="it:${U.escapeHtml(l.params)}">${U.escapeHtml(l.title)}</option>`).join('');
      } else if (info?.tracks?.length) {
        html += info.tracks.map((t, i) => `<option value="tt:${i}:">${U.escapeHtml(t.name)}${t.kind === 'asr' && !/auto/i.test(t.name) ? ' (automático)' : ''}</option>`).join('');
      } else {
        html += `<option value="">${this.loading ? 'Cargando…' : this.segments.length ? 'Transcripción' : 'Sin subtítulos'}</option>`;
      }
      if (info?.tracks?.length && info.translationLanguages?.length) {
        let base = 0;
        const m = /^tt:(\d+):/.exec(this.selectedLang || '');
        if (m) base = Number(m[1]);
        else {
          const cur = this.languages.find((l) => `it:${l.params}` === this.selectedLang);
          const idx = cur ? info.tracks.findIndex((t) => t.name === cur.title) : -1;
          if (idx >= 0) base = idx;
        }
        if (info.tracks[base]?.isTranslatable) {
          html += `<optgroup label="Traducción automática de YouTube">${info.translationLanguages
            .map((l) => `<option value="tt:${base}:${U.escapeHtml(l.code)}">→ ${U.escapeHtml(l.name)}</option>`).join('')}</optgroup>`;
        }
      }
      sel.innerHTML = html;
      // Si la pista elegida no está en la lista (p. ej. tras un error), mostrar la primera en vez de dejarlo vacío.
      const exists = [...sel.options].some((o) => o.value === (this.selectedLang || ''));
      if (exists) sel.value = this.selectedLang || '';
      else sel.selectedIndex = 0;
    }

    renderSegments() {
      const q = this.refs.search.value.trim().toLowerCase();
      const showTs = this.settings.showTimestamps;
      const parts = [];
      let shown = 0;
      this.segments.forEach((s, i) => {
        if (q && !s.text.toLowerCase().includes(q)) return;
        shown++;
        parts.push(`<div class="sn-seg" data-i="${i}" data-t="${s.start}">${showTs ? `<span class="sn-seg-ts">${U.formatTime(s.start)}</span>` : ''}<span class="sn-seg-text">${q ? highlight(s.text, q) : U.escapeHtml(s.text)}</span></div>`);
      });
      this.refs.segments.innerHTML = parts.join('') || (this.segments.length ? '<div class="sn-status">Sin coincidencias.</div>' : '');
      this.segEls = [];
      this.refs.segments.querySelectorAll('.sn-seg').forEach((el) => { this.segEls[Number(el.dataset.i)] = el; });
      this.currentIdx = -1;

      if (this.segments.length) {
        const words = this.segments.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
        const src = { innertube: 'YouTube', timedtext: 'subtítulos', dom: 'panel de YouTube', ai: 'transcripción con IA' }[this.source] || '';
        this.refs.meta.innerHTML = `<span>${q ? `${shown} coincidencias · ` : ''}${this.segments.length} segmentos · ${words.toLocaleString()} palabras · ~${Math.max(1, Math.round(words / 200))} min de lectura</span><span>${U.escapeHtml(src)}</span>`;
      }
      this.highlightCurrent(true);
    }

    highlightCurrent(force = false) {
      if (!this.videoEl) return;
      const t = this.videoEl.currentTime;
      this.viewCtl?.onTime?.(t);
      this.timeListeners?.forEach((fn) => fn(t));
      if (!this.segments.length) return;
      let lo = 0;
      let hi = this.segments.length - 1;
      let idx = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (this.segments[mid].start <= t + 0.25) { idx = mid; lo = mid + 1; } else hi = mid - 1;
      }
      if (idx === this.currentIdx && !force) return;
      this.segEls[this.currentIdx]?.classList.remove('current');
      this.currentIdx = idx;
      const el = this.segEls[idx];
      if (!el) return;
      el.classList.add('current');
      const box = this.refs.segments;
      if (this.settings.autoScroll && Date.now() > this.userScrollUntil && !box.closest('[hidden]') && !this.refs.search.value) {
        const top = el.offsetTop - box.offsetTop - box.clientHeight / 3;
        box.scrollTop = Math.max(0, top);
      }
    }

    downloadTranscript(kind) {
      if (!this.segments.length) { this.toast('No hay transcripción'); return; }
      const name = U.safeFilename(this.video?.title);
      const map = {
        txt: () => [`${name}.txt`, U.toTXT(this.segments, true), 'text/plain'],
        plain: () => [`${name}.txt`, U.toPlainParagraphs(this.segments), 'text/plain'],
        srt: () => [`${name}.srt`, U.toSRT(this.segments), 'application/x-subrip'],
        vtt: () => [`${name}.vtt`, U.toVTT(this.segments), 'text/vtt'],
        md: () => [`${name}.md`, U.toMarkdown(this.video, this.segments), 'text/markdown'],
        json: () => [`${name}.json`, JSON.stringify({ video: { id: this.videoId, title: this.video?.title, author: this.video?.author, url: this.video?.url }, segments: this.segments }, null, 2), 'application/json'],
      };
      const [file, text, mime] = map[kind]();
      U.downloadText(file, text, mime);
    }

    /* ---------- render: IA ---------- */

    renderProvider() {
      const s = this.settings;
      const p = s.provider;
      const sel = this.refs.provsel;
      if (!sel.options.length) {
        this.refs.rlang.innerHTML = Object.entries(P.LANGUAGES)
          .map(([code, name]) => `<option value="${code}">${U.escapeHtml(code === 'video' ? 'Idioma del video' : name.split(' (')[0].replace(/^./, (c) => c.toUpperCase()))}</option>`).join('');
      }
      sel.innerHTML = Object.entries(PROVIDER_LABELS).map(([id, label]) => {
        const c = s.providers?.[id] || {};
        const ok = id === 'custom' ? !!c.baseUrl : !!c.hasKey;
        return `<option value="${id}">${U.escapeHtml(label)}${ok ? '' : ' (sin configurar)'}</option>`;
      }).join('');
      sel.value = p;
      const input = this.refs.modelin;
      if (this.shadow.activeElement !== input) {
        input.value = s.providers?.[p]?.model || '';
        input.placeholder = DEFAULT_MODELS[p] || 'modelo';
      }
      if (this.shadow.activeElement !== this.refs.rlang) this.refs.rlang.value = s.responseLanguage;
      this.renderModelList();
      this.refs.nokey.hidden = this.hasKey();
      this.refs.lockbtn.hidden = !this.isLocked();
    }

    isLocked() {
      return !!this.settings.vault?.locked;
    }

    lockedHtml(message) {
      return `<div class="sn-notice">${I('lock')} ${U.escapeHtml(message || 'Tus API keys están protegidas con contraseña.')}
        <div style="margin-top:8px"><button class="sn-btn primary" data-act="unlock">Desbloquear</button></div></div>`;
    }

    renderModelList() {
      const p = this.settings.provider;
      const recent = this.settings.recentModels?.[p] || [];
      const all = this.modelCache?.[p] || [];
      const seen = new Set();
      const opts = [DEFAULT_MODELS[p], ...recent, ...all].filter((m) => m && !seen.has(m) && seen.add(m));
      this.refs.modellist.innerHTML = opts.map((m) => `<option value="${U.escapeHtml(m)}"></option>`).join('');
    }

    async loadModelList() {
      const p = this.settings.provider;
      this.modelCache = this.modelCache || {};
      if (this.modelCache[p] || !this.hasKey() || this.loadingModels) return;
      this.loadingModels = true;
      try {
        const r = await chrome.runtime.sendMessage({ type: 'listModels', providerId: p });
        if (r?.ok) { this.modelCache[p] = r.models; this.renderModelList(); }
      } catch { /* sin lista: se puede escribir el modelo a mano */ } finally {
        this.loadingModels = false;
      }
    }

    async saveModelChoice({ provider, model, responseLanguage }) {
      const patch = {};
      if (provider) patch.provider = provider;
      if (responseLanguage) patch.responseLanguage = responseLanguage;
      const s = await this.updateSettings(patch, model);
      if (!s) return;
      this.toast(provider ? `Proveedor: ${PROVIDER_LABELS[s.provider]}` : model !== undefined ? `Modelo: ${model || DEFAULT_MODELS[s.provider]}` : 'Idioma actualizado');
    }

    allActions() {
      const custom = (this.settings.customActions || [])
        .filter((a) => a && a.label && a.prompt)
        .map((a, i) => ({ id: `custom-${i}`, icon: SubmeIcons.has(a.icon) ? a.icon : 'star', label: a.label, desc: 'Acción personalizada', prompt: a.prompt }));
      return [...P.ACTIONS, ...custom];
    }

    findAction(id) {
      return this.allActions().find((a) => a.id === id) || this.savedActions?.get(id);
    }

    renderActions() {
      const sc = this.settings.shortcuts || {};
      const hint = (a) => {
        const k = { summary: sc['run-summary'], mindmap: sc['run-mindmap'] }[a.id];
        return `${a.desc || a.label}${k ? ` (${k})` : ''}`;
      };
      this.refs.actions.innerHTML = this.allActions().map((a) => `
        <button class="sn-action${this.currentAction?.id === a.id ? ' active' : ''}" data-action="${U.escapeHtml(a.id)}" title="${U.escapeHtml(hint(a))}">
          <span class="sn-action-label">${I(a.icon)}<span>${U.escapeHtml(a.label)}</span>${this.results.has(a.id) ? '<span class="sn-action-done">✓</span>' : ''}</span>
        </button>`).join('');
      const extra = [...(this.savedActions?.values() || [])].filter((a) => this.results.has(a.id) && !P.ACTIONS.some((x) => x.id === a.id));
      this.refs.saved.hidden = !extra.length;
      this.refs.saved.innerHTML = extra.length ? `<span class="sn-saved-label">${I('history')}Pedidos guardados</span>${extra.map((a) => `<button class="sn-chip${this.currentAction?.id === a.id ? ' on' : ''}" data-action="${U.escapeHtml(a.id)}" title="${U.escapeHtml(a.prompt || a.label)}">${U.escapeHtml(a.label)}</button>`).join('')}` : '';
      const n = this.results.size;
      this.refs.aibadge.hidden = !n;
      this.refs.aibadge.textContent = n ? String(n) : '';
    }

    abortAll() {
      SN.tts?.stop();
      this.stream?.abort();
      this.stream = null;
      this.ctxRef?.current?.abort();
    }

    async ensureContext(onProgress) {
      if (this.context) return this.context;
      this.ctxRef = { current: null };
      const ctx = await SN.ai.buildContext({ video: this.video, segments: this.segments, settings: this.settings, onProgress, signalRef: this.ctxRef });
      this.context = { transcriptText: ctx.transcriptText, condensed: ctx.condensed };
      return this.context;
    }

    systemPrompt(chat = false) {
      return P.buildSystemPrompt({
        video: this.video,
        transcriptText: this.context.transcriptText,
        condensed: this.context.condensed,
        responseLanguage: this.settings.responseLanguage,
        chat,
      });
    }

    async runAction(action, { force = false } = {}) {
      if (!action) return;
      this.switchTab('ai');
      if (!this.segments.length) { this.toast(this.loading ? 'Espera a que cargue la transcripción' : 'Este video no tiene transcripción'); return; }
      if (!this.hasKey()) { this.refs.nokey.hidden = false; this.toast('Configura una API key primero'); return; }

      this.abortAll();
      this.currentAction = action;
      this.renderActions();
      const out = this.refs.output;
      this.refs.outwrap.hidden = false;
      this.refs.outtitle.innerHTML = `${I(action.icon || 'sparkles')}<span>${U.escapeHtml(action.label)}</span>`;
      requestAnimationFrame(() => this.refs.outwrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));

      if (!force && !action.noCache && this.results.has(action.id)) {
        this.renderResult(action, this.results.get(action.id), this.savedNote(action.id));
        return;
      }

      const stopBtn = this.shadow.querySelector('[data-act="stop"]');
      const progress = (msg) => { out.innerHTML = skeleton(msg); };
      progress('Pensando…');
      this.viewCtl = null;
      stopBtn.hidden = false;
      const myToken = this.loadToken;

      try {
        await this.ensureContext(progress);
        if (myToken !== this.loadToken || this.currentAction !== action) return;
        let pending = false;
        let finished = false;
        this.stream = SN.ai.stream(
          { system: this.systemPrompt(), messages: [{ role: 'user', content: action.prompt }] },
          (_d, full) => {
            if (pending) return;
            pending = true;
            requestAnimationFrame(() => {
              pending = false;
              if (finished || this.currentAction !== action) return;
              if (action.view === 'mindmap') {
                out.innerHTML = skeleton(`Construyendo el mapa mental… (${full.split('\n').filter((l) => l.trim()).length} ideas)`);
              } else if (action.view === 'structured') {
                const n = SN.views.progressCount(action.id, full);
                out.innerHTML = skeleton(`Preparando ${action.label.toLowerCase()}…${n ? ` (${n})` : ''}`);
              } else {
                out.innerHTML = MD.render(full) + '<div class="sn-progress"><span class="sn-spinner"></span></div>';
              }
            });
          },
        );
        const r = await this.stream.promise.finally(() => { finished = true; });
        if (this.currentAction !== action) return;
        if (r.text && !r.aborted) this.viewStates[action.id] = {}; // resultado nuevo: progreso desde cero
        this.renderResult(action, r.text, r.notice);
        this.lastOutput = r.text;
        if (r.text && !r.aborted && !action.noCache) {
          this.results.set(action.id, r.text);
          this.resultMeta.set(action.id, { at: Date.now(), model: r.model, provider: r.provider });
          const builtin = P.ACTIONS.some((x) => x.id === action.id);
          this.saveHistory({ result: { id: action.id, label: action.label, icon: action.icon, view: action.view || '', text: r.text, model: r.model, provider: r.provider, custom: !builtin, prompt: action.prompt } });
        }
        this.renderActions();
      } catch (e) {
        if (this.currentAction === action) {
          if (e.code === 'LOCKED') this.refreshSettings();
          out.innerHTML = e.aborted ? '<div class="sn-foot-note">Generación detenida.</div>'
            : e.code === 'LOCKED' ? this.lockedHtml(e.message) : `<div class="sn-error">${I('alert')} ${U.escapeHtml(e.message)}</div>`;
        }
      } finally {
        if (this.currentAction === action) stopBtn.hidden = true;
      }
    }

    /* ---------- exportar y escuchar ---------- */

    currentDoc() {
      const raw = this.results.get(this.currentAction?.id) || this.lastOutput;
      if (!raw || !this.currentAction) return null;
      // Las vistas gráficas se exportan como su equivalente en Markdown.
      const text = this.currentAction.view === 'structured' ? SN.views.toMarkdown(this.currentAction.id, raw) : raw;
      return { video: this.video, title: this.currentAction.label, text };
    }

    async exportResult(kind) {
      const doc = this.currentDoc();
      if (!doc) { this.toast('Todavía no hay un resultado para exportar'); return; }
      try {
        if (kind === 'rich') { await SN.exporter.copyRich(doc); this.toast('Copiado con formato: pégalo en Docs, Notion o Word'); }
        if (kind === 'obsidian') {
          await SN.exporter.toObsidian(doc, { vault: this.settings.obsidianVault, folder: this.settings.obsidianFolder });
          this.toast('Abriendo Obsidian…');
        }
        if (kind === 'md') SN.exporter.downloadMarkdown(doc);
        if (kind === 'docx') SN.exporter.downloadDocx(doc);
        if (kind === 'pdf') await SN.exporter.print(doc);
      } catch (e) {
        this.toast(`No se pudo exportar: ${e.message}`);
      }
    }

    async startReading() {
      const out = this.refs.output;
      let container = out;
      if (this.currentAction?.view === 'structured') {
        // Leer el equivalente en texto de la vista gráfica (sin tocar la vista interactiva).
        out.querySelector('.sn-tts-src')?.remove();
        out.insertAdjacentHTML('beforeend', `<div class="sn-tts-src" hidden>${MD.render(this.currentDoc()?.text || '')}</div>`);
        container = out.querySelector('.sn-tts-src');
      } else if (this.currentAction?.view === 'mindmap' && out.querySelector('.mm-text')) {
        out.querySelector('.mm-switch [data-view="text"]')?.click(); // leer la versión en texto del mapa
        container = out.querySelector('.mm-text');
      }
      const lang = this.settings.responseLanguage === 'video' ? (document.documentElement.lang || 'es') : this.settings.responseLanguage;
      this.refs.tts.hidden = false;
      this.refs.ttsrate.value = String(this.settings.ttsRate || 1);
      try {
        await SN.tts.start(container, {
          lang,
          rate: Number(this.settings.ttsRate) || 1,
          voiceURI: this.settings.ttsVoice,
          onState: (st) => this.renderTtsState(st),
        });
        this.fillVoices(lang);
      } catch (e) {
        this.refs.tts.hidden = true;
        this.toast(e.message);
      }
    }

    async fillVoices(lang) {
      const voices = await SN.tts.getVoices();
      const base = (lang || 'es').split('-')[0].toLowerCase();
      const list = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
      const shown = list.length ? list : voices;
      const current = SN.tts.pickVoice(voices, lang, this.settings.ttsVoice);
      this.refs.ttsvoice.innerHTML = shown.map((v) => `<option value="${U.escapeHtml(v.voiceURI)}">${U.escapeHtml(v.name)}</option>`).join('');
      if (current) this.refs.ttsvoice.value = current.voiceURI;
      this.refs.ttsvoice.hidden = !shown.length;
    }

    renderTtsState({ state, index, total }) {
      if (state === 'idle') { this.refs.tts.hidden = true; return; }
      this.refs.tts.hidden = false;
      this.refs.ttsplay.innerHTML = I(state === 'playing' ? 'pause' : 'play');
      this.refs.ttsplay.title = state === 'playing' ? 'Pausar' : 'Continuar';
      this.refs.ttsprogress.textContent = `${state === 'paused' ? 'En pausa · ' : 'Leyendo · '}${index}/${total}`;
    }

    /** Atajos de teclado (chrome://extensions/shortcuts). */
    handleCommand(command) {
      if (!this.videoId) return;
      if (this.sidePorts?.size) { this.sidePorts.forEach((p) => { try { p.postMessage({ type: 'command', command }); } catch { /* cerrado */ } }); return; }
      if (this.root.classList.contains('collapsed') && command !== 'toggle-panel') this.handleAct('toggle');
      if (command === 'toggle-panel') this.handleAct('toggle');
      if (command === 'run-summary') this.runAction(this.findAction('summary'));
      if (command === 'run-mindmap') this.runAction(this.findAction('mindmap'));
      if (command === 'open-chat') { this.switchTab('chat'); this.refs.chatinput.focus({ preventScroll: true }); }
    }

    /** Muestra el resultado de una acción: Markdown, o diagrama si es un mapa mental. */
    renderResult(action, text, notice = '') {
      const out = this.refs.output;
      this.lastOutput = text;
      const note = notice ? `<div class="sn-foot-note">${U.escapeHtml(notice)}</div>` : '';
      this.viewCtl = null;
      if (action.view === 'structured') {
        this.viewStates = this.viewStates || {};
        const state = (this.viewStates[action.id] = this.viewStates[action.id] || {});
        const r = SN.views.render(out, action.id, text, { video: this.video, state, toast: (m) => this.toast(m), accent: this.accent || '#6d4aff' });
        if (r.ok) {
          this.viewCtl = r.controller;
          if (note) out.insertAdjacentHTML('beforeend', note);
          this.highlightCurrent(true);
          return;
        }
      }
      const tree = action.view === 'mindmap' ? SN.mindmap.parse(text, this.video?.title) : null;
      if (tree && this.accent) tree.color = this.accent;
      if (!tree) { out.innerHTML = `<div class="vw">${MD.render(text)}</div>${note}`; return; }
      out.innerHTML = `<div class="mm-switch"><button data-view="diagram" class="on">Diagrama</button><button data-view="text">Texto</button></div>
        <div class="mm-host"></div><div class="md mm-text" hidden>${MD.render(text)}</div>${note}`;
      const host = out.querySelector('.mm-host');
      const opts = {
        dark: this.host.getAttribute('data-theme') === 'dark',
        title: this.video?.title,
        onSeek: (t) => this.seek(t),
        onError: (m) => this.toast(m),
        onFullscreen: () => this.openMindmapFullscreen(tree, () => inline.redraw()),
      };
      const inline = SN.mindmap.mount(host, tree, opts);
      out.querySelector('.mm-switch').addEventListener('click', (e) => {
        const v = e.target.closest('[data-view]')?.dataset.view;
        if (!v) return;
        out.querySelectorAll('.mm-switch button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
        host.hidden = v !== 'diagram';
        out.querySelector('.mm-text').hidden = v !== 'text';
      });
    }

    /**
     * Vista ampliada del mapa mental. Usa un <dialog> modal nativo: se dibuja en la capa superior
     * del navegador, así que no lo afectan los estilos de YouTube (transformaciones, z-index).
     */
    openMindmapFullscreen(tree, onClose) {
      const dialog = document.createElement('dialog');
      dialog.className = 'mm-overlay mm-dialog';
      dialog.innerHTML = `<div class="mm-overlay-card">
        <div class="mm-overlay-head"><span class="sn-output-title">${I('mindmap')}<span>${U.escapeHtml(this.video?.title || 'Mapa mental')}</span></span>
        <button class="sn-btn mm-close" data-close title="Cerrar (Esc)">${I('close')}Cerrar</button></div>
        <div class="mm-overlay-body"></div></div>`;
      this.shadow.querySelector('.sn-wrap').appendChild(dialog);
      dialog.addEventListener('close', () => { dialog.remove(); onClose?.(); });
      dialog.addEventListener('click', (e) => {
        // Clic en el fondo oscuro (fuera de la tarjeta) o en "Cerrar".
        if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
      });
      // Evita que las teclas lleguen a los atajos de YouTube (k, j, f, flechas…) mientras está abierto.
      dialog.addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation(); });
      dialog.showModal();
      SN.mindmap.mount(dialog.querySelector('.mm-overlay-body'), tree, {
        fill: true,
        dark: this.host.getAttribute('data-theme') === 'dark',
        title: this.video?.title,
        onSeek: (t) => this.seek(t),
        onError: (m) => this.toast(m),
      });
    }

    renderVideoCard() {
      const v = this.video;
      const card = this.refs.videocard;
      if (!v?.videoId) { card.hidden = true; return; }
      const img = this.refs.vthumb;
      img.onerror = () => { img.hidden = true; };
      img.hidden = false;
      img.src = `https://i.ytimg.com/vi/${encodeURIComponent(v.videoId)}/mqdefault.jpg`;
      this.refs.vtitle.textContent = v.title || '';
      this.refs.vmeta.textContent = [v.author, v.lengthSeconds ? U.formatTime(v.lengthSeconds) : ''].filter(Boolean).join(' · ');
      card.hidden = false;
    }

    /* ---------- recorrido guiado (primera vez) ---------- */

    maybeStartTour() {
      if (this.settings.onboardingDone || this.tourShown || this.root.classList.contains('collapsed')) return;
      this.tourShown = true;
      const steps = [
        { sel: '.sn-tabs', title: 'Todo el video en tres pestañas', text: 'Transcripción completa, acciones de IA y un chat para hacerle preguntas al video.', tab: 'transcript' },
        { sel: '[data-ref="actions"]', title: 'Un clic, un resultado', text: 'Resúmenes, mapas mentales, quizzes, flashcards, capítulos y más. Todo con marcas de tiempo clicables.', tab: 'ai' },
        { sel: '[data-ref="modelbar"]', title: 'Tu IA, a tu manera', text: 'Elige proveedor, modelo e idioma aquí mismo. Cada resultado se puede escuchar, exportar o desacoplar en una ventana.', tab: 'ai' },
      ];
      const wrap = this.shadow.querySelector('.sn-wrap');
      const layer = document.createElement('div');
      layer.className = 'sn-tour';
      wrap.appendChild(layer);
      let i = 0;
      const finish = () => { layer.remove(); this.shadow.querySelectorAll('.sn-tour-target').forEach((e) => e.classList.remove('sn-tour-target')); this.updateSettings({ onboardingDone: true }); this.switchTab(this.settings.defaultTab || 'transcript'); };
      const show = () => {
        const st = steps[i];
        this.switchTab(st.tab);
        this.shadow.querySelectorAll('.sn-tour-target').forEach((e) => e.classList.remove('sn-tour-target'));
        const target = this.shadow.querySelector(st.sel);
        target?.classList.add('sn-tour-target');
        const wr = wrap.getBoundingClientRect();
        const tr = target ? target.getBoundingClientRect() : wr;
        layer.innerHTML = `<div class="sn-tour-card" role="dialog" style="top:${Math.round(tr.bottom - wr.top + 10)}px">
            <div class="sn-tour-step">${i + 1} de ${steps.length}</div>
            <b>${st.title}</b><p>${st.text}</p>
            <div class="sn-tour-actions"><button class="sn-link" data-tour="skip">Saltar</button><button class="sn-btn primary" data-tour="next">${i + 1 < steps.length ? 'Siguiente' : 'Empezar'}</button></div>
          </div>`;
      };
      layer.addEventListener('click', (e) => {
        const b = e.target.closest('[data-tour]');
        if (!b) return;
        e.stopPropagation();
        if (b.dataset.tour === 'skip' || i + 1 >= steps.length) finish();
        else { i++; show(); }
      });
      show();
    }

    /* ---------- ventanas desacopladas ---------- */

    theme() {
      return { dark: this.host.getAttribute('data-theme') === 'dark', accent: this.accent || '' };
    }

    /** Posición guardada o, la primera vez, a la izquierda del panel para no taparlo. */
    winGeometry(kind) {
      const saved = this.settings.windows?.[kind];
      if (saved) return saved;
      const size = { mindmap: [760, 540], transcript: [420, 560], chat: [420, 600] }[kind] || [460, 600];
      const [w, h] = size;
      const r = this.host.getBoundingClientRect();
      const n = SN.windows?.all().length || 0;
      const x = r.left - w - 16 > 8 ? r.left - w - 16 - n * 24 : Math.max(8, innerWidth - w - 24);
      return { x: Math.max(8, x), y: Math.max(64, Math.min(r.top, innerHeight - h - 16)) + n * 24, w, h };
    }

    saveWinGeometry(kind, g) {
      const windows = { ...(this.settings.windows || {}), [kind]: g };
      this.settings.windows = windows;
      this.updateSettings({ windows });
    }

    /** Clics en marcas de tiempo y "copiar código" dentro de una ventana. */
    wireSurface(el, toast) {
      el.addEventListener('keyup', () => this.persistViewStatesSoon());
      el.addEventListener('click', (e) => {
        this.persistViewStatesSoon();
        const ts = e.target.closest('a.sn-ts');
        if (ts) { e.preventDefault(); this.seek(Number(ts.dataset.t)); return; }
        const cc = e.target.closest('.sn-copy-code');
        if (cc) U.copyText(cc.parentElement.querySelector('code').textContent).then(() => toast?.('Copiado'));
      });
    }

    /** Dibuja un resultado en cualquier contenedor. Devuelve { cleanup, onResize }. */
    renderSurface(container, action, text, { toast, fill = false } = {}) {
      if (action.view === 'structured') {
        this.viewStates = this.viewStates || {};
        const state = (this.viewStates[action.id] = this.viewStates[action.id] || {});
        const r = SN.views.render(container, action.id, text, { video: this.video, state, toast, accent: this.accent || '#6d4aff' });
        if (r.ok) {
          const fn = r.controller?.onTime;
          if (fn) { this.timeListeners.add(fn); fn(this.videoEl?.currentTime || 0); }
          return { cleanup: () => fn && this.timeListeners.delete(fn) };
        }
      }
      if (action.view === 'mindmap') {
        const tree = SN.mindmap.parse(text, this.video?.title);
        if (tree) {
          if (this.accent) tree.color = this.accent;
          const mm = SN.mindmap.mount(container, tree, { fill, dark: this.theme().dark, title: this.video?.title, onSeek: (t) => this.seek(t), onError: (m) => toast?.(m) });
          return { cleanup: () => {}, onResize: () => mm.redraw() };
        }
      }
      container.innerHTML = `<div class="vw md">${MD.render(text)}</div>`;
      return { cleanup: () => {} };
    }

    detachResult() {
      const action = this.currentAction;
      const text = action && (this.results.get(action.id) || this.lastOutput);
      if (!action || !text) { this.toast('Todavía no hay un resultado para desacoplar'); return; }
      let surface = null;
      const w = SN.windows.open({
        key: `result:${action.id}`,
        title: `${action.label} · ${this.video?.title || ''}`,
        icon: action.icon,
        theme: this.theme(),
        geometry: this.winGeometry(action.view === 'mindmap' ? 'mindmap' : 'result'),
        onGeometry: (g) => this.saveWinGeometry(action.view === 'mindmap' ? 'mindmap' : 'result', g),
        render: (body, win) => {
          surface?.cleanup();
          surface = this.renderSurface(body, action, text, { toast: win.toast, fill: true });
          win.onResize = surface.onResize || null;
        },
        onClose: () => surface?.cleanup(),
        onPopout: () => this.popout('result', { action: { id: action.id, label: action.label, icon: action.icon, view: action.view }, text }),
      });
      if (!w.wired) { this.wireSurface(w.body, w.toast); w.wired = true; }
    }

    detachTranscript() {
      if (!this.segments.length) { this.toast('No hay transcripción para desacoplar'); return; }
      let ctl = null;
      const fn = (t) => ctl?.onTime(t);
      SN.windows.open({
        key: 'transcript',
        title: `Transcripción · ${this.video?.title || ''}`,
        icon: 'transcript',
        theme: this.theme(),
        geometry: this.winGeometry('transcript'),
        onGeometry: (g) => this.saveWinGeometry('transcript', g),
        render: (body) => {
          ctl = SN.surfaces.transcript(body, { segments: this.segments, seek: (t) => this.seek(t), autoScroll: this.settings.autoScroll });
          this.timeListeners.add(fn);
          fn(this.videoEl?.currentTime || 0);
        },
        onClose: () => this.timeListeners.delete(fn),
        onPopout: () => this.popout('transcript', { segments: this.segments }),
      });
    }

    detachChat() {
      let ctl = null;
      const fn = () => ctl?.render();
      const w = SN.windows.open({
        key: 'chat',
        title: `Chat · ${this.video?.title || ''}`,
        icon: 'chat',
        theme: this.theme(),
        geometry: this.winGeometry('chat'),
        onGeometry: (g) => this.saveWinGeometry('chat', g),
        render: (body) => {
          ctl = SN.surfaces.chat(body, { getChat: () => this.chat, send: (t) => this.sendChat(t, { keepTab: true }), suggestions: P.CHAT_SUGGESTIONS });
          this.chatSurfaces.add(fn);
          setTimeout(() => ctl.focus(), 0);
        },
        onClose: () => this.chatSurfaces.delete(fn),
        onPopout: () => this.popout('chat', {}),
      });
      if (!w.wired) { this.wireSurface(w.body, w.toast); w.wired = true; }
    }

    /** Abre el contenido en una ventana aparte del navegador (se puede llevar a otro monitor). */
    async popout(kind, extra) {
      const v = this.video || {};
      const payload = {
        kind,
        video: { videoId: v.videoId, title: v.title, author: v.author, lengthSeconds: v.lengthSeconds, url: v.url },
        theme: this.theme(),
        suggestions: P.CHAT_SUGGESTIONS,
        autoScroll: this.settings.autoScroll,
        ...extra,
      };
      const size = kind === 'transcript' || kind === 'chat' ? { width: 480, height: 760 } : extra?.action?.view === 'mindmap' ? { width: 1100, height: 760 } : { width: 620, height: 820 };
      try {
        await chrome.runtime.sendMessage({ type: 'openPopout', payload, ...size });
      } catch {
        this.toast('Recarga la página: la extensión se actualizó');
      }
    }

    /** Conexión con una ventana aparte: tiempo del video, saltos y chat. */
    attachPopoutPort(port) {
      const send = (m) => { try { port.postMessage(m); } catch { /* ventana cerrada */ } };
      let last = 0;
      const timeFn = (t) => { const now = Date.now(); if (now - last < 250) return; last = now; send({ type: 'time', t }); };
      const chatFn = () => send({ type: 'chat', chat: this.chat.map((m) => ({ role: m.role, content: m.content, error: typeof m.error === 'string' ? m.error : '' })) });
      this.timeListeners.add(timeFn);
      this.chatSurfaces.add(chatFn);
      chatFn();
      timeFn(this.videoEl?.currentTime || 0);
      port.onMessage.addListener((m) => {
        if (m?.type === 'seek') this.seek(Number(m.t));
        if (m?.type === 'chat' && m.text) this.sendChat(String(m.text), { keepTab: true });
      });
      port.onDisconnect.addListener(() => { this.timeListeners.delete(timeFn); this.chatSurfaces.delete(chatFn); });
    }

    /** El panel lateral de Chrome toma el control: este panel se oculta mientras esté abierto. */
    attachSidePort(port) {
      this.sidePorts = this.sidePorts || new Set();
      this.sidePorts.add(port);
      this.host.style.display = 'none';
      SN.windows?.closeAll();
      const send = (m) => { try { port.postMessage(m); } catch { /* cerrado */ } };
      let last = 0;
      const timeFn = (t) => { const now = Date.now(); if (now - last < 250) return; last = now; send({ type: 'time', t }); };
      this.timeListeners.add(timeFn);
      this.attachVideo();
      timeFn(this.videoEl?.currentTime || 0);
      port.onMessage.addListener((m) => {
        if (m?.type === 'seek') this.seek(Number(m.t));
        if (m?.type === 'time?') { last = 0; timeFn(this.videoEl?.currentTime || 0); }
      });
      port.onDisconnect.addListener(() => {
        this.timeListeners.delete(timeFn);
        this.sidePorts.delete(port);
        if (!this.sidePorts.size) this.host.style.display = '';
      });
    }

    /* ---------- chat ---------- */

    renderChat() {
      const log = this.refs.chatlog;
      if (!this.chat.length) {
        log.innerHTML = `<div class="sn-empty"><span class="sn-empty-icon">${I('chat')}</span><b>Conversa con el video</b><span>La IA responde usando la transcripción y te indica el minuto exacto de cada respuesta.</span></div>`;
        this.refs.suggestions.innerHTML = P.CHAT_SUGGESTIONS.map((s) => `<button class="sn-chip" type="button">${U.escapeHtml(s)}</button>`).join('');
      } else {
        log.innerHTML = this.chat.map((m) => (m.role === 'user'
          ? `<div class="sn-msg user">${U.escapeHtml(m.content)}</div>`
          : `<div class="sn-msg assistant md">${m.locked ? this.lockedHtml(m.error) : m.error ? `<div class="sn-error">${I('alert')} ${U.escapeHtml(m.error)}</div>` : MD.render(m.content) || '<div class="sn-progress"><span class="sn-spinner"></span>Pensando…</div>'}</div>`)).join('');
        this.refs.suggestions.innerHTML = '';
      }
      log.scrollTop = log.scrollHeight;
      this.chatSurfaces?.forEach((fn) => fn());
    }

    async sendChat(text, { keepTab = false } = {}) {
      text = String(text || '').trim();
      if (!text || this.chatBusy) return;
      if (!keepTab) this.switchTab('chat');
      if (!this.segments.length) { this.toast('No hay transcripción disponible'); return; }
      if (!this.hasKey()) { this.toast('Configura una API key primero'); handleSettings(); return; }

      this.refs.chatinput.value = '';
      this.chat.push({ role: 'user', content: text });
      const reply = { role: 'assistant', content: '' };
      this.chat.push(reply);
      this.renderChat();
      this.chatBusy = true;
      this.refs.chatsend.disabled = true;
      const myToken = this.loadToken;

      try {
        await this.ensureContext((msg) => { reply.content = `_${msg}_`; this.renderChat(); });
        reply.content = '';
        if (myToken !== this.loadToken) return;
        const history = this.chat.filter((m) => m !== reply && !m.error).map((m) => ({ role: m.role, content: m.content }));
        let pending = false;
        this.stream = SN.ai.stream({ system: this.systemPrompt(true), messages: history }, (_d, full) => {
          reply.content = full;
          if (pending) return;
          pending = true;
          requestAnimationFrame(() => { pending = false; this.renderChat(); });
        });
        const r = await this.stream.promise;
        reply.content = r.text || (r.aborted ? '_Respuesta detenida._' : '');
        if (myToken === this.loadToken && r.text) this.saveHistory({ chat: this.chat.filter((m) => !m.error && m.content) });
      } catch (e) {
        reply.error = e.message;
        reply.locked = e.code === 'LOCKED';
        if (reply.locked) this.refreshSettings();
        const idx = this.chat.indexOf(reply);
        if (idx > 0 && !reply.content) this.chat[idx - 1].error = true; // no reenviar la pregunta fallida como historial
      } finally {
        this.chatBusy = false;
        this.refs.chatsend.disabled = false;
        if (myToken === this.loadToken) this.renderChat();
      }
    }
  }

  /** Silueta animada de carga. */
  function skeleton(msg) {
    return `<div class="sn-skeleton" aria-busy="true">
      <div class="sk sk-title"></div><div class="sk"></div><div class="sk"></div><div class="sk sk-short"></div>
      <div class="sk sk-block"></div><div class="sk"></div><div class="sk sk-short"></div>
      <div class="sn-skeleton-msg"><span class="sn-spinner"></span>${U.escapeHtml(msg)}</div>
    </div>`;
  }

  function handleSettings() {
    try { chrome.runtime.sendMessage({ type: 'openOptions' }); } catch { /* extensión recargada */ }
  }

  function highlight(text, q) {
    const lower = text.toLowerCase();
    let out = '';
    let i = 0;
    for (;;) {
      const j = lower.indexOf(q, i);
      if (j < 0) break;
      out += U.escapeHtml(text.slice(i, j)) + `<mark>${U.escapeHtml(text.slice(j, j + q.length))}</mark>`;
      i = j + q.length;
    }
    return out + U.escapeHtml(text.slice(i));
  }

  SN.Panel = Panel;
})();
