/* Koruk Asistan — AppNav
 * Arayüz rolü (Öğretmen / İdareci), alt sekmeler, araç kataloğu, Okul bölümleri, favoriler ve sayfa kapıları TEK burada durur.
 *   • Rol, Öğretmenler listesindeki unvandan seçilir ("Müdür", "Müdür Yardımcısı", "İdari Personel" → İdareci; diğer → Öğretmen).
 *     Unvanı olmayan hesapta admin / yönetici rolü İdareci, diğerleri Öğretmen sayılır. Hem yöneten hem ders veren kişi
 *     Ben sayfasından diğer arayüze geçebilir (tercih bu cihazda hatırlanır).
 *   • Rol yalnız hangi arayüzün gösterileceğini belirler. Hangi sayfaya girilebileceğini PermissionService belirler;
 *     burada yalnız öğretmen hesabı için gizli sayfalar (TEACHER_HIDDEN) ve yönetici-yalnız araçlar süzülür.
 *   • Katalogdaki her araç gerçek bir ShellUI rotasına (route + page) bağlıdır; ekranları nav-pages.js çizer.
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
Object.assign(GLYPHS,{'aylik-yonetim':'📆','evrak-belge':'📝','ogretmenden-istenecekler':'📑','personel-isleri':'🧑‍💼','diploma-isleri':'🎓','dokumanlar':'📁','sinav-isleri':'📝'});
const GROUP_GLYPHS={sinifim:'👥',sinav:'📝',planlar:'📅',tutanak:'✏️',veli:'💬',etkinlik:'🚌',belgeler:'📁',yonetim:'🗂️',evrak:'📁',mali:'💵',guvenlik:'🛡️',ogrenci:'🎓',projeler:'🌱',tasima:'🚌',diger:'🧩'};
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
const TEACHER_HIDDEN=new Set(['committees:home','documents:evrak','management:staff','management:evrak-teslim','management:evrak-teblig-donem1','management:evrak-teblig-sonu','management:tasks','management:diploma-request','management:diploma-response','tools:form-kulup','tools:form-zumre','tools:form-sok','tools:form-bep','tools:form-rehberlik','tools:form-maarif','tools:form-diger','transport:services','transport:','food:audit']);
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
 ['form-bep','Yıllık Planlar & BEP Planları','doc','green','Yıllık ders planı ve BEP','tools','form-bep'],
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
 ['bep','BEP Hazırlama','book','green','Bireyselleştirilmiş eğitim programı hazırlama','bep','home'],
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

/* ── araç grupları (Öğretmen: Araçlar · İdareci: Yönetim) ── */
const GROUPS={
  ogretmen:[
    {key:'sinifim',label:'Sınıfım',icon:'users',tone:'blue',ids:['student-attendance','classes','students','student-list']},
    {key:'sinav',label:'Sınav ve not',icon:'clip',tone:'violet',ids:['written','trial','results','grades','homework','rubric','project']},
    {key:'planlar',label:'Planlar',icon:'calendar',tone:'green',docs:true,ids:['plans','form-maarif','form-bep']},
    {key:'tutanak',label:'Tutanak ve dilekçe',icon:'pen',tone:'orange',docs:true,ids:['tutanak','dilekce-olustur','form-sok','form-zumre','form-diger']},
    {key:'veli',label:'Veli ve rehberlik',icon:'users',tone:'rose',docs:true,ids:['parentmeeting','form-rehberlik']},
    {key:'etkinlik',label:'Etkinlik ve gezi',icon:'bus',tone:'cyan',docs:true,ids:['gezi','form-kulup','form-belirli','dilimiz']},
    {key:'belgeler',label:'Belgeler',icon:'folder',tone:'amber',docs:true,ids:['documents','pdf-images','pdf-merge','checklists','school-age-calculator']}
  ],
  idareci:[
    {key:'yonetim',label:'Genel Yönetim',icon:'briefcase',tone:'blue',blurb:'Aylık yönetim akışı, yıllık planlar, raporlar, öğretmen listeleri',ids:['aylik-yonetim','plans','reports','teacher-list-builder']},
    {key:'evrak',label:'Evrak - Özlük',icon:'inbox',tone:'amber',docs:true,blurb:'Evrak takibi, personel işleri, öğretmenden istenecekler',ids:['evrak','evrak-belge','ogretmenden-istenecekler','personel-isleri','diploma-isleri','dokumanlar','folder-spine']},
    {key:'mali',label:'Mali İşler',icon:'wallet',tone:'green',blurb:'Maaş ve ödeme işlemleri',ids:['payroll']},
    {key:'guvenlik',label:'Güvenlik - Denetim',icon:'shield',tone:'rose',blurb:'Denetim formları',ids:['food-audit']},
    {key:'sinav',label:'Sınav - Kurs',icon:'clip',tone:'violet',blurb:'Yazılı, deneme ve sonuç listeleri',ids:['sinav-isleri']},
    {key:'ogrenci',label:'Öğrenci İşleri',icon:'users',tone:'blue',blurb:'Yoklama, öğrenci listeleri, kayıt yaşı',ids:['student-attendance','student-list','school-age-calculator']},
    {key:'projeler',label:'Projeler',icon:'star',tone:'cyan',blurb:'Okul projeleri ve çalışmaları',ids:['dilimiz']},
    {key:'tasima',label:'Taşıma - Pansiyon - Gezi',icon:'bus',tone:'cyan',blurb:'Gezi planı ve izin belgeleri',ids:['gezi']},
    {key:'diger',label:'Diğer Araçlar',icon:'grid',tone:'slate',blurb:'Kontrol listeleri',ids:['checklists']}
  ]
};
/* ── çok sayfalı araçlar: bir kart, kendi içinde sayfalara ayrılır; sayfalar yukarıdaki TOOLS satırlarıdır ── */
const SUITES={
  'aylik-yonetim':{label:'Aylık Yönetim Akışı',tone:'amber',sub:'Ay ay yapılması gereken idari işler',pages:['monthflow','tasks']},
  'evrak-belge':{label:'Evrak - Belge Oluştur',tone:'orange',sub:'Tutanak, dilekçe ve diğer okul evrakları',pages:['tutanak','dilekce-olustur','form-diger']},
  'ogretmenden-istenecekler':{label:'Öğretmenden İstenecekler',tone:'amber',sub:'İstenecek evraklar, imza çizelgesi ve tebliğ yazıları',pages:['evrak-teslim','evrak-teblig-donem1','evrak-teblig-sonu']},
  'personel-isleri':{label:'Personel İşleri',tone:'indigo',sub:'İzin, puantaj, devamsızlık, dilekçe ve tebliğ',pages:['staff-leaves','puantaj','dilekce-izin','attendance','teblig']},
  'diploma-isleri':{label:'Diploma İşlemleri',tone:'indigo',sub:'Diploma kayıt talebi ve okul cevabı',pages:['diploma-request','diploma-response']},
  'dokumanlar':{label:'Dökümanlar ve PDF',tone:'amber',sub:'Okul dökümanları, resimden PDF, PDF birleştirme',pages:['documents','pdf-images','pdf-merge']},
  'sinav-isleri':{label:'Sınav İşleri',tone:'violet',sub:'Yazılı sınav, deneme ve sonuç listeleri',pages:['written','trial','results']}
};
const HUB={ogretmen:{title:'Öğretmen araçları',search:'Araç ara: plan, tutanak, dilekçe'},idareci:{title:'İdareci araçları',search:'Araç ara: izin, evrak, tebliğ, rapor'}};

