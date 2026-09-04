from pathlib import Path


def replace_once(path, old, new, label):
    p=Path(path)
    s=p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'{label}: target not found in {path}')
    p.write_text(s.replace(old,new,1),encoding='utf-8')

# 1) Settings: teachers must never mutate school/social settings.
path='js/modules/settings.js'
p=Path(path); s=p.read_text(encoding='utf-8')
old="const OkulBilgileriRepository={dinle(callback){return device().listen('okulBilgileri',rows=>callback(rows.find(x=>x.id==='ayarlar')||rows[0]||null,{source:'device'}));},getir(){return row('okulBilgileri','ayarlar')||device().list('okulBilgileri')[0]||null;},kaydet(veri){return device().set('okulBilgileri',COL.okulBilgileri,'ayarlar',veri,{merge:false});}};global.OkulBilgileriRepository=OkulBilgileriRepository;global.OkulBilgileriService={_duzenleyebilir(){return global.AKTIF_KULLANICI?.admin===true||(typeof duzenleyebilir==='function'&&duzenleyebilir('okulBilgileri'));},dinle:cb=>OkulBilgileriRepository.dinle(cb),getir:()=>OkulBilgileriRepository.getir(),kaydet(veri){"
new="function settingsTeacherAccount(){const u=global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};if(u.admin===true)return false;const r=global.AKTIF_ROL||global.AppStore?.get?.('session.role')||{};const n=String(r.ad||r.rolAdi||u.rolAdi||u.rol||'').trim().toLocaleLowerCase('tr-TR');return n.includes('öğretmen')||n.includes('ogretmen')||!!(u.bagliOgretmenId||u.ogretmenId)}\nconst OkulBilgileriRepository={dinle(callback){return device().listen('okulBilgileri',rows=>callback(rows.find(x=>x.id==='ayarlar')||rows[0]||null,{source:'device'}));},getir(){return row('okulBilgileri','ayarlar')||device().list('okulBilgileri')[0]||null;},kaydet(veri){return device().set('okulBilgileri',COL.okulBilgileri,'ayarlar',veri,{merge:false});}};global.OkulBilgileriRepository=OkulBilgileriRepository;global.OkulBilgileriService={_duzenleyebilir(){if(global.AKTIF_KULLANICI?.admin===true)return true;if(settingsTeacherAccount())return false;return typeof duzenleyebilir==='function'&&duzenleyebilir('okulBilgileri');},dinle:cb=>OkulBilgileriRepository.dinle(cb),getir:()=>OkulBilgileriRepository.getir(),kaydet(veri){"
if old not in s: raise SystemExit('settings service guard target not found')
s=s.replace(old,new,1)
old="const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot',\"'\":'&#39;'}[c])),arr=t=>{const v=window.AppStore?.data?.(t);return Array.isArray(v)?v:[]},admin=()=>window.AKTIF_KULLANICI?.admin===true,canUsers=(min='preview')=>window.PermissionService?.can?.('settings.users',min)===true,canRoles=(min='preview')=>window.PermissionService?.can?.('settings.roles',min)===true,schoolVisible=()=>admin()||(typeof gorebilir==='function'&&gorebilir('okulBilgileri')),systemSettingsEditable=()=>admin()||(typeof duzenleyebilir==='function'&&duzenleyebilir('sistemAyarlari'))||window.PermissionService?.can?.('sistemAyarlari','edit')===true;"
new="const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot',\"'\":'&#39;'}[c])),arr=t=>{const v=window.AppStore?.data?.(t);return Array.isArray(v)?v:[]},admin=()=>window.AKTIF_KULLANICI?.admin===true,settingsTeacherUser=()=>{const u=window.AKTIF_KULLANICI||window.AppStore?.get?.('session.user')||{};if(u.admin===true)return false;const r=window.AKTIF_ROL||window.AppStore?.get?.('session.role')||arr('roller').find(x=>x.id===u.rolId)||{};const n=String(r.ad||r.rolAdi||u.rolAdi||u.rol||'').trim().toLocaleLowerCase('tr-TR');return n.includes('öğretmen')||n.includes('ogretmen')||!!(u.bagliOgretmenId||u.ogretmenId)},canUsers=(min='preview')=>window.PermissionService?.can?.('settings.users',min)===true,canRoles=(min='preview')=>window.PermissionService?.can?.('settings.roles',min)===true,schoolVisible=()=>admin()||(typeof gorebilir==='function'&&gorebilir('okulBilgileri')),systemSettingsEditable=()=>admin()||(typeof duzenleyebilir==='function'&&duzenleyebilir('sistemAyarlari'))||window.PermissionService?.can?.('sistemAyarlari','edit')===true;"
if old not in s: raise SystemExit('settings UI helper target not found')
s=s.replace(old,new,1)
old="function socialRow(x={}){return `<article class=\"ka-card ka-list-card\" data-school-social data-social-id=\"${esc(x.id||'')}\"><div class=\"ka-card__body ka-stack\"><div class=\"ka-grid\"><label class=\"ka-field\"><span class=\"ka-field__label\">Etiket</span><input data-social-label value=\"${esc(x.etiket||'')}\" placeholder=\"Instagram\"></label><label class=\"ka-field\"><span class=\"ka-field__label\">İkon</span><input data-social-icon value=\"${esc(x.ikon||'')}\" placeholder=\"📷\"></label></div><label class=\"ka-field\"><span class=\"ka-field__label\">Bağlantı</span><input data-social-url value=\"${esc(x.url||'')}\" placeholder=\"https://...\"></label><div class=\"ka-row\"><button class=\"ka-btn ka-btn--danger ka-btn--sm\" type=\"button\" data-social-remove>Bağlantıyı Kaldır</button></div></div></article>`}"
new="function socialRow(x={},editable=false){const disabled=editable?'':'disabled';return `<article class=\"ka-card ka-list-card\" data-school-social data-social-id=\"${esc(x.id||'')}\"><div class=\"ka-card__body ka-stack\"><div class=\"ka-grid\"><label class=\"ka-field\"><span class=\"ka-field__label\">Etiket</span><input data-social-label value=\"${esc(x.etiket||'')}\" placeholder=\"Instagram\" ${disabled}></label><label class=\"ka-field\"><span class=\"ka-field__label\">İkon</span><input data-social-icon value=\"${esc(x.ikon||'')}\" placeholder=\"📷\" ${disabled}></label></div><label class=\"ka-field\"><span class=\"ka-field__label\">Bağlantı</span><input data-social-url value=\"${esc(x.url||'')}\" placeholder=\"https://...\" ${disabled}></label>${editable?'<div class=\"ka-row\"><button class=\"ka-btn ka-btn--danger ka-btn--sm\" type=\"button\" data-social-remove>Bağlantıyı Kaldır</button></div>':''}</div></article>`}"
if old not in s: raise SystemExit('socialRow target not found')
s=s.replace(old,new,1)
s=s.replace("links.map(socialRow).join('')","links.map(x=>socialRow(x,edit)).join('')",1)
s=s.replace("insertAdjacentHTML('beforeend',socialRow({}))","insertAdjacentHTML('beforeend',socialRow({},true))",1)
old="out.addEventListener('click',e=>{const b=e.target.closest?.('[data-social-remove]');if(b)b.closest('[data-school-social]')?.remove()});"
new="out.addEventListener('click',e=>{const b=e.target.closest?.('[data-social-remove]');if(!b)return;if(!window.OkulBilgileriService?._duzenleyebilir?.()){toast?.('Bu işlem için yetkiniz yok.');return}b.closest('[data-school-social]')?.remove()});"
if old not in s: raise SystemExit('social remove binding target not found')
s=s.replace(old,new,1)
old="function activeAllowed(tab){if(tab==='users'||tab==='statistics')return canUsers('preview');if(tab==='roles')return canRoles('preview');"
new="function activeAllowed(tab){if(settingsTeacherUser()&&['users','statistics','roles'].includes(tab))return false;if(tab==='users'||tab==='statistics')return canUsers('preview');if(tab==='roles')return canRoles('preview');"
if old not in s: raise SystemExit('activeAllowed target not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# 2) Shell: teacher role detection + hide whole Personnel group.
p=Path('js/core/shell-ui.js'); s=p.read_text(encoding='utf-8')
old="function isTeacherUser(){const u=user();return u.admin!==true&&!!(u.bagliOgretmenId||u.ogretmenId)}\nfunction pageAllowed(name,page=''){return !isTeacherUser()||!TEACHER_HIDDEN_PAGES.has(`${name}:${page||''}`)}"
new="function isTeacherUser(){const u=user();if(u.admin===true)return false;const r=global.AKTIF_ROL||global.AppStore?.get?.('session.role')||arr('roller').find(x=>x.id===u.rolId)||{};const n=String(r.ad||r.rolAdi||u.rolAdi||u.rol||'').trim().toLocaleLowerCase('tr-TR');return n.includes('öğretmen')||n.includes('ogretmen')||!!(u.bagliOgretmenId||u.ogretmenId)}\nfunction pageAllowed(name,page=''){return !isTeacherUser()||!TEACHER_HIDDEN_PAGES.has(`${name}:${page||''}`)}\nfunction teacherMenuGroupAllowed(group){return !isTeacherUser()||group?.key!=='management'}"
if old not in s: raise SystemExit('shell teacher detector target not found')
s=s.replace(old,new,1)
old="function customizedVisibleGroups(){return visibleGroups().map((g,index)=>menuGroupView(g,index)).filter(g=>g.__menuVisible!==false&&visibleItems(g).length).sort((a,b)=>a.__menuOrder-b.__menuOrder)}"
new="function customizedVisibleGroups(){return visibleGroups().map((g,index)=>menuGroupView(g,index)).filter(g=>g.__menuVisible!==false&&teacherMenuGroupAllowed(g)&&visibleItems(g).length).sort((a,b)=>a.__menuOrder-b.__menuOrder)}"
if old not in s: raise SystemExit('shell menu filter target not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# 3) Academic results: local-first upsert, deneme result merge, student autofill, working cancel/save.
p=Path('js/modules/academic.js'); s=p.read_text(encoding='utf-8')
old="const repo={dinle:cb=>device().listen(type,rows=>cb([...rows].sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||''))))),ekle:v=>device().add(type,collection,v),guncelle:(id,v)=>device().update(type,collection,id,v),sil:id=>device().remove(type,collection,id)};return{sinavlariDinle:(cb,h)=>repo.dinle(cb,h),sinavEkle(v){if(!gorebilir(modul))return Promise.reject(new Error('yetkisiz'));return repo.ekle(v)},sinavGuncelle(id,v){if(!gorebilir(modul))return Promise.reject(new Error('yetkisiz'));return repo.guncelle(id,v)},sinavSil(id){"
new="const repo={dinle:cb=>device().listen(type,rows=>cb([...rows].sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||''))))),ekle:v=>device().add(type,collection,v),guncelle:(id,v)=>device().update(type,collection,id,v),kaydet:(id,v)=>device().set(type,collection,id,v,{merge:true}),sil:id=>device().remove(type,collection,id)};return{sinavlariDinle:(cb,h)=>repo.dinle(cb,h),sinavEkle(v){if(!gorebilir(modul))return Promise.reject(new Error('yetkisiz'));return repo.ekle(v)},sinavGuncelle(id,v){if(!gorebilir(modul))return Promise.reject(new Error('yetkisiz'));return repo.guncelle(id,v)},sinavKaydet(id,v){if(!gorebilir(modul))return Promise.reject(new Error('yetkisiz'));return repo.kaydet(id,v)},sinavSil(id){"
if old not in s: raise SystemExit('academic result service target not found')
s=s.replace(old,new,1)
old="function ssSinavlar(tur){return arr(tur).filter(s=>match([s.ad,s.tarih])).sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||'')))}"
new="function ssDenemeResult(id){return arr('denemeSonuclari').find(x=>x.id===id||x.sinavId===id)||null}\nfunction ssSinavlar(tur){const list=arr(tur).filter(s=>match([s.ad,s.tarih])).sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||'')));if(tur!=='denemeSinavlari')return list;return list.map(s=>{const r=ssDenemeResult(s.id);return r?{...s,sonuclar:Array.isArray(r.sonuclar)?r.sonuclar:(s.sonuclar||[])}:s})}"
if old not in s: raise SystemExit('ssSinavlar target not found')
s=s.replace(old,new,1)
start=s.index('function ssResultForm(sinavId,tur){')
end=s.index('\nlet ssOpen=null,ssOpenTur=null;',start)
new_form=r'''function ssStudentClass(v={}){const cls=arr('siniflar').find(s=>s.id===v.sinifId);return String(cls?.ad||v.sinif||v.sinifAdi||v.ogrenciSinif||'').trim()}
function ssStudentNumber(v={}){return String(v.ogrenciNo??v.okulNo??v.numara??v.no??'').trim()}
function ssResultForm(sinavId,tur){
  const sinav=ssExamSource(tur,sinavId)||arr('denemeSinavlari').find(x=>x.id===sinavId)||{};
  const dersler=sinav.dersler?.length?sinav.dersler:DERSLER_LGS.map(ad=>({ad,soruSayisi:20}));
  const veliler=arr('veliler').slice().sort((a,b)=>(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));
  return`<div class="ka-modal-backdrop ka-results-modal-backdrop" data-ss-modal><form class="ka-modal ka-results-modal" id="ssResultForm">
    <div class="ka-modal__header"><div><small class="ka-results-modal__eyebrow">${tur==='deneme'?'Deneme Sonucu':'Test Sonucu'}</small><h2>Sonuç Ekle</h2><p>${esc(sinav.ad||'Sınav')}</p></div><button class="ka-icon-button" type="button" data-ss-modal-kapat aria-label="Kapat">×</button></div>
    <div class="ka-modal__body ka-stack">
      <input type="hidden" name="sinavId" value="${esc(sinavId)}"><input type="hidden" name="tur" value="${esc(tur)}">
      <section class="ka-results-form-card"><h3>Öğrenci</h3><label class="ka-field"><span class="ka-field__label">Kayıtlı öğrenci</span><select name="ogrenciId"><option value="">— Serbest giriş —</option>${veliler.map(v=>`<option value="${esc(v.id)}">${esc(v.ogrenciAdi)} (${esc(ssStudentClass(v)||'Sınıf yok')}${ssStudentNumber(v)?` · ${esc(ssStudentNumber(v))}`:''})</option>`).join('')}</select></label><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Öğrenci Adı</span><input name="ogrenciAdi" placeholder="Veya manuel giriş"></label><label class="ka-field"><span class="ka-field__label">Öğrenci No</span><input name="ogrenciNo" inputmode="numeric" placeholder="Okul numarası"></label><label class="ka-field"><span class="ka-field__label">Sınıf</span><input name="sinif" placeholder="Örn: 8-A"></label></div></section>
      <section class="ka-results-form-card"><h3>Ders Sonuçları</h3><div class="ka-results-entry-grid">${dersler.map(d=>`<article class="ka-results-entry-row"><strong>${esc(d.ad)}</strong><label><span>Doğru</span><input type="number" min="0" name="d_${esc(d.ad)}" value="0" class="ss-d-input" data-ders="${esc(d.ad)}"></label><label><span>Yanlış</span><input type="number" min="0" name="y_${esc(d.ad)}" value="0" class="ss-y-input" data-ders="${esc(d.ad)}"></label><div><span>Net</span><strong class="ss-net" data-ders="${esc(d.ad)}">0.00</strong></div></article>`).join('')}</div></section>
    </div>
    <div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-ss-modal-kapat>Vazgeç</button><button class="ka-btn" type="submit" data-ss-save>Kaydet</button></div>
  </form></div>`
}'''
s=s[:start]+new_form+s[end:]
old="function ssExamSource(tur,id){return arr(tur==='deneme'?'denemeSinavlari':'testSonuclari').find(x=>x.id===id)||null}"
new="function ssExamSource(tur,id){if(tur==='deneme'){const base=arr('denemeSinavlari').find(x=>x.id===id)||null,r=ssDenemeResult(id);if(!base)return r;return r?{...base,sonuclar:Array.isArray(r.sonuclar)?r.sonuclar:(base.sonuclar||[])}:base}return arr('testSonuclari').find(x=>x.id===id)||null}"
if old not in s: raise SystemExit('ssExamSource target not found')
s=s.replace(old,new,1)
start=s.index('function _ssBindModal(){')
end=s.index('\n\nfunction render(){',start)
new_bind=r'''function _ssBindModal(){
  const modal=document.querySelector('[data-ss-modal]');if(!modal)return;
  const kapatFn=()=>modal.remove();
  modal.querySelectorAll('[data-ss-modal-kapat]').forEach(b=>b.addEventListener('click',kapatFn));
  modal.addEventListener('click',e=>{if(e.target===modal)kapatFn()});
  const select=modal.querySelector('select[name="ogrenciId"]'),nameInput=modal.querySelector('input[name="ogrenciAdi"]'),numberInput=modal.querySelector('input[name="ogrenciNo"]'),classInput=modal.querySelector('input[name="sinif"]');
  const syncStudent=()=>{const id=select?.value||'',v=id?arr('veliler').find(x=>x.id===id):null;for(const input of [nameInput,numberInput,classInput])if(input)input.readOnly=!!v;if(v){if(nameInput){nameInput.value=v.ogrenciAdi||'';nameInput.dataset.ssAuto='1'}if(numberInput){numberInput.value=ssStudentNumber(v);numberInput.dataset.ssAuto='1'}if(classInput){classInput.value=ssStudentClass(v);classInput.dataset.ssAuto='1'}}else for(const input of [nameInput,numberInput,classInput])if(input?.dataset.ssAuto==='1'){input.value='';delete input.dataset.ssAuto}};
  select?.addEventListener('change',syncStudent);syncStudent();
  modal.querySelectorAll('.ss-d-input,.ss-y-input').forEach(inp=>inp.addEventListener('input',()=>{const ders=inp.dataset.ders,row=modal.querySelector(`[data-ders="${CSS.escape(ders)}"].ss-net`);if(!row)return;const d=parseFloat(modal.querySelector(`.ss-d-input[data-ders="${CSS.escape(ders)}"]`)?.value)||0,y=parseFloat(modal.querySelector(`.ss-y-input[data-ders="${CSS.escape(ders)}"]`)?.value)||0;row.textContent=ssNetHesapla(d,y,null).toFixed(2)}));
  modal.querySelector('#ssResultForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const form=e.currentTarget,fd=new FormData(form),sinavId=String(fd.get('sinavId')||''),tur=String(fd.get('tur')||''),vid=String(fd.get('ogrenciId')||''),selected=vid?arr('veliler').find(x=>x.id===vid):null;
    const ogrenciAdi=String(selected?.ogrenciAdi||fd.get('ogrenciAdi')||'').trim(),ogrenciNo=selected?ssStudentNumber(selected):String(fd.get('ogrenciNo')||'').trim(),sinif=selected?ssStudentClass(selected):String(fd.get('sinif')||'').trim();
    if(!ogrenciAdi){toast?.('Öğrenci adı zorunlu');return}
    const exam=ssExamSource(tur,sinavId)||{},existing=tur==='deneme'?(ssDenemeResult(sinavId)||{}):exam,sonuclar=[...(existing.sonuclar||[])],dersler=exam.dersler?.length?exam.dersler:DERSLER_LGS.map(ad=>({ad})),dersSonuclari={};
    dersler.forEach(d=>{dersSonuclari[d.ad]={dogru:Number(fd.get(`d_${d.ad}`))||0,yanlis:Number(fd.get(`y_${d.ad}`))||0}});
    sonuclar.push({ogrenciAdi,ogrenciNo,sinif,ogrenciId:vid,dersSonuclari});
    const svc=tur==='deneme'?globalThis.DenemeSonuclariService:globalThis.TestSonuclariService,save=form.querySelector('[data-ss-save]');
    if(!svc?.sinavKaydet){toast?.('Sonuç servisi hazır değil.');return}
    if(save){save.disabled=true;save.textContent='Kaydediliyor…'}
    try{const payload=tur==='deneme'?{sinavId,ad:exam.ad||'',tarih:exam.tarih||'',sinifSeviyesi:exam.sinifSeviyesi||'',yanlisKatsayisi:exam.yanlisKatsayisi,dersler:exam.dersler||[],sonuclar}:{sonuclar};await svc.sinavKaydet(sinavId,payload);toast?.('Sonuç eklendi.');modal.remove();render()}catch(err){toast?.(err?.message||'Kaydedilemedi');if(save){save.disabled=false;save.textContent='Kaydet'}}
  });
}'''
s=s[:start]+new_bind+s[end:]
p.write_text(s,encoding='utf-8')

# 4) Duty report: back table type down slightly, preserve requested title/tasks/signature.
p=Path('css/design-system.css'); s=p.read_text(encoding='utf-8')
s=s.replace('--ka-duty-head-font:14pt;--ka-duty-cell-font:12pt;--ka-duty-task-font:11pt','--ka-duty-head-font:12pt;--ka-duty-cell-font:10pt;--ka-duty-task-font:11pt',1)
s=s.replace('font-size:14pt!important;line-height:.94!important;font-weight:800!important;text-align:center!important;white-space:nowrap!important}.ka-report .ka-duty-report-table td','font-size:12pt!important;line-height:.94!important;font-weight:800!important;text-align:center!important;white-space:nowrap!important}.ka-report .ka-duty-report-table td',1)
s=s.replace('font-size:12pt!important;line-height:.94!important;vertical-align:middle!important;text-align:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.ka-report .ka-duty-report-table tbody','font-size:10pt!important;line-height:.94!important;vertical-align:middle!important;text-align:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.ka-report .ka-duty-report-table tbody',1)
p.write_text(s,encoding='utf-8')

# 5) Cache-bust changed resources to v876.
replace_once('index.html','css/design-system.css?v=875','css/design-system.css?v=876','index css version')
replace_once('index.html','js/core/shell-ui.js?v=869','js/core/shell-ui.js?v=876','index shell version')
replace_once('index.html','js/app-loader.js?v=873','js/app-loader.js?v=876','index loader version')
replace_once('js/app-loader.js',"'js/modules/academic.js?v=838'","'js/modules/academic.js?v=876'",'academic loader version')
replace_once('js/app-loader.js',"define('settings',['js/modules/settings.js']);","define('settings',['js/modules/settings.js?v=876']);",'settings loader version')
p=Path('service-worker.js'); s=p.read_text(encoding='utf-8')
for old,new,label in [
    ("const CACHE_ADI='oy-cache-v875';","const CACHE_ADI='oy-cache-v876';",'sw cache'),
    ("'./css/design-system.css?v=875'","'./css/design-system.css?v=876'",'sw css'),
    ("'./js/app-loader.js?v=873'","'./js/app-loader.js?v=876'",'sw loader'),
    ("'./js/modules/academic.js?v=838'","'./js/modules/academic.js?v=876'",'sw academic'),
    ("'./js/core/shell-ui.js?v=869'","'./js/core/shell-ui.js?v=876'",'sw shell')]:
    if old not in s: raise SystemExit(f'{label} target not found')
    s=s.replace(old,new,1)
if "'./js/modules/settings.js?v=876'" not in s:
    s=s.replace("'./js/modules/settings.js',","'./js/modules/settings.js?v=876','./js/modules/settings.js',",1)
p.write_text(s,encoding='utf-8')

# 6) Update focused existing tests.
p=Path('tests/duty-report-full-parity.test.js'); s=p.read_text(encoding='utf-8')
old="assert(css.includes('--ka-duty-head-font:14pt;--ka-duty-cell-font:12pt;--ka-duty-task-font:11pt')&&css.includes('.ka-duty-report-table th{padding:.12mm .45mm!important')&&css.includes('font-size:14pt!important')&&css.includes('.ka-duty-report-table td{padding:.06mm .42mm!important')&&css.includes('font-size:12pt!important'),'Sütun başlıkları 14 punto, tablo verileri 12 punto olmalı.');"
new="assert(css.includes('--ka-duty-head-font:12pt;--ka-duty-cell-font:10pt;--ka-duty-task-font:11pt')&&css.includes('.ka-duty-report-table th{padding:.12mm .45mm!important')&&css.includes('font-size:12pt!important')&&css.includes('.ka-duty-report-table td{padding:.06mm .42mm!important')&&css.includes('font-size:10pt!important'),'Sütun başlıkları 12 punto, tablo verileri 10 punto olmalı; 14 kural 11 punto kalmalı.');"
if old not in s: raise SystemExit('duty test font target not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')

p=Path('tests/academic-separate-pages.test.js'); s=p.read_text(encoding='utf-8')
if "js/modules/academic.js?v=838" in s:s=s.replace("js/modules/academic.js?v=838","js/modules/academic.js?v=876")
p.write_text(s,encoding='utf-8')

# Permanent regression for this package.
Path('tests/teacher-access-results-duty.test.js').write_text(r'''const fs=require('fs');
const assert=require('assert');
const settings=fs.readFileSync('js/modules/settings.js','utf8');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const academic=fs.readFileSync('js/modules/academic.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
assert(settings.includes('function settingsTeacherAccount()')&&settings.includes('if(settingsTeacherAccount())return false'),'Öğretmen okul/sosyal bağlantılarını servis seviyesinde değiştirememeli.');
assert(settings.includes("settingsTeacherUser()&&['users','statistics','roles'].includes(tab)"),'Öğretmen Kullanıcı İşlemleri, İstatistik ve Roller ayarlarını görememeli.');
assert(settings.includes('function socialRow(x={},editable=false)')&&settings.includes("links.map(x=>socialRow(x,edit))")&&settings.includes("if(!window.OkulBilgileriService?._duzenleyebilir?.())"),'Sosyal bağlantılar öğretmende salt okunur olmalı ve kaldırma işlemi korunmalı.');
assert(shell.includes("function teacherMenuGroupAllowed(group){return !isTeacherUser()||group?.key!=='management'}")&&shell.includes('teacherMenuGroupAllowed(g)&&visibleItems(g).length'),'Personel İşleri ana menü kartı öğretmen rolünde görünmemeli.');
assert(shell.includes("global.AKTIF_ROL||global.AppStore?.get?.('session.role')")&&shell.includes("n.includes('öğretmen')||n.includes('ogretmen')"),'Öğretmen tespiti yalnız öğretmen ID bağlantısına bağlı kalmamalı.');
for(const token of ["kaydet:(id,v)=>device().set(type,collection,id,v,{merge:true})",'sinavKaydet(id,v)',"function ssDenemeResult(id)","function ssStudentClass(v={})","function ssStudentNumber(v={})",'name="ogrenciNo"',"querySelectorAll('[data-ss-modal-kapat]')", "select?.addEventListener('change',syncStudent)", 'await svc.sinavKaydet(sinavId,payload)'])assert(academic.includes(token),`Deneme sonucu düzeltmesi eksik: ${token}`);
assert(css.includes('--ka-duty-head-font:12pt;--ka-duty-cell-font:10pt;--ka-duty-task-font:11pt')&&css.includes('font-size:18pt!important')&&css.includes('.ka-duty-report-signature')&&css.includes('font-size:11pt!important'),'Nöbet raporu tablo fontu küçülürken başlık/kural/imza boyutları korunmalı.');
assert(index.includes('css/design-system.css?v=876')&&index.includes('js/core/shell-ui.js?v=876')&&index.includes('js/app-loader.js?v=876'),'Değişen kabuk kaynakları v876 ile cache-bust edilmeli.');
assert(loader.includes("'js/modules/academic.js?v=876'")&&loader.includes("define('settings',['js/modules/settings.js?v=876'])"),'Değişen lazy modüller v876 ile yüklenmeli.');
assert(sw.includes("const CACHE_ADI='oy-cache-v876'")&&sw.includes('./js/modules/settings.js?v=876'),'Service Worker v876 kaynaklarını önbelleğe almalı.');
for(const src of [settings,shell,academic])assert(!src.includes('firebase.firestore(')&&!src.includes('db.collection('),'UI doğrudan Firestore kullanmamalı.');
console.log('Öğretmen erişimi + deneme sonuç girişi + nöbet raporu font sözleşmesi başarılı.');
''',encoding='utf-8')

print('Teacher access, results entry and duty report patch prepared.')
