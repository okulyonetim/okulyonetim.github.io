/* Koruk Asistan — AppNav
 * Arayüz rolü (Öğretmen / İdareci), araç kataloğu, menü düzeni (alt menü yuvaları, menüler, sık kullanılanlar) ve sayfa kapıları TEK burada durur.
 *   • Rol, Öğretmenler listesindeki unvandan seçilir ("Müdür", "Müdür Yardımcısı", "İdari Personel" → İdareci; diğer → Öğretmen).
 *     Unvanı olmayan hesapta admin / yönetici rolü İdareci, diğerleri Öğretmen sayılır. Hem yöneten hem ders veren kişi
 *     Ben sayfasından diğer arayüze geçebilir (tercih bu cihazda hatırlanır).
 *   • Rol yalnız hangi varsayılan menü düzeninin geleceğini belirler. Hangi sayfaya girilebileceğini PermissionService belirler;
 *     burada yalnız öğretmen hesabı için gizli sayfalar (TEACHER_HIDDEN) ve yönetici-yalnız araçlar süzülür.
 *   • Katalogdaki her araç tek bir sayfadır ve gerçek bir ShellUI rotasına (route + page) bağlıdır; ekranları nav-pages.js çizer,
 *     menü düzenleme ekranlarını nav-editor.js çizer. Alt menü yuvaları, menüler ve içindeki sayfaları kullanıcı seçer.
 */
