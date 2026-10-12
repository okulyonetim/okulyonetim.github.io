/* Koruk Asistan — Araçlar (liste sayfası)
 * Döküman & Evraklar menüsündeki "Araçlar" öğesi tek bir araca değil, araçların listesine açılır.
 * Listedeki her araç AYRI bir sayfadır: karta dokununca kendi sayfası açılır, geri tuşu listeye döner.
 *   • İlkokula Başlama Yaşı Hesaplama → js/modules/school-age-calculator.js (sayfa: school-age-calculator)
 *   • Klasör Sırtlığı Oluşturucu       → js/modules/folder-spine.js         (sayfa: folder-spine, ilk açılışta yüklenir)
 * Yeni araç eklemek için: AraclarHub.add({page,icon,title,desc}) çağır ve o sayfanın rotasını ShellUI.registerPageRoute ile kaydet.
 * Görünüm tamamen merkezi CSS'tedir: css/design-system-base.css → TEMA MERKEZİ --ka-hub-* + "ARAÇLAR — LİSTE SAYFASI".
 */
(function(global){
'use strict';
if(global.AraclarHub)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PAGE='araclar',MODULE='documents';
const TOOLS=[
  {page:'school-age-calculator',icon:'🎒',title:'İlkokula Başlama Yaşı Hesaplama',desc:'30 Eylül 2026 esaslı okul öncesi ve 1. sınıf kayıt durumu.'},
  {page:'folder-spine',icon:'🗂️',title:'Klasör Sırtlığı Oluşturucu',desc:'5 cm, 8 cm veya özel ölçüde sırtlık tasarla, seri üret, A4’e dizip yazdır.'}
];
function add(tool){
  if(!tool||!tool.page||!tool.title)return false;
  const i=TOOLS.findIndex(t=>t.page===tool.page);
  if(i>=0)TOOLS[i]={...TOOLS[i],...tool};else TOOLS.push({icon:'🧰',desc:'',...tool});
  return true;
}
function open(root){
  root=root||document.getElementById('v2ModuleRoot');
  if(!root)return false;
  /* Aynı menü grubundaki önceki modül (ör. Dökümanlar) kök alana yazmaya devam etmesin. */
  try{global.DocumentsModule?.unmount?.()}catch(_){}
  root.innerHTML=`<section class="ka-page ka-stack" data-araclar-hub><header class="ka-page-head"><span class="ka-page-head__icon" aria-hidden="true">🧰</span><div><small>DÖKÜMAN &amp; EVRAKLAR</small><h2>Araçlar</h2><p>Okul işlerinde sık kullanılan yardımcı araçlar. Birini seçin; her araç kendi sayfasında açılır.</p></div></header><nav class="ka-hub-list" aria-label="Araçlar">${TOOLS.map(t=>`<button type="button" class="ka-hub-item ka-surface" data-hub-page="${esc(t.page)}" data-hub-title="${esc(t.title)}"><span class="ka-hub-item__icon" aria-hidden="true">${t.icon}</span><span class="ka-hub-item__copy"><strong>${esc(t.title)}</strong>${t.desc?`<em>${esc(t.desc)}</em>`:''}</span><span class="ka-hub-item__go" aria-hidden="true">›</span></button>`).join('')}</nav></section>`;
  root.querySelectorAll('[data-hub-page]').forEach(b=>b.addEventListener('click',()=>{
    Promise.resolve(global.ShellUI?.routeModule?.(MODULE,{bottom:'menu',page:b.dataset.hubPage,title:b.dataset.hubTitle})).catch(e=>{console.error('[AraclarHub]',e);global.toast?.('Sayfa açılamadı.')});
  }));
  return true;
}
/* Klasör Sırtlığı yalnız istenince yüklenir (rapor altyapısı + modül). */
async function openSpine({root}){
  const L=global.AppLoader;
  try{global.DocumentsModule?.unmount?.()}catch(_){}
  if(!global.ReportEngine?.previewHtml)await L?.loadScript?.('js/modules/report-engine.js?v=4');
  if(!global.FolderSpine?.open)await L?.loadScript?.('js/modules/folder-spine.js?v=1');
  if(!global.FolderSpine?.open)throw new Error('folder-spine-load');
  return global.FolderSpine.open(root);
}
function register(){
  const S=global.ShellUI;
  if(!S?.registerPageRoute||!Array.isArray(S.MENU_GROUPS))return false;
  const g=S.MENU_GROUPS.find(x=>x.key==='documents');
  if(!g)return false;
  g.items=Array.isArray(g.items)?g.items:[];
  /* Eski doğrudan "Araçlar → hesaplayıcı" öğesi varsa listeye çevir (tek öğe kalır). */
  g.items=g.items.filter(x=>String(x[3]||'')!=='school-age-calculator');
  if(!g.items.some(x=>String(x[3]||'')===PAGE))g.items.push(['Araçlar','🧰',MODULE,PAGE]);
  S.registerPageRoute(PAGE,async({root})=>open(root));
  S.registerPageRoute('folder-spine',openSpine);
  return true;
}
global.AraclarHub={open,add,tools:()=>TOOLS.slice()};
let tries=0;
function boot(){if(register())return;if(++tries<40)setTimeout(boot,250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
