/* Servis Oturma Planı — Grid Editörü
 * transport.js içindeki openBusEditor fonksiyonunun yerine geçer.
 * app-loader.js'de transport modülüne eklenmeli.
 */
(function (global) {
  'use strict';

  /* ── Yardımcılar ─────────────────────────────────────────── */
  const arr  = t => { const v = global.AppStore?.data?.(t); return Array.isArray(v) ? v : []; };
  const esc  = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = msg => global.toast?.(msg);

  function serviceName(s) { return s?.servisAdi || s?.guzergah || s?.plaka || 'Servis'; }
  function students(sid)  {
    return arr('veliler')
      .filter(v => String(v.servisId || '') === String(sid || ''))
      .slice().sort((a, b) =>
        String(a.ogrenciAdi || '').localeCompare(String(b.ogrenciAdi || ''), 'tr'));
  }
  function canEdit() {
    const u = global.AKTIF_KULLANICI || global.AppStore?.get?.('session.user') || {};
    if (u.admin !== true && (u.bagliOgretmenId || u.ogretmenId)) return false;
    return !global.PermissionService || global.PermissionService.can('transport.seating.edit', 'edit');
  }

  /* ── Grid veri modeli ────────────────────────────────────── */
  function makeCell() { return { type: 'empty', studentId: null }; }

  function gridFromLegacy(plan) {
    if (!plan || (!Array.isArray(plan.yerlesim) && !Array.isArray(plan.elements))) {
      return defaultGrid();
    }

    if (Array.isArray(plan.elements) && plan.elements.length) {
      const rows = new Map();
      plan.elements.forEach((el) => {
        const r = Number(el.row ?? 0);
        if (!rows.has(r)) rows.set(r, []);
        rows.get(r).push(el);
      });
      const sortedRows = [...rows.entries()].sort((a, b) => a[0] - b[0]);
      const maxCols = Math.max(...sortedRows.map(([, items]) => items.length));
      const grid = sortedRows.map(([, items]) => {
        const row = Array.from({ length: maxCols }, makeCell);
        items.forEach((el, c) => {
          row[c] = {
            type: el.type === 'sofor' ? 'driver'
                : el.properties?.konum === 'kapi' ? 'door'
                : el.visible === false ? 'empty'
                : 'seat',
            studentId: el.studentId || null,
          };
        });
        return row;
      });
      const COLS = Math.max(...grid.map(r => r.length), 1);
      return { grid, cols: COLS, rows: grid.length };
    }

    const yer = plan.yerlesim || [];
    const kol = plan.koltuklar || [];
    const rowNums = [...new Set(yer.map(y => y.sira ?? 0))].sort((a, b) => a - b);
    const COLS = Math.max(...rowNums.map(r => yer.filter(y => (y.sira ?? 0) === r).length), 1);
    let seatNo = 0;
    const grid = rowNums.map(r => {
      const slots = yer.filter(y => (y.sira ?? 0) === r);
      return slots.map(slot => {
        if (slot.soforYani) return { type: 'driver', studentId: null };
        if (slot.konum === 'kapi' || slot.kapiSag) return { type: 'door', studentId: null };
        seatNo++;
        const k = kol.find(x => Number(x.no) === seatNo);
        return { type: 'seat', studentId: k?.ogrenciId || null };
      });
    });
    return { grid, cols: COLS, rows: grid.length };
  }

  function gridToLegacy(grid) {
    const elements = [];
    let seatNo = 0;
    grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell.type === 'empty') return;
        seatNo++;
        elements.push({
          id: `el_${r}_${c}`,
          type: cell.type === 'driver' ? 'sofor' : 'koltuk',
          seatNumber: cell.type === 'seat' ? seatNo : null,
          studentId: cell.studentId || null,
          row: r,
          column: c,
          locked: false,
          visible: true,
          color: null,
          properties: {
            konum: cell.type === 'door' ? 'kapi'
                 : cell.type === 'driver' ? 'sofor'
                 : c === 0 ? 'sol-dis' : c === 1 ? 'sol-ic' : c === 2 ? 'sag-ic' : 'sag-dis',
            kapiSag: cell.type === 'door',
            soforYani: cell.type === 'driver',
            studentName: '',
            stop: '', note: '', reserved: false,
          },
        });
      });
    });
    const yerlesim = elements.map(el => ({
      sira: el.row,
      konum: el.properties.konum,
      aktif: true,
      ...(el.properties.soforYani ? { soforYani: true } : {}),
      ...(el.properties.kapiSag   ? { kapiSag: true }   : {}),
    }));
    const koltuklar = elements
      .filter(el => el.type === 'koltuk' && el.studentId)
      .map(el => ({ no: el.seatNumber, ogrenciId: el.studentId, ogrenciAdi: '', rezerve: false, durak: '', not: '', renk: null, kilit: false }));
    return { elements, yerlesim, koltuklar, semaVersiyon: 2, guncellendi: new Date().toISOString() };
  }

  function defaultGrid() {
    const grid = Array.from({ length: 6 }, () => Array.from({ length: 4 }, makeCell));
    grid[0][0] = { type: 'driver', studentId: null };
    grid[1][2] = { type: 'door',   studentId: null };
    [[1,0],[1,1],[2,0],[2,1],[2,2],[3,0],[3,1],[3,2],[4,0],[4,1],[4,2],[5,0],[5,1],[5,2]].forEach(([r,c]) => {
      if (grid[r] && grid[r][c]) grid[r][c] = { type: 'seat', studentId: null };
    });
    return { grid, rows: 6, cols: 4 };
  }

  /* ── Editör durumu ───────────────────────────────────────── */
  let editorState = null;

  function seatNumbers(grid) {
    const map = {};
    let n = 0;
    grid.forEach((row, r) => row.forEach((cell, c) => {
      if (cell.type === 'seat') map[`${r},${c}`] = ++n;
    }));
    return map;
  }

  function countStats(grid) {
    let toplam = 0, dolu = 0;
    grid.forEach(row => row.forEach(cell => {
      if (cell.type === 'seat') { toplam++; if (cell.studentId) dolu++; }
    }));
    return { toplam, dolu, bos: toplam - dolu };
  }

  /* ── HTML renderlama ─────────────────────────────────────── */
  function cellHtml(cell, r, c, nums, tool) {
    const key = `${r},${c}`;
    const no  = nums[key] || '';

    if (cell.type === 'empty') {
      const hintIcon = { seat: 'ti-armchair', door: 'ti-door', driver: 'ti-steering-wheel', erase: '' }[tool] || '';
      return `<td class="gse-cell gse-empty" data-r="${r}" data-c="${c}">
        ${hintIcon ? `<i class="ti ${hintIcon} gse-hint" aria-hidden="true"></i>` : ''}
      </td>`;
    }
    if (cell.type === 'seat') {
      const stud = editorState?.allStudents.find(s => s.id === cell.studentId);
      const filled = !!cell.studentId;
      return `<td class="gse-cell gse-seat${filled ? ' gse-filled' : ''}" data-r="${r}" data-c="${c}">
        <span class="gse-no">${no}</span>
        <i class="ti ti-armchair gse-seat-icon" aria-hidden="true"></i>
        ${filled ? `<span class="gse-name">${esc((stud?.ogrenciAdi || '').split(' ')[0])}</span>` : ''}
      </td>`;
    }
    if (cell.type === 'door') {
      return `<td class="gse-cell gse-door" data-r="${r}" data-c="${c}">
        <i class="ti ti-door" style="font-size:20px;color:var(--text-warning)" aria-hidden="true"></i>
        <span class="gse-door-lbl">Kapı</span>
      </td>`;
    }
    if (cell.type === 'driver') {
      return `<td class="gse-cell gse-driver" data-r="${r}" data-c="${c}">
        <i class="ti ti-steering-wheel" style="font-size:20px;color:var(--text-success)" aria-hidden="true"></i>
        <span class="gse-driver-lbl">Şoför</span>
      </td>`;
    }
    return `<td class="gse-cell gse-empty" data-r="${r}" data-c="${c}"></td>`;
  }

  function gridHtml(grid, tool) {
    const nums = seatNumbers(grid);
    const rows = grid.map((row, r) =>
      `<tr>${row.map((cell, c) => cellHtml(cell, r, c, nums, tool)).join('')}</tr>`
    ).join('');
    return `<table class="gse-table"><tbody>${rows}</tbody></table>`;
  }

  function pickerHtml(r, c, servisId) {
    const cell = editorState.grid[r][c];
    const nums = seatNumbers(editorState.grid);
    const no   = nums[`${r},${c}`] || '?';
    const stud = editorState.allStudents.find(s => s.id === cell.studentId);
    const list = students(servisId);
    const assignedMap = {};
    editorState.grid.forEach((row, rr) => row.forEach((cl, cc) => {
      if (cl.studentId) assignedMap[cl.studentId] = nums[`${rr},${cc}`] || '?';
    }));
    const items = list.map(o => {
      const taken = !!assignedMap[o.id] && cell.studentId !== o.id;
      const active = cell.studentId === o.id;
      return `<button class="gse-pick-item${taken?' gse-taken':''}${active?' gse-active':''}" data-oid="${esc(o.id)}"${taken?' disabled':''}>
        ${esc(o.ogrenciAdi)}
        <span class="gse-pick-class">${esc(o.sinifAdi || '')}</span>
        ${assignedMap[o.id] ? `<span class="gse-pick-badge">${assignedMap[o.id]}. koltuk</span>` : ''}
      </button>`;
    }).join('') || '<span style="color:var(--text-muted);font-size:13px">Bu serviste öğrenci yok.</span>';

    return `<div class="gse-picker" id="gsePicker">
      <div class="gse-picker-head">
        <strong>${no}. koltuk${stud ? ' — ' + esc(stud.ogrenciAdi) : ''}</strong>
        <button class="gse-picker-close" id="gsePickerClose" aria-label="Kapat"><i class="ti ti-x"></i></button>
      </div>
      <div class="gse-picker-list">${items}</div>
      <div class="gse-picker-foot">
        <button class="gse-clear-btn" id="gsePickerClear">Koltuğu boşalt</button>
      </div>
    </div>`;
  }

  function editorShell(s, editable) {
    const st = countStats(editorState.grid);
    return `
    <style>
    .gse-wrap{font-family:var(--font-sans,system-ui);color:var(--text-primary)}
    .gse-toolbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:10px 0 12px;border-bottom:0.5px solid var(--border);margin-bottom:10px}
    .gse-toolbar button{font-family:inherit;font-size:13px;padding:5px 10px;border-radius:var(--radius);border:0.5px solid var(--border-strong);background:transparent;color:var(--text-primary);cursor:pointer}
    .gse-toolbar button:hover{background:var(--surface-1)}
    .gse-toolbar button.gse-active-tool{background:var(--bg-accent);border-color:var(--border-accent);color:var(--text-accent)}
    .gse-toolbar button.gse-danger{color:var(--text-danger);border-color:var(--border-danger)}
    .gse-toolbar button.gse-danger:hover{background:var(--bg-danger)}
    .gse-sep{width:0.5px;height:22px;background:var(--border-strong);margin:0 2px}
    .gse-stats{display:flex;gap:16px;font-size:12px;color:var(--text-secondary);padding:6px 0 10px;border-bottom:0.5px solid var(--border);margin-bottom:10px}
    .gse-stats b{color:var(--text-primary);font-weight:500}
    .gse-grid-wrap{overflow-x:auto;margin-bottom:10px}
    .gse-table{border-collapse:collapse}
    .gse-cell{width:72px;height:64px;border:0.5px solid var(--border);cursor:pointer;text-align:center;vertical-align:middle;position:relative;transition:background .1s}
    .gse-cell:hover{border-color:var(--border-accent)}
    .gse-empty{background:var(--surface-1)}
    .gse-empty:hover .gse-hint{opacity:.4}
    .gse-hint{opacity:0;font-size:20px;transition:opacity .1s;color:var(--text-muted);pointer-events:none}
    .gse-seat{background:var(--surface-2);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
    .gse-seat:hover{background:var(--bg-accent-muted)}
    .gse-filled{background:var(--bg-accent)}
    .gse-no{font-size:10px;color:var(--text-muted)}
    .gse-filled .gse-no{color:var(--text-accent)}
    .gse-seat-icon{font-size:20px;color:var(--text-muted)}
    .gse-filled .gse-seat-icon{color:var(--text-accent)}
    .gse-name{font-size:11px;font-weight:500;color:var(--text-accent);max-width:66px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .gse-door{background:var(--bg-warning);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}
    .gse-door-lbl{font-size:11px;font-weight:500;color:var(--text-warning)}
    .gse-driver{background:var(--bg-success);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}
    .gse-driver-lbl{font-size:11px;font-weight:500;color:var(--text-success)}
    .gse-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--text-secondary);padding:8px 0;border-top:0.5px solid var(--border)}
    .gse-leg{display:inline-block;width:12px;height:12px;border-radius:3px;border:0.5px solid var(--border);vertical-align:middle;margin-right:4px}
    .gse-footer{display:flex;gap:8px;padding:12px 0 0;border-top:0.5px solid var(--border);margin-top:4px}
    .gse-picker{background:var(--surface-2);border:0.5px solid var(--border);border-radius:12px;padding:12px;margin-top:12px}
    .gse-picker-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:14px;font-weight:500}
    .gse-picker-close{border:none;background:transparent;cursor:pointer;font-size:18px;color:var(--text-muted);padding:2px 6px;border-radius:var(--radius)}
    .gse-picker-close:hover{background:var(--surface-1)}
    .gse-picker-list{display:flex;flex-wrap:wrap;gap:6px;max-height:220px;overflow-y:auto}
    .gse-pick-item{font-family:inherit;font-size:12px;padding:5px 10px;border-radius:var(--radius);border:0.5px solid var(--border);background:var(--surface-1);cursor:pointer;display:flex;align-items:center;gap:6px}
    .gse-pick-item:hover:not(:disabled){background:var(--bg-accent-muted);border-color:var(--border-accent);color:var(--text-accent)}
    .gse-pick-item.gse-active{background:var(--bg-accent);border-color:var(--border-accent);color:var(--text-accent)}
    .gse-taken{opacity:.4;cursor:not-allowed}
    .gse-pick-class{font-size:11px;color:var(--text-muted)}
    .gse-pick-badge{font-size:10px;background:var(--bg-accent-muted);color:var(--text-accent);border-radius:4px;padding:1px 5px}
    .gse-picker-foot{margin-top:10px;padding-top:10px;border-top:0.5px solid var(--border)}
    .gse-clear-btn{font-family:inherit;font-size:12px;padding:5px 12px;border-radius:var(--radius);border:0.5px solid var(--border-danger);color:var(--text-danger);background:transparent;cursor:pointer}
    .gse-clear-btn:hover{background:var(--bg-danger)}
    </style>
    <div class="gse-wrap" id="gseWrap">
      <div class="gse-toolbar" id="gseTb">
        ${editable ? `
        <span style="font-size:12px;color:var(--text-muted)">Araç:</span>
        <button id="gse-t-seat" class="gse-active-tool"><i class="ti ti-armchair" aria-hidden="true"></i> Koltuk</button>
        <button id="gse-t-door"><i class="ti ti-door" aria-hidden="true"></i> Kapı</button>
        <button id="gse-t-driver"><i class="ti ti-steering-wheel" aria-hidden="true"></i> Şoför</button>
        <button id="gse-t-erase"><i class="ti ti-eraser" aria-hidden="true"></i> Sil</button>
        <div class="gse-sep"></div>
        <button id="gse-add-row"><i class="ti ti-row-insert-bottom" aria-hidden="true"></i> Satır ekle</button>
        <button id="gse-del-row" class="gse-danger"><i class="ti ti-row-remove" aria-hidden="true"></i> Satır sil</button>
        <div class="gse-sep"></div>
        <button id="gse-add-col"><i class="ti ti-column-insert-right" aria-hidden="true"></i> Sütun ekle</button>
        <button id="gse-del-col" class="gse-danger"><i class="ti ti-column-remove" aria-hidden="true"></i> Sütun sil</button>
        <div class="gse-sep"></div>
        <button id="gse-clear-all" class="gse-danger"><i class="ti ti-trash" aria-hidden="true"></i> Temizle</button>
        ` : `<span style="font-size:13px;color:var(--text-muted)">Salt okunur görünüm</span>`}
        <button id="gse-print" style="margin-left:auto"><i class="ti ti-printer" aria-hidden="true"></i> Rapor</button>
      </div>
      <div class="gse-stats" id="gseStats">
        <span><b>${st.toplam}</b> koltuk</span>
        <span><b>${st.dolu}</b> dolu</span>
        <span><b>${st.bos}</b> boş</span>
      </div>
      <div class="gse-grid-wrap" id="gseGridWrap">${gridHtml(editorState.grid, editorState.tool)}</div>
      <div class="gse-legend">
        <span><span class="gse-leg" style="background:var(--surface-1)"></span>Boş hücre</span>
        <span><span class="gse-leg" style="background:var(--surface-2)"></span>Koltuk (boş)</span>
        <span><span class="gse-leg" style="background:var(--bg-accent)"></span>Koltuk (dolu)</span>
        <span><span class="gse-leg" style="background:var(--bg-warning)"></span>Kapı</span>
        <span><span class="gse-leg" style="background:var(--bg-success)"></span>Şoför</span>
      </div>
      <div id="gsePickerArea"></div>
      ${editable ? `
      <div class="gse-footer">
        <button id="gse-save"><i class="ti ti-device-floppy" aria-hidden="true"></i> Kaydet</button>
        <button id="gse-cancel">Vazgeç</button>
      </div>` : `
      <div class="gse-footer">
        <button id="gse-cancel">Kapat</button>
      </div>`}
    </div>`;
  }

  function reRenderGrid() {
    const wrap = document.getElementById('gseGridWrap');
    if (wrap) wrap.innerHTML = gridHtml(editorState.grid, editorState.tool);
    const st = countStats(editorState.grid);
    const statsEl = document.getElementById('gseStats');
    if (statsEl) statsEl.innerHTML =
      `<span><b>${st.toplam}</b> koltuk</span><span><b>${st.dolu}</b> dolu</span><span><b>${st.bos}</b> boş</span>`;
    bindGridEvents();
  }

  function bindGridEvents() {
    document.querySelectorAll('.gse-cell').forEach(td => {
      td.addEventListener('click', () => onCellClick(+td.dataset.r, +td.dataset.c));
    });
  }

  function onCellClick(r, c) {
    if (!editorState) return;
    const cell   = editorState.grid[r][c];
    const tool   = editorState.tool;
    const editable = editorState.editable;

    if (!editable) {
      if (cell.type === 'seat' && cell.studentId) {
        const stud = editorState.allStudents.find(s => s.id === cell.studentId);
        toast?.(stud ? stud.ogrenciAdi : 'Öğrenci');
      }
      return;
    }

    if (tool === 'seat' && cell.type === 'seat') {
      openPicker(r, c); return;
    }

    closePicker();
    if (tool === 'seat')        { cell.type = 'seat';   cell.studentId = null; }
    else if (tool === 'door')   { cell.type = cell.type === 'door'   ? 'empty' : 'door';   cell.studentId = null; }
    else if (tool === 'driver') { cell.type = cell.type === 'driver' ? 'empty' : 'driver'; cell.studentId = null; }
    else if (tool === 'erase')  { cell.type = 'empty';  cell.studentId = null; }
    reRenderGrid();
  }

  function openPicker(r, c) {
    const area = document.getElementById('gsePickerArea');
    if (!area) return;
    area.innerHTML = pickerHtml(r, c, editorState.servisId);

    area.querySelector('#gsePickerClose')?.addEventListener('click', closePicker);
    area.querySelector('#gsePickerClear')?.addEventListener('click', () => {
      editorState.grid[r][c].studentId = null;
      closePicker(); reRenderGrid();
    });
    area.querySelectorAll('.gse-pick-item:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        const oid = btn.dataset.oid;
        editorState.grid.forEach(row => row.forEach(cl => { if (cl.studentId === oid) cl.studentId = null; }));
        editorState.grid[r][c].studentId = oid;
        closePicker(); reRenderGrid();
      });
    });
  }

  function closePicker() {
    const area = document.getElementById('gsePickerArea');
    if (area) area.innerHTML = '';
  }

  function setTool(t) {
    editorState.tool = t;
    ['seat','door','driver','erase'].forEach(n => {
      document.getElementById(`gse-t-${n}`)?.classList.toggle('gse-active-tool', n === t);
    });
    reRenderGrid();
  }

  function bindEditorEvents(s) {
    document.getElementById('gse-t-seat')?.addEventListener('click', () => setTool('seat'));
    document.getElementById('gse-t-door')?.addEventListener('click', () => setTool('door'));
    document.getElementById('gse-t-driver')?.addEventListener('click', () => setTool('driver'));
    document.getElementById('gse-t-erase')?.addEventListener('click', () => setTool('erase'));

    document.getElementById('gse-add-row')?.addEventListener('click', () => {
      const cols = editorState.grid[0]?.length || 4;
      editorState.grid.push(Array.from({ length: cols }, makeCell));
      closePicker(); reRenderGrid();
    });
    document.getElementById('gse-del-row')?.addEventListener('click', () => {
      if (editorState.grid.length <= 1) return;
      editorState.grid.pop();
      closePicker(); reRenderGrid();
    });
    document.getElementById('gse-add-col')?.addEventListener('click', () => {
      editorState.grid.forEach(row => row.push(makeCell()));
      closePicker(); reRenderGrid();
    });
    document.getElementById('gse-del-col')?.addEventListener('click', () => {
      if ((editorState.grid[0]?.length || 0) <= 1) return;
      editorState.grid.forEach(row => row.pop());
      closePicker(); reRenderGrid();
    });
    document.getElementById('gse-clear-all')?.addEventListener('click', () => {
      if (!confirm('Tüm koltuk atamaları ve şablon silinsin mi?')) return;
      editorState.grid = Array.from({ length: editorState.grid.length }, () =>
        Array.from({ length: editorState.grid[0]?.length || 4 }, makeCell));
      closePicker(); reRenderGrid();
    });

    document.getElementById('gse-print')?.addEventListener('click', () => printGridReport(s));

    document.getElementById('gse-save')?.addEventListener('click', async () => {
      const btn = document.getElementById('gse-save');
      if (btn) { btn.disabled = true; btn.textContent = 'Kaydediliyor…'; }
      try {
        const legacy = gridToLegacy(editorState.grid);
        if (global.ServisOturmaService?.planElementsKaydet) {
          await global.ServisOturmaService.planElementsKaydet(
            editorState.servisId, 'ozel', legacy.elements, false
          );
        } else if (global.ServisOturmaRepository?.planKaydet) {
          await global.ServisOturmaRepository.planKaydet(editorState.servisId, { ...legacy, sablon: 'ozel' });
        } else {
          /* DeviceData fallback */
          await global.DeviceData?.set?.('servisOturma', 'servisOturma', editorState.servisId, { ...legacy, sablon: 'ozel' });
        }
        toast?.('Oturma planı kaydedildi.');
        closeGridEditor();
        global.TransportModule?.render?.();
      } catch (e) {
        toast?.('Kayıt sırasında hata: ' + (e?.message || e));
        if (btn) { btn.disabled = false; btn.textContent = 'Kaydet'; }
      }
    });

    document.getElementById('gse-cancel')?.addEventListener('click', closeGridEditor);

    bindGridEvents();
  }

  /* ── Rapor ───────────────────────────────────────────────── */
  function printGridReport(s) {
    const nums = seatNumbers(editorState.grid);
    const rows = editorState.grid.map((row, r) => {
      const cells = row.map((cell, c) => {
        if (cell.type === 'empty') return `<td style="width:70px;height:58px;border:1px solid #ccc;background:#f5f5f5"></td>`;
        if (cell.type === 'door')   return `<td style="width:70px;height:58px;border:1px solid #ccc;background:#fff3cd;text-align:center;font-size:11pt">🚪<br><small>Kapı</small></td>`;
        if (cell.type === 'driver') return `<td style="width:70px;height:58px;border:1px solid #ccc;background:#d4edda;text-align:center;font-size:11pt">🚌<br><small>Şoför</small></td>`;
        const no = nums[`${r},${c}`] || '';
        const stud = editorState.allStudents.find(x => x.id === cell.studentId);
        return `<td style="width:70px;height:58px;border:1px solid #bbb;text-align:center;vertical-align:middle;font-size:9pt;${stud?'background:#e8f4fd':'background:#fff'}">
          <div style="font-size:8pt;color:#777">${no}</div>
          ${stud ? `<div style="font-size:9pt;font-weight:bold">${stud.ogrenciAdi.split(' ')[0]}</div><div style="font-size:7.5pt;color:#555">${stud.ogrenciAdi.split(' ').slice(1).join(' ')}</div>` : ''}
        </td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const body = `<h2 style="text-align:center">${esc(serviceName(s))} — Oturma Planı</h2>
      <table style="border-collapse:collapse;margin:10px auto">${rows}</table>`;

    if (global.ReportEngine?.printReport) {
      global.ReportEngine.printReport(`${serviceName(s)} Oturma Planı`, body, {
        yon: 'dikey', logoGoster: false, baslikGoster: false, tarihGoster: false,
        kenarBosluk: 8, fileName: `${serviceName(s)}_OturmaPlan`
      });
    } else {
      toast?.('Rapor motoru hazır değil.');
    }
  }

  /* ── Ana giriş noktası ───────────────────────────────────── */
  function openGridEditor(servisId) {
    const s = arr('servisler').find(x => x.id === servisId);
    if (!s) return;

    const raw    = arr('servisOturma').find(p => p.servisId === servisId || p.id === servisId) || {};
    const parsed = gridFromLegacy(raw);
    const editable = canEdit();

    editorState = {
      servisId,
      grid: parsed.grid,
      tool: 'seat',
      editable,
      allStudents: arr('veliler'),
    };

    const ov = document.createElement('div');
    ov.id = 'gseOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:24px 12px';

    const box = document.createElement('div');
    box.style.cssText = 'background:var(--surface-2);border-radius:12px;border:0.5px solid var(--border);padding:20px;width:100%;max-width:700px;';
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div>
          <div style="font-size:16px;font-weight:500">Oturma planı — ${esc(serviceName(s))}</div>
          <div style="font-size:12px;color:var(--text-muted)">${esc(s.plaka || '')}${s.guzergah ? ' · ' + esc(s.guzergah) : ''}</div>
        </div>
      </div>
      ${editorShell(s, editable)}
    `;
    ov.appendChild(box);
    document.body.appendChild(ov);

    ov.addEventListener('click', e => { if (e.target === ov) closeGridEditor(); });
    bindEditorEvents(s);
  }

  function closeGridEditor() {
    document.getElementById('gseOverlay')?.remove();
    editorState = null;
  }

  /* ── TransportModule entegrasyonu ────────────────────────── */
  /* transport.js yüklendikten SONRA bu dosya yüklenir;
     openBusEditor'ı grid editörle değiştirir. */
  function patchTransportModule() {
    if (global.TransportModule) {
      global.TransportModule.openBusEditor = openGridEditor;
    }
  }

  /* Hem sync hem async yüklemeye karşı */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchTransportModule);
  } else {
    patchTransportModule();
  }
  /* transport modülü geç yüklenirse */
  global.addEventListener('koruk:module-ready', e => {
    if (e.detail?.name === 'transport') patchTransportModule();
  });

  global.GridSeatingEditor = { open: openGridEditor, close: closeGridEditor };

})(window);
