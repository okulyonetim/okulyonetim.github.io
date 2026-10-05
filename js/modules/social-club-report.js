/* Koruk Asistan — Sosyal Kulüpler özel raporu.
 * Yalnızca Sosyal Kulüpler raporunu sahiplenir; diğer klasik/özel raporlara dokunmaz.
 */
(function(global){
'use strict';
if(global.SocialClubReport)return;
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').trim();
const teacherName=id=>{const r=arr('ogretmenler').find(x=>String(x.id)===String(id));return r?`${r.ad||''} ${r.soyad||''}`.trim():'—'};
const className=id=>{const r=arr('siniflar').find(x=>String(x.id)===String(id));return r?.ad||id||'—'};
const date=v=>{if(!v)return'';const p=String(v).split('-');return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:String(v)};
function check(row,i){return Array.isArray(row?.kontroller)&&row.kontroller[i]?'✓':''}
function table(){
 const rows=arr('sosyalKulupler').slice().sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr'));
 const heads=['Kulüp Adı','Danışman Öğretmen','Sınıflar','Durum','Yıllık Plan','Toplum Hizmeti Planı','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz','Sene Sonu Rap.'];
 const body=rows.map(r=>{
   const teachers=Array.isArray(r.ogretmenIdler)?r.ogretmenIdler.map(teacherName).filter(Boolean).join(', '):'—';
   const classes=Array.isArray(r.sinifIdler)&&r.sinifIdler.length?r.sinifIdler.map(className).join(', '):'Tüm sınıflar';
   const cells=[r.ad||'İsimsiz Kulüp',teachers,classes,r.aktif===false?'Pasif':'Aktif',r.yillikPlanTarihi?date(r.yillikPlanTarihi):'',r.toplumHizmetiTarihi?date(r.toplumHizmetiTarihi):'',...Array.from({length:10},(_,i)=>check(r,i+2))];
   return `<tr>${cells.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`;
 }).join('');
 return `<table><thead><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body||`<tr><td colspan="${heads.length}">Kayıt yok.</td></tr>`}</tbody></table>`;
}
async function print(){
 if(!global.ReportEngine){if(!global.AppLoader?.loadScript)throw new Error('Rapor motoru yüklenemedi.');await global.AppLoader.loadScript('js/modules/report-engine.js')}
 return global.ReportEngine.printReport('Sosyal Kulüpler',table(),{yon:'yatay',compact:true,fileName:'Sosyal Kulüpler',ustBaslik:'Sosyal Kulüpler'});
}
function install(){
 if(document.__socialClubReportInstalled)return;document.__socialClubReportInstalled=true;
 document.addEventListener('click',e=>{
   const btn=e.target.closest?.('[data-cizelge-report]');
   if(!btn||global.ClassicCizelgelerParity?.currentType!=='sosyalKulupler')return;
   e.preventDefault();e.stopImmediatePropagation();
   print().catch(err=>global.toast?.('Rapor açılamadı: '+(err?.message||err)));
 },true);
}
install();
global.SocialClubReport={table,print,install};
})(window);