(() => {
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();

  function extractField(field) {
    const labelEl = field.querySelector('label');
    const nombre = labelEl ? clean(labelEl.innerText) : '';
    const valDiv = field.querySelector('[class*="txt_CampoDinamicoDiv"]') ||
      field.querySelector('.DescativarCampoInformacionHorizontales');
    let valor = valDiv ? clean(valDiv.innerText) : '';
    if (!valor) {
      const inp = field.querySelector('textarea, input, select');
      if (inp) valor = (inp.value || '').trim();
    }
    const obligatorio = !!field.querySelector('#CampoObligatorio');
    return { nombre, valor, obligatorio };
  }

  function extractForm(h5) {
    let tbl = h5;
    while (tbl && tbl.tagName !== 'TABLE') tbl = tbl.parentElement;
    if (!tbl) return { titulo: clean(h5.innerText), secciones: [] };
    const rows = Array.from(tbl.querySelectorAll(':scope > tbody > tr, :scope > tr'));
    const secciones = [];
    rows.forEach(r => {
      const tds = Array.from(r.children).filter(c => c.tagName === 'TD');
      tds.forEach(td => {
        const titleEl = td.querySelector(':scope > .TituloPadreCamposHorizontalesSuperiores');
        const fields = Array.from(td.querySelectorAll('div.form-group'));
        if (!fields.length) return;
        if (titleEl) {
          secciones.push({ titulo: clean(titleEl.innerText), campos: fields.map(extractField) });
        } else {
          fields.forEach(f => {
            const c = extractField(f);
            secciones.push({ titulo: c.nombre, campos: [c] });
          });
        }
      });
    });
    return { titulo: clean(h5.innerText).replace(/^Formulario\s*/, ''), secciones };
  }

  function extract() {
    const h5s = Array.from(document.querySelectorAll('h5')).filter(h => h.innerText.includes('Formulario'));
    if (!h5s.length) return { error: 'No se encontró el formulario de Distribución de Tiempo en esta página.' };
    const forms = h5s.map(extractForm).filter(f => f.secciones.length);

    const bodyTxt = document.body.innerText;
    const meta = {};
    const mf = bodyTxt.match(/Fechas de trabajo:\s*([^\n]+)/);
    meta.fechasTrabajo = mf ? clean(mf[1]) : '';
    const mr = bodyTxt.match(/Responsable:\s*([^\n]+)/);
    meta.responsable = mr ? clean(mr[1].replace(/Fecha de actualización:.*/, '')) : '';
    const mf2 = bodyTxt.match(/Fecha de actualización:\s*([^\n]+)/);
    meta.fechaActualizacion = mf2 ? clean(mf2[1]) : '';

    const su = Array.from(document.querySelectorAll('strong')).find(s => clean(s.innerText) === 'Usuario:');
    if (su && su.closest('td')) {
      const txt = su.closest('td').innerText;
      const m = txt.match(/Usuario:\s*([^\n]+?)\s*Documento:\s*([^\n]+)/);
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

    return {
      url: location.href,
      extraido: new Date().toLocaleString(),
      meta,
      formularios: forms
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.action === 'extract') sendResponse(extract());
  });

  const btn = document.createElement('button');
  btn.textContent = 'Extraer JSON';
  btn.style.cssText = 'position:fixed;z-index:99999;bottom:12px;right:12px;padding:8px 14px;' +
    'background:#2e7d32;color:#fff;border:none;border-radius:6px;cursor:pointer;font:14px sans-serif;';
  btn.onclick = async () => {
    const data = extract();
    if (data.error) { btn.textContent = data.error; setTimeout(() => (btn.textContent = 'Extraer JSON'), 3000); return; }
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    btn.textContent = 'Copiado ✓';
    setTimeout(() => (btn.textContent = 'Extraer JSON'), 2000);
  };
  document.body.appendChild(btn);
})();
