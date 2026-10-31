/* Subme Now — configuración persistida en chrome.storage.local (nunca se sincroniza). */
(function (root) {
  const DEFAULT_SETTINGS = {
    provider: 'openrouter',
    providers: {
      openrouter: { apiKey: '', model: '' },
      openai: { apiKey: '', model: '' },
      grok: { apiKey: '', model: '' },
      anthropic: { apiKey: '', model: '' },
      gemini: { apiKey: '', model: '' },
      custom: { apiKey: '', model: '', baseUrl: '' },
    },
    responseLanguage: 'es',
    maxOutputTokens: 16000,
    maxContextChars: 200000,
    transcriptLanguage: '',
    showTimestamps: true,
    autoScroll: true,
    panelCollapsed: false,
    autoSummary: false,
    defaultTab: 'transcript',
    customActions: [],
  };

  function merge(base, extra) {
    if (Array.isArray(base)) return Array.isArray(extra) ? extra : base;
    if (base && typeof base === 'object') {
      const out = { ...base };
      if (extra && typeof extra === 'object') {
        for (const k of Object.keys(extra)) out[k] = k in base ? merge(base[k], extra[k]) : extra[k];
      }
      return out;
    }
    return extra === undefined ? base : extra;
  }

  async function getSettings() {
    const { settings } = await chrome.storage.local.get('settings');
    return merge(DEFAULT_SETTINGS, settings || {});
  }

  async function saveSettings(settings) {
    await chrome.storage.local.set({ settings });
  }

  function onSettingsChanged(cb) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.settings) cb(merge(DEFAULT_SETTINGS, changes.settings.newValue || {}));
    });
  }

  root.SubmeSettings = { DEFAULT_SETTINGS, getSettings, saveSettings, onSettingsChanged, merge };
})(globalThis);
