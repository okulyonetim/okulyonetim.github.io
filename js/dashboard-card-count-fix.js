/* Koruk Asistan — Dashboard bilgi kartı gerçek veri + detay köprüsü */
(function(){
'use strict';
let servisRemoteCount=null;
let servisDinleyici=null;
let servisDinleyiciUid='';
function getGlobal(name){
  try{return eval(name);}catch(_){}
  try{return window[name];}catch(_){}
  return null;
}
function arr(names){
  for(const n of names){
    const v=getGlobal(n);
    if(Array.isArray(v))return v;
  }
  return [];
}
function done(x){const s=String(x?.durum||x?.status||'').toLocaleLowerCase('tr-TR');return x?.tamamlandi===true||x?.tamam===true||['tamamlandı','tamamlandi','kapalı','kapali','arşivlendi','arsivlendi'].includes(s);}
function countActive(names){return arr(names).filter(x=>!done(x)).length;}
function sum(xs,key){return xs.reduce((t,x)=>t+(parseInt(x?.[key])||0),0);}
function normSex(v){return String(v||'').toLocaleLowerCase('tr-TR').replace(/ı/g,'i');}
function servisLocalCount(){
  const s=arr(['servisler']);
  if(s.length)return s.length;
  const rows=document.querySelectorAll('#servislerListesi .evrak-row');
  if(rows.length)return rows.length;
  return 0;
}
function servisDinleyiciKur(){
  const auth=getGlobal('auth'),db=getGlobal('db');
  const uid=auth?.currentUser?.uid||'';
  if(!uid||!db)return;
  if(servisDinleyici&&servisDinleyiciUid===uid)return;
  if(typeof servisDinleyici==='function'){try{servisDinleyici();}catch(_){}}
  servisDinleyici=null;servisDinleyiciUid=uid;
  try{
    const col=getGlobal('COL')?.servisler||'oy_servisler';
    servisDinleyici=db.collection(col).onSnapshot(snap=>{
      servisRemoteCount=snap.size;
      refresh();
    },err=>{
      console.warn('Dashboard servis sayacı dinleyicisi:',err);
      servisDinleyici=null;
    });
  }catch(e){console.warn('Dashboard servis sayacı başlatılamadı:',e);servisDinleyici=null;}
}
function valueFor(label){
  const l=String(label||'').trim();
  if(l==='Personel') return arr(['ogretmenler']).length + arr(['personelListesi']).length;
  if(l==='Öğrenciler'){
    const ogr=arr(['ogrenciler','ogrenciVeliler','ogrenciListesi','veliler']);
    if(ogr.length)return ogr.length;
    return sum(arr(['siniflar']),'ogrenciSayisi');
  }
  if(l==='Sınıflar') return arr(['siniflar']).length;
  if(l==='Servisler'){
    const local=servisLocalCount();
    return local>0?local:(Number.isFinite(servisRemoteCount)?servisRemoteCount:0);
  }
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
function detayHtml(d){
  const sex=x=>`<span class="dbx-sex dbx-female"><span class="dbx-sex-symbol">♀</span><span>${x.k}</span></span><span class="dbx-sex dbx-male"><span class="dbx-sex-symbol">♂</span><span>${x.e}</span></span>`;
  return `<div class="dbx-break"><div><b>İlkokul</b><strong>${d.ilk.t}</strong><small>${sex(d.ilk)}</small></div><i></i><div><b>Ortaokul</b><strong>${d.orta.t}</strong><small>${sex(d.orta)}</small></div></div>`;
}
function style(){if(document.getElementById('dbx-break-style'))return;const s=document.createElement('style');s.id='dbx-break-style';s.textContent=`
#db41InfoGrid .db41-info.dbx-rich{grid-column:span 1!important;padding:12px 10px!important;min-height:184px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important;text-align:center!important}
#db41InfoGrid .db41-info.dbx-rich>.i{font-size:31px!important;text-align:center!important;line-height:1.1!important}
#db41InfoGrid .db41-info.dbx-rich>.v{font-size:29px!important;margin:5px 0 0!important;line-height:1!important;text-align:center!important}
#db41InfoGrid .db41-info.dbx-rich>.a{font-size:12px!important;margin:5px 0 0!important;color:var(--d-muted)!important;text-align:center!important}
#db41InfoGrid .dbx-break{width:100%!important;display:grid!important;grid-template-columns:1fr 1px 1fr!important;gap:7px!important;margin-top:11px!important;padding-top:9px!important;border-top:1px solid var(--d-line)!important;text-align:center!important}
#db41InfoGrid .dbx-break>i{background:var(--d-line)!important;width:1px!important}
#db41InfoGrid .dbx-break b{display:block!important;font-size:10.5px!important;color:var(--d-muted)!important;margin-bottom:3px!important}
#db41InfoGrid .dbx-break strong{display:block!important;font-size:18px!important;color:var(--d-text)!important;line-height:1.15!important}
#db41InfoGrid .dbx-break small{display:flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;font-size:10.5px!important;margin-top:5px!important;white-space:nowrap!important}
#db41InfoGrid .dbx-sex{display:inline-flex!important;align-items:center!important;gap:2px!important;font-weight:800!important;color:var(--d-muted)!important}
#db41InfoGrid .dbx-sex-symbol{font-size:14px!important;font-weight:900!important;line-height:1!important}
#db41InfoGrid .dbx-female .dbx-sex-symbol{color:#e14f9a!important}#db41InfoGrid .dbx-male .dbx-sex-symbol{color:#3187e8!important}
[data-theme="dark"] #db41InfoGrid .dbx-female .dbx-sex-symbol{color:#ff83c0!important}[data-theme="dark"] #db41InfoGrid .dbx-male .dbx-sex-symbol{color:#78b8ff!important}
@media(max-width:560px){#db41InfoGrid .db41-info.dbx-rich{grid-column:span 1!important;min-height:184px!important}}
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
  style();removeDuplicateSchoolLinks();servisDinleyiciKur();
  document.querySelectorAll('#db41InfoGrid .db41-info').forEach(card=>{
    const label=card.querySelector('.a')?.textContent?.trim();const out=card.querySelector('.v');if(!label||!out)return;
    let v=valueFor(label);
    if((v===0||v==null)&&['Personel','Öğrenciler','Sınıflar'].includes(label)){const f=legacyFallback(label);if(f!=null)v=f;}
    if(v!=null&&out.textContent!==String(v))out.textContent=String(v);
    enrich(card,label);
  });
}
window.dashboardBilgiKartlariYenile=refresh;
let tries=0;const timer=setInterval(()=>{refresh();if(++tries>180)clearInterval(timer);},500);
document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,300));
let raf=0;new MutationObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(refresh)}).observe(document.documentElement,{childList:true,subtree:true});
})();
