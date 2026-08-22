/* Koruk Asistan — Deneme sayacı çalışma mantığı v2
   - Sayaç yalnızca sınavın kendi tarihinde başlatılabilir.
   - Başlat butonuna basıldığı an gerçek sayaç başlangıcıdır.
   - Tek/iki oturum süreleri kayıtlı dakika değerlerinden yürür.
   - Planlanan saat artık canlı sayaç hesabını bozmaz.
   - 0 dakika / eksik süreli kayıt başlatılamaz.
*/
(function(){
  'use strict';

  function bugunISO(){
    var d=new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function fmt(sn){
    sn=Math.max(0,Math.floor(Number(sn)||0));
    var s=Math.floor(sn/3600),d=Math.floor((sn%3600)/60),n=sn%60;
    return String(s).padStart(2,'0')+':'+String(d).padStart(2,'0')+':'+String(n).padStart(2,'0');
  }
  function dkMetin(dk){
    dk=Math.max(0,Number(dk)||0);
    var sa=Math.floor(dk/60), kal=dk%60;
    return sa ? (sa+' sa'+(kal?' '+kal+' dk':'')) : (kal+' dk');
  }
  function tarihMetni(iso){
    if(!iso) return '—';
    var p=iso.split('-');
    return p.length===3 ? p[2]+'.'+p[1]+'.'+p[0] : iso;
  }
  function toplamSureDk(d){
    if(!d) return 0;
    if(d.oturumTuru==='İki Oturum') return (Number(d.sozelSuresiDk)||0)+(Number(d.araSureDk)||0)+(Number(d.sayisalSuresiDk)||0);
    return Number(d.sinavSuresiDk)||0;
  }
  function baslangicMs(d){
    var raw=d&&d.sayacDurumu&&d.sayacDurumu.baslatmaTarihi;
    if(!raw) return null;
    var ms=new Date(raw).getTime();
    return Number.isFinite(ms)?ms:null;
  }
  function saat(ms){
    if(!ms) return '—';
    return new Date(ms).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
  }

  window._sayacDurum=function(d){
    if(!d) return null;
    var aktif=!!(d.sayacDurumu&&d.sayacDurumu.aktif);
    var toplamDk=toplamSureDk(d);
    var tarihDogru=d.tarih===bugunISO();

    if(!aktif){
      return {durum:toplamDk>0?'hazir':'gecersiz',tarihDogru:tarihDogru,toplamSure:toplamDk*60,toplamKalan:toplamDk*60,takvim:[]};
    }

    var bas=baslangicMs(d);
    if(!bas || toplamDk<=0) return {durum:'gecersiz',tarihDogru:tarihDogru,toplamSure:0,toplamKalan:0,takvim:[]};
    var simdi=Date.now();

    if(d.oturumTuru==='İki Oturum'){
      var sozDk=Number(d.sozelSuresiDk)||0;
      var araDk=Number(d.araSureDk)||0;
      var sayDk=Number(d.sayisalSuresiDk)||0;
      var sozBit=bas+sozDk*60000;
      var sayBas=sozBit+araDk*60000;
      var sayBit=sayBas+sayDk*60000;
      var takvim=[
        {ad:'Sözel Oturum',ikon:'📝',sureDk:sozDk,bas:saat(bas),bit:saat(sozBit),durum:simdi>=sozBit?'bitti':simdi>=bas?'aktif':'sirada'},
        {ad:'Sayısal Oturum',ikon:'🔢',sureDk:sayDk,bas:saat(sayBas),bit:saat(sayBit),durum:simdi>=sayBit?'bitti':simdi>=sayBas?'aktif':'sirada'}
      ];
      if(simdi>=sayBit) return {durum:'tamam',takvim:takvim,toplamSure:toplamDk*60,toplamKalan:0,toplam:{bas:saat(bas),bit:saat(sayBit)}};
      if(simdi<sozBit){
        var kalan1=(sozBit-simdi)/1000;
        return {durum:'aktif',segAd:'Sözel Oturum',segIkon:'📝',kalanSn:kalan1,toplamSn:sozDk*60,oran:sozDk?Math.max(0,Math.min(1,kalan1/(sozDk*60))):0,bitisStr:saat(sozBit),toplamKalan:(sayBit-simdi)/1000,toplamSure:toplamDk*60,takvim:takvim,toplam:{bas:saat(bas),bit:saat(sayBit)},sureDk:sozDk};
      }
      if(simdi<sayBas){
        return {durum:'ara',sonrakiAd:'Sayısal Oturum',sonrakiBasStr:saat(sayBas),kalanSn:(sayBas-simdi)/1000,toplamKalan:(sayBit-simdi)/1000,toplamSure:toplamDk*60,takvim:takvim,toplam:{bas:saat(bas),bit:saat(sayBit)}};
      }
      var kalan2=(sayBit-simdi)/1000;
      return {durum:'aktif',segAd:'Sayısal Oturum',segIkon:'🔢',kalanSn:kalan2,toplamSn:sayDk*60,oran:sayDk?Math.max(0,Math.min(1,kalan2/(sayDk*60))):0,bitisStr:saat(sayBit),toplamKalan:kalan2,toplamSure:toplamDk*60,takvim:takvim,toplam:{bas:saat(bas),bit:saat(sayBit)},sureDk:sayDk};
    }

    var bit=bas+toplamDk*60000;
    var tekTakvim=[{ad:'Sınav',ikon:'⏱️',sureDk:toplamDk,bas:saat(bas),bit:saat(bit),durum:simdi>=bit?'bitti':'aktif'}];
    if(simdi>=bit) return {durum:'tamam',takvim:tekTakvim,toplamSure:toplamDk*60,toplamKalan:0,toplam:{bas:saat(bas),bit:saat(bit)}};
    var kalan=(bit-simdi)/1000;
    return {durum:'aktif',segAd:'Sınav',segIkon:'⏱️',kalanSn:kalan,toplamSn:toplamDk*60,oran:Math.max(0,Math.min(1,kalan/(toplamDk*60))),bitisStr:saat(bit),toplamKalan:kalan,toplamSure:toplamDk*60,takvim:tekTakvim,toplam:{bas:saat(bas),bit:saat(bit)},sureDk:toplamDk};
  };

  window._sayacBaslat=function(id){
    var d=(typeof denemeSinavlari!=='undefined'?denemeSinavlari:[]).find(function(x){return x.id===id;});
    if(!d) return;
    if(d.tarih!==bugunISO()){
      if(typeof toast==='function') toast('Sayaç yalnızca sınav tarihinde ('+tarihMetni(d.tarih)+') başlatılabilir.');
      return;
    }
    if(toplamSureDk(d)<=0){
      if(typeof toast==='function') toast('Sınav süresi 0 dakika. Önce denemeyi düzenleyip geçerli bir süre girin.');
      return;
    }
    if(typeof SinavlarService==='undefined') return;
    SinavlarService.denemeSayacBaslat(id,d).catch(function(e){if(e.message!=='yetkisiz'&&typeof toast==='function')toast('Sayaç başlatılamadı: '+e.message);});
  };

  function durumBadge(ds,aktif){
    if(ds&&ds.durum==='gecersiz') return '<span class="dn-ov-badge dn-ov-badge--hata">Süre eksik</span>';
    if(!aktif) return '<span class="dn-ov-badge dn-ov-badge--bekle">Hazır</span>';
    if(ds&&ds.durum==='tamam') return '<span class="dn-ov-badge dn-ov-badge--tamam">✓ Tamamlandı</span>';
    if(ds&&ds.durum==='ara') return '<span class="dn-ov-badge dn-ov-badge--ara">Ara</span>';
    return '<span class="dn-ov-badge dn-ov-badge--canli"><span class="dn-nabiz-nokta"></span>Canlı</span>';
  }

  function segmentlerHtml(ds){
    if(!ds||!ds.takvim||!ds.takvim.length) return '';
    return '<div class="dn4-segments">'+ds.takvim.map(function(t){return '<div class="dn4-seg dn4-seg--'+t.durum+'"><div class="dn4-seg-icon">'+t.ikon+'</div><div><b>'+t.ad+'</b><span>'+t.bas+'–'+t.bit+' · '+dkMetin(t.sureDk)+'</span></div></div>';}).join('')+'</div>';
  }

  window._sayacOvGuncelle=function(){
    var d=(typeof denemeSinavlari!=='undefined'?denemeSinavlari:[]).find(function(x){return x.id===window._sayacOvId;});
    if(!d) return;
    var ds=window._sayacDurum(d);
    var aktif=!!(d.sayacDurumu&&d.sayacDurumu.aktif);
    var yetki=typeof _sayacKontrolYetkisiVarMi==='function'?_sayacKontrolYetkisiVarMi(d):false;
    var btn=document.getElementById('dnSayacBtnBaslat');
    if(btn){
      btn.disabled=false;
      if(!aktif){
        btn.textContent='▶ Başlat'; btn.className='dn-sayac-btn dn-sayac-btn--basla'; btn.onclick=function(){window._sayacBaslat(d.id);};
        var gecerli=toplamSureDk(d)>0 && d.tarih===bugunISO();
        btn.style.display=yetki?'':'none'; btn.disabled=!gecerli;
        if(!gecerli) btn.title=toplamSureDk(d)<=0?'Sınav süresi eksik':'Sınav tarihi bugün değil';
      }else{
        btn.textContent='■ Durdur'; btn.className='dn-sayac-btn dn-sayac-btn--durdur'; btn.onclick=function(){if(typeof _sayacDurdur==='function')_sayacDurdur(d.id);}; btn.style.display=yetki?'':'none';
      }
    }
    var badge=document.getElementById('dnSayacDurumBadge'); if(badge)badge.innerHTML=durumBadge(ds,aktif);
    var ana=document.getElementById('dnSayacAna'); if(!ana)return;

    if(!aktif){
      var sorun=toplamSureDk(d)<=0;
      ana.innerHTML='<div class="dn4-ready '+(sorun?'dn4-ready--error':'')+'"><div class="dn4-ready-icon">'+(sorun?'!':'▶')+'</div><div class="dn4-ready-copy"><h3>'+(sorun?'Sınav süresi eksik':'Sayaç hazır')+'</h3><p>'+(sorun?'Bu kayıtta süre 0 dakika. Denemeyi düzenleyip geçerli bir süre girin.':'Sayaç, Başlat butonuna bastığınız anda çalışır. Planlanan saat yalnızca bilgidir.')+'</p></div></div><div class="dn4-info"><span>📅 '+tarihMetni(d.tarih)+'</span><span>🕘 '+(d.baslamaSaati||d.sozelBaslama||'—')+'</span><span>⏱ '+dkMetin(toplamSureDk(d))+'</span></div>';
      var tak=document.getElementById('dnSayacTakvim'); if(tak)tak.innerHTML='';
      return;
    }

    if(ds&&ds.durum==='tamam'){
      ana.innerHTML='<div class="dn4-finished"><div>✓</div><h3>Sınav tamamlandı</h3><p>Toplam süre '+dkMetin((ds.toplamSure||0)/60)+'</p></div>';
    }else if(ds&&ds.durum==='ara'){
      ana.innerHTML='<div class="dn4-live-head"><span>ARA</span><b>'+fmt(ds.kalanSn)+'</b><small>'+ds.sonrakiAd+' '+ds.sonrakiBasStr+' saatinde başlayacak</small></div>'+segmentlerHtml(ds);
    }else if(ds&&ds.durum==='aktif'){
      var yuzde=Math.max(0,Math.min(100,(1-(ds.oran||0))*100));
      ana.innerHTML='<div class="dn4-live-head"><span>'+ds.segIkon+' '+ds.segAd+'</span><b>'+fmt(ds.kalanSn)+'</b><small>Kalan süre · Bitiş '+(ds.bitisStr||'—')+'</small></div><div class="dn4-progress"><i style="width:'+yuzde.toFixed(1)+'%"></i></div>'+segmentlerHtml(ds);
    }else{
      ana.innerHTML='<div class="dn4-ready dn4-ready--error"><div class="dn4-ready-icon">!</div><div class="dn4-ready-copy"><h3>Sayaç bilgisi okunamadı</h3><p>Deneme kaydını düzenleyip süre bilgilerini kontrol edin.</p></div></div>';
    }
    var tak2=document.getElementById('dnSayacTakvim'); if(tak2)tak2.innerHTML='';
  };

  /* Deneme ekle/düzenle modalında 0 dakikalık kayıt oluşmasını engelle. */
  document.addEventListener('click',function(e){
    var btn=e.target.closest('#modalKaydetBtn');
    if(!btn || !document.getElementById('f_dnAd')) return;
    var tur=document.getElementById('f_dnOturum')&&document.getElementById('f_dnOturum').value;
    var ok=true;
    if(tur==='İki Oturum') ok=(Number(document.getElementById('f_dnSozSure')?.value)>0 && Number(document.getElementById('f_dnSaySure')?.value)>0);
    else ok=Number(document.getElementById('f_dnTekSure')?.value)>0;
    if(!ok){e.preventDefault();e.stopImmediatePropagation();if(typeof toast==='function')toast('Sınav süresi 0 olamaz. Geçerli süre girin.');}
  },true);

  new MutationObserver(function(){
    ['f_dnTekSure','f_dnSozSure','f_dnSaySure'].forEach(function(id){var el=document.getElementById(id);if(el){el.min='1';if(el.value==='0')el.value='';}});
  }).observe(document.documentElement,{childList:true,subtree:true});
})();