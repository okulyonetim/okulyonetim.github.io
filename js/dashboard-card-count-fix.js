/* Koruk Asistan — Dashboard bilgi kartı gerçek veri köprüsü */
(function(){
'use strict';
function arr(names){
  for(const n of names){
    try{
      const v=eval(n);
      if(Array.isArray(v)) return v;
    }catch(_){}
    try{
      const v=window[n];
      if(Array.isArray(v)) return v;
    }catch(_){}
  }
  return [];
}
function done(x){const s=String(x?.durum||x?.status||'').toLocaleLowerCase('tr-TR');return x?.tamamlandi===true||x?.tamam===true||['tamamlandı','tamamlandi','kapalı','kapali','arşivlendi','arsivlendi'].includes(s);}
function countActive(names){return arr(names).filter(x=>!done(x)).length;}
function valueFor(label){
  const l=String(label||'').trim();
  if(l==='Personel') return arr(['ogretmenler']).length;
  if(l==='Öğrenciler') return arr(['ogrenciler','ogrenciVeliler','ogrenciListesi']).length;
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
  const cards=Array.from(root.children||[]);
  for(const c of cards){
    const t=(c.textContent||'').replace(/\s+/g,' ').trim();
    const match=(label==='Personel'&&/Personel/i.test(t))||(label==='Öğrenciler'&&/Öğrenci/i.test(t))||(label==='Servisler'&&/Servis/i.test(t))||(label==='Sınıflar'&&/Sınıf/i.test(t));
    if(!match)continue;
    const nums=(t.match(/\b\d+\b/g)||[]).map(Number);
    if(nums.length)return nums[0];
  }
  return null;
}
function refresh(){
  document.querySelectorAll('#db41InfoGrid .db41-info').forEach(card=>{
    const label=card.querySelector('.a')?.textContent?.trim();
    const out=card.querySelector('.v');if(!label||!out)return;
    let v=valueFor(label);
    if((v===0||v==null)&&['Personel','Öğrenciler','Servisler','Sınıflar'].includes(label)){
      const f=legacyFallback(label);if(f!=null)v=f;
    }
    if(v!=null)out.textContent=String(v);
  });
}
window.dashboardBilgiKartlariYenile=refresh;
let tries=0;const timer=setInterval(()=>{refresh();if(++tries>90)clearInterval(timer);},500);
document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,300));
new MutationObserver(()=>requestAnimationFrame(refresh)).observe(document.documentElement,{childList:true,subtree:true});
})();
