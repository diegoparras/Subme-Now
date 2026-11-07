/* Subme Now — mapa mental como diagrama interactivo (SVG), al estilo de NotebookLM.
 * - Convierte la lista anidada de Markdown que devuelve la IA en un árbol.
 * - Dibuja el tema central a la izquierda y las ramas hacia la derecha con curvas y un color por rama.
 * - Cada nodo con hijos se expande o contrae; los nodos con [mm:ss] saltan a ese momento del video.
 * - Zoom, ajustar al ancho, pantalla completa y descarga como PNG o SVG.
 */
(function () {
  const SN = (globalThis.SubmeNow = globalThis.SubmeNow || {});
  const PALETTE = ['#6d4aff', '#e8467c', '#0e9f8e', '#e08a00', '#2f7de1', '#a052e8', '#d9480f', '#1f9d55'];
  const FONT = '"Roboto", "Segoe UI", system-ui, -apple-system, sans-serif';
  const LH = 16;
  const PAD_X = 10;
  const PAD_Y = 7;
  const GAP_Y = 8;
  const GAP_X = 46;
  const TOGGLE = 18;
  const TS_RE = /[[(]((?:\d{1,2}:)?\d{1,2}:\d{2})(?:\s*[-–—]\s*(?:\d{1,2}:)?\d{1,2}:\d{2})?[\])]/;

  const clean = (t) => String(t)
    .replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/[*_`]/g, '')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1').replace(/\s+/g, ' ').trim();

  /** Lista anidada de Markdown → árbol {text, t, children}. */
  function parse(md, fallbackTitle = 'Tema central') {
    const items = [];
    for (const raw of String(md || '').replace(/\r/g, '').split('\n')) {
      const m = raw.match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/);
      if (m) items.push({ indent: m[1].replace(/\t/g, '    ').length, text: m[2] });
      else if (/^\s*#{1,6}\s+/.test(raw) && !items.length) items.push({ indent: -1, text: raw.replace(/^\s*#+\s+/, '') });
    }
    if (!items.length) return null;
    const node = (text) => {
      const ts = text.match(TS_RE);
      const t = ts ? ts[1].split(':').map(Number).reduce((a, b) => a * 60 + b, 0) : null;
      return { text: clean(text.replace(TS_RE, '')).replace(/[\s:·—-]+$/, ''), t, children: [] };
    };
    const root = { text: fallbackTitle, t: null, children: [] };
    const stack = [{ indent: -Infinity, node: root }];
    for (const it of items) {
      while (stack.length > 1 && it.indent <= stack[stack.length - 1].indent) stack.pop();
      const n = node(it.text);
      if (!n.text) continue;
      stack[stack.length - 1].node.children.push(n);
      stack.push({ indent: it.indent, node: n });
    }
    // Si hay un único elemento de primer nivel, ese es el tema central.
    const tree = root.children.length === 1 ? root.children[0] : root;
    const mark = (n, d, color) => {
      n.depth = d;
      n.color = color;
      n.collapsed = d >= 2 && n.children.length > 0;
      n.children.forEach((c, i) => mark(c, d + 1, d === 0 ? PALETTE[i % PALETTE.length] : color));
    };
    mark(tree, 0, PALETTE[0]);
    return tree.children.length ? tree : null;
  }

  let measureCtx = null;
  function measure(text, font) {
    measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
    measureCtx.font = font;
    return measureCtx.measureText(text).width;
  }

  function wrap(text, font, maxW) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (measure(next, font) <= maxW || !cur) cur = next;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 4).map((l, i, arr) => (i === 3 && arr.length === 4 && lines.length > 4 ? `${l}…` : l));
  }

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (t) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = String(Math.floor(t % 60)).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${String(m).padStart(2, '0')}:${s}`;
  };

  /** Calcula tamaños y posiciones de los nodos visibles. */
  function layout(tree) {
    const visible = [];
    const size = (n) => {
      const root = n.depth === 0;
      const font = `${root ? 600 : n.depth === 1 ? 500 : 400} ${root ? 14 : 12.5}px ${FONT}`;
      const maxW = root ? 150 : 170;
      n.font = font;
      n.lines = wrap(n.text, font, maxW);
      const textW = Math.max(...n.lines.map((l) => measure(l, font)), n.t != null ? measure(fmt(n.t), `500 11px ${FONT}`) : 0);
      n.w = Math.ceil(textW) + PAD_X * 2;
      n.h = n.lines.length * LH + (n.t != null ? 14 : 0) + PAD_Y * 2;
      visible.push(n);
      if (!n.collapsed) n.children.forEach(size);
    };
    size(tree);

    const colW = [];
    visible.forEach((n) => { colW[n.depth] = Math.max(colW[n.depth] || 0, n.w); });
    const colX = [16];
    for (let d = 1; d < colW.length; d++) colX[d] = colX[d - 1] + colW[d - 1] + TOGGLE + GAP_X;

    const subtree = (n) => {
      const kids = n.collapsed ? [] : n.children;
      const kidsH = kids.reduce((a, c) => a + subtree(c), 0) + Math.max(0, kids.length - 1) * GAP_Y;
      n.sh = Math.max(n.h, kidsH);
      n.kidsH = kidsH;
      return n.sh;
    };
    subtree(tree);
    const place = (n, top) => {
      n.x = colX[n.depth];
      n.y = top + n.sh / 2 - n.h / 2;
      if (n.collapsed) return;
      let cy = top + (n.sh - n.kidsH) / 2;
      for (const c of n.children) { place(c, cy); cy += c.sh + GAP_Y; }
    };
    place(tree, 16);
    const width = Math.max(...visible.map((n) => n.x + n.w + (n.children.length ? TOGGLE + 6 : 0))) + 16;
    const height = tree.sh + 32;
    return { visible, width, height };
  }

  /** Genera el SVG (con colores explícitos para que se pueda exportar tal cual). */
  function toSvg(tree, { dark = false } = {}) {
    const { visible, width, height } = layout(tree);
    const fg = dark ? '#f1f1f4' : '#17161d';
    const sub = dark ? '#b9b9c6' : '#55545f';
    const nodeBg = dark ? '#24242a' : '#ffffff';
    let edges = '';
    let nodes = '';
    visible.forEach((n, idx) => {
      n.idx = idx;
      const midY = n.y + n.h / 2;
      if (!n.collapsed) {
        for (const c of n.children) {
          const x1 = n.x + n.w + TOGGLE;
          const y2 = c.y + c.h / 2;
          const x2 = c.x;
          const dx = (x2 - x1) * 0.5;
          edges += `<path d="M${x1} ${midY} C${x1 + dx} ${midY}, ${x2 - dx} ${y2}, ${x2} ${y2}" fill="none" stroke="${c.color}" stroke-opacity="0.55" stroke-width="1.6"/>`;
        }
      }
      const root = n.depth === 0;
      const fill = root ? n.color : nodeBg;
      const textFill = root ? '#ffffff' : fg;
      const tint = root ? '' : `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="9" fill="${n.color}" fill-opacity="${dark ? 0.2 : 0.1}"/>`;
      const lines = n.lines.map((l, i) => `<tspan x="${n.x + PAD_X}" y="${n.y + PAD_Y + 12 + i * LH}">${esc(l)}</tspan>`).join('');
      const time = n.t != null
        ? `<text x="${n.x + PAD_X}" y="${n.y + PAD_Y + 12 + n.lines.length * LH}" font-family='${FONT}' font-size="11" font-weight="500" fill="${root ? '#ffffff' : n.color}">▶ ${fmt(n.t)}</text>`
        : '';
      nodes += `<g class="mm-node${n.t != null ? ' mm-seek' : ''}${n.children.length ? ' mm-has-kids' : ''}" data-idx="${idx}" style="cursor:pointer">
        <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="9" fill="${fill}" stroke="${n.color}" stroke-opacity="${root ? 1 : 0.6}" stroke-width="1.2"/>${tint}
        <text font-family='${FONT}' font-size="${root ? 14 : 12.5}" font-weight="${root ? 600 : n.depth === 1 ? 500 : 400}" fill="${textFill}">${lines}</text>${time}
      </g>`;
      if (n.children.length) {
        const cx = n.x + n.w + TOGGLE / 2 + 2;
        const chevron = n.collapsed ? `M${cx - 2} ${midY - 3.5} L${cx + 2} ${midY} L${cx - 2} ${midY + 3.5}` : `M${cx + 2} ${midY - 3.5} L${cx - 2} ${midY} L${cx + 2} ${midY + 3.5}`;
        nodes += `<g class="mm-toggle" data-idx="${idx}" style="cursor:pointer">
          <circle cx="${cx}" cy="${midY}" r="8" fill="${nodeBg}" stroke="${n.color}" stroke-width="1.2"/>
          <path d="${chevron}" fill="none" stroke="${n.color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
        if (n.collapsed) nodes += `<text x="${cx + 12}" y="${midY + 4}" font-family='${FONT}' font-size="10.5" fill="${sub}">${n.children.length}</text>`;
      }
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${edges}${nodes}</svg>`;
    return { svg, width, height, visible };
  }

  function setAll(n, collapsed) {
    if (n.depth > 0 && n.children.length) n.collapsed = collapsed;
    n.children.forEach((c) => setAll(c, collapsed));
  }

  /**
   * Monta el diagrama en `container`.
   * opts: { dark, onSeek(seconds), title, toolbar: true|false, onFullscreen }
   */
  function mount(container, tree, opts = {}) {
    let scale = null;
    container.innerHTML = '';
    container.classList.add('mm-wrap');
    const bar = document.createElement('div');
    bar.className = 'mm-bar';
    const I = (n) => SubmeIcons.icon(n);
    bar.innerHTML = `
      <button data-mm="expand" title="Expandir todo">Expandir</button>
      <button data-mm="collapse" title="Contraer todo">Contraer</button>
      <span class="mm-sep"></span>
      <button data-mm="zoomout" title="Alejar">−</button>
      <button data-mm="fit" title="Ajustar al ancho">Ajustar</button>
      <button data-mm="zoomin" title="Acercar">+</button>
      <span class="mm-sep"></span>
      ${opts.onFullscreen ? `<button data-mm="full" title="Pantalla completa">Ampliar</button>` : ''}
      <button data-mm="png" title="Descargar como imagen PNG">${I('download')}PNG</button>
      <button data-mm="svg" title="Descargar como SVG">${I('download')}SVG</button>`;
    const view = document.createElement('div');
    view.className = 'mm-view';
    container.append(bar, view);

    let current = null;
    const draw = () => {
      current = toSvg(tree, { dark: opts.dark });
      view.innerHTML = current.svg;
      const el = view.querySelector('svg');
      if (scale == null) {
        // Ajustar: en el panel, al ancho (máx. 100%); en pantalla completa, a todo el espacio (hasta 180%).
        const byW = (view.clientWidth - 8) / current.width;
        const byH = opts.fill ? (view.clientHeight - 8) / current.height : Infinity;
        scale = Math.min(opts.fill ? 1.8 : 1, byW, byH) || 1;
      }
      el.setAttribute('width', Math.round(current.width * scale));
      el.setAttribute('height', Math.round(current.height * scale));
    };

    view.addEventListener('click', (e) => {
      const tog = e.target.closest('.mm-toggle');
      const nodeEl = e.target.closest('.mm-node');
      const idx = Number((tog || nodeEl)?.dataset.idx);
      if (Number.isNaN(idx)) return;
      const n = current.visible[idx];
      if (!n) return;
      if (!tog && n.t != null && opts.onSeek) { opts.onSeek(n.t); return; }
      if (n.children.length && n.depth > 0) { n.collapsed = !n.collapsed; draw(); }
    });

    bar.addEventListener('click', async (e) => {
      const k = e.target.closest('[data-mm]')?.dataset.mm;
      if (!k) return;
      if (k === 'expand') { setAll(tree, false); draw(); }
      if (k === 'collapse') { setAll(tree, true); tree.children.forEach((c) => { c.collapsed = c.children.length > 0; }); draw(); }
      if (k === 'zoomin') { scale = Math.min(3, scale * 1.2); draw(); }
      if (k === 'zoomout') { scale = Math.max(0.3, scale / 1.2); draw(); }
      if (k === 'fit') { scale = null; draw(); }
      if (k === 'full') opts.onFullscreen?.();
      if (k === 'svg') download(new Blob([toSvg(tree, { dark: false }).svg], { type: 'image/svg+xml' }), 'svg');
      if (k === 'png') {
        try { download(await toPng(tree), 'png'); } catch { opts.onError?.('No se pudo generar el PNG en esta página. Descarga el SVG.'); }
      }
    });

    const download = (blob, ext) => {
      const name = `${(opts.title || 'mapa-mental').replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 100)} - mapa mental.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    };

    draw();
    return { redraw: draw };
  }

  async function toPng(tree) {
    const { svg, width, height } = toSvg(tree, { dark: false });
    const ratio = 2;
    const img = new Image();
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * ratio);
    canvas.height = Math.ceil(height * ratio);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(ratio, ratio);
    ctx.drawImage(img, 0, 0);
    return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('png'))), 'image/png'));
  }

  SN.mindmap = { parse, mount, toSvg, setAll };
})();
