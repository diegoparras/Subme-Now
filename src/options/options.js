/* Subme Now — página de configuración. */
(async function () {
  const { getSettings, saveSettings, DEFAULT_SETTINGS } = SubmeSettings;
  const { PROVIDERS } = SubmeProviders;
  const $ = (id) => document.getElementById(id);

  let settings = await getSettings();
  let saveTimer = null;

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
      const configured = p.id === 'custom' ? !!conf.baseUrl : !!conf.apiKey;
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
    $('apiKey').value = conf.apiKey || '';
    $('apiKey').placeholder = p.id === 'custom' ? 'Opcional para servidores locales' : 'Pega aquí tu clave';
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
  bindProviderInput('apiKey', 'apiKey');
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
    await save(true);
    renderAll();
  });

  function renderAll() {
    renderProviders();
    renderProviderForm();
    renderGeneral();
    renderCustom();
  }
  renderAll();
})();
