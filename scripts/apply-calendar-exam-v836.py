from pathlib import Path
import re

ROOT=Path('.')
def read(path): return (ROOT/path).read_text(encoding='utf-8')
def write(path,text): (ROOT/path).write_text(text,encoding='utf-8')

# 1) Takvim modalı: browser UI scope içinde gerçek global servise bağlan ve kullanıcıya işlem durumunu göster.
p=Path('js/modules/communication.js'); s=read(p)
m=re.search(r"function _calBindModal\(\)\{.*?\n\nfunction render\(\)",s,re.S)
if not m: raise SystemExit('calendar modal binder not found')
replacement=r'''function _calBindModal(){
 const modal=document.querySelector('[data-cal-modal]');if(!modal)return;
 const form=modal.querySelector('#calForm'),submit=form?.querySelector('[type="submit"]'),close=()=>{if(!submit?.disabled)modal.remove()};
 modal.querySelector('[data-cal-modal-kapat]')?.addEventListener('click',close);modal.addEventListener('click',e=>{if(e.target===modal)close()});
 form?.addEventListener('submit',async e=>{
  e.preventDefault();if(submit?.disabled)return;
  const fd=new FormData(e.currentTarget),id=String(fd.get('id')||''),type=String(fd.get('type')||''),v={baslik:String(fd.get('baslik')||'').trim()};
  if(!v.baslik){safeToast('Başlık zorunlu');return}
  const service=globalThis.TakvimService;if(!service){safeToast('Takvim servisi hazır değil.');return}
  const oldText=submit?.textContent||'Kaydet';if(submit){submit.disabled=true;submit.textContent='Kaydediliyor…'}
  try{
   if(type==='hat'){
    v.tarih=String(fd.get('tarih')||'');v.oncelik=String(fd.get('oncelik')||'Orta');v.aciklama=String(fd.get('aciklama')||'').trim();
    const existing=id?visibleCalendar('hatirlaticilar').find(x=>x.id===id):null;v.tamamlandi=existing?.tamamlandi===true;
    await service.hatirlaticiKaydet(id||null,v);safeToast('Hatırlatıcı kaydedildi.');
   }else{
    v.sonTarih=String(fd.get('sonTarih')||'');v.durum=String(fd.get('durum')||'yapilacak');v.aciklama=String(fd.get('aciklama')||'').trim();
    await service.gorevKaydet(id||null,v);safeToast('Görev kaydedildi.');
   }
   modal.remove();render();
  }catch(err){
   const msg=err?.message==='sahip-degil'?'Bu kayıt size ait değil.':err?.message==='yetkisiz'?'Bu işlem için yetkiniz yok.':err?.message||'Kaydedilemedi';safeToast(msg);
   if(submit?.isConnected){submit.disabled=false;submit.textContent=oldText}
  }
 })
}

function render()'''
s=s[:m.start()]+replacement+s[m.end():]
if 'await global.TakvimService?.hatirlaticiKaydet' in s or 'await global.TakvimService?.gorevKaydet' in s: raise SystemExit('stale calendar global reference remains')
write(p,s)

