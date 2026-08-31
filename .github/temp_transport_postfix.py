from pathlib import Path
p=Path('js/modules/transport.js')
s=p.read_text(encoding='utf-8')
old='\n(s={}){return `<div class="ka-modal-backdrop" data-service-modal>'
new='\nfunction serviceModal(s={}){return `<div class="ka-modal-backdrop" data-service-modal>'
assert s.count(old)==1, s.count(old)
s=s.replace(old,new,1)
old_toolbar='${canEditServices()?`<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-service-edit="${esc(s.id)}">✎ Düzenle</button>`:\'\'}<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-transport-detail-close>× Kapat</button>'
new_toolbar='${canEditServices()?`<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-service-edit="${esc(s.id)}">✎ Düzenle</button><button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-transport-detail-delete>Sil</button>`:\'\'}<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-transport-detail-close>× Kapat</button>'
assert s.count(old_toolbar)==1, s.count(old_toolbar)
s=s.replace(old_toolbar,new_toolbar,1)
old_bind="out.querySelector('[data-transport-detail-close]')?.addEventListener('click',closeServiceDetail);"
new_bind="out.querySelector('[data-transport-detail-close]')?.addEventListener('click',closeServiceDetail);out.querySelector('[data-transport-detail-delete]')?.addEventListener('click',()=>deleteService(serviceDetailId));"
assert s.count(old_bind)==1, s.count(old_bind)
s=s.replace(old_bind,new_bind,1)
p.write_text(s,encoding='utf-8')
