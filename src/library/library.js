/* Subme Now — biblioteca: todo lo guardado de cada video, búsqueda de texto completo,
 * filtros, favoritos, etiquetas, repaso de tarjetas combinado y exportación.
 */
(async function () {
  const SN = globalThis.SubmeNow;
  const U = SubmeUtils;
  const H = SubmeHistory;
  const MD = SubmeMarkdown;
  const I = (n, c) => SubmeIcons.icon(n, c);
  const $ = (id) => document.getElementById(id);
  const esc = U.escapeHtml;
  const ACTIONS = Object.fromEntries(SubmePrompts.ACTIONS.map((a) => [a.id, a]));
  const DAY = 86400000;
  const INTERVALS = [1, 3, 7, 16, 35, 80]; // días entre repasos de una tarjeta que sabías

  let settings = await SubmeSettings.getSettings();
  let records = [];
  const filters = { q: '', channel: '', type: '', days: '', tag: '', fav: false };
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const accent = /^#[0-9a-f]{6}$/i.test(settings.iconColor || '') ? settings.iconColor : '';

  /* ---------- apariencia ---------- */

  if (accent) {
    document.documentElement.setAttribute('data-accent', '');
    document.documentElement.style.setProperty('--user-accent', accent);
    SubmeLogo.applyTo(document.querySelectorAll('img[data-logo]'), accent);
  }
  $('exportBtn').innerHTML = `${I('download')}Exportar`;
  $('settingsBtn').innerHTML = I('settings');
  $('searchIcon').outerHTML = I('search');
  $('fFav').innerHTML = `${I('star')}Favoritos`;

  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  /* ---------- utilidades ---------- */

  const ytUrl = (id, t) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}${t ? `&t=${Math.max(0, Math.floor(t))}s` : ''}`;
  const thumb = (id) => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/mqdefault.jpg`;
  const openAt = (id, t) => window.open(ytUrl(id, t), '_blank', 'noopener');
  const fmtDate = (ms) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  function typeOf(resultId) {
    if (ACTIONS[resultId]) return resultId;
    if (resultId.startsWith('custom-')) return 'custom';
    return 'free';
  }
  const TYPE_LABEL = { custom: 'Acciones personalizadas', free: 'Pedidos libres', chat: 'Chat', 'ai-transcript': 'Transcripción con IA' };
  const typeLabel = (t) => ACTIONS[t]?.label || TYPE_LABEL[t] || t;

  /** Texto legible de un resultado (las vistas gráficas se guardan como JSON). */
  function resultText(r) {
    return SN.views.has(r.id) ? SN.views.toMarkdown(r.id, r.text) : r.text;
  }

  function typesOf(rec) {
    const t = new Set(Object.keys(rec.results || {}).map(typeOf));
    if (rec.chat?.length) t.add('chat');
    if (rec.transcript?.source === 'ai') t.add('ai-transcript');
    return t;
  }

  /** Minúsculas y sin acentos, conservando la longitud (para ubicar las coincidencias en el texto original). */
  function fold(s) {
    let out = '';
    for (const ch of String(s)) {
      const n = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      out += n.length === ch.length ? n : ch.toLowerCase().length === ch.length ? ch.toLowerCase() : ch;
    }
    return out;
  }

  const TS = /\[?\b((?:\d{1,2}:)?\d{1,2}:\d{2})\b\]?/g;

  /** Minuto de una coincidencia: la marca de tiempo de su misma línea o, si no tiene, la última anterior. */
  function minuteNear(text, idx) {
    const lineStart = text.lastIndexOf('\n', idx) + 1;
    const lineEnd = text.indexOf('\n', idx);
    const line = text.slice(lineStart, lineEnd < 0 ? undefined : lineEnd);
    const own = /((?:\d{1,2}:)?\d{1,2}:\d{2})/.exec(line);
    if (own) return U.parseTime(own[1]);
    let found = null;
    TS.lastIndex = Math.max(0, idx - 900);
    let m;
    while ((m = TS.exec(text)) && m.index <= idx) found = m[1];
    return found ? U.parseTime(found) : null;
  }

  function snippet(text, idx, len) {
    const a = Math.max(0, idx - 80);
    const b = Math.min(text.length, idx + len + 120);
    const clean = (s) => esc(s.replace(/[#*_`>|]/g, '').replace(/\s+/g, ' '));
    return `${a ? '…' : ''}${clean(text.slice(a, idx))}<mark>${esc(text.slice(idx, idx + len))}</mark>${clean(text.slice(idx + len, b))}${b < text.length ? '…' : ''}`;
  }

  /* ---------- carga y filtros ---------- */

  async function load() {
    try { await H.prune(settings.historyDays); } catch { /* sin limpieza */ }
    records = await H.all();
    renderFilterOptions();
    render();
    updateReviewButton();
    const n = records.length;
    const results = records.reduce((a, r) => a + Object.keys(r.results || {}).length, 0);
    $('stats').textContent = n
      ? `${n} ${n === 1 ? 'video' : 'videos'} · ${results} ${results === 1 ? 'resultado guardado' : 'resultados guardados'}${settings.historyEnabled === false ? ' · historial en pausa' : ''}`
      : settings.historyEnabled === false ? 'El historial está desactivado' : 'Todavía no guardaste nada';
  }

  function renderFilterOptions() {
    const keep = (sel, opts, first) => {
      const el = $(sel);
      const cur = el.value;
      el.innerHTML = `<option value="">${first}</option>${opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}`;
      el.value = opts.some(([v]) => v === cur) ? cur : '';
    };
    const channels = [...new Set(records.map((r) => r.author).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    keep('fChannel', channels.map((c) => [c, c]), 'Todos los canales');
    const types = new Set();
    records.forEach((r) => typesOf(r).forEach((t) => types.add(t)));
    const order = [...SubmePrompts.ACTIONS.map((a) => a.id), 'custom', 'free', 'chat', 'ai-transcript'];
    keep('fType', order.filter((t) => types.has(t)).map((t) => [t, typeLabel(t)]), 'Todos los tipos');
    const tags = [...new Set(records.flatMap((r) => r.tags || []))].sort((a, b) => a.localeCompare(b));
    keep('fTag', tags.map((t) => [t, `#${t}`]), 'Todas las etiquetas');
    $('fTag').hidden = !tags.length;
  }

  function filtered() {
    const since = filters.days ? Date.now() - Number(filters.days) * DAY : 0;
    return records.filter((r) => (!filters.channel || r.author === filters.channel)
      && (!since || (r.updatedAt || 0) >= since)
      && (!filters.tag || (r.tags || []).includes(filters.tag))
      && (!filters.fav || r.favorite)
      && (!filters.type || typesOf(r).has(filters.type)));
  }

  /* ---------- vista principal ---------- */

  function render() {
    const list = filtered();
    const main = $('main');
    const q = filters.q.trim();
    if (q.length >= 2) { renderHits(list, q); return; }
    if (!records.length) {
      main.innerHTML = `<div class="empty"><span class="big">${I('library')}</span><b>Tu biblioteca está vacía</b>
        Cada resumen, mapa mental, quiz o conversación que generes en YouTube se guarda aquí automáticamente,<br>para volver a verlo sin gastar de nuevo en la IA.</div>`;
      return;
    }
    if (!list.length) { main.innerHTML = `<div class="empty"><span class="big">${I('filter')}</span><b>Nada coincide con los filtros</b>Prueba con otros filtros.</div>`; return; }
    main.innerHTML = `<div class="grid">${list.map(cardHtml).join('')}</div>`;
  }

  function cardHtml(r) {
    const res = Object.values(r.results || {});
    const chips = res.slice(0, 6).map((x) => `<span class="chip" title="${esc(x.label)}">${I(x.icon || 'sparkles')}${esc(shortLabel(x.label))}</span>`).join('')
      + (res.length > 6 ? `<span class="chip">+${res.length - 6}</span>` : '')
      + (r.chat?.length ? `<span class="chip">${I('chat')}Chat</span>` : '')
      + (r.transcript?.source === 'ai' ? `<span class="chip">${I('mic')}Transcripción IA</span>` : '')
      + (r.tags || []).map((t) => `<span class="chip tag">#${esc(t)}</span>`).join('');
    return `<article class="vcard" data-open="${esc(r.videoId)}">
      <div class="thumb"><img src="${thumb(r.videoId)}" alt="" loading="lazy" referrerpolicy="no-referrer">
        ${r.lengthSeconds ? `<span class="dur">${U.formatTime(r.lengthSeconds)}</span>` : ''}${r.isShort ? '<span class="kind">Short</span>' : ''}
        <button class="star${r.favorite ? ' on' : ''}" data-fav="${esc(r.videoId)}" title="${r.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}">${I('star')}</button></div>
      <div class="vbody"><div class="vtitle">${esc(r.title || r.videoId)}</div>
        <div class="vmeta">${esc([r.author, fmtDate(r.updatedAt || r.createdAt)].filter(Boolean).join(' · '))}</div>
        <div class="chips">${chips}</div></div>
    </article>`;
  }

  const shortLabel = (l) => (l.length > 22 ? `${l.slice(0, 21)}…` : l);

  /** Búsqueda en resultados, chats y transcripciones, con el minuto de cada coincidencia. */
  function renderHits(list, q) {
    const fq = fold(q);
    const groups = [];
    let total = 0;
    for (const r of list) {
      const hits = [];
      const scan = (text, type, icon, label, fixedT) => {
        const f = fold(text);
        let i = f.indexOf(fq);
        let n = 0;
        while (i >= 0 && n < 3) {
          hits.push({ type, icon, label, html: snippet(text, i, q.length), t: fixedT ?? minuteNear(text, i) });
          n++;
          i = f.indexOf(fq, i + fq.length);
        }
      };
      for (const x of Object.values(r.results || {})) {
        if (filters.type && typeOf(x.id) !== filters.type) continue;
        scan(resultText(x).replace(/```csv[\s\S]*?```/g, ''), 'result', x.icon || 'sparkles', x.label);
      }
      if (!filters.type || filters.type === 'chat') {
        (r.chat || []).forEach((m) => scan(m.content, 'chat', 'chat', m.role === 'user' ? 'Chat · tu pregunta' : 'Chat · respuesta'));
      }
      if (fold(r.title || '').includes(fq)) hits.unshift({ type: 'title', icon: 'youtube', label: 'Título', html: snippet(r.title, fold(r.title).indexOf(fq), q.length), t: null });
      if (!filters.type || filters.type === 'ai-transcript') {
        let n = 0;
        for (const s of r.transcript?.segments || []) {
          if (n >= 5) break;
          const f = fold(s.text);
          const i = f.indexOf(fq);
          if (i >= 0) { hits.push({ type: 'transcript', icon: 'transcript', label: 'Transcripción', html: snippet(s.text, i, q.length), t: s.start }); n++; }
        }
      }
      if (hits.length) { groups.push({ r, hits }); total += hits.length; }
      if (total > 400) break;
    }
    const main = $('main');
    if (!groups.length) {
      main.innerHTML = `<div class="empty"><span class="big">${I('search')}</span><b>Sin resultados para “${esc(q)}”</b>Busca otra palabra o quita algún filtro.</div>`;
      return;
    }
    main.innerHTML = `<p class="vmeta">${total} ${total === 1 ? 'coincidencia' : 'coincidencias'} en ${groups.length} ${groups.length === 1 ? 'video' : 'videos'}</p>
      <div class="hits">${groups.map(({ r, hits }) => `<section class="hit-group">
        <div class="hit-head" data-open="${esc(r.videoId)}"><img src="${thumb(r.videoId)}" alt="" loading="lazy" referrerpolicy="no-referrer"><div><b>${esc(r.title || r.videoId)}</b><span>${esc(r.author || '')}</span></div></div>
        ${hits.map((h) => `<div class="hit"><span class="hit-type">${I(h.icon)}${esc(h.label)}</span><span class="hit-text">${h.html}</span>
          ${h.t != null ? `<a class="ts" href="${ytUrl(r.videoId, h.t)}" target="_blank" rel="noopener" title="Ver en YouTube desde este minuto">${I('play')}${U.formatTime(h.t)}</a>` : ''}</div>`).join('')}
      </section>`).join('')}</div>`;
  }

  /* ---------- detalle de un video ---------- */

  let current = null; // { rec, sel }

  function openDetail(videoId) {
    const rec = records.find((r) => r.videoId === videoId);
    if (!rec) { toast('Ese video ya no está en la biblioteca'); return; }
    const items = [
      ...Object.values(rec.results || {}).sort((a, b) => (b.at || 0) - (a.at || 0)).map((x) => ({ key: `r:${x.id}`, icon: x.icon || 'sparkles', label: x.label, small: x.at ? fmtDate(x.at) : '' })),
      ...(rec.chat?.length ? [{ key: 'chat', icon: 'chat', label: 'Chat', small: `${Math.ceil(rec.chat.length / 2)}` }] : []),
      ...(rec.transcript?.segments?.length ? [{ key: 'transcript', icon: rec.transcript.source === 'ai' ? 'mic' : 'transcript', label: rec.transcript.source === 'ai' ? 'Transcripción (IA)' : 'Transcripción' }] : []),
    ];
    current = { rec, sel: items[0]?.key || '' };
    const d = $('detail');
    d.innerHTML = `<div class="panel" role="dialog" aria-label="${esc(rec.title || '')}">
      <div class="d-head">
        <img src="${thumb(rec.videoId)}" alt="" referrerpolicy="no-referrer">
        <div class="d-info">
          <h2>${esc(rec.title || rec.videoId)}</h2>
          <div class="vmeta">${esc([rec.author, rec.lengthSeconds ? U.formatTime(rec.lengthSeconds) : '', `guardado el ${fmtDate(rec.createdAt || rec.updatedAt)}`].filter(Boolean).join(' · '))}</div>
          <div class="tags" id="tags"></div>
          <div class="d-actions">
            <a class="btn" href="${ytUrl(rec.videoId)}" target="_blank" rel="noopener">${I('youtube')}Abrir en YouTube</a>
            <button class="btn toggle" id="dFav" aria-pressed="${!!rec.favorite}">${I('star')}${rec.favorite ? 'Favorito' : 'Marcar favorito'}</button>
            <button class="btn" id="dExport">${I('download')}Exportar .md</button>
            <button class="btn danger" id="dDelete">${I('trash')}Borrar</button>
          </div>
        </div>
        <button class="close" id="dClose" title="Cerrar (Esc)">${I('close')}</button>
      </div>
      <div class="d-body">
        <nav class="d-nav">${items.map((it) => `<button data-sel="${esc(it.key)}">${I(it.icon)}<span>${esc(it.label)}</span>${it.small ? `<small>${esc(it.small)}</small>` : ''}</button>`).join('') || '<span class="vmeta">Sin contenido</span>'}</nav>
        <div class="d-view" id="dView"></div>
      </div>
    </div>`;
    d.hidden = false;
    document.body.style.overflow = 'hidden';
    renderTags();
    showItem(current.sel);
    history.replaceState(null, '', `#v=${rec.videoId}`);
  }

  function closeDetail() {
    $('detail').hidden = true;
    $('detail').innerHTML = '';
    document.body.style.overflow = '';
    current = null;
    history.replaceState(null, '', location.pathname);
    render();
  }

  function renderTags() {
    const { rec } = current;
    $('tags').innerHTML = `${(rec.tags || []).map((t) => `<span class="chip tag">#${esc(t)} <button data-untag="${esc(t)}" title="Quitar etiqueta">×</button></span>`).join('')}
      <input id="tagInput" placeholder="+ Agregar etiqueta" maxlength="40">`;
  }

  async function saveMeta(meta) {
    const { rec } = current;
    const saved = await H.applyPatch(rec.videoId, { meta });
    if (saved) Object.assign(rec, { favorite: saved.favorite, tags: saved.tags });
  }

  /** Dibuja un resultado guardado con las mismas vistas que el panel de YouTube. */
  function showItem(key) {
    if (!current) return;
    current.sel = key;
    document.querySelectorAll('.d-nav [data-sel]').forEach((b) => b.classList.toggle('on', b.dataset.sel === key));
    const view = $('dView');
    view.innerHTML = '';
    if (!key) return;
    const host = document.createElement('div');
    host.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (accent) { host.setAttribute('data-accent', ''); host.style.setProperty('--sn-user-accent', accent); }
    view.appendChild(host);
    const sh = host.attachShadow({ mode: 'open' });
    sh.innerHTML = `<style>${SN.styles}
      :host { margin: 0; background: transparent; }
      .lib { padding: 4px 18px 10px; }
      .lib .sn-chat-log, .lib .sn-segments { max-height: none; }
      .lib .mm-view { max-height: 70vh; }
    </style><div class="lib"></div>`;
    const wrap = sh.querySelector('.lib');
    const { rec } = current;
    const seek = (t) => openAt(rec.videoId, t);
    wrap.addEventListener('click', (e) => {
      const ts = e.target.closest('a.sn-ts');
      if (ts) { e.preventDefault(); seek(Number(ts.dataset.t)); return; }
      const cc = e.target.closest('.sn-copy-code');
      if (cc) U.copyText(cc.parentElement.querySelector('code').textContent).then(() => toast('Copiado'));
    });
    const video = { videoId: rec.videoId, title: rec.title, author: rec.author, lengthSeconds: rec.lengthSeconds, url: ytUrl(rec.videoId) };

    if (key === 'chat') {
      wrap.innerHTML = `<div class="sn-chat-log">${rec.chat.map((m) => (m.role === 'user'
        ? `<div class="sn-msg user">${esc(m.content)}</div>` : `<div class="sn-msg assistant md">${MD.render(m.content)}</div>`)).join('')}</div>`;
      return;
    }
    if (key === 'transcript') {
      SN.surfaces.transcript(wrap, { segments: rec.transcript.segments, seek, autoScroll: false });
      return;
    }
    const r = rec.results[key.slice(2)];
    if (!r) return;
    if (SN.views.has(r.id)) {
      rec.viewStates = rec.viewStates || {};
      const state = (rec.viewStates[r.id] = rec.viewStates[r.id] || {});
      const out = SN.views.render(wrap, r.id, r.text, { video, state, toast, accent: accent || '#6d4aff' });
      if (out.ok) {
        // El progreso (tarjetas sabidas, respuestas, pasos) también se guarda desde aquí.
        let timer = null;
        const persist = () => { clearTimeout(timer); timer = setTimeout(() => H.update(rec.videoId, (x) => { x.viewStates = { ...x.viewStates, [r.id]: JSON.parse(JSON.stringify(state)) }; }), 500); };
        wrap.addEventListener('click', persist);
        wrap.addEventListener('keyup', persist);
        return;
      }
    }
    if (r.view === 'mindmap' || r.id === 'mindmap') {
      const tree = SN.mindmap.parse(r.text, rec.title);
      if (tree) {
        if (accent) tree.color = accent;
        SN.mindmap.mount(wrap, tree, { dark, title: rec.title, onSeek: seek, onError: toast });
        return;
      }
    }
    wrap.innerHTML = `<div class="vw md">${MD.render(r.text)}</div>`;
  }

  /* ---------- exportar e importar ---------- */

  const demote = (md) => String(md || '').replace(/^(#{1,4})(\s)/gm, '$1##$2');

  function videoMarkdown(r) {
    const lines = [`## ${r.title || r.videoId}`, '', `[Ver en YouTube](${ytUrl(r.videoId)})${r.author ? ` · ${r.author}` : ''} · ${fmtDate(r.updatedAt || r.createdAt)}`];
    if (r.tags?.length) lines.push('', `Etiquetas: ${r.tags.map((t) => `#${t}`).join(' ')}`);
    for (const x of Object.values(r.results || {})) lines.push('', `### ${x.label}`, '', demote(resultText(x)));
    if (r.chat?.length) {
      lines.push('', '### Chat', '');
      r.chat.forEach((m) => lines.push(m.role === 'user' ? `**Tú:** ${m.content}` : `**IA:** ${demote(m.content)}`, ''));
    }
    return lines.join('\n');
  }

  function exportMarkdown(list) {
    const date = new Date().toISOString().slice(0, 10);
    const md = [`# Biblioteca de Subme Now`, '', `Exportada el ${fmtDate(Date.now())} · ${list.length} videos`, '', ...list.map((r) => `${videoMarkdown(r)}\n\n---\n`)].join('\n');
    U.downloadText(`Subme Now - biblioteca ${date}.md`, md, 'text/markdown');
  }

  async function exportJson() {
    const date = new Date().toISOString().slice(0, 10);
    const data = { app: 'Subme Now', format: 1, exportedAt: new Date().toISOString(), videos: await H.all(), deck: await H.deckAll() };
    U.downloadText(`Subme Now - respaldo ${date}.json`, JSON.stringify(data, null, 2), 'application/json');
  }

  async function importJson(file) {
    try {
      const data = JSON.parse(await file.text());
      const videos = Array.isArray(data) ? data : data.videos;
      if (!Array.isArray(videos)) throw new Error('El archivo no es un respaldo de Subme Now.');
      const n = await H.importRecords(videos);
      for (const e of Array.isArray(data.deck) ? data.deck : []) if (e && typeof e.key === 'string') await H.deckPut(e);
      toast(`${n} ${n === 1 ? 'video importado' : 'videos importados'}`);
      await load();
    } catch (e) {
      toast(`No se pudo importar: ${e.message}`);
    }
  }

  /* ---------- repaso de tarjetas (todas las flashcards guardadas) ---------- */

  async function collectCards() {
    const deck = new Map((await H.deckAll()).map((e) => [e.key, e]));
    const cards = [];
    for (const r of records) {
      const x = r.results?.flashcards;
      if (!x) continue;
      const data = SN.views.parse(x.text);
      for (const c of Array.isArray(data?.cards) ? data.cards : []) {
        if (!c?.front || !c?.back) continue;
        const key = `${r.videoId}|${String(c.front).slice(0, 160)}`;
        cards.push({ key, front: String(c.front), back: String(c.back), t: c.t ? U.parseTime(String(c.t)) : null, rec: r, entry: deck.get(key) || null });
      }
    }
    return cards;
  }

  const isDue = (c, now = Date.now()) => !c.entry || (c.entry.due || 0) <= now;

  async function updateReviewButton() {
    const cards = await collectCards();
    const due = cards.filter((c) => isDue(c)).length;
    const btn = $('reviewBtn');
    btn.innerHTML = `${I('flashcards')}Repasar tarjetas${cards.length ? ` <b>${due}</b>` : ''}`;
    btn.disabled = !cards.length;
    btn.title = cards.length ? `${due} para repasar hoy de ${cards.length} tarjetas de ${new Set(cards.map((c) => c.rec.videoId)).size} videos` : 'Genera flashcards en algún video para repasarlas aquí';
  }

  let session = null;

  async function openReview(all = false) {
    const cards = await collectCards();
    const now = Date.now();
    let queue = all ? cards : cards.filter((c) => isDue(c, now));
    queue = queue.sort((a, b) => (a.entry?.due || 0) - (b.entry?.due || 0) || Math.random() - 0.5);
    session = { queue, i: 0, flipped: false, total: cards.length, done: 0 };
    $('review').hidden = false;
    document.body.style.overflow = 'hidden';
    drawReview();
  }

  function closeReview() {
    $('review').hidden = true;
    $('review').innerHTML = '';
    document.body.style.overflow = current ? 'hidden' : '';
    session = null;
    updateReviewButton();
  }

  function drawReview() {
    const s = session;
    const el = $('review');
    const head = (title, progress) => `<div class="rv-head"><b>${title}</b><span class="rv-progress">${progress}</span><button class="close" data-rv="close" title="Cerrar (Esc)">${I('close')}</button></div>`;
    if (s.i >= s.queue.length) {
      el.innerHTML = `<div class="rv">${head('Repaso de tarjetas', '')}<div class="rv-done"><span class="empty"><span class="big">${I('check')}</span></span>
        <b>${s.done ? '¡Repaso terminado!' : '¡Estás al día!'}</b><p class="vmeta">${s.done ? `Repasaste ${s.done} ${s.done === 1 ? 'tarjeta' : 'tarjetas'}. ` : ''}Las tarjetas vuelven a aparecer cuando toca repasarlas.</p>
        <button class="btn" data-rv="all">${I('refresh')}Repasar todas igualmente</button></div></div>`;
      return;
    }
    const c = s.queue[s.i];
    el.innerHTML = `<div class="rv" role="dialog" aria-label="Repaso de tarjetas">
      ${head('Repaso de tarjetas', `${s.i + 1} de ${s.queue.length}`)}
      <div class="rv-card${s.flipped ? ' flipped' : ''}" data-rv="flip" title="Clic o barra espaciadora para dar vuelta">
        <div class="rv-inner"><div class="rv-face front">${esc(c.front)}<small>Clic para ver la respuesta</small></div><div class="rv-face back"><small class="rv-q">${esc(c.front)}</small>${esc(c.back)}</div></div>
      </div>
      <div class="rv-src"><span>${I('youtube')} ${esc(c.rec.title || '')}</span>${c.t != null ? `<a class="ts" href="${ytUrl(c.rec.videoId, c.t)}" target="_blank" rel="noopener">${I('play')}${U.formatTime(c.t)}</a>` : ''}</div>
      <div class="rv-grades"${s.flipped ? '' : ' hidden'}>
        <button class="btn" data-grade="again">Otra vez<small>1 · en 10 min</small></button>
        <button class="btn" data-grade="hard">Difícil<small>2 · mañana</small></button>
        <button class="btn primary" data-grade="good">La sabía<small>3 · en ${INTERVALS[Math.min(c.entry?.box || 0, INTERVALS.length - 1)]} ${INTERVALS[Math.min(c.entry?.box || 0, INTERVALS.length - 1)] === 1 ? 'día' : 'días'}</small></button>
      </div>
    </div>`;
  }

  async function grade(g) {
    const s = session;
    const c = s?.queue[s.i];
    if (!c || !s.flipped) return;
    const now = Date.now();
    const box = c.entry?.box || 0;
    let entry;
    if (g === 'again') entry = { box: 0, due: now + 10 * 60000 };
    else if (g === 'hard') entry = { box: Math.max(0, box - 1), due: now + DAY };
    else entry = { box: box + 1, due: now + INTERVALS[Math.min(box, INTERVALS.length - 1)] * DAY };
    c.entry = { key: c.key, videoId: c.rec.videoId, ...entry, reviewedAt: now };
    await H.deckPut(c.entry);
    if (g === 'again') s.queue.push(c); // vuelve al final de esta sesión
    s.done++;
    s.i++;
    s.flipped = false;
    drawReview();
  }

  /* ---------- eventos ---------- */

  let searchTimer = null;
  $('q').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { filters.q = $('q').value; render(); }, 180); });
  [['fChannel', 'channel'], ['fType', 'type'], ['fDate', 'days'], ['fTag', 'tag']].forEach(([id, k]) => $(id).addEventListener('change', () => { filters[k] = $(id).value; render(); }));
  $('fFav').addEventListener('click', () => { filters.fav = !filters.fav; $('fFav').setAttribute('aria-pressed', String(filters.fav)); render(); });

  $('main').addEventListener('click', async (e) => {
    const fav = e.target.closest('[data-fav]');
    if (fav) {
      e.stopPropagation();
      const rec = records.find((r) => r.videoId === fav.dataset.fav);
      if (!rec) return;
      const saved = await H.applyPatch(rec.videoId, { meta: { favorite: !rec.favorite } });
      rec.favorite = !!saved?.favorite;
      render();
      return;
    }
    if (e.target.closest('a')) return;
    const open = e.target.closest('[data-open]');
    if (open) openDetail(open.dataset.open);
  });

  $('detail').addEventListener('click', async (e) => {
    if (e.target === $('detail') || e.target.closest('#dClose')) { closeDetail(); return; }
    const sel = e.target.closest('[data-sel]');
    if (sel) { showItem(sel.dataset.sel); return; }
    const untag = e.target.closest('[data-untag]');
    if (untag) { await saveMeta({ tags: current.rec.tags.filter((t) => t !== untag.dataset.untag) }); renderTags(); renderFilterOptions(); return; }
    if (e.target.closest('#dFav')) {
      await saveMeta({ favorite: !current.rec.favorite });
      const b = $('dFav');
      b.setAttribute('aria-pressed', String(!!current.rec.favorite));
      b.innerHTML = `${I('star')}${current.rec.favorite ? 'Favorito' : 'Marcar favorito'}`;
      return;
    }
    if (e.target.closest('#dExport')) {
      const r = current.rec;
      U.downloadText(`${U.safeFilename(r.title)}.md`, `# ${r.title || r.videoId}\n\n${videoMarkdown(r).split('\n').slice(2).join('\n')}`, 'text/markdown');
      return;
    }
    if (e.target.closest('#dDelete')) {
      if (!confirm('¿Borrar este video y todo lo guardado de él? No se puede deshacer.')) return;
      await H.remove(current.rec.videoId);
      records = records.filter((r) => r !== current.rec);
      closeDetail();
      load();
    }
  });

  $('detail').addEventListener('keydown', async (e) => {
    if (e.target.id !== 'tagInput' || e.key !== 'Enter') return;
    const t = e.target.value.trim().replace(/^#/, '');
    if (!t) return;
    await saveMeta({ tags: [...(current.rec.tags || []), t] });
    renderTags();
    renderFilterOptions();
    $('tagInput').focus();
  });

  $('review').addEventListener('click', (e) => {
    if (e.target === $('review') || e.target.closest('[data-rv="close"]')) { closeReview(); return; }
    if (e.target.closest('[data-rv="all"]')) { openReview(true); return; }
    if (e.target.closest('a')) return;
    const g = e.target.closest('[data-grade]');
    if (g) { grade(g.dataset.grade); return; }
    if (e.target.closest('[data-rv="flip"]')) { session.flipped = !session.flipped; drawReview(); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('review').hidden) closeReview();
      else if (!$('detail').hidden) closeDetail();
      return;
    }
    if (!session || $('review').hidden || e.target.matches('input, textarea, select')) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); session.flipped = !session.flipped; drawReview(); }
    if (session.flipped && ['1', '2', '3'].includes(e.key)) grade({ 1: 'again', 2: 'hard', 3: 'good' }[e.key]);
  });

  $('reviewBtn').addEventListener('click', () => openReview(false));
  $('exportBtn').addEventListener('click', (e) => { e.stopPropagation(); $('exportMenu').hidden = !$('exportMenu').hidden; });
  document.addEventListener('click', () => { $('exportMenu').hidden = true; });
  $('exportMenu').addEventListener('click', (e) => {
    const k = e.target.closest('[data-export]')?.dataset.export;
    if (k === 'md') exportMarkdown(filtered().length && (filters.channel || filters.type || filters.days || filters.tag || filters.fav) ? filtered() : records);
    if (k === 'json') exportJson();
    if (k === 'import') $('importFile').click();
  });
  $('importFile').addEventListener('change', () => { const f = $('importFile').files[0]; if (f) importJson(f); $('importFile').value = ''; });

  /* ---------- ajustes del historial ---------- */

  $('settingsBtn').addEventListener('click', () => { $('settings').hidden = !$('settings').hidden; });
  $('historyEnabled').checked = settings.historyEnabled !== false;
  $('historyDays').value = String(settings.historyDays || 0);
  async function saveSetting(patch) {
    const s = await SubmeSettings.getSettings();
    Object.assign(s, patch);
    await SubmeSettings.saveSettings(s);
    settings = s;
    toast('Guardado');
  }
  $('historyEnabled').addEventListener('change', () => saveSetting({ historyEnabled: $('historyEnabled').checked }).then(load));
  $('historyDays').addEventListener('change', async () => {
    const days = Number($('historyDays').value) || 0;
    await saveSetting({ historyDays: days });
    const n = await H.prune(days);
    if (n) toast(`${n} ${n === 1 ? 'video borrado' : 'videos borrados'} por antigüedad`);
    load();
  });
  $('clearAll').addEventListener('click', async () => {
    if (!confirm('¿Borrar todo el historial y el progreso de repaso? No se puede deshacer.')) return;
    await H.clear();
    toast('Historial borrado');
    load();
  });

  // Al volver a esta pestaña, mostrar lo nuevo que se haya guardado desde YouTube.
  document.addEventListener('visibilitychange', () => { if (!document.hidden && $('detail').hidden && $('review').hidden) load(); });

  await load();
  const m = /^#v=([\w-]{6,20})$/.exec(location.hash);
  if (m) openDetail(m[1]);
})();
