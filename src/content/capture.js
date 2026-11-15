/* Subme Now — captura del fotograma actual del video (para que la IA lea la pantalla, o para guardarlo). */
(function () {
  const SN = (globalThis.SubmeNow = globalThis.SubmeNow || {});

  const fail = (msg) => { throw Object.assign(new Error(msg), { code: 'CAPTURE' }); };

  function draw(src, w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, 0, 0, w, h);
    return { c, ctx };
  }

  /** ¿Toda la imagen es negra? (videos con DRM, o fotograma aún sin decodificar) */
  function isBlank(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h).data;
    const step = Math.max(4, Math.floor(d.length / 4 / 4000)) * 4;
    let max = 0;
    for (let i = 0; i < d.length; i += step) max = Math.max(max, d[i], d[i + 1], d[i + 2]);
    return max < 12;
  }

  /**
   * Captura el fotograma visible. Devuelve { dataUrl, thumb, width, height, t }.
   * maxW limita el tamaño para no gastar de más en la IA.
   */
  function frame(video, { maxW = 1280, quality = 0.86 } = {}) {
    if (!video) fail('No encontré el video en la página.');
    if (video.readyState < 2 || !video.videoWidth) fail('El video todavía no cargó la imagen. Dale play un instante y vuelve a intentarlo.');
    const scale = Math.min(1, maxW / video.videoWidth);
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    let out;
    try {
      out = draw(video, w, h);
      if (isBlank(out.ctx, w, h)) fail('La imagen salió negra: el video está protegido o no se está mostrando. Prueba en otro momento del video.');
      const dataUrl = out.c.toDataURL('image/jpeg', quality);
      return { dataUrl, thumb: thumb(out.c), width: w, height: h, t: Number(video.currentTime) || 0 };
    } catch (e) {
      if (e.code === 'CAPTURE') throw e;
      fail('El navegador no permite capturar este video.');
    }
    return null;
  }

  /** Miniatura liviana para mostrar y guardar en el historial. */
  function thumb(canvas, maxW = 480) {
    const scale = Math.min(1, maxW / canvas.width);
    const { c } = draw(canvas, Math.round(canvas.width * scale), Math.round(canvas.height * scale));
    return c.toDataURL('image/jpeg', 0.72);
  }

  SN.capture = { frame };
})();
