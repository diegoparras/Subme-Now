/* Subme Now — logo que toma el color de acento elegido (páginas de la extensión e ícono de la barra). */
(function (root) {
  const HEX = /^#[0-9a-f]{6}$/i;
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

  /**
   * Recolorea los píxeles del logo original: el fondo pasa a un degradé del color elegido
   * (del acento a una versión más clara) y la "S" blanca se conserva, con sus bordes suavizados.
   */
  function recolor(img, accent) {
    if (!HEX.test(accent || '')) return img;
    const a = rgb(accent);
    const b = a.map((v) => Math.round(v * 0.6 + 255 * 0.4));
    const { width: w, height: h, data } = img;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (!data[i + 3]) continue;
        const white = Math.max(0, Math.min(1, (Math.min(data[i], data[i + 1], data[i + 2]) - 75) / 180));
        const k = (x + y) / (w + h - 2 || 1);
        for (let c = 0; c < 3; c++) {
          const g = a[c] + (b[c] - a[c]) * k;
          data[i + c] = Math.round(g + (255 - g) * white);
        }
      }
    }
    return img;
  }

  /** En páginas de la extensión: reemplaza el src de las imágenes del logo. */
  async function applyTo(imgs, accent) {
    for (const el of imgs) {
      if (!HEX.test(accent || '')) { if (el.dataset.logoSrc) el.src = el.dataset.logoSrc; continue; }
      try {
        const src = el.dataset.logoSrc || el.getAttribute('src');
        el.dataset.logoSrc = src;
        const image = new Image();
        image.src = src;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        ctx.putImageData(recolor(ctx.getImageData(0, 0, canvas.width, canvas.height), accent), 0, 0);
        el.src = canvas.toDataURL('image/png');
      } catch { /* se deja el logo original */ }
    }
  }

  /** En el service worker: ícono de la barra de herramientas con el color elegido. */
  async function actionIcon(accent) {
    if (!HEX.test(accent || '')) return null;
    const out = {};
    for (const size of [16, 32, 48]) {
      const blob = await (await fetch(chrome.runtime.getURL(`icons/icon${size}.png`))).blob();
      const bmp = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bmp.width, bmp.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bmp, 0, 0);
      out[size] = recolor(ctx.getImageData(0, 0, bmp.width, bmp.height), accent);
    }
    return out;
  }

  root.SubmeLogo = { recolor, applyTo, actionIcon, isColor: (c) => HEX.test(c || '') };
})(globalThis);
