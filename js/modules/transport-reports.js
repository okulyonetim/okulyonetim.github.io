/* Koruk Asistan — Taşıma raporları
 * Okul Servis Aracı Denetim Formu + Aylık Taşıma Takip Çizelgesi.
 * Veri yalnız AppStore/IndexedDB'den okunur; görünüm/yazdırma ReportEngine + design-system.css üzerinden yürür.
 */
(function(global){
'use strict';
if(global.TransportReports)return;
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const esc=v=>global.ReportEngine?.esc?.(v)??String(v??'');
const AYLAR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const GUNLER=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
const DENETIM=[
 ['Aracın yaşı "Okul Servis Araçları Yönetmeliği"nde yer alan yaş şartına uygun mu?','Okul Servis Araçları Yönetmeliği 4/1-f'],
 ['Okul servis aracı temiz, bakımlı, güvenli ve her fırsatta havalandırılmış vaziyette bulunduruluyor mu?','Okul Servis Araçları Yönetmeliği 4/1-e'],
 ['Taşıma işinin gerçekleştirildiği okul servis aracı, yüklenici tarafından idareye bildirilen araç mı?','Teknik Şartname'],
 ['Taşımayı gerçekleştiren şoför idareye bildirilen kişi mi?','Teknik Şartname'],
 ['"Sürücü Belgesi" taşıma hizmeti veren aracın kullanımı için yeterli ve uygun mu?','Okul Servis Araçları Yönetmeliği 9/1-c'],
 ['Aracın camları, renkli film tabakaları yapıştırılması yasağına uygun mu?','Okul Servis Araçları Yönetmeliği 4/1-n'],
 ['Aracın arkasında "OKUL TAŞITI" yazısını kapsayan numunesine uygun reflektif kuşak var mı?','Okul Servis Araçları Yönetmeliği 4/1-a'],
 ['En az 30 cm çapında kırmızı ışık veren, üzerinde "DUR" yazısı okunan lamba tesis edilmiş mi?','Okul Servis Araçları Yönetmeliği 4/1-b'],
 ['Öğrencilerin emniyet kemeri takmaları sağlanıyor mu?','MEB Taşıma Yoluyla Eğitime Erişim Yönetmeliği 15/2-ğ'],
 ['Araca taşıma kapasitesi üzerinde öğrenci/kursiyer/veli alınıyor mu?','Teknik Şartname'],
 ['Taşıma merkezi okul/kurum müdürlüğünce düzenlenen puantaj cetvelleri günlük düzenli olarak imzalanıyor mu?','MEB TYEE 15/2-e / Teknik Şartname'],
 ['Şoför, temiz ve işe uygun kıyafetlerle çalışıyor mu?','Teknik Şartname'],
 ['Şoför, öğrencilerin güvenli ve rahat yolculuk yapmasını sağlayarak azami sürelere uyuyor mu?','Okul Servis Araçları Yönetmeliği 9/1-ğ'],
 ['Rehber personel (varsa), TS EN ISO 20471 standardına uygun "REHBER" yazılı ikaz yeleğini kullanıyor mu?','Okul Servis Araçları Yönetmeliği 9/2-f'],
 ['Servis aracında "İlkyardım Çantası" bulunuyor mu?','Teknik Şartname'],
 ['Servis aracında "Trafik Seti" bulunuyor mu?','Teknik Şartname'],
 ['Servis aracında bakımlı ve süresi geçmemiş yangın söndürme tüpü bulunuyor mu?','Teknik Şartname'],
 ['Araçta öğrencilerin kolayca yetişebileceği camlar ve pencereler sabit mi?','Okul Servis Araçları Yönetmeliği 4/1-c'],
 ['Aracın iç düzenlemesinde açıkta olan demir aksam yumuşak bir madde ile kaplanmış mı?','Okul Servis Araçları Yönetmeliği 4/1-c']
];
function school(){const rows=arr('okulBilgileri'),o=rows.find(x=>x.id==='ayarlar')||rows[0]||{};return o;}
function teachers(){return arr('ogretmenler')}
function adminNames(){const o=school(),ts=teachers(),mudur=ts.find(t=>t.id===o.mudurId)||ts.find(t=>(t.unvan||'').trim()==='Müdür'),yrd=ts.find(t=>(t.unvan||'').trim()==='Müdür Yardımcısı');const name=t=>t?`${t.ad||''} ${t.soyad||''}`.trim():'';return{mudur:name(mudur),yardimci:name(yrd)};}
function service(id){return arr('servisler').find(s=>s.id===id)||null}
function students(id){const classes=arr('siniflar');return arr('veliler').filter(v=>v.servisId===id).map(v=>({id:v.id,ad:v.ogrenciAdi||'',sinif:classes.find(s=>s.id===v.sinifId)?.ad||v.sinifAdi||''})).sort((a,b)=>a.ad.localeCompare(b.ad,'tr'))}
function schoolTitle(){const o=school(),parts=[];if(o.il)parts.push(`${String(o.il).toLocaleUpperCase('tr')} İLİ`);if(o.ilce)parts.push(`${String(o.ilce).toLocaleUpperCase('tr')} İLÇESİ`);parts.push(String(o.okulAdi||'KORUK İLK-ORTAOKULU').toLocaleUpperCase('tr'));return parts.join(' ')}
async function prepare(){if(!global.SyncEngine||!global.COL)return;const defs={okulBilgileri:COL.okulBilgileri,resmiTatiller:COL.resmiTatiller},types=[];for(const [t,c] of Object.entries(defs)){if(c){SyncEngine.register(t,c);types.push(t)}}if(types.length){await SyncEngine.localHydrate(types);SyncEngine.schedule(60)}}
function signatures(){const a=adminNames();return `<table><tbody><tr><td><strong>${esc(a.yardimci)}</strong><br>Müdür Yardımcısı</td><td><strong>${esc(a.mudur)}</strong><br>Okul Müdürü</td></tr></tbody></table>`}
async function denetim(servisId){await prepare();const s=service(servisId);if(!s)throw new Error('servis-bulunamadi');const count=students(servisId).length,rows=DENETIM.map(([m,r],i)=>`<tr><td>${i+1}. ${esc(m)}<br><small>(${esc(r)})</small></td><td></td><td></td><td></td></tr>`).join(''),body=`<h1>${esc(schoolTitle())}</h1><h2>OKUL SERVİS ARACI DENETİM FORMU</h2><table><tbody><tr><th>Servis</th><td>${esc(s.servisAdi||s.guzergah||'')}</td><th>Plaka</th><td>${esc(s.plaka||'')}</td></tr><tr><th>Sürücü</th><td>${esc(s.soforAdi||'')}</td><th>Telefon</th><td>${esc(s.soforTelefon||'')}</td></tr><tr><th>Öğrenci Sayısı</th><td>${count}</td><th>Tarih</th><td>${new Date().toLocaleDateString('tr-TR')}</td></tr></tbody></table><table><thead><tr><th>DENETLEME KONULARI</th><th>EVET</th><th>HAYIR</th><th>AÇIKLAMALAR</th></tr></thead><tbody>${rows}</tbody></table>${signatures()}`;return ReportEngine.printReport('Okul Servis Aracı Denetim Formu',body,{fileName:`${s.plaka||'Servis'}_Denetim`,yon:'dikey'});}
function holiday(iso){const t=arr('resmiTatiller').find(x=>x.tarih===iso);return t?(t.aciklama||t.ad||'Resmî Tatil'):null}
function dateIso(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function studentTable(list){const rows=[...list];while(rows.length<30)rows.push({ad:'',sinif:''});return `<table><thead><tr><th>Sıra</th><th>Öğrenci Adı Soyadı</th><th>Sınıf</th></tr></thead><tbody>${rows.map((o,i)=>`<tr><td>${i+1}</td><td>${esc(o.ad)}</td><td>${esc(o.sinif)}</td></tr>`).join('')}</tbody></table>`}
function dailyRows(y,m){const last=new Date(y,m+1,0).getDate();let out='';for(let d=1;d<=last;d++){const dt=new Date(y,m,d),weekend=dt.getDay()===0||dt.getDay()===6,iso=dateIso(y,m,d),h=!weekend&&holiday(iso),label=`${d} ${AYLAR[m]} ${y} ${GUNLER[dt.getDay()]}`,mark=weekend?'Hafta Sonu':h?'Resmî Tatil':'';out+=`<tr><td>${esc(label)}</td>${mark?`<td colspan="8">${esc(mark)}</td>`:'<td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>'}</tr>`;}return out;}
async function takip(servisId,yil=new Date().getFullYear(),ay=new Date().getMonth()){await prepare();const s=service(servisId);if(!s)throw new Error('servis-bulunamadi');const ayAdi=`${AYLAR[ay].toLocaleUpperCase('tr')} - ${yil}`,body=`<h1>${esc(schoolTitle())}</h1><h2>${esc(ayAdi)} TAŞIMA TAKİP ÇİZELGESİ</h2><table><tbody><tr><th>Servis</th><td>${esc(s.servisAdi||s.guzergah||'')}</td><th>Sürücü</th><td>${esc(s.soforAdi||'')}</td></tr><tr><th>Plaka</th><td>${esc(s.plaka||'')}</td><th>Telefon</th><td>${esc(s.soforTelefon||'')}</td></tr></tbody></table>${studentTable(students(servisId))}<table><thead><tr><th rowspan="2">Tarih</th><th colspan="4">Öğle</th><th colspan="4">Akşam</th></tr><tr><th>Geliş Saati</th><th>Gelen Sayı</th><th>Şoför İmza</th><th>N. Öğrt. İmza</th><th>Çıkış Saati</th><th>Giden Sayı</th><th>Şoför İmza</th><th>N. Öğrt. İmza</th></tr></thead><tbody>${dailyRows(yil,ay)}</tbody></table>${signatures()}`;return ReportEngine.printReport(`${ayAdi} Taşıma Takip Çizelgesi`,body,{fileName:`${s.plaka||'Servis'}_${AYLAR[ay]}_${yil}_Takip`,yon:'dikey'});}
function takipSec(servisId){const now=new Date(),ov=document.createElement('div');ov.id='transportReportPicker';ov.className='ka-modal-backdrop';ov.innerHTML=`<section class="ka-modal"><div class="ka-modal__header"><strong>Aylık Taşıma Takip Çizelgesi</strong><button class="ka-btn ka-btn--secondary ka-btn--sm" data-close type="button">Kapat</button></div><div class="ka-modal__body ka-grid"><label class="ka-field"><span class="ka-field__label">Yıl</span><input id="trYear" type="number" min="2020" max="2100" value="${now.getFullYear()}"></label><label class="ka-field"><span class="ka-field__label">Ay</span><select id="trMonth">${AYLAR.map((a,i)=>`<option value="${i}" ${i===now.getMonth()?'selected':''}>${a}</option>`).join('')}</select></label></div><div class="ka-modal__footer"><button class="ka-btn" data-print type="button">Yazdır / PDF</button></div></section>`;document.body.appendChild(ov);ov.querySelector('[data-close]').onclick=()=>ov.remove();ov.querySelector('[data-print]').onclick=async()=>{const b=ov.querySelector('[data-print]');b.disabled=true;try{await takip(servisId,Number(ov.querySelector('#trYear').value),Number(ov.querySelector('#trMonth').value));ov.remove();}catch(e){toast?.('Rapor hazırlanamadı: '+(e?.message||e));b.disabled=false;}};}
global.TransportReports={prepare,denetim,takip,takipSec};
})(window);
