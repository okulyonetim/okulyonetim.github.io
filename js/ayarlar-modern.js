/* Koruk Asistan — Ayarlar Merkezi v2 */
(function(){
  'use strict';

  const KALDIRILACAK_BASLIKLAR=['Anasayfa Düzeni','Ana Sayfa Düzeni','Tema','Optik Puan Referans Ayarları'];
  const META={
    'Şifremi Değiştir':{icon:'lock',sub:'Hesabınızın şifresini güvenli şekilde güncelleyin',tone:'blue'},
    'Ders Saatleri':{icon:'clock',sub:'Ders başlangıç, bitiş ve teneffüs saatlerini yönetin',tone:'blue'},
    'Ders Listesi':{icon:'book',sub:'Dersleri ekleyin, düzenleyin ve sıralayın',tone:'teal'},
    'Branş Listesi':{icon:'cap',sub:'Öğretmen branş alanlarını yönetin',tone:'violet'},
    'Hatırlatma Sistemi':{icon:'bell',sub:'Otomatik hatırlatma kurallarını ve zamanlamayı yönetin',tone:'amber'},
    'Depolama Sınırları':{icon:'database',sub:'Dosya kategorileri ve kullanıcı kota sınırlarını yönetin',tone:'cyan'},
    'Özel Menü Grupları':{icon:'grid',sub:'Alt menüde özel modül grupları oluşturun',tone:'violet'}
  };
  const PATHS={
    lock:'<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v2"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z"/>',
    cap:'<path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
  };
  function svg(name){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(PATHS[name]||PATHS.grid)+'</svg>'}
  function normalize(s){return String(s||'').replace(/\s+/g,' ').trim()}
  function baslikMetni(item){const h=item.querySelector('.accordion-header span:first-child');return normalize(h?h.textContent.replace(/^[^\p{L}\p{N}]+/u,''):'')}

  function gereksizleriKaldir(root){
    root.querySelectorAll('.accordion-item').forEach(function(item){const text=baslikMetni(item);if(KALDIRILACAK_BASLIKLAR.some(function(x){return text===x||text.includes(x)}))item.remove()});
    root.querySelectorAll('.card').forEach(function(card){if(!normalize(card.textContent)&&!card.querySelector('input,select,textarea,button,[id]'))card.remove()});
  }
  function grupEtiketiOlustur(text,once){if(!once||!once.parentNode)return;const prev=once.previousElementSibling;if(prev&&prev.classList.contains('ayarlar-modern-group-label'))return;const el=document.createElement('div');el.className='ayarlar-modern-group-label';el.textContent=text;once.parentNode.insertBefore(el,once)}
  function gruplandir(root){const items=[].slice.call(root.children).filter(function(el){return el.classList&&el.classList.contains('accordion-item')});const sifre=items.find(x=>baslikMetni(x).includes('Şifremi Değiştir'));const ders=items.find(x=>baslikMetni(x)==='Ders Saatleri');const hat=items.find(x=>baslikMetni(x).includes('Hatırlatma Sistemi'));if(sifre)grupEtiketiOlustur('Hesap ve güvenlik',sifre);if(ders)grupEtiketiOlustur('Akademik yapı',ders);if(hat)grupEtiketiOlustur('Sistem yönetimi',hat)}
  function baslikDuzenle(root){const title=root.querySelector(':scope > .page-header .page-title');const sub=root.querySelector(':scope > .page-header .page-sub');if(title)title.textContent='Ayarlar Merkezi';if(sub)sub.textContent='Hesap, ders yapısı, hatırlatmalar ve sistem yönetimi'}

  function basliklariZenginlestir(root){
    root.querySelectorAll('.accordion-item').forEach(function(item){
      if(item.dataset.ayarMeta==='1')return;
      const header=item.querySelector(':scope > .accordion-header');if(!header)return;
      const ad=baslikMetni(item), meta=META[ad]||{icon:'grid',sub:'Bu bölüme ait ayarları yönetin',tone:'blue'};
      const first=header.querySelector('span:first-child'); if(!first)return;
      first.className='ayarlar-head-main';
      first.innerHTML='<span class="ayarlar-icon tone-'+meta.tone+'">'+svg(meta.icon)+'</span><span class="ayarlar-head-copy"><strong>'+ad+'</strong><small>'+meta.sub+'</small></span>';
      item.dataset.ayarMeta='1';
    });
  }
  function icerigiZenginlestir(root){
    root.querySelectorAll('.accordion-content').forEach(function(content){
      if(content.dataset.ayarContent==='1')return;
      const ilkP=content.querySelector(':scope > p:first-child');
      if(ilkP){ilkP.classList.add('ayarlar-info');ilkP.innerHTML='<span class="ayarlar-info-dot">i</span><span>'+ilkP.innerHTML+'</span>'}
      content.querySelectorAll('button').forEach(function(btn){if(!btn.classList.contains('accordion-header'))btn.classList.add('ayarlar-action')});
      content.querySelectorAll('hr').forEach(function(hr){hr.classList.add('ayarlar-divider')});
      content.dataset.ayarContent='1';
    });
  }
  function listeKutulariniIsaretle(root){['dersListesiYonetim','bransListesiYonetim','hatirlatmaAyarForm','depolamaAyarForm'].forEach(function(id){const el=root.querySelector('#'+id);if(el)el.classList.add('ayarlar-managed-list')})}

  function modernlestir(){
    const root=document.getElementById('tab-ayarlar');if(!root)return false;
    root.classList.add('ayarlar-modern');baslikDuzenle(root);gereksizleriKaldir(root);gruplandir(root);basliklariZenginlestir(root);icerigiZenginlestir(root);listeKutulariniIsaretle(root);
    root.querySelectorAll('.accordion-content.open').forEach(function(el){const parent=el.closest('.accordion-item');if(parent&&baslikMetni(parent)!=='Şifremi Değiştir')el.classList.remove('open')});
    return true;
  }
  function baslat(){
    if(!modernlestir()){const obs=new MutationObserver(function(){if(modernlestir())obs.disconnect()});obs.observe(document.documentElement,{childList:true,subtree:true});setTimeout(function(){obs.disconnect();modernlestir()},8000);return}
    const root=document.getElementById('tab-ayarlar');if(root){new MutationObserver(function(){basliklariZenginlestir(root);icerigiZenginlestir(root);listeKutulariniIsaretle(root)}).observe(root,{childList:true,subtree:true})}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',baslat,{once:true});else baslat();
})();