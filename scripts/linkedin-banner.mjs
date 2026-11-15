/**
 * Portadas (banners) para el perfil de LinkedIn: 1584×396, con el sector izquierdo libre para la foto.
 * Genera la portada única y una serie de 5 que cuentan una historia al rotar (LinkedIn Premium).
 * Usa capturas reales de scripts/linkedin-captures.mjs.
 *
 *   node scripts/linkedin-banner.mjs
 *
 * Salida en marketing/linkedin-v17/banner/:
 *   portada-linkedin.png (+ @2x)          portada única
 *   serie-1-gancho.png … serie-5-instalar.png (+ @2x)   serie de 5
 *   vista-previa-*.png                     con el lugar de la foto marcado (solo para revisar)
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
const OUT = path.join(BASE, 'banner');
fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(path.join(CAP, 'panel-resumen.png'))) throw new Error('Faltan las capturas: ejecuta primero node scripts/linkedin-captures.mjs');
fs.copyFileSync(path.join(ROOT, 'icons/icon128.png'), path.join(CAP, 'logo.png'));

const iconSandbox = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src/shared/icons.js'), 'utf8'), { globalThis: iconSandbox });
const I = (n, s = 20) => iconSandbox.SubmeIcons.icon(n).replace('width="16" height="16"', `width="${s}" height="${s}"`);
const img = (f) => `../capturas/${f}`;
const store = JSON.parse(fs.readFileSync(path.join(CAP, 'tienda-recorte.json'), 'utf8'));

const W = 1584;
const H = 396;
// Zona de la foto de perfil (escritorio): círculo abajo a la izquierda. Se deja libre todo x < 470.
const SAFE_LEFT = 470;
const X = SAFE_LEFT + 40;

const chips = (list) => `<div class="chips">${list.map(([i, t]) => `<span>${I(i, 18)}${t}</span>`).join('')}</div>`;
const brandSmall = `<div class="mini"><img src="${img('logo.png')}">Subme Now</div>`;

/* ---------- diseños ---------- */
const SINGLE = `
  <div class="copy" style="top:58px;width:640px">
    <div class="brand"><img src="${img('logo.png')}"><b>Subme Now</b></div>
    <div class="tag">Tu asistente de IA <em>dentro de YouTube</em></div>
    ${chips([['summary', 'Resúmenes'], ['scissors', 'Saltar relleno'], ['graduation', 'Modo estudio'], ['camera', 'Leer la pantalla'], ['headphones', 'Podcast'], ['library', 'Biblioteca']])}
    <div class="cta">${I('download', 20)}Gratis en la Chrome Web Store · Código abierto</div>
  </div>
  <div class="shots">
    <div class="shot" style="left:10px;top:40px;width:330px;transform:rotate(-5deg)"><img src="${img('video-saltar.png')}"></div>
    <div class="shot" style="right:40px;top:34px;width:250px;transform:rotate(4deg)"><img src="${img('panel-resumen.png')}"></div>
    <div class="fadeB"></div>
  </div>`;

