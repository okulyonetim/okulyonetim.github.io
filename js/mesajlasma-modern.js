/* Koruk Asistan — Mesajlaşma Modern v1
   Veri/servis katmanına dokunmaz. Mevcut mesajlasma.js DOM'unu güvenli biçimde zenginleştirir. */
(function(){
  'use strict';
  if(window.__KM_MESSAGING_MODERN__) return;
  window.__KM_MESSAGING_MODERN__=true;

  function svgSearch(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';}
  function svgChat(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"/><path d="M8 9h8M8 13h5"/></svg>';}

  function anaKapsayici(list){
    return list.closest('[id^="tab-"]') || list.closest('.tab-content') || list.closest('.tab-panel') || list.parentElement;
  }
  function kartlar(list){return Array.from(list.querySelectorAll('.konusma-karti'));}
  function okunmamis(k){return !!k.querySelector('.konusma-baslik.okunmamis,.konusma-onizleme.okunmamis,.badge-red');}
  function grup(k){var av=(k.querySelector('.konusma-avatar')?.textContent||'').trim();return av.includes('👥');}

  function sayilariGuncelle(root,list){
    var ks=kartlar(list), unread=ks.filter(okunmamis).length, groups=ks.filter(grup).length;
    var a=root.querySelector('[data-km-stat="all"] b');if(a)a.textContent=String(ks.length);
    var u=root.querySelector('[data-km-stat="unread"] b');if(u)u.textContent=String(unread);
    var g=root.querySelector('[data-km-stat="groups"] b');if(g)g.textContent=String(groups);
  }
  function filtrele(root,list){
    var q=(root.querySelector('#kmMsgSearch')?.value||'').toLocaleLowerCase('tr').trim();
    var mode=root.querySelector('.km-msg-filter.active')?.dataset.filter||'all';
    kartlar(list).forEach(function(k){
      var text=(k.textContent||'').toLocaleLowerCase('tr');
      var ok=!q||text.includes(q);
      if(mode==='unread')ok=ok&&okunmamis(k);
      if(mode==='groups')ok=ok&&grup(k);
      k.style.display=ok?'flex':'none';
    });
  }
  function mevcutYeniMesajButonu(root){
    return Array.from(root.querySelectorAll('button')).find(function(b){var t=(b.textContent||'').toLocaleLowerCase('tr');return t.includes('yeni mesaj')||t.includes('mesaj yaz');});
  }

  function kur(){
    var list=document.getElementById('mesajKonusmaListesi');
    if(!list)return false;
    var root=anaKapsayici(list);if(!root)return false;
    root.classList.add('km-messaging');
    if(root.querySelector('.km-msg-hero')){sayilariGuncelle(root,list);return true;}

    var hero=document.createElement('div');hero.className='km-msg-hero';
    hero.innerHTML='<div class="km-msg-kicker">KORUK İLETİŞİM</div><h2 class="km-msg-title"><span class="ico">'+svgChat()+'</span><span>Mesajlar</span></h2><p class="km-msg-sub">Bireysel ve grup konuşmalarınızı tek ekrandan yönetin. Yeni mesajlar ve okunmamış sohbetler öne çıkarılır.</p><div class="km-msg-stats"><div class="km-msg-stat" data-km-stat="all"><b>0</b><span>Sohbet</span></div><div class="km-msg-stat" data-km-stat="unread"><b>0</b><span>Okunmamış</span></div><div class="km-msg-stat" data-km-stat="groups"><b>0</b><span>Grup</span></div></div>';
    list.parentNode.insertBefore(hero,list);

    var tools=document.createElement('div');tools.className='km-msg-tools';tools.innerHTML='<label class="km-msg-search">'+svgSearch()+'<input id="kmMsgSearch" type="search" inputmode="search" autocomplete="off" placeholder="Sohbetlerde ara"></label>';
    hero.parentNode.insertBefore(tools,list);
    var eskiBtn=mevcutYeniMesajButonu(root);
    if(eskiBtn){eskiBtn.classList.add('km-msg-new');tools.appendChild(eskiBtn);}

    var filters=document.createElement('div');filters.className='km-msg-filters';filters.innerHTML='<button type="button" class="km-msg-filter active" data-filter="all">Tümü</button><button type="button" class="km-msg-filter" data-filter="unread">Okunmamış</button><button type="button" class="km-msg-filter" data-filter="groups">Gruplar</button>';
    tools.parentNode.insertBefore(filters,list);
    root.querySelector('#kmMsgSearch').addEventListener('input',function(){filtrele(root,list);});
    filters.addEventListener('click',function(e){var b=e.target.closest('.km-msg-filter');if(!b)return;filters.querySelectorAll('.km-msg-filter').forEach(function(x){x.classList.toggle('active',x===b);});filtrele(root,list);});

    var mo=new MutationObserver(function(){sayilariGuncelle(root,list);filtrele(root,list);});
    mo.observe(list,{childList:true,subtree:true});
    sayilariGuncelle(root,list);
    return true;
  }

  function sohbetDurumu(){
    var ov=document.getElementById('detayOverlay');if(!ov)return;
    var aktif=false;
    try{aktif=!!(typeof _aktifKonusmaId!=='undefined'&&_aktifKonusmaId);}catch(_){aktif=false;}
    ov.classList.toggle('km-chat-mode',aktif&&ov.classList.contains('active'));
  }

  var n=0,t=setInterval(function(){if(kur()||++n>120)clearInterval(t);},100);
  document.addEventListener('click',function(e){
    if(e.target.closest('.konusma-karti'))setTimeout(sohbetDurumu,40);
    if(e.target.closest('#detayOverlay button,[onclick*="detayPanelKapat"],[onclick*="detayKapat"]'))setTimeout(sohbetDurumu,40);
  },true);
  var bodyMo=new MutationObserver(function(){sohbetDurumu();kur();});
  bodyMo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){kur();sohbetDurumu();},{once:true});else{kur();sohbetDurumu();}
})();
