/* Koruk Asistan — Devamsızlık ders yükü uyumluluk katmanı
 * rubric-settings.js tarafından lazy yüklenir.
 * Öğretmenin ilkokul + ortaokul dahil ders programındaki TÜM derslerini sayar.
 */
(function(global){
  'use strict';
  const SERVICE=global.DevamsizlikCizelgesiService;
  if(!SERVICE) return;

  const DAY_KEYS={1:'pzt',2:'sal',3:'car',4:'per',5:'cum'};
  const norm=v=>String(v??'').replace(/\s+/g,' ').trim().toLocaleLowerCase('tr-TR');

  function scheduleRows(){
    const out=[];
    try{const a=global.AppStore?.data?.('dersProgrami');if(Array.isArray(a))out.push(...a);}catch(_){ }
    try{const b=global.DeviceData?.list?.('dersProgrami');if(Array.isArray(b))out.push(...b);}catch(_){ }
    const seen=new Set();
    return out.filter(r=>{
      const key=String(r?.id||'')||JSON.stringify([r?.ogretmenId,r?.ogretmenAdSoyad,r?.ogretmen,r?.gun,r?.saat,r?.sinif,r?.ders]);
      if(seen.has(key))return false;seen.add(key);return true;
    });
  }

  function dayKey(value){
    if(typeof value==='number' && value>=1 && value<=5)return DAY_KEYS[value];
    const s=norm(value).replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');
    if(/^1$|^pzt|^pazartesi/.test(s))return'pzt';
    if(/^2$|^sal|^sali/.test(s))return'sal';
    if(/^3$|^car|^carsamba/.test(s))return'car';
    if(/^4$|^per|^persembe/.test(s))return'per';
    if(/^5$|^cum|^cuma/.test(s))return'cum';
    return'';
  }

  function nameOf(t){return norm(`${t?.ad||''} ${t?.soyad||''}`||t?.adSoyad);}
  function matches(row,t){
    const id=String(row?.ogretmenId||row?.teacherId||row?.ogretmenUid||'');
    if(id && (id===String(t?.id||'')||id===String(t?.ogretmenId||'')))return true;
    const wanted=nameOf(t);if(!wanted)return false;
    return [row?.ogretmenAdSoyad,row?.ogretmenAdi,row?.ogretmen,row?.teacherName,row?.adSoyad].some(v=>norm(v)===wanted);
  }

  const old=SERVICE._haftaIciSaat;
  SERVICE._haftaIciSaat=function(haftalikSaatler,yil,ay,gun,ogretmen){
    const dow=this.haftaGunu(yil,ay,gun),key=DAY_KEYS[dow];
    if(!key)return 0;
    const total=scheduleRows().filter(r=>matches(r,ogretmen)&&dayKey(r.gun)===key).length;
    return total>0?total:(typeof old==='function'?old.call(this,haftalikSaatler,yil,ay,gun):0);
  };
  global.__korukDevamsizlikDersProgramiTumunuSay=true;
})(window);