const SERIES = [
  {
    name: 'serie-1-gancho',
    html: `
      <div class="copy" style="top:62px;width:600px">
        ${brandSmall}
        <div class="huge">¿Cuántos videos tenés en <span class="hl">“Ver más tarde”</span>?</div>
        <div class="sub">Spoiler: no los vas a ver. <em>Hasta hoy.</em></div>
      </div>
      <div class="queue">${['42:18', '1:05:33', '27:40', '58:02', '33:15', '1:12:09', '45:51', '19:27', '51:36', '38:04', '1:21:47', '24:12'].map((d, i) => `<div class="q" style="transform:rotate(${[-4, 3, -2, 5, -3, 2, -5, 4, -1, 3, -4, 2][i]}deg)"><i></i><b></b><span>${d}</span></div>`).join('')}</div>`,
  },
  {
    name: 'serie-2-que-es',
    html: `
      <div class="copy" style="top:56px;width:560px">
        <div class="brand"><img src="${img('logo.png')}"><b>Subme Now</b></div>
        <div class="tag">Tu asistente de IA <em>dentro de YouTube</em></div>
        <div class="line">${I('clock', 26)}<span>40 minutos de video. <b>Entendidos en 30 segundos.</b></span></div>
        <div class="line">${I('chat', 26)}<span>Preguntale lo que quieras: responde con el <b>minuto exacto</b>.</span></div>
      </div>
      <div class="shots">
        <div class="shot" style="left:0;top:26px;width:400px;transform:rotate(-3deg)"><img src="${img('pagina-completa.png')}"></div>
        <div class="shot" style="right:40px;top:44px;width:230px;transform:rotate(4deg)"><img src="${img('panel-resumen.png')}"></div>
        <div class="badge" style="left:60px;top:250px">${I('clock', 22)}40:00 → 0:30</div>
        <div class="fadeB"></div>
      </div>`,
  },
  {
    name: 'serie-3-en-vivo',
    html: `
      <div class="copy" style="top:58px;width:450px">
        ${brandSmall}
        <div class="big">Saltea el relleno.<br><em>Y te toma examen.</em></div>
        <div class="desc">Marca patrocinios e intros en la barra del video y los salta solos. Y al terminar cada tema, pausa y te pregunta.</div>
      </div>
      <div class="shots wide">
        <div class="shot" style="left:0;top:30px;width:380px;transform:rotate(-4deg)"><img src="${img('video-saltar.png')}"></div>
        <div class="shot" style="right:30px;top:120px;width:380px;transform:rotate(3deg)"><img src="${img('video-estudio-correcto.png')}"></div>
        <div class="tagpill" style="left:30px;top:255px">${I('scissors', 18)}Saltar lo que sobra</div>
        <div class="tagpill" style="right:60px;top:70px">${I('graduation', 18)}Modo estudio</div>
        <div class="fadeB"></div>
      </div>`,
  },
  {
    name: 'serie-4-superpoderes',
    html: `
      <div class="copy" style="top:58px;width:470px">
        ${brandSmall}
        <div class="big" style="font-size:40px">Lee la pantalla.<br><em>Te lo cuenta como podcast.</em><br>Y recuerda todo.</div>
      </div>
      <div class="shots wide">
        <div class="shot" style="left:0;top:40px;width:200px;transform:rotate(-5deg)"><img src="${img('panel-leer-pantalla.png')}"></div>
        <div class="shot" style="left:225px;top:22px;width:200px;transform:rotate(2deg)"><img src="${img('panel-podcast.png')}"></div>
        <div class="shot" style="right:30px;top:60px;width:330px;transform:rotate(5deg)"><img src="${img('biblioteca-preguntar.png')}"></div>
        <div class="tagpill" style="left:10px;top:300px">${I('camera', 18)}Leer la pantalla</div>
        <div class="tagpill" style="left:250px;top:8px">${I('headphones', 18)}Podcast</div>
        <div class="tagpill" style="right:60px;top:300px">${I('library', 18)}Preguntale a tu biblioteca</div>
        <div class="fadeB"></div>
      </div>`,
  },
  {
    name: 'serie-5-instalar',
    html: `
      <div class="copy" style="top:50px;width:560px">
        ${brandSmall}
        <div class="big">Gratis. <em>Listo en 1 minuto.</em></div>
        <div class="steps">
          <div><span>1</span><p>Buscá <b>Subme Now</b> en la Chrome Web Store</p></div>
          <div><span>2</span><p>Pegá tu clave de IA (la transcripción va sin clave)</p></div>
          <div><span>3</span><p>Abrí cualquier video de YouTube</p></div>
        </div>
      </div>
      <div class="shots">
        <div class="shot store" style="right:30px;top:58px;width:470px;transform:rotate(-2deg)"><div class="imgwrap"><img src="${img('tienda-recorte.png')}"><i class="ring" style="left:${(store.button.x / store.width) * 100}%;top:${(store.button.y / store.height) * 100}%;width:${(store.button.w / store.width) * 100}%;height:${(store.button.h / store.height) * 100}%"></i></div></div>
        <div class="cta-pill" style="right:60px;top:300px">${I('download', 20)}Código abierto · Con tu propia IA</div>
      </div>`,
  },
];

