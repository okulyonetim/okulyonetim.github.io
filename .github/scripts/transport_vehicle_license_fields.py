from pathlib import Path


def edit(path, fn):
    p=Path(path)
    s=p.read_text(encoding='utf-8')
    n=fn(s)
    if n==s:
        raise SystemExit(f'No change applied: {path}')
    p.write_text(n, encoding='utf-8')


def patch_transport(s):
    old_detail='''<div class="ka-transport-info-item"><span class="ka-transport-info-icon" aria-hidden="true">🗺️</span><div><small>Güzergâh</small><strong>${esc(s.guzergah||'—')}</strong></div></div><div class="ka-transport-info-item"><span class="ka-transport-info-icon is-crown" aria-hidden="true">👑</span><div><small>Servis Başkanı</small><strong>${esc(presidentNames(s))}</strong></div></div>'''
    new_detail='''<div class="ka-transport-info-item"><span class="ka-transport-info-icon" aria-hidden="true">🗺️</span><div><small>Güzergâh</small><strong>${esc(s.guzergah||'—')}</strong></div></div><div class="ka-transport-info-item"><span class="ka-transport-info-icon" aria-hidden="true">📅</span><div><small>Araç Model Yılı</small><strong>${esc(s.modelYili||'—')}</strong></div></div><div class="ka-transport-info-item"><span class="ka-transport-info-icon" aria-hidden="true">🪪</span><div><small>Sürücü Belgesi Yılı</small><strong>${esc(s.ehliyetYili||'—')}</strong></div></div><div class="ka-transport-info-item"><span class="ka-transport-info-icon" aria-hidden="true">🪪</span><div><small>Sürücü Belgesi Sınıfı</small><strong>${esc(s.ehliyetSinifi||'—')}</strong></div></div><div class="ka-transport-info-item"><span class="ka-transport-info-icon is-crown" aria-hidden="true">👑</span><div><small>Servis Başkanı</small><strong>${esc(presidentNames(s))}</strong></div></div>'''
    if old_detail not in s:
        raise SystemExit('service detail anchor missing')
    s=s.replace(old_detail,new_detail,1)

    old_modal='''<div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Sürücü Adı Soyadı</span><input name="soforAdi" value="${esc(s.soforAdi||'')}"></label><label class="ka-field"><span class="ka-field__label">Sürücü Telefonu</span><input name="soforTelefon" inputmode="tel" value="${esc(s.soforTelefon||'')}"></label></div></div><div class="ka-modal__footer">'''
    new_modal='''<div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Sürücü Adı Soyadı</span><input name="soforAdi" value="${esc(s.soforAdi||'')}"></label><label class="ka-field"><span class="ka-field__label">Sürücü Telefonu</span><input name="soforTelefon" inputmode="tel" value="${esc(s.soforTelefon||'')}"></label></div><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Araç Model Yılı</span><input name="modelYili" inputmode="numeric" maxlength="4" value="${esc(s.modelYili||'')}" placeholder="Örn. 2022"></label><label class="ka-field"><span class="ka-field__label">Sürücü Belgesi Yılı</span><input name="ehliyetYili" inputmode="numeric" maxlength="4" value="${esc(s.ehliyetYili||'')}" placeholder="Örn. 2014"></label></div><label class="ka-field"><span class="ka-field__label">Sürücü Belgesi Sınıfı</span><input name="ehliyetSinifi" value="${esc(s.ehliyetSinifi||'')}" placeholder="Örn. B, D1, D"></label></div><div class="ka-modal__footer">'''
    if old_modal not in s:
        raise SystemExit('service modal anchor missing')
    s=s.replace(old_modal,new_modal,1)

    old_payload="""soforAdi:String(fd.get('soforAdi')||'').trim(),soforTelefon:String(fd.get('soforTelefon')||'').trim()}"""
    new_payload="""soforAdi:String(fd.get('soforAdi')||'').trim(),soforTelefon:String(fd.get('soforTelefon')||'').trim(),modelYili:String(fd.get('modelYili')||'').trim(),ehliyetYili:String(fd.get('ehliyetYili')||'').trim(),ehliyetSinifi:String(fd.get('ehliyetSinifi')||'').trim().toLocaleUpperCase('tr')}"""
    if old_payload not in s:
        raise SystemExit('service payload anchor missing')
    s=s.replace(old_payload,new_payload,1)

    old_css=""".ka-report .trp-info .trp-label{font-weight:800!important;white-space:nowrap;width:21%}.ka-report .trp-info .trp-value{width:29%;font-weight:600!important}"""
    new_css=""".ka-report .trp-info .trp-label{font-weight:800!important;white-space:normal!important;overflow-wrap:anywhere;word-break:normal;line-height:1.08;width:22%;font-size:7.7pt!important}.ka-report .trp-info .trp-value{width:28%;font-weight:600!important;white-space:normal!important;overflow-wrap:anywhere}.ka-report .trp-info .trp-license-label{font-size:7.2pt!important;letter-spacing:-.08px}"""
    if old_css not in s:
        raise SystemExit('inspection css anchor missing')
    s=s.replace(old_css,new_css,1)

    old_label='''<td class="trp-label">SÜRÜCÜ BELGESİ YIL / SINIFI</td>'''
    new_label='''<td class="trp-label trp-license-label">SÜRÜCÜ BELGESİ YILI / SINIFI</td>'''
    if old_label not in s:
        raise SystemExit('inspection label anchor missing')
    s=s.replace(old_label,new_label,1)
    return s

edit('js/modules/transport.js', patch_transport)


def patch_test(s):
    s=s.replace("'ARACIN MODEL YILI','SÜRÜCÜ BELGESİ YIL / SINIFI'", "'ARACIN MODEL YILI','SÜRÜCÜ BELGESİ YILI / SINIFI'")
    anchor="""for(const token of ['TasimaService.ogrencileriServiseAta','TasimaService.servisKaydet','PeopleImportUI.parseStudentExcel','ReportEngine?.printReport'])assert(transport.includes(token),`Servis detay canonical servis davranışı eksik: ${token}`);"""
    extra="""\nfor(const token of ['name=\"modelYili\"','name=\"ehliyetYili\"','name=\"ehliyetSinifi\"','Araç Model Yılı','Sürücü Belgesi Yılı','Sürücü Belgesi Sınıfı',\"modelYili:String(fd.get('modelYili')\",\"ehliyetYili:String(fd.get('ehliyetYili')\",\"ehliyetSinifi:String(fd.get('ehliyetSinifi')\",'trp-license-label','white-space:normal!important;overflow-wrap:anywhere'])assert(transport.includes(token),`Servis araç/ehliyet alanı sözleşmesi eksik: ${token}`);"""
    if anchor not in s:
        raise SystemExit('transport test anchor missing')
    s=s.replace(anchor,anchor+extra,1)
    s=s.replace("js/modules/transport.js?v=893", "js/modules/transport.js?v=894")
    return s
edit('tests/transport-separate-pages.test.js', patch_test)

edit('js/app-loader.js', lambda s:s.replace("js/modules/transport.js?v=893", "js/modules/transport.js?v=894"))
edit('index.html', lambda s:s.replace('js/app-loader.js?v=900','js/app-loader.js?v=901'))

def patch_sw(s):
    s=s.replace("const CACHE_ADI='oy-cache-v944';", "const CACHE_ADI='oy-cache-v945';")
    s=s.replace("./js/app-loader.js?v=900", "./js/app-loader.js?v=901")
    s=s.replace("./js/modules/transport.js?v=893", "./js/modules/transport.js?v=894")
    return s
edit('service-worker.js', patch_sw)
