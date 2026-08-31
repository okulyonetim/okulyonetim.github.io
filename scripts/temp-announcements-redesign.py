from pathlib import Path
import re

# 1) Remove the Tebliğ-Tebellüğ quick entry only from the Documents landing page.
doc_path = Path('js/modules/documents.js')
doc = doc_path.read_text(encoding='utf-8')
doc_shell_start = doc.find('function shell(){')
doc_shell_end = doc.find('\nfunction renderToolbar()', doc_shell_start)
if doc_shell_start < 0 or doc_shell_end < 0:
    raise RuntimeError('Documents shell block not found')
doc_shell = doc[doc_shell_start:doc_shell_end]
new_doc_shell, removed = re.subn(
    r'<div class="ka-row"><button[^>]*data-document-form="teblig"[^>]*>.*?</button></div>',
    '',
    doc_shell,
    count=1,
    flags=re.S,
)
if removed != 1:
    raise RuntimeError('Documents Tebliğ-Tebellüğ landing button not found exactly once')
doc = doc[:doc_shell_start] + new_doc_shell + doc[doc_shell_end:]
doc_path.write_text(doc, encoding='utf-8')

# 2) Redesign the canonical Announcements page without changing its data/service model.
comm_path = Path('js/modules/communication.js')
src = comm_path.read_text(encoding='utf-8')

# Shared Communication shell: add semantic class hooks only; active Announcement styling remains scoped.
shell_start = src.find('function shell(){')
shell_end = src.find('\nfunction listResult', shell_start)
if shell_start < 0 or shell_end < 0:
    raise RuntimeError('Communication shell block not found')
new_shell = r'''function shell(){return `<section class="ka-stack ka-communication-page" data-communication-module><div class="ka-row ka-row--between ka-communication-heading"><div><h2>İletişim</h2><p class="ka-muted">Okul içi içerikler cihazdan açılır.</p></div><span id="communicationCount" class="ka-badge"></span></div><label class="ka-field ka-communication-search"><span class="ka-field__label">Ara</span><input id="communicationSearch" type="search" placeholder="Başlık, kişi veya içerik ara…"></label><div id="communicationContent" class="ka-stack"></div></section>`}'''
src = src[:shell_start] + new_shell + src[shell_end:]

ann_start = src.find('function announcements(){')
ann_end = src.find('\nfunction conversationTitle(k)', ann_start)
if ann_start < 0 or ann_end < 0:
    raise RuntimeError('Announcements renderer block not found')
