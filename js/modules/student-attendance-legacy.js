/* Koruk Asistan — Devamsızlık ders yükü uyumluluk katmanı
 * rubric-settings.js tarafından lazy yüklenir.
 * Öğretmenin ilkokul + ortaokul dahil ders programındaki TÜM derslerini sayar.
 * Müdür ve müdür yardımcısı için ders programı kullanılmaz; sabit günlük yük uygulanır.
 */
(function(global){
  'use strict';
  const SERVICE=global.DevamsizlikCizelgesiService;
  if(!SERVICE) return;

  const DAY_KEYS={1:'pzt',2:'sal',3:'car',4:'per',5:'cum'};
  const norm=v=>String(v??'').replace(/\s+/g,' ').trim().toLocaleLowerCase('tr-TR');
  let aktifOgretmen=null;
  let aktifOgretmenId='';

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
    if(!row||!t)return false;
    const id=String(row?.ogretmenId||row?.teacherId||row?.ogretmenUid||'');
    if(id && (id===String(t?.id||'')||id===String(t?.ogretmenId||'')))return true;
    const wanted=nameOf(t);if(!wanted)return false;
    return [row?.ogretmenAdSoyad,row?.ogretmenAdi,row?.ogretmen,row?.teacherName,row?.adSoyad].some(v=>norm(v)===wanted);
  }

  function yoneticiGunlukSaat(ogretmen,dow){
    if(!ogretmen)return null;
    const gorev=norm(
      ogretmen?.gorevi ?? ogretmen?.gorev ?? ogretmen?.unvan ??
      ogretmen?.pozisyon ?? ogretmen?.kadroUnvani ?? ogretmen?.kadrosu
    ).replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');

    if(gorev==='mudur' || (/^mudur\s+/.test(gorev) && !gorev.includes('yardimc'))){
      return [5,5,5,5,5][dow-1] ?? null;
    }
    if(gorev.includes('mudur yardimc')){
      return [4,4,3,4,4][dow-1] ?? null;
    }
    return null;
  }

  function haftalikSaatleriHesapla(teacher){
    const fixed={pzt:yoneticiGunlukSaat(teacher,1),sal:yoneticiGunlukSaat(teacher,2),car:yoneticiGunlukSaat(teacher,3),per:yoneticiGunlukSaat(teacher,4),cum:yoneticiGunlukSaat(teacher,5)};
    if(Object.values(fixed).some(v=>v!==null))return fixed;
    const out={pzt:0,sal:0,car:0,per:0,cum:0};
    if(!teacher)return out;
    const rows=scheduleRows().filter(r=>matches(r,teacher));
    const seen=new Set();
    rows.forEach(r=>{
      const key=dayKey(r?.gun);if(!key)return;
      const slot=Number.isFinite(Number(r?.saat))?String(Number(r.saat)):String(r?.id||'');
      const cls=String(r?.sinif||r?.sinifAdi||'').trim();
      const unique=`${cls}|${key}|${slot}`;
      if(seen.has(unique))return;
      seen.add(unique);out[key]++;
    });
    return out;
  }

  const oldHours=SERVICE._haftaIciSaat;
  SERVICE._haftaIciSaat=function(haftalikSaatler,yil,ay,gun,ogretmen){
    const teacher=ogretmen||aktifOgretmen;
    const dow=this.haftaGunu(yil,ay,gun),key=DAY_KEYS[dow];
    if(!key)return 0;

    const yoneticiSaat=yoneticiGunlukSaat(teacher,dow);
    if(yoneticiSaat!==null)return yoneticiSaat;

    const total=teacher?scheduleRows().filter(r=>matches(r,teacher)&&dayKey(r.gun)===key).length:0;
    return total>0?total:(typeof oldHours==='function'?oldHours.call(this,haftalikSaatler,yil,ay,gun):0);
  };

  const oldAuto=SERVICE.otomatikKodUret;
  if(typeof oldAuto==='function'){
    SERVICE.otomatikKodUret=function(ogretmen,yil,ay,gun,resmiTatiller,izinKayitlari){
      const previous=aktifOgretmen;
      aktifOgretmen=ogretmen||null;
      try{return oldAuto.call(this,ogretmen,yil,ay,gun,resmiTatiller,izinKayitlari);}
      finally{aktifOgretmen=previous;}
    };
  }

  // Haftalık ders saatleri penceresi doğrudan Tools modülü içindeki kapalı
  // scope'tan beslendiği için, pencere açılır açılmaz aynı merkezi hesaplamayı
  // görünür alanlara uygula. Böylece yönetici sabitleri de ekranda doğrudan
  // 5-5-5-5-5 / 4-4-3-4-4 olarak görünür.
  function teacherById(id){
    const rows=global.AppStore?.data?.('ogretmenler');
    if(!Array.isArray(rows))return null;
    return rows.find(t=>String(t?.id||'')===String(id||''))||null;
  }
  function syncWeeklyHoursModal(){
    const modal=[...document.querySelectorAll('.ka-modal')].find(el=>/Haftalık Ders Saatleri/i.test(el.textContent||''));
    if(!modal||!aktifOgretmenId)return;
    const teacher=teacherById(aktifOgretmenId);if(!teacher)return;
    const weekly=haftalikSaatleriHesapla(teacher);
    modal.querySelectorAll('[data-att-week]').forEach(input=>{
      const key=String(input.dataset.attWeek||'');
      if(Object.prototype.hasOwnProperty.call(weekly,key))input.value=String(Number(weekly[key])||0);
    });
  }

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('[data-att-hours]');
    if(btn)aktifOgretmenId=String(btn.getAttribute('data-att-hours')||'');
  },true);

  const observer=new MutationObserver(()=>{
    if(aktifOgretmenId)global.requestAnimationFrame?.(syncWeeklyHoursModal);
  });
  observer.observe(document.body,{childList:true,subtree:true});

  global.__korukDevamsizlikDersProgramiTumunuSay=true;
})(window);
