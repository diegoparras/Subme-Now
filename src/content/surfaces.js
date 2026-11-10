/* Subme Now — contenidos reutilizables para ventanas flotantes y ventanas aparte:
 * transcripción (con búsqueda y línea actual) y chat.
 */
(function () {
  const SN = (globalThis.SubmeNow = globalThis.SubmeNow || {});
  const U = SubmeUtils;
  const I = (n, c) => SubmeIcons.icon(n, c);

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

  /** Transcripción: búsqueda, clic para saltar y resaltado de la línea actual. */
  function transcript(container, { segments, seek, autoScroll = true }) {
    container.innerHTML = `
      <div class="sf-tr">
        <input class="sn-input sf-search" type="search" placeholder="Buscar en la transcripción…">
        <div class="sn-meta sf-meta"></div>
        <div class="sn-segments sf-list"></div>
      </div>`;
    const list = container.querySelector('.sf-list');
    const search = container.querySelector('.sf-search');
    let els = [];
    let current = -1;
    let userScrollUntil = 0;
    const draw = () => {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      list.innerHTML = segments.map((s, i) => {
        if (q && !s.text.toLowerCase().includes(q)) return '';
        shown++;
        return `<div class="sn-seg" data-i="${i}" data-t="${s.start}"><span class="sn-seg-ts">${U.formatTime(s.start)}</span><span class="sn-seg-text">${q ? highlight(s.text, q) : U.escapeHtml(s.text)}</span></div>`;
      }).join('') || '<div class="sn-status">Sin coincidencias.</div>';
      els = [];
      list.querySelectorAll('.sn-seg').forEach((el) => { els[Number(el.dataset.i)] = el; });
      current = -1;
      container.querySelector('.sf-meta').textContent = `${q ? `${shown} coincidencias · ` : ''}${segments.length} segmentos`;
    };
    search.addEventListener('input', draw);
    list.addEventListener('click', (e) => { const seg = e.target.closest('.sn-seg'); if (seg) seek(Number(seg.dataset.t)); });
    list.addEventListener('wheel', () => { userScrollUntil = Date.now() + 4000; }, { passive: true });
    draw();
    return {
      onTime(t) {
        let idx = -1;
        for (let i = 0; i < segments.length; i++) { if (segments[i].start <= t + 0.25) idx = i; else break; }
        if (idx === current) return;
        els[current]?.classList.remove('current');
        current = idx;
        const el = els[idx];
        if (!el) return;
        el.classList.add('current');
        if (autoScroll && Date.now() > userScrollUntil && !search.value) {
          list.scrollTop = Math.max(0, el.offsetTop - list.offsetTop - list.clientHeight / 3);
        }
      },
    };
  }

  /** Chat: historial con Markdown y campo para escribir. */
  function chat(container, { getChat, send, suggestions = [] }) {
    container.innerHTML = `
      <div class="sf-chat">
        <div class="sn-chat-log sf-log"></div>
        <div class="sn-suggestions sf-sugg"></div>
        <form class="sn-chat-form sf-form">
          <textarea class="sn-textarea" rows="2" placeholder="Pregunta algo sobre el video… (Enter para enviar)"></textarea>
          <button class="sn-btn primary" type="submit">${I('send')}Enviar</button>
        </form>
      </div>`;
    const log = container.querySelector('.sf-log');
    const input = container.querySelector('textarea');
    const sugg = container.querySelector('.sf-sugg');
    const submit = () => { const t = input.value.trim(); if (!t) return; input.value = ''; send(t); };
    container.querySelector('.sf-form').addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } });
    sugg.addEventListener('click', (e) => { const c = e.target.closest('.sn-chip'); if (c) send(c.textContent); });
    const render = () => {
      const msgs = getChat() || [];
      if (!msgs.length) {
        log.innerHTML = '<div class="sn-chat-empty">Hazle preguntas al video. La IA responde usando la transcripción y te señala los momentos exactos.</div>';
        sugg.innerHTML = suggestions.map((s) => `<button class="sn-chip" type="button">${U.escapeHtml(s)}</button>`).join('');
      } else {
        sugg.innerHTML = '';
        log.innerHTML = msgs.map((m) => (m.role === 'user'
          ? `<div class="sn-msg user">${U.escapeHtml(m.content)}</div>`
          : `<div class="sn-msg assistant md">${m.error && typeof m.error === 'string' ? `<div class="sn-error">${I('alert')} ${U.escapeHtml(m.error)}</div>` : SubmeMarkdown.render(m.content) || '<div class="sn-progress"><span class="sn-spinner"></span>Pensando…</div>'}</div>`)).join('');
      }
      log.scrollTop = log.scrollHeight;
    };
    render();
    return { render, focus: () => input.focus() };
  }

  SN.surfaces = { transcript, chat };

  SN.styles = `${SN.styles || ''}
.sf-tr, .sf-chat { display: flex; flex-direction: column; height: 100%; min-height: 0; gap: 8px; }
.sf-tr .sf-search { width: 100%; }
.sf-tr .sf-list { flex: 1; max-height: none; min-height: 0; }
.sf-chat .sf-log { flex: 1; max-height: none; }
.sf-chat .sn-chat-form .sn-btn { gap: 6px; }
`;
})();