(function(global){
'use strict';
if(global.AppNav)return;
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const user=()=>global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{};
const fold=v=>String(v||'').trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i');
const store={get(k){try{return localStorage.getItem(k)}catch(_){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(_){}},del(k){try{localStorage.removeItem(k)}catch(_){}}};

/* ── simgeler (çizgi, 24×24) ── */
const ICONS={
  home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  school:'<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-5h6v5M12 11h.01"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
  message:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  clip:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  doc:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
  folder:'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.6 3.9A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
  bus:'<path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM2 12h20M6 18v2M18 18v2"/>',
  food:'<path d="M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zm0 0v7"/>',
  shield:'<path d="M20 13c0 5-3.5 7.5-7.7 8.9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/>',
  sliders:'<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  book:'<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  chart:'<path d="M3 3v18h18M8 17V9M13 17V5M18 17v-6"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  mega:'<path d="m3 11 18-5v12L3 14zM11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  pen:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  award:'<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/>',
  star:'<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l6.9-1z"/>',
  swap:'<path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  note:'<path d="M15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z"/><path d="M15 3v6h6"/>',
  map:'<path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2zM9 3v16M15 5v16"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  chev:'<path d="m9 18 6-6-6-6"/>',
  chevd:'<path d="m6 9 6 6 6-6"/>',
  chevu:'<path d="m18 15-6-6-6 6"/>',
  back:'<path d="M19 12H5M12 19l-7-7 7-7"/>',
  sparkle:'<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>',
  briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 13h20"/>',
  ruler:'<path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4zM7.5 10.5l2 2M10.5 7.5l2 2M13.5 4.5l2 2M4.5 13.5l2 2"/>',
  wallet:'<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><path d="M16 13h.01"/>',
  inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
  trophy:'<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1.1 1.2C7.8 18.7 7 20.2 7 22M14 14.7V17c0 .6.5 1 1.1 1.2 1.1.5 1.9 2 1.9 3.8M18 2H6v7a6 6 0 0 0 12 0z"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
};
function icon(name,size=20,sw=2){
  return `<svg class="ka-ni" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.grid}</svg>`;
}

/* ── araç simgeleri: eski menüdeki emoji; bilinenler CSS maskesiyle çizgi simgeye çevrilir (css: [data-ka-glyph]), bilinmeyenler emoji kalır ── */
const GLYPHS={
  'student-attendance':'☑️','classes':'🏫','students':'🎓','student-list':'📋','written':'☑️','trial':'🧪','results':'🏅','grades':'📊','homework':'✅','rubric':'📊','project':'📏',
  'plans':'📋','form-maarif':'🏅','form-bep':'📋','tutanak':'📝','dilekce-olustur':'📄','form-sok':'🛡️','form-zumre':'👥','form-diger':'📁','parentmeeting':'💬','form-rehberlik':'🧭',
  'gezi':'🚌','form-kulup':'♡','form-belirli':'📅','dilimiz':'🗣️','documents':'📁','pdf-images':'🖼️','pdf-merge':'📑','checklists':'📋','school-age-calculator':'🎯','folder-spine':'🗂️',
  'staff-leaves':'📋','puantaj':'🕘','dilekce-izin':'📄','payroll':'💵','diploma-request':'🎓','diploma-response':'🏫','teblig':'🔔','attendance':'📅','evrak':'📄','evrak-teslim':'✍️','evrak-teblig-donem1':'📨','evrak-teblig-sonu':'📬','tasks':'🕘','monthflow':'📆',
  'reports':'📊','food-audit':'📝','teacher-list-builder':'📋','school-info':'🏫','holiday':'☀️','acad-calendar':'📅','teachers':'👩‍🏫','staff':'🧑‍💼','schedule':'📅','duty':'🛡️','meeting-schedule':'📅',
  'committees':'🏛️','transport':'🚌','bus-seats':'💺','map':'🗺️','food':'🍽️','messages':'💬','news':'📰','announcements':'📣','polls':'📋','calendar':'📆','notes':'📒','settings':'⚙️','guide':'📖','about':'ℹ️'
};
GLYPHS['bep-hazirla']='📝';
GLYPHS['idareci-pano']='🖥️';
GLYPHS['tymm-olcek']='📏';
const glyphOf=id=>GLYPHS[id]||'📌';
function glyph(g,cls=''){return `<span class="ka-glyph${cls?' '+cls:''}" data-ka-glyph="${String(g).replace(/"/g,'&quot;')}" aria-hidden="true">${g}</span>`}
/* Bilinen emojiye CSS bir çizgi simge (--ic) verir; maskelenebilenler .has-ic alır, bilinmeyenler emoji kalır. */
function markGlyphs(root=document){
  root.querySelectorAll?.('.ka-glyph[data-ka-glyph]').forEach(el=>{let known=false;try{known=getComputedStyle(el).getPropertyValue('--ic').trim().length>0}catch(_){}el.classList.toggle('has-ic',known)});
}

/* ── rol ── */
const VIEW_KEY='ka-nav-view';
const viewKey=()=>`${VIEW_KEY}:${user().uid||'-'}`;
function linkedTeacher(){
  const u=user(),id=u.bagliOgretmenId||u.ogretmenId||'';
  return id?arr('ogretmenler').find(x=>String(x.id)===String(id))||null:null;
}
function titleText(){return fold(linkedTeacher()?.unvan||user().unvan||'')}
function canManage(){
  const P=global.PermissionService;
  return user().admin===true||P?.isManager?.()===true||P?.grantsModule?.('management','read')===true;
}
function derivedRole(){
  const title=titleText();
  if(title)return /mudur|idari/.test(title)?'idareci':'ogretmen';
  return user().admin===true||global.PermissionService?.isManager?.()===true?'idareci':'ogretmen';
}
function allowedRole(r){return r==='ogretmen'||(r==='idareci'&&(derivedRole()==='idareci'||canManage()))}
function role(){
  const d=derivedRole(),p=store.get(viewKey());
  return (p==='ogretmen'||p==='idareci')&&p!==d&&allowedRole(p)?p:d;
}
function canSwitch(){return role()==='idareci'||allowedRole('idareci')}
function otherRole(){return role()==='idareci'?'ogretmen':'idareci'}
function setRole(next){
  if(next!=='ogretmen'&&next!=='idareci')return false;
  if(!allowedRole(next))return false;
  if(next===derivedRole())store.del(viewKey());else store.set(viewKey(),next);
  try{global.dispatchEvent(new CustomEvent('koruk:nav-role-changed',{detail:{role:next}}))}catch(_){}
  return true;
}
const roleLabel=r=>r==='idareci'?'İdareci':'Öğretmen';

/* ── sayfa kapıları ── */
/* Öğretmen hesabına (PermissionService.isTeacherAccount) kapalı sayfalar; rol arayüzünden bağımsızdır. */
const TEACHER_HIDDEN=new Set(['idareci-pano:','committees:home','documents:evrak','management:staff','management:evrak-teslim','management:evrak-teblig-donem1','management:evrak-teblig-sonu','management:tasks','management:diploma-request','management:diploma-response','tools:form-kulup','tools:form-zumre','tools:form-sok','tools:form-bep','tools:form-rehberlik','tools:form-maarif','tools:form-diger','transport:services','transport:','food:audit']);
const isTeacherUser=()=>global.PermissionService?.isTeacherAccount?.()===true;
const pageAllowed=(name,page='')=>!isTeacherUser()||!TEACHER_HIDDEN.has(`${name}:${page||''}`);
function moduleAllowed(name){
  const meta=global.AppConfig?.module?.(name);
  return meta?.visible!==false&&global.PermissionService?.moduleLevel?.(name)!=='hidden';
}
const canOpen=(name,page='')=>moduleAllowed(name)&&pageAllowed(name,page)&&global.RolePermissionBridge?.allowedRoute?.(name,page||'')!==false;
const adminOrManager=()=>user().admin===true||global.PermissionService?.isManager?.()===true;

/* ── araç kataloğu: [id, ad, simge, ton, alt yazı, rota, sayfa, ek koşul] ── */
const TOOLS={};
[
 ['student-attendance','Öğrenci Yoklama','clip','blue','Sınıf yoklamasını al ve kaydet','tools','student-attendance'],
 ['classes','Sınıflar','school','blue','Sınıflar ve sınıf öğretmenleri','people','classes'],
 ['students','Öğrenciler','users','blue','Öğrenci listesi ve bilgileri','people','students'],
 ['student-list','Öğrenci Listesi Oluşturucu','doc','blue','Sınıf ve öğrenci listesi hazırla','tools','student-list'],
 ['written','Yazılı Sınavlar','edit','violet','Yazılı sınav planı ve tutanağı','academic','written'],
 ['trial','Deneme Sınavları','clip','violet','Deneme sınavı ve süre sayacı','academic','trial'],
 ['results','Deneme ve Test Sonuçları','chart','violet','Sonuç listeleri ve sıralamalar','academic','results'],
 ['grades','Not Çizelgesi','chart','violet','Dönem not çizelgesi','tools','grades'],
 ['homework','Ödev Takip Çizelgesi','check','violet','Ödev teslim takibi','tools','homework'],
 ['rubric','Ders Et. Kat. Puan Dağıtımı','ruler','violet','Ders etkinliği katılım puanı','tools','rubric'],
 ['project','Proje Değerlendirme Ölçeği','ruler','violet','Proje puanlama ölçeği','tools','project'],
 ['plans','Yıllık Plan','calendar','green','Yıllık planlar ve haftalık kazanımlar','academic','plans'],
 ['form-maarif','Maarif Model','award','green','Maarif Model aylık raporları','tools','form-maarif'],
 ['form-bep','Yıllık ve BEP Plan Takibi','doc','green','Öğretmenlerin plan teslim takibi','tools','form-bep'],
 ['bep-hazirla','BEP Hazırla','pen','green','Öğrenci BEP dosyası hazırla ve yazdır','bep-hazirla'],
 ['tymm-olcek','TYMM İlkokul Ölçekleri','ruler','blue','1–4. sınıf süreç değerlendirme gözlem formları','tymm-olcek'],
 ['idareci-pano','İdareci Pano','chart','indigo','Okulun anlık durumu: nöbet, izin, sınıflar, takvim','idareci-pano'],
 ['tutanak','Tutanak Hazırla','pen','orange','Toplantı ve olay tutanakları','tutanak'],
 ['dilekce-olustur','Dilekçe Oluştur','doc','orange','Hazır dilekçe örnekleri','dilekcehazirla'],
 ['form-sok','ŞÖK','users','orange','Şube öğretmenler kurulu','tools','form-sok'],
 ['form-zumre','Zümre','book','orange','Zümre toplantı tutanağı','tools','form-zumre'],
 ['form-diger','Diğer Evraklar','folder','orange','Diğer okul evrakları','tools','form-diger'],
 ['parentmeeting','Veli Görüşme Formu','users','rose','Veli görüşmesini kaydet ve yazdır','parentmeeting'],
 ['form-rehberlik','Rehberlik','shield','rose','Rehberlik çalışma raporları','tools','form-rehberlik'],
 ['gezi','Gezi Planı','bus','cyan','Gezi planı ve izin belgeleri','gezi'],
 ['form-kulup','Sosyal Kulüpler','star','cyan','Sosyal kulüp çalışmaları','tools','form-kulup'],
 ['form-belirli','Belirli Gün ve Haftalar','calendar','cyan','Belirli gün ve hafta etkinlikleri','tools','form-belirli'],
 ['dilimiz','Dilimizin Zenginlikleri','book','cyan','Atasözü ve deyim çalışması','documents','dilimiz'],
 ['documents','Dökümanlar','folder','amber','Okul dökümanları','documents'],
 ['pdf-images','Resimden PDF Oluştur','doc','amber','Fotoğraflardan PDF yap','documents','pdf-images'],
 ['pdf-merge','PDF Birleştir','doc','amber','PDF dosyalarını tek dosyada topla','documents','pdf-merge'],
 ['checklists','Kontrol Listeleri','check','amber','Kontrol listeleri ve tamamlama','tools','checklists'],
 ['school-age-calculator','İlkokula Başlama Yaşı','calendar','amber','Kayıt yaşı durumunu hesapla','documents','school-age-calculator'],
 ['folder-spine','Klasör Sırtlığı Oluşturucu','folder','amber','Sırtlık tasarla, seri üret, yazdır','documents','folder-spine',adminOrManager],
 ['staff-leaves','İzin İşlemleri','calendar','indigo','İzin kayıtları ve talepleri','management','staff-leaves'],
 ['puantaj','Puantaj & İmza Sirküsü','clock','indigo','Aylık puantaj ve imza','management','puantaj'],
 ['dilekce-izin','Dilekçe & İzinler','doc','indigo','İzin ve dilekçe formları','management','dilekce'],
 ['payroll','Maaş Değişikliği','wallet','indigo','Maaş değişikliği bildirimi','payroll'],
 ['diploma-request','Diploma Kayıt Talep Dilekçesi','doc','indigo','Diploma kayıt talebi','management','diploma-request'],
 ['diploma-response','Diploma Okul Dilekçesi','school','indigo','Okuldan diploma cevabı','management','diploma-response'],
 ['teblig','Tebliğ-Tebellüğ İmza Sirküsü','pen','indigo','Tebliğ ve tebellüğ imzaları','documents','teblig'],
 ['attendance','Devamsızlık Çizelgesi','calendar','indigo','Personel devamsızlık çizelgesi','tools','attendance'],
 ['evrak','Evrak Takibi','inbox','amber','Gelen ve giden evrak','documents','evrak'],
 ['evrak-teslim','Teslim İmza Çizelgesi','check','amber','Öğretmenden istenecek evraklar ve imza çizelgesi','management','evrak-teslim'],
 ['evrak-teblig-donem1','Dönem Sonu Tebliğ Yazısı','doc','amber','Dönem sonu evrak teslimi tebliği','management','evrak-teblig-donem1'],
 ['evrak-teblig-sonu','Sene Sonu Tebliğ Yazısı','doc','amber','Sene sonu evrak teslimi tebliği','management','evrak-teblig-sonu'],
 ['tasks','Aylık İşler','clock','amber','Aylık işler ve görevler','management','tasks'],
 ['monthflow','Aylık Yönetim Akışı','calendar','amber','Ay ay yönetim iş akışı','monthflow'],
 ['reports','Okul Raporları','chart','rose','Okul raporları ve listeler','reports','home'],
 ['food-audit','Yemek Denetim Formu','food','rose','Yemek denetim kaydı','food','audit'],
 ['teacher-list-builder','Öğretmen Liste Oluşturucu','doc','rose','Öğretmen listesi hazırla','management','teacher-list-builder'],
 ['school-info','Okul bilgileri ve kurulum','school','indigo','Okul adı, kademeler, tatiller','settings','school'],
 ['holiday','Tatil günleri','calendar','indigo','Tatil takvimi','settings','holiday'],
 ['acad-calendar','Akademik takvim','calendar','indigo','Akademik takvim','academic','calendar'],
 ['teachers','Öğretmenler','users','blue','Öğretmen kadrosu','people','teachers'],
 ['staff','Personeller','briefcase','blue','Personel kadrosu','management','staff'],
 ['schedule','Ders Programı','calendar','green','Okulun ders programı','academic','schedule'],
 ['duty','Nöbet Programı','shield','green','Nöbet çizelgesi','management','duty'],
 ['meeting-schedule','Toplantı Çizelgesi','users','green','Toplantı ve kurul çizelgesi','management','meeting-schedule'],
 ['committees','Kurul ve Komisyonlar','shield','orange','Kurul ve komisyon görevleri','committees','home'],
 ['transport','Taşıma İşlemleri','bus','cyan','Servisler ve güzergâhlar','transport','services'],
 ['bus-seats','Servis Oturma','bus','cyan','Servis oturma planı','transport','busSeats'],
 ['map','Harita','map','cyan','Okul ve servis haritası','tools','map'],
 ['food','Yemek Menüsü','food','cyan','Günlük, haftalık, aylık menü','food','daily'],
 ['messages','Mesajlaşma','message','rose','Kişi ve grup mesajları','communication','messages'],
 ['news','Haberler','mega','rose','Okul haberleri','communication','news'],
 ['announcements','Duyurular','mega','rose','Duyurular ve okundu bilgisi','communication','announcements'],
 ['polls','Anketler','chart','rose','Anket ve oylamalar','communication','polls'],
 ['calendar','Takvim','calendar','green','Takvim ve hatırlatıcılar','communication','calendar'],
 ['notes','Notlarım','note','amber','Kişisel notlar','communication','notes'],
 ['settings','Ayarlar','sliders','slate','Okul, kullanıcılar, hesap','settings'],
 ['guide','Kullanım kılavuzu','book','green','Adım adım kullanım','dashboard','guide'],
 ['about','Uygulama hakkında','sparkle','violet','Sürüm ve bilgiler','dashboard','about']
].forEach(([id,label,ic,tone,sub,route,page='',need])=>{TOOLS[id]={id,label,icon:ic,glyph:glyphOf(id),tone,sub,route,page,need}});

/* ── menü düzeni ──
 * Alt menü (5 yuva), menüler ve sık kullanılanlar kullanıcıya aittir: varsayılan rol başına gelir, kullanıcı değiştirince
 * kendi kopyası bu cihazda saklanır ve hesabına eşitlenir (oy_kullaniciTercihleri). Katalogdaki her araç tek bir sayfadır;
 * çok sayfalı ya da sekmeli araç yoktur, her sayfa istenen menüye ve alt menüye ayrı eklenir. */
const MENU_ICONS=['grid','folder','doc','pen','users','school','calendar','clip','chart','shield','bus','food','star','award','book','inbox','wallet','briefcase','message','mega','clock','map'];
const MENU_TONES=['blue','violet','green','orange','rose','cyan','amber','indigo','slate'];
const BAR_SLOTS=5,MENU_MAX=24,MENU_ITEMS_MAX=60,MENU_NAME_MAX=32;
const BAR_FIXED=['home','program','tools','me'];                  /* yerleşik sayfalar; geri kalan yuvalar menü ya da tek sayfadır */
const M=(id,ad,icon,tone,ids)=>({id,ad,icon,tone,ids});
const DEFAULT_LAYOUT={
  ogretmen:{
    bar:['home','program','tools','menu:okul','me'],
    menus:[
      M('sinifim','Sınıfım','users','blue',['student-attendance','classes','students','student-list']),
      M('sinav','Sınav ve not','clip','violet',['written','trial','results','grades','homework','rubric','project','tymm-olcek']),
      M('planlar','Planlar','calendar','green',['plans','form-maarif','bep-hazirla','form-bep']),
      M('tutanak','Tutanak ve dilekçe','pen','orange',['tutanak','dilekce-olustur','form-sok','form-zumre','form-diger']),
      M('veli','Veli ve rehberlik','message','rose',['parentmeeting','form-rehberlik']),
      M('etkinlik','Etkinlik ve gezi','bus','cyan',['gezi','form-kulup','form-belirli','dilimiz']),
      M('belgeler','Belgeler','folder','amber',['documents','pdf-images','pdf-merge','checklists','school-age-calculator']),
      M('programim','Program ve takvim','clock','green',['schedule','duty','calendar','acad-calendar','meeting-schedule','notes']),
      M('okul','Okul','school','indigo',['messages','news','announcements','polls','teachers','food','map','bus-seats'])
    ],
    fav:['student-attendance','written','tutanak','plans']
  },
  idareci:{
    bar:['home','menu:okul','tools','tool:idareci-pano','me'],
    menus:[
      M('okul','Okul','school','indigo',['idareci-pano','school-info','holiday','acad-calendar','teachers','staff','students','classes']),
      M('evrak','Evrak ve yazışma','inbox','amber',['evrak','tutanak','dilekce-olustur','form-diger','evrak-teslim','evrak-teblig-donem1','evrak-teblig-sonu','teblig']),
      M('belgeler','Belgeler ve PDF','folder','amber',['documents','pdf-images','pdf-merge','folder-spine']),
      M('personel','Personel ve özlük','briefcase','indigo',['staff-leaves','puantaj','dilekce-izin','attendance','payroll','diploma-request','diploma-response']),
      M('ogrenci','Öğrenci ve sınav','users','blue',['student-attendance','student-list','school-age-calculator','written','trial','results','parentmeeting','form-rehberlik','bep-hazirla','tymm-olcek']),
      M('plan','Plan, rapor ve denetim','chart','green',['monthflow','tasks','plans','form-bep','reports','teacher-list-builder','checklists','food-audit']),
      M('programlar','Programlar ve kurullar','calendar','cyan',['schedule','duty','meeting-schedule','committees','form-sok','form-zumre','notes']),
      M('etkinlik','Etkinlik ve hizmetler','bus','rose',['gezi','form-kulup','form-belirli','dilimiz','transport','bus-seats','food','map']),
      M('iletisim','İletişim','message','rose',['messages','news','announcements','polls','calendar'])
    ],
    fav:[]
  }
};
/* Eski sürümde çok sayfalı araç olan kimlikler: yalnız eski sık kullanılan kayıtlarını ilk sayfaya taşımak için. */
const LEGACY_IDS={'aylik-yonetim':'monthflow','evrak-belge':'tutanak','ogretmenden-istenecekler':'evrak-teslim','personel-isleri':'staff-leaves','diploma-isleri':'diploma-request','dokumanlar':'documents','sinav-isleri':'written'};
/* Arama eş anlamlıları: ad ve alt yazıda geçmeyen ama insanların yazdığı sözcükler. */
const KEYWORDS={
  'student-attendance':'yoklama devamsızlık yok yazma','students':'öğrenci liste kayıt','student-list':'öğrenci sınıf listesi çizelge','classes':'şube sınıf rehber',
  'written':'yazılı sınav ölçme','trial':'deneme sınav sayaç','results':'sonuç sıralama','grades':'not karne puan','homework':'ödev','rubric':'puan katılım rubrik','project':'proje performans ölçek',
  'plans':'yıllık plan ünite kazanım word','form-maarif':'maarif model rapor','form-bep':'bep plan takip teslim çizelge yıllık plan','idareci-pano':'pano dijital panosu müdür idareci nöbet izin gelmeyen şu an sınıf tv ekran terfi','bep-hazirla':'bep bireyselleştirilmiş eğitim programı özel eğitim kaynaştırma rapor öğrenci','tymm-olcek':'tymm ölçek gözlem formu ilkokul süreç değerlendirme maarif model puan karne e-okul 1 2 3 4 sınıf',
  'tutanak':'tutanak toplantı olay','dilekce-olustur':'dilekçe örnek','form-sok':'şök şube öğretmenler kurulu','form-zumre':'zümre toplantı','form-diger':'evrak form',
  'parentmeeting':'veli görüşme','form-rehberlik':'rehberlik çalışma','gezi':'gezi izin belge','form-kulup':'kulüp sosyal etkinlik','form-belirli':'belirli gün hafta anma','dilimiz':'atasözü deyim türkçe',
  'documents':'döküman dosya arşiv','pdf-images':'resim pdf foto','pdf-merge':'pdf birleştir','checklists':'kontrol liste','school-age-calculator':'kayıt yaş ilkokul başlama','folder-spine':'klasör sırtlık dosya etiket',
  'staff-leaves':'izin rapor mazeret','puantaj':'puantaj imza sirküsü çizelge','dilekce-izin':'izin dilekçe','payroll':'maaş ek ders bordro','diploma-request':'diploma kayıt talep','diploma-response':'diploma okul cevap',
  'teblig':'tebliğ tebellüğ imza','attendance':'devamsızlık personel çizelge','evrak':'evrak gelen giden takip','evrak-teslim':'evrak teslim imza öğretmenden istenecek','evrak-teblig-donem1':'tebliğ yazı dönem sonu','evrak-teblig-sonu':'tebliğ yazı sene sonu',
  'tasks':'aylık iş görev','monthflow':'aylık yönetim akış iş takvim','reports':'rapor liste','food-audit':'yemek denetim','teacher-list-builder':'öğretmen liste',
  'school-info':'okul bilgi kurulum ayar müdür','holiday':'tatil','acad-calendar':'akademik takvim eğitim öğretim yılı','teachers':'öğretmen kadro','staff':'personel kadro','schedule':'ders programı','duty':'nöbet','meeting-schedule':'toplantı kurul çizelge',
  'committees':'kurul komisyon','transport':'servis taşıma güzergah','bus-seats':'servis oturma','map':'harita','food':'yemek menü','messages':'mesaj yazışma','news':'haber','announcements':'duyuru','polls':'anket oy','calendar':'takvim hatırlatıcı','notes':'not','settings':'ayar kullanıcı hesap','guide':'yardım kılavuz','about':'sürüm'
};
const clone=v=>JSON.parse(JSON.stringify(v));
const deviceKey=r=>`ka-nav-layout:${user().uid||'-'}:${r}`;
const legacyFavKey=r=>`ka-nav-fav:${user().uid||'-'}:${r}`;
let overrideCache={};
const cacheKey=r=>`${user().uid||'-'}:${r}`;
function readOverride(r){
  const k=cacheKey(r);
  if(k in overrideCache)return overrideCache[k];
  let v=null;
  try{const raw=store.get(deviceKey(r));if(raw){const o=JSON.parse(raw);if(o&&typeof o==='object'&&!Array.isArray(o))v=o}}catch(_){}
  return overrideCache[k]=v;
}
function cleanIds(list){
  const seen=new Set();
  return (Array.isArray(list)?list:[]).map(x=>LEGACY_IDS[x]||x).filter(id=>typeof id==='string'&&TOOLS[id]&&!seen.has(id)&&seen.add(id)).slice(0,MENU_ITEMS_MAX);
}
function cleanMenus(list){
  const seen=new Set(),out=[];
  for(const m of Array.isArray(list)?list:[]){
    const id=String(m?.id||'').toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,32),ad=String(m?.ad||'').trim().slice(0,MENU_NAME_MAX);
    if(!id||!ad||seen.has(id))continue;
    seen.add(id);
    out.push({id,ad,icon:MENU_ICONS.includes(m.icon)?m.icon:'grid',tone:MENU_TONES.includes(m.tone)?m.tone:'slate',ids:cleanIds(m.ids)});
    if(out.length>=MENU_MAX)break;
  }
  return out;
}
const barKeyValid=(key,menus)=>typeof key==='string'&&(BAR_FIXED.includes(key)||(key.startsWith('menu:')&&menus.some(m=>m.id===key.slice(5)))||(key.startsWith('tool:')&&!!TOOLS[key.slice(5)]));
function cleanBar(list,menus,r){
  const seen=new Set(),out=[];
  const add=k=>{if(out.length<BAR_SLOTS&&barKeyValid(k,menus)&&!seen.has(k)){seen.add(k);out.push(k)}};
  (Array.isArray(list)?list:[]).forEach(add);
  DEFAULT_LAYOUT[r].bar.forEach(add);
  ['home','tools','me'].forEach(add);
  if(!out.includes('me'))out[BAR_SLOTS-1]='me';
  return out;
}
function legacyFav(r){
  try{const raw=store.get(legacyFavKey(r));if(raw!==null){const v=JSON.parse(raw);if(Array.isArray(v))return cleanIds(v)}}catch(_){}
  return null;
}
/* Alt menüye sonradan eklenen varsayılan yuvalar: kayıtlı (özelleştirilmiş) çubuğa bir kez, son değiştirilebilir yuvanın yerine konur.
 * Ana sayfa, Araçlar ve Ben yerinde kalır; kullanıcı sonra menü düzenlemeden dilediğini değiştirebilir (sunulan kayıt tekrar eklemeyi önler). */
const BAR_YENI=[{id:'idareci-pano',rol:'idareci',key:'tool:idareci-pano'}];
const barSunulan=(r,extra=[])=>[...new Set([...extra,...BAR_YENI.filter(x=>x.rol===r).map(x=>x.id)])];
function migrateBar(r,o){
  if(!o?.bar)return o;
  const done=Array.isArray(o.sunulan)?o.sunulan:[],todo=BAR_YENI.filter(x=>x.rol===r&&!done.includes(x.id));
  if(!todo.length)return o;
  const bar=cleanBar(o.bar,o.menus?cleanMenus(o.menus):DEFAULT_LAYOUT[r].menus,r);
  for(const x of todo){
    if(bar.includes(x.key)||!TOOLS[x.id])continue;
    let i=-1;
    for(let j=bar.length-1;j>=0;j--)if(!['home','tools','me'].includes(bar[j])){i=j;break}
    if(i>=0)bar[i]=x.key;
  }
  writeOverride(r,{bar,sunulan:barSunulan(r,done)},{silent:true});
  return readOverride(r);
}
/* Düzenlenebilir düzen: yalnız kullanıcının değiştirdiği parçalar saklanır; kalanı varsayılandan gelir. */
function layoutRaw(r=role()){
  const o=migrateBar(r,readOverride(r)),def=DEFAULT_LAYOUT[r],menus=o?.menus?cleanMenus(o.menus):clone(def.menus);
  return{bar:cleanBar(o?.bar||def.bar,menus,r),menus,fav:o?.fav?cleanIds(o.fav):(legacyFav(r)||clone(def.fav)),custom:!!(o&&(o.bar||o.menus))};
}
function emitLayoutChanged(r){try{global.dispatchEvent(new CustomEvent('koruk:nav-layout-changed',{detail:{role:r}}))}catch(_){}}
let pushTimers={};
function pushOverride(r){
  clearTimeout(pushTimers[r]);
  pushTimers[r]=setTimeout(()=>{const o=readOverride(r);global.KaPrefs?.remoteSet?.({[`menuDuzeni_${r}`]:o?JSON.stringify(o):'',[`menuDuzeniT_${r}`]:o?.t||Date.now()})},800);
}
function writeOverride(r,patch,{reset=false,silent=false}={}){
  const k=cacheKey(r);
  if(reset){store.del(deviceKey(r));overrideCache[k]=null;store.del(legacyFavKey(r));global.KaPrefs?.remoteSet?.({[`menuDuzeni_${r}`]:'',[`menuDuzeniT_${r}`]:Date.now()})}
  else{
    const cur=readOverride(r)||{},next={...cur,...patch,t:Date.now()};
    store.set(deviceKey(r),JSON.stringify(next));overrideCache[k]=next;pushOverride(r);
  }
  if(!silent)emitLayoutChanged(r);
}
/* Düzeni kaydeder: tek yer, tüm düzenleme buradan geçer. */
function saveLayout(next,r=role(),{silent=false}={}){
  const menus=cleanMenus(next?.menus);
  writeOverride(r,{menus,bar:cleanBar(next?.bar,menus,r),fav:cleanIds(next?.fav??layoutRaw(r).fav),sunulan:barSunulan(r,readOverride(r)?.sunulan)},{silent});
  return layoutRaw(r);
}
const resetLayout=(r=role())=>writeOverride(r,null,{reset:true});
/* Hesaba eşitleme: başka cihazdaki daha yeni düzen bu cihaza gelir; cihazdaki daha yeniyse hesaba gider. */
let pulledFor='';
function pullLayouts(){
  const uid=user().uid;
  if(!uid||pulledFor===uid)return;
  const g=global.KaPrefs?.remoteGet?.();
  if(!g)return;
  pulledFor=uid;
  g.then(x=>{
    if(!x)return;
    for(const r of ['ogretmen','idareci']){
      const rt=Number(x[`menuDuzeniT_${r}`])||0,local=readOverride(r),lt=local?.t||0;
      if(rt>lt){
        let rem=null;try{rem=x[`menuDuzeni_${r}`]?JSON.parse(x[`menuDuzeni_${r}`]):null}catch(_){continue}
        if(rem&&typeof rem==='object')store.set(deviceKey(r),JSON.stringify(rem));else store.del(deviceKey(r));
        overrideCache[cacheKey(r)]=undefined;delete overrideCache[cacheKey(r)];
        emitLayoutChanged(r);
      }else if(lt>rt)pushOverride(r);
    }
  }).catch(()=>{});
}
try{global.addEventListener('koruk:app-ready',pullLayouts)}catch(_){}

/* ── çözülmüş düzen (yetkiye göre süzülür) ── */
const tool=id=>TOOLS[id]||null;
function toolAllowed(t){return!!t&&canOpen(t.route,t.page)&&(!t.need||t.need()===true)}
const visible=ids=>ids.map(tool).filter(toolAllowed);
function menus(r=role()){
  return layoutRaw(r).menus.map(m=>({...m,tools:visible(m.ids)})).filter(m=>m.tools.length);
}
function menu(id,r=role()){return menus(r).find(m=>m.id===id)||null}
const TAB_LABEL={home:r=>r==='idareci'?'Özet':'Bugün',program:()=>'Programım',tools:()=>'Araçlar',me:()=>'Ben'};
const TAB_ICON={home:'home',program:'calendar',tools:'grid',me:'user'};
function barItem(key,r){
  if(BAR_FIXED.includes(key))return{key,label:TAB_LABEL[key](r),icon:TAB_ICON[key],kind:'page'};
  if(key.startsWith('menu:')){const m=menu(key.slice(5),r);return m?{key,label:m.ad,icon:m.icon,kind:'menu',tone:m.tone}:null}
  if(key.startsWith('tool:')){const t=tool(key.slice(5));return t&&toolAllowed(t)?{key,label:t.label,icon:t.icon,kind:'tool',tone:t.tone}:null}
  return null;
}
/* Alt menü: kullanıcının seçtiği 5 yuva. Yetkisiz ya da silinmiş bir yuva varsayılan değerle dolar; böylece çubuk hiç boş kalmaz. */
function tabs(r=role()){
  const raw=layoutRaw(r).bar,out=[],seen=new Set();
  const take=k=>{const it=barItem(k,r);if(it&&!seen.has(it.key)){seen.add(it.key);out.push(it);return true}return false};
  raw.forEach(take);
  for(const k of [...DEFAULT_LAYOUT[r].bar,'home','tools','me'])if(out.length<BAR_SLOTS)take(k);
  return out.slice(0,BAR_SLOTS);
}
const tab=(key,r=role())=>tabs(r).find(t=>t.key===key)||null;
const homeTab=()=>'home';
const hub=()=>({title:'Araçlar',search:'Sayfa ara: izin, evrak, tebliğ, BEP'});
const toolCount=(r=role())=>new Set(menus(r).flatMap(m=>m.tools.map(t=>t.id))).size;
function allTools(){
  return Object.values(TOOLS).filter(toolAllowed).sort((a,b)=>a.label.localeCompare(b.label,'tr'));
}
const inNoMenu=(r=role())=>{const used=new Set(layoutRaw(r).menus.flatMap(m=>m.ids));return allTools().filter(t=>!used.has(t.id))};
function findTool(route,page=''){
  route=String(route||'');page=String(page||'');
  return Object.values(TOOLS).find(t=>t.route===route&&t.page===page)||null;
}
const ME_TOOLS=new Set(['settings','guide','about','notes']);
/* Bir sayfa hangi alt menü yuvasını aydınlatır: önce tek başına eklenmişse onu, sonra onu içeren menüyü, sonra Araçlar'ı. */
function tabOf(route,page=''){
  route=String(route||'');page=String(page||'');
  if(route==='dashboard'&&!page)return 'home';
  const r=role(),keys=tabs(r).map(t=>t.key),t=findTool(route,page);
  if(t){
    if(keys.includes(`tool:${t.id}`))return `tool:${t.id}`;
    const m=layoutRaw(r).menus.find(x=>keys.includes(`menu:${x.id}`)&&x.ids.includes(t.id));
    if(m)return `menu:${m.id}`;
    if(ME_TOOLS.has(t.id))return 'me';
  }
  if(route==='settings'||route==='dashboard')return 'me';
  return keys.includes('tools')?'tools':'';
}
/* Bir aracın geri dönüş sayfası: alt menüdeki menü, yoksa ilk içeren menü, yoksa Araçlar / Ben. */
function parentOf(route,page=''){
  const t=findTool(route,page),r=role();
  if(!t)return route==='settings'||route==='dashboard'?'me':'';
  const all=layoutRaw(r).menus.filter(x=>x.ids.includes(t.id)&&menu(x.id,r)),keys=tabs(r).map(x=>x.key);
  const m=all.find(x=>keys.includes(`menu:${x.id}`))||all[0];
  if(m)return `menu:${m.id}`;
  return ME_TOOLS.has(t.id)?'me':'tools';
}
const menuNamesOf=(id,r)=>layoutRaw(r).menus.filter(m=>m.ids.includes(id)).map(m=>m.ad);
/* ── sık kullanılanlar ve son açılanlar ── */
const favIds=(r=role())=>layoutRaw(r).fav;
function favorites(r=role()){return favIds(r).map(tool).filter(toolAllowed)}
const isFavorite=(id,r=role())=>favIds(r).includes(id);
function toggleFavorite(id,r=role()){
  const cur=favIds(r),next=cur.includes(id)?cur.filter(x=>x!==id):[...cur,id];
  writeOverride(r,{fav:cleanIds(next)});
  try{global.dispatchEvent(new CustomEvent('koruk:nav-favorites-changed',{detail:{id,role:r}}))}catch(_){}
  return next.includes(id);
}
const RECENT_KEY='ka-nav-recent',RECENT_MAX=6;
function recentIds(){try{const v=JSON.parse(store.get(`${RECENT_KEY}:${user().uid||'-'}`)||'[]');return Array.isArray(v)?v.filter(id=>typeof id==='string'):[]}catch(_){return[]}}
function noteOpened(route,page=''){
  const t=findTool(route,page);if(!t||ME_TOOLS.has(t.id))return;
  store.set(`${RECENT_KEY}:${user().uid||'-'}`,JSON.stringify([t.id,...recentIds().filter(x=>x!==t.id)].slice(0,RECENT_MAX)));
}
const recent=(limit=3)=>recentIds().map(tool).filter(toolAllowed).slice(0,limit);

/* ── arama: tüm sayfalar, menü düzeninden bağımsız; sözcükler ad, alt yazı ve eş anlamlılarda aranır ── */
function search(q,r=role()){
  const n=fold(q);
  if(!n)return[];
  const words=n.split(/\s+/).filter(Boolean),rows=[],list=Object.values(TOOLS).filter(toolAllowed);
  /* Önce sözcük başı eşleşir ("izin" → İzin İşlemleri, Dilimizin değil); hiç sonuç yoksa sözcük içi eşleşmeye bakılır. */
  for(const mode of ['prefix','inside']){
    for(const t of list){
      const hay=fold(`${t.label} ${t.sub} ${KEYWORDS[t.id]||''}`),parts=hay.split(/[^a-z0-9]+/).filter(Boolean);
      const hit=mode==='prefix'?words.every(w=>parts.some(x=>x.startsWith(w))):words.every(w=>hay.includes(w));
      if(!hit)continue;
      const lab=fold(t.label);
      rows.push({t,score:lab===n?0:lab.startsWith(n)?1:words.every(w=>lab.includes(w))?2:3});
    }
    if(rows.length)break;
  }
  rows.sort((a,b)=>a.score-b.score||a.t.label.localeCompare(b.t.label,'tr'));
  return rows.map(({t})=>({...t,where:ME_TOOLS.has(t.id)&&!menuNamesOf(t.id,r).length?'Ben':(menuNamesOf(t.id,r).slice(0,2).join(' · ')||'Araçlar')}));
}

/* ── web yan menüsü: alt menüdeki yuvalar; Araçlar'ın altında alt menüde olmayan menüler ── */
function webMenu(){
  const r=role(),list=tabs(r),pinned=new Set(list.filter(t=>t.key.startsWith('menu:')).map(t=>t.key.slice(5)));
  return list.map(t=>({key:t.key,label:t.label,icon:t.icon,children:t.key==='tools'?menus(r).filter(m=>!pinned.has(m.id)).map(m=>({key:`menu:${m.id}`,label:m.ad,icon:m.icon,count:m.tools.length})):[]}));
}

global.AppNav={
  icon,ICONS,glyph,glyphOf,markGlyphs,role,derivedRole,setRole,canSwitch,otherRole,roleLabel,allowedRole,linkedTeacher,
  tabs,tab,homeTab,tabOf,parentOf,hub,menus,menu,toolCount,tool,findTool,allTools,inNoMenu,
  layoutRaw,saveLayout,resetLayout,defaultLayout:r=>clone(DEFAULT_LAYOUT[r]),MENU_ICONS,MENU_TONES,BAR_SLOTS,MENU_MAX,MENU_NAME_MAX,
  favorites,isFavorite,toggleFavorite,recent,noteOpened,search,webMenu,
  pageAllowed,moduleAllowed,canOpen,isTeacherUser,toolAllowed,TEACHER_HIDDEN
};
})(window);
