let data = null;
const resEl = document.getElementById('res');
const statusEl = document.getElementById('status');

async function request() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) { resEl.textContent = 'No hay pestaña activa.'; return null; }
  try {
    const r = await chrome.tabs.sendMessage(tab.id, { action: 'extract' });
    if (r && r.error) { resEl.textContent = r.error; statusEl.textContent = ''; return null; }
    data = r;
    resEl.textContent = JSON.stringify(r, null, 2);
    statusEl.textContent = `Clases: ${r.clases.length} | Período: ${r.meta.periodo}`;
    return r;
  } catch (e) {
    resEl.textContent = 'No se pudo leer la página. Recargá el Diario de Campo y volvé a intentar.';
    statusEl.textContent = '';
    return null;
  }
}

function download(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename: name, saveAs: false });
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

document.getElementById('extract').onclick = request;

document.getElementById('copy').onclick = async () => {
  const r = await request();
  if (r) {
    await navigator.clipboard.writeText(JSON.stringify(r, null, 2));
    statusEl.textContent = 'JSON copiado al portapapeles.';
  }
};

document.getElementById('json').onclick = async () => {
  const r = await request();
  if (r) download('diario_campo.json', JSON.stringify(r, null, 2), 'application/json');
};