/* ── Okul sekmesi bölümleri ── */
const SCHOOL={
  ogretmen:[
    {key:'iletisim',label:'İletişim',ids:['messages','news','announcements','polls']},
    {key:'hayat',label:'Okul hayatı',ids:['teachers','food','map','bus-seats']}
  ],
  idareci:[
    {key:'bilgi',label:'Okul bilgileri',ids:['school-info','holiday','acad-calendar']},
    {key:'kisiler',label:'Kişiler',ids:['teachers','staff','students','classes']},
    {key:'programlar',label:'Programlar',ids:['schedule','duty','meeting-schedule']},
    {key:'kurullar',label:'Kurullar',ids:['committees','form-sok','form-zumre','form-kulup']},
    {key:'hizmetler',label:'Hizmetler',ids:['transport','bus-seats','map','food']}
  ]
};
const COMM_IDS=['messages','news','announcements','polls','calendar'];                 /* İdareci › İletişim */
const PROGRAM_IDS=['schedule','duty','calendar','acad-calendar','meeting-schedule'];   /* Öğretmen › Programım (kendi programının altındaki satırlar) */

/* ── sekmeler ── */
const TABS={
  ogretmen:[{key:'home',label:'Bugün',icon:'home'},{key:'program',label:'Programım',icon:'calendar'},{key:'tools',label:'Araçlar',icon:'grid'},{key:'school',label:'Okul',icon:'school'},{key:'me',label:'Ben',icon:'user'}],
  idareci:[{key:'home',label:'Özet',icon:'chart'},{key:'school',label:'Okul',icon:'school'},{key:'tools',label:'Yönetim',icon:'briefcase'},{key:'comm',label:'İletişim',icon:'message'},{key:'me',label:'Ben',icon:'user'}]
};
const tabs=(r=role())=>TABS[r].map(t=>({...t}));
const tab=(key,r=role())=>TABS[r].find(t=>t.key===key)||null;
const homeTab=()=>'home';

