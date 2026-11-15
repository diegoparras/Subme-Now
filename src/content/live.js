/* Subme Now — funciones en vivo sobre el reproductor de YouTube:
 *  · Saltar lo que sobra: marca los tramos en la barra de progreso y los salta (con "Deshacer").
 *  · Modo estudio: pausa el video al terminar cada sección y hace una pregunta.
 *  · Subtítulos dobles: el idioma original y una traducción, uno arriba del otro.
 * Todo se dibuja en una capa propia (Shadow DOM) dentro del reproductor, así funciona también en pantalla completa.
 */
(function () {
  const SN = (globalThis.SubmeNow = globalThis.SubmeNow || {});
  const U = SubmeUtils;
  const I = (n, c) => SubmeIcons.icon(n, c);
  const esc = U.escapeHtml;

  const CSS = `
:host { all: initial; position: absolute; inset: 0; z-index: 61; pointer-events: none; font-family: "Roboto", "Segoe UI", system-ui, sans-serif; }
* { box-sizing: border-box; }
.lv-notice { position: absolute; left: 16px; bottom: 74px; pointer-events: auto; display: flex; align-items: center; gap: 10px; background: rgba(15, 15, 20, .88); color: #fff;
  padding: 8px 10px 8px 12px; border-radius: 10px; font-size: 13.5px; box-shadow: 0 8px 24px rgba(0,0,0,.35); animation: lv-in .2s ease; border-left: 4px solid var(--c, var(--sn-accent)); }
.lv-notice button { border: 0; background: rgba(255,255,255,.14); color: #fff; border-radius: 7px; padding: 4px 10px; font: inherit; font-size: 12.5px; cursor: pointer; }
.lv-notice button:hover { background: rgba(255,255,255,.25); }
.lv-notice .sn-i { width: 16px; height: 16px; }
.lv-subs { position: absolute; left: 50%; bottom: 13%; transform: translateX(-50%); width: min(90%, 900px); display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; }
.lv-subs span { background: rgba(8, 8, 12, .78); color: #fff; padding: 3px 10px; border-radius: 6px; font-size: clamp(14px, 2.1vw, 26px); line-height: 1.35; text-shadow: 0 1px 2px rgba(0,0,0,.5); }
.lv-subs .tr { color: #ffe27a; font-size: clamp(13px, 1.9vw, 24px); }
.lv-subs .st { font-size: 13px; color: #ddd; }
.lv-card-wrap { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(5, 5, 10, .55); pointer-events: auto; animation: lv-in .2s ease; padding: 12px; }
.lv-card { width: min(560px, 100%); max-height: 100%; overflow: auto; background: var(--sn-bg); color: var(--sn-fg); border-radius: 16px; padding: 16px 18px; box-shadow: 0 20px 60px rgba(0,0,0,.45); font-size: 14px; line-height: 1.5; }
.lv-card .vw-kicker { margin-bottom: 4px; }
.lv-card .vw-q { font-size: 16px; font-weight: 600; margin: 4px 0 10px; }
.lv-actions { display: flex; justify-content: space-between; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
@keyframes lv-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
`;

  function create({ getVideo, accent = '', lengthSeconds = () => 0, onStudyState, onSkipped }) {
    let host = null;
    let sh = null;
    let layer = { notice: null, subs: null, card: null };
    let markers = null;
    let lastMarkersCheck = 0;
    let prevT = null;
    let noticeTimer = null;

    const skip = { segs: [], on: false, ignored: new Set() };
    const study = { cps: [], on: false, state: {}, open: false };
    const dual = { on: false, orig: [], tr: [], status: '' };

    const player = () => {
      const v = getVideo();
      if (!v || !v.isConnected) return null;
      return v.closest('.html5-video-player') || v.closest('#shorts-player') || v.parentElement;
    };

    function ensureHost() {
      const p = player();
      if (!p) return null;
      if (host && host.parentElement === p) return sh;
      host?.remove();
      host = document.createElement('div');
      host.id = 'subme-live';
      host.setAttribute('data-theme', 'dark');
      if (accent) { host.setAttribute('data-accent', ''); host.style.setProperty('--sn-user-accent', accent); }
      sh = host.attachShadow({ mode: 'open' });
      sh.innerHTML = `<style>${SN.styles}${CSS}</style><div class="lv-subs" hidden></div>`;
      layer = { notice: null, subs: sh.querySelector('.lv-subs'), card: null };
      if (getComputedStyle(p).position === 'static') p.style.position = 'relative';
      p.appendChild(host);
      // Las teclas dentro de la capa (respuestas del quiz) no llegan a los atajos de YouTube.
      ['keydown', 'keyup', 'keypress'].forEach((t) => host.addEventListener(t, (e) => e.stopPropagation()));
      return sh;
    }

    function notice(html, color, ms = 5000) {
      if (!ensureHost()) return null;
      layer.notice?.remove();
      const el = document.createElement('div');
      el.className = 'lv-notice';
      if (color) el.style.setProperty('--c', color);
      el.innerHTML = html;
      sh.appendChild(el);
      layer.notice = el;
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => { el.remove(); if (layer.notice === el) layer.notice = null; }, ms);
      return el;
    }

    /* ---------- marcas en la barra de progreso ---------- */
    function renderMarkers() {
      markers?.remove();
      markers = null;
      const p = player();
      const bar = p?.querySelector('.ytp-progress-bar');
      const d = Number(getVideo()?.duration);
      const dur = Number.isFinite(d) && d > 0 ? d : lengthSeconds(); // transmisiones: duración infinita
      if (!bar || !dur || !isFinite(dur) || !skip.segs.length) return;
      markers = document.createElement('div');
      markers.className = 'subme-skip-markers';
      markers.style.cssText = 'position:absolute;left:0;right:0;top:0;bottom:0;pointer-events:none;z-index:40;';
      for (const s of skip.segs) {
        const m = document.createElement('div');
        const k = SN.views.SKIP_KINDS[s.kind];
        m.title = `${k.label}: ${s.label}`;
        m.style.cssText = `position:absolute;top:0;bottom:0;left:${(s.start / dur) * 100}%;width:${Math.max(0.3, ((s.end - s.start) / dur) * 100)}%;background:${k.color};opacity:${skip.on ? 0.95 : 0.55};border-radius:1px;`;
        markers.appendChild(m);
      }
      (bar.querySelector('.ytp-progress-list') || bar).appendChild(markers);
    }

    /* ---------- tarjeta del modo estudio ---------- */
    function showQuestion(i) {
      const c = study.cps[i];
      if (!c || !ensureHost()) return;
      study.open = true;
      getVideo()?.pause?.();
      const wrap = document.createElement('div');
      wrap.className = 'lv-card-wrap';
      const draw = (chosen) => {
        const answered = chosen != null;
        const right = Number(c.answer);
        wrap.innerHTML = `<div class="lv-card" role="dialog" aria-label="Pregunta del modo estudio">
          <span class="vw-kicker">${I('graduation')}Modo estudio · pregunta ${i + 1} de ${study.cps.length}</span>
          <div class="vw-q">${esc(c.q)}</div>
          <div class="vw-options">${c.options.map((o, j) => {
            const cls = !answered ? '' : j === right ? 'ok' : j === chosen ? 'bad' : 'dim';
            return `<button class="vw-option ${cls}" data-j="${j}" ${answered ? 'disabled' : ''}><span class="vw-letter">${'ABCDEF'[j]}</span><span>${esc(o)}</span>${cls === 'ok' ? I('check') : cls === 'bad' ? I('close') : ''}</button>`;
          }).join('')}</div>
          ${answered ? `<div class="vw-explain ${chosen === right ? 'ok' : 'bad'}"><b>${chosen === right ? '¡Correcto!' : 'No exactamente'}</b> ${esc(c.explanation || '')}</div>` : ''}
          <div class="lv-actions">
            <button class="sn-btn" data-lv="review">${I('undo')}Repasar desde ${SN.views.fmt(c.from || 0)}</button>
            <button class="sn-btn primary" data-lv="go">${answered ? 'Continuar' : 'Saltar pregunta'}${I('play')}</button>
          </div></div>`;
      };
      draw(null);
      wrap.addEventListener('click', (e) => {
        const opt = e.target.closest('.vw-option');
        if (opt && !opt.disabled) {
          const j = Number(opt.dataset.j);
          study.state.done = [...new Set([...(study.state.done || []), i])];
          if (j === Number(c.answer)) study.state.correct = [...new Set([...(study.state.correct || []), i])];
          else study.state.correct = (study.state.correct || []).filter((x) => x !== i);
          onStudyState?.(study.state);
          draw(j);
          return;
        }
        const b = e.target.closest('[data-lv]');
        if (!b) return;
        const v = getVideo();
        if (b.dataset.lv === 'review') {
          study.state.done = (study.state.done || []).filter((x) => x !== i); // se vuelve a preguntar
          onStudyState?.(study.state);
          if (v) { v.currentTime = c.from || 0; prevT = v.currentTime; }
        } else {
          study.state.done = [...new Set([...(study.state.done || []), i])];
          onStudyState?.(study.state);
        }
        closeCard();
        v?.play?.().catch(() => {});
      });
      layer.card?.remove();
      sh.appendChild(wrap);
      layer.card = wrap;
      wrap.querySelector('.vw-option')?.focus({ preventScroll: true });
    }

    function closeCard() {
      layer.card?.remove();
      layer.card = null;
      study.open = false;
    }

    /* ---------- subtítulos dobles ---------- */
    const at = (list, t) => {
      let lo = 0; let hi = list.length - 1; let idx = -1;
      while (lo <= hi) { const mid = (lo + hi) >> 1; if (list[mid].start <= t + 0.15) { idx = mid; lo = mid + 1; } else hi = mid - 1; }
      if (idx < 0) return null;
      const s = list[idx];
      const end = s.end || (list[idx + 1]?.start ?? s.start + 5);
      return t <= Math.max(end, s.start + 1.2) + 0.6 ? s : null;
    };
    function renderSubs(t) {
      if (!dual.on) { if (layer.subs) layer.subs.hidden = true; return; }
      if (!ensureHost()) return;
      const o = at(dual.orig, t);
      const tr = dual.tr.length ? at(dual.tr, t) : null;
      const parts = [];
      if (o) parts.push(`<span class="or">${esc(o.text)}</span>`);
      if (tr) parts.push(`<span class="tr">${esc(tr.text)}</span>`);
      if (dual.status) parts.push(`<span class="st">${esc(dual.status)}</span>`);
      const html = parts.join('');
      if (layer.subs.innerHTML !== html) layer.subs.innerHTML = html;
      layer.subs.hidden = !parts.length;
    }

    /* ---------- reloj ---------- */
    function tick(t) {
      const first = prevT == null;
      const prev = first ? t - 0.4 : prevT;
      prevT = t;
      const natural = t >= prev && t - prev < 3;

      if (Date.now() - lastMarkersCheck > 2000) {
        lastMarkersCheck = Date.now();
        if (skip.segs.length && (!markers || !markers.isConnected)) renderMarkers();
      }

      if (skip.on && !study.open) {
        skip.segs.forEach((s, i) => {
          if (skip.ignored.has(i)) return;
          const inside = t >= s.start && t < s.end - 0.5;
          const wasInside = !first && prev >= s.start && prev < s.end;
          if (!inside || wasInside) return;
          const v = getVideo();
          if (!v) return;
          v.currentTime = s.end;
          prevT = s.end;
          const k = SN.views.SKIP_KINDS[s.kind];
          const el = notice(`${I('skip')}<span>Saltado: <b>${esc(k.label)}</b> (${SN.views.fmt(s.end - s.start)})</span><button data-undo>Deshacer</button>`, k.color);
          el?.querySelector('[data-undo]').addEventListener('click', () => {
            skip.ignored.add(i);
            const vv = getVideo();
            if (vv) { vv.currentTime = s.start; prevT = s.start; }
            el.remove();
          });
          onSkipped?.(s);
        });
      }

      if (study.on && !study.open && natural) {
        const done = new Set(study.state.done || []);
        const i = study.cps.findIndex((c, k) => !done.has(k) && prev < c.at && t >= c.at);
        if (i >= 0) showQuestion(i);
      }

      renderSubs(t);
    }

    return {
      tick,
      setSkip(segs, on) {
        skip.segs = segs || [];
        skip.on = !!on && skip.segs.length > 0;
        renderMarkers();
      },
      setStudy(cps, on, state) {
        study.cps = cps || [];
        study.on = !!on && study.cps.length > 0;
        study.state = state || study.state || {};
        if (!study.on) closeCard();
      },
      setDual({ on, orig, tr, status }) {
        if (on !== undefined) dual.on = !!on;
        if (orig) dual.orig = orig;
        if (tr) dual.tr = tr;
        if (status !== undefined) dual.status = status;
        renderSubs(getVideo()?.currentTime || 0);
      },
      setAccent(c) {
        accent = c || '';
        if (host) { if (accent) { host.setAttribute('data-accent', ''); host.style.setProperty('--sn-user-accent', accent); } else host.removeAttribute('data-accent'); }
      },
      get studyOpen() { return study.open; },
      destroy() {
        clearTimeout(noticeTimer);
        markers?.remove();
        host?.remove();
        host = null; sh = null; markers = null; prevT = null;
        skip.segs = []; skip.on = false; skip.ignored.clear();
        study.cps = []; study.on = false; study.open = false;
        dual.on = false; dual.orig = []; dual.tr = []; dual.status = '';
      },
    };
  }

  SN.live = { create };
})();
