const fs=require('fs');
let dash=fs.readFileSync('js/modules/dashboard.js','utf8');
let css=fs.readFileSync('css/design-system.css','utf8');
let test=fs.readFileSync('tests/dashboard-card-routes-smoke.test.js','utf8');

function replaceBlock(src,startMarker,endMarker,replacement,label){
  const start=src.indexOf(startMarker);
  if(start<0)throw new Error('Eksik başlangıç: '+label);
  const end=src.indexOf(endMarker,start);
  if(end<0)throw new Error('Eksik bitiş: '+label);
  return src.slice(0,start)+replacement+'\n'+src.slice(end);
}

const stats=`function statsSection(){
  if(!cardVisible('stats'))return'';
  const school=arr('okulBilgileri').find(x=>x.id==='ayarlar')||arr('okulBilgileri')[0]||{};
  const teachers=arr('ogretmenler'),students=arr('veliler'),classes=arr('siniflar'),services=arr('servisler');
  const femaleTeachers=teachers.filter(x=>x.cinsiyet==='Kadın').length,maleTeachers=teachers.filter(x=>x.cinsiyet==='Erkek').length,unknownTeachers=Math.max(0,teachers.length-femaleTeachers-maleTeachers);
  const girls=students.filter(x=>x.cinsiyet==='Kız').length,boys=students.filter(x=>x.cinsiyet==='Erkek').length,unknownStudents=Math.max(0,students.length-girls-boys);
  const name=school.okulAdi||'KORUK İLK - ORTAOKULU',place=[school.ilce,school.il].filter(Boolean).join(' · ');
  const teacherUnknown=unknownTeachers?\`<span>Belirtilmedi <b>\${unknownTeachers}</b></span>\`:'';
  const studentUnknown=unknownStudents?\`<span>Belirtilmedi <b>\${unknownStudents}</b></span>\`:'';
  return section('Okul Özeti','▥','stats',\`<div class="ka-home-summary-intro"><div><small>OKUL</small><strong>\${esc(name)}</strong>\${place?\`<span>\${esc(place)}</span>\`:''}</div><span class="ka-badge">Bugün</span></div><div class="ka-home-stats">\${statCard('👥','Öğretmen',teachers.length)}\${statCard('🎓','Öğrenci',students.length)}\${statCard('🏫','Sınıf',classes.length)}\${statCard('🚌','Servis',services.length)}</div><div class="ka-home-demographics"><article><div><small>ÖĞRETMEN DAĞILIMI</small><strong>\${teachers.length} öğretmen</strong></div><div class="ka-home-demographic-pills"><span>👩 Kadın <b>\${femaleTeachers}</b></span><span>👨 Erkek <b>\${maleTeachers}</b></span>\${teacherUnknown}</div></article><article><div><small>ÖĞRENCİ DAĞILIMI</small><strong>\${students.length} öğrenci</strong></div><div class="ka-home-demographic-pills"><span>👧 Kız <b>\${girls}</b></span><span>👦 Erkek <b>\${boys}</b></span>\${studentUnknown}</div></article></div>\`)
}`;

dash=replaceBlock(dash,'function statsSection(){','function dutyRows(',stats,'statsSection');

if(!css.includes('DASHBOARD SCHOOL SUMMARY DEMOGRAPHICS')){
  css+=`\n\n/* DASHBOARD SCHOOL SUMMARY DEMOGRAPHICS */\n.ka-home-demographics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.ka-home-demographics>article{min-width:0;padding:12px;border:1px solid var(--ka-border);border-radius:16px;background:var(--ka-card-raised-bg);display:flex;flex-direction:column;gap:9px}.ka-home-demographics small{display:block;font-size:10px;font-weight:800;letter-spacing:.05em;color:var(--ka-muted)}.ka-home-demographics strong{font-size:14px}.ka-home-demographic-pills{display:flex;flex-wrap:wrap;gap:6px}.ka-home-demographic-pills>span{display:inline-flex;align-items:center;gap:5px;padding:6px 8px;border-radius:999px;background:var(--ka-primary-soft);font-size:11px;color:var(--ka-text)}.ka-home-demographic-pills b{font-size:12px}@media(max-width:430px){.ka-home-demographics{grid-template-columns:1fr}.ka-home-demographics>article{padding:11px}}\n`;
}

if(!test.includes('Okul Özeti gerçek öğretmen/öğrenci cinsiyet dağılımını')){
  test+='\nassert(dash.includes("x.cinsiyet===\'Kadın\'")&&dash.includes("x.cinsiyet===\'Erkek\'")&&dash.includes("x.cinsiyet===\'Kız\'"),\'Okul Özeti gerçek öğretmen/öğrenci cinsiyet dağılımını mevcut veri modelinden üretmeli.\');\nassert(dash.includes("unknownTeachers")&&dash.includes("unknownStudents")&&dash.includes("Belirtilmedi"),\'Eksik cinsiyet verileri toplamdan kaybolmamalı.\');\nassert(css.includes(\'DASHBOARD SCHOOL SUMMARY DEMOGRAPHICS\')&&css.includes(\'.ka-home-demographics\'),\'Okul Özeti demografi görünümü merkezi design-system içinde kalmalı.\');\n';
}

fs.writeFileSync('js/modules/dashboard.js',dash);
fs.writeFileSync('css/design-system.css',css);
fs.writeFileSync('tests/dashboard-card-routes-smoke.test.js',test);
console.log('Dashboard school summary demographics migration applied.');
