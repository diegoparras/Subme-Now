/* Subme Now — renderizador Markdown mínimo y seguro (escapa todo el HTML). */
(function (root) {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const TIME = '(?:\\d{1,2}:)?\\d{1,2}:\\d{2}';
  const TS_RE = new RegExp(`([\\[(])(${TIME})(\\s*[-–—]\\s*${TIME})?([\\])])`, 'g');

  function toSeconds(t) {
    return t.split(':').map(Number).reduce((a, b) => a * 60 + b, 0);
  }

  function inline(text) {
    let s = esc(text);
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });

    // Marcas de tiempo [mm:ss] / (mm:ss) / [mm:ss - mm:ss] → enlaces clicables
    s = s.replace(TS_RE, (m, open, t1, range, close) => {
      if ((open === '[' && close !== ']') || (open === '(' && close !== ')')) return m;
      return `<a class="sn-ts" data-t="${toSeconds(t1)}" href="#">${t1}${range ? esc(range) : ''}</a>`;
    });

    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__(.+?)__/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?!\w)/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^\w])_(?!\s)([^_]+?)_(?!\w)/g, '$1<em>$2</em>');
    s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');
    s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
    return s;
  }

  function splitRow(line) {
    let l = line.trim();
    if (l.startsWith('|')) l = l.slice(1);
    if (l.endsWith('|')) l = l.slice(0, -1);
    return l.split('|').map((c) => c.trim());
  }

  function render(md) {
    const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
    let out = '';
    let para = [];
    const stack = []; // listas abiertas: {indent, type, liOpen}

    const flushPara = () => {
      if (para.length) out += `<p>${para.map(inline).join('<br>')}</p>`;
      para = [];
    };
    const closeList = () => {
      const top = stack.pop();
      if (top.liOpen) out += '</li>';
      out += `</${top.type}>`;
    };
    const closeAllLists = () => { while (stack.length) closeList(); };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Bloque de código
      const fence = line.match(/^\s*(```|~~~)\s*([\w+-]*)\s*$/);
      if (fence) {
        flushPara(); closeAllLists();
        const buf = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith(fence[1])) buf.push(lines[i++]);
        out += `<div class="sn-code"><button class="sn-copy-code" title="Copiar">Copiar</button><pre><code>${esc(buf.join('\n'))}</code></pre></div>`;
        continue;
      }

      if (!line.trim()) { flushPara(); closeAllLists(); continue; }

      const heading = line.match(/^\s*(#{1,6})\s+(.*?)\s*#*\s*$/);
      if (heading) {
        flushPara(); closeAllLists();
        const lvl = Math.min(6, heading[1].length + 1); // # → h2 para no competir con la página
        out += `<h${lvl}>${inline(heading[2])}</h${lvl}>`;
        continue;
      }

      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
        flushPara(); closeAllLists();
        out += '<hr>';
        continue;
      }

      // Tabla
      if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
        flushPara(); closeAllLists();
        const header = splitRow(line);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(splitRow(lines[i++]));
        i--;
        out += '<div class="sn-table"><table><thead><tr>' + header.map((h) => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>'
          + rows.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>';
        continue;
      }

      const quote = line.match(/^\s*>\s?(.*)$/);
      if (quote) {
        flushPara(); closeAllLists();
        const buf = [quote[1]];
        while (i + 1 < lines.length && /^\s*>/.test(lines[i + 1])) buf.push(lines[++i].replace(/^\s*>\s?/, ''));
        out += `<blockquote>${buf.map(inline).join('<br>')}</blockquote>`;
        continue;
      }

      const item = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
      if (item) {
        flushPara();
        const indent = item[1].replace(/\t/g, '    ').length;
        const type = /\d/.test(item[2]) ? 'ol' : 'ul';
        let content = item[3];
        while (stack.length && indent < stack[stack.length - 1].indent) closeList();
        let top = stack[stack.length - 1];
        if (top && indent === top.indent && type !== top.type) { closeList(); top = stack[stack.length - 1]; }
        if (!top || indent > top.indent) {
          const start = type === 'ol' && parseInt(item[2], 10) !== 1 ? ` start="${parseInt(item[2], 10)}"` : '';
          out += `<${type}${start}>`;
          stack.push({ indent, type, liOpen: false });
        } else if (top.liOpen) {
          out += '</li>';
        }
        let prefix = '';
        const task = content.match(/^\[( |x|X)\]\s+(.*)$/);
        if (task) { prefix = task[1] === ' ' ? '☐ ' : '☑ '; content = task[2]; }
        out += `<li>${esc(prefix)}${inline(content)}`;
        stack[stack.length - 1].liOpen = true;
        continue;
      }

      if (stack.length && /^\s+\S/.test(line)) { out += `<br>${inline(line.trim())}`; continue; }

      closeAllLists();
      para.push(line.trim());
    }
    flushPara();
    closeAllLists();
    return out;
  }

  root.SubmeMarkdown = { render, inline };
})(globalThis);
