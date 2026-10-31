/* Subme Now — página de configuración. */
(async function () {
  const { getSettings, saveSettings, DEFAULT_SETTINGS } = SubmeSettings;
  const { PROVIDERS } = SubmeProviders;
  const $ = (id) => document.getElementById(id);

  let settings = await getSettings();
  let saveTimer = null;
  let vault = await SubmeVault.status();
  let vaultKeys = vault.enabled && !vault.locked ? { ...((await SubmeVault.getSession())?.keys || {}) } : null;
  let vaultTimer = null;

  /** API key del proveedor (de la bóveda si la protección está activa). */
  const keyOf = (id) => (vault.enabled ? (vaultKeys?.[id] || '') : (settings.providers[id]?.apiKey || ''));
  const hasKey = (id) => (vault.enabled ? !!(vaultKeys ? vaultKeys[id] : vault.hasKey[id]) : !!settings.providers[id]?.apiKey);

  function save(immediate = false) {
    clearTimeout(saveTimer);
    const run = async () => {
      await saveSettings(settings);
      $('saved').textContent = 'Guardado ✓';
      setTimeout(() => { $('saved').textContent = ''; }, 1500);
    };
    if (immediate) return run();
    saveTimer = setTimeout(run, 350);
    return null;
  }

  /* ---------- proveedores ---------- */

  function renderProviders() {
    $('providers').innerHTML = '';
    for (const p of Object.values(PROVIDERS)) {
      const conf = settings.providers[p.id] || {};
      const configured = p.id === 'custom' ? !!conf.baseUrl : hasKey(p.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `provider${settings.provider === p.id ? ' active' : ''}`;
      b.innerHTML = `<b></b><small></small>`;
      b.querySelector('b').textContent = p.label;
      if (configured) b.querySelector('b').insertAdjacentHTML('beforeend', '<span class="dot" title="Configurado"></span>');
      b.querySelector('small').textContent = p.id === 'custom' ? 'Ollama, Groq, LM Studio…' : (conf.model || p.defaultModel);
      b.addEventListener('click', () => {
        settings.provider = p.id;
        save();
        renderProviders();
        renderProviderForm();
      });
      $('providers').appendChild(b);
    }
  }

  function renderProviderForm() {
    const p = PROVIDERS[settings.provider];
    const conf = settings.providers[p.id];
    $('providerHint').textContent = p.hint;
    $('baseUrlField').hidden = p.id !== 'custom';
    $('baseUrl').value = conf.baseUrl || '';
    const lockedKeys = vault.enabled && vault.locked;
    $('apiKey').value = lockedKeys ? '' : keyOf(p.id);
    $('apiKey').disabled = lockedKeys;
    $('apiKey').placeholder = lockedKeys
      ? `🔒 ${hasKey(p.id) ? 'Guardada y bloqueada' : 'Bloqueada'}: desbloquea en "Seguridad"`
      : p.id === 'custom' ? 'Opcional para servidores locales' : 'Pega aquí tu clave';
    $('keyLink').hidden = !p.keyUrl;
    $('keyLink').href = p.keyUrl || '#';
    $('model').value = conf.model || '';
    $('model').placeholder = p.defaultModel || 'nombre-del-modelo';
    $('modelHelp').textContent = p.defaultModel ? `Vacío = modelo recomendado (${p.defaultModel}). Usa "Cargar modelos" para ver la lista completa.` : 'Indica el nombre del modelo, p. ej. llama3.1';
    $('modelList').innerHTML = '';
    $('testResult').textContent = '';
    $('testResult').className = 'test-result';
  }

  const bindProviderInput = (id, key) => $(id).addEventListener('input', () => {
    settings.providers[settings.provider][key] = $(id).value.trim();
    save();
    renderProviders();
  });
  $('apiKey').addEventListener('input', () => {
    const value = $('apiKey').value.trim();
    if (vault.enabled) {
      if (!vaultKeys) return;
      vaultKeys[settings.provider] = value;
      clearTimeout(vaultTimer);
      vaultTimer = setTimeout(async () => {
        await SubmeVault.saveKeys(vaultKeys);
        $('saved').textContent = 'Guardado y cifrado ✓';
        setTimeout(() => { $('saved').textContent = ''; }, 1500);
      }, 350);
    } else {
      settings.providers[settings.provider].apiKey = value;
      save();
    }
    renderProviders();
  });
  bindProviderInput('model', 'model');
  bindProviderInput('baseUrl', 'baseUrl');

  $('toggleKey').addEventListener('click', () => {
    const input = $('apiKey');
    input.type = input.type === 'password' ? 'text' : 'password';
    $('toggleKey').textContent = input.type === 'password' ? 'Mostrar' : 'Ocultar';
  });

  /** Para el proveedor personalizado se solicita permiso para su dominio. */
  async function ensureHostPermission() {
    if (settings.provider !== 'custom') return true;
    const base = settings.providers.custom.baseUrl;
    if (!base) throw new Error('Indica la URL base.');
    const origin = `${new URL(base).origin}/*`;
    if (await chrome.permissions.contains({ origins: [origin] })) return true;
    const granted = await chrome.permissions.request({ origins: [origin] });
    if (!granted) throw new Error('Se necesita permiso para acceder a esa URL.');
    return true;
  }

  $('loadModels').addEventListener('click', async () => {
    const btn = $('loadModels');
    btn.disabled = true;
    btn.textContent = 'Cargando…';
    try {
      await ensureHostPermission();
      await save(true);
      const r = await chrome.runtime.sendMessage({ type: 'listModels', providerId: settings.provider });
      if (!r?.ok) throw new Error(r?.error || 'Error desconocido');
      $('modelList').innerHTML = r.models.map((m) => `<option value="${m.replace(/"/g, '&quot;')}"></option>`).join('');
      $('modelHelp').textContent = `${r.models.length} modelos disponibles: haz clic en el campo y escribe para filtrar.`;
      $('model').focus();
    } catch (e) {
      $('modelHelp').textContent = `No se pudo cargar la lista: ${e.message}`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Cargar modelos';
    }
  });

  $('test').addEventListener('click', async () => {
    const out = $('testResult');
    out.className = 'test-result';
    out.textContent = 'Probando…';
    $('test').disabled = true;
    try {
      await ensureHostPermission();
      await save(true);
      const r = await chrome.runtime.sendMessage({ type: 'testProvider', providerId: settings.provider });
      if (!r?.ok) throw new Error(r?.error || 'Error desconocido');
      out.className = 'test-result ok';
      out.textContent = `✓ Conexión correcta con ${r.model}${r.text ? ` — respuesta: "${r.text.slice(0, 40)}"` : ''}`;
    } catch (e) {
      out.className = 'test-result err';
      out.textContent = `✗ ${e.message}`;
    } finally {
      $('test').disabled = false;
    }
  });

  /* ---------- preferencias generales ---------- */

  const langSel = $('responseLanguage');
  langSel.innerHTML = Object.entries(SubmePrompts.LANGUAGES)
    .map(([code, name]) => `<option value="${code}">${name.charAt(0).toUpperCase() + name.slice(1)}</option>`).join('');

  const simple = {
    responseLanguage: 'value', maxOutputTokens: 'number', maxContextChars: 'number', transcriptLanguage: 'value', defaultTab: 'value',
    showTimestamps: 'checked', autoScroll: 'checked', panelCollapsed: 'checked', shortsCollapsed: 'checked', autoSummary: 'checked',
  };
  function renderGeneral() {
    for (const [key, prop] of Object.entries(simple)) {
      const el = $(key);
      if (prop === 'checked') el.checked = !!settings[key];
      else el.value = settings[key] ?? '';
    }
  }
  for (const [key, prop] of Object.entries(simple)) {
    $(key).addEventListener(prop === 'checked' || $(key).tagName === 'SELECT' ? 'change' : 'input', () => {
      const el = $(key);
      if (prop === 'checked') settings[key] = el.checked;
      else if (prop === 'number') settings[key] = Number(el.value) || DEFAULT_SETTINGS[key];
      else settings[key] = el.value.trim();
      save();
    });
  }

  /* ---------- acciones personalizadas ---------- */

  function renderCustom() {
    const box = $('customActions');
    box.innerHTML = '';
    settings.customActions.forEach((a, i) => {
      const div = document.createElement('div');
      div.className = 'custom';
      div.innerHTML = `
        <div class="row">
          <input type="text" class="icon" maxlength="4" placeholder="⭐">
          <input type="text" class="label" placeholder="Nombre del botón (p. ej. Ideas de negocio)">
          <button type="button" class="btn danger">Eliminar</button>
        </div>
        <textarea class="prompt" placeholder="Instrucciones para la IA (p. ej. Extrae ideas de negocio mencionadas en el video y evalúa su viabilidad)."></textarea>`;
      div.querySelector('.icon').value = a.icon || '';
      div.querySelector('.label').value = a.label || '';
      div.querySelector('.prompt').value = a.prompt || '';
      const upd = () => {
        settings.customActions[i] = {
          icon: div.querySelector('.icon').value.trim(),
          label: div.querySelector('.label').value.trim(),
          prompt: div.querySelector('.prompt').value.trim(),
        };
        save();
      };
      div.querySelectorAll('input, textarea').forEach((el) => el.addEventListener('input', upd));
      div.querySelector('.btn').addEventListener('click', () => {
        settings.customActions.splice(i, 1);
        save();
        renderCustom();
      });
      box.appendChild(div);
    });
  }
  $('addAction').addEventListener('click', () => {
    settings.customActions.push({ icon: '⭐', label: '', prompt: '' });
    renderCustom();
    $('customActions').lastElementChild?.querySelector('.label').focus();
  });

  $('reset').addEventListener('click', async () => {
    if (!confirm('¿Borrar toda la configuración, incluidas las API keys?')) return;
    settings = structuredClone(DEFAULT_SETTINGS);
    await SubmeVault.reset();
    vault = await SubmeVault.status();
    vaultKeys = null;
    await save(true);
    renderAll();
  });

  /* ---------- seguridad: contraseña ---------- */

  const AUTOLOCK = [[0, 'Al cerrar el navegador'], [15, 'Tras 15 min sin uso'], [60, 'Tras 1 hora sin uso'], [240, 'Tras 4 horas sin uso']];
  const autolockSelect = (value) => `<select id="vAutolock">${AUTOLOCK.map(([v, l]) => `<option value="${v}"${Number(value) === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  const secMsg = (text, ok = false) => { const el = $('vMsg'); if (el) { el.textContent = text; el.className = `test-result ${ok ? 'ok' : 'err'}`; } };

  async function refreshVault() {
    vault = await SubmeVault.status();
    vaultKeys = vault.enabled && !vault.locked ? { ...((await SubmeVault.getSession())?.keys || {}) } : null;
    renderAll();
  }

  function plainKeys() {
    return Object.fromEntries(Object.keys(PROVIDERS).map((id) => [id, settings.providers[id]?.apiKey || '']).filter(([, v]) => v));
  }

  const SI = SubmeSecretInput;
  const methodName = (m) => SI.METHODS[m]?.label.toLowerCase() || 'contraseña';

  /**
   * Flujo de creación de secreto en dos pasos (crear → repetir) con elección de método.
   * onDone(secret, method) se llama cuando ambos coinciden.
   */
  function secretSetup(box, { buttonLabel, onDone, initialMethod = 'password' }) {
    let method = initialMethod;
    let first = null;
    let ctrl = null;
    box.innerHTML = `
      <div class="sn-methods">${Object.entries(SI.METHODS).map(([id, m]) => `<button type="button" data-m="${id}">${m.icon} ${m.label}<small>${{ password: 'Mín. 8 caracteres', images: 'Mín. 6 imágenes en orden', pattern: 'Mín. 6 puntos unidos' }[id]}</small></button>`).join('')}</div>
      <div class="sn-secret-step" id="vStep"></div>
      <div id="vInput"></div>
      <div class="row" style="margin-top:10px;justify-content:center"><button type="button" class="btn" id="vBack" hidden>← Volver</button><button type="button" class="btn primary" id="vNext"></button></div>
      <div style="text-align:center;margin-top:6px"><span id="vMsg" class="test-result"></span></div>`;
    const step = (n) => {
      box.querySelectorAll('[data-m]').forEach((b) => { b.classList.toggle('active', b.dataset.m === method); b.disabled = n === 2; });
      $('vStep').textContent = n === 1
        ? { password: '1. Escribe tu contraseña', images: '1. Elige tus imágenes en orden (recuerda la secuencia)', pattern: '1. Dibuja tu patrón' }[method]
        : `2. Repite ${method === 'images' ? 'las imágenes' : method === 'pattern' ? 'el patrón' : 'la contraseña'} para confirmar`;
      $('vNext').textContent = n === 1 ? 'Continuar' : buttonLabel;
      $('vBack').hidden = n === 1;
      ctrl = SI.create($('vInput'), { method, autocomplete: 'new-password', onComplete: () => {} });
      ctrl.focus();
    };
    box.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { method = b.dataset.m; first = null; secMsg(''); step(1); }));
    $('vBack').addEventListener('click', () => { first = null; secMsg(''); step(1); });
    $('vNext').addEventListener('click', async () => {
      try {
        ctrl.validate();
        if (first === null) { first = ctrl.value; secMsg(''); step(2); return; }
        if (ctrl.value !== first) { ctrl.clear(); throw new Error(`No coincide con ${method === 'images' ? 'las imágenes' : method === 'pattern' ? 'el patrón' : 'la contraseña'} del paso 1. Inténtalo otra vez.`); }
        secMsg('Cifrando…', true);
        await onDone(first, method);
      } catch (e) { secMsg(e.message); }
    });
    step(1);
  }

  function renderSecurity() {
    const box = $('securityBody');
    if (!vault.enabled) {
      box.innerHTML = `
        <p class="muted">Cifra tus API keys. Si alguien copia tu perfil de Chrome, solo verá datos cifrados. Para usar la IA tendrás que desbloquearlas (una vez por sesión del navegador). Elige cómo: con una contraseña, una secuencia de imágenes o un patrón de puntos.</p>
        <div id="vSetup"></div>
        <label class="field" style="max-width:320px;margin:14px auto 0"><span>Bloquear automáticamente</span>${autolockSelect(0)}</label>
        <p class="muted" style="text-align:center"><small>⚠ Si lo olvidas no hay forma de recuperarlo: tendrás que volver a pegar tus claves.</small></p>`;
      secretSetup($('vSetup'), {
        buttonLabel: 'Activar protección',
        onDone: async (secret, method) => {
          await SubmeVault.enable(secret, plainKeys(), $('vAutolock').value, method);
          for (const id of Object.keys(settings.providers)) settings.providers[id].apiKey = '';
          await save(true);
          await refreshVault();
          secMsg('Protección activada ✓', true);
        },
      });
      return;
    }
    if (vault.locked) {
      box.innerHTML = `
        <p style="text-align:center"><b>🔒 Claves cifradas y bloqueadas</b> <span class="muted">(${methodName(vault.method)})</span></p>
        <div id="vInput"></div>
        <div class="row" style="margin-top:10px;justify-content:center"><button type="button" class="btn primary" id="vUnlock">Desbloquear</button></div>
        <div style="text-align:center;margin-top:6px"><span id="vMsg" class="test-result"></span></div>
        <p class="muted" style="text-align:center"><button type="button" class="btn danger" id="vForgot">Lo olvidé</button></p>`;
      let ctrl = null;
      const doUnlock = async () => {
        try {
          secMsg('Verificando…', true);
          await SubmeVault.unlock(ctrl.value);
          await refreshVault();
          secMsg('Desbloqueadas ✓', true);
        } catch (e) { secMsg(e.message); ctrl.clear(); }
      };
      ctrl = SI.create($('vInput'), { method: vault.method, onComplete: () => { if (vault.method !== 'images') doUnlock(); } });
      $('vUnlock').addEventListener('click', doUnlock);
      $('vForgot').addEventListener('click', async () => {
        if (!confirm('Se borrarán tus API keys cifradas y tendrás que volver a pegarlas. ¿Continuar?')) return;
        await SubmeVault.reset();
        await refreshVault();
      });
      return;
    }
    box.innerHTML = `
      <p><b>🔓 Claves cifradas y desbloqueadas</b> <span class="muted">(método: ${methodName(vault.method)}; se bloquean al cerrar el navegador${vault.autoLockMinutes ? ` o tras ${vault.autoLockMinutes} min sin uso` : ''}).</span></p>
      <div class="row"><button type="button" class="btn" id="vLock">🔒 Bloquear ahora</button><label class="row" style="flex:1">${autolockSelect(vault.autoLockMinutes)}</label></div>
      <div class="row" style="margin-top:10px"><button type="button" class="btn" id="vChangeOpen">Cambiar método o secreto</button><button type="button" class="btn danger" id="vDisable">Desactivar protección</button></div>
      <div id="vChange" hidden style="margin-top:12px"></div>
      <div style="margin-top:6px"><span id="vMsg" class="test-result"></span></div>`;
    $('vLock').addEventListener('click', async () => { await SubmeVault.lock(); await refreshVault(); });
    $('vAutolock').addEventListener('change', async () => { await SubmeVault.setAutoLock($('vAutolock').value); vault = await SubmeVault.status(); secMsg('Guardado ✓', true); });
    $('vChangeOpen').addEventListener('click', () => {
      const c = $('vChange');
      c.hidden = false;
      $('vChangeOpen').disabled = true;
      // El área de mensajes la crea secretSetup dentro del bloque; eliminamos la externa para no duplicar ids.
      document.querySelectorAll('#vMsg').forEach((el) => el.remove());
      secretSetup(c, {
        buttonLabel: 'Guardar nuevo secreto',
        initialMethod: vault.method,
        onDone: async (secret, method) => {
          await SubmeVault.changePassword(secret, method);
          await refreshVault();
          secMsg('Secreto cambiado ✓', true);
        },
      });
    });
    $('vDisable').addEventListener('click', async () => {
      if (!confirm('Las API keys volverán a guardarse sin cifrar en este navegador. ¿Continuar?')) return;
      const keys = await SubmeVault.disable();
      for (const [id, key] of Object.entries(keys)) settings.providers[id] = { ...settings.providers[id], apiKey: key };
      await save(true);
      await refreshVault();
    });
  }

  // Si la bóveda se bloquea o desbloquea desde otra ventana, actualizar la vista.
  chrome.storage.onChanged.addListener((changes, area) => {
    if ((area === 'session' && changes.unlocked) || (area === 'local' && changes.vault)) {
      clearTimeout(refreshVault.t);
      refreshVault.t = setTimeout(async () => {
        const st = await SubmeVault.status();
        if (st.enabled !== vault.enabled || st.locked !== vault.locked) refreshVault();
      }, 100);
    }
  });

  function renderAll() {
    renderSecurity();
    renderProviders();
    renderProviderForm();
    renderGeneral();
    renderCustom();
  }
  renderAll();
})();
