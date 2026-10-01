/* Koruk Asistan — Devamsızlık ders yükü düzeltmesi
 * Öğretmenin ilkokul + ortaokul derslerini birlikte hesaba katar.
 * Mevcut Devamsızlık servisinin diğer davranışlarına dokunmaz.
 */
(function(global){
  'use strict';

  const SERVICE = global.DevamsizlikCizelgesiService;
  if(!SERVICE) return;

  const DAY_KEYS = Object.freeze({
    1:'pzt', 2:'sal', 3:'car', 4:'per', 5:'cum'
  });

  function rows(type){
    const out=[];
    try{
      const a=global.AppStore?.data?.(type);
      if(Array.isArray(a)) out.push(...a);
    }catch(_){ }
    try{
      const b=global.DeviceData?.list?.(type);
      if(Array.isArray(b)) out.push(...b);
    }catch(_){ }
    const seen=new Set();
    return out.filter(r=>{
      const id=String(r?.id||'');
      const key=id||JSON.stringify([r?.ogretmenId,r?.ogretmenAdSoyad,r?.ogretmen,r?.gun,r?.saat,r?.sinif,r?.ders]);
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function cleanName(v){
    return String(v||'')
      .replace(/\s+/g,' ')
      .trim()
      .toLocaleLowerCase('tr-TR');
  }

  function teacherMatches(row,teacher){
    if(!row||!teacher) return false;
    const wantedIds=[teacher.id,teacher.ogretmenId].filter(Boolean).map(String);
    const rowId=row.ogretmenId||row.teacherId||row.ogretmenUid||row.teacherUid;
    if(rowId && wantedIds.includes(String(rowId))) return true;
    const wanted=cleanName(`${teacher.ad||''} ${teacher.soyad||''}`||teacher.adSoyad);
    if(!wanted) return false;
    const names=[row.ogretmenAdSoyad,row.ogretmenAdi,row.ogretmen,row.teacherName,row.adSoyad]
      .map(cleanName).filter(Boolean);
    return names.includes(wanted);
  }

  function dayKey(value){
    if(value===undefined||value===null) return '';
    if(typeof value==='number' && value>=1 && value<=5) return DAY_KEYS[value];
    const s=cleanName(value);
    if(/^1$|^pzt|^pazartesi/.test(s)) return 'pzt';
    if(/^2$|^sal|^sali/.test(s)) return 'sal';
    if(/^3$|^car|^carsamba/.test(s)) return 'car';
    if(/^4$|^per|^persembe/.test(s)) return 'per';
    if(/^5$|^cum|^cuma/.test(s)) return 'cum';
    return '';
  }

  const original=SERVICE._haftaIciSaat;
  SERVICE._haftaIciSaat=function(haftalikSaatler,yil,ay,gun,ogretmen){
    const teacher=ogretmen||{};
    const day=this.haftaGunu(yil,ay,gun);
    const key=DAY_KEYS[day];
    if(!key) return 0;

    const program=rows('dersProgrami');
    const total=program.filter(row=>teacherMatches(row,teacher) && dayKey(row.gun)===key).length;

    /* Program kaydı bulunamazsa mevcut davranış korunur. */
    if(total>0) return total;
    return typeof original==='function' ? original.call(this,haftalikSaatler,yil,ay,gun) : 0;
  };

  /* Test/diagnostic amaçlı küçük, global olmayan bir işaret. */
  global.__korukDevamsizlikTumDersProgrami=true;
})(window);
