/* Subme Now — estilos del panel (se inyectan dentro de un Shadow DOM para no chocar con YouTube). */
(function () {
  const SN = (globalThis.SubmeNow = globalThis.SubmeNow || {});
  SN.styles = `
:host {
  all: initial;
  display: block;
  margin: 0 0 16px;
  --sn-bg: #ffffff;
  --sn-bg-2: #f6f6f8;
  --sn-bg-3: #ececf1;
  --sn-fg: #0f0f12;
  --sn-fg-2: #55565f;
  --sn-border: #e2e2e8;
  --sn-accent: #6d4aff;
  --sn-accent-2: #ff3d7f;
  --sn-accent-soft: rgba(109, 74, 255, 0.10);
  --sn-hl: rgba(255, 196, 0, 0.45);
  --sn-danger: #d93025;
  --sn-radius: 12px;
  font-family: "Roboto", "Segoe UI", system-ui, -apple-system, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--sn-fg);
}
:host([data-theme="dark"]) {
  --sn-bg: #1b1b1f;
  --sn-bg-2: #24242a;
  --sn-bg-3: #2f2f37;
  --sn-fg: #f1f1f4;
  --sn-fg-2: #a9a9b5;
  --sn-border: #34343d;
  --sn-accent: #9b85ff;
  --sn-accent-soft: rgba(155, 133, 255, 0.16);
  --sn-hl: rgba(255, 196, 0, 0.30);
  --sn-danger: #ff6b5e;
}
/* Color de acento elegido por el usuario (Configuración → Color de la interfaz) */
:host([data-accent]) {
  --sn-accent: var(--sn-user-accent);
  --sn-accent-soft: color-mix(in srgb, var(--sn-user-accent) 11%, transparent);
}
:host([data-accent][data-theme="dark"]) {
  --sn-accent: color-mix(in srgb, var(--sn-user-accent) 72%, white);
  --sn-accent-soft: color-mix(in srgb, var(--sn-user-accent) 22%, transparent);
}
/* Modo flotante (YouTube Shorts) */
:host([data-mode="float"]) {
  position: fixed; top: 72px; right: 16px; z-index: 2100; width: 380px; max-width: calc(100vw - 32px); margin: 0;
}
:host([data-mode="float"]) .sn-root { box-shadow: 0 10px 32px rgba(0,0,0,.28); }
:host([data-mode="float"]) .sn-body { max-height: calc(100vh - 150px); overflow-y: auto; }
:host([data-mode="float"]) .sn-segments, :host([data-mode="float"]) .sn-chat-log { max-height: 46vh; }
:host([data-mode="float"]) .sn-output { max-height: none; }
:host([data-mode="float"]) .sn-root.collapsed { width: max-content; margin-left: auto; }
* { box-sizing: border-box; }
.sn-i { width: 16px; height: 16px; flex: none; vertical-align: -3px; }
.sn-i-sm { width: 13px; height: 13px; opacity: .7; }
.sn-icon-btn .sn-i { width: 17px; height: 17px; }
.sn-tab { display: inline-flex; align-items: center; gap: 6px; }
.sn-output-title { display: inline-flex; align-items: center; gap: 7px; }
.sn-output-title .sn-i { color: var(--sn-accent); }
.sn-notice .sn-i, .sn-info .sn-i { color: var(--sn-accent); margin-right: 2px; }
.sn-error .sn-i, .sn-status.error .sn-i { margin-right: 4px; }
[hidden] { display: none !important; }
button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }

.sn-root {
  background: var(--sn-bg);
  border: 1px solid var(--sn-border);
  border-radius: var(--sn-radius);
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0,0,0,.04);
}
.sn-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px;
  background: linear-gradient(135deg, var(--sn-accent-soft), transparent 70%);
  border-bottom: 1px solid var(--sn-border);
  cursor: pointer; user-select: none;
}
.sn-root.collapsed .sn-header { border-bottom: 0; }
.sn-brand { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; }
.sn-logo {
  width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center;
  background: linear-gradient(135deg, var(--sn-accent), var(--sn-accent-2)); color: #fff; font-size: 13px; font-weight: 800;
}
.sn-sub { font-weight: 400; color: var(--sn-fg-2); font-size: 12px; }
.sn-header-actions { display: flex; gap: 4px; }
.sn-icon-btn {
  border: 0; background: transparent; width: 30px; height: 30px; border-radius: 8px;
  display: grid; place-items: center; color: var(--sn-fg-2); font-size: 15px;
}
.sn-icon-btn:hover { background: var(--sn-bg-3); color: var(--sn-fg); }
.sn-root.collapsed .sn-chevron { transform: rotate(-90deg); }
.sn-chevron { transition: transform .15s; }

.sn-tabs { display: flex; gap: 4px; padding: 8px 10px 0; border-bottom: 1px solid var(--sn-border); }
.sn-tab {
  border: 0; background: transparent; padding: 8px 12px; border-radius: 8px 8px 0 0;
  color: var(--sn-fg-2); font-weight: 500; border-bottom: 2px solid transparent; margin-bottom: -1px;
}
.sn-tab:hover { color: var(--sn-fg); background: var(--sn-bg-2); }
.sn-tab.active { color: var(--sn-accent); border-bottom-color: var(--sn-accent); }

.sn-pane { padding: 10px 12px 12px; }
.sn-toolbar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 8px; }
.sn-input, .sn-select, .sn-textarea {
  background: var(--sn-bg-2); border: 1px solid var(--sn-border); border-radius: 8px; padding: 6px 9px; outline: none;
}
.sn-input:focus, .sn-select:focus, .sn-textarea:focus { border-color: var(--sn-accent); }
.sn-select { max-width: 100%; flex: 1 1 160px; min-width: 0; }
.sn-search { flex: 1 1 120px; min-width: 0; }
.sn-btn {
  border: 1px solid var(--sn-border); background: var(--sn-bg-2); border-radius: 8px; padding: 6px 10px;
  display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;
}
.sn-btn:hover { background: var(--sn-bg-3); }
.sn-btn.on { background: var(--sn-accent-soft); border-color: var(--sn-accent); color: var(--sn-accent); }
.sn-btn.primary { background: var(--sn-accent); border-color: var(--sn-accent); color: #fff; }
.sn-btn.primary:hover { filter: brightness(1.08); }
.sn-btn:disabled { opacity: .5; cursor: default; }

.sn-dropdown { position: relative; }
.sn-menu {
  position: absolute; right: 0; top: calc(100% + 4px); z-index: 10; min-width: 170px;
  background: var(--sn-bg); border: 1px solid var(--sn-border); border-radius: 10px; padding: 4px;
  box-shadow: 0 8px 24px rgba(0,0,0,.18);
}
.sn-menu button { display: block; width: 100%; text-align: left; border: 0; background: transparent; padding: 7px 10px; border-radius: 7px; }
.sn-menu button:hover { background: var(--sn-bg-3); }

.sn-status { color: var(--sn-fg-2); font-size: 13px; padding: 6px 2px; }
.sn-status.error { color: var(--sn-danger); }
.sn-info { background: var(--sn-bg-2); border: 1px solid var(--sn-border); border-radius: 10px; padding: 10px 12px; color: var(--sn-fg); }
.sn-info-sub { color: var(--sn-fg-2); font-size: 12.5px; margin-top: 4px; }
.sn-detail { margin-top: 6px; color: var(--sn-fg-2); font-size: 12px; }
.sn-detail summary { cursor: pointer; }
.sn-meta { color: var(--sn-fg-2); font-size: 12px; margin: 0 2px 6px; display: flex; justify-content: space-between; gap: 8px; }

.sn-segments { max-height: 440px; overflow-y: auto; border-radius: 8px; scroll-behavior: auto; }
.sn-seg { display: flex; gap: 10px; padding: 5px 8px; border-radius: 8px; cursor: pointer; }
.sn-seg:hover { background: var(--sn-bg-2); }
.sn-seg.current { background: var(--sn-accent-soft); }
.sn-seg-ts { color: var(--sn-accent); font-variant-numeric: tabular-nums; font-size: 12.5px; min-width: 42px; padding-top: 1px; font-weight: 500; }
.sn-seg-text { flex: 1; }
mark { background: var(--sn-hl); color: inherit; border-radius: 3px; padding: 0 1px; }

.sn-modelbar { display: flex; gap: 6px; padding: 8px 12px 0; align-items: center; }
.sn-mini { padding: 5px 8px; font-size: 12.5px; }
.sn-modelbar .sn-select { flex: 0 1 auto; min-width: 0; max-width: 34%; }
.sn-modelbar .sn-model { flex: 1 1 auto; min-width: 0; }
.sn-provider { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12.5px; color: var(--sn-fg-2); margin-bottom: 10px; }
.sn-provider b { color: var(--sn-fg); font-weight: 500; }
.sn-link { border: 0; background: none; color: var(--sn-accent); padding: 0; font-size: 12.5px; }
.sn-link:hover { text-decoration: underline; }
.sn-notice {
  background: var(--sn-accent-soft); border: 1px solid var(--sn-accent); border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; font-size: 13px;
}

.sn-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 6px; }
.sn-action {
  border: 1px solid var(--sn-border); background: var(--sn-bg-2); border-radius: 10px; padding: 8px 9px; text-align: left;
  display: flex; flex-direction: column; gap: 1px; min-height: 36px; justify-content: center;
}
.sn-action:hover { border-color: var(--sn-accent); background: var(--sn-accent-soft); }
.sn-action.active { border-color: var(--sn-accent); box-shadow: inset 0 0 0 1px var(--sn-accent); }
.sn-action-label { font-weight: 500; font-size: 13px; display: flex; align-items: center; gap: 7px; }
.sn-action-label .sn-i { color: var(--sn-accent); width: 15px; height: 15px; }
.sn-action-desc { display: none; }
.sn-action-done { color: var(--sn-accent); font-size: 11px; margin-left: 2px; }

.sn-free { display: flex; gap: 6px; margin-top: 10px; }
.sn-textarea { flex: 1; resize: vertical; min-height: 38px; max-height: 160px; }

.sn-output-wrap { margin-top: 12px; border: 1px solid var(--sn-border); border-radius: 10px; }
.sn-output-head {
  display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 6px 8px 6px 12px;
  background: var(--sn-bg-2); border-bottom: 1px solid var(--sn-border); border-radius: 10px 10px 0 0;
}
.sn-output-title { font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sn-output-tools { display: flex; gap: 2px; flex-shrink: 0; }
.sn-output { padding: 4px 14px 12px; max-height: 560px; overflow-y: auto; }
.sn-progress { font-size: 12.5px; color: var(--sn-fg-2); padding: 8px 0; display: flex; align-items: center; gap: 8px; }
.sn-spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--sn-border); border-top-color: var(--sn-accent); animation: sn-spin .8s linear infinite; }
@keyframes sn-spin { to { transform: rotate(360deg); } }
.sn-error { color: var(--sn-danger); padding: 10px 0; white-space: pre-wrap; }
.sn-foot-note { font-size: 12px; color: var(--sn-fg-2); padding-top: 8px; border-top: 1px dashed var(--sn-border); margin-top: 8px; }

/* Markdown */
.md { word-wrap: break-word; }
.md h2, .md h3, .md h4, .md h5, .md h6, .md h7 { margin: 14px 0 6px; line-height: 1.3; }
.md h2 { font-size: 17px; } .md h3 { font-size: 15.5px; } .md h4, .md h5, .md h6 { font-size: 14px; }
.md p { margin: 8px 0; }
.md ul, .md ol { margin: 6px 0; padding-left: 22px; }
.md li { margin: 3px 0; }
.md blockquote { margin: 8px 0; padding: 6px 12px; border-left: 3px solid var(--sn-accent); background: var(--sn-bg-2); border-radius: 0 8px 8px 0; }
.md code { background: var(--sn-bg-3); padding: 1px 5px; border-radius: 5px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12.5px; }
.md .sn-code { position: relative; margin: 8px 0; }
.md pre { background: var(--sn-bg-2); border: 1px solid var(--sn-border); padding: 10px 12px; border-radius: 8px; overflow-x: auto; margin: 0; }
.md pre code { background: none; padding: 0; white-space: pre; }
.md .sn-copy-code { position: absolute; top: 6px; right: 6px; font-size: 11px; border: 1px solid var(--sn-border); background: var(--sn-bg); border-radius: 6px; padding: 2px 7px; opacity: .85; }
.md hr { border: 0; border-top: 1px solid var(--sn-border); margin: 12px 0; }
.md a { color: var(--sn-accent); }
.md .sn-table { overflow-x: auto; margin: 8px 0; }
.md table { border-collapse: collapse; font-size: 13px; }
.md th, .md td { border: 1px solid var(--sn-border); padding: 5px 8px; text-align: left; vertical-align: top; }
.md th { background: var(--sn-bg-2); }
a.sn-ts {
  color: var(--sn-accent); background: var(--sn-accent-soft); padding: 0 5px; border-radius: 5px; text-decoration: none;
  font-variant-numeric: tabular-nums; font-size: .92em; font-weight: 500; white-space: nowrap;
}
a.sn-ts:hover { text-decoration: underline; }

/* Lectura en voz alta */
.sn-tts { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-bottom: 1px solid var(--sn-border); background: var(--sn-accent-soft); }
.sn-tts .sn-icon-btn { width: 28px; height: 28px; color: var(--sn-accent); }
.sn-tts-progress { font-size: 12px; color: var(--sn-fg-2); flex: 1; white-space: nowrap; }
.sn-tts .sn-select { flex: 0 1 auto; max-width: 42%; }
.sn-reading { background: var(--sn-accent-soft); border-radius: 6px; box-shadow: 0 0 0 3px var(--sn-accent-soft); }

/* Menú Exportar */
.sn-output-tools .sn-menu { min-width: 250px; }
.sn-menu button { display: flex; align-items: center; gap: 8px; }
.sn-menu button .sn-i { color: var(--sn-accent); }
.sn-menu button small { color: var(--sn-fg-2); font-size: 11px; margin-left: auto; }

/* Mapa mental */
.mm-switch { display: inline-flex; border: 1px solid var(--sn-border); border-radius: 8px; overflow: hidden; margin: 8px 0; }
.mm-switch button { border: 0; background: transparent; padding: 4px 12px; font-size: 12.5px; color: var(--sn-fg-2); }
.mm-switch button.on { background: var(--sn-accent-soft); color: var(--sn-accent); font-weight: 500; }
.mm-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-bottom: 6px; }
.mm-bar button { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--sn-border); background: var(--sn-bg-2); border-radius: 7px; padding: 3px 8px; font-size: 12px; color: var(--sn-fg); }
.mm-bar button:hover { border-color: var(--sn-accent); color: var(--sn-accent); }
.mm-bar .sn-i { width: 13px; height: 13px; }
.mm-sep { width: 1px; height: 16px; background: var(--sn-border); margin: 0 2px; }
.mm-view { overflow: auto; max-height: 520px; border: 1px solid var(--sn-border); border-radius: 10px; background: var(--sn-bg); padding: 2px; }
.mm-view svg { display: block; }
.mm-node:hover rect:first-child { stroke-width: 2; }
.mm-dialog {
  border: 0; padding: 0; margin: auto; background: transparent; color: var(--sn-fg);
  width: min(1400px, calc(100vw - 32px)); height: calc(100vh - 32px); max-width: none; max-height: none; overflow: visible;
  font-family: "Roboto", "Segoe UI", system-ui, -apple-system, sans-serif; font-size: 14px;
}
.mm-dialog::backdrop { background: rgba(10, 10, 14, .6); }
.mm-dialog .mm-close { gap: 6px; }
.mm-overlay-card { background: var(--sn-bg); border: 1px solid var(--sn-border); border-radius: 14px; width: 100%; height: 100%; display: flex; flex-direction: column; padding: 12px 14px; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
.mm-overlay-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.mm-overlay-body { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.mm-overlay-body .mm-view { flex: 1; max-height: none; display: grid; place-items: safe center; }

/* Chat */
.sn-chat-log { max-height: 440px; min-height: 120px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 2px; }
.sn-msg { padding: 8px 12px; border-radius: 12px; max-width: 92%; }
.sn-msg.user { align-self: flex-end; background: var(--sn-accent); color: #fff; border-bottom-right-radius: 4px; white-space: pre-wrap; }
.sn-msg.assistant { align-self: flex-start; background: var(--sn-bg-2); border: 1px solid var(--sn-border); border-bottom-left-radius: 4px; }
.sn-msg.assistant > :first-child { margin-top: 0; }
.sn-msg.assistant > :last-child { margin-bottom: 0; }
.sn-chat-empty { color: var(--sn-fg-2); font-size: 13px; text-align: center; padding: 18px 8px 6px; }
.sn-suggestions { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.sn-chip { border: 1px solid var(--sn-border); background: var(--sn-bg-2); border-radius: 999px; padding: 4px 10px; font-size: 12.5px; }
.sn-chip:hover { border-color: var(--sn-accent); color: var(--sn-accent); }
.sn-chat-form { display: flex; gap: 6px; align-items: flex-end; margin-top: 8px; }
.sn-chat-tools { display: flex; justify-content: flex-end; margin-top: 4px; }

.sn-toast {
  position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%);
  background: var(--sn-fg); color: var(--sn-bg); padding: 6px 12px; border-radius: 8px; font-size: 12.5px; pointer-events: none;
  opacity: 0; transition: opacity .15s;
}
.sn-toast.show { opacity: .95; }
.sn-wrap { position: relative; }
`;
})();
