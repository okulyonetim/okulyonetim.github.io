/* Koruk Asistan — Deneme sayacı tarih doğrulama düzeltmesi v1
   Sayaç artık yalnızca saat bilgisini değil deneme kaydındaki gerçek tarihi de kullanır. */
(function(){
  'use strict';

  function tarihSaatMs(tarih, hhmm){
    if(!tarih || !hhmm) return null;
    const tp=String(tarih).split('-').map(Number);
    const sp=String(hhmm).split(':').map(Number);
    if(tp.length<3 || sp.length<2 || tp.some(Number.isNaN) || sp.some(Number.isNaN)) return null;
    const d=new Date(tp[0],tp[1]-1,tp[2],sp[0],sp[1],0,0);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }

  function snFormatMetni(dk){
    if(typeof dakikayiMetneCevir==='function') return dakikayiMetneCevir(dk);
    dk=Number(dk)||0;
    return `${Math.floor(dk/60)} sa ${dk%60} dk`;
  }

  /* Eski _sayacDurum her HH:MM değerini bugünün tarihiyle birleştiriyordu.
     Bu nedenle örneğin 30 Ağustos 10:00 sınavı 22 Ağustos dahil her gün
     10:00'da aktif/tamamlanmış gibi hesaplanabiliyordu. Burada tüm segmentler
     d.tarih + saat ile gerçek yerel Date nesnesine çevrilir. */
  window._sayacDurum = function(d){
    if(!d || !d.tarih) return null;
    const simdi=Date.now();
    let segList=[];

    if(d.oturumTuru==='İki Oturum'){
      const sb=tarihSaatMs(d.tarih,d.sozelBaslama);
      const se=tarihSaatMs(d.tarih,d.sozelBitis);
      const nb=tarihSaatMs(d.tarih,d.sayisalBaslama);
      const ne=tarihSaatMs(d.tarih,d.sayisalBitis);
      if(sb && se) segList.push({ad:'Sözel Oturum',ikon:'📝',bas:sb,bit:se,sureDk:Number(d.sozelSuresiDk)||0,basStr:d.sozelBaslama,bitStr:d.sozelBitis});
      if(nb && ne) segList.push({ad:'Sayısal Oturum',ikon:'🔢',bas:nb,bit:ne,sureDk:Number(d.sayisalSuresiDk)||0,basStr:d.sayisalBaslama,bitStr:d.sayisalBitis});
    }else{
      const bas=tarihSaatMs(d.tarih,d.baslamaSaati);
      let bit=tarihSaatMs(d.tarih,d.bitisSaati);
      if(bas && bit){
        /* Gece yarısını aşan nadir sınavlarda bitiş ertesi güne geçsin. */
        if(bit<bas) bit+=86400000;
        segList.push({ad:'Sınav',ikon:'⏱️',bas,bit,sureDk:Math.max(0,Math.round((bit-bas)/60000)),basStr:d.baslamaSaati,bitStr:d.bitisSaati});
      }
    }

    if(!segList.length || !segList[0].bas) return null;
    segList.sort((a,b)=>a.bas-b.bas);

    /* İki oturumda da gece yarısı geçişine karşı tarih sürekliliğini koru. */
    for(let i=0;i<segList.length;i++){
      if(segList[i].bit<segList[i].bas) segList[i].bit+=86400000;
      if(i>0 && segList[i].bas<segList[i-1].bit){
        while(segList[i].bas<segList[i-1].bit){ segList[i].bas+=86400000; segList[i].bit+=86400000; }
      }
    }

    const ilkBas=segList[0].bas;
    const sonBit=segList[segList.length-1].bit;
    const toplamSure=Math.max(0,(sonBit-ilkBas)/1000);
    const toplamKalan=Math.max(0,(sonBit-simdi)/1000);

    const takvim=segList.map((s,i)=>{
      let durum='sirada';
      if(simdi>=s.bas && simdi<s.bit) durum='aktif';
      else if(simdi>=s.bit) durum='bitti';
      const araMi=i<segList.length-1 && simdi>=s.bit && simdi<segList[i+1].bas;
      return {ad:s.ad,ikon:s.ikon,bas:s.basStr||'',bit:s.bitStr||'',sureDk:s.sureDk,durum,araMi};
    });

    const toplam={
      bas:d.oturumTuru==='İki Oturum'?(d.sozelBaslama||'—'):(d.baslamaSaati||'—'),
      bit:d.oturumTuru==='İki Oturum'?(d.sayisalBitis||'—'):(d.bitisSaati||'—')
    };

    if(simdi>=sonBit) return {durum:'tamam',takvim,toplamSure,toplamKalan:0,toplam};

    if(simdi<ilkBas){
      return {durum:'bekle',kalanSn:(ilkBas-simdi)/1000,ilkBasStr:toplam.bas,takvim,toplamSure,toplamKalan,toplam,sinavTarihi:d.tarih};
    }

    for(let i=0;i<segList.length;i++){
      const s=segList[i];
      if(simdi>=s.bas && simdi<s.bit){
        const kalanSn=(s.bit-simdi)/1000;
        const toplamSegSn=(s.bit-s.bas)/1000;
        return {durum:'aktif',segAd:s.ad,segIkon:s.ikon,kalanSn,toplamSn:toplamSegSn,oran:toplamSegSn>0?kalanSn/toplamSegSn:0,bitisStr:s.bitStr,toplamKalan,toplamSure,takvim,toplam,sureDk:s.sureDk,sinavTarihi:d.tarih};
      }
      if(i<segList.length-1 && simdi>=s.bit && simdi<segList[i+1].bas){
        return {durum:'ara',sonrakiAd:segList[i+1].ad,sonrakiBasStr:segList[i+1].basStr,kalanSn:(segList[i+1].bas-simdi)/1000,toplamKalan,toplamSure,takvim,toplam,sinavTarihi:d.tarih};
      }
    }
    return null;
  };

  window.KorukDenemeSayacTarihMs=tarihSaatMs;
})();
