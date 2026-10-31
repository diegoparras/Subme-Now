/* Subme Now — bóveda de API keys protegida con contraseña.
 *
 * - Las claves se cifran con AES-GCM 256. La clave de cifrado se deriva de la contraseña con
 *   PBKDF2-SHA256 (600.000 iteraciones + sal aleatoria). La contraseña nunca se guarda.
 * - En disco (chrome.storage.local) solo queda el texto cifrado.
 * - Al desbloquear, las claves descifradas se guardan en chrome.storage.session: vive solo en memoria,
 *   solo la ven la página de opciones y el service worker, y se borra al cerrar el navegador
 *   o tras el tiempo de bloqueo automático.
 *
 * Solo se usa desde contextos de la extensión (service worker, opciones y ventana de desbloqueo).
 */
(function (root) {
  const ITERATIONS = 600000;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const toB64 = (buf) => {
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  };
  const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  async function deriveKey(password, salt, iterations = ITERATIONS) {
    const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
  }

  async function encryptJson(key, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
    return { iv: toB64(iv), data: toB64(data) };
  }

  async function decryptJson(key, iv, data) {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, key, fromB64(data));
    return JSON.parse(dec.decode(plain));
  }

  const hasKeyMap = (keys) => Object.fromEntries(Object.entries(keys).map(([k, v]) => [k, !!v]));

  async function getVault() {
    const { vault } = await chrome.storage.local.get('vault');
    return vault || null;
  }

  async function isEnabled() {
    return !!(await getVault());
  }

  async function lock() {
    await chrome.storage.session.remove('unlocked');
  }

  /** Devuelve la sesión desbloqueada {raw, keys, lastUsed} o null si está bloqueada. */
  async function getSession() {
    const vault = await getVault();
    if (!vault) return null;
    const { unlocked } = await chrome.storage.session.get('unlocked');
    if (!unlocked) return null;
    const limit = Number(vault.autoLockMinutes) || 0;
    if (limit > 0 && Date.now() - unlocked.lastUsed > limit * 60000) {
      await lock();
      return null;
    }
    return unlocked;
  }

  async function touch() {
    const s = await getSession();
    if (s) await chrome.storage.session.set({ unlocked: { ...s, lastUsed: Date.now() } });
    return s;
  }

  async function storeSession(key, keys) {
    const raw = toB64(await crypto.subtle.exportKey('raw', key));
    await chrome.storage.session.set({ unlocked: { raw, keys, lastUsed: Date.now() } });
  }

  async function sessionKey(s) {
    return crypto.subtle.importKey('raw', fromB64(s.raw), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  function checkPassword(password) {
    if (typeof password !== 'string' || password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  }

  /** Activa la protección: cifra las claves dadas ({provider: apiKey}). */
  async function enable(password, keys, autoLockMinutes = 0) {
    checkPassword(password);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(password, salt);
    const payload = await encryptJson(key, keys);
    await chrome.storage.local.set({
      vault: { version: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: toB64(salt), ...payload, hasKey: hasKeyMap(keys), autoLockMinutes: Number(autoLockMinutes) || 0 },
    });
    await storeSession(key, keys);
  }

  async function unlock(password) {
    const vault = await getVault();
    if (!vault) throw new Error('La protección con contraseña no está activada.');
    const key = await deriveKey(password, fromB64(vault.salt), vault.iterations);
    let keys;
    try {
      keys = await decryptJson(key, vault.iv, vault.data);
    } catch {
      throw new Error('Contraseña incorrecta.');
    }
    await storeSession(key, keys);
    return keys;
  }

  /** Guarda nuevas claves (requiere estar desbloqueado). */
  async function saveKeys(keys) {
    const s = await getSession();
    const vault = await getVault();
    if (!s || !vault) throw new Error('Las claves están bloqueadas.');
    const payload = await encryptJson(await sessionKey(s), keys);
    await chrome.storage.local.set({ vault: { ...vault, ...payload, hasKey: hasKeyMap(keys) } });
    await chrome.storage.session.set({ unlocked: { ...s, keys, lastUsed: Date.now() } });
  }

  async function changePassword(newPassword) {
    const s = await getSession();
    const vault = await getVault();
    if (!s || !vault) throw new Error('Desbloquea las claves primero.');
    await enable(newPassword, s.keys, vault.autoLockMinutes);
  }

  async function setAutoLock(minutes) {
    const vault = await getVault();
    if (vault) await chrome.storage.local.set({ vault: { ...vault, autoLockMinutes: Number(minutes) || 0 } });
  }

  /** Desactiva la protección y devuelve las claves en claro para volver a guardarlas normalmente. */
  async function disable() {
    const s = await getSession();
    if (!s) throw new Error('Desbloquea las claves primero.');
    await chrome.storage.local.remove('vault');
    await lock();
    return s.keys;
  }

  /** "Olvidé mi contraseña": borra la bóveda y las claves. */
  async function reset() {
    await chrome.storage.local.remove('vault');
    await lock();
  }

  /** Estado público (sin secretos). */
  async function status() {
    const vault = await getVault();
    if (!vault) return { enabled: false, locked: false, hasKey: {} };
    const s = await getSession();
    return { enabled: true, locked: !s, hasKey: vault.hasKey || {}, autoLockMinutes: vault.autoLockMinutes || 0 };
  }

  root.SubmeVault = { enable, unlock, lock, getSession, touch, saveKeys, changePassword, setAutoLock, disable, reset, status, isEnabled, ITERATIONS };
})(globalThis);
