(() => {
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();

  const HDR_DEFAULT = {
    'FECHA.': 4,
    'CLASE #': 5,
    'ÁMBITOS CONCEPTUALES Y/O NÚCLEOS TEMÁTICOS': 6,
    'ESTRATEGIAS DIDÁCTICAS Y DE EVALUACIÓN - REGISTRO DE CLASES': 7,
    'REGISTRO DE NOVEDADES': 8
  };

  function findGrid() {
    const tables = Array.from(document.querySelectorAll('table'));
    for (const t of tables) {
      const rows = Array.from(t.querySelectorAll(':scope > tbody > tr, :scope > tr'));
      if (!rows.length) continue;
      const texts = Array.from(rows[0].querySelectorAll('td,th')).map(c => clean(c.innerText));
      if (texts.includes('CLASE #') && texts.some(x => x.includes('FECHA'))) return rows;
    }
    return null;
  }

  function extractClases() {
    const rows = findGrid();
    if (!rows) return [];
    const headers = Array.from(rows[0].querySelectorAll('td,th')).map(c => clean(c.innerText));
    const col = {};
    headers.forEach((h, i) => { if (h) col[h] = i; });
    const id = n => (col[n] != null ? col[n] : HDR_DEFAULT[n]);
    const F = id('FECHA.'), C = id('CLASE #'), A = id('ÁMBITOS CONCEPTUALES Y/O NÚCLEOS TEMÁTICOS'),
          E = id('ESTRATEGIAS DIDÁCTICAS Y DE EVALUACIÓN - REGISTRO DE CLASES'), N = id('REGISTRO DE NOVEDADES');

    const clases = [];
    for (let r = 1; r < rows.length; r++) {
      const cells = Array.from(rows[r].querySelectorAll('td,th'));
      if (cells.length < 9) continue;
      const fecha = clean(cells[F].innerText);
      if (!fecha || fecha === 'Tamaños de fuente') continue;
      clases.push({
        fecha,
        clase: clean(cells[C].innerText),
        ambitos: clean(cells[A].innerText),
        estrategias: clean(cells[E].innerText),
        novedades: clean(cells[N].innerText)
      });
    }
    return clases;
  }

  function labelValue(label) {
    const cell = Array.from(document.querySelectorAll('td')).find(td => clean(td.innerText) === label);
    if (!cell) return '';
    const tr = cell.closest('tr');
    const tds = Array.from(tr.querySelectorAll('td'));
    let val = clean(cell.innerText.replace(label, ''));
    tds.forEach(c => {
      if (c !== cell) val = [val, clean(c.innerText)].filter(Boolean).join(' ');
    });
    return val;
  }

  function extract() {
    const clases = extractClases();
    const bodyTxt = document.body.innerText;
    if (!clases.length && !bodyTxt.includes('REGISTRO DE CLASES')) {
      return { error: 'No se encontró el Diario de Campo en esta página.' };
    }

    const meta = {};
    const mf = bodyTxt.match(/Fechas de trabajo:\s*([^\n]+)/);
    meta.fechasTrabajo = mf ? clean(mf[1]) : '';
    const mr = bodyTxt.match(/Responsable:\s*([^\n]+)/);
    meta.responsable = mr ? clean(mr[1].replace(/Fecha de actualización:.*/, '')) : '';
    const mf2 = bodyTxt.match(/Fecha de actualización:\s*([^\n]+)/);
    meta.fechaActualizacion = mf2 ? clean(mf2[1]) : '';

    const su = Array.from(document.querySelectorAll('strong')).find(s => clean(s.innerText) === 'Usuario:');
    if (su && su.closest('td')) {
      const m = su.closest('td').innerText.match(/Usuario:\s*([^\n]+?)\s*Documento:\s*([^\n]+)/);
      if (m) { meta.usuario = clean(m[1]); meta.documento = clean(m[2]); }
    }

    const inst = Array.from(document.querySelectorAll('td'))
      .map(td => td.innerText.trim())
      .find(t => /COLEGIO/.test(t) && /\d{4}/.test(t));
    meta.institucion = inst || '';

    const sg = document.getElementById('GrupoMateria');
    meta.grupoMateria = sg && sg.selectedOptions[0] ? clean(sg.selectedOptions[0].text) : '';
    const ss = document.getElementById('SelectSecciones');
    meta.periodo = ss ? ss.value : '';

    const fm = bodyTxt.match(/Formato:\s*([^)]+)/);
    meta.formato = fm ? clean(fm[1]) : '';

    return {
      url: location.href,
      extraido: new Date().toLocaleString(),
      meta,
      clases,
      observacionesGenerales: labelValue('OBSERVACIONES GENERALES'),
      adecuacionesCurriculares: labelValue('Adecuaciones Curriculares')
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.action === 'extract') sendResponse(extract());
  });

  const btn = document.createElement('button');
  btn.textContent = 'Extraer JSON';
  btn.style.cssText = 'position:fixed;z-index:99999;bottom:12px;right:12px;padding:8px 14px;' +
    'background:#6a1b9a;color:#fff;border:none;border-radius:6px;cursor:pointer;font:14px sans-serif;';
  btn.onclick = async () => {
    const data = extract();
    if (data.error) { btn.textContent = data.error; setTimeout(() => (btn.textContent = 'Extraer JSON'), 3000); return; }
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    btn.textContent = 'Copiado ✓';
    setTimeout(() => (btn.textContent = 'Extraer JSON'), 2000);
  };
  document.body.appendChild(btn);
})();
