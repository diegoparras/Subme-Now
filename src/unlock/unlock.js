/* Subme Now — ventana de desbloqueo de las API keys. */
(async function () {
  const $ = (id) => document.getElementById(id);
  const msg = (text, cls = '') => { $('msg').textContent = text; $('msg').className = `msg ${cls}`; };

  const status = await SubmeVault.status();
  if (!status.enabled) { msg('La protección con contraseña no está activada.', 'ok'); $('submit').disabled = true; }
  else if (!status.locked) { msg('Ya están desbloqueadas ✓', 'ok'); }

  $('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('submit').disabled = true;
    msg('Verificando…');
    try {
      await SubmeVault.unlock($('password').value);
      $('password').value = '';
      msg('Desbloqueadas ✓ Ya puedes volver a YouTube.', 'ok');
      setTimeout(() => window.close(), 900);
    } catch (err) {
      msg(err.message, 'err');
      $('password').select();
    } finally {
      $('submit').disabled = false;
    }
  });

  $('forgot').addEventListener('click', () => chrome.runtime.openOptionsPage());
})();
