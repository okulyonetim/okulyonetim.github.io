/* ====================================================================
   KORUK ASİSTAN — HEADER + GİRİŞ EKRANI v2
   Yalnızca UI katmanı. Auth/Firebase fonksiyonlarını değiştirmez.
   ==================================================================== */
(function(){
'use strict';
if(window.__KORUK_AUTH_HEADER_V2__) return;
window.__KORUK_AUTH_HEADER_V2__=true;

const $=(s,r=document)=>r.querySelector(s);
const svg=(ad)=>{
  const map={
    user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>',
    lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="12" x="4" y="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2.1 12s3.6-6 9.9-6 9.9 6 9.9 6-3.6 6-9.9 6-9.9-6-9.9-6Z"/><circle cx="12" cy="12" r="2.6"/></svg>',
    eyeOff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.1A10.8 10.8 0 0 1 12 5c6.3 0 9.9 7 9.9 7a17.8 17.8 0 0 1-2.3 3.2"/><path d="M6.6 6.6C3.7 8.4 2.1 12 2.1 12s3.6 7 9.9 7a9.7 9.7 0 0 0 4.1-.9"/></svg>',
    profile:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    settings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3-1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>',
    theme:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
    logout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>'
  };
  return map[ad]||'';
};

function korumaStiliEkle(){
  if($('#korukHeaderV2Guards'))return;
  const s=document.createElement('style');s.id='korukHeaderV2Guards';s.textContent=`
    .koruk-topbar .topbar-bell,.koruk-topbar .topbar-avatar,.koruk-topbar #topbarGeriBtn{position:relative!important}
    .koruk-topbar #topbarGeriBtn[style*="display:none"],.koruk-topbar #topbarGeriBtn[style*="display: none"]{display:none!important}
    .koruk-topbar-school-logo{width:42px;height:42px;min-width:42px;display:grid;place-items:center;border:0;background:transparent;padding:0;margin:0 3px 0 0}
    .koruk-topbar-school-logo img{width:40px;height:40px;display:block;object-fit:contain;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(20,90,70,.12)}
    .koruk-topbar-page .koruk-topbar-weather{display:flex;align-items:center;gap:5px;margin-top:3px;color:var(--khdr-green);font:800 10px/1.1 Manrope,Inter,sans-serif;white-space:nowrap}
    @media(min-width:1024px){.koruk-topbar-school-logo{display:none!important}}
    @media(max-width:1023px){
      .koruk-topbar-page strong{font-size:13.5px!important}
      .koruk-topbar-page .koruk-topbar-weather{font-size:10px!important}
      .koruk-topbar #topbarHava{display:none!important}
    }
  `;document.head.appendChild(s);
}
function temaIkon(){return document.documentElement.getAttribute('data-theme')==='dark'?'☀️':'🌙'}
function loginTemaDegistir(){
  const html=document.documentElement,koyu=html.getAttribute('data-theme')==='dark';
  if(koyu){html.removeAttribute('data-theme');try{localStorage.setItem('oyTema','light')}catch(_){}}
  else{html.setAttribute('data-theme','dark');try{localStorage.setItem('oyTema','dark')}catch(_){}}
  const b=$('.koruk-login-theme');if(b){b.textContent=temaIkon();b.setAttribute('aria-label',koyu?'Koyu temaya geç':'Açık temaya geç')}
}

function loginKur(){
  const ekran=$('#girisEkrani');if(!ekran||ekran.dataset.korukReady==='2')return !!ekran;
  const kart=$(':scope > .config-box',ekran)||$('.config-box',ekran);if(!kart)return false;
  ekran.dataset.korukReady='2';ekran.classList.add('koruk-login');kart.classList.add('koruk-login-card');
  const shell=document.createElement('div');shell.className='koruk-login-shell';
  const brand=document.createElement('section');brand.className='koruk-login-brand';brand.innerHTML=`
    <div class="koruk-login-mark"><img src="assets/icon-192.png" alt="Koruk İlk-Ortaokulu logosu"><div class="koruk-login-mark-text"><b>Koruk İlkokulu – Ortaokulu</b><span>Okul Yönetim Sistemi</span></div></div>
    <div class="koruk-login-brand-copy"><div class="eyebrow">Koruk Asistan</div><h1>Okul yönetimi, tek bir çalışma alanında.</h1><p>Ders, nöbet, öğrenci, evrak ve okul süreçlerine güvenli hesabınızla erişin.</p></div>
    <div class="koruk-login-brand-foot"><i></i><span>Yetkili kullanıcı erişimi · Koruk İlk-Ortaokulu</span></div>`;
  ekran.insertBefore(shell,kart);shell.appendChild(brand);shell.appendChild(kart);
  const h2=$('h2',kart);if(h2)h2.textContent='Hesabınıza giriş yapın';
  const ilkP=$('p',kart);if(ilkP)ilkP.textContent='Kullanıcı adınız ve şifrenizle devam edin.';
  const kullanici=$('#girisKullaniciAdi',kart),sifre=$('#girisSifre',kart);
  if(kullanici){kullanici.placeholder='Kullanıcı adınız';kullanici.setAttribute('spellcheck','false');kullanici.setAttribute('aria-label','Kullanıcı adı')}
  if(sifre){sifre.placeholder='Şifreniz';sifre.setAttribute('aria-label','Şifre')}
  [[kullanici,'user'],[sifre,'lock']].forEach(([input,ikon])=>{
    if(!input||input.parentElement?.classList.contains('koruk-login-input'))return;
    const wrap=document.createElement('div');wrap.className='koruk-login-input';input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
    const ico=document.createElement('span');ico.className='koruk-field-icon';ico.innerHTML=svg(ikon);wrap.insertBefore(ico,input);
    if(input===sifre){const btn=document.createElement('button');btn.type='button';btn.className='koruk-password-toggle';btn.innerHTML=svg('eye');btn.title='Şifreyi göster';btn.setAttribute('aria-label','Şifreyi göster');btn.addEventListener('click',()=>{const acik=sifre.type==='text';sifre.type=acik?'password':'text';btn.innerHTML=svg(acik?'eye':'eyeOff');btn.title=acik?'Şifreyi göster':'Şifreyi gizle';btn.setAttribute('aria-label',btn.title)});wrap.appendChild(btn)}
  });
  const tema=document.createElement('button');tema.type='button';tema.className='koruk-login-theme';tema.textContent=temaIkon();tema.title='Açık/Koyu tema';tema.setAttribute('aria-label','Açık/Koyu tema');tema.addEventListener('click',loginTemaDegistir);shell.appendChild(tema);
  return true;
}

function temizMetin(v){return String(v||'').replace(/[🏠📚🛡️📋👥🎓🚌📁⚙️🔎📊📝📅📣🗺️⭐🎗️📌🧾🏫]/g,'').trim()}
function aktifSayfaAdi(){
  const panel=$('.tab-panel.active');if(!panel||!panel.id)return'Koruk İlk-Ortaokulu';
  const tab=panel.id.replace(/^tab-/,'');if(tab==='panel')return'Koruk İlk-Ortaokulu';
  const esc=(window.CSS&&typeof CSS.escape==='function')?CSS.escape(tab):tab.replace(/[^a-zA-Z0-9_-]/g,'');
  const nav=document.querySelector(`.nav-tab[data-tab="${esc}"] .nt-label`);if(nav&&nav.textContent.trim())return temizMetin(nav.textContent);
  const baslik=$('.page-title',panel)||$('h2',panel);return baslik&&baslik.textContent.trim()?temizMetin(baslik.textContent):'Koruk Asistan';
}
function havaMetniOku(){
  const h=$('#topbarHava');
  if(h&&h.textContent.trim())return h.textContent.replace(/\s+/g,' ').trim().replace(/°(?!C)/,'°C');
  const hero=$('.hero-hava-sicaklik');
  return hero&&hero.textContent.trim()?('🌡️ '+hero.textContent.trim()):'Hava durumu yükleniyor';
}
function headerBaslikGuncelle(){
  const el=$('#korukTopbarPage');if(el){const ad=aktifSayfaAdi();if(el.textContent!==ad)el.textContent=ad}
  const h=$('#korukTopbarWeather');if(h){const metin=havaMetniOku();if(h.textContent!==metin)h.textContent=metin}
}
function profilMenuKapat(){const m=$('.koruk-user-menu');if(m)m.classList.remove('acik')}
function profilAc(){try{if(typeof AltNav!=='undefined'&&AltNav&&typeof AltNav.profilAc==='function'){AltNav.profilAc();return}}catch(_){}try{if(typeof profilVeyaSecimAc==='function')profilVeyaSecimAc()}catch(_){} }
function ayarlarAc(){try{if(typeof sekmeAc==='function')sekmeAc('ayarlar')}catch(_){}profilMenuKapat()}
function cikis(){try{if(typeof cikisYap==='function')cikisYap()}catch(_){} }
function uygulamaTemaDegistir(){const b=$('#temaDugmesiTopbar')||$('#temaDugmesi');if(b){b.click();return}loginTemaDegistir()}
function metinAyarla(el,v){if(el&&el.textContent!==v)el.textContent=v}
function hesapBilgisiGuncelle(){
  const ad=($('#hesapAd')?.textContent||'').trim()||'Kullanıcı',kullanici=($('#hesapEmail')?.textContent||'').trim();
  metinAyarla($('.koruk-user-menu-head b'),ad);metinAyarla($('.koruk-user-menu-head span'),kullanici);metinAyarla($('.koruk-header-user-name'),ad);
  const src=$('#hesapAvatar')?.getAttribute('src'),avatar=$('#topbarAvatar');
  if(avatar&&src&&avatar.dataset.korukAvatarSrc!==src){avatar.dataset.korukAvatarSrc=src;avatar.innerHTML=`<img src="${src.replace(/"/g,'&quot;')}" alt=""><span class="koruk-avatar-status"></span>`}
}

function okulLogosuKur(top){
  if(!top||$('#korukTopbarSchoolLogo',top))return;
  const hamburger=$('#topbarHamburger',top);if(!hamburger)return;
  const logo=document.createElement('div');logo.id='korukTopbarSchoolLogo';logo.className='koruk-topbar-school-logo';
  logo.innerHTML='<img src="assets/icon-192.png" alt="Koruk İlk-Ortaokulu logosu">';
  hamburger.replaceWith(logo);
}
function headerKur(){
  const top=$('.topbar');if(!top)return false;top.classList.add('koruk-topbar');
  okulLogosuKur(top);
  const brand=$('.topbar-brand',top),brandTitle=$('.topbar-title',top);if(brandTitle&&brandTitle.textContent!=='Koruk Asistan')brandTitle.textContent='Koruk Asistan';
  if(!$('.koruk-topbar-page',top)){const page=document.createElement('div');page.className='koruk-topbar-page';page.innerHTML='<strong id="korukTopbarPage">Koruk İlk-Ortaokulu</strong><span class="koruk-topbar-weather" id="korukTopbarWeather">Hava durumu yükleniyor</span>';if(brand)brand.insertAdjacentElement('afterend',page);else{const logo=$('#korukTopbarSchoolLogo',top);if(logo)logo.insertAdjacentElement('afterend',page);else top.prepend(page)}}
  const bildirim=$('#bildirimZiliPaneli');if(bildirim)bildirim.classList.add('koruk-notification-panel');
  const avatar=$('#topbarAvatar');
  if(avatar&&!avatar.closest('.koruk-user-menu-wrap')){
    const wrap=document.createElement('div');wrap.className='koruk-user-menu-wrap';avatar.parentNode.insertBefore(wrap,avatar);wrap.appendChild(avatar);
    const name=document.createElement('span');name.className='koruk-header-user-name';wrap.insertBefore(name,avatar);
    const menu=document.createElement('div');menu.className='koruk-user-menu';menu.innerHTML=`<div class="koruk-user-menu-head"><b>Kullanıcı</b><span></span></div><button type="button" data-kmenu="profile">${svg('profile')}<span>Profilim</span></button><button type="button" data-kmenu="settings">${svg('settings')}<span>Ayarlar</span></button><button type="button" data-kmenu="theme">${svg('theme')}<span>Temayı Değiştir</span></button><button type="button" class="koruk-menu-danger" data-kmenu="logout">${svg('logout')}<span>Çıkış Yap</span></button>`;wrap.appendChild(menu);
    avatar.removeAttribute('onclick');avatar.addEventListener('click',e=>{e.stopPropagation();menu.classList.toggle('acik')});
    menu.addEventListener('click',e=>{const b=e.target.closest('[data-kmenu]');if(!b)return;e.stopPropagation();const a=b.dataset.kmenu;if(a==='profile'){profilMenuKapat();profilAc()}else if(a==='settings')ayarlarAc();else if(a==='theme'){uygulamaTemaDegistir();profilMenuKapat()}else if(a==='logout')cikis()});
    document.addEventListener('click',e=>{if(!wrap.contains(e.target))profilMenuKapat()});document.addEventListener('keydown',e=>{if(e.key==='Escape')profilMenuKapat()});
  }
  headerBaslikGuncelle();hesapBilgisiGuncelle();return true;
}

let raf=0;
function yenilePlanla(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;headerBaslikGuncelle();hesapBilgisiGuncelle()})}
function gozlemKur(){
  if(window.__KORUK_HEADER_V2_OBSERVERS__)return;window.__KORUK_HEADER_V2_OBSERVERS__=true;
  document.querySelectorAll('.tab-panel').forEach(p=>new MutationObserver(yenilePlanla).observe(p,{attributes:true,attributeFilter:['class']}));
  const hesap=$('#sidebarHesap');if(hesap)new MutationObserver(yenilePlanla).observe(hesap,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['src','style']});
  const hava=$('#topbarHava');if(hava)new MutationObserver(yenilePlanla).observe(hava,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style']});
  document.addEventListener('click',e=>{if(e.target.closest('.nav-tab,[data-tab]'))setTimeout(yenilePlanla,20)},true);window.addEventListener('hashchange',yenilePlanla);
}
function baslat(){korumaStiliEkle();loginKur();headerKur();gozlemKur()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',baslat,{once:true});else baslat();
[120,450,1000,1900].forEach(ms=>setTimeout(()=>{loginKur();headerKur();yenilePlanla()},ms));
})();