new_announcements = r'''function announcements(){
 const l=arr('duyurular').filter(x=>(announcementArchive?x.arsivlendi===true:x.arsivlendi!==true)&&match([x.baslik,x.icerik,x.aciklama,x.olusturanAdi])).sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||'')));
 const me=uid(),admin=currentUser().admin===true;
 if(!l.length)return{count:0,html:`<div class="ka-announcement-empty"><span aria-hidden="true">📣</span><strong>${announcementArchive?'Arşivde duyuru yok':'Aktif duyuru bulunamadı'}</strong><p>${announcementArchive?'Arşivlenen duyurular burada listelenir.':'Yeni bir duyuru eklendiğinde burada görüntülenir.'}</p></div>`};
 const cards=l.map(x=>{const read=!!x.okuyanlar?.[me],body=announcementText(x),readers=announcementReaders(x),readerCount=readers.length,excerpt=body.length>190?body.slice(0,190).trimEnd()+'…':body,images=Array.isArray(x.resimler)?x.resimler.filter(r=>safeHref(r?.url)):[],readerView=admin?`<details class="ka-announcement-readers"><summary><span>👁</span><b>${readerCount}</b><span>kişi okudu</span><span class="ka-announcement-readers__chevron">›</span></summary>${readerCount?`<div class="ka-announcement-readers__list">${readers.map(r=>`<div class="ka-announcement-reader"><span class="ka-announcement-reader__avatar">${esc((r.ad||'?').trim().charAt(0).toLocaleUpperCase('tr')||'?')}</span><strong>${esc(r.ad)}</strong><small>${esc(announcementReadTime(r.tarih))}</small></div>`).join('')}</div>`:'<div class="ka-announcement-readers__empty">Henüz okuyan yok.</div>'}</details>`:`<div class="ka-announcement-read-stat"><span>👁</span><b>${readerCount}</b><span>kişi okudu</span></div>`;return `<article class="ka-announcement-card ${read?'is-read':'is-new'}" data-announcement-card="${esc(x.id)}"><div class="ka-announcement-card__top"><span class="ka-announcement-card__icon" aria-hidden="true">📣</span><div class="ka-announcement-card__title"><div class="ka-announcement-card__kicker"><span>${announcementArchive?'ARŞİV':'DUYURU'}</span><span>•</span><time>${esc(date(x.tarih)||'Tarih yok')}</time></div><h3>${esc(x.baslik||'Duyuru')}</h3><p>${esc(x.olusturanAdi||'Koruk İlk-Ortaokulu')}</p></div><span class="ka-announcement-status ${read?'is-read':'is-new'}">${read?'✓ Okundu':'● Yeni'}</span></div>${excerpt?`<p class="ka-announcement-card__excerpt">${esc(excerpt)}</p>`:''}${images.length?`<div class="ka-announcement-gallery">${images.slice(0,4).map((r,i)=>`<a href="${esc(safeHref(r.url))}" target="_blank" rel="noopener" class="ka-announcement-gallery__item"><img src="${esc(safeHref(r.url))}" alt="Duyuru görseli ${i+1}">${images.length>4&&i===3?`<span>+${images.length-4}</span>`:''}</a>`).join('')}</div>`:''}<div class="ka-announcement-card__insights">${readerView}</div>${body?`<details class="ka-announcement-details"><summary><span>Duyuruyu Aç</span><span aria-hidden="true">⌄</span></summary><div class="ka-announcement-details__content">${esc(body)}</div></details>`:''}<div class="ka-announcement-card__actions">${!read?`<button class="ka-btn ka-announcement-read-button" type="button" data-announcement-read="${esc(x.id)}">✓ Okundu İşaretle</button>`:''}${admin?`<button class="ka-btn ka-btn--secondary" type="button" data-announcement-edit="${esc(x.id)}">Düzenle</button><button class="ka-btn ka-btn--danger" type="button" data-announcement-delete="${esc(x.id)}" data-ka-write="communication.announcements">Sil</button>`:''}</div></article>`}).join('');
 return{count:l.length,html:`<section class="ka-announcement-list">${cards}</section>`}
}'''
src = src[:ann_start] + new_announcements + src[ann_end:]

action_start = src.find('function communicationActionBar(){')
action_end = src.find('\nfunction openAnnouncementModal(item={})', action_start)
if action_start < 0 or action_end < 0:
    raise RuntimeError('Communication action bar block not found')
new_action = r'''function communicationActionBar(){
 const admin=currentUser().admin===true;
 if(active==='announcements'){const rows=arr('duyurular'),activeCount=rows.filter(x=>x.arsivlendi!==true).length,archiveCount=rows.filter(x=>x.arsivlendi===true).length;return `<section class="ka-announcement-toolbar"><div class="ka-announcement-segmented" role="group" aria-label="Duyuru filtresi"><button class="${!announcementArchive?'is-active':''}" type="button" data-announcement-filter="active"><span>Aktif</span><b>${activeCount}</b></button><button class="${announcementArchive?'is-active':''}" type="button" data-announcement-filter="archive"><span>Arşiv</span><b>${archiveCount}</b></button></div>${admin?'<button class="ka-btn ka-announcement-new" type="button" data-announcement-new><span aria-hidden="true">＋</span><span>Yeni Duyuru</span></button>':''}</section>`}
 if(active==='polls'&&admin)return '<div class="ka-row ka-row--end"><button class="ka-btn ka-btn--sm" type="button" data-poll-new>+ Yeni Anket</button></div>';
 if(active==='news')return '<div class="ka-row ka-row--between ka-wrap"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-news-settings>🔔 Bildirim Ayarları</button>'+(admin?'<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-news-source-new>+ Haber Kaynağı</button>':'')+'</div>';
 return'';
}'''
src = src[:action_start] + new_action + src[action_end:]

