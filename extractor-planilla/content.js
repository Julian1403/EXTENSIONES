(() => {
  const COLS_NUMERICAS = [
    'P1', 'P2', 'Suma', 'F(n)', 'S.1.1', 'S.1.2', 'S.1.3', 'S.1.4',
    'S.2.1', 'S.2.2', 'S.2.3', 'S.2.4', 'A.1.1', 'Lg1', 'Lg2', 'Tp1', 'Tp2',
    '75%', '25%', 'Pl1', 'Pl2', 'DEF', 'VAL', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6',
    'C7', 'C8', 'C9', 'C10', 'F', 'F.J', 'Observaciones'
  ];

  function findGrid() {
    const tables = document.querySelectorAll('table');
    for (const t of tables) {
      const txt = t.innerText;
      if (txt.includes('MATR') && txt.includes('NOMBRE') && txt.includes('DEF')) return t;
    }
    return null;
  }

  function cellValue(cell) {
    if (!cell) return '';
    const inp = cell.querySelector('input');
    return inp ? inp.value.trim() : cell.innerText.trim();
  }

  function extractDiagnosis(cell) {
    if (!cell) return '';
    const el = cell.querySelector('[title]');
    const title = el ? el.title : '';
    const m = title.match(/Trastorno:\s*(.*)/);
    return m ? m[1].trim() : '';
  }

  function extract() {
    const grid = findGrid();
    if (!grid) return { error: 'No se encontró la planilla de resultados en esta página.' };

    const rows = Array.from(grid.querySelectorAll('tr'));

    const hdrIdx = rows.findIndex(r => r.innerText.includes('MATR') && r.innerText.includes('NOMBRE'));
    if (hdrIdx === -1) return { error: 'Encabezados no reconocidos.' };

    const headers = Array.from(rows[hdrIdx].querySelectorAll('th,td')).map(c => c.innerText.trim());
    const col = {};
    headers.forEach((h, i) => { if (h && !(h in col)) col[h] = i; });

    const estudiantes = [];
    for (let r = hdrIdx + 1; r < rows.length; r++) {
      const cells = Array.from(rows[r].querySelectorAll('td'));
      if (cells.length < 10) continue;
      const get = (name) => cellValue(cells[col[name]]);
      const vacios = COLS_NUMERICAS.filter(g => get(g) === '');

      const fila = {};
      headers.filter(Boolean).forEach(h => { fila[h] = get(h); });
      fila['Diagnóstico'] = extractDiagnosis(cells[col['NOMBRE']]);
      fila['CamposVacíos'] = vacios;
      fila['VacíosCount'] = vacios.length;
      estudiantes.push(fila);
    }

    return {
      url: location.href,
      extraido: new Date().toLocaleString(),
      totalEstudiantes: estudiantes.length,
      conDiagnostico: estudiantes.filter(s => s['Diagnóstico']).length,
      estudiantes
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.action === 'extract') sendResponse(extract());
  });

  const btn = document.createElement('button');
  btn.textContent = 'Extraer planilla';
  btn.style.cssText = 'position:fixed;z-index:99999;bottom:12px;right:12px;padding:8px 14px;' +
    'background:#1565c0;color:#fff;border:none;border-radius:6px;cursor:pointer;font:14px sans-serif;';
  btn.onclick = async () => {
    const data = extract();
    if (data.error) { btn.textContent = data.error; setTimeout(() => (btn.textContent = 'Extraer planilla'), 3000); return; }
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    btn.textContent = 'Copiado ✓';
    setTimeout(() => (btn.textContent = 'Extraer planilla'), 2000);
  };
  document.body.appendChild(btn);
})();
