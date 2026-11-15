/**
 * Video de LinkedIn de Subme Now (1080×1350, 30 fps, ~44 s), hecho con código.
 * Cada fotograma se dibuja en HTML con las capturas reales de scripts/linkedin-captures.mjs,
 * sincronizado con la música de scripts/linkedin-music.py (120 BPM), y se codifica con ffmpeg.
 *
 *   node scripts/linkedin-video.mjs
 *
 * Salida: marketing/linkedin-v17/subme-now-video.mp4 y portada-video.png
 */
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'marketing', 'linkedin-v17');
const CAP = path.join(OUT, 'capturas');
const MUSIC = path.join(OUT, 'musica.wav');
const FPS = 30;
const DURATION = 44;
const W = 1080;
const H = 1350;

if (!fs.existsSync(path.join(CAP, 'panel-resumen.png'))) throw new Error('Faltan las capturas: ejecuta primero node scripts/linkedin-captures.mjs');
if (!fs.existsSync(MUSIC)) execFileSync('python3', [path.join(ROOT, 'scripts/linkedin-music.py'), MUSIC], { stdio: 'inherit' });

const iconSandbox = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src/shared/icons.js'), 'utf8'), { globalThis: iconSandbox });
const I = (n, s = 28) => iconSandbox.SubmeIcons.icon(n).replace('width="16" height="16"', `width="${s}" height="${s}"`);
const cap = (f) => `capturas/${f}`;
fs.copyFileSync(path.join(ROOT, 'icons/icon128.png'), path.join(OUT, 'capturas', 'logo.png'));
const storeBtn = JSON.parse(fs.readFileSync(path.join(CAP, 'tienda-recorte.json'), 'utf8'));

/* ---------- escenas (segundos; 1 compás = 2 s) ---------- */
const feature = (chip, icon, title, visual) => `
  <div class="chip" data-in="0" data-fx="down">${I(icon, 26)}${chip}</div>
  <h2 class="title" data-in="0.08" data-fx="up">${title}</h2>
  ${visual}`;