modal_start = src.find('function openAnnouncementModal(item={}){')
modal_end = src.find('\nfunction openPollModal(){', modal_start)
if modal_start < 0 or modal_end < 0:
    raise RuntimeError('Announcement modal block not found')
new_modal = r'''function openAnnouncementModal(item={}){
 document.querySelector('[data-announcement-modal]')?.remove();
 const title=item.id?'Duyuruyu Düzenle':'Yeni Duyuru',existing=Array.isArray(item.resimler)?item.resimler:[];
 document.body.insertAdjacentHTML('beforeend',`<div class="ka-modal-backdrop ka-announcement-modal-backdrop" data-announcement-modal><form class="ka-modal ka-announcement-modal" data-announcement-form><div class="ka-modal__header ka-announcement-modal__header"><div class="ka-announcement-modal__identity"><span aria-hidden="true">📣</span><div><small>${item.id?'DUYURU DÜZENLE':'YENİ DUYURU'}</small><h2>${esc(title)}</h2><p>Okul içi bilgilendirmeyi başlık, içerik ve görsellerle hazırlayın.</p></div></div><button class="ka-icon-button" type="button" data-close aria-label="Kapat">×</button></div><div class="ka-modal__body ka-announcement-modal__body"><label class="ka-field ka-announcement-field"><span class="ka-field__label">Başlık <b>*</b></span><input name="baslik" required value="${esc(item.baslik||'')}" placeholder="Duyuru başlığını yazın"></label><label class="ka-field ka-announcement-field"><span class="ka-field__label">Duyuru</span><textarea name="icerik" rows="7" placeholder="Duyuru metnini yazın…">${esc(item.icerik||item.aciklama||'')}</textarea></label><section class="ka-announcement-upload"><div class="ka-announcement-upload__head"><span aria-hidden="true">🖼️</span><div><strong>Görseller</strong><small>JPEG, PNG ve diğer görsel türleri · birden fazla seçilebilir</small></div></div><input class="ka-announcement-upload__input" type="file" name="resimler" accept="image/*" multiple><div class="ka-announcement-upload__status" data-announcement-upload></div></section>${existing.length?`<section class="ka-announcement-existing"><div class="ka-announcement-existing__head"><strong>Mevcut Görseller</strong><small>Kaldırmak istediklerinizin işaretini kaldırın.</small></div><div class="ka-announcement-existing__grid">${existing.map((r,i)=>`<label class="ka-announcement-existing__item"><img src="${esc(safeHref(r.url))}" alt="Duyuru görseli"><span class="ka-check"><input type="checkbox" name="keepImage" value="${i}" checked><span>Görseli koru</span></span></label>`).join('')}</div></section>`:''}<label class="ka-announcement-archive-toggle"><input type="checkbox" name="arsivlendi" ${item.arsivlendi?'checked':''}><span class="ka-announcement-archive-toggle__icon" aria-hidden="true">🗄️</span><span><strong>Arşivde</strong><small>Duyuruyu aktif listeden kaldırıp arşivde sakla.</small></span></label></div><div class="ka-modal__footer ka-announcement-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-close>Vazgeç</button><button class="ka-btn" type="submit">${item.id?'Değişiklikleri Kaydet':'Duyuruyu Yayınla'}</button></div></form></div>`);
 const modal=document.querySelector('[data-announcement-modal]'),close=()=>modal?.remove(),status=modal?.querySelector('[data-announcement-upload]'),fileInput=modal?.querySelector('[name="resimler"]');modal?.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',close));modal?.addEventListener('click',e=>{if(e.target===modal)close()});fileInput?.addEventListener('change',()=>{const count=fileInput.files?.length||0;if(status)status.textContent=count?`${count} görsel seçildi.`:''});
 modal?.querySelector('[data-announcement-form]')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,fd=new FormData(form),v={baslik:String(fd.get('baslik')||'').trim(),icerik:String(fd.get('icerik')||'').trim(),arsivlendi:fd.get('arsivlendi')==='on'};if(!v.baslik)return safeToast('Başlık zorunlu.');const keep=new Set(fd.getAll('keepImage').map(Number)),resimler=existing.filter((_,i)=>keep.has(i)),files=[...form.querySelector('[name="resimler"]').files||[]],submit=form.querySelector('[type="submit"]'),before=submit?.textContent||'';try{if(submit)submit.disabled=true;for(let i=0;i<files.length;i++){if(status)status.textContent=`Görsel yükleniyor ${i+1}/${files.length}…`;resimler.push(await globalThis.DuyurularService?.resimYukle?.(files[i],p=>{if(status)status.textContent=`Görsel yükleniyor %${p}`}))}v.resimler=resimler;await globalThis.DuyurularService?.duyuruKaydet?.(item.id||null,v);close();safeToast(item.id?'Duyuru güncellendi.':'Duyuru yayınlandı.');render()}catch(err){safeToast(err?.message||'Duyuru kaydedilemedi.')}finally{if(submit?.isConnected){submit.disabled=false;submit.textContent=before}}});
}'''
src = src[:modal_start] + new_modal + src[modal_end:]
comm_path.write_text(src, encoding='utf-8')

