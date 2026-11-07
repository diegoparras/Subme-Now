/* Subme Now — ventana de desbloqueo de las API keys (contraseña, imágenes o patrón). */
(async function () {
  const $ = (id) => document.getElementById(id);
  const msg = (text, cls = '') => { $('msg').textContent = text; $('msg').className = `msg ${cls}`; };

  // Color de acento elegido en la configuración.
  try {
    const { settings } = await chrome.storage.local.get('settings');
    const c = settings?.iconColor;
    if (/^#[0-9a-f]{6}$/i.test(c || '')) {
      document.documentElement.setAttribute('data-accent', '');
      document.documentElement.style.setProperty('--user-accent', c);
    }
  } catch { /* usar el color por defecto */ }

  const status = await SubmeVault.status();
  const method = status.method || 'password';
  const hint = {
    password: 'Escribe tu contraseña de Subme Now.',
    images: 'Toca tus imágenes en orden. Las posiciones cambian cada vez.',
    pattern: 'Dibuja tu patrón uniendo los puntos.',
  }[method];
  $('hint').textContent = `${hint} Las claves quedarán disponibles hasta que cierres el navegador o se bloqueen por inactividad.`;

  let busy = false;
  const submit = async () => {
    if (busy || !ctrl.value) return;
    busy = true;
    $('submit').disabled = true;
    msg('Verificando…');
    try {
      await SubmeVault.unlock(ctrl.value);
      ctrl.clear();
      msg('Desbloqueadas ✓ Ya puedes volver a YouTube.', 'ok');
      setTimeout(() => window.close(), 900);
    } catch (err) {
      msg(err.message, 'err');
      // Para imágenes se vuelve a mezclar la grilla tras un intento fallido.
      ctrl = SubmeSecretInput.create($('secret'), { method, onComplete });
    } finally {
      busy = false;
      $('submit').disabled = false;
    }
  };
  const onComplete = () => { if (method !== 'images') submit(); };
  let ctrl = SubmeSecretInput.create($('secret'), { method, onComplete });
  ctrl.focus();

  if (!status.enabled) { msg('La protección no está activada.', 'ok'); $('submit').disabled = true; }
  else if (!status.locked) { msg('Ya están desbloqueadas ✓', 'ok'); }

  $('form').addEventListener('submit', (e) => { e.preventDefault(); submit(); });
  $('forgot').addEventListener('click', () => chrome.runtime.openOptionsPage());
})();
