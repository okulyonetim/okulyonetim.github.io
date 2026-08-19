/* Koruk Asistan — Dashboard bilgi kartı gerçek veri + detay köprüsü */
(function(){
'use strict';
function arr(names){
  for(const n of names){
    try{const v=eval(n);if(Array.isArray(v))return v;}catch(_){}
    try{const v=window[n];if(Array.isArray(v))return v;}catch(_){}
  }
  return [];
}
function done(x){const s=String(x?.durum||x?.status||'').toLocaleLowerCase('tr-TR');return x?.tamamlandi===true||x?.tamam===true||['tamamlandı','tamamlandi','kapalı','kapali','arşivlendi','arsivlendi'].includes(s);}
function countActive(names){return arr(names).filter(x=>!done(x)).length;}
function sum(xs,key){return xs.reduce((t,x)=>t+(parseInt(x?.[key])||0),0);}
function normSex(v){return String(v||'').toLocaleLowerCase('tr-TR').replace(/ı/g,'i');}
function valueFor(label){
  const l=String(label||'').trim();
  if(l==='Personel') return arr(['ogretmenler']).length + arr(['personelListesi']).length;
  if(l==='Öğrenciler'){
    const ogr=arr(['ogrenciler','ogrenciVeliler','ogrenciListesi','veliler']);
    if(ogr.length)return ogr.length;
    return sum(arr(['siniflar']),'ogrenciSayisi');
  }
  if(l==='Sınıflar') return arr(['siniflar']).length;
  if(l==='Servisler') return arr(['servisler']).length;
  if(l==='Dökümanlar') return arr(['dokumanlar','dokumanListesi','dokumanlarCache']).length;
  if(l==='Hatırlatıcı') return countActive(['hatirlaticilar']);
  if(l==='Açık Görev') return countActive(['gorevler']);
  if(l==='Notlar') return arr(['notlar']).length;
  if(l==='Sınavlar') return arr(['sinavlar','yaziliSinavlar','sinavListesi']).length;
  if(l==='Duyurular') return arr(['duyurular']).length;
  if(l==='Mesajlar') return arr(['mesajlar','mesajlarim']).length;
  if(l==='Nöbetler') return arr(['nobetAtamalari']).length;
  return null;
}
function legacyFallback(label){
  const root=document.getElementById('dashStats');if(!root)return null;
  for(const c of Array.from(root.children||[])){
    const t=(c.textContent||'').replace(/\s+/g,' ').trim();
    const match=(label==='Personel'&&/Personel/i.test(t))||(label==='Öğrenciler'&&/Öğrenci/i.test(t))||(label==='Servisler'&&/Servis/i.test(t))||(label==='Sınıflar'&&/Sınıf/i.test(t));
    if(!match)continue;const nums=(t.match(/\b\d+\b/g)||[]).map(Number);if(nums.length)return nums[0];
  }
  return null;
}
function personelDetay(){
  const og=arr(['ogretmenler']);
  const ilk=og.filter(o=>String(o?.kadroKademesi||'')==='ilkokul');
  const orta=og.filter(o=>String(o?.kadroKademesi||'')==='ortaokul');
  const sex=(xs,k)=>xs.filter(o=>normSex(o?.cinsiyet)===k).length;
  return {ilk:{t:ilk.length,k:sex(ilk,'kadin'),e:sex(ilk,'erkek')},orta:{t:orta.length,k:sex(orta,'kadin'),e:sex(orta,'erkek')}};
}
function ogrenciDetay(){
  const ss=arr(['siniflar']);
  const ilk=ss.filter(s=>{const n=parseInt(s?.seviye);return n>=1&&n<=4});
  const orta=ss.filter(s=>{const n=parseInt(s?.seviye);return n>=5&&n<=8});
  return {ilk:{t:sum(ilk,'ogrenciSayisi'),k:sum(ilk,'kizSayisi'),e:sum(ilk,'erkekSayisi')},orta:{t:sum(orta,'ogrenciSayisi'),k:sum(orta,'kizSayisi'),e:sum(orta,'erkekSayisi')}};
}
function detayHtml(d){return `<div class="dbx-break"><div><b>İlkokul</b><strong>${d.ilk.t}</strong><small>♀ ${d.ilk.k} · ♂ ${d.ilk.e}</small></div><i></i><div><b>Ortaokul</b><strong>${d.orta.t}</strong><small>♀ ${d.orta.k} · ♂ ${d.orta.e}</small></div></div>`;}
function style(){if(document.getElementById('dbx-break-style'))return;const s=document.createElement('style');s.id='dbx-break-style';s.textContent=`
#db41InfoGrid .db41-info.dbx-rich{grid-column:span 2;padding:11px 12px!important;min-height:122px!important;display:grid;grid-template-columns:56px 1fr;grid-template-rows:auto auto;column-gap:10px;text-align:left!important;align-items:center}
#db41InfoGrid .db41-info.dbx-rich>.i{grid-row:1/3;font-size:31px!important;text-align:center}
#db41InfoGrid .db41-info.dbx-rich>.v{font-size:25px!important;margin:0!important;line-height:1!important}
#db41InfoGrid .db41-info.dbx-rich>.a{font-size:11px!important;margin:4px 0 0!important;color:var(--d-muted)!important}
#db41InfoGrid .dbx-break{grid-column:1/3;display:grid;grid-template-columns:1fr 1px 1fr;gap:9px;margin-top:8px;padding-top:8px;border-top:1px solid var(--d-line);text-align:center}
#db41InfoGrid .dbx-break>i{background:var(--d-line);width:1px}
#db41InfoGrid .dbx-break b{display:block;font-size:10px;color:var(--d-muted);margin-bottom:2px}
#db41InfoGrid .dbx-break strong{display:block;font-size:17px;color:var(--d-text);line-height:1.15}
#db41InfoGrid .dbx-break small{display:block;font-size:10px;color:var(--d-muted);margin-top:2px;white-space:nowrap}
@media(min-width:700px){#db41InfoGrid .db41-info.dbx-rich{grid-column:span 2}}
`;document.head.appendChild(s);}
function removeDuplicateSchoolLinks(){
  const dup=document.getElementById('db41SocialCard');
  if(dup)dup.remove();
  document.querySelectorAll('.db41-card').forEach(c=>{const h=c.querySelector('.db41-head h2');if(h&&h.textContent.trim()==='Okul Bağlantıları'&&c.id!=='db4SocialCard')c.remove();});
}
function enrich(card,label){
  const rich=label==='Personel'||label==='Öğrenciler';
  card.classList.toggle('dbx-rich',rich);
  let d=card.querySelector('.dbx-break');
  if(!rich){if(d)d.remove();return;}
  const html=detayHtml(label==='Personel'?personelDetay():ogrenciDetay());
  if(!d){card.insertAdjacentHTML('beforeend',html);}else if(d.outerHTML!==html)d.outerHTML=html;
}
function refresh(){
  style();removeDuplicateSchoolLinks();
  document.querySelectorAll('#db41InfoGrid .db41-info').forEach(card=>{
    const label=card.querySelector('.a')?.textContent?.trim();const out=card.querySelector('.v');if(!label||!out)return;
    let v=valueFor(label);
    if((v===0||v==null)&&['Personel','Öğrenciler','Servisler','Sınıflar'].includes(label)){const f=legacyFallback(label);if(f!=null)v=f;}
    if(v!=null&&out.textContent!==String(v))out.textContent=String(v);
    enrich(card,label);
  });
}
window.dashboardBilgiKartlariYenile=refresh;
let tries=0;const timer=setInterval(()=>{refresh();if(++tries>90)clearInterval(timer);},500);
document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,300));
let raf=0;new MutationObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(refresh)}).observe(document.documentElement,{childList:true,subtree:true});
})();
