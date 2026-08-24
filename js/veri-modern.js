/* Koruk Asistan — Veri sayfası kompakt modern UI. Mevcut import fonksiyonlarını ve veri modelini değiştirmez. */
(function(){
'use strict';
if(window.__KORUK_VERI_MODERN__)return;window.__KORUK_VERI_MODERN__=true;
const mobil=()=>window.matchMedia('(max-width:1023px)').matches;
function btn(label,onclick,primary){return `<button type="button" class="veri-btn${primary?' primary':''}" onclick="${onclick}">${label}</button>`}
function item(icon,title,desc,actions,extra){return `<div class="veri-item"><div class="veri-item-main"><div class="veri-item-title"><span>${icon}</span><span>${title}</span></div><div class="veri-item-desc">${desc}</div></div><div class="veri-actions">${actions}</div>${extra||''}</div>`}
function group(icon,title,sub,body,open,advanced){return `<details class="veri-group${advanced?' veri-advanced':''}" ${open?'open':''}><summary><span class="veri-group-icon">${icon}</span><span class="veri-group-title"><b>${title}</b><small>${sub}</small></span><span class="veri-chevron">⌄</span></summary><div class="veri-group-body">${body}</div></details>`}
function render(){
 if(!mobil())return false;
 const p=document.getElementById('tab-veri');if(!p)return false;
 p.classList.add('veri-modern');
 p.innerHTML=`<div class="page-header"><div><div class="page-title">VERİLER</div><div class="page-sub">Excel ve e-Okul dosyalarından veri aktarın</div></div></div>
 <div class="veri-shell">
  <section class="veri-hero">
   <div class="veri-hero-top"><div><span class="veri-kicker">KORUK ASİSTAN</span><h1>Veri Aktarma</h1><p>Şablonları indirin, doldurun ve ilgili bölüme yükleyin.</p></div><button class="veri-all-template" onclick="tumSablonlariIndir()">📦 Tüm Şablonlar</button></div>
   <div class="veri-info"><div><b>10</b><span>Aktarım türü</span></div><div><b>Excel</b><span>.xlsx / .xls</span></div><div><b>e-Okul</b><span>Doğrudan liste</span></div></div>
  </section>
  <div class="veri-note"><span>ℹ️</span><span><strong>Mevcut kayıt yapısı korunur.</strong> Yükleme işlemleri mevcut içe aktarma fonksiyonlarıyla yapılır.</span></div>
  <div class="veri-groups">
   ${group('👥','Kişiler','Öğretmen verilerini içe aktar',
     item('👨‍🏫','Öğretmenler','Ad, soyad, branş, telefon ve diğer öğretmen alanları.',btn('Şablon',"sablonIndir('ogretmenler')")+btn('Excel Yükle',"document.getElementById('veriOgretmenInput').click()",true)+`<input type="file" id="veriOgretmenInput" accept=".xlsx,.xls" hidden onchange="ogretmenExceliIceAktar(this.files[0]);this.value=''">`),true)}
   ${group('🏫','Sınıf & Öğrenci','Sınıflar, öğrenciler, veliler ve e-Okul',
     item('🏫','Sınıflar','Sınıf adı, seviye, şube, derslik ve sınıf öğretmeni.',btn('Şablon',"sablonIndir('siniflar')")+btn('Excel Yükle',"document.getElementById('veriSinifExcelInput').click()",true)+`<input type="file" id="veriSinifExcelInput" accept=".xlsx,.xls" hidden onchange="siniflarExceliIceAktar(this.files[0]);this.value=''">`)+
     item('🧑‍🎓','Öğrenciler / Veliler','Önce hedef sınıfı seçin, sonra Excel listesini yükleyin.',btn('Şablon',"sablonIndir('ogrenciler')")+btn('Excel Yükle',"document.getElementById('veriOgrenciInput').click()",true)+`<input type="file" id="veriOgrenciInput" accept=".xlsx,.xls" hidden onchange="veriOgrenciExcelYukle(this)">`,`<div class="veri-select-row"><select id="veriSinifSecimi"><option value="">Sınıf seçiniz…</option></select></div>`)+
     item('📋','e-Okul Sınıf Listesi','e-Okul sınıf listesi raporunu doğrudan okuyun.',btn('e-Okul Excel Yükle',"document.getElementById('veriEOkulInput').click()",true)+`<input type="file" id="veriEOkulInput" accept=".xlsx,.xls" hidden onchange="eOkulListesiOku(this.files[0]);this.value=''">`),true)}
   ${group('🗓️','Program & Sınav','Ders programı, nöbet ve yazılı sınavlar',
     item('🗓️','Ders Programı','Sınıf, gün, ders saati, ders adı ve öğretmen.',btn('Şablon',"sablonIndir('dersProgrami')")+btn('Excel Yükle',"document.getElementById('veriDersInput').click()",true)+`<input type="file" id="veriDersInput" accept=".xlsx,.xls" hidden onchange="dersProgramiExceliIceAktar(this.files[0]);this.value=''">`)+
     item('🛡️','Nöbet Programı','Tarih/gün, nöbet yeri ve öğretmen kayıtları.',btn('Şablon',"sablonIndir('nobetProgrami')")+btn('Excel Yükle',"document.getElementById('veriNobetInput').click()",true)+`<input type="file" id="veriNobetInput" accept=".xlsx,.xls" hidden onchange="nobetExceliIceAktar(this.files[0]);this.value=''">`)+
     item('✏️','Yazılı Sınavlar','Sınıf, ders, tarih, dönem, sınav sırası ve tür.',btn('Şablon',"sablonIndir('yaziliSinavlar')")+btn('Excel Yükle',"document.getElementById('veriYaziliSinavInput').click()",true)+`<input type="file" id="veriYaziliSinavInput" accept=".xlsx,.xls" hidden onchange="yaziliSinavExceliIceAktar(this.files[0]);this.value=''">`))}
   ${group('🚌','Taşıma','Servis öğrencilerini ilgili servise aktar',
     item('🚌','Servis Öğrencileri','Önce hedef servisi seçin, sonra öğrenci Excel listesini yükleyin.',btn('Şablon',"sablonIndir('servisOgrencileri')")+btn('Excel Yükle',"document.getElementById('veriServisOgrenciInput').click()",true)+`<input type="file" id="veriServisOgrenciInput" accept=".xlsx,.xls" hidden onchange="veriServisOgrenciExcelYukle(this)">`,`<div class="veri-select-row"><select id="veriServisSecimi"><option value="">Servis seçiniz…</option></select></div>`))}
   ${group('⚙️','Gelişmiş / Sistem Verileri','Ders ve branş tanımları',
     item('📚','Dersler','Ders adı, kısaltma ve sınıf seviyesine göre haftalık saatler.',btn('Şablon',"sablonIndir('dersler')")+btn('Excel Yükle',"document.getElementById('veriDersListesiInput').click()",true)+`<input type="file" id="veriDersListesiInput" accept=".xlsx,.xls" hidden onchange="dersListesiExceliIceAktar(this.files[0]);this.value=''">`)+
     item('🎓','Branşlar','Öğretmen kayıtlarında kullanılacak branş adları.',btn('Şablon',"sablonIndir('branslar')")+btn('Excel Yükle',"document.getElementById('veriBransListesiInput').click()",true)+`<input type="file" id="veriBransListesiInput" accept=".xlsx,.xls" hidden onchange="bransListesiExceliIceAktar(this.files[0]);this.value=''">`),false,true)}
  </div>
 </div>`;
 try{if(typeof renderVeriSekmesi==='function')renderVeriSekmesi()}catch(e){console.warn('[VeriModern] seçim listeleri',e)}
 try{if(window.lucide&&window.lucide.createIcons)window.lucide.createIcons()}catch(_){}
 return true;
}
function baslik(){if(!mobil())return;const active=document.getElementById('tab-veri');if(!active||!active.classList.contains('active'))return;const h=document.getElementById('korukTopbarPage');if(h)h.textContent='VERİLER'}
let done=false;function init(){if(done)return true;if(!render())return false;done=true;setTimeout(baslik,0);return true}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{let n=0,t=setInterval(()=>{if(init()||++n>80)clearInterval(t)},100)},{once:true});else{let n=0,t=setInterval(()=>{if(init()||++n>80)clearInterval(t)},100)}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-tab="veri"]');if(b){setTimeout(()=>{if(!done)init();baslik();try{if(typeof renderVeriSekmesi==='function')renderVeriSekmesi()}catch(_){}},0)}},true);
window.addEventListener('koruk:data-updated',()=>{if(done){try{if(typeof renderVeriSekmesi==='function')renderVeriSekmesi()}catch(_){}}});
})();
