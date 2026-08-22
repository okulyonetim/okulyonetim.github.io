/* Koruk Asistan — Ayarlar Merkezi v1 */
(function(){
  'use strict';

  const KALDIRILACAK_BASLIKLAR = [
    'Anasayfa Düzeni',
    'Ana Sayfa Düzeni',
    'Tema',
    'Optik Puan Referans Ayarları'
  ];

  function normalize(s){
    return String(s||'').replace(/\s+/g,' ').trim();
  }

  function baslikMetni(item){
    const h=item.querySelector('.accordion-header span:first-child');
    return normalize(h ? h.textContent.replace(/^[^\p{L}\p{N}]+/u,'') : '');
  }

  function gereksizleriKaldir(root){
    root.querySelectorAll('.accordion-item').forEach(function(item){
      const text=baslikMetni(item);
      if(KALDIRILACAK_BASLIKLAR.some(function(x){ return text===x || text.includes(x); })){
        item.remove();
      }
    });
    root.querySelectorAll('.card').forEach(function(card){
      if(!normalize(card.textContent) && !card.querySelector('input,select,textarea,button,[id]')) card.remove();
    });
  }

  function grupEtiketiOlustur(text, once){
    if(!once || !once.parentNode) return;
    const prev=once.previousElementSibling;
    if(prev && prev.classList.contains('ayarlar-modern-group-label')) return;
    const el=document.createElement('div');
    el.className='ayarlar-modern-group-label';
    el.textContent=text;
    once.parentNode.insertBefore(el,once);
  }

  function gruplandir(root){
    const items=[].slice.call(root.children).filter(function(el){return el.classList && el.classList.contains('accordion-item');});
    const sifre=items.find(function(x){return baslikMetni(x).includes('Şifremi Değiştir');});
    const ders=items.find(function(x){return baslikMetni(x)==='Ders Saatleri';});
    const hat=items.find(function(x){return baslikMetni(x).includes('Hatırlatma Sistemi');});
    if(sifre) grupEtiketiOlustur('Hesap ve güvenlik',sifre);
    if(ders) grupEtiketiOlustur('Akademik yapı',ders);
    if(hat) grupEtiketiOlustur('Sistem yönetimi',hat);
  }

  function baslikDuzenle(root){
    const title=root.querySelector(':scope > .page-header .page-title');
    const sub=root.querySelector(':scope > .page-header .page-sub');
    if(title) title.textContent='Ayarlar Merkezi';
    if(sub) sub.textContent='Hesap, ders yapısı, hatırlatmalar ve sistem yönetimi';
  }

  function modernlestir(){
    const root=document.getElementById('tab-ayarlar');
    if(!root) return false;
    root.classList.add('ayarlar-modern');
    baslikDuzenle(root);
    gereksizleriKaldir(root);
    gruplandir(root);
    root.querySelectorAll('.accordion-content.open').forEach(function(el){
      const parent=el.closest('.accordion-item');
      if(parent && baslikMetni(parent)!=='Şifremi Değiştir') el.classList.remove('open');
    });
    return true;
  }

  function baslat(){
    if(modernlestir()) return;
    const obs=new MutationObserver(function(){ if(modernlestir()) obs.disconnect(); });
    obs.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(function(){obs.disconnect();modernlestir();},8000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',baslat,{once:true});
  else baslat();
})();
