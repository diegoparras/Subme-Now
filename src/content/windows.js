/* Subme Now — ventanas flotantes dentro de la página.
 * Se arrastran desde la barra de título, se redimensionan desde los bordes y la esquina,
 * se minimizan y recuerdan su posición y tamaño. Cada ventana vive en su propio Shadow DOM
 * colgado de <body>, así que no la afectan los estilos de YouTube.
 */
(function () {
  const SN = (globalThis.SubmeNow = globalThis.SubmeNow || {});
  const I = (n, c) => SubmeIcons.icon(n, c);
  const open = new Map();
  let zTop = 2147482000;
  const MIN_W = 320;
  const MIN_H = 220;
  const HEAD_H = 44;

  const CSS = `
:host { all: initial; position: fixed; display: block; }
.sn-win { position: absolute; inset: 0; display: flex; flex-direction: column; background: var(--sn-bg); color: var(--sn-fg);
  border: 1px solid var(--sn-border); border-radius: 14px; box-shadow: 0 24px 70px rgba(0,0,0,.32), 0 2px 8px rgba(0,0,0,.08);
  overflow: hidden; font-family: "Roboto", "Segoe UI", system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.5;
  animation: sn-win-in .18s ease-out; }
@keyframes sn-win-in { from { opacity: 0; transform: scale(.97); } to { opacity: 1; transform: none; } }
.sn-win-head { height: ${HEAD_H}px; flex: none; display: flex; align-items: center; gap: 6px; padding: 0 6px 0 12px; cursor: grab; user-select: none;
  background: linear-gradient(135deg, var(--sn-accent-soft), transparent 75%); border-bottom: 1px solid var(--sn-border); }
.sn-win-head:active { cursor: grabbing; }
.sn-win-title { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; font-weight: 600; }
.sn-win-title span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.sn-win-title .sn-i { color: var(--sn-accent); }
.sn-win-body { flex: 1; min-height: 0; overflow: auto; padding: 8px 14px 14px; position: relative; }
.sn-win.min { height: ${HEAD_H}px; }
.sn-win.min .sn-win-body, .sn-win.min .sn-win-rs { display: none; }
.sn-win-rs { position: absolute; z-index: 2; }
.sn-win-rs.e { top: 10px; bottom: 14px; right: 0; width: 7px; cursor: ew-resize; }
.sn-win-rs.w { top: 10px; bottom: 14px; left: 0; width: 7px; cursor: ew-resize; }
.sn-win-rs.s { left: 14px; right: 14px; bottom: 0; height: 7px; cursor: ns-resize; }
.sn-win-rs.se { right: 0; bottom: 0; width: 16px; height: 16px; cursor: nwse-resize; }
.sn-win-rs.sw { left: 0; bottom: 0; width: 16px; height: 16px; cursor: nesw-resize; }
.sn-win-rs.se::after { content: ""; position: absolute; right: 4px; bottom: 4px; width: 8px; height: 8px; border-right: 2px solid var(--sn-fg-2); border-bottom: 2px solid var(--sn-fg-2); opacity: .45; border-radius: 0 0 3px 0; }
.sn-win .mm-view { max-height: none; }
.sn-win-body > .mm-wrap { height: 100%; display: flex; flex-direction: column; }
.sn-win-body > .mm-wrap .mm-view { flex: 1; }
`;

  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  /**
   * Abre (o enfoca) una ventana flotante.
   * opts: { key, title, icon, theme: {dark, accent}, geometry, onGeometry(g), render(body, win), onClose(), onPopout() }
   */
  function openWindow(opts) {
    if (open.has(opts.key)) {
      const w = open.get(opts.key);
      w.focus();
      w.rerender(opts);
      return w;
    }
    const n = open.size;
    const W = Math.min(opts.geometry?.w || 440, innerWidth - 32);
    const H = Math.min(opts.geometry?.h || 560, innerHeight - 32);
    const g = {
      x: clamp(opts.geometry?.x ?? innerWidth - W - 28 - n * 28, 8, innerWidth - 120),
      y: clamp(opts.geometry?.y ?? 84 + n * 28, 8, innerHeight - HEAD_H - 8),
      w: W,
      h: H,
    };

    const host = document.createElement('div');
    host.className = 'subme-now-window';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${SN.styles}${CSS}</style>
      <div class="sn-win" role="dialog" aria-label="${opts.title}">
        <div class="sn-win-head">
          <div class="sn-win-title">${I(opts.icon || 'detach')}<span></span></div>
          ${opts.onPopout ? `<button class="sn-icon-btn" data-win="popout" title="Abrir en una ventana aparte (para otro monitor)">${I('external')}</button>` : ''}
          <button class="sn-icon-btn" data-win="min" title="Minimizar">${I('minus')}</button>
          <button class="sn-icon-btn" data-win="close" title="Cerrar">${I('close')}</button>
        </div>
        <div class="sn-win-body"></div>
        <div class="sn-win-rs e" data-rs="e"></div><div class="sn-win-rs w" data-rs="w"></div><div class="sn-win-rs s" data-rs="s"></div>
        <div class="sn-win-rs se" data-rs="se"></div><div class="sn-win-rs sw" data-rs="sw"></div>
      </div>
      <div class="sn-toast" data-ref="toast"></div>`;
    const win = shadow.querySelector('.sn-win');
    const body = shadow.querySelector('.sn-win-body');
    const titleEl = shadow.querySelector('.sn-win-title span');
    titleEl.textContent = opts.title;
    document.body.appendChild(host);

    let minimized = false;
    const apply = () => {
      Object.assign(host.style, { left: `${g.x}px`, top: `${g.y}px`, width: `${g.w}px`, height: `${minimized ? HEAD_H : g.h}px`, zIndex: String(zTop) });
    };
    const save = () => opts.onGeometry?.({ x: Math.round(g.x), y: Math.round(g.y), w: Math.round(g.w), h: Math.round(g.h) });
    const focus = () => { zTop += 1; host.style.zIndex = String(zTop); };
    const setTheme = ({ dark, accent } = {}) => {
      host.setAttribute('data-theme', dark ? 'dark' : 'light');
      if (accent) { host.setAttribute('data-accent', ''); host.style.setProperty('--sn-user-accent', accent); } else { host.removeAttribute('data-accent'); host.style.removeProperty('--sn-user-accent'); }
    };
    setTheme(opts.theme);
    focus();
    apply();

    // Arrastrar desde la barra de título.
    const head = shadow.querySelector('.sn-win-head');
    head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      focus();
      const sx = e.clientX; const sy = e.clientY; const ox = g.x; const oy = g.y;
      head.setPointerCapture(e.pointerId);
      const move = (ev) => {
        g.x = clamp(ox + ev.clientX - sx, -g.w + 120, innerWidth - 80);
        g.y = clamp(oy + ev.clientY - sy, 0, innerHeight - HEAD_H);
        apply();
      };
      const up = () => { head.removeEventListener('pointermove', move); head.removeEventListener('pointerup', up); save(); };
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', up);
    });
    head.addEventListener('dblclick', (e) => { if (!e.target.closest('button')) toggleMin(); });

    // Redimensionar desde bordes y esquinas.
    shadow.querySelectorAll('[data-rs]').forEach((h) => h.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      focus();
      const dir = h.dataset.rs;
      const sx = e.clientX; const sy = e.clientY; const o = { ...g };
      h.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const dx = ev.clientX - sx; const dy = ev.clientY - sy;
        if (dir.includes('e')) g.w = clamp(o.w + dx, MIN_W, innerWidth - o.x - 4);
        if (dir.includes('s')) g.h = clamp(o.h + dy, MIN_H, innerHeight - o.y - 4);
        if (dir.includes('w')) { const w = clamp(o.w - dx, MIN_W, o.x + o.w - 4); g.x = o.x + o.w - w; g.w = w; }
        apply();
        api.onResize?.();
      };
      const up = () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); save(); api.onResize?.(); };
      h.addEventListener('pointermove', move);
      h.addEventListener('pointerup', up);
    }));

    const toggleMin = () => {
      minimized = !minimized;
      win.classList.toggle('min', minimized);
      apply();
    };

    host.addEventListener('pointerdown', focus, true);
    // Que las teclas no disparen los atajos de YouTube mientras se usa la ventana.
    ['keydown', 'keyup', 'keypress'].forEach((t) => shadow.addEventListener(t, (e) => e.stopPropagation()));
    // En Shorts, que la rueda del mouse no pase al siguiente Short.
    host.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });

    const close = () => {
      host.remove();
      open.delete(opts.key);
      opts.onClose?.();
    };

    shadow.querySelector('.sn-win-head').addEventListener('click', (e) => {
      const b = e.target.closest('[data-win]');
      if (!b) return;
      if (b.dataset.win === 'close') close();
      if (b.dataset.win === 'min') toggleMin();
      if (b.dataset.win === 'popout') { opts.onPopout?.(); close(); }
    });

    const toastEl = shadow.querySelector('[data-ref="toast"]');
    let toastTimer = null;
    const api = {
      key: opts.key,
      host,
      body,
      shadow,
      focus,
      close,
      setTheme,
      setTitle: (t) => { titleEl.textContent = t; },
      toast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
      },
      rerender(o) {
        if (o.title) titleEl.textContent = o.title;
        body.innerHTML = '';
        o.render?.(body, api);
      },
      onResize: null,
    };
    open.set(opts.key, api);
    opts.render?.(body, api);
    return api;
  }

  SN.windows = {
    open: openWindow,
    get: (key) => open.get(key),
    all: () => [...open.values()],
    closeAll: () => [...open.values()].forEach((w) => w.close()),
  };
})();