const SCENES = [
  { start: 0, end: 2, cls: 'hook', html: `
    <div class="big">
      <span class="w" data-in="0.05" data-fx="pop">¿Cuántos</span> <span class="w" data-in="0.3" data-fx="pop">videos</span>
      <span class="w" data-in="0.55" data-fx="pop">tenés</span> <span class="w" data-in="0.8" data-fx="pop">en</span><br>
      <span class="w hl" data-in="1.05" data-fx="zoom">“Ver más tarde”?</span>
    </div>
    <div class="queue">${Array.from({ length: 9 }, (_, i) => `<div class="qitem" data-in="${0.1 + i * 0.12}" data-fx="left"><i></i><b></b><span>${['42:18', '1:05:33', '27:40', '58:02', '33:15', '1:12:09', '45:51', '19:27', '51:36'][i]}</span></div>`).join('')}</div>` },
  { start: 2, end: 4, cls: 'hook', html: `
    <div class="big center">
      <span class="w" data-in="0" data-fx="pop">Spoiler:</span><br>
      <span class="w strike" data-in="0.45" data-fx="pop">no los vas</span><br><span class="w strike" data-in="0.7" data-fx="pop">a ver.</span>
    </div>
    <div class="sub center" data-in="1.25" data-fx="up">Hasta hoy.</div>` },
  { start: 4, end: 6, cls: 'logo-scene', html: `
    <div class="burst" data-in="0" data-fx="zoom"></div>
    <img class="biglogo beat" src="${cap('logo.png')}" data-in="0" data-fx="pop">
    <div class="brand" data-in="0.25" data-fx="up">Subme Now</div>
    <div class="tag" data-in="0.5" data-fx="up">Tu asistente de IA <em>dentro de YouTube</em></div>` },
  { start: 6, end: 10, html: feature('Resumen', 'summary', '40 minutos de video.<br><em>Entendidos en 30 segundos.</em>',
    `<img class="panel" src="${cap('panel-resumen.png')}" data-in="0.2" data-fx="rise" data-kb="1 1.05">
     <div class="badge" style="left:90px;top:640px" data-in="1.2" data-fx="pop">${I('clock', 30)}40:00 → 0:30</div>`) },
  { start: 10, end: 14, html: feature('Saltar lo que sobra', 'scissors', 'Saltea patrocinios, intros y relleno.<br><em>Solo.</em>',
    `<div class="frame video-frame" data-in="0.15" data-fx="rise"><img src="${cap('video-saltar.png')}" data-kb="1 1.18" style="transform-origin:20% 85%"></div>
     <img class="panel small" src="${cap('panel-saltar.png')}" style="right:60px;top:860px" data-in="1.0" data-fx="right">`) },
  { start: 14, end: 18, html: feature('Modo estudio', 'graduation', 'El video se pausa<br><em>y te toma examen.</em>',
    `<div class="frame video-frame" data-in="0.15" data-fx="rise"><img src="${cap('video-estudio.png')}"><img class="swap" src="${cap('video-estudio-correcto.png')}" data-in="2.4" data-fx="fade"></div>
     <div class="badge" style="left:90px;top:1080px" data-in="2.5" data-fx="pop">${I('check', 30)}¡Correcto!</div>`) },
  { start: 18, end: 22, html: feature('Leer la pantalla', 'camera', 'Capturá lo que se ve.<br><em>La IA lo lee y te lo explica.</em>',
    `<img class="panel" src="${cap('panel-leer-pantalla.png')}" data-in="0.2" data-fx="rise" data-kb="1 1.04">
     <div class="flash-cam" data-in="0.05" data-fx="flash"></div>`) },
  { start: 22, end: 24, html: feature('Subtítulos dobles', 'subtitles', 'Dos idiomas<br><em>al mismo tiempo.</em>',
    `<div class="frame video-frame" data-in="0.1" data-fx="rise"><img src="${cap('video-subtitulos.png')}" data-kb="1.02 1.1" style="transform-origin:50% 75%"></div>`) },
  { start: 24, end: 26, html: feature('Podcast', 'headphones', 'Escuchalo<br><em>como un podcast.</em>',
    `<img class="panel" src="${cap('panel-podcast.png')}" data-in="0.1" data-fx="rise">`) },
  { start: 26, end: 30, html: feature('Tu segundo cerebro', 'library', 'Preguntale a todo<br><em>lo que viste.</em>',
    `<div class="frame wide" data-in="0.15" data-fx="rise"><img src="${cap('biblioteca-preguntar.png')}" data-kb="1 1.06" style="transform-origin:50% 30%"></div>`) },
  { start: 30, end: 32.667, cls: 'install', html: `
    <div class="kicker" data-in="0" data-fx="down">Cómo tenerlo · 1 minuto</div>
    <h2 class="title step"><span class="n">1</span><span data-in="0.05" data-fx="up">Entrá a la Chrome Web Store</span></h2>
    <div class="frame store" data-in="0.15" data-fx="rise"><img src="${cap('tienda-recorte.png')}">
      <div class="ring" style="left:${(storeBtn.button.x / storeBtn.width) * 100}%;top:${(storeBtn.button.y / storeBtn.height) * 100}%;width:${(storeBtn.button.w / storeBtn.width) * 100}%;height:${(storeBtn.button.h / storeBtn.height) * 100}%" data-in="1.3" data-fx="ring"></div>
      <div class="cursor" data-path="20,95,${((storeBtn.button.x + storeBtn.button.w / 2) / storeBtn.width) * 100},${((storeBtn.button.y + storeBtn.button.h / 2) / storeBtn.height) * 100}" data-in="0.35" data-dur="0.9"><svg width="58" height="58" viewBox="0 0 24 24"><path d="M4 2.5 19.5 12l-7 1.6 3.9 7.4-3 1.5-3.9-7.4L4 20z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg></div>
    </div>
    <div class="hint" data-in="1.4" data-fx="up">Tocá <b>“Añadir a Chrome”</b></div>` },
  { start: 32.667, end: 35.333, cls: 'install', html: `
    <div class="kicker">Cómo tenerlo · 1 minuto</div>
    <h2 class="title step"><span class="n">2</span><span data-in="0.05" data-fx="up">Pegá tu clave de IA</span></h2>
    <div class="frame key" data-in="0.15" data-fx="rise"><img src="${cap('opciones-clave.png')}" data-kb="1 1.12" style="transform-origin:40% 75%"></div>
    <div class="hint" data-in="1.0" data-fx="up">OpenAI, Claude, Gemini, Grok… <b>la tuya</b>.<br>La transcripción funciona sin clave.</div>` },
  { start: 35.333, end: 38, cls: 'install', html: `
    <div class="kicker">Cómo tenerlo · 1 minuto</div>
    <h2 class="title step"><span class="n">3</span><span data-in="0.05" data-fx="up">Abrí cualquier video</span></h2>
    <div class="frame wide page" data-in="0.15" data-fx="rise"><img src="${cap('pagina-completa.png')}" data-kb="1 1.08" style="transform-origin:85% 20%"></div>
    <div class="hint" data-in="1.0" data-fx="up">Subme Now aparece al lado. <b>Listo.</b></div>` },
  { start: 38, end: 44, cls: 'cta', html: `
    <div class="burst" data-in="0" data-fx="zoom"></div>
    <img class="biglogo beat" src="${cap('logo.png')}" data-in="0" data-fx="pop">
    <div class="brand" data-in="0.2" data-fx="up">Subme Now</div>
    <div class="tag" data-in="0.4" data-fx="up">Gratis · Código abierto · Con tu propia IA</div>
    <div class="pills">${[['summary', 'Resúmenes'], ['scissors', 'Saltar relleno'], ['graduation', 'Modo estudio'], ['camera', 'Leer la pantalla'], ['subtitles', 'Subtítulos dobles'], ['headphones', 'Podcast'], ['library', 'Biblioteca']].map(([i, t], k) => `<span data-in="${0.6 + k * 0.12}" data-fx="pop">${I(i, 26)}${t}</span>`).join('')}</div>
    <div class="store-cta beat" data-in="1.6" data-fx="pop">${I('search', 36)}Buscá <b>Subme Now</b><br>en la Chrome Web Store</div>
    <div class="link-hint" data-in="2.2" data-fx="up">Link en los comentarios ${I('chevronDown', 34)}</div>` },
];

