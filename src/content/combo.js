/* Subme Now — desplegable con buscador.
 * Envuelve un <select> nativo (que sigue siendo la fuente de datos: value, options y el evento
 * "change" funcionan igual) y muestra en su lugar un botón que abre una lista filtrable.
 */
(function () {
  const SN = (globalThis.SubmeNow = globalThis.SubmeNow || {});
  const U = SubmeUtils;
  const I = (n, c) => SubmeIcons.icon(n, c);
  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function enhance(select, { placeholder = 'Buscar…' } = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'sn-combo';
    wrap.innerHTML = `<button type="button" class="sn-select sn-combo-btn" aria-haspopup="listbox" aria-expanded="false"><span class="sn-combo-label"></span>${I('chevronDown', 'sn-i-sm')}</button>
      <div class="sn-combo-pop" hidden>
        <div class="sn-combo-search">${I('search')}<input type="search" placeholder="${U.escapeHtml(placeholder)}" autocomplete="off" spellcheck="false"></div>
        <div class="sn-combo-list" role="listbox"></div>
      </div>`;
    select.before(wrap);
    wrap.appendChild(select);
    select.classList.add('sn-combo-native');
    select.tabIndex = -1;
    if (select.title) wrap.querySelector('.sn-combo-btn').title = select.title;

    const btn = wrap.querySelector('.sn-combo-btn');
    const label = wrap.querySelector('.sn-combo-label');
    const pop = wrap.querySelector('.sn-combo-pop');
    const input = wrap.querySelector('input');
    const list = wrap.querySelector('.sn-combo-list');
    let active = -1;

    const refresh = () => {
      label.textContent = select.options[select.selectedIndex]?.textContent || '';
      btn.disabled = select.options.length <= 1;
    };
    // La lista se reconstruye con innerHTML y el valor se fija por código: ambos actualizan el botón.
    new MutationObserver(refresh).observe(select, { childList: true, subtree: true, characterData: true });
    for (const prop of ['value', 'selectedIndex']) {
      const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, prop);
      Object.defineProperty(select, prop, { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, v); refresh(); } });
    }

    const items = () => [...list.querySelectorAll('.sn-combo-opt')];
    const setActive = (i) => {
      const all = items();
      if (!all.length) { active = -1; return; }
      active = Math.max(0, Math.min(all.length - 1, i));
      all.forEach((el, k) => el.classList.toggle('active', k === active));
      all[active].scrollIntoView({ block: 'nearest' });
    };

    const render = () => {
      const q = fold(input.value.trim());
      let html = '';
      let lastGroup = null;
      let n = 0;
      [...select.options].forEach((o, i) => {
        if (!o.value && select.options.length > 1 && !o.selected) return; // opciones vacías de relleno
        const text = o.textContent;
        if (q && !fold(text).includes(q)) return;
        const group = o.parentElement?.tagName === 'OPTGROUP' ? o.parentElement.label : '';
        if (group !== lastGroup) {
          if (group) html += `<div class="sn-combo-group">${U.escapeHtml(group)}</div>`;
          lastGroup = group;
        }
        html += `<div class="sn-combo-opt${o.selected ? ' selected' : ''}" role="option" data-i="${i}" aria-selected="${o.selected}">${U.escapeHtml(text)}${o.selected ? I('check') : ''}</div>`;
        n++;
      });
      list.innerHTML = html || '<div class="sn-combo-empty">Sin coincidencias</div>';
      const sel = items().findIndex((el) => el.classList.contains('selected'));
      setActive(q ? 0 : sel);
      return n;
    };

    const open = () => {
      if (btn.disabled) return;
      pop.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      input.value = '';
      render();
      setTimeout(() => input.focus({ preventScroll: true }), 0);
    };
    const close = () => {
      pop.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    };
    const choose = (i) => {
      close();
      if (Number(i) === select.selectedIndex) return;
      select.selectedIndex = Number(i);
      select.dispatchEvent(new Event('change', { bubbles: true }));
      btn.focus({ preventScroll: true });
    };

    btn.addEventListener('click', (e) => { e.stopPropagation(); if (pop.hidden) open(); else close(); });
    input.addEventListener('input', render);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); const el = items()[active]; if (el) choose(el.dataset.i); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); btn.focus({ preventScroll: true }); }
    });
    list.addEventListener('mousedown', (e) => e.preventDefault()); // no perder el foco del buscador
    list.addEventListener('click', (e) => { const el = e.target.closest('.sn-combo-opt'); if (el) { e.stopPropagation(); choose(el.dataset.i); } });
    pop.addEventListener('click', (e) => e.stopPropagation());
    // Cerrar al hacer clic fuera (dentro del mismo Shadow DOM o en la página).
    const root = wrap.getRootNode();
    const outside = (e) => { if (!pop.hidden && !e.composedPath().includes(wrap)) close(); };
    root.addEventListener('click', outside);
    if (root !== document) document.addEventListener('click', outside);

    refresh();
    return { refresh, open, close };
  }

  SN.combo = { enhance };

  SN.styles = `${SN.styles || ''}
.sn-combo { position: relative; flex: 1 1 160px; min-width: 0; display: flex; }
.sn-combo-native { display: none !important; }
.sn-combo-btn { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; text-align: left; cursor: pointer; }
.sn-combo-btn:disabled { cursor: default; opacity: .85; }
.sn-combo-btn:disabled .sn-i { display: none; }
.sn-combo-label { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.sn-combo-pop { position: absolute; z-index: 40; top: calc(100% + 4px); left: 0; width: max(100%, 240px); max-width: calc(100vw - 24px);
  background: var(--sn-bg); border: 1px solid var(--sn-border); border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,.18); padding: 6px; }
.sn-combo-search { display: flex; align-items: center; gap: 6px; padding: 0 8px; border: 1px solid var(--sn-border); border-radius: 8px; background: var(--sn-bg-2); }
.sn-combo-search:focus-within { border-color: var(--sn-accent); }
.sn-combo-search .sn-i { color: var(--sn-fg-2); }
.sn-combo-search input { flex: 1; min-width: 0; border: 0; background: transparent; outline: none; padding: 6px 0; }
.sn-combo-list { max-height: 260px; overflow-y: auto; margin-top: 6px; }
.sn-combo-group { font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--sn-fg-2); padding: 8px 8px 4px; }
.sn-combo-opt { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px; border-radius: 7px; cursor: pointer; }
.sn-combo-opt.active { background: var(--sn-bg-3); }
.sn-combo-opt.selected { color: var(--sn-accent); font-weight: 600; }
.sn-combo-opt .sn-i { color: var(--sn-accent); }
.sn-combo-empty { padding: 10px 8px; color: var(--sn-fg-2); font-size: 13px; }
`;
})();