/* ── katalog okuma ── */
function suiteTool(id){
  const s=SUITES[id];if(!s)return null;
  const pages=s.pages.map(x=>TOOLS[x]).filter(toolAllowed);
  if(!pages.length)return null;
  return{id,label:s.label,icon:pages[0].icon,glyph:glyphOf(id),tone:s.tone,sub:s.sub,route:pages[0].route,page:pages[0].page,suite:true,pages};
}
const tool=id=>TOOLS[id]||suiteTool(id);
function toolAllowed(t){return!!t&&canOpen(t.route,t.page)&&(!t.need||t.need()===true)}
const visible=ids=>ids.map(tool).filter(toolAllowed);
function groups(r=role()){
  return GROUPS[r].map(g=>({...g,glyph:GROUP_GLYPHS[g.key]||'📁',tools:visible(g.ids)})).filter(g=>g.tools.length);
}
function group(key,r=role()){return groups(r).find(g=>g.key===key)||null}
function school(r=role()){
  return SCHOOL[r].map(s=>({...s,tools:visible(s.ids)})).filter(s=>s.tools.length);
}
const comm=()=>visible(COMM_IDS);
const programLinks=()=>visible(PROGRAM_IDS);
const hub=(r=role())=>({...HUB[r]});
function toolCount(r=role()){return groups(r).reduce((n,g)=>n+g.tools.length,0)}
function findTool(route,page=''){
  route=String(route||'');page=String(page||'');
  return Object.values(TOOLS).find(t=>t.route===route&&t.page===page)||null;
}
function suiteOf(route,page=''){
  const t=findTool(route,page);
  if(!t||role()!=='idareci')return null;
  const id=Object.keys(SUITES).find(k=>SUITES[k].pages.includes(t.id)&&GROUPS.idareci.some(g=>g.ids.includes(k)));
  const s=id?suiteTool(id):null;
  return s&&s.pages.length>1?s:null;
}
const groupOf=(r,toolId)=>GROUPS[r].find(g=>g.ids.some(id=>id===toolId||SUITES[id]?.pages.includes(toolId)))||null;
function tabOf(route,page=''){
  route=String(route||'');page=String(page||'');
  if(route==='dashboard'&&!page)return 'home';
  if(route==='settings'&&['school','holiday','lesson-hours'].includes(page)&&role()==='idareci')return 'school';
  if(route==='settings'||route==='dashboard')return 'me';
  const t=findTool(route,page);
  if(!t)return 'tools';
  const r=role();
  if(r==='idareci'){
    if(SCHOOL.idareci.some(s=>s.ids.includes(t.id)))return 'school';
    if(COMM_IDS.includes(t.id))return 'comm';
    if(t.id==='notes')return 'me';
    return 'tools';
  }
  if(PROGRAM_IDS.includes(t.id)||t.id==='notes')return 'program';
  if(SCHOOL.ogretmen.some(s=>s.ids.includes(t.id)))return 'school';
  return 'tools';
}

