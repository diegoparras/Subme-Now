/* Subme Now — utilidades compartidas (content scripts, opciones y background). */
(function (root) {
  const pad = (n, l = 2) => String(n).padStart(l, '0');

  function formatTime(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  function parseTime(str) {
    const parts = String(str).trim().split(':').map(Number);
    if (!parts.length || parts.length > 3 || parts.some((n) => Number.isNaN(n))) return null;
    return parts.reduce((acc, n) => acc * 60 + n, 0);
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function clockTime(sec, sep) {
    const ms = Math.max(0, Math.round(sec * 1000));
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(ms % 1000, 3)}`;
  }

  /** Garantiza que cada segmento tenga `end`. */
  function normalizeSegments(segments) {
    return segments.map((s, i) => {
      const next = segments[i + 1];
      let end = Number.isFinite(s.end) && s.end > s.start ? s.end : next ? next.start : s.start + 3;
      if (next && end > next.start + 5) end = next.start;
      return { start: s.start, end, text: s.text };
    });
  }

  function toTXT(segments, withTimestamps = true) {
    return segments.map((s) => (withTimestamps ? `[${formatTime(s.start)}] ${s.text}` : s.text)).join('\n');
  }

  function toPlainParagraphs(segments) {
    return segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
  }

  function toSRT(segments) {
    return normalizeSegments(segments)
      .map((s, i) => `${i + 1}\n${clockTime(s.start, ',')} --> ${clockTime(s.end, ',')}\n${s.text}\n`)
      .join('\n');
  }

  function toVTT(segments) {
    return 'WEBVTT\n\n' + normalizeSegments(segments)
      .map((s) => `${clockTime(s.start, '.')} --> ${clockTime(s.end, '.')}\n${s.text}\n`)
      .join('\n');
  }

  function toMarkdown(video, segments) {
    const head = [
      `# ${video?.title || 'Transcripción'}`,
      '',
      video?.author ? `- **Canal:** ${video.author}` : '',
      video?.url ? `- **URL:** ${video.url}` : '',
      video?.lengthSeconds ? `- **Duración:** ${formatTime(video.lengthSeconds)}` : '',
      '',
      '## Transcripción',
      '',
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '');
    return head.join('\n') + '\n' + groupSegments(segments).map((g) => `**[${formatTime(g.start)}]** ${g.text}`).join('\n\n') + '\n';
  }

  /** Agrupa segmentos cortos en bloques (para la IA y exportaciones legibles). */
  function groupSegments(segments, maxSeconds = 30, maxChars = 450) {
    const out = [];
    let cur = null;
    for (const s of segments) {
      if (!cur || s.start - cur.start > maxSeconds || cur.text.length + s.text.length > maxChars) {
        cur = { start: s.start, text: s.text };
        out.push(cur);
      } else {
        cur.text += ' ' + s.text;
      }
    }
    return out;
  }

  function safeFilename(s) {
    return String(s || 'video').replace(/[\\/:*?"<>|\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'video';
  }

  function downloadText(filename, text, mime = 'text/plain') {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    }
  }

  root.SubmeUtils = {
    formatTime, parseTime, escapeHtml, normalizeSegments, groupSegments,
    toTXT, toPlainParagraphs, toSRT, toVTT, toMarkdown, safeFilename, downloadText, copyText,
  };
})(globalThis);