# 3) Canonical design system only: announcement page + modal, both themes via tokens.
css_path = Path('css/design-system.css')
css = css_path.read_text(encoding='utf-8')
marker = '/* Announcements page — canonical communication redesign. */'
if marker in css:
    css = css[:css.index(marker)].rstrip() + '\n'
announcement_css = r'''
/* Announcements page — canonical communication redesign. */
.ka-communication-page:has(.ka-announcement-toolbar){gap:16px}
.ka-communication-page:has(.ka-announcement-toolbar)>.ka-communication-heading{position:relative;overflow:hidden;min-height:126px;padding:22px;border:1px solid var(--ka-hero-border);border-radius:24px;background:var(--ka-hero-bg);box-shadow:var(--ka-hero-shadow);align-items:flex-start}
.ka-communication-page:has(.ka-announcement-toolbar)>.ka-communication-heading::after{content:'📣';position:absolute;right:22px;bottom:-15px;font-size:86px;line-height:1;opacity:.08;transform:rotate(-10deg);pointer-events:none}
.ka-communication-page:has(.ka-announcement-toolbar)>.ka-communication-heading h2{font-size:clamp(28px,7vw,40px);letter-spacing:-.035em;color:var(--ka-hero-text)}
.ka-communication-page:has(.ka-announcement-toolbar)>.ka-communication-heading p{max-width:520px;margin-top:5px;color:var(--ka-hero-muted);font-size:15px}
.ka-communication-page:has(.ka-announcement-toolbar)>.ka-communication-heading .ka-badge{position:relative;z-index:1;min-height:42px;padding:6px 13px;background:var(--ka-hero-badge-bg);color:var(--ka-hero-badge-text);border:1px solid color-mix(in srgb,var(--ka-primary) 24%,transparent);font-size:13px}
.ka-communication-page:has(.ka-announcement-toolbar)>.ka-communication-search{gap:7px}.ka-communication-page:has(.ka-announcement-toolbar)>.ka-communication-search>.ka-field__label{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--ka-text-muted)}
.ka-communication-page:has(.ka-announcement-toolbar)>.ka-communication-search input{min-height:54px;padding-inline:16px;border-radius:17px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm)}
.ka-announcement-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px}
.ka-announcement-segmented{display:inline-grid;grid-template-columns:repeat(2,minmax(92px,1fr));gap:4px;padding:4px;border:1px solid var(--ka-border);border-radius:15px;background:var(--ka-muted-bg)}
.ka-announcement-segmented button{min-height:40px;border:0;border-radius:11px;background:transparent;color:var(--ka-text-muted);padding:6px 12px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:800;cursor:pointer}
.ka-announcement-segmented button b{min-width:22px;height:22px;padding:0 6px;border-radius:999px;display:inline-grid;place-items:center;background:var(--ka-card-bg);color:var(--ka-text-muted);font-size:11px}
.ka-announcement-segmented button.is-active{background:var(--ka-primary);color:var(--ka-text-inverse);box-shadow:var(--ka-shadow-sm)}
.ka-announcement-segmented button.is-active b{background:color-mix(in srgb,var(--ka-text-inverse) 16%,transparent);color:inherit}
.ka-announcement-new{min-height:48px;border-radius:15px;padding-inline:18px;box-shadow:var(--ka-shadow-sm)}.ka-announcement-new>span:first-child{font-size:22px;font-weight:500}
.ka-announcement-list{display:grid;gap:14px}
.ka-announcement-card{position:relative;overflow:hidden;border:1px solid var(--ka-border);border-radius:22px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm);padding:18px;display:grid;gap:15px;transition:border-color var(--ka-transition),box-shadow var(--ka-transition),transform var(--ka-transition)}
.ka-announcement-card:hover{border-color:var(--ka-border-strong);box-shadow:var(--ka-shadow-md)}
.ka-announcement-card.is-new{border-color:color-mix(in srgb,var(--ka-primary) 45%,var(--ka-border))}.ka-announcement-card.is-new::before{content:'';position:absolute;inset:0 auto 0 0;width:4px;background:var(--ka-primary)}
.ka-announcement-card__top{display:grid;grid-template-columns:46px minmax(0,1fr) auto;align-items:start;gap:12px}.ka-announcement-card__icon{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:var(--ka-primary-soft);font-size:22px}
.ka-announcement-card__title{min-width:0}.ka-announcement-card__kicker{display:flex;align-items:center;gap:7px;margin-bottom:3px;color:var(--ka-primary);font-size:10px;font-weight:850;letter-spacing:.07em}.ka-announcement-card__kicker time{color:var(--ka-text-muted);letter-spacing:0;font-weight:700}
.ka-announcement-card__title h3{font-size:19px;line-height:1.25;letter-spacing:-.015em}.ka-announcement-card__title p{margin-top:4px;color:var(--ka-text-muted);font-size:13px}
.ka-announcement-status{min-height:30px;padding:5px 9px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;font-size:11px;font-weight:850}.ka-announcement-status.is-new{background:var(--ka-primary-soft);color:var(--ka-primary)}.ka-announcement-status.is-read{background:var(--ka-muted-bg);color:var(--ka-text-muted)}
.ka-announcement-card__excerpt{font-size:14px;line-height:1.6;color:var(--ka-text);white-space:pre-wrap}
.ka-announcement-gallery{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.ka-announcement-gallery__item{position:relative;display:block;aspect-ratio:1.15;border-radius:13px;overflow:hidden;background:var(--ka-muted-bg);border:1px solid var(--ka-border)}.ka-announcement-gallery__item img{width:100%;height:100%;display:block;object-fit:cover}.ka-announcement-gallery__item>span{position:absolute;inset:0;display:grid;place-items:center;background:rgba(5,18,13,.58);color:#fff;font-size:17px;font-weight:850}
.ka-announcement-card__insights{display:flex;align-items:center;gap:10px}.ka-announcement-read-stat{min-height:34px;padding:5px 10px;border-radius:11px;background:var(--ka-muted-bg);color:var(--ka-text-muted);display:inline-flex;align-items:center;gap:6px;font-size:12px}.ka-announcement-read-stat b{color:var(--ka-text)}
.ka-announcement-readers{width:100%;border:1px solid var(--ka-border);border-radius:13px;background:var(--ka-muted-bg);overflow:hidden}.ka-announcement-readers>summary{min-height:42px;padding:8px 11px;display:flex;align-items:center;gap:7px;cursor:pointer;list-style:none;color:var(--ka-text-muted);font-size:12px}.ka-announcement-readers>summary::-webkit-details-marker{display:none}.ka-announcement-readers>summary b{color:var(--ka-text)}.ka-announcement-readers__chevron{margin-left:auto;font-size:20px;transition:transform var(--ka-transition)}.ka-announcement-readers[open] .ka-announcement-readers__chevron{transform:rotate(90deg)}
.ka-announcement-readers__list{display:grid;border-top:1px solid var(--ka-border)}.ka-announcement-reader{display:grid;grid-template-columns:30px minmax(0,1fr) auto;align-items:center;gap:9px;padding:9px 11px;border-bottom:1px solid var(--ka-border)}.ka-announcement-reader:last-child{border-bottom:0}.ka-announcement-reader__avatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--ka-primary-soft);color:var(--ka-primary);font-size:12px;font-weight:850}.ka-announcement-reader strong{font-size:12px}.ka-announcement-reader small{color:var(--ka-text-muted);font-size:10px}.ka-announcement-readers__empty{padding:10px 12px;border-top:1px solid var(--ka-border);color:var(--ka-text-muted);font-size:12px}
.ka-announcement-details{border-top:1px solid var(--ka-border);border-bottom:1px solid var(--ka-border)}.ka-announcement-details>summary{min-height:44px;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;list-style:none;color:var(--ka-primary);font-weight:800}.ka-announcement-details>summary::-webkit-details-marker{display:none}.ka-announcement-details>summary span:last-child{font-size:18px;transition:transform var(--ka-transition)}.ka-announcement-details[open]>summary span:last-child{transform:rotate(180deg)}.ka-announcement-details__content{padding:0 0 14px;color:var(--ka-text);white-space:pre-wrap;line-height:1.65;font-size:14px}
.ka-announcement-card__actions{display:flex;flex-wrap:wrap;align-items:center;gap:9px}.ka-announcement-card__actions .ka-btn{min-height:40px;border-radius:12px}.ka-announcement-read-button{margin-right:auto}
.ka-announcement-empty{min-height:250px;border:1px dashed var(--ka-border-strong);border-radius:22px;background:var(--ka-card-bg);display:grid;place-items:center;align-content:center;gap:8px;padding:30px;text-align:center}.ka-announcement-empty>span{font-size:44px}.ka-announcement-empty strong{font-size:18px}.ka-announcement-empty p{max-width:420px;color:var(--ka-text-muted)}
.ka-announcement-modal-backdrop{padding:18px}.ka-announcement-modal{width:min(720px,100%);max-height:min(900px,92dvh);display:flex;flex-direction:column;overflow:hidden;border-radius:24px}.ka-announcement-modal__header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:18px 20px}.ka-announcement-modal__identity{display:flex;align-items:flex-start;gap:12px}.ka-announcement-modal__identity>span{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:var(--ka-primary-soft);font-size:21px}.ka-announcement-modal__identity small{display:block;color:var(--ka-primary);font-size:10px;font-weight:850;letter-spacing:.08em}.ka-announcement-modal__identity h2{margin-top:2px;font-size:22px}.ka-announcement-modal__identity p{margin-top:4px;color:var(--ka-text-muted);font-size:12px;line-height:1.45}.ka-announcement-modal__body{padding:18px 20px;overflow:auto;display:grid;gap:17px}.ka-announcement-field>.ka-field__label{font-size:13px}.ka-announcement-field>.ka-field__label b{color:var(--ka-danger)}.ka-announcement-field input,.ka-announcement-field textarea{border-radius:14px}.ka-announcement-field textarea{min-height:170px;line-height:1.6}
.ka-announcement-upload{padding:15px;border:1px dashed var(--ka-border-strong);border-radius:17px;background:var(--ka-muted-bg);display:grid;gap:12px}.ka-announcement-upload__head{display:flex;align-items:center;gap:10px}.ka-announcement-upload__head>span{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:var(--ka-card-bg);font-size:18px}.ka-announcement-upload__head div{display:grid}.ka-announcement-upload__head strong{font-size:14px}.ka-announcement-upload__head small{color:var(--ka-text-muted);font-size:11px}.ka-announcement-upload__input{width:100%;min-height:46px;border:1px solid var(--ka-border);border-radius:12px;background:var(--ka-card-bg);color:var(--ka-text);padding:6px}.ka-announcement-upload__input::file-selector-button{min-height:32px;margin-right:9px;border:0;border-radius:9px;background:var(--ka-primary-soft);color:var(--ka-primary);font:inherit;font-weight:800;padding:0 12px;cursor:pointer}.ka-announcement-upload__status{min-height:16px;color:var(--ka-primary);font-size:11px;font-weight:750}
.ka-announcement-existing{display:grid;gap:10px}.ka-announcement-existing__head{display:grid}.ka-announcement-existing__head strong{font-size:13px}.ka-announcement-existing__head small{color:var(--ka-text-muted);font-size:11px}.ka-announcement-existing__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(116px,1fr));gap:9px}.ka-announcement-existing__item{padding:7px;border:1px solid var(--ka-border);border-radius:13px;background:var(--ka-muted-bg);display:grid;gap:7px}.ka-announcement-existing__item>img{width:100%;aspect-ratio:1.25;object-fit:cover;border-radius:9px}.ka-announcement-existing__item .ka-check{font-size:11px}
.ka-announcement-archive-toggle{min-height:68px;padding:12px 14px;border:1px solid var(--ka-border);border-radius:15px;background:var(--ka-card-bg);display:grid;grid-template-columns:auto 36px minmax(0,1fr);align-items:center;gap:10px;cursor:pointer}.ka-announcement-archive-toggle__icon{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:var(--ka-muted-bg)}.ka-announcement-archive-toggle>span:last-child{display:grid}.ka-announcement-archive-toggle strong{font-size:13px}.ka-announcement-archive-toggle small{color:var(--ka-text-muted);font-size:11px}.ka-announcement-modal__footer{padding:14px 20px;gap:10px}.ka-announcement-modal__footer .ka-btn{min-width:130px;border-radius:13px}
@media(max-width:680px){.ka-communication-page:has(.ka-announcement-toolbar)>.ka-communication-heading{min-height:112px;padding:18px}.ka-communication-page:has(.ka-announcement-toolbar)>.ka-communication-heading::after{right:8px;font-size:70px}.ka-announcement-toolbar{align-items:stretch}.ka-announcement-segmented{flex:1}.ka-announcement-new{padding-inline:13px}.ka-announcement-card{padding:15px;border-radius:19px}.ka-announcement-card__top{grid-template-columns:40px minmax(0,1fr);gap:10px}.ka-announcement-card__icon{width:40px;height:40px;border-radius:12px;font-size:19px}.ka-announcement-status{grid-column:2;justify-self:start;margin-top:-4px}.ka-announcement-card__title h3{font-size:17px}.ka-announcement-gallery{grid-template-columns:repeat(3,minmax(0,1fr))}.ka-announcement-gallery__item:nth-child(4){display:none}.ka-announcement-card__actions .ka-btn{flex:1 1 auto}.ka-announcement-read-button{flex-basis:100%!important;margin-right:0}.ka-announcement-reader{grid-template-columns:30px minmax(0,1fr)}.ka-announcement-reader small{grid-column:2}.ka-announcement-modal-backdrop{padding:0;align-items:flex-end}.ka-announcement-modal{width:100%;max-width:none;max-height:94dvh;border-radius:24px 24px 0 0}.ka-announcement-modal__header,.ka-announcement-modal__body{padding-left:16px;padding-right:16px}.ka-announcement-modal__identity p{display:none}.ka-announcement-modal__footer{padding:12px 16px max(12px,var(--ka-safe-bottom));display:grid;grid-template-columns:1fr 1.25fr}.ka-announcement-modal__footer .ka-btn{min-width:0}.ka-announcement-existing__grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:430px){.ka-announcement-toolbar{display:grid;grid-template-columns:1fr auto}.ka-announcement-segmented{width:100%}.ka-announcement-new{min-width:48px;padding:0 13px}.ka-announcement-new span:last-child{display:none}.ka-announcement-gallery{grid-template-columns:repeat(2,minmax(0,1fr))}.ka-announcement-gallery__item:nth-child(3){display:none}}
'''
css = css.rstrip() + '\n' + announcement_css.strip() + '\n'
css_path.write_text(css, encoding='utf-8')

