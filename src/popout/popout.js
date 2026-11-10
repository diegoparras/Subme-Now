/* Subme Now — ventana aparte del navegador (redimensionable, se puede llevar a otro monitor).
 * Se conecta con la pestaña de YouTube para saltar en el video, seguir la reproducción y usar el chat.
 */
(async function () {
  const SN = globalThis.SubmeNow;
  const I = (n, c) => SubmeIcons.icon(n, c);
  const id = location.hash.slice(1);
  const data = (await chrome.storage.session.get(`popout:${id}`))[`popout:${id}`];
  const app = document.getElementById('app');
  const sh = app.attachShadow({ mode: 'open' });

  const CSS = `
:host { display: block; height: 100vh; }
.po { display: flex; flex-direction: column; height: 100vh; background: var(--sn-bg); color: var(--sn-fg); font-family: "Roboto", "Segoe UI", system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.5; }
.po-head { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--sn-border); background: linear-gradient(135deg, var(--sn-accent-soft), transparent 75%); }
.po-head .sn-logo { flex: none; }
.po-title { flex: 1; min-width: 0; }
.po-title b { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.po-title span { display: block; font-size: 12px; color: var(--sn-fg-2); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.po-status { font-size: 11.5px; color: var(--sn-fg-2); display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.po-status i { width: 8px; height: 8px; border-radius: 50%; background: #1f9d55; }
.po-status.off i { background: var(--sn-danger); }
.po-body { flex: 1; min-height: 0; overflow: auto; padding: 10px 16px 16px; }
.po-body > .mm-wrap { height: 100%; display: flex; flex-direction: column; }
.po-body > .mm-wrap .mm-view { flex: 1; max-height: none; display: grid; place-items: safe center; }
.po-empty { padding: 40px; text-align: center; color: var(--sn-fg-2); }
`;
  const darkPref = data?.theme?.dark ?? matchMedia('(prefers-color-scheme: dark)').matches;
  app.setAttribute('data-theme', darkPref ? 'dark' : 'light');
  if (data?.theme?.accent) { app.setAttribute('data-accent', ''); app.style.setProperty('--sn-user-accent', data.theme.accent); }
  document.documentElement.style.background = darkPref ? '#1b1b1f' : '#fff';

  if (!data) {
    sh.innerHTML = `<style>${SN.styles}${CSS}</style><div class="po"><div class="po-empty">Esta ventana ya no tiene contenido. Vuelve a abrirla desde Subme Now.</div></div>`;
    return;
  }

  const kindLabel = { result: data.action?.label || 'Resultado', transcript: 'Transcripción', chat: 'Chat' }[data.kind];
  const icon = { result: data.action?.icon || 'sparkles', transcript: 'transcript', chat: 'chat' }[data.kind];
  document.title = `${kindLabel} · ${data.video?.title || ''} — Subme Now`;
  sh.innerHTML = `<style>${SN.styles}${CSS}</style>
    <div class="po">
      <div class="po-head">
        <span class="sn-logo">S</span>
        <div class="po-title"><b>${SubmeUtils.escapeHtml(kindLabel)}</b><span>${SubmeUtils.escapeHtml(data.video?.title || '')}</span></div>
        <span class="po-status" title="Conexión con la pestaña de YouTube"><i></i><em>Conectado al video</em></span>
      </div>
      <div class="po-body"></div>
    </div>
    <div class="sn-toast" data-ref="toast"></div>`;
  const body = sh.querySelector('.po-body');
  const toastEl = sh.querySelector('[data-ref="toast"]');
  let toastTimer = null;
  const toast = (msg) => { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600); };

  // Conexión con la pestaña de YouTube.
  let port = null;
  const timeFns = new Set();
  let chatState = [];
  let chatCtl = null;
  const status = sh.querySelector('.po-status');
  const connect = () => {
    try {
      port = chrome.tabs.connect(data.tabId, { name: 'subme-popout' });
      status.classList.remove('off');
      status.querySelector('em').textContent = 'Conectado al video';
      port.onMessage.addListener((m) => {
        if (m.type === 'time') timeFns.forEach((fn) => fn(m.t));
        if (m.type === 'chat') { chatState = m.chat || []; chatCtl?.render(); }
      });
      port.onDisconnect.addListener(() => {
        port = null;
        status.classList.add('off');
        status.querySelector('em').textContent = 'Sin conexión con el video';
      });
    } catch {
      status.classList.add('off');
      status.querySelector('em').textContent = 'Sin conexión con el video';
    }
  };
  connect();
  const seek = (t) => {
    if (!port) connect();
    try { port?.postMessage({ type: 'seek', t }); } catch { toast('La pestaña de YouTube no está disponible'); }
  };

  body.addEventListener('click', (e) => {
    const ts = e.target.closest('a.sn-ts');
    if (ts) { e.preventDefault(); seek(Number(ts.dataset.t)); return; }
    const cc = e.target.closest('.sn-copy-code');
    if (cc) SubmeUtils.copyText(cc.parentElement.querySelector('code').textContent).then(() => toast('Copiado'));
  });

  if (data.kind === 'result') {
    const action = data.action || {};
    let done = false;
    if (action.view === 'structured') {
      const r = SN.views.render(body, action.id, data.text, { video: data.video, state: {}, toast, accent: data.theme?.accent || '#6d4aff' });
      if (r.ok) { done = true; if (r.controller?.onTime) timeFns.add(r.controller.onTime); }
    }
    if (!done && action.view === 'mindmap') {
      const tree = SN.mindmap.parse(data.text, data.video?.title);
      if (tree) {
        if (data.theme?.accent) tree.color = data.theme.accent;
        const mm = SN.mindmap.mount(body, tree, { fill: true, dark: darkPref, title: data.video?.title, onSeek: seek, onError: toast });
        let t = null;
        addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => mm.redraw(), 150); });
        done = true;
      }
    }
    if (!done) body.innerHTML = `<div class="vw md">${SubmeMarkdown.render(data.text)}</div>`;
  } else if (data.kind === 'transcript') {
    const ctl = SN.surfaces.transcript(body, { segments: data.segments || [], seek, autoScroll: data.autoScroll !== false });
    timeFns.add((t) => ctl.onTime(t));
  } else if (data.kind === 'chat') {
    body.style.overflow = 'hidden';
    chatCtl = SN.surfaces.chat(body, {
      getChat: () => chatState,
      send: (text) => { if (!port) connect(); try { port.postMessage({ type: 'chat', text }); } catch { toast('La pestaña de YouTube no está disponible'); } },
      suggestions: data.suggestions || [],
    });
    chatCtl.focus();
  }
})();
