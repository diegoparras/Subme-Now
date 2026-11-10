/* Subme Now — historial local por video (IndexedDB en el origen de la extensión).
 * Lo usan el service worker (guardar / leer desde YouTube) y la página de la biblioteca.
 * Nada sale del navegador.
 */
(function (root) {
  const DB_NAME = 'subme-now';
  const VERSION = 1;
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('videos')) {
          const s = db.createObjectStore('videos', { keyPath: 'videoId' });
          s.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('deck')) db.createObjectStore('deck', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
    return dbPromise;
  }

  const done = (req) => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });

  async function tx(store, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      let out;
      Promise.resolve(fn(t.objectStore(store))).then((v) => { out = v; }, reject);
      t.oncomplete = () => resolve(out);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }

  const get = (videoId) => tx('videos', 'readonly', (s) => done(s.get(videoId))).then((r) => r || null);
  const all = () => tx('videos', 'readonly', (s) => done(s.getAll())).then((list) => list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
  const remove = (videoId) => tx('videos', 'readwrite', (s) => done(s.delete(videoId)));
  const put = (record) => tx('videos', 'readwrite', (s) => done(s.put(record)));
  const clear = () => Promise.all([tx('videos', 'readwrite', (s) => done(s.clear())), tx('deck', 'readwrite', (s) => done(s.clear()))]);

  function blank(videoId) {
    const now = Date.now();
    return { videoId, title: '', author: '', lengthSeconds: 0, isShort: false, createdAt: now, updatedAt: now, favorite: false, tags: [], results: {}, viewStates: {}, chat: [], transcript: null };
  }

  /** Lee, modifica y guarda un registro en una sola transacción. Si fn(record) devuelve false, el registro no se guarda (y se borra si existía). */
  function update(videoId, fn) {
    return tx('videos', 'readwrite', async (s) => {
      const existing = await done(s.get(videoId));
      const record = existing || blank(videoId);
      const r = fn(record);
      if (r === false) {
        if (existing) await done(s.delete(videoId)); // quedó vacío: se elimina
        return null;
      }
      await done(s.put(record));
      return record;
    });
  }

  /**
   * Aplica un cambio enviado desde el panel de YouTube.
   * patch: { video, result, removeResult, chat, viewStates, transcript }
   */
  function applyPatch(videoId, patch = {}) {
    return update(videoId, (r) => {
      const v = patch.video || {};
      for (const k of ['title', 'author', 'lengthSeconds', 'channelId', 'isShort']) if (v[k] !== undefined && v[k] !== '') r[k] = v[k];
      if (patch.result?.id && patch.result.text) {
        const x = patch.result;
        r.results[x.id] = { id: x.id, label: String(x.label || '').slice(0, 200), icon: x.icon || 'sparkles', view: x.view || '', prompt: x.custom ? String(x.prompt || '').slice(0, 4000) : '', text: String(x.text), provider: x.provider || '', model: x.model || '', at: Date.now() };
        delete r.viewStates[x.id]; // resultado nuevo: el progreso anterior ya no aplica
      }
      if (patch.removeResult) { delete r.results[patch.removeResult]; delete r.viewStates[patch.removeResult]; }
      if (Array.isArray(patch.chat)) r.chat = patch.chat.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content).map((m) => ({ role: m.role, content: String(m.content) }));
      if (patch.viewStates && typeof patch.viewStates === 'object') r.viewStates = { ...r.viewStates, ...patch.viewStates };
      if (patch.transcript?.segments?.length && (!r.transcript || patch.transcript.source === 'ai' || r.transcript.source !== 'ai')) {
        r.transcript = { source: patch.transcript.source || '', language: patch.transcript.language || '', segments: patch.transcript.segments.map((s) => ({ start: +s.start || 0, text: String(s.text || '') })) };
      }
      if (patch.meta) {
        if ('favorite' in patch.meta) r.favorite = !!patch.meta.favorite;
        if (Array.isArray(patch.meta.tags)) r.tags = [...new Set(patch.meta.tags.map((t) => String(t).trim().slice(0, 40)).filter(Boolean))].slice(0, 20);
      }
      // Un registro sin contenido no se guarda (solo una transcripción con subtítulos de YouTube no alcanza).
      const hasContent = Object.keys(r.results).length || r.chat.length || r.transcript?.source === 'ai' || r.favorite || r.tags.length;
      if (!hasContent) return false;
      r.updatedAt = Date.now();
      return true;
    });
  }

  /** Borra los videos sin actividad en los últimos `days` días (0 = nunca). Los favoritos se conservan. */
  async function prune(days) {
    days = Number(days) || 0;
    if (days <= 0) return 0;
    const limit = Date.now() - days * 86400000;
    return tx('videos', 'readwrite', async (s) => {
      const list = await done(s.getAll());
      let n = 0;
      for (const r of list) if (!r.favorite && (r.updatedAt || 0) < limit) { s.delete(r.videoId); n++; }
      return n;
    });
  }

  /** Reemplaza o combina registros importados de un respaldo JSON. */
  async function importRecords(records) {
    let n = 0;
    for (const r of records || []) {
      if (!r || typeof r.videoId !== 'string' || !/^[\w-]{6,20}$/.test(r.videoId)) continue;
      await update(r.videoId, (cur) => {
        Object.assign(cur, { ...r, results: { ...cur.results, ...(r.results || {}) }, tags: [...new Set([...(cur.tags || []), ...(r.tags || [])])] });
        cur.chat = Array.isArray(r.chat) && r.chat.length ? r.chat : cur.chat;
        return true;
      });
      n++;
    }
    return n;
  }

  // Mazo de repaso combinado (repetición espaciada simple).
  const deckAll = () => tx('deck', 'readonly', (s) => done(s.getAll()));
  const deckPut = (entry) => tx('deck', 'readwrite', (s) => done(s.put(entry)));

  root.SubmeHistory = { open, get, all, put, remove, clear, update, applyPatch, prune, importRecords, deckAll, deckPut };
})(globalThis);
