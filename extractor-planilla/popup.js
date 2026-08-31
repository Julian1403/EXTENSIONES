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
    statusEl.textContent = 'Extraído a las ' + r.extraido;
    return r;
  } catch (e) {
    resEl.textContent = 'No se pudo leer la página. Recargá la planilla y volvé a intentar.';
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

function toCSV(rows) {
  if (!rows || !rows.length) return '';
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [keys.join(','), ...rows.map(r => keys.map(k => esc(r[k])).join(','))].join('\n');
}

document.getElementById('extract').onclick = request;

document.getElementById('csv').onclick = async () => {
  const r = await request();
  if (r) download('planilla.csv', '\uFEFF' + toCSV(r.estudiantes), 'text/csv;charset=utf-8');
};

document.getElementById('json').onclick = async () => {
  const r = await request();
  if (r) download('planilla.json', JSON.stringify(r, null, 2), 'application/json');
};
