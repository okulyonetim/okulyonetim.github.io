/* Koruk Asistan — İdareci Pano (ekran)
 * Okulun anlık durumunu tek sayfada toplar: şu an, nöbetçiler, gelmeyenler, sınıflar, öğretmenler, ders programları, takvim,
 * terfi, belirli günler, Dilimizin Zenginlikleri eylem planı, yaklaşanlar, rehber öğretmenler. Veri yeni bir kayıt açmadan uygulamadaki koleksiyonlardan okunur;
 * mantık idareci-pano-core.js içindedir. Kart seçimi/sırası/TV süresi ve takvim notları KaPrefs ile (cihaz + hesap) saklanır.
 */
(function(global){
'use strict';
if(global.IdareciPano)return;

const C=()=>global.IdareciPanoCore;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const toast=m=>global.toast?.(m);
const upper=v=>String(v??'').toLocaleUpperCase('tr');
const pad=n=>String(n).padStart(2,'0');
const PREF_KEY='idareciPano',NOTE_KEY='idareciPanoNotlar';
const WATCH=['ogretmenler','siniflar','dersProgrami','nobetAtamalari','nobetYerleri','ogretmenIzinleri','sinavlar','denemeSinavlari','toplantiCizelgesi','belirliGunler','hatirlaticilar','duyurular','okulBilgileri','appConfig','dersSaatleri'];
const SYNC=['ogretmenler','siniflar','dersProgrami','dersSaatleri','nobetAtamalari','nobetYerleri','ogretmenIzinleri','sinavlar','denemeSinavlari','duyurular','hatirlaticilar'];

/* ── kart kataloğu ── */
const KARTLAR=[
 {id:'sunan',ad:'Şu an',w:6,ico:'clock'},
 {id:'nobet',ad:'Bugünün nöbetçileri',w:3,ico:'shield'},
 {id:'gelmeyen',ad:'Bugün gelmeyenler',w:3,ico:'userx'},
 {id:'siniflar',ad:'Sınıflarda şu an',w:8,ico:'school'},
 {id:'ogretmenler',ad:'Öğretmenler',w:4,ico:'users'},
 {id:'program',ad:'Ders programları',w:8,ico:'cal'},
 {id:'takvim',ad:'Takvim',w:4,ico:'cal'},
 {id:'terfi',ad:'Terfisi yaklaşan ve geçen personel',w:4,ico:'trend'},
 {id:'gunler',ad:'Belirli gün ve haftalar',w:4,ico:'flag'},
 {id:'dilimiz',ad:'Dilimizin Zenginlikleri',w:6,ico:'book'},
 {id:'yaklasan',ad:'Yaklaşanlar',w:4,ico:'bell'},
 {id:'gununsozleri',ad:'Günün Ayeti / Hadisi / Özlü Sözü',w:6,ico:'quote'},
 {id:'rehber',ad:'Sınıf rehber öğretmenleri',w:12,ico:'users'}
];
const KIDS=KARTLAR.map(k=>k.id);
const KMAP=Object.fromEntries(KARTLAR.map(k=>[k.id,k]));
const SURELER=[10,20,30,60];
const TV_SAYFALAR=[['sunan','nobet','siniflar','gelmeyen','gunler'],['takvim','yaklasan','terfi'],['ogretmenler','dilimiz','gununsozleri'],['rehber']];

const P='fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const svg=(d,s=18)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" ${P}>${d}</svg>`;
const ICON={
 clock:svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
 shield:svg('<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>'),
 userx:svg('<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><path d="M17 9l4 4m0-4l-4 4"/>'),
 school:svg('<path d="M3 10l9-6 9 6v10H3z"/><path d="M9 20v-6h6v6"/>'),
 users:svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 2.8-6 6.5-6s6.5 2.5 6.5 6"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14c2 .6 3.5 2.6 3.5 6"/>'),
 cal:svg('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
 trend:svg('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
 flag:svg('<path d="M5 21V4m0 0h12l-2 4 2 4H5"/>'),
 book:svg('<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21V5M9 8h6M9 12h6"/>'),
 bell:svg('<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>'),
 warn:svg('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',16),
 cup:svg('<path d="M4 8h12v5a5 5 0 01-5 5H9a5 5 0 01-5-5z"/><path d="M16 9h2a2 2 0 010 4h-2M7 3v2M11 3v2"/>'),
 full:svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
 moon:svg('<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>'),
 sliders:svg('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
 refresh:svg('<path d="M20 11a8 8 0 00-14.5-3.5L4 9M4 4v5h5M4 13a8 8 0 0014.5 3.5L20 15M20 20v-5h-5"/>'),
 share:svg('<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>'),
 prev:svg('<path d="M15 6l-6 6 6 6"/>',16),
 next:svg('<path d="M9 6l6 6-6 6"/>',16),
 up:svg('<path d="M6 15l6-6 6 6"/>',16),
 down:svg('<path d="M6 9l6 6 6-6"/>',16),
 close:svg('<path d="M6 6l12 12M18 6L6 18"/>'),
 x:svg('<path d="M6 6l12 12M18 6L6 18"/>',14),
 quote:svg('<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>')
};

/* ── durum ── */
const S={cfg:null,notes:null,prog:{tur:'ogretmen',id:''},calY:0,calM:0,calSel:'',rehberK:'tum',rehberQ:'',noteDraft:'',draft:null,tv:false,tvFs:false,tvPage:0,liveKey:'',readAt:null,sozAt:0,sozTimer:0};
let mounted=null,timer=0,tvTimer=0,renderQ=0,unsubs=[],wake=null,M=null;

/* ── tercihler (KaPrefs: cihaz + hesap) ── */
function normCfg(o){
 const seen=new Set(),sira=[];
 (Array.isArray(o?.sira)?o.sira:[]).forEach(id=>{if(KIDS.includes(id)&&!seen.has(id)){seen.add(id);sira.push(id)}});
 KIDS.forEach(id=>{if(!seen.has(id))sira.push(id)});
 const kapali=Array.isArray(o?.kapali)?[...new Set(o.kapali.filter(id=>KIDS.includes(id)))]:['rehber'];
 return{sira,kapali,sure:SURELER.includes(Number(o?.sure))?Number(o.sure):20,t:Number(o?.t)||0};
}
function parse(s){try{const v=JSON.parse(s||'null');return v&&typeof v==='object'?v:null}catch(_){return null}}
const readCfg=()=>normCfg(parse(global.KaPrefs?.get?.(PREF_KEY,'')));
function saveCfg(c){
 S.cfg=normCfg({...c,t:Date.now()});
 const txt=JSON.stringify(S.cfg);
 global.KaPrefs?.set?.(PREF_KEY,txt);global.KaPrefs?.remoteSet?.({[PREF_KEY]:txt});
}
const readNotes=()=>{const o=parse(global.KaPrefs?.get?.(NOTE_KEY,''));return{t:Number(o?.t)||0,g:o&&o.g&&typeof o.g==='object'?o.g:{}}};
function saveNotes(){
 const keep=C().isoOf(new Date(Date.now()-90*864e5));
 Object.keys(S.notes.g).forEach(k=>{if(k<keep||!S.notes.g[k]?.length)delete S.notes.g[k]});
 S.notes.t=Date.now();
 const txt=JSON.stringify(S.notes);
 global.KaPrefs?.set?.(NOTE_KEY,txt);global.KaPrefs?.remoteSet?.({[NOTE_KEY]:txt});
}
function hydrateRemote(){
 const g=global.KaPrefs?.remoteGet?.();if(!g)return;
 g.then(x=>{
  if(!x||!mounted)return;
  const c=parse(x[PREF_KEY]);if(c&&Number(c.t)>S.cfg.t){S.cfg=normCfg(c);global.KaPrefs?.set?.(PREF_KEY,JSON.stringify(S.cfg))}
  const n=parse(x[NOTE_KEY]);if(n&&Number(n.t)>S.notes.t){S.notes={t:Number(n.t),g:n.g&&typeof n.g==='object'?n.g:{}};global.KaPrefs?.set?.(NOTE_KEY,JSON.stringify(S.notes))}
  queue();
 }).catch(()=>{});
}
const aktifler=()=>S.cfg.sira.filter(id=>!S.cfg.kapali.includes(id));

/* ── model ── */
function okulAdi(){const l=rows('okulBilgileri'),x=l.find(r=>r.id==='ayarlar')||l[0]||global.okulBilgileriAyari||{};return String(x.okulAdi||x.ad||'Koruk İlkokulu - Ortaokulu')}
function ozelGunListesi(){
 const chosen=rows('belirliGunler'),key=x=>`${String(x.ad||'').trim().toLocaleLowerCase('tr')}|${String(x.tarihBaslangic||'').slice(0,10)}`,have=new Set(chosen.map(key));
 const official=(global.BelirliGunlerCatalog?.resmiGunler?.()||[]).filter(x=>!have.has(key(x))).map(x=>({...x,resmi:true}));
 return[...chosen,...official];
}
function noteEvents(){return Object.entries(S.notes.g).flatMap(([iso,list])=>(list||[]).map(n=>({tarih:iso,saat:n.saat||'',ad:n.metin,tur:'not',id:n.id})))}
function build(){
 const now=new Date(),data={};
 ['ogretmenler','siniflar','dersProgrami','nobetAtamalari','nobetYerleri','ogretmenIzinleri','sinavlar','denemeSinavlari','toplantiCizelgesi','hatirlaticilar'].forEach(t=>{data[t]=rows(t)});
 const live=global.SchoolLiveStatus?.status?.(now)||null,snap=C().snapshot(data,live,now),ozel=ozelGunListesi(),today=snap.tarih.iso;
 const ev=[...C().olaylar(data,ozel),...noteEvents()].sort((a,b)=>(a.tarih+(a.saat||'99:99')).localeCompare(b.tarih+(b.saat||'99:99')));
 const list=rows('duyurular').filter(x=>x&&!x.arsivlendi&&x.aktif!==false&&!x.pasif).sort((a,b)=>String(b.tarih||b.eklenmeTarihi||'').localeCompare(String(a.tarih||a.eklenmeTarihi||'')));
 M={now,data,live,snap,ozel,ev,today,okul:okulAdi(),duyuru:String(list[0]?.baslik||list[0]?.title||'').trim()};
 if(!S.calSel){const d=now;S.calY=d.getFullYear();S.calM=d.getMonth();S.calSel=today}
 S.readAt=now;
 return M;
}

/* ── küçük parçalar ── */
const chip=(t,tone)=>`<span class="ka-ip-chip is-${tone}">${esc(t)}</span>`;
const empty=t=>`<p class="ka-ip-empty">${esc(t)}</p>`;
const row=(main,sub,side,cls='')=>`<div class="ka-ip-row${cls?' '+cls:''}"><div class="ka-ip-row__main"><b>${esc(main)}</b>${sub?`<small>${esc(sub)}</small>`:''}</div>${side||''}</div>`;
const note=(html,tone='amber')=>`<div class="ka-ip-note is-${tone}">${html}</div>`;
function card(id,body,{right=''}={}){
 const k=KMAP[id];
 return `<section class="ka-ip-card" data-ip-card="${id}" data-w="${k.w}" aria-label="${esc(k.ad)}"><div class="ka-ip-head"><span class="ka-ip-ico">${ICON[k.ico]}</span><h2>${esc(k.ad)}</h2>${right?`<span class="ka-ip-sub">${right}</span>`:''}</div>${body}</section>`;
}
const route=(r,p,t)=>`data-ip-act="git" data-route="${r}" data-page="${p}" data-title="${esc(t)}"`;
function saatListesi(a){const t=a.map(n=>`${n}.`);return t.length>1?`${t.slice(0,-1).join(', ')} ve ${t[t.length-1]}`:t[0]||''}
function sure(sn){const s=Math.max(0,Math.floor(sn)),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),x=s%60;return h?`${h}:${pad(m)}:${pad(x)}`:`${pad(m)}:${pad(x)}`}
const RING=326.7;

/* ── kartlar ── */
function sunanHtml(){
 const L=M.snap.canli;
 if(!L.aralik||L.kalanSn==null){
  return card('sunan',`<div class="ka-ip-live"><div class="ka-ip-live__main"><div class="ka-ip-big">${esc(L.title)}</div>${L.sub?`<div class="ka-ip-muted">${esc(L.sub)}</div>`:''}</div></div>${L.sonraki?`<div class="ka-ip-next"><span>SIRADAKİ</span><b>${esc(L.sonraki.label)} · ${esc(L.sonraki.aralik)}</b></div>`:''}`,{right:''});
 }
 const [b,e]=L.aralik.split(' – ');
 const body=`<div class="ka-ip-live"><div class="ka-ip-live__main"><div class="ka-ip-big">${esc(L.title)}</div><div class="ka-ip-muted">${esc(L.aralik)}${L.sure?` · ${L.sure} dakika`:''}</div>
 <div class="ka-ip-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${L.progress}"><i data-ip-bar style="width:${L.progress}%"></i></div>
 <div class="ka-ip-bar-l"><span>Başlangıç ${esc(b)}</span><b data-ip-pct>%${L.progress}</b><span>Bitiş ${esc(e)}</span></div></div>
 <div class="ka-ip-ring"><svg viewBox="0 0 128 128" aria-hidden="true"><circle class="ka-ip-ring__bg" cx="64" cy="64" r="52"/><circle class="ka-ip-ring__fg" data-ip-ring cx="64" cy="64" r="52" stroke-dasharray="${(L.progress/100*RING).toFixed(1)} ${RING}" transform="rotate(-90 64 64)"/></svg><div class="ka-ip-ring__t"><b data-ip-kalan>${sure(L.kalanSn)}</b><span>KALAN</span></div></div></div>
 ${L.sonraki?`<div class="ka-ip-next">${ICON.cup}<span>SIRADAKİ</span><b>${esc(L.sonraki.label)} · ${esc(L.sonraki.aralik)}</b></div>`:''}`;
 return card('sunan',body,{right:L.canli?chip('CANLI','gold'):''});
}
function nobetHtml(){
 const n=M.snap.nobet;
 const amir=n.amir.length?note(`Nöbetçi idareci: <b>${esc(n.amir.join(', '))}</b>`):'';
 const list=n.liste.map(x=>`<div class="ka-ip-row"><b class="ka-ip-row__name">${esc(x.ad)}</b><span class="ka-ip-place">${esc(upper(x.yer))}</span></div>`).join('');
 const none=!n.amir.length&&!n.liste.length?empty('Bugün için nöbet kaydı yok.'):'';
 return card('nobet',`${amir}${list}${none}<button type="button" class="ka-ip-link" ${route('management','duty','Nöbet Programı')}>Nöbet çizelgesi ›</button>`);
}
function gelmeyenHtml(){
 const g=M.snap.gelmeyen;
 const list=g.liste.map(x=>row(x.ad,`${x.neden}${x.aralik?' · '+x.aralik:''}`,chip('İZİNLİ','red'))).join('');
 const by=new Map();g.bosDersler.forEach(b=>{if(!by.has(b.sinif))by.set(b.sinif,[]);by.get(b.sinif).push(...b.saatler)});
 const notes=[...by].slice(0,3).map(([s,ps])=>{const u=[...new Set(ps)].sort((a,b)=>a-b);return note(`${ICON.warn}<span>Bugün <b>${esc(s)}</b> sınıfının ${esc(saatListesi(u))} ${u.length>1?'dersleri':'dersi'} boş.</span>`)}).join('');
 const more=by.size>3?`<p class="ka-ip-muted">+${by.size-3} sınıf daha</p>`:'';
 return card('gelmeyen',`${list||empty('Bugün izinli öğretmen yok.')}${notes}${more}`,{right:g.liste.length?`${g.liste.length} kişi`:''});
}
function sinifHtml(){
 const s=M.snap;
 if(!s.donem)return card('siniflar',empty('Şu an ders saati dışında; sınıf durumu gösterilmiyor.'));
 const tiles=s.siniflar.map(x=>`<div class="ka-ip-tile is-${x.durum}"><div class="ka-ip-tile__t"><b>${esc(x.sinif)}</b>${x.durum==='bos'?ICON.warn:''}</div><small>${esc(x.ders)}</small><span>${esc(x.ogr)}</span></div>`).join('');
 return card('siniflar',tiles?`<div class="ka-ip-tiles">${tiles}</div>`:empty('Sınıf kaydı yok.'),{right:`${esc(s.donem.label)} · ${s.siniflar.length} şube`});
}
function ogretmenHtml(){
 const o=M.snap.ogretmenler;
 if(!o)return card('ogretmenler',empty('Şu an ders saati dışında.'));
 const box=(b,s,k)=>`<div class="ka-ip-box"><div class="ka-ip-box__h"><b>${b}</b><span class="ka-ip-count">${o[k].length}</span></div><small>${s}</small><p>${o[k].length?esc(o[k].map(x=>x.ad).join(', ')):'Kimse yok'}</p></div>`;
 return card('ogretmenler',`${box('Öğretmenler Odası','Okulda ve bu saatte boş','oda')}${box('Dersi Bitenler','Son dersi bu saatten önce bitti','biten')}${box('Okula Gelecekler','İlk dersi henüz başlamadı','gelecek')}`,{right:esc(M.snap.donem.label.toLocaleLowerCase('tr'))});
}
function defaultProgId(list){
 const u=global.AppStore?.get?.('session.user')||{},mine=String(u.bagliOgretmenId||u.ogretmenId||'');
 return (list.find(x=>x.id===mine)||list[0]||{}).id||'';
}
function programHtml(){
 const opt=C().programSecenekleri(M.data),list=S.prog.tur==='sinif'?opt.sinif:opt.ogretmen;
 if(!list.some(x=>x.id===S.prog.id))S.prog.id=defaultProgId(list);
 const seg=`<div class="ka-ip-seg" role="group" aria-label="Görünüm"><button type="button" data-ip-act="prog-tur" data-tur="ogretmen" aria-pressed="${S.prog.tur==='ogretmen'}">Öğretmen</button><button type="button" data-ip-act="prog-tur" data-tur="sinif" aria-pressed="${S.prog.tur==='sinif'}">Sınıf</button></div>`;
 const sel=`<select class="ka-ip-select" data-ip-prog-sel aria-label="${S.prog.tur==='sinif'?'Sınıf seç':'Öğretmen seç'}">${list.map(x=>`<option value="${esc(x.id)}"${x.id===S.prog.id?' selected':''}>${esc(x.ad)}</option>`).join('')}</select>`;
 if(!list.length)return card('program',`<div class="ka-ip-bar2">${seg}</div>${empty(S.prog.tur==='sinif'?'Sınıf kaydı yok.':'Öğretmen kaydı yok.')}`);
 const t=C().programTablosu(M.data,M.live,S.prog,M.now);
 if(!t.saatler.length)return card('program',`<div class="ka-ip-bar2">${seg}${sel}</div>${empty('Ders programı girilmemiş.')}`);
 const head=t.saatler.map(s=>`<div class="ka-ip-th${s.n===t.aktif?' is-now':''}" role="columnheader"><b>${s.n}. ders</b><small>${esc(s.saat.split('–')[0])}</small></div>`).join('');
 const body=t.gunler.map(g=>`<div class="ka-ip-gun${g.bugun?' is-today':''}" role="rowheader"><b>${esc(g.gun)}</b>${g.bugun?'<small>Bugün</small>':''}</div>${g.hucre.map(c=>`<div class="ka-ip-cell${c.simdi?' is-now':g.bugun?' is-today':''}${c.var?'':' is-empty'}" role="cell"><b>${esc(c.a)}</b><small>${esc(c.b)}</small></div>`).join('')}`).join('');
 return card('program',`<div class="ka-ip-bar2">${seg}${sel}</div><div class="ka-ip-tablewrap"><div class="ka-ip-table" role="table" style="--ip-cols:${t.saatler.length}"><div class="ka-ip-th is-gun" role="columnheader">Gün</div>${head}${body}</div></div>`,{right:`${opt.ogretmen.length} öğretmen`});
}
function gunEtiketi(iso){const d=C().parseIso(iso);return d?`${d.getDate()} ${C().AYLAR[d.getMonth()]} ${d.getFullYear()}, ${C().GUNLER[d.getDay()]}`:''}
function gunPaneli(){
 const list=C().gunOlaylari(M.ev,S.calSel);
 const items=list.map(o=>`<div class="ka-ip-ev is-${o.tur}"><i aria-hidden="true"></i><span class="ka-ip-ev__t">${esc(o.saat)}</span><span class="ka-ip-ev__m">${esc(o.ad)}</span>${o.tur==='not'?`<button type="button" class="ka-ip-x" data-ip-act="not-sil" data-id="${esc(o.id)}" aria-label="Notu sil">${ICON.x}</button>`:''}</div>`).join('');
 return `<div class="ka-ip-day-panel"><div class="ka-ip-day-panel__h"><b>${esc(gunEtiketi(S.calSel))}</b>${S.calSel===M.today?'<span class="ka-ip-muted">Bugün</span>':''}</div>${items||'<p class="ka-ip-muted">Bu güne kayıtlı bir şey yok.</p>'}
 <form class="ka-ip-note-form" data-ip-not-form><input type="text" class="ka-ip-input" data-ip-not-in aria-label="Not ekle" placeholder="Not ekle (ör. 14:00 Veli toplantısı)" maxlength="140" value="${esc(S.noteDraft)}" autocomplete="off"><button type="submit" class="ka-btn">Ekle</button></form></div>`;
}
function takvimHtml(){
 const cal=C().ayTakvimi(S.calY,S.calM,M.ev,M.today),gb=['PZT','SAL','ÇAR','PER','CUM','CMT','PAZ'];
 const cells=cal.hucreler.map(h=>`<button type="button" class="ka-ip-d${h.diger?' is-out':''}${h.haftaSonu?' is-we':''}${h.bugun?' is-today':''}${h.iso===S.calSel?' is-sel':''}" data-ip-act="gun" data-iso="${h.iso}" aria-pressed="${h.iso===S.calSel}" aria-label="${esc(gunEtiketi(h.iso))}${h.isaret?`, ${h.isaret} kayıt`:''}"><span>${h.gun}</span>${h.isaret?'<i class="ka-ip-dot" aria-hidden="true"></i>':''}</button>`).join('');
 const nav=`<span class="ka-ip-nav"><button type="button" class="ka-ip-icon" data-ip-act="cal-prev" aria-label="Önceki ay">${ICON.prev}</button><button type="button" class="ka-ip-icon" data-ip-act="cal-next" aria-label="Sonraki ay">${ICON.next}</button></span>`;
 return card('takvim',`<div class="ka-ip-month">${esc(cal.baslik)}</div><div class="ka-ip-cal">${gb.map(g=>`<span class="ka-ip-cal__h">${g}</span>`).join('')}${cells}</div>${gunPaneli()}`,{right:nav});
}
function terfiHtml(){
 const l=C().terfiler(M.data,M.today,30,30);
 const any=M.data.ogretmenler.some(t=>t&&t.aktif!==false&&t.sonTerfiTarihi);
 const body=l.length?l.map(t=>row(t.ad,[t.det,t.tarih].filter(Boolean).join(' · '),chip(t.kalan,t.gecti?'red':'blue'))).join(''):empty(any?'Son 30 günde süresi geçen ya da önümüzdeki 30 günde terfisi gelen personel yok.':'Öğretmen detayına derece, kademe ve son terfi tarihi girilince burada görünür.');
 return card('terfi',body,{right:'−30 / +30 gün'});
}
/* Kaynak: Dilimizin Zenginlikleri eylem planı (dilimiz.js) ve okulun girdileri (sorumlu öğretmen, aylık faaliyet notu). */
function dilimizHtml(){
 const D=global.DilimizModule,l=D?C().dilimiz(D.PLANLAR,D.entry,C().dilimizKademeleri(M.data),M.today,14):[],cok=l.length>1;
 const adim=a=>row(a.metin,`${a.adim} · ${a.tarih}`,chip(a.kalan,a.durum==='suruyor'?'gold':'blue'));
 const fa=(k,f)=>`<div class="ka-ip-box ka-ip-dz"><div class="ka-ip-box__h"><b>${esc(f.no)} · ${esc(f.ad)}</b>${cok?`<span class="ka-ip-count">${esc(k.ad)}</span>`:''}</div>${f.adimlar.map(adim).join('')}${f.fazla?`<small>+${f.fazla} adım daha</small>`:''}<small>${f.sorumlu.length?`Sorumlu öğretmen: ${esc(f.sorumlu.join(', '))}`:'Sorumlu öğretmen atanmadı'}</small>${f.not?note(`<span>Okulumuzda: ${esc(f.not)}</span>${f.okulTarih?`<b>${esc(f.okulTarih)}</b>`:''}`,'blue'):''}</div>`;
 const body=l.length?l.flatMap(k=>k.faaliyetler.map(f=>fa(k,f))).join(''):empty(D?'Bu eğitim öğretim yılında eylem planında kalan adım yok.':'Eylem planı yüklenemedi.');
 return card('dilimiz',`${body}<button type="button" class="ka-ip-link" ${route('documents','dilimiz','Dilimizin Zenginlikleri')}>Eylem planı ›</button>`,{right:'MEB projesi'});
}
function gunlerHtml(){
 const l=C().ozelGunler(M.ozel,M.today,14,4);
 return card('gunler',l.length?l.map(g=>row(g.ad,g.tarih,chip(g.kalan,'amber'))).join(''):empty('Önümüzdeki 14 günde belirli gün veya hafta yok.'),{right:'bugün + 14 gün'});
}
function yaklasanHtml(){
 const l=C().yaklasanlar(M.ev,M.today,14,4),cd=C().geriSayim(global.AppConfig?.get?.()?.examCountdowns,M.today);
 const body=(l.length?l.map(y=>row(y.ad,y.zaman,chip(y.kalan,'blue'))).join(''):empty('Önümüzdeki 14 günde kayıtlı etkinlik yok.'))+(cd?note(`<span>${esc(cd.ad)}</span><b>${cd.gun===0?'Bugün':cd.gun+' gün'}</b>`,'blue'):'');
 return card('yaklasan',body,{right:'14 gün'});
}
function rehberKartlari(){
 const q=C().fold(S.rehberQ);
 return C().rehberler(M.data).filter(r=>(S.rehberK==='tum'||r.kademe===S.rehberK)&&(!q||C().fold(r.sinif+' '+r.ad).includes(q)))
  .map(r=>`<div class="ka-ip-tile ${r.ad?'is-ders':'is-yok'}"><b>${esc(r.sinif)}</b><span>${r.ad?esc(r.ad):'atanmadı'}</span></div>`).join('')||empty('Eşleşen sınıf yok.');
}
function rehberHtml(){
 const all=C().rehberler(M.data),bos=all.filter(r=>!r.ad).length;
 const seg=[['tum','Tümü'],['ilk','İlkokul'],['orta','Ortaokul']].map(([k,l])=>`<button type="button" data-ip-act="rehber-kademe" data-k="${k}" aria-pressed="${S.rehberK===k}">${l}</button>`).join('');
 return card('rehber',`<div class="ka-ip-bar2"><div class="ka-ip-seg" role="group" aria-label="Kademe">${seg}</div><input type="search" class="ka-ip-input" data-ip-rehber-q aria-label="Sınıf ya da öğretmen ara" placeholder="Sınıf ya da öğretmen ara… (ör. 7/B)" value="${esc(S.rehberQ)}"></div><div class="ka-ip-tiles is-small" data-ip-rehber-grid>${rehberKartlari()}</div>`,{right:`${all.length} şube${bos?` · ${bos} boş`:''}`});
}
/* Günün ayeti / hadisi / özlü sözü: carousel — anasayfadaki gibi tek alanda sırayla değişir. */
function sozSlides(){
 const G=global.GununSozleri,pool=global.AppConfig?.get?.()?.sozHavuzu;
 if(!G)return[];
 return G.TURLER.map(t=>({t,pick:G.bugun(t.key,pool)})).filter(x=>x.pick);
}
function gununSozleriHtml(){
 const slides=sozSlides();
 if(!slides.length)return card('gununsozleri',empty('Bugün için söz bulunamadı.'));
 const at=S.sozAt%slides.length;
 const stage=slides.map((x,i)=>`<figure class="ka-ip-soz${i===at?' is-active':''}" data-soz-slide="${i}" ${i===at?'':'aria-hidden="true"'}><div class="ka-ip-soz__tur">${esc(x.t.baslik)}</div><blockquote class="ka-ip-soz__metin">${esc(x.pick.metin)}</blockquote>${x.pick.kaynak?`<p class="ka-ip-soz__kaynak">${esc(x.pick.kaynak)}</p>`:''}</figure>`).join('');
 const dots=slides.length>1?`<div class="ka-ip-soz-dots" role="tablist" aria-label="Söz türü">${slides.map((x,i)=>`<button type="button" role="tab" class="ka-ip-soz-dot${i===at?' is-active':''}" aria-selected="${i===at}" aria-label="${esc(x.t.baslik)}" data-ip-act="soz-dot" data-soz-i="${i}"></button>`).join('')}</div>`:'';
 return card('gununsozleri',`<div class="ka-ip-soz-stage" data-soz-carousel>${stage}</div>${dots}`);
}
const RENDER={sunan:sunanHtml,nobet:nobetHtml,gelmeyen:gelmeyenHtml,siniflar:sinifHtml,ogretmenler:ogretmenHtml,program:programHtml,takvim:takvimHtml,terfi:terfiHtml,gunler:gunlerHtml,dilimiz:dilimizHtml,yaklasan:yaklasanHtml,gununsozleri:gununSozleriHtml,rehber:rehberHtml};

/* ── sayfa ── */
function strip(){
 const k=M.snap.kpi,out=[];
 if(M.snap.donem&&k.derste)out.push(`<span class="ka-ip-pill is-blue">${k.derste} sınıfta ders sürüyor</span>`);
 k.bos.slice(0,3).forEach(s=>out.push(`<span class="ka-ip-pill is-amber">${ICON.warn}${esc(s)} sınıfında ders boş: öğretmen izinli</span>`));
 if(k.bos.length>3)out.push(`<span class="ka-ip-pill is-amber">+${k.bos.length-3} sınıfta daha ders boş</span>`);
 if(k.izinli)out.push(`<span class="ka-ip-pill is-red">${k.izinli} öğretmen izinli</span>`);
 if(k.sonrakiZil)out.push(`<span class="ka-ip-pill is-plain">Sıradaki zil ${esc(k.sonrakiZil)}</span>`);
 return out.length?`<div class="ka-ip-strip">${out.join('')}</div>`:'';
}
const hm=d=>`${pad(d.getHours())}:${pad(d.getMinutes())}`;
/* Saatin yanındaki hava durumu: tek kaynak SchoolLiveStatus.weatherView (ui.weather); veri yoksa görünmez, her saniye tikinde değişince tazelenir. */
function wxView(){
 const v=global.SchoolLiveStatus?.weatherView?.();
 return v?{sig:`${v.glyph}|${v.temp}|${v.text}`,html:`<span class="ka-ip-wx__t"><i aria-hidden="true">${esc(v.glyph)}</i><b>${v.temp}°</b></span><small>${esc(v.text)}</small>`}:{sig:'',html:''};
}
function wxHtml(tag){
 const w=wxView(),a=`class="ka-ip-wx" data-ip-wx data-wx-sig="${esc(w.sig)}"${w.sig?'':' hidden'}`;
 return tag==='button'?`<button type="button" ${a} data-ip-act="hava" title="Hava durumu ayrıntıları">${w.html}</button>`:`<div ${a}>${w.html}</div>`;
}
function btn(act,ico,label,primary=false){return `<button type="button" class="ka-btn${primary?'':' ka-btn--secondary'}" data-ip-act="${act}">${ICON[ico]}<span>${label}</span></button>`}
function pageHtml(){
 const d=M.now,ids=aktifler();
 return `<section class="vgf-page ka-ip" data-ip-page>
 <header class="ka-ip-top"><div class="ka-ip-brand"><span class="ka-ip-logo" aria-hidden="true">K</span><div><div class="ka-ip-kicker">İDARECİ PANO</div><h1>${esc(M.okul)}</h1></div></div>
 <div class="ka-ip-now">${wxHtml('button')}<div class="ka-ip-clock"><div class="ka-ip-clock__t" aria-label="Saat"><b data-ip-hm>${hm(d)}</b><span data-ip-ss>:${pad(d.getSeconds())}</span></div><small>${esc(M.snap.tarih.uzun)}</small></div></div></header>
 <div class="ka-ip-acts">${btn('tv','full','Tam ekran',true)}${btn('tema','moon','Tema')}${btn('duzenle','sliders','Düzenle')}${btn('yenile','refresh','Yenile')}${btn('paylas','share','Paylaş')}<span class="ka-ip-read" data-ip-read>Veriler ${hm(S.readAt||d)}’de okundu</span></div>
 ${strip()}
 <div class="ka-ip-grid">${ids.map(id=>RENDER[id]()).join('')||empty('Gösterilecek kart seçilmemiş. Düzenle düğmesinden kartları açabilirsiniz.')}</div>
 </section>${S.draft?sheetHtml():''}${S.tv?tvHtml():''}`;
}

/* ── düzenleme paneli ── */
function sheetHtml(){
 const D=S.draft,rowsH=D.sira.map((id,i)=>{const on=!D.kapali.includes(id);return `<div class="ka-ip-sheet__row${on?'':' is-off'}"><span class="ka-ip-mv"><button type="button" class="ka-ip-icon" data-ip-act="k-up" data-id="${id}" aria-label="${esc(KMAP[id].ad)} kartını yukarı taşı"${i===0?' disabled':''}>${ICON.up}</button><button type="button" class="ka-ip-icon" data-ip-act="k-down" data-id="${id}" aria-label="${esc(KMAP[id].ad)} kartını aşağı taşı"${i===D.sira.length-1?' disabled':''}>${ICON.down}</button></span><span class="ka-ip-sheet__n">${esc(KMAP[id].ad)}</span><button type="button" class="ka-ip-switch" role="switch" aria-checked="${on}" data-ip-act="k-toggle" data-id="${id}" aria-label="${esc(KMAP[id].ad)} kartını göster"><i></i></button></div>`}).join('');
 const surelerH=SURELER.map(s=>`<button type="button" class="ka-btn${D.sure===s?'':' ka-btn--secondary'}" data-ip-act="sure" data-sn="${s}" aria-pressed="${D.sure===s}">${s} sn</button>`).join('');
 return `<div class="ka-ip-sheet-wrap" data-ip-sheet><section class="ka-ip-sheet" role="dialog" aria-modal="true" aria-label="Panoyu düzenle"><div class="ka-ip-sheet__head"><div><h2>Panoyu düzenle</h2><p>Kartları açıp kapatın, okla sıralayın.</p></div><button type="button" class="ka-ip-icon is-lg" data-ip-act="sheet-kapat" aria-label="Kapat">${ICON.close}</button></div>
 <div class="ka-ip-sheet__list">${rowsH}</div>
 <div class="ka-ip-sheet__tv"><b>TAM EKRAN SUNUMU</b><span>Sayfalar kaç saniyede bir değişsin?</span><div class="ka-ip-sheet__sec">${surelerH}</div></div>
 <div class="ka-ip-sheet__foot"><button type="button" class="ka-btn ka-btn--secondary" data-ip-act="varsayilan">Varsayılana dön</button><button type="button" class="ka-btn" data-ip-act="kaydet">Kaydet</button></div></section></div>`;
}

/* ── tam ekran (TV) ── */
function tvPages(){
 const on=new Set(aktifler()),pages=TV_SAYFALAR.map(p=>p.filter(id=>on.has(id))).filter(p=>p.length);
 return pages.length?pages:[['sunan']];
}
function tvHtml(){
 const pages=tvPages();if(S.tvPage>=pages.length)S.tvPage=0;
 const ids=pages[S.tvPage],d=M.now,has=id=>ids.includes(id),pick=a=>a.filter(has).map(id=>RENDER[id]()).join('');
 let body;
 if(S.tvPage===0&&has('sunan')){
  body=`<div class="ka-ip-tv-split"><div class="ka-ip-tv-col">${pick(['sunan','nobet'])}</div><div class="ka-ip-tv-col is-wide">${pick(['siniflar'])}<div class="ka-ip-tv-row">${pick(['gelmeyen','gunler'])}</div></div></div>`;
 }else body=`<div class="ka-ip-tv-flow" data-n="${Math.min(ids.length,3)}">${ids.map(id=>RENDER[id]()).join('')}</div>`;
 const dots=pages.map((_,i)=>`<i class="${i===S.tvPage?'is-on':''}"></i>`).join('');
 return `<div class="ka-ip-tv" data-ip-tv role="dialog" aria-modal="true" aria-label="Tam ekran pano"><header class="ka-ip-tv-top"><div class="ka-ip-brand"><span class="ka-ip-logo" aria-hidden="true">K</span><div><div class="ka-ip-kicker">İDARECİ PANO</div><h1>${esc(M.okul)}</h1></div></div>
 <div class="ka-ip-tv-right">${wxHtml('div')}<div class="ka-ip-clock"><div class="ka-ip-clock__t"><b data-ip-hm>${hm(d)}</b><span data-ip-ss>:${pad(d.getSeconds())}</span></div><small>${esc(M.snap.tarih.uzun)}</small></div><button type="button" class="ka-ip-icon is-lg" data-ip-act="tv-tema" aria-label="Tema">${ICON.moon}</button><button type="button" class="ka-ip-icon is-lg" data-ip-act="tv-kapat" aria-label="Tam ekranı kapat">${ICON.close}</button></div></header>
 <div class="ka-ip-tv-body">${body}</div>
 <footer class="ka-ip-tv-foot"><span class="ka-ip-tv-tag">DUYURU</span><span class="ka-ip-tv-msg">${esc(M.duyuru||'Güncel duyuru yok.')}</span><span class="ka-ip-tv-dots" aria-label="Sayfa ${S.tvPage+1} / ${pages.length}, ${S.cfg.sure} saniyede bir değişir">${dots}<small>${S.cfg.sure} sn</small></span></footer></div>`;
}
function tvStart(){
 clearInterval(tvTimer);
 tvTimer=setInterval(()=>{if(!S.tv){clearInterval(tvTimer);return}const n=tvPages().length;if(n>1){S.tvPage=(S.tvPage+1)%n;render()}},S.cfg.sure*1000);
}
async function tvOpen(){
 S.tv=true;S.tvPage=0;render();tvStart();
 try{await document.documentElement.requestFullscreen?.();S.tvFs=!!document.fullscreenElement}catch(_){S.tvFs=false}
 try{wake=await global.navigator?.wakeLock?.request?.('screen')}catch(_){wake=null}
}
function tvClose(){
 S.tv=false;clearInterval(tvTimer);
 try{wake?.release?.()}catch(_){}wake=null;
 if(document.fullscreenElement){S.tvFs=false;document.exitFullscreen?.().catch(()=>{})}
 render();
}

/* ── çizim ── */
function root(){return document.getElementById('v2ModuleRoot')}
function render(){
 const r=root();if(!r||!C())return false;
 mounted=r;build();
 const y=global.scrollY,keep=r.querySelector('[data-ip-tv] .ka-ip-tv-body')?.scrollTop||0;
 r.innerHTML=pageHtml();
 if(y)global.scrollTo?.(0,y);
 const tb=r.querySelector('[data-ip-tv] .ka-ip-tv-body');if(tb&&keep)tb.scrollTop=keep;
 S.liveKey=liveKey();
 if(S.tv)fitTv();
 return true;
}
/* TV'de kaydırma yoktur: içerik ekrana sığmıyorsa tüm sayfa orantılı küçültülür (1080p, 720p, tablet fark etmez). */
function fitTv(){
 const body=mounted?.querySelector('.ka-ip-tv-body'),inner=body?.firstElementChild;if(!inner)return;
 inner.style.zoom='';
 if(global.innerWidth<1000)return;
 const need=inner.scrollHeight,have=body.clientHeight;
 if(have>0&&need>have+2)inner.style.zoom=Math.max(.4,have/need).toFixed(3);
}
function onResize(){if(S.tv&&alive())fitTv()}
function queue(){clearTimeout(renderQ);renderQ=setTimeout(()=>{if(alive()){const f=document.activeElement;if(f&&f.matches?.('input,select,textarea')&&mounted.contains(f))return queue();render()}},250)}
function refreshCard(id){
 if(!mounted||!RENDER[id])return;
 build();
 /* TV açıkken arkadaki sayfa da aynı kartı taşıyabilir; her ikisi de yeniden çizilir */
 mounted.querySelectorAll(`[data-ip-card="${id}"]`).forEach(el=>{el.outerHTML=RENDER[id]()});
}
function alive(){return !!mounted&&mounted.isConnected&&!!mounted.querySelector('[data-ip-page]')}
const liveKey=()=>{const l=global.SchoolLiveStatus?.status?.(new Date())||{};return`${l.mode}|${l.period||''}|${l.nextPeriod||''}|${C().isoOf(new Date())}`};

/* her saniye: saat + canlı şerit; ders dilimi değişince tüm pano yenilenir */
function sozTick(){
 const slides=sozSlides();if(slides.length<2)return;
 if(Date.now()<S.sozTimer)return;
 S.sozAt=(S.sozAt+1)%slides.length;
 const card=mounted?.querySelector('[data-soz-carousel]');if(!card)return;
 card.querySelectorAll('[data-soz-slide]').forEach((el,i)=>{const on=i===S.sozAt;el.classList.toggle('is-active',on);on?el.removeAttribute('aria-hidden'):el.setAttribute('aria-hidden','true')});
 const dots=mounted?.querySelectorAll('[data-ip-act="soz-dot"]');dots?.forEach((d,i)=>{d.classList.toggle('is-active',i===S.sozAt);d.setAttribute('aria-selected',i===S.sozAt?'true':'false')});
}
function tick(){
 if(!alive()){destroy();return}
 const now=new Date();
 mounted.querySelectorAll('[data-ip-hm]').forEach(e=>{e.textContent=hm(now)});
 mounted.querySelectorAll('[data-ip-ss]').forEach(e=>{e.textContent=':'+pad(now.getSeconds())});
 if(now.getSeconds()%8===0)sozTick();
 const w=wxView();
 mounted.querySelectorAll('[data-ip-wx]').forEach(e=>{if(e.dataset.wxSig===w.sig)return;e.dataset.wxSig=w.sig;e.innerHTML=w.html;e.hidden=!w.sig});
 const key=liveKey();
 if(key!==S.liveKey){const f=document.activeElement;if(!(f&&f.matches?.('input,select,textarea')&&mounted.contains(f)))render();return}
 const live=global.SchoolLiveStatus?.status?.(now);if(!live)return;
 const v=C().liveView(live);
 if(v.kalanSn==null)return;
 mounted.querySelectorAll('[data-ip-kalan]').forEach(e=>{e.textContent=sure(v.kalanSn)});
 mounted.querySelectorAll('[data-ip-bar]').forEach(e=>{e.style.width=v.progress+'%'});
 mounted.querySelectorAll('[data-ip-pct]').forEach(e=>{e.textContent='%'+v.progress});
 mounted.querySelectorAll('[data-ip-ring]').forEach(e=>{e.setAttribute('stroke-dasharray',`${(v.progress/100*RING).toFixed(1)} ${RING}`)});
}
function destroy(){
 clearInterval(timer);timer=0;clearInterval(tvTimer);clearTimeout(renderQ);
 unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];
 try{wake?.release?.()}catch(_){}wake=null;
 global.removeEventListener('keydown',onKey);global.removeEventListener('resize',onResize);document.removeEventListener('fullscreenchange',onFs);
 if(S.tv){S.tv=false;if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{})}
 S.draft=null;mounted=null;
}

/* ── etkileşim ── */
function paylas(){
 const text=C().ozetMetni(M.snap,M.okul);
 if(global.navigator?.share){global.navigator.share({title:'İdareci Pano',text}).catch(()=>{});return}
 const done=()=>toast('Özet panoya kopyalandı.');
 if(global.navigator?.clipboard?.writeText)global.navigator.clipboard.writeText(text).then(done,()=>toast('Özet kopyalanamadı.'));
 else toast('Bu cihaz paylaşımı desteklemiyor.');
}
async function yenile(b){
 if(b)b.disabled=true;
 try{await global.SyncEngine?.sync?.(SYNC,{force:true})}catch(_){}
 render();toast('Veriler yenilendi.');
}
function moveDraft(id,d){const a=S.draft.sira,i=a.indexOf(id),j=i+d;if(i<0||j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]]}
function addNote(){
 const raw=S.noteDraft.trim();if(!raw)return;
 const m=/^(\d{1,2})[:.](\d{2})\s+(.+)$/.exec(raw),h=m?Number(m[1]):-1,mi=m?Number(m[2]):-1;
 const ok=m&&h>=0&&h<24&&mi>=0&&mi<60,saat=ok?`${pad(h)}:${pad(mi)}`:'',metin=(ok?m[3]:raw).trim().slice(0,140);
 if(!metin)return;
 const list=S.notes.g[S.calSel]||(S.notes.g[S.calSel]=[]);
 if(list.length>=20){toast('Bir güne en fazla 20 not eklenebilir.');return}
 list.push({id:'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),saat,metin});
 S.noteDraft='';saveNotes();refreshCard('takvim');
}
const ACT={
 tv:()=>{tvOpen()},
 'tv-kapat':()=>tvClose(),
 tema:()=>{global.ShellUI?.toggleTheme?.()},
 'tv-tema':()=>{global.ShellUI?.toggleTheme?.()},
 hava:()=>{global.SchoolLiveStatus?.openWeather?.()},
 duzenle:()=>{S.draft={...S.cfg,kapali:[...S.cfg.kapali],sira:[...S.cfg.sira]};render()},
 'sheet-kapat':()=>{S.draft=null;render()},
 'k-toggle':b=>{const id=b.dataset.id,k=S.draft.kapali,i=k.indexOf(id);i<0?k.push(id):k.splice(i,1);render()},
 'k-up':b=>{moveDraft(b.dataset.id,-1);render()},
 'k-down':b=>{moveDraft(b.dataset.id,1);render()},
 sure:b=>{S.draft.sure=Number(b.dataset.sn)||20;render()},
 varsayilan:()=>{S.draft=normCfg(null);render()},
 kaydet:()=>{saveCfg(S.draft);S.draft=null;if(S.tv)tvStart();render();toast('Pano düzeni kaydedildi.')},
 yenile:b=>yenile(b),
 paylas:()=>paylas(),
 'prog-tur':b=>{S.prog={tur:b.dataset.tur==='sinif'?'sinif':'ogretmen',id:''};refreshCard('program')},
 'cal-prev':()=>{const d=new Date(S.calY,S.calM-1,1);S.calY=d.getFullYear();S.calM=d.getMonth();refreshCard('takvim')},
 'cal-next':()=>{const d=new Date(S.calY,S.calM+1,1);S.calY=d.getFullYear();S.calM=d.getMonth();refreshCard('takvim')},
 gun:b=>{S.calSel=b.dataset.iso;const d=C().parseIso(S.calSel);if(d&&(d.getMonth()!==S.calM||d.getFullYear()!==S.calY)){S.calY=d.getFullYear();S.calM=d.getMonth()}refreshCard('takvim')},
 'not-sil':b=>{const g=S.notes.g[S.calSel]||[],i=g.findIndex(n=>n.id===b.dataset.id);if(i>=0){g.splice(i,1);saveNotes();refreshCard('takvim')}},
 'rehber-kademe':b=>{S.rehberK=b.dataset.k;refreshCard('rehber')},
 'soz-dot':b=>{S.sozAt=Number(b.dataset.sozI)||0;S.sozTimer=Date.now()+15000;refreshCard('gununsozleri')},
 git:async b=>{if(S.tv)tvClose();await global.ShellUI?.routeModule?.(b.dataset.route,{page:b.dataset.page||'',title:b.dataset.title||''})}
};
function bind(r){
 if(r.dataset.ipBound)return;r.dataset.ipBound='1';
 r.addEventListener('click',e=>{
  const sheet=e.target.closest?.('[data-ip-sheet]');
  if(sheet&&e.target===sheet){S.draft=null;render();return}
  const b=e.target.closest?.('[data-ip-act]');if(!b||!r.contains(b))return;
  const f=ACT[b.dataset.ipAct];if(f){e.preventDefault();f(b)}
 });
 r.addEventListener('change',e=>{if(e.target.matches?.('[data-ip-prog-sel]')){S.prog.id=e.target.value;refreshCard('program')}});
 r.addEventListener('input',e=>{
  const t=e.target;
  if(t.matches?.('[data-ip-not-in]'))S.noteDraft=t.value;
  else if(t.matches?.('[data-ip-rehber-q]')){S.rehberQ=t.value;const g=r.querySelector('[data-ip-rehber-grid]');if(g)g.innerHTML=rehberKartlari()}
 });
 r.addEventListener('submit',e=>{if(e.target.matches?.('[data-ip-not-form]')){e.preventDefault();addNote()}});
}
function onKey(e){
 if(e.key!=='Escape'||!alive())return;
 if(S.draft){S.draft=null;render()}else if(S.tv)tvClose();
}
function onFs(){if(S.tv&&S.tvFs&&!document.fullscreenElement){S.tvFs=false;tvClose()}}

/* ── açılış ── */
async function ensureDeps(){
 const L=global.AppLoader;
 if(!global.TerfiCore)await L?.loadScript?.('js/modules/terfi-core.js');
 if(!global.IdareciPanoCore)await L?.loadScript?.('js/modules/idareci-pano-core.js');
 if(!global.DilimizModule)try{await L?.loadScript?.('js/modules/dilimiz.js')}catch(_){}
 if(!global.BelirliGunlerCatalog)try{await L?.loadScript?.('js/modules/belirli-gunler-catalog.js')}catch(_){}
 if(!global.IdareciPanoCore||!global.TerfiCore)throw new Error('İdareci Pano bileşenleri yüklenemedi.');
}
async function open(){
 try{await ensureDeps()}catch(e){console.error('[İdareci Pano]',e);toast('Pano açılamadı.');return false}
 if(mounted)destroy();
 S.cfg=readCfg();S.notes=readNotes();S.draft=null;S.tv=false;S.calSel='';S.rehberQ='';S.noteDraft='';
 if(!render())return false;
 bind(mounted);
 timer=setInterval(tick,1000);
 global.addEventListener('keydown',onKey);global.addEventListener('resize',onResize);document.addEventListener('fullscreenchange',onFs);
 WATCH.forEach(t=>{const u=global.AppStore?.subscribe?.('data.'+t,queue);if(u)unsubs.push(u)});
 const u=global.AppStore?.subscribe?.('session.user',queue);if(u)unsubs.push(u);
 hydrateRemote();
 global.SyncEngine?.sync?.(SYNC).then(()=>{if(alive())queue()}).catch(()=>{});
 return true;
}
function unmount(){destroy()}

global.IdareciPano={open,render,unmount};
})(window);
