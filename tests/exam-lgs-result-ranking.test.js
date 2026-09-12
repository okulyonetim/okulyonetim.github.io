const fs=require('fs');
const assert=require('assert');
const academic=fs.readFileSync('js/modules/academic.js','utf8');
const people=fs.readFileSync('js/modules/people.js','utf8');
const details=fs.readFileSync('js/core/student-exam-result-details.js','utf8');
const design=fs.readFileSync('css/design-system.css','utf8');
const firebaseInit=fs.readFileSync('js/firebase-init.js','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

for(const token of ['function ssLgsPuani(sonuc,sinav)','function ssSiraliSonuclar(sinav,tur)','bp-ap',"deneme?'<th>Sıra</th>':''","deneme?'<th>LGS Puanı</th>':''",'sonuclar=ssSiraliSonuclar(s,tur)','ssLgsPuani(r,s)']){
  assert(academic.includes(token),`Canonical deneme LGS/sıralama sözleşmesi eksik: ${token}`);
}
assert(academic.includes('sonuc?.lgsPuani??sonuc?.lgsPuan')&&academic.includes("ssPuanTuru(sonuc,sinav)==='LGS'?sonuc?.puan:null"),'LGS puanı OMR alias alanlarından ve LGS puan fallbackinden okunmalı.');
assert(academic.includes("const deneme=tur==='deneme',sonuclar=ssSiraliSonuclar(sinav,tur)"),'Deneme sonuç ekranı LGS puan sırasını canonical olarak kullanmalı.');
assert(academic.includes('ka-results-lgs')&&academic.includes('${ssFmt(score)}'),'Deneme sonuç ekranında LGS puanı görünür olmalı.');
assert(academic.includes('<td>${index+1}</td>')&&academic.includes('<th>Sıra</th>'),'Rapor sıra numarasını basmalı.');
assert(academic.includes('<th>LGS Puanı</th>')&&academic.includes('ssLgsPuani(r,s)'),'Rapor LGS puanını basmalı.');
assert(people.includes('Math.round(direct*100)/100'),'Öğrenci profilinde ham floating net gösterilmemeli.');
assert(people.includes('function resultScore(entry)')&&people.includes('r.lgsPuani??r.lgsPuan'),'Öğrenci profili gerçek LGS puanını okumalı.');
assert(people.includes('<small>SON LGS</small>')&&people.includes('resultFmt(lastNet)'),'Öğrenci profil özetinde formatlı net ve son LGS bulunmalı.');
assert(people.includes("label=isTrial?'LGS':'Net'"),'Deneme kartı LGS puanını ana metrik olarak göstermeli.');
assert(details.includes('function scoreOf(r,exam)')&&details.includes('r?.puanTuru||exam?.puanTuru'),'Detay kartı sınav düzeyi LGS puan türünü de kullanmalı.');
assert(details.includes("if(e.type==='Deneme'||score!=null)stats.push(statCard('LGS PUANI'"),'Deneme profil kartında puan yoksa bile LGS alanı görünmeli.');
assert(details.includes('ka-student-result-ranks')&&details.includes("function enhanceAcademic(scope){const table=scope.querySelector('.ka-results-table')"),'Profil sonucu derli toplu olmalı ve Academic LGS sütunlarının canonical sahibi korunmalı.');
assert(!details.includes("th.textContent='LGS Puanı';head.appendChild(th)"),'Yardımcı katman Academic LGS sütununu ikinci kez eklememeli.');
assert(!details.includes('document.createElement(\'style\')')&&!details.includes('function installStyles()'),'Öğrenci sonuç yardımcı JS runtime style üretmemeli.');
assert(design.includes('STUDENT EXAM RESULT DETAILS — CANONICAL')&&design.includes('.ka-student-result-ranks'),'Öğrenci sonuç stilleri merkezi design-system içinde yaşamalı.');
assert(firebaseInit.includes('student-exam-result-details.js?v=925'),'Detay runtime cache-bust edilmeli.');
assert(loader.includes('js/modules/academic.js?v=881'),'Academic runtime cache-bust edilmeli.');
assert(index.includes('js/app-loader.js?v=899'),'App loader cache-bust edilmeli.');
assert(sw.includes("const CACHE_ADI='oy-cache-v928';")&&sw.includes('student-exam-result-details.js?v=925')&&sw.includes('academic.js?v=881'),'PWA cache yeni LGS sonuç runtimeını taşımalı.');
console.log('Deneme LGS görünümü, sıralama ve rapor sözleşmesi başarılı.');