# 2) Yazılı/Deneme: görünürlüğü sadece ilk DOM sıralamasına değil son boyamaya da kilitle.
p=Path('js/modules/academic.js'); s=read(p)
m=re.search(r"function prioritizeExamRecords\(out,count\)\{.*?\}\nfunction render\(\)",s,re.S)
if not m: raise SystemExit('academic prioritize helper not found')
replacement=r'''function stabilizeExamRecords(out,count){
 if(!out||(active!=='written'&&active!=='trial'))return;
 const trial=active==='trial',list=out.querySelector(trial?'.ka-trial-list':'.ka-written-list'),summary=out.querySelector(trial?'.ka-trial-summary':'.ka-written-summary');if(!list||!summary)return;
 const page=list.parentElement;if(!page||summary.parentElement!==page)return;
 let head=page.querySelector('[data-academic-record-head]');if(!head){head=document.createElement('div');head.className='ka-exam-record-head';head.dataset.academicRecordHead=active}
 head.innerHTML=`<div><strong>${trial?'Deneme Sınavları':'Yazılı Sınavlar'}</strong><small>${Number(count)||0} kayıt</small></div>`;
 page.insertBefore(list,summary);page.insertBefore(head,list);
 const force=(el,key,value)=>el?.style?.setProperty?.(key,value,'important');
 page.hidden=false;force(page,'display','flex');force(page,'flex-direction','column');force(page,'align-items','stretch');force(page,'width','100%');force(page,'min-width','0');force(page,'min-height','0');
 force(head,'display','flex');force(head,'order','0');force(head,'width','100%');
 force(list,'display','grid');force(list,'visibility','visible');force(list,'opacity','1');force(list,'order','1');force(list,'width','100%');force(list,'min-width','0');force(list,'height','auto');force(list,'max-height','none');force(list,'overflow','visible');
 force(summary,'display','grid');force(summary,'grid-template-columns','repeat(3,minmax(0,1fr))');force(summary,'order','2');force(summary,'width','100%');
 const toolbar=page.querySelector('.ka-exam-toolbar');if(toolbar)force(toolbar,'order','-1');
 for(const card of list.children){card.hidden=false;force(card,'display','grid');force(card,'visibility','visible');force(card,'opacity','1');force(card,'width','100%');force(card,'min-width','0');force(card,'height','auto');force(card,'max-height','none')}
 out.dataset.academicRecordsVisible='true';out.dataset.academicRecordCount=String(Number(count)||0);
}
function render()'''
s=s[:m.start()]+replacement+s[m.end():]
s=s.replace('prioritizeExamRecords(out,r.count)','stabilizeExamRecords(out,r.count)')
needle="window.PermissionService?.apply?.(document.getElementById('v2ModuleRoot')||document)}\nfunction bind()"
repl="window.PermissionService?.apply?.(document.getElementById('v2ModuleRoot')||document);if(active==='written'||active==='trial')requestAnimationFrame(()=>stabilizeExamRecords(out,r.count))}\nfunction bind()"
if needle not in s: raise SystemExit('academic render tail not found')
s=s.replace(needle,repl,1)
if 'prioritizeExamRecords' in s: raise SystemExit('old academic helper remains')
write(p,s)

# 3) Merkezi CSS: sınav workspace/list/card hiçbir mobil kural tarafından çökertilemesin.
p=Path('css/design-system.css'); s=read(p)
if '/* ACADEMIC EXAM MOBILE VISIBILITY — CANONICAL */' not in s: raise SystemExit('academic css marker missing')
anchor='.ka-exam-record-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:2px 2px 0}'
if anchor not in s: raise SystemExit('exam css head anchor missing')
s=s.replace(anchor,'.ka-written-page,.ka-trial-page{display:flex!important;flex-direction:column!important;align-items:stretch!important;width:100%!important;min-width:0!important;min-height:0!important}.ka-exam-record-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:2px 2px 0}',1)
s=s.replace('.ka-written-list,.ka-trial-list{display:grid!important;visibility:visible!important;opacity:1!important;min-height:0}', '.ka-written-list,.ka-trial-list{display:grid!important;visibility:visible!important;opacity:1!important;width:100%!important;min-width:0!important;min-height:0!important;height:auto!important;max-height:none!important;overflow:visible!important;align-content:start!important}',1)
mobile='@media(max-width:640px){.ka-academic-written-active>'
if mobile not in s: raise SystemExit('exam mobile css anchor missing')
s=s.replace(mobile,'.ka-written-card,.ka-trial-card{width:100%!important;min-width:0!important;height:auto!important;max-height:none!important;visibility:visible!important;opacity:1!important}\n'+mobile,1)
write(p,s)

# 4) Bu paketin web/PWA sürümü.
for rel in ['index.html','js/app-loader.js','service-worker.js']:
 p=Path(rel); write(p,read(p).replace('835','836'))
p=Path('js/app-loader.js'); s=read(p)
s=s.replace("'js/modules/communication.js','js/modules/dashboard.js'", "'js/modules/communication.js?v=836','js/modules/dashboard.js'")
s=s.replace("FIREBASE_STORAGE_SDK,'js/modules/communication.js','js/modules/assistant.js'", "FIREBASE_STORAGE_SDK,'js/modules/communication.js?v=836','js/modules/assistant.js'")
write(p,s)
p=Path('service-worker.js'); s=read(p)
anchor="'./css/design-system.css?v=836','./js/app-loader.js?v=836','./js/modules/academic.js?v=836',"
if anchor not in s: raise SystemExit('sw precache anchor missing')
s=s.replace(anchor,"'./css/design-system.css?v=836','./js/app-loader.js?v=836','./js/modules/academic.js?v=836','./js/modules/communication.js?v=836',",1)
write(p,s)

