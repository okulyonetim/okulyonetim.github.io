/* =====================================================================
   Koruk Asistan — Alt Navigasyon Core
   ===================================================================== */
(function(){
'use strict';

function _profilModalBos(baslik, aciklama){return `<div class="an-profile-modal"><div class="an-profile-empty"><strong>${baslik}</strong>${aciklama}</div></div>`;}
function _profilModalOzet(ikon,baslik,alt){return `<div class="an-profile-summary"><div class="an-profile-summary-icon">${ikon}</div><div><b>${baslik}</b><small>${alt}</small></div></div>`;}

function sinavlarimGoster(ogretmenId){
 if(typeof sinavlar==='undefined'||typeof modalAc!=='function'){alert('Sınav modülü yüklenemedi.');return;}
 const kendi=sinavlar.filter(s=>s.ogretmenId===ogretmenId).sort((a,b)=>(b.tarih||'').localeCompare(a.tarih||''));
 let html='<div class="an-profile-modal">'+_profilModalOzet('📝','Sınavlarım',`${kendi.length} kayıt`);
 if(!kendi.length) html+='<div class="an-profile-empty"><strong>Sınav bulunamadı</strong>Henüz eklediğiniz bir yazılı sınav yok.</div>';
 else html+=`<div class="an-profile-section"><div class="an-profile-section-title">🗓️ Sınav Takvimi</div>${kendi.map(s=>`<div class="an-profile-card"><div class="an-profile-card-icon" style="background:#0A9E8218;color:#0A9E82">📝</div><div class="an-profile-card-main"><div class="an-profile-card-title">${escapeHtml(s.ders||'Ders')} · ${escapeHtml(s.sinif||'—')}</div><div class="an-profile-card-meta">${formatTarih(s.tarih)}${s.dersSaati?' · '+escapeHtml(s.dersSaati)+'. ders':''}${s.senaryoNo?' · '+escapeHtml(s.senaryoNo)+'. senaryo':''}${s.yayinevi?' · '+escapeHtml(s.yayinevi):''}${s.notlar?' · '+escapeHtml(s.notlar):''}</div></div><span class="an-profile-badge" style="background:#0A9E8218;color:#0A9E82">${escapeHtml(s.tur||'Yazılı')}</span></div>`).join('')}</div>`;
 html+='</div>'; modalAc('Sınavlarım',html,null,null); const kb=document.getElementById('modalKaydetBtn');if(kb)kb.style.display='none';
}

function dersProgramimGoster(ogretmenId){
 if(typeof dersProgrami==='undefined'||typeof modalAc!=='function'){alert('Ders programı modülü yüklenemedi.');return;}
 const gunler=(typeof GUNLER!=='undefined')?GUNLER:['Pazartesi','Salı','Çarşamba','Perşembe','Cuma'];
 const dersler=dersProgrami.filter(d=>d.ogretmenId===ogretmenId).sort((a,b)=>gunler.indexOf(a.gun)-gunler.indexOf(b.gun)||a.saat-b.saat);
 let html='<div class="an-profile-modal">'+_profilModalOzet('📚','Haftalık Ders Programım',`${dersler.length} ders saati`);
 if(!dersler.length) html+='<div class="an-profile-empty"><strong>Program bulunamadı</strong>Ders programınızda kayıt yok.</div>';
 else html+=gunler.map(gun=>{const gd=dersler.filter(d=>d.gun===gun);if(!gd.length)return'';return `<div class="an-profile-section"><div class="an-profile-section-title">📅 ${gun}</div>${gd.map(d=>`<div class="an-profile-card"><div class="an-profile-card-icon" style="background:#1F6FD118;color:#1F6FD1">${escapeHtml(String(d.saat||'—'))}.</div><div class="an-profile-card-main"><div class="an-profile-card-title">${escapeHtml(d.ders||'—')}</div><div class="an-profile-card-meta">${escapeHtml(d.sinif||'—')} sınıfı</div></div></div>`).join('')}</div>`}).join('');
 html+='</div>';modalAc('Ders Programım',html,null,null);const kb=document.getElementById('modalKaydetBtn');if(kb)kb.style.display='none';
}

function nobetlerimGoster(ogretmenId){
 if(typeof nobetAtamalari==='undefined'||typeof modalAc!=='function'){alert('Nöbet modülü yüklenemedi.');return;}
 const simdi=new Date(),ay=simdi.getMonth(),yil=simdi.getFullYear();
 const nobetler=nobetAtamalari.filter(n=>{if(n.ogretmenId!==ogretmenId||!n.tarih)return false;const t=new Date(n.tarih);return t.getMonth()===ay&&t.getFullYear()===yil}).sort((a,b)=>(a.tarih||'').localeCompare(b.tarih||''));
 const ayAdi=simdi.toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
 let html='<div class="an-profile-modal">'+_profilModalOzet('🛡️','Nöbetlerim',`${ayAdi} · ${nobetler.length} nöbet`);
 if(!nobetler.length) html+='<div class="an-profile-empty"><strong>Nöbet bulunamadı</strong>Bu ay için nöbet atamanız yok.</div>';
 else html+=`<div class="an-profile-section"><div class="an-profile-section-title">📅 Bu Ay</div>${nobetler.map(n=>{const yer=(typeof nobetYerleri!=='undefined')?nobetYerleri.find(y=>y.id===n.yerId):null;const gun=new Date(n.tarih).toLocaleDateString('tr-TR',{weekday:'long'});const bugun=new Date().toISOString().slice(0,10)===n.tarih;return `<div class="an-profile-card"><div class="an-profile-card-icon" style="background:#EE5A4518;color:#EE5A45">🛡️</div><div class="an-profile-card-main"><div class="an-profile-card-title">${formatTarih(n.tarih)} · ${escapeHtml(gun)}</div><div class="an-profile-card-meta">${escapeHtml(yer?yer.ad:'Nöbet yeri belirtilmemiş')}</div></div>${bugun?'<span class="an-profile-badge" style="background:#0A9E8218;color:#0A9E82">Bugün</span>':''}</div>`}).join('')}</div>`;
 html+='</div>';modalAc('Nöbetlerim',html,null,null);const kb=document.getElementById('modalKaydetBtn');if(kb)kb.style.display='none';
}

function digerEvrakDurumuGoster(ogretmenId){
 if(typeof ogretmenler==='undefined'||typeof adGeciyorMu!=='function'||typeof modalAc!=='function'){alert('Modül yüklenemedi.');return;}
 const o=ogretmenler.find(x=>x.id===ogretmenId);if(!o)return;const adSoyad=`${o.ad} ${o.soyad}`.trim();const cv=typeof cizelgeVerileri!=='undefined'?cizelgeVerileri:{};
 const A=['Eyl','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz'],D=['1. Dönem','2. Dönem','Yıl Sonu'],K=['Yıllık Plan','Toplum Hizm.','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz','Sene Sonu'],R=['Yıllık Plan','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz','1.D.Sonu','Sene Sonu'],B=['Yıllık Ders Planı','BEP Planı'];
 const kd=(k,c)=>Array.isArray(k.kontroller)?k.kontroller:c.map((_,i)=>!!(k.durumlar&&Object.values(k.durumlar)[i]));
 const kat=[
 {b:'Sosyal Kulüpler',i:'❤️',r:'#D6528F',c:K,k:(cv.sosyalKulupler||[]).filter(s=>Array.isArray(s.ogretmenIdler)&&s.ogretmenIdler.includes(ogretmenId)),a:x=>x.ad,kulup:true},
 {b:'Rehberlik',i:'🧭',r:'#7C52D6',c:R,k:(cv.rehberlik||[]).filter(x=>x.ogretmenId===ogretmenId||adGeciyorMu(x.danisman,adSoyad)),a:x=>x.ad},
 {b:'Zümre',i:'👥',r:'#1F6FD1',c:D,k:(cv.zumre||[]).filter(x=>x.ogretmenId===ogretmenId||adGeciyorMu(x.ad,adSoyad)),a:x=>x.ad||x.brans},
 {b:'ŞÖK',i:'🛡️',r:'#EE5A45',c:D,k:(cv.sok||[]).filter(x=>x.ogretmenId===ogretmenId||adGeciyorMu(x.ad,adSoyad)),a:x=>x.ad},
 {b:'Maarif Model Raporları',i:'🏅',r:'#F2A03D',c:A,k:(cv.maarifRapor||[]).filter(x=>x.ogretmenId===ogretmenId),a:x=>`${x.ders||'—'}${x.sinif?' · '+x.sinif:''}`},
 {b:'Belirli Gün ve Haftalar',i:'📅',r:'#1F9FD1',c:null,k:(typeof belirliGunlerListesi!=='undefined'?belirliGunlerListesi:[]).filter(e=>(e.gorevliOgretmenler&&e.gorevliOgretmenler.includes(ogretmenId))||adGeciyorMu(e.gorevliOgretmen,adSoyad)),a:e=>`${e.baslik}${e.tarih?' · '+e.tarih:''}`,d:e=>e.tamamlandi?'Tamamlandı':'Bekliyor'},
 {b:'Yıllık Plan / BEP',i:'📋',r:'#0A9E82',c:B,k:(cv.bepPlani||[]).filter(x=>x.ogretmenId===ogretmenId||adGeciyorMu(x.ad,adSoyad)),a:x=>x.ad},
 {b:'Diğer Evraklar',i:'📁',r:'#4E5A63',c:null,k:(typeof digerEvrakListesi!=='undefined'?digerEvrakListesi:[]).filter(e=>(e.ogretmen||'').localeCompare(adSoyad,'tr',{sensitivity:'base'})===0),a:e=>`${e.evrakTuru}${e.sinif?' · '+e.sinif:''}${e.tarih?' · '+formatTarih(e.tarih):''}`}
 ].filter(x=>x.k.length);
 let html='<div class="an-profile-modal">'+_profilModalOzet('📋','Diğer Görevlerim',`${kat.reduce((n,x)=>n+x.k.length,0)} kayıt`);
 if(!kat.length)html+='<div class="an-profile-empty"><strong>Görev bulunamadı</strong>Ders programı ve nöbet dışında kayıtlı göreviniz görünmüyor.</div>';
 else html+=kat.map(x=>`<div class="an-profile-section"><div class="an-profile-section-title">${x.i} ${x.b}</div>${x.k.map(q=>{const arr=x.c?kd(q,x.c):null,t=arr?arr.filter(Boolean).length:null,p=arr?Math.round(t/arr.length*100):0,ogr=x.kulup&&typeof veliler!=='undefined'?veliler.filter(v=>v.kulupId===q.id).length:0;return `<div class="an-profile-card" style="display:block"><div style="display:flex;align-items:center;gap:12px"><div class="an-profile-card-icon" style="background:${x.r}18;color:${x.r}">${x.i}</div><div class="an-profile-card-main"><div class="an-profile-card-title">${escapeHtml(x.a(q)||'—')}</div><div class="an-profile-card-meta">${arr?`${t}/${arr.length} tamamlandı`:(x.d?escapeHtml(x.d(q)):'Kayıtlı görev')}</div>${arr?`<div class="an-profile-progress"><i style="width:${p}%;background:${x.r}"></i></div>`:''}</div>${arr?`<span class="an-profile-badge" style="background:${x.r}18;color:${x.r}">%${p}</span>`:''}</div>${arr?`<div class="an-profile-checks">${x.c.map((e,i)=>`<div class="an-profile-check"><span>${arr[i]?'✅':'○'}</span>${escapeHtml(e)}</div>`).join('')}</div>`:''}${x.kulup?`<div class="an-profile-actions"><button class="btn btn-amber btn-sm" onclick="kulupOgrenciEkleAc('${q.id}')">Öğrenci Ekle</button><button class="btn btn-ghost btn-sm" onclick="kulupOgrenciListesiYazdir('${q.id}')">Öğrenciler (${ogr})</button></div>`:''}</div>`}).join('')}</div>`).join('');
 html+='<div class="an-profile-note">Görev ve evrak durumları uygulamadaki mevcut kayıtlar üzerinden gösterilir.</div></div>';modalAc('Diğer Görevlerim',html,null,null);const kb=document.getElementById('modalKaydetBtn');if(kb)kb.style.display='none';
}

/* Mevcut uygulama dosyasının kalan profil/navigasyon kodu bu sürümde dış modüllerden yüklenir. */
window.sinavlarimGoster=sinavlarimGoster;window.dersProgramimGoster=dersProgramimGoster;window.nobetlerimGoster=nobetlerimGoster;window.digerEvrakDurumuGoster=digerEvrakDurumuGoster;
})();
