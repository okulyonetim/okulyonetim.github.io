/* Koruk Asistan — Mesajlaşma Modern v3
   Hafif DOM katmanı + tekrar konuşma koruması. */
(function(){
'use strict';
if(window.__KM_MESSAGING_MODERN_V3__) return;
window.__KM_MESSAGING_MODERN_V3__=true;

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
function svgSearch(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';}
function svgChat(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"/><path d="M8 9h8M8 13h5"/></svg>';}
function anaKapsayici(list){return list.closest('[id^="tab-"]')||list.closest('.tab-content')||list.closest('.tab-panel')||list.parentElement;}
function kartlar(list){return $$('.konusma-karti',list).filter(k=>k.style.display!=='none'||!k.dataset.kmDuplicate);}
function okunmamis(k){return !!k.querySelector('.konusma-baslik.okunmamis,.konusma-onizleme.okunmamis,.badge-red');}
function grup(k){return (k.querySelector('.konusma-avatar')?.textContent||'').includes('👥');}

function eskiBasligiGizle(root){
  $$('.page-header',root).forEach(h=>{const t=(h.textContent||'').toLocaleLowerCase('tr');if(t.includes('mesaj')&&t.includes('okul içi'))h.classList.add('km-legacy-head');});
  $$('p',root).forEach(p=>{if((p.textContent||'').trim().toLocaleLowerCase('tr')==='okul içi mesajlaşma'){const c=p.closest('.card,.page-header')||p.parentElement;if(c&&c!==root)c.classList.add('km-legacy-head');}});
}
function konusmaIdKarttan(k){const m=(k.getAttribute('onclick')||'').match(/mesajKonusmaAc\(['\"]([^'\"]+)/);return m?m[1]:null;}
function tekillestir(list){
  let data=[];try{data=Array.isArray(konusmalar)?konusmalar:[];}catch(_){return;}
  const ben=(()=>{try{return AKTIF_KULLANICI?.uid||'';}catch(_){return'';}})();
  const byId=new Map(data.map(k=>[k.id,k]));const seen=new Set();
  $$('.konusma-karti',list).forEach(card=>{
    const k=byId.get(konusmaIdKarttan(card));if(!k||k.grupMu){card.dataset.kmDuplicate='';return;}
    const diger=(k.katilimciUidler||[]).filter(x=>x!==ben).sort().join('|');
    const key='p:'+diger;
    if(diger&&seen.has(key)){card.dataset.kmDuplicate='1';card.style.display='none';}
    else{if(diger)seen.add(key);card.dataset.kmDuplicate='';}
  });
}
function sayilariGuncelle(root,list){tekillestir(list);const ks=$$('.konusma-karti',list).filter(k=>k.dataset.kmDuplicate!=='1');const u=ks.filter(okunmamis).length,g=ks.filter(grup).length;const a=$('[data-km-stat="all"] b',root);if(a)a.textContent=ks.length;const b=$('[data-km-stat="unread"] b',root);if(b)b.textContent=u;const c=$('[data-km-stat="groups"] b',root);if(c)c.textContent=g;}
function filtrele(root,list){const q=($('#kmMsgSearch',root)?.value||'').toLocaleLowerCase('tr').trim(),mode=$('.km-msg-filter.active',root)?.dataset.filter||'all';$$('.konusma-karti',list).forEach(k=>{if(k.dataset.kmDuplicate==='1'){k.style.display='none';return;}let ok=!q||(k.textContent||'').toLocaleLowerCase('tr').includes(q);if(mode==='unread')ok=ok&&okunmamis(k);if(mode==='groups')ok=ok&&grup(k);k.style.display=ok?'flex':'none';});}
function eskiYeniMesaj(root){return $$('button',root).find(b=>{const t=(b.textContent||'').toLocaleLowerCase('tr');return t.includes('yeni mesaj')||t.includes('mesaj yaz');});}
function sohbetDurumu(){const ov=$('#detayOverlay');if(!ov)return;let aktif=false;try{aktif=!!_aktifKonusmaId;}catch(_){aktif=false;}ov.classList.toggle('km-chat-mode',aktif&&ov.classList.contains('active'));}

/* Firestore gecikmesinde aynı kişiye art arda birden fazla konuşma oluşturulmasını engelle. */
function servisKorumasiniKur(){
  if(window.__KM_SERVICE_GUARD__||typeof MesajlasmaService==='undefined')return;
  window.__KM_SERVICE_GUARD__=true;
  const uidCache=new Map(),uidBekleyen=new Map(),orjUid=MesajlasmaService._ogretmenUidBul.bind(MesajlasmaService);
  MesajlasmaService._ogretmenUidBul=function(id){
    if(uidCache.has(id))return Promise.resolve(uidCache.get(id));
    if(uidBekleyen.has(id))return uidBekleyen.get(id);
    const p=orjUid(id).then(uid=>{uidCache.set(id,uid||null);uidBekleyen.delete(id);return uid;}).catch(e=>{uidBekleyen.delete(id);throw e;});uidBekleyen.set(id,p);return p;
  };
  const orjBaslat=MesajlasmaService.konusmaBaslatOgretmenIle.bind(MesajlasmaService),bekleyen=new Map();
  MesajlasmaService.konusmaBaslatOgretmenIle=function(id,ad,mevcut,foto){
    if(bekleyen.has(id))return bekleyen.get(id);
    const p=orjBaslat(id,ad,mevcut,foto).finally(()=>bekleyen.delete(id));bekleyen.set(id,p);return p;
  };
}

function yeniKonusmaArayuzunuKur(){
  if(window.__KM_NEW_CHAT_OVERRIDE__)return;
  if(typeof window.yeniKonusmaModalAc!=='function'||typeof window.modalAc!=='function')return;
  window.__KM_NEW_CHAT_OVERRIDE__=true;
  window.yeniKonusmaModalAc=function(){
    const bagli=typeof bagliOgretmenimGetir==='function'?bagliOgretmenimGetir():null;
    const secenekler=(typeof ogretmenler!=='undefined'?ogretmenler:[]).filter(o=>!bagli||o.id!==bagli.id).sort((a,b)=>(a.ad+' '+a.soyad).localeCompare(b.ad+' '+b.soyad,'tr'));
    const esc=window.escapeHtml||((v)=>String(v));
    const body='<div class="km-new-chat"><div class="km-new-chat-icon">💬</div><div><b>Yeni sohbet başlat</b><span>Mesaj göndermek istediğiniz öğretmeni seçin.</span></div></div><div class="form-group km-person-select"><label>Kişi</label><select id="f_mesajKisi"><option value="">Öğretmen seçiniz…</option>'+secenekler.map(o=>'<option value="'+o.id+'" data-ad="'+esc(o.ad+' '+o.soyad)+'" data-foto="'+esc(o.profilFotoUrl||'')+'">'+esc(o.ad+' '+o.soyad)+'</option>').join('')+'</select></div><button type="button" class="km-group-link" onclick="modalKapat();grupOlusturModalAc();">👥 Grup sohbeti oluştur</button>';
    modalAc('Yeni Mesaj',body,async()=>{
      const sel=$('#f_mesajKisi');if(!sel||!sel.value){try{toast('Bir kişi seçin.');}catch(_){}return;}
      const id=sel.value,op=sel.selectedOptions[0],ad=op.dataset.ad,foto=op.dataset.foto;
      const save=$('#modalKaydetBtn');if(save){save.disabled=true;save.textContent='Açılıyor…';}
      /* Modal ağ yanıtını beklerken ekranda kilitli kalmasın. */
      setTimeout(()=>{try{modalKapat();}catch(_){}},60);
      try{
        const konusmaId=await MesajlasmaService.konusmaBaslatOgretmenIle(id,ad,typeof konusmalar!=='undefined'?konusmalar:[],foto);
        let acildi=false;
        for(let i=0;i<12;i++){
          try{if(Array.isArray(konusmalar)&&konusmalar.some(k=>k.id===konusmaId)){mesajKonusmaAc(konusmaId);acildi=true;break;}}catch(_){}
          await new Promise(r=>setTimeout(r,120));
        }
        if(!acildi){try{toast('Sohbet oluşturuldu. Liste birkaç saniye içinde güncellenecek.');}catch(_){}}
      }catch(err){
        const m=err?.message||'';try{if(m==='hesap-yok')toast('Bu öğretmenin uygulamaya bağlı hesabı yok.');else if(m==='kendine-mesaj')toast('Kendinize mesaj gönderemezsiniz.');else if(m!=='yetkisiz')toast('Hata: '+m);}catch(_){}
      }
    },null);
    const ov=$('#modalOverlay');ov?.classList.add('km-message-modal');
  };
}

function kur(){
  const list=$('#mesajKonusmaListesi');if(!list)return false;const root=anaKapsayici(list);if(!root)return false;
  root.classList.add('km-messaging');eskiBasligiGizle(root);servisKorumasiniKur();yeniKonusmaArayuzunuKur();
  if(!$('.km-msg-hero',root)){
    const hero=document.createElement('div');hero.className='km-msg-hero';hero.innerHTML='<div class="km-msg-kicker">MESAJ MERKEZİ</div><h2 class="km-msg-title"><span class="ico">'+svgChat()+'</span><span>Mesajlar</span></h2><p class="km-msg-sub">Sohbetlerinize hızlıca ulaşın, yeni konuşma başlatın ve okunmamış mesajları takip edin.</p><div class="km-msg-stats"><div class="km-msg-stat" data-km-stat="all"><b>0</b><span>Sohbet</span></div><div class="km-msg-stat" data-km-stat="unread"><b>0</b><span>Okunmamış</span></div><div class="km-msg-stat" data-km-stat="groups"><b>0</b><span>Grup</span></div></div>';list.parentNode.insertBefore(hero,list);
    const tools=document.createElement('div');tools.className='km-msg-tools';tools.innerHTML='<label class="km-msg-search">'+svgSearch()+'<input id="kmMsgSearch" type="search" inputmode="search" autocomplete="off" placeholder="Sohbet ara"></label>';hero.parentNode.insertBefore(tools,list);
    const btn=eskiYeniMesaj(root);if(btn){btn.classList.add('km-msg-new');btn.textContent='+ Yeni Mesaj';tools.appendChild(btn);}
    const filters=document.createElement('div');filters.className='km-msg-filters';filters.innerHTML='<button type="button" class="km-msg-filter active" data-filter="all">Tümü</button><button type="button" class="km-msg-filter" data-filter="unread">Okunmamış</button><button type="button" class="km-msg-filter" data-filter="groups">Gruplar</button>';tools.parentNode.insertBefore(filters,list);
    $('#kmMsgSearch',root)?.addEventListener('input',()=>filtrele(root,list));filters.addEventListener('click',e=>{const b=e.target.closest('.km-msg-filter');if(!b)return;$$('.km-msg-filter',filters).forEach(x=>x.classList.toggle('active',x===b));filtrele(root,list);});
    const mo=new MutationObserver(()=>requestAnimationFrame(()=>{sayilariGuncelle(root,list);filtrele(root,list);}));mo.observe(list,{childList:true});
  }
  sayilariGuncelle(root,list);filtrele(root,list);sohbetDurumu();return true;
}

const ov=$('#detayOverlay');if(ov)new MutationObserver(sohbetDurumu).observe(ov,{attributes:true,attributeFilter:['class']});
let tries=0,t=setInterval(()=>{if(kur()||++tries>50)clearInterval(t);},120);
document.addEventListener('click',e=>{if(e.target.closest('.konusma-karti,[onclick*="detayPanelKapat"]'))setTimeout(sohbetDurumu,20);},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',kur,{once:true});else kur();
})();