const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&display=swap');
* { box-sizing: border-box; margin: 0; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #07050f; }
body { font-family: Inter, system-ui, sans-serif; color: #fff; }
#bg { position: absolute; inset: 0; background: radial-gradient(1200px 900px at 20% 0%, #2c1d78 0%, #120d2b 45%, #07050f 100%); }
.blob { position: absolute; border-radius: 50%; filter: blur(90px); opacity: .55; }
.b1 { width: 700px; height: 700px; background: #6d4aff; }
.b2 { width: 620px; height: 620px; background: #ff3d7f; }
.b3 { width: 520px; height: 520px; background: #00c2ff; opacity: .25; }
#grain { position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,.06) 1px, transparent 1px); background-size: 6px 6px; opacity: .35; }
#flash { position: absolute; inset: 0; background: #fff; opacity: 0; z-index: 50; pointer-events: none; }
#bar { position: absolute; left: 0; top: 0; height: 10px; z-index: 40; background: linear-gradient(90deg, #7c5cff, #ff3d7f); box-shadow: 0 0 20px #ff3d7f; }
#foot { position: absolute; left: 56px; right: 56px; bottom: 40px; display: flex; align-items: center; gap: 14px; z-index: 40; font-weight: 700; font-size: 26px; opacity: .9; }
#foot img { width: 44px; height: 44px; border-radius: 12px; }
#foot span { margin-left: auto; font-weight: 600; font-size: 22px; opacity: .7; }
.scene { position: absolute; inset: 0; display: none; padding: 0 64px; }
.scene.on { display: block; }
.chip { position: absolute; left: 64px; top: 110px; display: inline-flex; align-items: center; gap: 12px; padding: 12px 24px; border-radius: 999px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.18); font-weight: 700; font-size: 28px; letter-spacing: .02em; text-transform: uppercase; }
.chip .sn-i { color: #ff86b0; }
.title { position: absolute; left: 64px; right: 64px; top: 200px; font-size: 72px; line-height: 1.05; font-weight: 900; letter-spacing: -.03em; }
.title em, .tag em { font-style: normal; background: linear-gradient(90deg, #a48cff, #ff6a9a); -webkit-background-clip: text; background-clip: text; color: transparent; }
.panel { position: absolute; left: 50%; top: 430px; width: 560px; margin-left: -280px; border-radius: 22px; box-shadow: 0 40px 120px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.08); transform-origin: 50% 0; }
.panel.small { width: 380px; margin-left: 0; left: auto; }
.frame { position: absolute; left: 64px; right: 64px; top: 460px; border-radius: 26px; overflow: hidden; box-shadow: 0 40px 120px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.1); background: #000; }
.frame img { display: block; width: 100%; transform-origin: 50% 50%; }
.frame .swap { position: absolute; inset: 0; opacity: 0; }
.frame.wide { top: 440px; }
.frame.store { top: 360px; background: #fff; }
.frame.key { top: 450px; left: 140px; right: 140px; background: #fff; }
.frame.page { top: 450px; }
.badge { position: absolute; display: inline-flex; align-items: center; gap: 12px; padding: 16px 28px; border-radius: 18px; font-size: 40px; font-weight: 900; color: #fff; background: linear-gradient(135deg, #7c5cff, #ff3d7f); box-shadow: 0 20px 50px rgba(255,61,127,.45); }
.flash-cam { position: absolute; inset: 0; background: #fff; opacity: 0; }
.big { position: absolute; left: 64px; right: 64px; top: 250px; font-size: 104px; line-height: 1.04; font-weight: 900; letter-spacing: -.04em; }
.big.center, .sub.center { text-align: center; }
.big .hl { background: linear-gradient(90deg, #ffd34d, #ff6a3d); -webkit-background-clip: text; background-clip: text; color: transparent; }
.w { display: inline-block; }
.strike { position: relative; }
.sub { position: absolute; left: 64px; right: 64px; top: 880px; font-size: 92px; font-weight: 900; background: linear-gradient(90deg, #a48cff, #ff6a9a); -webkit-background-clip: text; background-clip: text; color: transparent; }
.queue { position: absolute; left: 64px; right: 64px; top: 640px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.qitem { position: relative; height: 170px; border-radius: 16px; background: linear-gradient(135deg, #2a2160, #4b2380); overflow: hidden; }
.qitem i { position: absolute; left: 50%; top: 42%; width: 54px; height: 54px; margin: -27px 0 0 -27px; border-radius: 50%; background: rgba(255,255,255,.85); }
.qitem b { position: absolute; left: 14px; right: 50px; bottom: 16px; height: 12px; border-radius: 6px; background: rgba(255,255,255,.35); }
.qitem span { position: absolute; right: 10px; bottom: 10px; font-size: 20px; font-weight: 700; background: rgba(0,0,0,.75); padding: 2px 8px; border-radius: 6px; }
.logo-scene, .cta { text-align: center; }
.burst { position: absolute; left: 50%; top: 520px; width: 1100px; height: 1100px; margin: -550px 0 0 -550px; border-radius: 50%; background: radial-gradient(circle, rgba(255,61,127,.55) 0%, rgba(124,92,255,.35) 35%, transparent 70%); }
.biglogo { position: absolute; left: 50%; top: 300px; width: 300px; height: 300px; margin-left: -150px; border-radius: 72px; box-shadow: 0 40px 120px rgba(124,92,255,.7); }
.brand { position: absolute; left: 0; right: 0; top: 660px; font-size: 128px; font-weight: 900; letter-spacing: -.04em; }
.tag { position: absolute; left: 0; right: 0; top: 820px; font-size: 46px; font-weight: 700; color: #ddd6ff; padding: 0 60px; }
.cta .biglogo { top: 150px; width: 240px; height: 240px; margin-left: -120px; border-radius: 58px; }
.cta .brand { top: 420px; font-size: 112px; }
.cta .tag { top: 565px; font-size: 38px; }
.pills { position: absolute; left: 70px; right: 70px; top: 660px; display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; }
.pills span { display: inline-flex; align-items: center; gap: 10px; padding: 12px 22px; border-radius: 999px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.16); font-size: 28px; font-weight: 700; }
.pills .sn-i { color: #ff86b0; }
.store-cta { position: absolute; left: 70px; right: 70px; top: 930px; padding: 28px 30px; border-radius: 26px; background: #fff; color: #1a1236; font-size: 40px; font-weight: 700; text-align: center; line-height: 1.25; box-shadow: 0 30px 80px rgba(124,92,255,.5); }
.store-cta .sn-i { vertical-align: -6px; margin-right: 10px; }
.store-cta .sn-i { color: #6d4aff; }
.store-cta b { color: #6d4aff; }
.link-hint { position: absolute; left: 0; right: 0; top: 1110px; font-size: 40px; font-weight: 800; color: #ffd34d; display: flex; align-items: center; justify-content: center; gap: 10px; }
.kicker { position: absolute; left: 64px; top: 110px; font-size: 30px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #ffd34d; }
.title.step { display: flex; align-items: center; gap: 26px; top: 180px; font-size: 64px; }
.title.step .n { flex: none; width: 104px; height: 104px; border-radius: 30px; display: grid; place-items: center; background: linear-gradient(135deg, #7c5cff, #ff3d7f); font-size: 64px; }
.hint { position: absolute; left: 64px; right: 64px; top: 1010px; font-size: 44px; font-weight: 600; line-height: 1.3; color: #ddd6ff; text-align: center; }
.hint b { color: #fff; }
.install .hint { top: 1050px; }
.install .frame.page { top: 360px; }
.install .frame.key { top: 360px; }
#fade { position: absolute; left: 0; right: 0; bottom: 0; height: 230px; z-index: 30; background: linear-gradient(180deg, transparent, #07050f 75%); pointer-events: none; }
.ring { position: absolute; border-radius: 999px; box-shadow: 0 0 0 6px #ffd34d, 0 0 40px 12px rgba(255,211,77,.6); opacity: 0; }
.cursor { position: absolute; left: 0; top: 0; color: #111; filter: drop-shadow(0 6px 10px rgba(0,0,0,.45)); }
.cursor svg { fill: #fff; stroke: #111; stroke-width: 1.5; }
.sn-i { flex: none; }
`;

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${css}</style></head><body>
<div id="bg"><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div><div id="grain"></div></div>
${SCENES.map((s, i) => `<section class="scene ${s.cls || ''}" data-i="${i}" data-start="${s.start}" data-end="${s.end}">${s.html}</section>`).join('')}
<div id="fade"></div>
<div id="bar"></div>
<div id="foot"><img src="${cap('logo.png')}">Subme Now<span>Extensión gratis para Chrome</span></div>
<div id="flash"></div>
<script>
const BEAT = 0.5;
const DROPS = [[4, 30], [38, 44]];
const CUTS = [4, 38];
const clamp = (x) => Math.max(0, Math.min(1, x));
const outCubic = (x) => 1 - Math.pow(1 - x, 3);
const outBack = (x) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const scenes = [...document.querySelectorAll('.scene')];
const blobs = [...document.querySelectorAll('.blob')];

function fx(el, p, kind) {
  const e = outCubic(p);
  switch (kind) {
    case 'pop': { const b = outBack(p); return { o: clamp(p * 3), tr: 'scale(' + (0.4 + 0.6 * b) + ')' }; }
    case 'zoom': return { o: clamp(p * 2), tr: 'scale(' + (1.6 - 0.6 * e) + ')' };
    case 'up': return { o: e, tr: 'translateY(' + (60 * (1 - e)) + 'px)' };
    case 'down': return { o: e, tr: 'translateY(' + (-40 * (1 - e)) + 'px)' };
    case 'left': return { o: e, tr: 'translateX(' + (-120 * (1 - e)) + 'px)' };
    case 'right': return { o: e, tr: 'translateX(' + (160 * (1 - e)) + 'px)' };
    case 'rise': return { o: e, tr: 'translateY(' + (220 * (1 - e)) + 'px) scale(' + (0.92 + 0.08 * e) + ')' };
    case 'fade': return { o: e, tr: '' };
    case 'flash': return { o: p < 1 ? 0.9 * (1 - p) : 0, tr: '' };
    case 'ring': return { o: p > 0 ? 0.6 + 0.4 * Math.abs(Math.sin(p * 9)) : 0, tr: 'scale(' + (1.25 - 0.25 * e) + ')' };
    default: return { o: 1, tr: '' };
  }
}

window.render = (t) => {
  const inDrop = DROPS.some(([a, b]) => t >= a && t < b);
  const pulse = inDrop ? Math.exp(-((t % BEAT)) * 9) : 0;
  document.getElementById('bar').style.width = (t / ${DURATION} * 100) + '%';
  const cut = CUTS.map((c) => t - c).filter((d) => d >= 0 && d < 0.35)[0];
  document.getElementById('flash').style.opacity = cut != null ? (0.85 * (1 - cut / 0.35)) : (pulse * 0.04);
  blobs[0].style.transform = 'translate(' + (-120 + Math.sin(t * 0.6) * 160) + 'px,' + (-140 + Math.cos(t * 0.5) * 120) + 'px) scale(' + (1 + pulse * 0.08) + ')';
  blobs[1].style.transform = 'translate(' + (560 + Math.cos(t * 0.45) * 180) + 'px,' + (780 + Math.sin(t * 0.55) * 160) + 'px) scale(' + (1 + pulse * 0.1) + ')';
  blobs[2].style.transform = 'translate(' + (360 + Math.sin(t * 0.35) * 260) + 'px,' + (300 + Math.cos(t * 0.4) * 240) + 'px)';
  for (const s of scenes) {
    const a = +s.dataset.start; const b = +s.dataset.end;
    const on = t >= a && t < b;
    s.classList.toggle('on', on);
    if (!on) continue;
    const local = t - a; const len = b - a;
    // salida rápida en el último instante de la escena
    const exitP = clamp((local - (len - 0.18)) / 0.18);
    s.style.opacity = 1 - exitP;
    s.style.transform = exitP ? 'scale(' + (1 + exitP * 0.06) + ')' : '';
    s.querySelectorAll('[data-in]').forEach((el) => {
      const start = +el.dataset.in; const dur = +(el.dataset.dur || (el.dataset.fx === 'ring' ? 1.2 : 0.45));
      const p = clamp((local - start) / dur);
      if (el.classList.contains('cursor')) {
        const [x0, y0, x1, y1] = el.dataset.path.split(',').map(Number);
        const e = outCubic(p);
        const click = local - start - dur;
        const sc = click > 0 && click < 0.25 ? 0.82 : 1;
        el.style.left = 'calc(' + (x0 + (x1 - x0) * e) + '% - 10px)';
        el.style.top = 'calc(' + (y0 + (y1 - y0) * e) + '% - 6px)';
        el.style.opacity = clamp((local - start) * 4);
        el.style.transform = 'scale(' + sc + ')';
        return;
      }
      const r = fx(el, p, el.dataset.fx);
      el.style.opacity = local < start ? 0 : r.o;
      let tr = r.tr;
      if (el.classList.contains('beat')) tr += ' scale(' + (1 + pulse * 0.05) + ')';
      el.style.transform = tr;
    });
    s.querySelectorAll('[data-kb]').forEach((el) => {
      const [k0, k1] = el.dataset.kb.split(' ').map(Number);
      el.style.transform = 'scale(' + (k0 + (k1 - k0) * clamp(local / len)) + ')';
    });
    s.querySelectorAll('.w.strike').forEach((el) => {
      const p = clamp((local - 1.0) / 0.3);
      el.style.textDecoration = p > 0 ? 'line-through' : 'none';
      el.style.textDecorationColor = '#ff3d7f';
      el.style.textDecorationThickness = '10px';
      el.style.opacity = p > 0 ? 0.55 : el.style.opacity;
    });
    if (s.classList.contains('hook') && local > 1.6 && +s.dataset.start === 2) {
      const k = (local - 1.6) * 40; s.style.transform = 'translate(' + Math.sin(k) * 6 + 'px,' + Math.cos(k * 1.3) * 6 + 'px)';
    }
  }
};
</script></body></html>`;

const stage = path.join(OUT, 'stage.html');
fs.writeFileSync(stage, html);

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto(`file://${stage}`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);

const out = path.join(OUT, 'subme-now-video.mp4');
const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-i', MUSIC,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((resolve, reject) => ff.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`ffmpeg ${c}`)))));

const frames = DURATION * FPS;
for (let f = 0; f < frames; f++) {
  const t = f / FPS;
  await page.evaluate((x) => window.render(x), t);
  const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % (FPS * 4) === 0) process.stdout.write(`  ${Math.round((f / frames) * 100)}%\n`);
}
ff.stdin.end();
await done;

// Portada (LinkedIn la usa como miniatura) y fotogramas de control.
for (const [name, t] of [['portada-video', 39.4], ['frame-gancho', 1.6], ['frame-saltar', 12.5], ['frame-estudio', 17.2], ['frame-instalar', 31.8]]) {
  await page.evaluate((x) => window.render(x), t);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
}
await browser.close();
fs.rmSync(stage);
console.log('Video listo:', out);
