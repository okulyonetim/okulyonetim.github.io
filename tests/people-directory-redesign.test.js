/* Öğretmenler ve Öğrenciler yeniden tasarımı (people-directory.js + people-reports.js) sözleşme testi. */
const fs=require('fs');
const assert=require('assert');

const dir=fs.readFileSync('js/modules/people-directory.js','utf8');
const rep=fs.readFileSync('js/modules/people-reports.js','utf8');
const cmp=fs.readFileSync('js/modules/classes-mobile-parity.js','utf8');
const classic=fs.readFileSync('js/modules/people-classic-ui.js','utf8');
const imp=fs.readFileSync('js/modules/people-import.js','utf8');
const exam=fs.readFileSync('js/core/student-exam-result-details.js','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const css=fs.readFileSync('css/design-system-base.css','utf8');

new Function(dir);
new Function(rep);

/* Yükleme sırası: eski katmanlar altta, yeni raporlar ve görünüm sahibi en üstte */
const reg=loader.match(/define\('people',\[([^\]]+)\]\)/)?.[1]||'';
const at=n=>reg.indexOf(`'js/modules/${n}.js'`);
assert(at('people')>-1&&at('people')<at('people-import')&&at('people-import')<at('people-classic-ui')&&at('people-classic-ui')<at('classes-mobile-parity'),'Eski People katmanları sırası bozulmamalı.');
assert(at('classes-mobile-parity')<at('people-reports')&&at('people-reports')<at('people-directory'),'people-reports.js ve people-directory.js en son, bu sırayla yüklenmeli.');
assert(sw.includes("'./js/modules/people-reports.js'")&&sw.includes("'./js/modules/people-directory.js'"),'Yeni People dosyaları offline kabukta olmalı.');

/* Bağımlılıklardan biri yoksa modül kendini kurmamalı (önceki ekranlar çalışmaya devam eder) */
assert(dir.includes('if(!classesUi||!H||!R)return;'),'people-directory.js bağımlılık yoksa kurulmamalı.');
assert(dir.includes('global.PeopleDirectory=api;global.PeopleModule=api;'),'Yeni modül PeopleModule sahibi olmalı.');
assert(dir.includes("e.detail?.name==='people'"),'koruk:module-ready ile yeniden bağlanmalı.');
assert(dir.includes('data-people-module data-kpd'),'Kök işaretçi [data-people-module] korunmalı (AppLoader modül hazır kontrolü).');
for(const m of ['mount','openPage','render','unmount','back','openStudent','openTeacherDetail']) assert(new RegExp(`const api=\\{[^}]*\\b${m}\\b`).test(dir),`PeopleDirectory API eksik: ${m}`);
assert(dir.includes("classesUi.openPage('classes')"),'Sınıflar sayfası Sınıflar modülüne devredilmeli.');
assert(cmp.includes('PeopleDirectory.openStudent')&&cmp.includes('function openClass(')&&cmp.includes('openClass,'),'Sınıflar öğrenci detayını yeni ekrana devretmeli ve openClass sunmalı.');

