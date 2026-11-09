/* Subme Now — exportación de resultados.
 * - Copiar con formato (HTML + texto) para pegar en Google Docs, Notion o Word.
 * - Enviar a Obsidian (enlace obsidian://new).
 * - Descargar Markdown, Word (.docx generado aquí mismo, sin librerías) o imprimir / guardar como PDF.
 * Las marcas de tiempo se convierten en enlaces al minuto exacto del video.
 */
(function () {
  const SN = (globalThis.SubmeNow = globalThis.SubmeNow || {});
  const U = SubmeUtils;
  const MD = SubmeMarkdown;

  const TS_RE = /[[(]((?:\d{1,2}:)?\d{1,2}:\d{2})(\s*[-–—]\s*(?:\d{1,2}:)?\d{1,2}:\d{2})?[\])]/g;
  const toSec = (t) => t.split(':').map(Number).reduce((a, b) => a * 60 + b, 0);
  const videoLink = (video, sec) => `https://www.youtube.com/watch?v=${encodeURIComponent(video?.videoId || '')}&t=${sec}s`;

  /** Markdown con las marcas de tiempo convertidas en enlaces al video. */
  function linkTimestamps(md, video) {
    if (!video?.videoId) return md;
    return String(md).replace(TS_RE, (m, t1, range, offset, str) => {
      if (str[offset + m.length] === '(') return m; // ya es un enlace Markdown
      return `[${t1}${range || ''}](${videoLink(video, toSec(t1))})`;
    });
  }

  /** Documento Markdown completo (con metadatos para Obsidian). */
  function markdownDoc({ video, title, text }) {
    const date = new Date().toISOString().slice(0, 10);
    const yaml = (v) => `"${String(v || '').replace(/"/g, '\\"')}"`;
    return [
      '---',
      `title: ${yaml(`${title} — ${video?.title || ''}`)}`,
      `video: ${yaml(video?.url)}`,
      `channel: ${yaml(video?.author)}`,
      `date: ${date}`,
      'tags: [subme-now, youtube]',
      '---',
      '',
      `# ${title}: ${video?.title || ''}`,
      '',
      `> Video: [${video?.title || 'YouTube'}](${video?.url || ''})${video?.author ? ` · ${video.author}` : ''} · generado con Subme Now el ${date}`,
      '',
      linkTimestamps(text, video).trim(),
      '',
    ].join('\n');
  }

  /** HTML con formato (para portapapeles y PDF). */
  function htmlDoc({ video, title, text }) {
    // Las marcas de tiempo que el renderizador convierte en botones pasan a ser enlaces al minuto del video.
    const body = MD.render(text)
      .replace(/<a class="sn-ts" data-t="(\d+)" href="#">/g, (m, t) => (video?.videoId ? `<a href="${U.escapeHtml(videoLink(video, Number(t)))}">` : '<a>'))
      .replace(/<div class="sn-code"><button[^>]*>Copiar<\/button>/g, '<div>');
    return `<h1>${U.escapeHtml(title)}: ${U.escapeHtml(video?.title || '')}</h1>
<p><em>Video: <a href="${U.escapeHtml(video?.url || '')}">${U.escapeHtml(video?.title || 'YouTube')}</a>${video?.author ? ` · ${U.escapeHtml(video.author)}` : ''}</em></p>
${body}`;
  }

  async function copyRich(doc) {
    const html = htmlDoc(doc);
    const md = markdownDoc(doc);
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([md], { type: 'text/plain' }),
      })]);
      return true;
    } catch {
      return U.copyText(md);
    }
  }

  /** Abre Obsidian con la nota. Si es muy larga, la pasa por el portapapeles. */
  async function toObsidian(doc, { vault = '', folder = '' } = {}) {
    const md = markdownDoc(doc);
    const safe = (s) => U.safeFilename(s).replace(/[#^[\]|]/g, '');
    const name = `${folder ? `${folder.replace(/^\/+|\/+$/g, '')}/` : ''}${safe(`${doc.title} - ${doc.video?.title || 'video'}`)}`;
    const params = new URLSearchParams();
    if (vault) params.set('vault', vault);
    params.set('file', name);
    let uri;
    if (md.length < 6000) {
      params.set('content', md);
      uri = `obsidian://new?${params.toString().replace(/\+/g, '%20')}`;
    } else {
      await U.copyText(md);
      params.set('clipboard', 'true');
      uri = `obsidian://new?${params.toString().replace(/\+/g, '%20')}`;
    }
    const a = document.createElement('a');
    a.href = uri;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return uri;
  }

  /* ---------- Word (.docx) ---------- */

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (bytes) => {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

  /** ZIP sin compresión (suficiente para .docx). */
  function zip(files) {
    const enc = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name);
      const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      const crc = crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true); // nombres en UTF-8
      local.setUint16(8, 0, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true);
      local.setUint16(26, name.length, true);
      chunks.push(new Uint8Array(local.buffer), name, data);
      const cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true);
      cd.setUint16(4, 20, true);
      cd.setUint16(6, 20, true);
      cd.setUint16(8, 0x0800, true);
      cd.setUint32(16, crc, true);
      cd.setUint32(20, data.length, true);
      cd.setUint32(24, data.length, true);
      cd.setUint16(28, name.length, true);
      cd.setUint32(42, offset, true);
      central.push(new Uint8Array(cd.buffer), name);
      offset += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((a, c) => a + c.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, offset, true);
    return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  const xml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function docx(doc) {
    const rels = [];
    const relId = (url) => {
      let i = rels.indexOf(url);
      if (i < 0) { rels.push(url); i = rels.length - 1; }
      return `rLink${i + 1}`;
    };
    const runs = (node, fmt = {}) => {
      let out = '';
      for (const n of node.childNodes) {
        if (n.nodeType === 3) {
          if (!n.textContent) continue;
          const props = [fmt.b && '<w:b/>', fmt.i && '<w:i/>', fmt.code && '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>', fmt.link && '<w:rStyle w:val="Hyperlink"/>'].filter(Boolean).join('');
          out += `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${xml(n.textContent)}</w:t></w:r>`;
        } else if (n.nodeType === 1) {
          const tag = n.tagName.toLowerCase();
          if (tag === 'br') { out += '<w:r><w:br/></w:r>'; continue; }
          if (tag === 'a' && /^https?:/.test(n.getAttribute('href') || '')) {
            out += `<w:hyperlink r:id="${relId(n.getAttribute('href'))}">${runs(n, { ...fmt, link: true })}</w:hyperlink>`;
            continue;
          }
          if (tag === 'ul' || tag === 'ol') continue; // las sublistas se procesan como párrafos aparte
          out += runs(n, { ...fmt, b: fmt.b || tag === 'strong', i: fmt.i || tag === 'em', code: fmt.code || tag === 'code' });
        }
      }
      return out;
    };
    const para = (content, { style, indent, prefix } = {}) => {
      const ppr = [style && `<w:pStyle w:val="${style}"/>`, indent && `<w:ind w:left="${indent}" w:hanging="280"/>`].filter(Boolean).join('');
      return `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${prefix ? `<w:r><w:t xml:space="preserve">${xml(prefix)}</w:t></w:r>` : ''}${content}</w:p>`;
    };

    const tmp = document.createElement('div');
    tmp.innerHTML = htmlDoc(doc);
    let body = '';
    const walk = (el, level = 0) => {
      for (const n of el.children) {
        const tag = n.tagName.toLowerCase();
        if (tag === 'h1') body += para(runs(n), { style: 'Title' });
        else if (/^h[2-7]$/.test(tag)) body += para(runs(n), { style: `Heading${Math.min(3, Number(tag[1]) - 1)}` });
        else if (tag === 'p') body += para(runs(n));
        else if (tag === 'blockquote') body += para(runs(n), { style: 'Quote' });
        else if (tag === 'hr') body += para('');
        else if (tag === 'ul' || tag === 'ol') {
          [...n.children].forEach((li, i) => {
            body += para(runs(li), { indent: 360 + level * 360, prefix: tag === 'ol' ? `${i + 1}. ` : '• ' });
            [...li.children].filter((c) => /^(ul|ol)$/i.test(c.tagName)).forEach((sub) => walk({ children: [sub] }, level + 1));
          });
        } else if (tag === 'div' && n.querySelector('table')) {
          const rows = [...n.querySelectorAll('tr')].map((tr) => `<w:tr>${[...tr.children].map((td) => `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${para(runs(td, { b: td.tagName === 'TH' }))}</w:tc>`).join('')}</w:tr>`).join('');
          body += `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>${rows}</w:tbl>`;
        } else if (tag === 'div' && n.querySelector('pre')) {
          for (const line of n.querySelector('pre').textContent.split('\n')) body += para(`<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr><w:t xml:space="preserve">${xml(line)}</w:t></w:r>`);
        } else if (n.children.length) walk(n, level);
      }
    };
    walk(tmp);

    const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
    const document_ = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const style = (id, name, rpr, ppr = '') => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:qFormat/>${ppr}<w:rPr>${rpr}</w:rPr></w:style>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}>
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:lang w:val="es-ES"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
${style('Title', 'Title', '<w:b/><w:sz w:val="36"/><w:color w:val="1F1A3D"/>', '<w:pPr><w:spacing w:after="160"/></w:pPr>')}
${style('Heading1', 'heading 1', '<w:b/><w:sz w:val="30"/><w:color w:val="4B2FD6"/>', '<w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr>')}
${style('Heading2', 'heading 2', '<w:b/><w:sz w:val="26"/><w:color w:val="4B2FD6"/>', '<w:pPr><w:keepNext/><w:spacing w:before="200" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr>')}
${style('Heading3', 'heading 3', '<w:b/><w:sz w:val="23"/>', '<w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr>')}
${style('Quote', 'Quote', '<w:i/><w:color w:val="555555"/>', '<w:pPr><w:ind w:left="567"/></w:pPr>')}
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="2F5FD0"/><w:u w:val="single"/></w:rPr></w:style>
<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
</w:styles>`;
    const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${rels.map((u, i) => `<Relationship Id="rLink${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xml(u)}" TargetMode="External"/>`).join('')}</Relationships>`;
    return zip([
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rDoc" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { name: 'word/document.xml', data: document_ },
      { name: 'word/styles.xml', data: styles },
      { name: 'word/_rels/document.xml.rels', data: docRels },
    ]);
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  const baseName = (doc) => `${U.safeFilename(doc.video?.title)} - ${U.safeFilename(doc.title)}`;

  SN.exporter = {
    linkTimestamps,
    markdownDoc,
    htmlDoc,
    copyRich,
    toObsidian,
    downloadMarkdown: (doc) => download(new Blob([markdownDoc(doc)], { type: 'text/markdown;charset=utf-8' }), `${baseName(doc)}.md`),
    downloadDocx: (doc) => download(docx(doc), `${baseName(doc)}.docx`),
    /** Abre una página de la extensión lista para imprimir o guardar como PDF. */
    print: (doc) => chrome.runtime.sendMessage({ type: 'printDoc', title: `${doc.title}: ${doc.video?.title || ''}`, html: htmlDoc(doc) }),
  };
})();