# 4) Regression test for the visible redesign and documents landing cleanup.
test_path = Path('tests/announcements-page-redesign.test.js')
test_path.write_text(r'''const fs=require('fs');
const assert=require('assert');
const communication=fs.readFileSync('js/modules/communication.js','utf8');
const documents=fs.readFileSync('js/modules/documents.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
new Function(communication);
new Function(documents);
const announcementBlock=communication.slice(communication.indexOf('function announcements(){'),communication.indexOf('\nfunction conversationTitle(k)',communication.indexOf('function announcements(){')));
for(const token of ['ka-announcement-list','ka-announcement-card','ka-announcement-status','ka-announcement-gallery','ka-announcement-details','ka-announcement-card__actions','data-announcement-read','data-announcement-edit','data-announcement-delete'])assert(announcementBlock.includes(token),`Duyurular yeni görünüm/işlem sözleşmesi eksik: ${token}`);
assert(!announcementBlock.includes('style='),'Duyuru kartları inline style üretmemeli.');
const actionBlock=communication.slice(communication.indexOf('function communicationActionBar(){'),communication.indexOf('\nfunction openAnnouncementModal',communication.indexOf('function communicationActionBar(){')));
for(const token of ['ka-announcement-toolbar','ka-announcement-segmented','data-announcement-filter="active"','data-announcement-filter="archive"','data-announcement-new'])assert(actionBlock.includes(token),`Duyuru toolbar sözleşmesi eksik: ${token}`);
const modalBlock=communication.slice(communication.indexOf('function openAnnouncementModal(item={}){'),communication.indexOf('\nfunction openPollModal(){',communication.indexOf('function openAnnouncementModal(item={}){')));
for(const token of ['ka-announcement-modal','ka-announcement-upload','name="resimler"','multiple','name="arsivlendi"','name="keepImage"','DuyurularService?.resimYukle','DuyurularService?.duyuruKaydet'])assert(modalBlock.includes(token),`Duyuru modal sözleşmesi eksik: ${token}`);
assert(!modalBlock.includes('style='),'Duyuru modalı inline style üretmemeli.');
for(const token of ['.ka-announcement-card{','.ka-announcement-toolbar{','.ka-announcement-modal{','[data-theme="dark"]'])assert(css.includes(token),`Merkezi design-system duyuru stili eksik: ${token}`);
const docShell=documents.slice(documents.indexOf('function shell(){'),documents.indexOf('\nfunction renderToolbar()',documents.indexOf('function shell(){')));
assert(!docShell.includes('data-document-form="teblig"'),'Dokümanlar ana sayfasında Tebliğ-Tebellüğ hızlı butonu kalmamalı.');
assert(documents.includes('data-teblig-field="tarihIso"'),'Tebliğ-Tebellüğ canonical form motoru menü rotası için korunmalı.');
assert(!communication.includes('.collection('),'Communication doğrudan Firestore kullanmamalı.');
console.log('Duyurular canonical redesign + Dokümanlar Tebliğ hızlı giriş kaldırma sözleşmesi başarılı.');
''', encoding='utf-8')

# 5) Bump PWA cache so redesigned canonical assets update immediately.
sw_path = Path('service-worker.js')
sw = sw_path.read_text(encoding='utf-8')
if "const CACHE_ADI='oy-cache-v821';" not in sw:
    raise RuntimeError('Unexpected service worker cache version')
sw = sw.replace("const CACHE_ADI='oy-cache-v821';", "const CACHE_ADI='oy-cache-v822';", 1)
sw_path.write_text(sw, encoding='utf-8')