/* Bir aracın geri dönüş sayfası: aynı öncelikle tabOf gibi (Okul › İletişim/Programım › Ben › araç grubu). */
function parentOf(route,page=''){
  const t=findTool(route,page);
  if(!t)return route==='settings'||route==='dashboard'?'me':'';
  const r=role();
  if(r==='idareci'){
    if(SCHOOL.idareci.some(s=>s.ids.includes(t.id)))return 'school';
    if(COMM_IDS.includes(t.id))return 'comm';
  }else{
    if(PROGRAM_IDS.includes(t.id))return 'program';
    if(SCHOOL.ogretmen.some(s=>s.ids.includes(t.id)))return 'school';
  }
  if(['notes','settings','guide','about'].includes(t.id))return r==='ogretmen'&&t.id==='notes'?'program':'me';
  const g=groupOf(r,t.id);
  return g?`tools:${g.key}`:'tools';
}

/* ── favoriler (cihaza özel) ── */
const FAV_DEFAULT={ogretmen:['student-attendance','written','tutanak','plans'],idareci:[]};
const favKey=r=>`ka-nav-fav:${user().uid||'-'}:${r}`;
function favIds(r=role()){
  let list=null;
  try{const raw=store.get(favKey(r));if(raw!==null){const v=JSON.parse(raw);if(Array.isArray(v))list=v}}catch(_){}
  const known=GROUPS[r].flatMap(g=>g.ids);
  return (list||FAV_DEFAULT[r]).filter(id=>known.includes(id));
}
function favorites(r=role()){return favIds(r).map(tool).filter(toolAllowed)}
const isFavorite=(id,r=role())=>favIds(r).includes(id);
function toggleFavorite(id,r=role()){
  const cur=favIds(r),next=cur.includes(id)?cur.filter(x=>x!==id):[...cur,id];
  store.set(favKey(r),JSON.stringify(next));
  try{global.dispatchEvent(new CustomEvent('koruk:nav-favorites-changed',{detail:{id,role:r}}))}catch(_){}
  return next.includes(id);
}

/* ── arama (üst arama kutusu ve Araçlar sayfası) ── */
function search(q,r=role()){
  const n=fold(q);
  if(!n)return[];
  const seen=new Set(),out=[];
  const add=(t,where)=>{if(!t||seen.has(t.id)||!toolAllowed(t))return;if(fold(`${t.label} ${t.sub} ${(t.pages||[]).map(p=>p.label).join(' ')}`).includes(n)){seen.add(t.id);out.push({...t,where})}};
  GROUPS[r].forEach(g=>g.ids.forEach(id=>add(tool(id),g.label)));
  SCHOOL[r].forEach(s=>s.ids.forEach(id=>add(tool(id),s.label)));
  (r==='idareci'?COMM_IDS:[]).forEach(id=>add(tool(id),'İletişim'));
  ['settings','guide','about','notes'].forEach(id=>add(tool(id),'Ben'));
  return out;
}

/* ── web yan menüsü: sekmeler; Araçlar sekmesinin altında grupları ── */
function webMenu(){
  const r=role();
  return tabs(r).map(t=>({key:t.key,label:t.label,icon:t.icon,children:t.key==='tools'?groups(r).map(g=>({key:`tools:${g.key}`,label:g.label,glyph:g.glyph,count:g.tools.length})):[]}));
}

global.AppNav={
  icon,ICONS,glyph,glyphOf,markGlyphs,role,derivedRole,setRole,canSwitch,otherRole,roleLabel,allowedRole,linkedTeacher,
  tabs,tab,homeTab,tabOf,parentOf,hub,groups,group,school,comm,programLinks,toolCount,tool,findTool,suiteOf,
  favorites,isFavorite,toggleFavorite,search,webMenu,
  pageAllowed,moduleAllowed,canOpen,isTeacherUser,toolAllowed,TEACHER_HIDDEN
};
})(window);