/* Veri ve kurallar tek yerde: yazma servislerden, kurallar eski katmanın dışa açtığı yardımcılardan */
for(const api of ['global.OgretmenService.kaydet','global.SiniflarService.veliKaydet','global.SiniflarService.veliSil','global.SiniflarRepository.sinifGuncelle','global.BelgeDurumuService?.kontrolKaydet','global.PeopleImportUI?.importTeachers','global.PeopleImportUI?.printClubStudents','global.PeopleImportUI?.clubStudentModal','global.PeopleImportUI?.prepareTeacherNormData','R.teacher(','R.student(']) assert(dir.includes(api),`people-directory.js canonical kaynağı kullanmalı: ${api}`);
assert(/const helpers=\{[^}]*clubBelongsTo[^}]*relatedRows[^}]*reportRelated[^}]*docSummary[^}]*teacherOnLeave[^}]*dutyPlace[^}]*\};\s*const api=\{mount,openPage,render,unmount,back,helpers\}/.test(classic),'PeopleClassicUI.helpers dışa açılmalı.');
assert(/global\.PeopleImportUI=\{[^}]*teacherNormData[^}]*prepareTeacherNormData[^}]*clubStudents[^}]*canManageClub[^}]*\}/.test(imp),'PeopleImportUI norm / kulüp yardımcılarını dışa açmalı.');
assert(exam.includes('global.StudentExamResultMath=Object.freeze({')&&rep.includes('global.StudentExamResultMath'),'Sınav hesapları tek yerden (StudentExamResultMath) okunmalı.');
assert(!/\bdb\s*\.\s*collection\s*\(|firebase\.firestore/.test(dir+rep),'Görünüm Firestore\'a doğrudan inmemeli.');
assert(!/localStorage\s*\.\s*setItem\s*\(/.test(dir+rep),'Kalıcı localStorage yazımı olmamalı.');
assert(!/\bDeviceData\s*\./.test(dir+rep),'UI DeviceData katmanına doğrudan inmemeli.');
assert(!/createElement\(\s*['"]style['"]\s*\)/.test(dir+rep),'Runtime <style> üretilmemeli.');
assert(!/\sstyle\s*=\s*["'\\]/.test(dir.replace(/\.style\./g,''))&&!/\sstyle\s*=\s*["'\\]/.test(rep),'İşaretlemede satır içi style olmamalı; dinamik değerler data-* + applyDynamic ile verilmeli.');
assert(dir.includes('function applyDynamic(')&&dir.includes('data-kpd-w'),'Dinamik genişlikler applyDynamic ile uygulanmalı.');

/* Yetki: öğretmen kendi belge durumunu işaretleyemez; hassas alanlar yalnız sahibi / yönetici */
assert(dir.includes('const canDocStatus=o=>canEditTeachers()&&!own(o);')&&dir.includes('const canSensitive=o=>own(o)||canEditTeachers();'),'Belge durumu ve hassas alan yetkisi korunmalı.');
assert(dir.includes("err?.message==='kendi-belgesi'"),'Servis kendi-belgesi reddi kullanıcıya bildirilmeli.');
assert(dir.includes('canAddStudents=()=>canEditStudents()&&!isTeacherUser()'),'Öğretmen kullanıcı öğrenci ekleyip silememeli.');

/* Arama: IME / odak korunur, yalnız sonuç alanı yenilenir; belge onay kutusu için sonsuz yenileme yok */
assert(dir.includes('function refreshResults(')&&dir.includes('data-kpd-results')&&dir.includes("document.activeElement===s?refreshResults():render()"),'Arama yazarken yalnız sonuçlar yenilenmeli.');
assert(dir.includes('function prepareNorm(')&&dir.includes('if(normFor===id)return;'),'Norm planları bir kez istenmeli (çizimde yeniden isteme döngüsü olmamalı).');

/* Geri davranışı: önce pencere, sonra detay, sonra sınıf kaynağı */
assert(/function back\(\)\{[\s\S]*?\[data-kpd-modal\][\s\S]*?T\.id[\s\S]*?S\.id[\s\S]*?return false/.test(dir),'back() önce pencereyi, sonra detayı kapatmalı; liste ekranında false dönmeli.');
assert(dir.includes('classesUi.openClass(o.classId)'),'Sınıf detayından açılan öğrenci geri tuşuyla sınıfa dönmeli.');

/* Raporlar: tek ReportEngine, A4 gövdesi pr-doc içinde */
assert(rep.includes('global.ReportEngine.printReport')&&rep.includes('class="pr-doc"')&&rep.includes('pr-id')&&rep.includes('pr-kpis')&&rep.includes('pr-tt'),'Raporlar ReportEngine ve pr-* işaretlemesi kullanmalı.');
assert(rep.includes("global.PeopleReports={teacher,student,"),'PeopleReports API dışa açılmalı.');

/* CSS: kcl bölümünden sonra, WEB ARAYÜZÜ'nden önce; yalnız belirteç; kapsamlı seçiciler */
const kcl=css.indexOf('/* ===== SINIFLAR — liste ve detay (kcl-*)'),kpd=css.indexOf('/* ===== ÖĞRETMENLER & ÖĞRENCİLER — liste ve detay (kpd-*)'),web=css.indexOf('/* ===== WEB ARAYÜZÜ (≥1100px)'),pr=css.indexOf('/* ===== A4 RAPORLAR — öğretmen profili ve öğrenci bilgi raporu (.pr-*)');
assert(kcl>0&&kcl<kpd&&kpd<pr&&pr<web,'kpd-* ve .pr-* bölümleri kcl-* sonrasında, WEB ARAYÜZÜ öncesinde olmalı.');
/* Yıllık/BEP + Sosyal Kulüpler bölümü (kcz-*) pr-* sonrasında gelir; bu testin kapsamı dışındadır. */
const kczAt=css.indexOf('/* ===== YILLIK / BEP PLANLARI & SOSYAL KULÜPLER (kcz-*'),sec=css.slice(kpd,kczAt>pr?kczAt:web).replace(/\/\*[\s\S]*?\*\//g,'');
assert(!/#[0-9a-fA-F]{3,8}\b|\brgba?\(\s*\d/.test(sec),'Öğretmen/öğrenci stilinde sabit renk olmamalı; yalnız belirteçler.');
assert(!/margin[^;{}]*:\s*-\d/.test(sec),'Negatif px kenar boşluğu kullanılmamalı.');
const bad=[...sec.matchAll(/(^|\})\s*([^{}@]+)\{/gm)].map(m=>m[2].trim()).filter(s=>s&&!/^\d+%|^(from|to)$/.test(s)).map(s=>s.replace(/:is\([^)]*\)/g,'')).filter(s=>s.split(',').some(x=>!/^(html\[data-theme\] #v2ModuleRoot \.(kpd-|kcl-|pr-)|html\[data-theme\] \.kpd-form|\.ka-report \.pr-)/.test(x.trim())));
assert.deepStrictEqual(bad,[],'Seçiciler kapsamlı olmalı: '+bad.slice(0,3).join(' | '));
for(const c of ['.kpd-av','.kpd-next','.kpd-tag','.kpd-seg','.kpd-actions','.kpd-act','.kpd-tt','.kpd-norm','.kpd-rows','.kpd-docs-head','.kpd-check','.kpd-exam','.kpd-state','.pr-trend-line','.ka-report .pr-id','.ka-report .pr-kpis','.ka-report .pr-tt','.ka-report .pr-dl','.ka-report .pr-doc .bolum-baslik']) assert(sec.includes(c),`Stil eksik: ${c}`);
for(const t of ['accent','on-accent','ink','soft','cell','line','rule','muted','over','under','hair','bar','gap']) assert(new RegExp(`--ka-report-people-${t}:`).test(css),`Rapor belirteci eksik: --ka-report-people-${t}`);
const used=new Set([...sec.matchAll(/var\((--[a-z0-9-]+)/g)].map(m=>m[1]));
const missing=[...used].filter(n=>!new RegExp(`${n}\\s*:`).test(css));
assert.deepStrictEqual(missing,[],'Tanımsız CSS belirteci: '+missing.join(', '));

/* Sürümler */
assert(/design-system-base\.css\?v=(\d+)/.test(fs.readFileSync('css/design-system.css','utf8')),'design-system-base.css sürümü bulunmalı.');
assert(Number(sw.match(/CACHE_ADI='oy-cache-v(\d+)'/)?.[1]||0)>=1301,'Service worker cache sürümü bu yayından geri kalmamalı.');
console.log('people-directory-redesign: OK');
