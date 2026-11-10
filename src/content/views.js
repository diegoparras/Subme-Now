/* Subme Now — vistas gráficas de los resultados de IA.
 * La IA devuelve JSON para estas acciones y aquí se dibujan como componentes interactivos.
 * Cada vista es autónoma (maneja sus propios eventos dentro de su contenedor), así que funciona
 * igual en el panel, en una ventana flotante o en una ventana aparte del navegador.
 * Las marcas de tiempo se dibujan como <a class="sn-ts" data-t="…">; quien aloja la vista las conecta al video.
 */
(function () {
  const SN = (globalThis.SubmeNow = globalThis.SubmeNow || {});
  const I = (n, c) => SubmeIcons.icon(n, c);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PALETTE = ['#6d4aff', '#e8467c', '#0e9f8e', '#e08a00', '#2f7de1', '#a052e8', '#d9480f', '#1f9d55'];

  const toSec = (t) => {
    if (t == null || t === '') return null;
    if (typeof t === 'number') return t;
    const m = String(t).match(/(\d{1,2}:)?\d{1,2}:\d{2}/);
    return m ? m[0].split(':').map(Number).reduce((a, b) => a * 60 + b, 0) : null;
  };
  const fmt = (sec) => {
    const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = String(Math.floor(sec % 60)).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${String(m).padStart(2, '0')}:${s}`;
  };
  const chip = (t) => { const s = toSec(t); return s == null ? '' : `<a class="sn-ts" data-t="${s}" href="#">${fmt(s)}</a>`; };
  const mdTs = (t) => { const s = toSec(t); return s == null ? '' : ` [${fmt(s)}]`; };
  const arr = (x) => (Array.isArray(x) ? x : []);

  /** Extrae el objeto JSON de la respuesta (tolera bloques de código y texto alrededor). */
  function parse(text) {
    if (!text) return null;
    let s = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a < 0 || b <= a) return null;
    s = s.slice(a, b + 1);
    try { return JSON.parse(s); } catch { /* intentar sin comas finales */ }
    try { return JSON.parse(s.replace(/,\s*([}\]])/g, '$1')); } catch { return null; }
  }

  const copy = async (text, toast) => { await SubmeUtils.copyText(text); toast?.('Copiado'); };

  /* ---------------- vistas ---------------- */
  const V = {};

  V.summary = {
    valid: (d) => d && (d.tldr || arr(d.sections).length),
    md: (d) => [
      d.tldr ? `**TL;DR:** ${d.tldr}` : '',
      ...arr(d.sections).map((s) => `## ${s.title}\n\n${s.text}`),
      arr(d.keyIdeas).length ? `## Ideas principales\n\n${arr(d.keyIdeas).map((k) => `- ${k.text}${mdTs(k.t)}`).join('\n')}` : '',
      d.conclusion ? `## Conclusión\n\n${d.conclusion}` : '',
    ].filter(Boolean).join('\n\n'),
    render(el, d) {
      el.innerHTML = `
        ${d.tldr ? `<div class="vw-hero"><span class="vw-kicker">${I('sparkles')}TL;DR</span><p>${esc(d.tldr)}</p></div>` : ''}
        ${arr(d.sections).map((s, i) => `<details class="vw-section" ${i < 2 ? 'open' : ''}><summary>${esc(s.title)}${I('chevronDown', 'vw-caret')}</summary><p>${esc(s.text)}</p></details>`).join('')}
        ${arr(d.keyIdeas).length ? `<div class="vw-h">${I('target')}Ideas principales</div><ol class="vw-ideas">${arr(d.keyIdeas).map((k) => `<li><span>${esc(k.text)}</span>${chip(k.t)}</li>`).join('')}</ol>` : ''}
        ${d.conclusion ? `<div class="vw-callout">${I('flag')}<div><b>Conclusión</b><p>${esc(d.conclusion)}</p></div></div>` : ''}`;
    },
  };

  V.keypoints = {
    valid: (d) => arr(d?.points).length,
    md: (d) => arr(d.points).map((p, i) => `${i + 1}. **${p.title}**${mdTs(p.t)} — ${p.detail}`).join('\n'),
    render(el, d) {
      el.innerHTML = `<div class="vw-cards">${arr(d.points).map((p, i) => `
        <div class="vw-card" style="--c:${PALETTE[i % PALETTE.length]}">
          <span class="vw-num">${i + 1}</span>
          <div><div class="vw-card-title">${esc(p.title)} ${chip(p.t)}</div><p>${esc(p.detail)}</p></div>
        </div>`).join('')}</div>`;
    },
  };

  V.chapters = {
    valid: (d) => arr(d?.chapters).length,
    md: (d) => `${arr(d.chapters).map((c) => `- [${fmt(toSec(c.t) || 0)}] **${c.title}** — ${c.summary || ''}`).join('\n')}\n\n\`\`\`\n${arr(d.chapters).map((c) => `${fmt(toSec(c.t) || 0)} ${c.title}`).join('\n')}\n\`\`\``,
    render(el, d, ctx) {
      const ch = arr(d.chapters).map((c) => ({ ...c, s: toSec(c.t) || 0 })).sort((a, b) => a.s - b.s);
      const total = Math.max(Number(ctx.video?.lengthSeconds) || 0, (ch.at(-1)?.s || 0) + 30);
      el.innerHTML = `
        <div class="vw-timeline">${ch.map((c, i) => {
          const end = ch[i + 1]?.s ?? total;
          return `<a class="sn-ts vw-seg" data-t="${c.s}" href="#" data-i="${i}" title="${esc(fmt(c.s))} · ${esc(c.title)}" style="flex:${Math.max(1, end - c.s)};--c:${PALETTE[i % PALETTE.length]}"></a>`;
        }).join('')}</div>
        <div class="vw-timeline-scale"><span>00:00</span><span>${fmt(total)}</span></div>
        <ol class="vw-chapters">${ch.map((c, i) => `
          <li data-i="${i}" style="--c:${PALETTE[i % PALETTE.length]}">
            <a class="sn-ts vw-ch-time" data-t="${c.s}" href="#">${fmt(c.s)}</a>
            <div><b>${esc(c.title)}</b>${c.summary ? `<p>${esc(c.summary)}</p>` : ''}</div>
          </li>`).join('')}</ol>
        <button class="sn-btn vw-copy-yt">${I('copy')}Copiar para la descripción de YouTube</button>`;
      el.querySelector('.vw-copy-yt').addEventListener('click', () => copy(ch.map((c) => `${fmt(c.s)} ${c.title}`).join('\n'), ctx.toast));
      let last = -1;
      return {
        onTime(t) {
          let idx = -1;
          ch.forEach((c, i) => { if (c.s <= t + 0.5) idx = i; });
          if (idx === last) return;
          last = idx;
          el.querySelectorAll('[data-i]').forEach((n) => n.classList.toggle('on', Number(n.dataset.i) === idx));
        },
      };
    },
  };

  V.quiz = {
    valid: (d) => arr(d?.questions).filter((q) => arr(q.options).length >= 2).length,
    md: (d) => `${arr(d.questions).map((q, i) => `${i + 1}. **${q.q}**\n${arr(q.options).map((o, j) => `   ${'ABCD'[j]}) ${o}`).join('\n')}`).join('\n\n')}\n\n## Respuestas\n\n${arr(d.questions).map((q, i) => `${i + 1}. **${'ABCD'[q.answer] || '?'}** — ${q.explanation || ''}${mdTs(q.t)}`).join('\n')}`,
    render(el, d, ctx) {
      const qs = arr(d.questions).filter((q) => arr(q.options).length >= 2);
      const st = ctx.state;
      st.i = st.i || 0;
      st.answers = st.answers || [];
      const draw = () => {
        if (st.i >= qs.length) {
          const ok = qs.filter((q, i) => st.answers[i] === Number(q.answer)).length;
          const pct = Math.round((ok / qs.length) * 100);
          const r = 34; const c = 2 * Math.PI * r;
          el.innerHTML = `<div class="vw-score">
              <svg viewBox="0 0 80 80" width="110" height="110"><circle cx="40" cy="40" r="${r}" class="vw-ring-bg"/><circle cx="40" cy="40" r="${r}" class="vw-ring" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - ok / qs.length)}"/></svg>
              <div class="vw-score-num">${ok}/${qs.length}</div>
              <p>${pct >= 80 ? '¡Excelente! Dominas el contenido.' : pct >= 50 ? 'Buen trabajo. Repasa las que fallaste.' : 'Vale la pena repasar el video.'}</p>
            </div>
            <ol class="vw-review">${qs.map((q, i) => { const good = st.answers[i] === Number(q.answer); return `<li class="${good ? 'ok' : 'bad'}">${I(good ? 'check' : 'close')}<span>${esc(q.q)}</span>${chip(q.t)}</li>`; }).join('')}</ol>
            <button class="sn-btn primary vw-retry">${I('refresh')}Reintentar</button>`;
          el.querySelector('.vw-retry').addEventListener('click', () => { st.i = 0; st.answers = []; draw(); });
          return;
        }
        const q = qs[st.i];
        const chosen = st.answers[st.i];
        const answered = chosen != null;
        el.innerHTML = `
          <div class="vw-progress"><span style="width:${(st.i / qs.length) * 100}%"></span></div>
          <div class="vw-q-meta">Pregunta ${st.i + 1} de ${qs.length}</div>
          <div class="vw-q">${esc(q.q)}</div>
          <div class="vw-options">${arr(q.options).map((o, j) => {
            const cls = !answered ? '' : j === Number(q.answer) ? 'ok' : j === chosen ? 'bad' : 'dim';
            return `<button class="vw-option ${cls}" data-j="${j}" ${answered ? 'disabled' : ''}><span class="vw-letter">${'ABCDEF'[j]}</span><span>${esc(o)}</span>${cls === 'ok' ? I('check') : cls === 'bad' ? I('close') : ''}</button>`;
          }).join('')}</div>
          ${answered ? `<div class="vw-explain ${chosen === Number(q.answer) ? 'ok' : 'bad'}"><b>${chosen === Number(q.answer) ? '¡Correcto!' : 'Incorrecto'}</b> ${esc(q.explanation || '')} ${chip(q.t)}</div>
            <button class="sn-btn primary vw-next">${st.i + 1 < qs.length ? 'Siguiente' : 'Ver resultado'}</button>` : ''}`;
        el.querySelectorAll('.vw-option').forEach((b) => b.addEventListener('click', () => { st.answers[st.i] = Number(b.dataset.j); draw(); }));
        el.querySelector('.vw-next')?.addEventListener('click', () => { st.i++; draw(); });
      };
      draw();
    },
  };

  V.flashcards = {
    valid: (d) => arr(d?.cards).length,
    md: (d) => `${arr(d.cards).map((c) => `**P:** ${c.front}\n**R:** ${c.back}${mdTs(c.t)}`).join('\n\n')}\n\n\`\`\`csv\n${arr(d.cards).map((c) => `${String(c.front).replace(/;/g, ',')};${String(c.back).replace(/;/g, ',')}`).join('\n')}\n\`\`\``,
    render(el, d, ctx) {
      const cards = arr(d.cards);
      const st = ctx.state;
      st.order = st.order || cards.map((_, i) => i);
      st.i = st.i || 0;
      st.known = st.known || [];
      const draw = () => {
        const known = new Set(st.known);
        if (st.i >= st.order.length) {
          const pending = cards.map((_, i) => i).filter((i) => !known.has(i));
          el.innerHTML = `<div class="vw-score"><div class="vw-score-num">${known.size}/${cards.length}</div><p>tarjetas que ya sabes</p></div>
            <div class="vw-row">${pending.length ? `<button class="sn-btn primary vw-review-bad">${I('refresh')}Repasar las ${pending.length} pendientes</button>` : ''}<button class="sn-btn vw-restart">Empezar de nuevo</button></div>`;
          el.querySelector('.vw-review-bad')?.addEventListener('click', () => { st.order = pending; st.i = 0; draw(); });
          el.querySelector('.vw-restart').addEventListener('click', () => { st.order = cards.map((_, i) => i); st.i = 0; st.known = []; draw(); });
          return;
        }
        const idx = st.order[st.i];
        const c = cards[idx];
        el.innerHTML = `
          <div class="vw-progress"><span style="width:${(st.i / st.order.length) * 100}%"></span></div>
          <div class="vw-q-meta">Tarjeta ${st.i + 1} de ${st.order.length} · ${known.size} sabidas</div>
          <div class="vw-flip" tabindex="0" title="Clic para dar vuelta">
            <div class="vw-flip-inner">
              <div class="vw-face front"><span class="vw-face-label">Pregunta</span><div>${esc(c.front)}</div><span class="vw-hint">Clic para ver la respuesta</span></div>
              <div class="vw-face back"><span class="vw-face-label">Respuesta</span><div>${esc(c.back)}</div>${chip(c.t)}</div>
            </div>
          </div>
          <div class="vw-row vw-fc-actions">
            <button class="sn-icon-btn vw-prev" title="Anterior" ${st.i === 0 ? 'disabled' : ''}>${I('chevronDown', 'rot90')}</button>
            <button class="sn-btn vw-again">${I('refresh')}Repasar</button>
            <button class="sn-btn primary vw-know">${I('check')}La sé</button>
            <button class="sn-icon-btn vw-skip" title="Siguiente">${I('chevronDown', 'rot-90')}</button>
          </div>
          <div class="vw-row vw-fc-tools">
            <button class="sn-link vw-shuffle">${I('refresh')}Mezclar</button>
            <button class="sn-link vw-anki">${I('download')}Exportar a Anki (CSV)</button>
          </div>`;
        const flip = el.querySelector('.vw-flip');
        flip.addEventListener('click', (e) => { if (!e.target.closest('.sn-ts')) flip.classList.toggle('flipped'); });
        flip.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip.classList.toggle('flipped'); } });
        el.querySelector('.vw-prev').addEventListener('click', () => { st.i = Math.max(0, st.i - 1); draw(); });
        el.querySelector('.vw-skip').addEventListener('click', () => { st.i++; draw(); });
        el.querySelector('.vw-again').addEventListener('click', () => { st.known = st.known.filter((k) => k !== idx); st.i++; draw(); });
        el.querySelector('.vw-know').addEventListener('click', () => { if (!known.has(idx)) st.known.push(idx); st.i++; draw(); });
        el.querySelector('.vw-shuffle').addEventListener('click', () => {
          st.order = [...st.order].sort(() => Math.random() - 0.5);
          st.i = 0;
          draw();
        });
        el.querySelector('.vw-anki').addEventListener('click', () => {
          const csv = cards.map((x) => `${String(x.front).replace(/;/g, ',')};${String(x.back).replace(/;/g, ',')}`).join('\n');
          SubmeUtils.downloadText(`${SubmeUtils.safeFilename(ctx.video?.title)} - flashcards.csv`, csv, 'text/csv');
        });
      };
      draw();
    },
  };

  V.quotes = {
    valid: (d) => arr(d?.quotes).length,
    md: (d) => arr(d.quotes).map((q) => `> "${q.text}"${mdTs(q.t)}\n\n${q.why || ''}`).join('\n\n'),
    render(el, d, ctx) {
      el.innerHTML = `<div class="vw-quotes">${arr(d.quotes).map((q, i) => `
        <figure class="vw-quote" style="--c:${PALETTE[i % PALETTE.length]}">
          <span class="vw-qmark">“</span>
          <blockquote>${esc(q.text)}</blockquote>
          <figcaption>${chip(q.t)} <span>${esc(q.why || '')}</span></figcaption>
          <div class="vw-row vw-quote-tools">
            <button class="sn-link" data-copy="${i}">${I('copy')}Copiar</button>
            <button class="sn-link" data-img="${i}">${I('image')}Imagen para redes</button>
          </div>
        </figure>`).join('')}</div>`;
      el.addEventListener('click', (e) => {
        const c = e.target.closest('[data-copy]');
        if (c) { const q = d.quotes[c.dataset.copy]; copy(`"${q.text}" — ${ctx.video?.author || ''}`, ctx.toast); }
        const im = e.target.closest('[data-img]');
        if (im) quoteImage(d.quotes[im.dataset.img], ctx);
      });
    },
  };

  /** Genera una imagen 1080×1080 con la cita, lista para compartir. */
  function quoteImage(q, ctx) {
    const W = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = W;
    const g = canvas.getContext('2d');
    const accent = ctx.accent || '#6d4aff';
    const grad = g.createLinearGradient(0, 0, W, W);
    grad.addColorStop(0, accent); grad.addColorStop(1, '#1b1530');
    g.fillStyle = grad; g.fillRect(0, 0, W, W);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.font = 'bold 300px Georgia, serif'; g.fillText('“', 70, 330);
    g.fillStyle = '#fff';
    let size = 64;
    const wrap = () => {
      g.font = `600 ${size}px "Segoe UI", Roboto, sans-serif`;
      const words = String(q.text).split(/\s+/); const lines = []; let cur = '';
      for (const w of words) { const n = cur ? `${cur} ${w}` : w; if (g.measureText(n).width > W - 200 && cur) { lines.push(cur); cur = w; } else cur = n; }
      if (cur) lines.push(cur);
      return lines;
    };
    let lines = wrap();
    while (lines.length * size * 1.3 > 560 && size > 34) { size -= 4; lines = wrap(); }
    const top = 330 + (560 - lines.length * size * 1.3) / 2;
    lines.forEach((l, i) => g.fillText(l, 100, top + i * size * 1.3));
    g.font = '500 34px "Segoe UI", Roboto, sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)';
    const src = `— ${ctx.video?.author || ''}${q.t ? ` · ${fmt(toSec(q.t) || 0)}` : ''}`;
    g.fillText(src, 100, 960);
    g.font = '500 26px "Segoe UI", Roboto, sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)';
    g.fillText((ctx.video?.title || '').slice(0, 70), 100, 1010);
    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        ctx.toast?.('Imagen copiada: pégala en tu red social');
      } catch {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'cita.png'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        ctx.toast?.('Imagen descargada');
      }
    }, 'image/png');
  }

  V.steps = {
    valid: (d) => arr(d?.steps).length,
    md: (d) => [
      arr(d.requirements).length ? `## Antes de empezar\n\n${arr(d.requirements).map((r) => `- ${r}`).join('\n')}` : '',
      `## ${/tutorial/i.test(d.kind) ? 'Pasos' : 'Acciones'}\n\n${arr(d.steps).map((s) => `- [ ] **${s.title}**${mdTs(s.t)} — ${s.detail || ''}`).join('\n')}`,
      arr(d.warnings).length ? `## Atención\n\n${arr(d.warnings).map((w) => `- ${w}`).join('\n')}` : '',
    ].filter(Boolean).join('\n\n'),
    render(el, d, ctx) {
      const st = ctx.state;
      st.done = st.done || [];
      const steps = arr(d.steps);
      const draw = () => {
        const done = new Set(st.done);
        el.innerHTML = `
          <div class="vw-row vw-steps-head"><span class="vw-badge">${esc(/tutorial/i.test(d.kind) ? 'Tutorial paso a paso' : 'Acciones recomendadas')}</span><span class="vw-q-meta">${done.size} de ${steps.length} completados</span></div>
          <div class="vw-progress"><span style="width:${(done.size / Math.max(1, steps.length)) * 100}%"></span></div>
          ${arr(d.requirements).length ? `<div class="vw-h">${I('briefcase')}Antes de empezar</div><div class="vw-chips">${arr(d.requirements).map((r) => `<span>${esc(r)}</span>`).join('')}</div>` : ''}
          <ol class="vw-steps">${steps.map((s, i) => `
            <li class="${done.has(i) ? 'done' : ''}">
              <button class="vw-check" data-i="${i}" aria-label="Marcar como hecho">${done.has(i) ? I('check') : `<span>${i + 1}</span>`}</button>
              <div><b>${esc(s.title)}</b> ${chip(s.t)}${s.detail ? `<p>${esc(s.detail)}</p>` : ''}</div>
            </li>`).join('')}</ol>
          ${arr(d.warnings).length ? `<div class="vw-callout warn">${I('alert')}<div><b>Atención</b><ul>${arr(d.warnings).map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div></div>` : ''}`;
        el.querySelectorAll('.vw-check').forEach((b) => b.addEventListener('click', () => {
          const i = Number(b.dataset.i);
          st.done = done.has(i) ? st.done.filter((x) => x !== i) : [...st.done, i];
          draw();
        }));
      };
      draw();
    },
  };

  const VERDICT = {
    correcto: ['ok', 'Correcto', 'check'],
    dudoso: ['warn', 'Dudoso', 'alert'],
    incorrecto: ['bad', 'Incorrecto', 'close'],
    'no verificable': ['muted', 'No verificable', 'info'],
  };
  const verdictOf = (v) => VERDICT[String(v || '').toLowerCase().trim()] || VERDICT['no verificable'];

  V.factcheck = {
    valid: (d) => arr(d?.claims).length,
    md: (d) => [
      `## Afirmaciones\n\n${arr(d.claims).map((c) => `- **${verdictOf(c.verdict)[1]}:** ${c.claim}${mdTs(c.t)} — ${c.explanation || ''}`).join('\n')}`,
      arr(d.opinions).length ? `## Opiniones presentadas como hechos\n\n${arr(d.opinions).map((o) => `- ${o}`).join('\n')}` : '',
      arr(d.missing).length ? `## Posibles sesgos o información faltante\n\n${arr(d.missing).map((o) => `- ${o}`).join('\n')}` : '',
      '_Evaluación preliminar generada por IA._',
    ].filter(Boolean).join('\n\n'),
    render(el, d) {
      const counts = {};
      arr(d.claims).forEach((c) => { const k = verdictOf(c.verdict)[0]; counts[k] = (counts[k] || 0) + 1; });
      el.innerHTML = `
        <div class="vw-row vw-verdicts">${Object.entries(VERDICT).map(([, [cls, label, icon]]) => (counts[cls] ? `<span class="vw-verdict ${cls}">${I(icon)}${counts[cls]} ${label.toLowerCase()}</span>` : '')).join('')}</div>
        <div class="vw-claims">${arr(d.claims).map((c) => { const [cls, label, icon] = verdictOf(c.verdict); return `
          <div class="vw-claim ${cls}">
            <div class="vw-row"><span class="vw-verdict ${cls}">${I(icon)}${label}</span>${chip(c.t)}</div>
            <b>${esc(c.claim)}</b>
            ${c.explanation ? `<p>${esc(c.explanation)}</p>` : ''}
          </div>`; }).join('')}</div>
        ${arr(d.opinions).length ? `<div class="vw-h">${I('chat')}Opiniones presentadas como hechos</div><ul class="vw-list">${arr(d.opinions).map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
        ${arr(d.missing).length ? `<div class="vw-h">${I('search')}Posibles sesgos o información faltante</div><ul class="vw-list">${arr(d.missing).map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
        <p class="vw-note">${I('info')}Evaluación preliminar generada por IA: verifica los datos importantes en fuentes confiables.</p>`;
    },
  };

  V.thread = {
    valid: (d) => arr(d?.posts).length,
    md: (d) => arr(d.posts).map((p, i, a) => `${i + 1}/${a.length} ${p}`).join('\n\n'),
    render(el, d, ctx) {
      const posts = arr(d.posts);
      const numbered = (p, i) => `${i + 1}/${posts.length} ${p}`;
      el.innerHTML = `<div class="vw-row vw-thread-head"><span class="vw-q-meta">${posts.length} publicaciones</span><button class="sn-btn vw-copy-all">${I('copy')}Copiar hilo completo</button></div>
        <div class="vw-thread">${posts.map((p, i) => { const text = numbered(p, i); const n = [...text].length; return `
          <div class="vw-post">
            <div class="vw-avatar">${I('users')}</div>
            <div class="vw-post-body">
              <div class="vw-post-head"><b>Tu cuenta</b> <span>@tu_usuario · ahora</span></div>
              <div class="vw-post-text">${esc(text)}</div>
              <div class="vw-row vw-post-foot"><span class="vw-count ${n > 280 ? 'over' : ''}">${n}/280</span><button class="sn-link" data-copy="${i}">${I('copy')}Copiar</button></div>
            </div>
          </div>`; }).join('')}</div>`;
      el.querySelector('.vw-copy-all').addEventListener('click', () => copy(posts.map(numbered).join('\n\n'), ctx.toast));
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-copy]'); if (b) copy(numbered(posts[b.dataset.copy], Number(b.dataset.copy)), ctx.toast); });
    },
  };

  V.linkedin = {
    valid: (d) => d && d.text,
    md: (d) => `${d.text}\n\n${arr(d.hashtags).map((h) => `#${String(h).replace(/^#/, '')}`).join(' ')}`,
    render(el, d, ctx) {
      const full = `${d.text}\n\n${arr(d.hashtags).map((h) => `#${String(h).replace(/^#/, '')}`).join(' ')}`.trim();
      const n = [...full].length;
      el.innerHTML = `
        <div class="vw-li">
          <div class="vw-li-head"><div class="vw-avatar">${I('users')}</div><div><b>Tu nombre</b><span>Tu titular profesional · Ahora</span></div></div>
          <div class="vw-li-text clamp">${esc(d.text).replace(/\n/g, '<br>')}<div class="vw-li-tags">${arr(d.hashtags).map((h) => `#${esc(String(h).replace(/^#/, ''))}`).join(' ')}</div></div>
          <button class="sn-link vw-li-more">…ver más</button>
          <div class="vw-li-bar"><span>${I('heart')}Recomendar</span><span>${I('chat')}Comentar</span><span>${I('share')}Compartir</span></div>
        </div>
        <div class="vw-row vw-li-foot"><span class="vw-count ${n > 3000 ? 'over' : ''}">${n}/3000 caracteres</span><button class="sn-btn primary vw-li-copy">${I('copy')}Copiar publicación</button></div>`;
      const text = el.querySelector('.vw-li-text');
      const more = el.querySelector('.vw-li-more');
      more.addEventListener('click', () => { text.classList.toggle('clamp'); more.textContent = text.classList.contains('clamp') ? '…ver más' : 'ver menos'; });
      el.querySelector('.vw-li-copy').addEventListener('click', () => copy(full, ctx.toast));
    },
  };

  /**
   * Dibuja la vista de una acción. Devuelve {ok, markdown, controller} o {ok:false} si la respuesta no es válida.
   * ctx: { video, state, toast, accent }
   */
  function render(container, actionId, text, ctx = {}) {
    const view = V[actionId];
    const data = view ? parse(text) : null;
    if (!view || !data || !view.valid(data)) return { ok: false };
    const el = document.createElement('div');
    el.className = `vw vw-${actionId}`;
    container.innerHTML = '';
    container.appendChild(el);
    const controller = view.render(el, data, { ...ctx, state: ctx.state || {} }) || null;
    return { ok: true, markdown: view.md(data), controller };
  }

  /** Markdown equivalente (para copiar, exportar y escuchar). */
  function toMarkdown(actionId, text) {
    const view = V[actionId];
    const data = view ? parse(text) : null;
    return view && data && view.valid(data) ? view.md(data) : text;
  }

  /** Cuenta elementos mientras llega la respuesta (para el indicador de progreso). */
  function progressCount(actionId, text) {
    const keys = { summary: '"text"', keypoints: '"title"', chapters: '"title"', quiz: '"q"', flashcards: '"front"', quotes: '"text"', steps: '"title"', factcheck: '"claim"', thread: '",', linkedin: '\n' };
    const k = keys[actionId];
    return k ? String(text).split(k).length - 1 : 0;
  }

  SN.views = { render, toMarkdown, parse, progressCount, has: (id) => !!V[id] };

  /* ---------------- estilos ---------------- */
  SN.styles = `${SN.styles || ''}
.vw { animation: sn-fade .25s ease; }
@keyframes sn-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.vw .sn-i { width: 15px; height: 15px; }
.vw-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.vw-h { display: flex; align-items: center; gap: 7px; font-weight: 600; margin: 14px 0 6px; }
.vw-h .sn-i { color: var(--sn-accent); }
.vw-hero { background: linear-gradient(135deg, var(--sn-accent-soft), transparent); border: 1px solid var(--sn-border); border-left: 3px solid var(--sn-accent); border-radius: 12px; padding: 12px 14px; margin: 8px 0 10px; }
.vw-hero p { margin: 4px 0 0; font-size: 14.5px; line-height: 1.5; font-weight: 500; }
.vw-kicker { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; letter-spacing: .06em; color: var(--sn-accent); }
.vw-section { border: 1px solid var(--sn-border); border-radius: 10px; margin: 6px 0; background: var(--sn-bg); }
.vw-section summary { list-style: none; cursor: pointer; padding: 9px 12px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; }
.vw-section summary::-webkit-details-marker { display: none; }
.vw-section[open] .vw-caret { transform: rotate(180deg); }
.vw-caret { transition: transform .15s; color: var(--sn-fg-2); }
.vw-section p { margin: 0; padding: 0 12px 11px; color: var(--sn-fg); }
.vw-ideas { list-style: none; padding: 0; margin: 4px 0; counter-reset: idea; }
.vw-ideas li { counter-increment: idea; display: flex; gap: 8px; align-items: baseline; padding: 6px 0; border-bottom: 1px dashed var(--sn-border); }
.vw-ideas li::before { content: counter(idea); flex: none; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; background: var(--sn-accent-soft); color: var(--sn-accent); font-size: 11px; font-weight: 700; }
.vw-ideas li span { flex: 1; }
.vw-callout { display: flex; gap: 10px; align-items: flex-start; background: var(--sn-bg-2); border: 1px solid var(--sn-border); border-radius: 10px; padding: 10px 12px; margin: 12px 0 4px; }
.vw-callout > .sn-i { color: var(--sn-accent); margin-top: 2px; flex: none; }
.vw-callout p, .vw-callout ul { margin: 2px 0 0; }
.vw-callout.warn { background: rgba(224, 138, 0, .08); border-color: rgba(224, 138, 0, .35); }
.vw-callout.warn > .sn-i { color: #e08a00; }
.vw-cards { display: grid; gap: 8px; margin-top: 8px; }
.vw-card { display: flex; gap: 10px; align-items: flex-start; border: 1px solid var(--sn-border); border-left: 3px solid var(--c); border-radius: 10px; padding: 10px 12px; background: var(--sn-bg); }
.vw-card p { margin: 3px 0 0; color: var(--sn-fg-2); font-size: 13px; }
.vw-card-title { font-weight: 600; }
.vw-num { flex: none; width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center; background: var(--c); color: #fff; font-weight: 700; font-size: 12.5px; }
.vw-timeline { display: flex; gap: 2px; height: 12px; margin: 12px 0 4px; }
.vw-seg { display: block; background: var(--c) !important; opacity: .55; border-radius: 3px; padding: 0 !important; min-width: 4px; transition: opacity .15s, transform .15s; }
.vw-seg:hover, .vw-seg.on { opacity: 1; transform: scaleY(1.35); }
.vw-timeline-scale { display: flex; justify-content: space-between; font-size: 11px; color: var(--sn-fg-2); margin-bottom: 8px; }
.vw-chapters { list-style: none; padding: 0; margin: 0 0 10px; }
.vw-chapters li { display: flex; gap: 10px; padding: 8px 8px 8px 10px; border-left: 3px solid var(--c); border-radius: 0 8px 8px 0; margin: 4px 0; transition: background .15s; }
.vw-chapters li.on { background: var(--sn-accent-soft); }
.vw-chapters p { margin: 2px 0 0; color: var(--sn-fg-2); font-size: 13px; }
.vw-ch-time { flex: none; align-self: flex-start; }
.vw-progress { height: 5px; background: var(--sn-bg-3); border-radius: 3px; overflow: hidden; margin: 10px 0 6px; }
.vw-progress span { display: block; height: 100%; background: var(--sn-accent); border-radius: 3px; transition: width .3s; }
.vw-q-meta { font-size: 12px; color: var(--sn-fg-2); }
.vw-q { font-size: 15.5px; font-weight: 600; line-height: 1.4; margin: 8px 0 10px; }
.vw-options { display: grid; gap: 6px; }
.vw-option { display: flex; align-items: center; gap: 10px; text-align: left; border: 1px solid var(--sn-border); background: var(--sn-bg); border-radius: 10px; padding: 9px 12px; transition: border-color .15s, background .15s; }
.vw-option:hover:not([disabled]) { border-color: var(--sn-accent); background: var(--sn-accent-soft); }
.vw-option span:nth-child(2) { flex: 1; }
.vw-letter { flex: none; width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center; background: var(--sn-bg-3); font-weight: 700; font-size: 12px; }
.vw-option.ok { border-color: #1f9d55; background: rgba(31, 157, 85, .1); }
.vw-option.ok .vw-letter { background: #1f9d55; color: #fff; }
.vw-option.bad { border-color: #d93025; background: rgba(217, 48, 37, .08); }
.vw-option.bad .vw-letter { background: #d93025; color: #fff; }
.vw-option.ok .sn-i { color: #1f9d55; } .vw-option.bad .sn-i { color: #d93025; }
.vw-option.dim { opacity: .55; }
.vw-option[disabled] { cursor: default; }
.vw-explain { border-radius: 10px; padding: 9px 12px; margin: 10px 0; font-size: 13.5px; }
.vw-explain.ok { background: rgba(31, 157, 85, .1); } .vw-explain.bad { background: rgba(217, 48, 37, .08); }
.vw-score { text-align: center; position: relative; padding: 10px 0 4px; }
.vw-score svg { transform: rotate(-90deg); }
.vw-ring-bg { fill: none; stroke: var(--sn-bg-3); stroke-width: 8; }
.vw-ring { fill: none; stroke: var(--sn-accent); stroke-width: 8; stroke-linecap: round; transition: stroke-dashoffset .6s; }
.vw-score-num { font-size: 26px; font-weight: 800; }
.vw-score svg + .vw-score-num { position: absolute; left: 0; right: 0; top: 46px; }
.vw-score p { color: var(--sn-fg-2); margin: 4px 0 8px; }
.vw-review { list-style: none; padding: 0; margin: 8px 0 12px; }
.vw-review li { display: flex; gap: 8px; align-items: center; padding: 5px 0; font-size: 13px; border-bottom: 1px dashed var(--sn-border); }
.vw-review li span { flex: 1; }
.vw-review li.ok .sn-i { color: #1f9d55; } .vw-review li.bad .sn-i { color: #d93025; }
.vw-flip { perspective: 1200px; cursor: pointer; margin: 8px 0 10px; outline: none; }
.vw-flip-inner { position: relative; min-height: 190px; transition: transform .5s cubic-bezier(.2,.7,.3,1); transform-style: preserve-3d; }
.vw-flip.flipped .vw-flip-inner { transform: rotateY(180deg); }
.vw-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 16px; padding: 18px 18px 14px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: 8px; font-size: 16px; font-weight: 600; line-height: 1.4; box-shadow: 0 6px 20px rgba(0,0,0,.08); }
.vw-face.front { background: linear-gradient(135deg, var(--sn-accent), var(--sn-accent-2)); color: #fff; }
.vw-face.back { background: var(--sn-bg); border: 1px solid var(--sn-border); transform: rotateY(180deg); font-weight: 500; }
.vw-face-label { position: absolute; top: 10px; left: 14px; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; opacity: .75; font-weight: 700; }
.vw-hint { font-size: 11.5px; font-weight: 400; opacity: .8; position: absolute; bottom: 10px; }
.vw-fc-actions { justify-content: center; }
.vw-fc-tools { justify-content: space-between; margin-top: 8px; }
.rot90 { transform: rotate(90deg); } .rot-90 { transform: rotate(-90deg); }
.sn-link { display: inline-flex; align-items: center; gap: 4px; }
.vw-quotes { display: grid; gap: 10px; margin-top: 8px; }
.vw-quote { position: relative; margin: 0; border: 1px solid var(--sn-border); border-radius: 14px; padding: 18px 16px 10px 16px; background: linear-gradient(135deg, color-mix(in srgb, var(--c) 9%, transparent), transparent 60%); }
.vw-qmark { position: absolute; top: -6px; left: 10px; font: 700 54px Georgia, serif; color: var(--c); opacity: .5; }
.vw-quote blockquote { margin: 6px 0 8px; font-size: 15px; font-weight: 600; line-height: 1.45; font-style: italic; }
.vw-quote figcaption { font-size: 12.5px; color: var(--sn-fg-2); }
.vw-quote-tools { margin-top: 6px; gap: 14px; }
.vw-badge { background: var(--sn-accent-soft); color: var(--sn-accent); font-weight: 600; font-size: 12px; border-radius: 999px; padding: 3px 10px; }
.vw-steps-head { justify-content: space-between; margin-top: 6px; }
.vw-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.vw-chips span { background: var(--sn-bg-2); border: 1px solid var(--sn-border); border-radius: 999px; padding: 3px 10px; font-size: 12.5px; }
.vw-steps { list-style: none; padding: 0; margin: 10px 0; }
.vw-steps li { display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; border-bottom: 1px dashed var(--sn-border); }
.vw-steps li p { margin: 3px 0 0; color: var(--sn-fg-2); font-size: 13px; }
.vw-steps li.done b { text-decoration: line-through; color: var(--sn-fg-2); }
.vw-check { flex: none; width: 26px; height: 26px; border-radius: 8px; border: 2px solid var(--sn-accent); background: transparent; color: var(--sn-accent); display: grid; place-items: center; font-weight: 700; font-size: 12px; padding: 0; }
.vw-steps li.done .vw-check { background: var(--sn-accent); color: #fff; }
.vw-steps li.done .vw-check .sn-i { color: #fff; }
.vw-verdicts { margin: 8px 0; }
.vw-verdict { display: inline-flex; align-items: center; gap: 5px; border-radius: 999px; padding: 3px 10px; font-size: 12px; font-weight: 600; }
.vw-verdict.ok { background: rgba(31,157,85,.12); color: #1f9d55; }
.vw-verdict.warn { background: rgba(224,138,0,.13); color: #c07400; }
.vw-verdict.bad { background: rgba(217,48,37,.1); color: #d93025; }
.vw-verdict.muted { background: var(--sn-bg-3); color: var(--sn-fg-2); }
.vw-verdict .sn-i { width: 13px; height: 13px; }
.vw-claims { display: grid; gap: 8px; }
.vw-claim { border: 1px solid var(--sn-border); border-radius: 10px; padding: 10px 12px; }
.vw-claim.ok { border-left: 3px solid #1f9d55; } .vw-claim.warn { border-left: 3px solid #e08a00; } .vw-claim.bad { border-left: 3px solid #d93025; }
.vw-claim b { display: block; margin: 6px 0 2px; }
.vw-claim p { margin: 0; color: var(--sn-fg-2); font-size: 13px; }
.vw-list { margin: 4px 0; padding-left: 20px; }
.vw-note { display: flex; gap: 6px; align-items: center; color: var(--sn-fg-2); font-size: 12px; margin-top: 10px; }
.vw-thread-head { justify-content: space-between; margin: 8px 0; }
.vw-thread { position: relative; }
.vw-post { display: flex; gap: 10px; padding: 10px 0; position: relative; }
.vw-post:not(:last-child)::before { content: ""; position: absolute; left: 17px; top: 48px; bottom: -4px; width: 2px; background: var(--sn-border); }
.vw-avatar { flex: none; width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--sn-accent), var(--sn-accent-2)); display: grid; place-items: center; }
.vw-avatar .sn-i { color: #fff !important; }
.vw-post-body { flex: 1; min-width: 0; }
.vw-post-head span { color: var(--sn-fg-2); font-size: 12.5px; }
.vw-post-text { white-space: pre-wrap; margin: 2px 0 6px; }
.vw-post-foot { justify-content: space-between; }
.vw-count { font-size: 11.5px; color: var(--sn-fg-2); font-variant-numeric: tabular-nums; }
.vw-count.over { color: var(--sn-danger); font-weight: 600; }
.vw-li { border: 1px solid var(--sn-border); border-radius: 12px; padding: 12px 14px 0; background: var(--sn-bg); margin-top: 8px; }
.vw-li-head { display: flex; gap: 10px; align-items: center; }
.vw-li-head span { display: block; font-size: 12px; color: var(--sn-fg-2); }
.vw-li-text { margin: 10px 0 4px; line-height: 1.5; }
.vw-li-text.clamp { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.vw-li-tags { color: #0a66c2; margin-top: 8px; font-weight: 500; }
.vw-li-bar { display: flex; justify-content: space-around; border-top: 1px solid var(--sn-border); margin-top: 8px; padding: 6px 0; color: var(--sn-fg-2); font-size: 12.5px; }
.vw-li-bar span { display: inline-flex; gap: 5px; align-items: center; }
.vw-li-foot { justify-content: space-between; margin-top: 10px; }
`;
})();