const css = (preview) => `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&display=swap');
* { box-sizing: border-box; margin: 0; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body { font-family: Inter, system-ui, sans-serif; color: #fff; position: relative;
  background: radial-gradient(700px 420px at 8% 30%, #3a28a0 0%, transparent 70%), radial-gradient(800px 500px at 95% 110%, #8a2160 0%, transparent 65%), radial-gradient(600px 400px at 55% -20%, #24186a 0%, transparent 70%), #0b0818; }
.grain { position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px); background-size: 7px 7px; opacity: .5; }
.ring0 { position: absolute; border-radius: 50%; border: 2px solid rgba(164,140,255,.18); }
.r1 { left: -120px; top: -160px; width: 520px; height: 520px; }
.r2 { left: -40px; top: -80px; width: 360px; height: 360px; border-color: rgba(255,106,154,.14); }
.copy { position: absolute; left: ${X}px; }
.brand { display: flex; align-items: center; gap: 18px; }
.brand img { width: 72px; height: 72px; border-radius: 18px; box-shadow: 0 14px 40px rgba(124,92,255,.6); }
.brand b { font-size: 60px; font-weight: 900; letter-spacing: -.035em; line-height: 1; }
.mini { display: inline-flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 800; color: #ddd6ff; }
.mini img { width: 30px; height: 30px; border-radius: 8px; }
em { font-style: normal; background: linear-gradient(90deg, #a48cff, #ff6a9a); -webkit-background-clip: text; background-clip: text; color: transparent; }
.tag { margin-top: 18px; font-size: 31px; font-weight: 800; letter-spacing: -.02em; line-height: 1.15; }
.huge { margin-top: 14px; font-size: 54px; font-weight: 900; line-height: 1.02; letter-spacing: -.035em; }
.hl { background: linear-gradient(90deg, #ffd34d, #ff6a3d); -webkit-background-clip: text; background-clip: text; color: transparent; }
.sub { margin-top: 16px; font-size: 28px; font-weight: 800; color: #e7e2ff; }
.big { margin-top: 14px; font-size: 46px; font-weight: 900; line-height: 1.05; letter-spacing: -.03em; }
.desc { margin-top: 14px; font-size: 20px; line-height: 1.4; color: #d6d0f0; font-weight: 500; }
.line { display: flex; align-items: center; gap: 12px; margin-top: 14px; font-size: 21px; color: #d6d0f0; font-weight: 500; }
.line b { color: #fff; }
.line .sn-i { color: #ff86b0; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
.chips span { display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px; background: rgba(255,255,255,.09); border: 1px solid rgba(255,255,255,.16); font-size: 16px; font-weight: 700; }
.chips .sn-i, .tagpill .sn-i { color: #ff86b0; }
.cta { margin-top: 16px; display: inline-flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 700; color: #ffd34d; }
.steps { margin-top: 14px; display: grid; gap: 8px; font-size: 19px; color: #e7e2ff; font-weight: 500; }
.steps div { display: flex; align-items: center; gap: 12px; }
.steps span { flex: none; width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; font-weight: 900; background: linear-gradient(135deg, #7c5cff, #ff3d7f); }
.steps b { color: #fff; }
.steps div > span + * { display: inline; }
.shots { position: absolute; right: -30px; top: 0; bottom: 0; width: 520px; }
.shots.wide { width: 620px; }
.shot { position: absolute; border-radius: 14px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.12); background: #fff; }
.shot img { display: block; width: 100%; }
.imgwrap { position: relative; }
.ring { position: absolute; border-radius: 999px; box-shadow: 0 0 0 4px #ffd34d, 0 0 24px 8px rgba(255,211,77,.6); }
.badge { position: absolute; display: inline-flex; align-items: center; gap: 10px; padding: 10px 18px; border-radius: 14px; font-size: 26px; font-weight: 900; background: linear-gradient(135deg, #7c5cff, #ff3d7f); box-shadow: 0 14px 40px rgba(255,61,127,.45); }
.tagpill, .cta-pill { position: absolute; display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; font-size: 16px; font-weight: 800; background: rgba(11,8,24,.88); border: 1px solid rgba(255,255,255,.2); box-shadow: 0 10px 30px rgba(0,0,0,.5); }
.cta-pill { color: #ffd34d; font-size: 18px; }
.cta-pill .sn-i { color: #ffd34d; }
.fadeB { position: absolute; left: 0; right: 0; bottom: 0; height: 80px; background: linear-gradient(180deg, transparent, rgba(11,8,24,.85)); }
.queue { position: absolute; left: ${X + 640}px; right: 40px; top: 40px; bottom: 30px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; align-content: center; }
.q { position: relative; height: 92px; border-radius: 12px; overflow: hidden; background: linear-gradient(135deg, #2a2160, #4b2380); box-shadow: 0 12px 30px rgba(0,0,0,.45); }
.q i { position: absolute; left: 50%; top: 42%; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%; background: rgba(255,255,255,.85); }
.q b { position: absolute; left: 10px; right: 46px; bottom: 10px; height: 8px; border-radius: 4px; background: rgba(255,255,255,.35); }
.q span { position: absolute; right: 6px; bottom: 6px; font-size: 13px; font-weight: 700; background: rgba(0,0,0,.75); padding: 1px 6px; border-radius: 5px; }
.dots { position: absolute; left: ${X}px; bottom: 22px; display: flex; gap: 8px; align-items: center; font-size: 14px; font-weight: 700; color: #a8a2c8; }
.dots i { width: 22px; height: 6px; border-radius: 3px; background: rgba(255,255,255,.2); }
.dots i.on { background: linear-gradient(90deg, #7c5cff, #ff3d7f); width: 40px; }
.sn-i { flex: none; }
${preview ? `.photo { position: absolute; left: 48px; top: 216px; width: 300px; height: 300px; border-radius: 50%; border: 8px solid #fff; background: linear-gradient(135deg, #cfcfd6, #9a9aa6); display: grid; place-items: center; color: #555; font: 700 26px Inter; z-index: 9; }
.guide { position: absolute; left: 0; top: 0; bottom: 0; width: ${SAFE_LEFT}px; border-right: 2px dashed rgba(255,211,77,.7); z-index: 9; }` : ''}
`;

const page = (body, preview, index) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${css(preview)}</style></head><body>
<div class="grain"></div><div class="ring0 r1"></div><div class="ring0 r2"></div>
${body}
${index ? `<div class="dots">${[1, 2, 3, 4, 5].map((k) => `<i class="${k === index ? 'on' : ''}"></i>`).join('')}<span>${index}/5</span></div>` : ''}
${preview ? '<div class="guide"></div><div class="photo">Tu foto</div>' : ''}
</body></html>`;

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const file = path.join(OUT, 'banner.html');
const render = async (html, name, scale) => {
  const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
  fs.writeFileSync(file, html);
  await p.goto(`file://${file}`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(250);
  await p.screenshot({ path: path.join(OUT, name) });
  await p.close();
};

await render(page(SINGLE, false, 0), 'portada-linkedin.png', 1);
await render(page(SINGLE, false, 0), 'portada-linkedin@2x.png', 2);
await render(page(SINGLE, true, 0), 'vista-previa-con-foto.png', 1);
for (const [k, s] of SERIES.entries()) {
  await render(page(s.html, false, k + 1), `${s.name}.png`, 1);
  await render(page(s.html, false, k + 1), `${s.name}@2x.png`, 2);
  await render(page(s.html, true, k + 1), `vista-previa-${s.name}.png`, 1);
}
fs.rmSync(file);
await browser.close();
console.log('Portadas listas en', OUT);
