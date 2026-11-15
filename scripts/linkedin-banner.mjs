/**
 * Portada (banner) para el perfil de LinkedIn: 1584×396, con el sector izquierdo libre para la foto.
 * Usa capturas reales de scripts/linkedin-captures.mjs.
 *
 *   node scripts/linkedin-banner.mjs
 *
 * Salida: marketing/linkedin-v17/banner/portada-linkedin.png (1584×396),
 *         portada-linkedin@2x.png (3168×792) y vista-previa-con-foto.png (solo para revisar).
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

const W = 1584;
const H = 396;
// Zona de la foto de perfil (escritorio): círculo abajo a la izquierda. Se deja libre todo x < 470.
const SAFE_LEFT = 470;

const html = (preview) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&display=swap');
* { box-sizing: border-box; margin: 0; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body { font-family: Inter, system-ui, sans-serif; color: #fff; position: relative;
  background: radial-gradient(700px 420px at 8% 30%, #3a28a0 0%, transparent 70%), radial-gradient(800px 500px at 95% 110%, #8a2160 0%, transparent 65%), radial-gradient(600px 400px at 55% -20%, #24186a 0%, transparent 70%), #0b0818; }
.grain { position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px); background-size: 7px 7px; opacity: .5; }
.ring { position: absolute; border-radius: 50%; border: 2px solid rgba(164,140,255,.18); }
.r1 { left: -120px; top: -160px; width: 520px; height: 520px; }
.r2 { left: -40px; top: -80px; width: 360px; height: 360px; border-color: rgba(255,106,154,.14); }
.copy { position: absolute; left: ${SAFE_LEFT + 40}px; top: 58px; width: 640px; }
.brand { display: flex; align-items: center; gap: 18px; }
.brand img { width: 72px; height: 72px; border-radius: 18px; box-shadow: 0 14px 40px rgba(124,92,255,.6); }
.brand b { font-size: 60px; font-weight: 900; letter-spacing: -.035em; line-height: 1; }
.tag { margin-top: 18px; font-size: 31px; font-weight: 800; letter-spacing: -.02em; line-height: 1.15; }
.tag em { font-style: normal; background: linear-gradient(90deg, #a48cff, #ff6a9a); -webkit-background-clip: text; background-clip: text; color: transparent; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
.chips span { display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px; background: rgba(255,255,255,.09); border: 1px solid rgba(255,255,255,.16); font-size: 16px; font-weight: 700; }
.chips .sn-i { color: #ff86b0; }
.cta { margin-top: 16px; display: inline-flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 700; color: #ffd34d; }
.cta .sn-i { color: #ffd34d; }
.shots { position: absolute; right: -30px; top: 0; bottom: 0; width: 470px; }
.shot { position: absolute; border-radius: 16px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.12); }
.shot img { display: block; width: 100%; }
.video { left: 10px; top: 40px; width: 330px; transform: rotate(-5deg); opacity: .95; }
.panel { right: 40px; top: 34px; width: 250px; transform: rotate(4deg); }
.fadeR { position: absolute; left: 0; right: 0; bottom: 0; height: 90px; background: linear-gradient(180deg, transparent, rgba(11,8,24,.9)); }
.sn-i { flex: none; }
${preview ? `.photo { position: absolute; left: 48px; top: 216px; width: 300px; height: 300px; border-radius: 50%; border: 8px solid #fff; background: linear-gradient(135deg, #cfcfd6, #9a9aa6); display: grid; place-items: center; color: #555; font: 700 26px Inter; }
.guide { position: absolute; left: 0; top: 0; bottom: 0; width: ${SAFE_LEFT}px; border-right: 2px dashed rgba(255,211,77,.7); }` : ''}
</style></head><body>
<div class="grain"></div><div class="ring r1"></div><div class="ring r2"></div>
<div class="copy">
  <div class="brand"><img src="${img('logo.png')}"><b>Subme Now</b></div>
  <div class="tag">Tu asistente de IA <em>dentro de YouTube</em></div>
  <div class="chips">${[['summary', 'Resúmenes'], ['scissors', 'Saltar relleno'], ['graduation', 'Modo estudio'], ['camera', 'Leer la pantalla'], ['headphones', 'Podcast'], ['library', 'Biblioteca']].map(([i, t]) => `<span>${I(i, 18)}${t}</span>`).join('')}</div>
  <div class="cta">${I('download', 20)}Gratis en la Chrome Web Store · Código abierto</div>
</div>
<div class="shots">
  <div class="shot video"><img src="${img('video-saltar.png')}"></div>
  <div class="shot panel"><img src="${img('panel-resumen.png')}"></div>
  <div class="fadeR"></div>
</div>
${preview ? '<div class="guide"></div><div class="photo">Tu foto</div>' : ''}
</body></html>`;

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const file = path.join(OUT, 'banner.html');
for (const [name, scale, preview] of [['portada-linkedin.png', 1, false], ['portada-linkedin@2x.png', 2, false], ['vista-previa-con-foto.png', 1, true]]) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
  fs.writeFileSync(file, html(preview));
  await page.goto(`file://${file}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, name) });
  await page.close();
}
fs.rmSync(file);
await browser.close();
console.log('Portada lista en', OUT);
