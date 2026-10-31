/* Subme Now — componente para ingresar el secreto que protege las API keys.
 * Tres métodos, a elección del usuario:
 *   - password: contraseña de texto (mín. 8 caracteres).
 *   - images:   secuencia de imágenes en una grilla de 36 que se mezcla en cada apertura (mín. 6).
 *   - pattern:  patrón de puntos en una grilla de 5×5 (mín. 6 puntos).
 * El valor resultante es un texto que se pasa a SubmeVault (PBKDF2 → AES-GCM).
 */
(function (root) {
  const IMAGES = [
    ['gato', '🐱'], ['perro', '🐶'], ['zorro', '🦊'], ['panda', '🐼'], ['pulpo', '🐙'], ['tortuga', '🐢'],
    ['mariposa', '🦋'], ['pinguino', '🐧'], ['cohete', '🚀'], ['avion', '✈️'], ['bicicleta', '🚲'], ['barco', '⛵'],
    ['manzana', '🍎'], ['pizza', '🍕'], ['helado', '🍦'], ['palta', '🥑'], ['banana', '🍌'], ['cereza', '🍒'],
    ['cactus', '🌵'], ['girasol', '🌻'], ['hongo', '🍄'], ['arbol', '🌳'], ['luna', '🌙'], ['sol', '☀️'],
    ['rayo', '⚡'], ['nieve', '❄️'], ['fuego', '🔥'], ['arcoiris', '🌈'], ['guitarra', '🎸'], ['pelota', '⚽'],
    ['dado', '🎲'], ['llave', '🔑'], ['corona', '👑'], ['diamante', '💎'], ['reloj', '⏰'], ['ancla', '⚓'],
  ];
  const LABELS = {
    gato: 'Gato', perro: 'Perro', zorro: 'Zorro', panda: 'Panda', pulpo: 'Pulpo', tortuga: 'Tortuga', mariposa: 'Mariposa',
    pinguino: 'Pingüino', cohete: 'Cohete', avion: 'Avión', bicicleta: 'Bicicleta', barco: 'Barco', manzana: 'Manzana',
    pizza: 'Pizza', helado: 'Helado', palta: 'Palta', banana: 'Banana', cereza: 'Cereza', cactus: 'Cactus', girasol: 'Girasol',
    hongo: 'Hongo', arbol: 'Árbol', luna: 'Luna', sol: 'Sol', rayo: 'Rayo', nieve: 'Nieve', fuego: 'Fuego', arcoiris: 'Arcoíris',
    guitarra: 'Guitarra', pelota: 'Pelota', dado: 'Dado', llave: 'Llave', corona: 'Corona', diamante: 'Diamante', reloj: 'Reloj', ancla: 'Ancla',
  };
  const GRID = 5;
  const MIN = { password: 8, images: 6, pattern: 6 };
  const METHODS = {
    password: { label: 'Contraseña', icon: '🔤' },
    images: { label: 'Imágenes', icon: '🖼️' },
    pattern: { label: 'Patrón', icon: '⋮⋮' },
  };

  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const r = new Uint32Array(1);
      crypto.getRandomValues(r);
      const j = r[0] % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function validate(method, value) {
    if (method === 'password') {
      if (value.length < MIN.password) throw new Error('La contraseña debe tener al menos 8 caracteres.');
    } else {
      const n = value ? value.slice(4).split(method === 'images' ? ',' : '-').filter(Boolean).length : 0;
      if (n < MIN[method]) {
        throw new Error(method === 'images' ? 'Elige al menos 6 imágenes.' : 'El patrón debe unir al menos 6 puntos.');
      }
    }
  }

  /**
   * Crea el control dentro de `container`.
   * opts: { method, autocomplete, onChange(value), onComplete(value) }
   */
  function create(container, opts = {}) {
    const method = opts.method || 'password';
    container.innerHTML = '';
    // Quitar el modificador del método anterior (si se cambia de método en el mismo contenedor).
    [...container.classList].filter((c) => c.startsWith('sn-secret--')).forEach((c) => container.classList.remove(c));
    container.classList.add('sn-secret', `sn-secret--${method}`);
    let value = '';
    const emit = () => opts.onChange?.(value);

    if (method === 'password') {
      const input = document.createElement('input');
      input.type = 'password';
      input.className = 'sn-secret-password';
      input.placeholder = 'Contraseña';
      input.autocomplete = opts.autocomplete || 'current-password';
      input.addEventListener('input', () => { value = input.value; emit(); });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); opts.onComplete?.(value); } });
      container.appendChild(input);
      return {
        get value() { return value; },
        clear() { input.value = ''; value = ''; emit(); },
        focus() { input.focus(); },
        validate() { validate(method, value); },
      };
    }

    if (method === 'images') {
      let seq = [];
      const progress = document.createElement('div');
      progress.className = 'sn-secret-progress';
      const grid = document.createElement('div');
      grid.className = 'sn-secret-images';
      const tools = document.createElement('div');
      tools.className = 'sn-secret-tools';
      tools.innerHTML = '<button type="button" data-k="undo">↶ Deshacer</button><button type="button" data-k="clear">Borrar</button>';
      container.append(progress, grid, tools);

      const render = () => {
        progress.textContent = seq.length ? `${'●'.repeat(seq.length)}  ${seq.length} ${seq.length === 1 ? 'imagen' : 'imágenes'}` : 'Toca tus imágenes en orden';
        value = seq.length ? `img:${seq.join(',')}` : '';
        emit();
      };
      // La grilla se mezcla cada vez: las posiciones de los clics no sirven para la próxima.
      for (const [id, emoji] of shuffled(IMAGES)) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = emoji;
        b.setAttribute('aria-label', LABELS[id]);
        b.title = LABELS[id];
        b.addEventListener('click', () => { if (seq.length < 16) { seq.push(id); render(); } });
        grid.appendChild(b);
      }
      tools.addEventListener('click', (e) => {
        const k = e.target.dataset.k;
        if (k === 'undo') seq.pop();
        if (k === 'clear') seq = [];
        render();
      });
      render();
      return {
        get value() { return value; },
        clear() { seq = []; render(); },
        focus() { grid.querySelector('button')?.focus(); },
        validate() { validate(method, value); },
      };
    }

    // Patrón de puntos 5×5
    const SIZE = 260;
    const STEP = SIZE / GRID;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
    svg.setAttribute('class', 'sn-secret-pattern');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Grilla de 5 por 5 puntos para dibujar el patrón');
    const path = document.createElementNS(NS, 'polyline');
    path.setAttribute('class', 'sn-pat-line');
    const live = document.createElementNS(NS, 'line');
    live.setAttribute('class', 'sn-pat-line');
    svg.append(path, live);
    const dots = [];
    for (let i = 0; i < GRID * GRID; i++) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', (i % GRID) * STEP + STEP / 2);
      c.setAttribute('cy', Math.floor(i / GRID) * STEP + STEP / 2);
      c.setAttribute('r', 9);
      c.setAttribute('class', 'sn-pat-dot');
      svg.appendChild(c);
      dots.push(c);
    }
    const progress = document.createElement('div');
    progress.className = 'sn-secret-progress';
    const tools = document.createElement('div');
    tools.className = 'sn-secret-tools';
    tools.innerHTML = '<button type="button" data-k="clear">Borrar</button>';
    container.append(progress, svg, tools);

    let seq = [];
    let drawing = false;
    const center = (i) => [(i % GRID) * STEP + STEP / 2, Math.floor(i / GRID) * STEP + STEP / 2];
    const render = () => {
      dots.forEach((d, i) => d.classList.toggle('on', seq.includes(i)));
      path.setAttribute('points', seq.map((i) => center(i).join(',')).join(' '));
      progress.textContent = seq.length ? `${seq.length} ${seq.length === 1 ? 'punto' : 'puntos'}` : 'Dibuja tu patrón uniendo los puntos';
      value = seq.length ? `pat:${seq.join('-')}` : '';
      emit();
    };
    const toLocal = (e) => {
      const r = svg.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * SIZE, ((e.clientY - r.top) / r.height) * SIZE];
    };
    const hit = ([x, y]) => {
      const col = Math.floor(x / STEP);
      const row = Math.floor(y / STEP);
      if (col < 0 || row < 0 || col >= GRID || row >= GRID) return -1;
      const i = row * GRID + col;
      const [cx, cy] = center(i);
      return Math.hypot(x - cx, y - cy) <= STEP * 0.38 ? i : -1;
    };
    const add = (i) => { if (i >= 0 && !seq.includes(i)) { seq.push(i); render(); } };

    svg.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      svg.setPointerCapture?.(e.pointerId);
      drawing = true;
      seq = [];
      add(hit(toLocal(e)));
      render();
    });
    svg.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const p = toLocal(e);
      add(hit(p));
      if (seq.length) {
        const [x1, y1] = center(seq[seq.length - 1]);
        live.setAttribute('x1', x1); live.setAttribute('y1', y1); live.setAttribute('x2', p[0]); live.setAttribute('y2', p[1]);
      }
    });
    const end = () => {
      if (!drawing) return;
      drawing = false;
      live.setAttribute('x2', live.getAttribute('x1') || 0);
      live.setAttribute('y2', live.getAttribute('y1') || 0);
      if (seq.length) opts.onComplete?.(value);
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    tools.addEventListener('click', () => { seq = []; render(); });
    render();
    return {
      get value() { return value; },
      clear() { seq = []; render(); },
      focus() {},
      validate() { validate(method, value); },
    };
  }

  root.SubmeSecretInput = { create, validate, METHODS, IMAGES, GRID, MIN };
})(globalThis);
