/* Subme Now — adaptadores de proveedores de IA (OpenRouter, OpenAI, Grok, Anthropic, Gemini, personalizado). */
(function (root) {
  const PROVIDERS = {
    openrouter: {
      id: 'openrouter',
      label: 'OpenRouter',
      type: 'openai',
      baseUrl: 'https://openrouter.ai/api/v1',
      defaultModel: 'openrouter/auto',
      keyUrl: 'https://openrouter.ai/keys',
      hint: 'Una sola clave para cientos de modelos (Claude, GPT, Gemini, Llama, DeepSeek…).',
    },
    openai: {
      id: 'openai',
      label: 'OpenAI',
      type: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-5-mini',
      keyUrl: 'https://platform.openai.com/api-keys',
      hint: 'Modelos GPT de OpenAI.',
    },
    grok: {
      id: 'grok',
      label: 'Grok (xAI)',
      type: 'openai',
      baseUrl: 'https://api.x.ai/v1',
      defaultModel: 'grok-4',
      keyUrl: 'https://console.x.ai',
      hint: 'Modelos Grok de xAI.',
    },
    anthropic: {
      id: 'anthropic',
      label: 'Anthropic (Claude)',
      type: 'anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      defaultModel: 'claude-opus-5-5',
      keyUrl: 'https://console.anthropic.com/settings/keys',
      hint: 'Modelos Claude de Anthropic.',
    },
    gemini: {
      id: 'gemini',
      label: 'Google Gemini',
      type: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      defaultModel: 'gemini-2.5-flash',
      keyUrl: 'https://aistudio.google.com/apikey',
      hint: 'Modelos Gemini de Google AI Studio.',
    },
    custom: {
      id: 'custom',
      label: 'Personalizado',
      type: 'openai',
      baseUrl: '',
      defaultModel: '',
      keyUrl: '',
      hint: 'Cualquier API compatible con OpenAI (Ollama, LM Studio, Groq, DeepSeek, Mistral, Together…).',
    },
  };

  const ANTHROPIC_VERSION = '2023-06-01';
  // Fallback del servidor ante rechazos (solo modelos Claude que lo soportan).
  const ANTHROPIC_FALLBACK_MODELS = /^claude-(opus-5(-5)?|sonnet-5-5|fable-5-1)$/;

  /** Combina la definición del proveedor con la configuración del usuario. */
  function resolveConfig(settings, providerId) {
    const id = providerId || settings.provider;
    const def = PROVIDERS[id];
    if (!def) throw new Error(`Proveedor desconocido: ${id}`);
    const user = settings.providers?.[id] || {};
    const baseUrl = String(user.baseUrl || def.baseUrl || '').replace(/\/+$/, '');
    return {
      ...def,
      apiKey: (user.apiKey || '').trim(),
      model: (user.model || '').trim() || def.defaultModel,
      baseUrl,
      maxOutputTokens: Number(settings.maxOutputTokens) || 16000,
    };
  }

  function validateConfig(cfg) {
    if (!cfg.baseUrl) throw new Error('Configura la URL base del proveedor personalizado en las opciones de Subme Now.');
    if (!cfg.apiKey && cfg.id !== 'custom') throw new Error(`Falta la API key de ${cfg.label}. Agrégala en la configuración de Subme Now.`);
    if (!cfg.model) throw new Error('Indica un modelo en la configuración de Subme Now.');
  }

  function authHeadersOpenAI(cfg) {
    const h = { 'Content-Type': 'application/json' };
    if (cfg.apiKey) h.Authorization = `Bearer ${cfg.apiKey}`;
    if (cfg.id === 'openrouter') {
      h['HTTP-Referer'] = 'https://github.com/diegoparras/subme-now';
      h['X-Title'] = 'Subme Now';
    }
    return h;
  }

  function anthropicHeaders(cfg) {
    return {
      'Content-Type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    };
  }

  /**
   * Construye la petición de chat en streaming.
   * messages: [{role: 'user'|'assistant', content: string}]
   */
  function buildChatRequest(cfg, { system, messages }) {
    if (cfg.type === 'anthropic') {
      const headers = anthropicHeaders(cfg);
      const body = {
        model: cfg.model,
        max_tokens: cfg.maxOutputTokens,
        // La transcripción va en el system prompt: se cachea para que el chat y las acciones siguientes sean más baratos.
        system: system ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] : undefined,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
      };
      if (ANTHROPIC_FALLBACK_MODELS.test(cfg.model)) {
        headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
        body.fallbacks = 'default';
      }
      return { url: `${cfg.baseUrl}/messages`, init: { method: 'POST', headers, body: JSON.stringify(body) } };
    }

    if (cfg.type === 'gemini') {
      const body = {
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: cfg.maxOutputTokens },
      };
      const model = cfg.model.replace(/^models\//, '');
      return {
        url: `${cfg.baseUrl}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
          body: JSON.stringify(body),
        },
      };
    }

    // OpenAI y compatibles (OpenRouter, Grok, personalizado)
    const body = {
      model: cfg.model,
      messages: [...(system ? [{ role: 'system', content: system }] : []), ...messages],
      stream: true,
    };
    return { url: `${cfg.baseUrl}/chat/completions`, init: { method: 'POST', headers: authHeadersOpenAI(cfg), body: JSON.stringify(body) } };
  }

  /**
   * Interpreta un evento SSE. Devuelve {text?, done?, notice?} o lanza un Error.
   */
  function parseStreamEvent(cfg, eventName, data) {
    if (cfg.type === 'anthropic') {
      const json = JSON.parse(data);
      if (json.type === 'error' || eventName === 'error') throw new Error(json.error?.message || 'Error del proveedor');
      if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') return { text: json.delta.text };
      if (json.type === 'message_delta') {
        const r = json.delta?.stop_reason;
        if (r === 'refusal') throw new Error('El modelo rechazó la solicitud. Prueba con otro modelo o reformula el pedido.');
        if (r === 'max_tokens') return { notice: 'La respuesta se cortó por el límite de tokens de salida (ajústalo en la configuración).' };
      }
      if (json.type === 'message_stop') return { done: true };
      return {};
    }

    if (cfg.type === 'gemini') {
      const json = JSON.parse(data);
      if (json.error) throw new Error(json.error.message || 'Error de Gemini');
      if (json.promptFeedback?.blockReason) throw new Error(`Gemini bloqueó la solicitud (${json.promptFeedback.blockReason}).`);
      const cand = json.candidates?.[0];
      const text = (cand?.content?.parts || []).filter((p) => !p.thought && p.text).map((p) => p.text).join('');
      const out = { text };
      if (cand?.finishReason === 'MAX_TOKENS') out.notice = 'La respuesta se cortó por el límite de tokens de salida.';
      return out;
    }

    if (data === '[DONE]') return { done: true };
    const json = JSON.parse(data);
    if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
    const choice = json.choices?.[0];
    const out = { text: choice?.delta?.content || '' };
    if (choice?.finish_reason === 'length') out.notice = 'La respuesta se cortó por el límite de tokens de salida.';
    return out;
  }

  function buildModelsRequest(cfg) {
    if (cfg.type === 'anthropic') {
      return { url: `${cfg.baseUrl}/models?limit=1000`, init: { headers: anthropicHeaders(cfg) } };
    }
    if (cfg.type === 'gemini') {
      return { url: `${cfg.baseUrl}/models?pageSize=1000`, init: { headers: { 'x-goog-api-key': cfg.apiKey } } };
    }
    return { url: `${cfg.baseUrl}/models`, init: { headers: authHeadersOpenAI(cfg) } };
  }

  function parseModels(cfg, json) {
    if (cfg.type === 'gemini') {
      return (json.models || [])
        .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
        .map((m) => m.name.replace(/^models\//, ''));
    }
    return (json.data || []).map((m) => m.id).filter(Boolean);
  }

  async function readError(res) {
    let text = '';
    try {
      text = await res.text();
      const json = JSON.parse(text);
      const msg = json.error?.message || json.message || (Array.isArray(json) && json[0]?.error?.message);
      if (msg) text = msg;
    } catch { /* texto plano */ }
    const hints = {
      401: 'API key inválida o sin permisos.',
      403: 'Acceso denegado por el proveedor.',
      404: 'Modelo o endpoint no encontrado.',
      429: 'Límite de uso alcanzado; espera un momento o revisa tu saldo.',
    };
    return new Error(`${hints[res.status] || `Error HTTP ${res.status}.`} ${text ? `(${String(text).slice(0, 300)})` : ''}`.trim());
  }

  const TRANSCRIBE_PROMPT = [
    'Transcribe the spoken audio of this video verbatim, in the language in which it is spoken. Do not translate, summarize or correct it.',
    'Output ONLY transcript lines: one line per sentence or short phrase, each starting with the time it is spoken, as [mm:ss] (or [h:mm:ss] after the first hour).',
    'Do not add titles, notes, speaker descriptions or any other text. If a fragment has no speech, skip it.',
    'If the video has no speech at all, output exactly: [00:00] (no speech)',
  ].join('\n');

  /**
   * Transcripción con Gemini: el modelo lee el video de YouTube directamente desde su URL
   * (solo videos públicos). Usa resolución de video baja para gastar menos tokens.
   */
  function buildTranscribeRequest(cfg, videoUrl) {
    const model = (cfg.model || 'gemini-2.5-flash').replace(/^models\//, '');
    const generationConfig = { temperature: 0, maxOutputTokens: 65536, mediaResolution: 'MEDIA_RESOLUTION_LOW' };
    if (/^gemini-2\.5-flash/.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };
    const body = {
      contents: [{ role: 'user', parts: [{ file_data: { file_uri: videoUrl } }, { text: TRANSCRIBE_PROMPT }] }],
      generationConfig,
    };
    return {
      url: `${cfg.baseUrl}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
      init: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey }, body: JSON.stringify(body) },
    };
  }

  root.SubmeProviders = {
    buildTranscribeRequest,
    PROVIDERS, resolveConfig, validateConfig, buildChatRequest, parseStreamEvent, buildModelsRequest, parseModels, readError,
  };
})(globalThis);
