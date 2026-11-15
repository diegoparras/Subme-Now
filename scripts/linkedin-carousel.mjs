/**
 * Carrusel de LinkedIn de Subme Now (1080×1350, PDF) con las capturas reales de
 * scripts/linkedin-captures.mjs: qué hace, cómo lo hace y cómo instalarlo.
 *
 *   node scripts/linkedin-carousel.mjs
 *
 * Salida: marketing/linkedin-v17/carrusel/slide-01.png … y subme-now-carrusel.pdf
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = path.join(ROOT, 'marketing', 'linkedin-v17');
const CAP = path.join(BASE, 'capturas');
const OUT = path.join(BASE, 'carrusel');
fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(path.join(CAP, 'panel-resumen.png'))) throw new Error('Faltan las capturas: ejecuta primero node scripts/linkedin-captures.mjs');
fs.copyFileSync(path.join(ROOT, 'icons/icon128.png'), path.join(CAP, 'logo.png'));

const iconSandbox = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src/shared/icons.js'), 'utf8'), { globalThis: iconSandbox });
const I = (n, s = 26) => iconSandbox.SubmeIcons.icon(n).replace('width="16" height="16"', `width="${s}" height="${s}"`);
const img = (f) => `../capturas/${f}`;
const store = JSON.parse(fs.readFileSync(path.join(CAP, 'tienda-recorte.json'), 'utf8'));

const SLIDES = [
  {
    cls: 'cover',
    html: `<div class="hook">¿Cuántos videos tenés en <span class="hl">“Ver más tarde”</span>?</div>
      <div class="hook2">Spoiler: no los vas a ver.<br><em>Hasta hoy.</em></div>
      <div class="shot cover-shot"><img src="${img('pagina-completa.png')}"></div>`,
    swipe: true,
  },
  {
    chip: ['sparkles', 'Qué es'],
    title: 'Subme Now: tu asistente de IA <em>dentro de YouTube</em>',
    lead: 'Una extensión para Chrome que entiende el video que estás viendo: lo resume, le hacés preguntas, salta lo que sobra y hasta te toma examen.',
    html: `<div class="shot panel" style="top:520px"><img src="${img('panel-resumen.png')}"></div>`,
  },
  {
    chip: ['summary', 'Resumen'],
    title: '40 minutos de video. <em>Entendidos en 30 segundos.</em>',
    lead: 'TL;DR, ideas principales y conclusión. Cada idea con el minuto exacto: un clic y saltás ahí.',
    html: `<div class="shot panel"><img src="${img('panel-resumen.png')}"></div><div class="badge" style="left:110px;top:640px">${I('clock', 30)}40:00 → 0:30</div>`,
  },
  {
    chip: ['scissors', 'Saltar lo que sobra'],
    title: 'Patrocinios, intros y relleno: <em>saltados solos.</em>',
    lead: 'La IA los marca en la barra del video con colores y los saltea. Si querés verlos, “Deshacer”.',
    html: `<div class="shot video"><img src="${img('video-saltar.png')}"></div><div class="shot panel small" style="right:72px;top:930px"><img src="${img('panel-saltar.png')}"></div>`,
  },
  {
    chip: ['graduation', 'Modo estudio'],
    title: 'El video se pausa <em>y te toma examen.</em>',
    lead: 'Al terminar cada tema aparece una pregunta. Si fallás, “Repasar” te lleva justo a la parte que lo explica.',
    html: `<div class="shot video"><img src="${img('video-estudio-correcto.png')}"></div>`,
  },
  {
    chip: ['camera', 'Leer la pantalla'],
    title: 'Capturá lo que se ve. <em>La IA lo lee.</em>',
    lead: 'Diapositivas, código o gráficos: un clic en la cámara y te lo transcribe y explica con el contexto de ese momento.',
    html: `<div class="shot panel"><img src="${img('panel-leer-pantalla.png')}"></div>`,
  },
  {
    chip: ['subtitles', 'Subtítulos dobles + Podcast'],
    title: 'Dos idiomas a la vez. <em>O escuchalo como podcast.</em>',
    lead: 'Original y traducción sobre el video. Y una charla entre dos voces que te explica el video mientras caminás.',
    html: `<div class="shot video" style="top:520px;right:auto;width:640px"><img src="${img('video-subtitulos.png')}"></div><div class="shot panel small" style="right:72px;top:600px;width:300px"><img src="${img('panel-podcast.png')}"></div>`,
  },
  {
    chip: ['library', 'Tu segundo cerebro'],
    title: 'Preguntale a <em>todo lo que viste.</em>',
    lead: 'Todo queda en tu biblioteca. Preguntás y te responde citando el video y el minuto exacto.',
    html: `<div class="shot wide"><img src="${img('biblioteca-preguntar.png')}"></div>`,
  },
  {
    cls: 'install',
    chip: ['download', 'Cómo tenerlo · 1 minuto'],
    title: 'Instalalo en <em>3 pasos.</em>',
    html: `<div class="steps">
      <div class="step"><span class="n">1</span><div><b>Entrá a la Chrome Web Store</b><small>Buscá “Subme Now” y tocá “Añadir a Chrome”.</small></div></div>
      <div class="shot store"><div class="imgwrap"><img src="${img('tienda-recorte.png')}"><i class="ring" style="left:${(store.button.x / store.width) * 100}%;top:${(store.button.y / store.height) * 100}%;width:${(store.button.w / store.width) * 100}%;height:${(store.button.h / store.height) * 100}%"></i></div></div>
      <div class="step"><span class="n">2</span><div><b>Pegá tu clave de IA</b><small>OpenAI, Claude, Gemini, Grok u OpenRouter: la tuya. La transcripción funciona sin clave.</small></div></div>
      <div class="step"><span class="n">3</span><div><b>Abrí cualquier video de YouTube</b><small>Subme Now aparece al lado del video. Listo.</small></div></div>
    </div>`,
  },
  {
    cls: 'cta',
    html: `<img class="biglogo" src="${img('logo.png')}">
      <div class="brand">Subme Now</div>
      <div class="tag">Gratis · Código abierto · Con tu propia IA</div>
      <div class="pills">${[['summary', 'Resúmenes'], ['chat', 'Chat'], ['scissors', 'Saltar relleno'], ['graduation', 'Modo estudio'], ['camera', 'Leer la pantalla'], ['subtitles', 'Subtítulos dobles'], ['headphones', 'Podcast'], ['library', 'Biblioteca'], ['mindmap', 'Mapas mentales']].map(([i, t]) => `<span>${I(i, 24)}${t}</span>`).join('')}</div>
      <div class="store-cta">${I('search', 34)}Buscá <b>Subme Now</b> en la Chrome Web Store</div>
      <div class="ask">Link en el primer comentario · ¿Qué video vas a probar primero?</div>`,
  },
];

const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&display=swap');
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; color: #fff; background: #07050f; }
.slide { width: 1080px; height: 1350px; position: relative; overflow: hidden; padding: 0 72px;
  background: radial-gradient(900px 700px at 0% 0%, #3a28a0 0%, transparent 60%), radial-gradient(900px 800px at 100% 100%, #7a1f55 0%, transparent 60%), #0b0818;
  page-break-after: always; break-after: page; }
.chip { position: absolute; left: 72px; top: 84px; display: inline-flex; align-items: center; gap: 12px; padding: 12px 24px; border-radius: 999px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.18); font-weight: 700; font-size: 26px; text-transform: uppercase; letter-spacing: .02em; }
.chip .sn-i { color: #ff86b0; }
h1 { position: absolute; left: 72px; right: 72px; top: 165px; font-size: 64px; line-height: 1.06; font-weight: 900; letter-spacing: -.03em; }
h1 em, .hook2 em { font-style: normal; background: linear-gradient(90deg, #a48cff, #ff6a9a); -webkit-background-clip: text; background-clip: text; color: transparent; }
.lead { position: absolute; left: 72px; right: 72px; top: 330px; font-size: 29px; line-height: 1.42; color: #d6d0f0; }
.shot { position: absolute; border-radius: 22px; overflow: hidden; box-shadow: 0 36px 100px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.1); }
.shot img { display: block; width: 100%; }
.shot.panel { left: 50%; width: 540px; margin-left: -270px; top: 500px; -webkit-mask-image: linear-gradient(180deg, #000 82%, transparent); mask-image: linear-gradient(180deg, #000 82%, transparent); max-height: 760px; }
.shot.panel.small { width: 380px; margin-left: 0; left: auto; max-height: 470px; }
.shot.video { left: 72px; right: 72px; top: 520px; }
.shot.wide { left: 72px; right: 72px; top: 500px; max-height: 720px; -webkit-mask-image: linear-gradient(180deg, #000 85%, transparent); mask-image: linear-gradient(180deg, #000 85%, transparent); }
.badge { position: absolute; display: inline-flex; align-items: center; gap: 12px; padding: 14px 26px; border-radius: 18px; font-size: 38px; font-weight: 900; background: linear-gradient(135deg, #7c5cff, #ff3d7f); box-shadow: 0 20px 50px rgba(255,61,127,.45); }
.foot { position: absolute; left: 72px; right: 72px; bottom: 40px; display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 24px; z-index: 5; }
.foot img { width: 40px; height: 40px; border-radius: 10px; }
.foot .num { margin-left: auto; font-weight: 600; color: #a8a2c8; font-size: 22px; }
.foot .swipe { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; color: #ffd34d; }
.foot .swipe + .num { margin-left: 20px; }
.fade { position: absolute; left: 0; right: 0; bottom: 0; height: 200px; background: linear-gradient(180deg, transparent, #0b0818 80%); z-index: 4; }
.cover .hook { position: absolute; left: 72px; right: 72px; top: 110px; font-size: 92px; line-height: 1.02; font-weight: 900; letter-spacing: -.04em; }
.cover .hl { background: linear-gradient(90deg, #ffd34d, #ff6a3d); -webkit-background-clip: text; background-clip: text; color: transparent; }
.cover .hook2 { position: absolute; left: 72px; right: 72px; top: 440px; font-size: 54px; font-weight: 800; line-height: 1.15; color: #e7e2ff; }
.cover .cover-shot { left: 72px; right: 72px; top: 640px; }
.install h1 { top: 160px; }
.steps { position: absolute; left: 72px; right: 72px; top: 290px; display: flex; flex-direction: column; gap: 22px; }
.step { display: flex; gap: 22px; align-items: center; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); border-radius: 22px; padding: 22px 26px; }
.step .n { flex: none; width: 76px; height: 76px; border-radius: 22px; display: grid; place-items: center; font-size: 44px; font-weight: 900; background: linear-gradient(135deg, #7c5cff, #ff3d7f); }
.step b { display: block; font-size: 34px; font-weight: 800; }
.step small { display: block; font-size: 24px; color: #d6d0f0; margin-top: 4px; line-height: 1.35; }
.steps .shot.store { position: relative; border-radius: 18px; height: 330px; }
.imgwrap { position: relative; }
.ring { position: absolute; border-radius: 999px; box-shadow: 0 0 0 5px #ffd34d, 0 0 34px 10px rgba(255,211,77,.6); }
.cta { text-align: center; }
.biglogo { position: absolute; left: 50%; top: 120px; width: 220px; height: 220px; margin-left: -110px; border-radius: 54px; box-shadow: 0 40px 120px rgba(124,92,255,.7); }
.cta .brand { position: absolute; left: 0; right: 0; top: 380px; font-size: 104px; font-weight: 900; letter-spacing: -.04em; }
.cta .tag { position: absolute; left: 0; right: 0; top: 515px; font-size: 36px; font-weight: 700; color: #ddd6ff; }
.pills { position: absolute; left: 72px; right: 72px; top: 610px; display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
.pills span { display: inline-flex; align-items: center; gap: 10px; padding: 12px 20px; border-radius: 999px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.16); font-size: 26px; font-weight: 700; }
.pills .sn-i { color: #ff86b0; }
.store-cta { position: absolute; left: 72px; right: 72px; top: 930px; padding: 30px; border-radius: 26px; background: #fff; color: #1a1236; font-size: 38px; font-weight: 700; line-height: 1.25; box-shadow: 0 30px 80px rgba(124,92,255,.5); }
.store-cta .sn-i { color: #6d4aff; vertical-align: -6px; margin-right: 10px; }
.store-cta b { color: #6d4aff; }
.ask { position: absolute; left: 72px; right: 72px; top: 1110px; font-size: 32px; font-weight: 700; color: #ffd34d; }
.sn-i { flex: none; }
`;

const slideHtml = (s, i) => `<section class="slide ${s.cls || ''}">
  ${s.chip ? `<div class="chip">${I(s.chip[0])}${s.chip[1]}</div>` : ''}
  ${s.title ? `<h1>${s.title}</h1>` : ''}
  ${s.lead ? `<p class="lead">${s.lead}</p>` : ''}
  ${s.html || ''}
  <div class="fade"></div>
  <div class="foot"><img src="${img('logo.png')}">Subme Now${s.swipe ? `<span class="swipe">Deslizá ${I('chevronDown', 24).replace('<svg', '<svg style="transform:rotate(-90deg)"')}</span>` : ''}<span class="num">${i + 1}/${SLIDES.length}</span></div>
</section>`;

const doc = (body) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
const file = path.join(OUT, 'carrusel.html');
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
for (let i = 0; i < SLIDES.length; i++) {
  fs.writeFileSync(file, doc(slideHtml(SLIDES[i], i)));
  await page.goto(`file://${file}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, `slide-${String(i + 1).padStart(2, '0')}.png`) });
}
fs.writeFileSync(file, doc(SLIDES.map(slideHtml).join('')));
await page.goto(`file://${file}`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.pdf({ path: path.join(OUT, 'subme-now-carrusel.pdf'), width: '1080px', height: '1350px', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
fs.rmSync(file);
await browser.close();
console.log('Carrusel listo en', OUT);
