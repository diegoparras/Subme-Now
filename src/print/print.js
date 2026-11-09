/* Subme Now — página para imprimir o guardar como PDF un resultado. */
(async function () {
  const id = location.hash.slice(1);
  const key = `print:${id}`;
  const data = (await chrome.storage.session.get(key))[key];
  const doc = document.getElementById('doc');
  if (!data) {
    doc.innerHTML = '<p class="loading">El documento ya no está disponible. Vuelve a exportarlo desde Subme Now.</p>';
    return;
  }
  await chrome.storage.session.remove(key);
  document.title = data.title;
  // El HTML lo genera Subme Now a partir de Markdown con todo el texto escapado.
  doc.innerHTML = data.html;
  document.getElementById('print').addEventListener('click', () => window.print());
  await document.fonts?.ready;
  setTimeout(() => window.print(), 300);
})();