# 5) Regresyon sözleşmeleri.
p=Path('tests/calendar-month-view.test.js'); s=read(p)
extra="""
assert(!communication.includes('await global.TakvimService?.hatirlaticiKaydet')&&!communication.includes('await global.TakvimService?.gorevKaydet'),'Takvim UI browser scope dışında global değişkenine başvurmamalı.');
assert(communication.includes('const service=globalThis.TakvimService')&&communication.includes("submit.textContent='Kaydediliyor…'")&&communication.includes('await service.hatirlaticiKaydet')&&communication.includes('await service.gorevKaydet'),'Hatırlatıcı/Görev Kaydet butonu gerçek TakvimService çağrısını görünür bekleme durumuyla çalıştırmalı.');
assert(communication.includes("v.tamamlandi=existing?.tamamlandi===true"),'Hatırlatıcı düzenleme mevcut tamamlandı durumunu yanlışlıkla sıfırlamamalı.');
"""
if 'globalThis.TakvimService' not in s: s=s.replace("console.log('Takvim aylık görünüm sözleşmesi başarılı.');",extra+"console.log('Takvim aylık görünüm sözleşmesi başarılı.');")
write(p,s)

for p in Path('tests').glob('*.test.js'):
 s=read(p).replace('v=835','v=836').replace('oy-cache-v835','oy-cache-v836')
 if p.name=='academic-separate-pages.test.js':
  s=s.replace("assert(academic.includes('function prioritizeExamRecords(out,count)')&&academic.includes(\"page.insertBefore(list,summary)\")&&academic.includes(\"academicRecordsVisible='true'\"),'Yazılı/Deneme gerçek kayıt listesi mobilde özet kartlarından önce görünür olmalı.');", "assert(academic.includes('function stabilizeExamRecords(out,count)')&&academic.includes('page.insertBefore(list,summary)')&&academic.includes(\"requestAnimationFrame(()=>stabilizeExamRecords(out,r.count))\")&&academic.includes(\"academicRecordsVisible='true'\"),'Yazılı/Deneme gerçek kayıt listesi ilk ve son boyamada görünür kalmalı.');")
  s=s.replace("assert(css.includes('ACADEMIC EXAM MOBILE VISIBILITY — CANONICAL')&&css.includes('.ka-written-list,.ka-trial-list{display:grid!important')&&css.includes('grid-template-columns:repeat(3,minmax(0,1fr))!important'),'Sınav özetleri mobilde kompakt üçlü düzen kullanmalı ve kayıt listesi gizlenememeli.');", "assert(css.includes('ACADEMIC EXAM MOBILE VISIBILITY — CANONICAL')&&css.includes('.ka-written-page,.ka-trial-page{display:flex!important')&&css.includes('.ka-written-list,.ka-trial-list{display:grid!important')&&css.includes('grid-template-columns:repeat(3,minmax(0,1fr))!important'),'Sınav çalışma alanı ve kayıt listesi mobilde çökmemeli; özetler kompakt üçlü düzen kullanmalı.');")
 write(p,s)

# Yalnız loader beklentilerini versionla; fs.readFileSync fiziksel dosya yolları query string ALMAZ.
p=Path('tests/classic-shell-v2-smoke.test.js'); s=read(p)
s=s.replace("define('dashboard',['js/modules/school-live-status.js','js/modules/communication.js','js/modules/dashboard.js'])", "define('dashboard',['js/modules/school-live-status.js','js/modules/communication.js?v=836','js/modules/dashboard.js'])")
s=s.replace("communicationBundle.includes(\"'js/modules/communication.js'\")&&communicationBundle.includes(\"'js/modules/assistant.js'\")&&communicationBundle.indexOf(\"'js/modules/communication.js'\")", "communicationBundle.includes(\"'js/modules/communication.js?v=836'\")&&communicationBundle.includes(\"'js/modules/assistant.js'\")&&communicationBundle.indexOf(\"'js/modules/communication.js?v=836'\")")
write(p,s)

p=Path('tests/module-bundles-smoke.test.js'); s=read(p)
s=s.replace("academic:'academic.js?v=836',management:'management.js',communication:'communication.js',transport:", "academic:'academic.js?v=836',management:'management.js',communication:'communication.js?v=836',transport:")
write(p,s)

print('calendar + academic v836 patch applied')
