/* Koruk Asistan — Dashboard bilgi kartı gerçek veri + detay köprüsü v2 */
(function(){
'use strict';
let servisRemoteCount=null, servisUnsub=null, servisUid='', gridObserver=null;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
function g(n){try{return window[n]!==undefined?window[n]:eval(n)}catch(_){return null}}
function arr(names){for(const n of names){const v=g(n);if(Array.isArray(v))return v}return[]}
function done(x){const s=String(x?.durum||x?.status||'').toLocaleLowerCase('tr-TR');return x?.tamamlandi===true||x?.tamam===true||['tamamlandı','tamamlandi','kapalı','kapali','arşivlendi','arsivlendi'].includes(s)}
function sum(xs,k){return xs.reduce((t,x)=>t+(parseInt(x?.[k])||0),0)}
function normSex(v){return String(v||'').toLocaleLowerCase('tr-TR').replace(/ı/g,'i')}
function legacyFallback(label){const map={Personel:'dashPersonelSayi',Öğrenciler:'dashOgrenciSayi',Sınıflar:'dashSinifSayi'};const e=document.getElementById(map[label]);if(!e)return null;const n=parseInt((e.textContent||'').replace(/\D/g,''));return Number.isFinite(n)?n:null}
function valueFor(label){
 if(label==='Personel')return arr(['ogretmenler']).length+arr(['personelListesi']).length;
 if(label==='Öğrenciler'){const o=arr(['ogrenciler']);if(o.length)return o.length;return sum(arr(['siniflar']),'ogrenciSayisi')}
 if(label==='Sınıflar')return arr(['siniflar']).length;
 if(label==='Servisler'){const local=arr(['servisler']).length;return local||servisRemoteCount||0}
 if(label==='Dökümanlar')return arr(['dokumanlar','dokumanListesi','dokumanlarCache']).length;
 if(label==='Hatırlatıcı')return arr(['hatirlaticilar']).filter(x=>!done(x)).length;
 if(label==='Notlar')return arr(['notlar']).length;
 if(label==='Sınavlar')return arr(['sinavlar','yaziliSinavlar']).length;
 if(label==='Duyurular')return arr(['duyurular']).length;
 if(label==='Mesajlar')return arr(['mesajlar','mesajlarim']).length;
 if(label==='Nöbetler')return arr(['nobetAtamalari']).length;
 return null;
}
function personelDetay(){const o=arr(['ogretmenler']),p=arr(['personelListesi']);const all=o.length?o:p;function group(type){const xs=all.filter(x=>{const k=String(x?.okulTuru||x?.kurumTuru||x?.birim||'').toLocaleLowerCase('tr-TR');return type==='ilk'?k.includes('ilk'):k.includes('orta')});return{t:xs.length,k:xs.filter(x=>['k','kadin','kadın','bayan'].includes(normSex(x?.cinsiyet))).length,e:xs.filter(x=>['e','erkek'].includes(normSex(x?.cinsiyet))).length}}return{ilk:group('ilk'),orta:group('orta')}}
function ogrenciDetay(){const os=arr(['ogrenciler']);if(os.length){function grp(min,max){const xs=os.filter(x=>{const n=parseInt(x?.sinifSeviye||x?.sinif||x?.seviye);return n>=min&&n<=max});return{t:xs.length,k:xs.filter(x=>['k','kiz','kız'].includes(normSex(x?.cinsiyet))).length,e:xs.filter(x=>['e','erkek'].includes(normSex(x?.cinsiyet))).length}}return{ilk:grp(1,4),orta:grp(5,8)}}const ss=arr(['siniflar']);const grp=(min,max)=>{const xs=ss.filter(s=>{const n=parseInt(s?.seviye);return n>=min&&n<=max});return{t:sum(xs,'ogrenciSayisi'),k:sum(xs,'kizSayisi'),e:sum(xs,'erkekSayisi')}};return{ilk:grp(1,4),orta:grp(5,8)}}
function detayHtml(d){const sex=x=>`<span class="dbx-sex dbx-female"><b>♀</b><span>${x.k}</span></span><span class="dbx-sex dbx-male"><b>♂</b><span>${x.e}</span></span>`;return `<div class="dbx-break"><div><em>İlkokul</em><strong>${d.ilk.t}</strong><small>${sex(d.ilk)}</small></div><i></i><div><em>Ortaokul</em><strong>${d.orta.t}</strong><small>${sex(d.orta)}</small></div></div>`}
function style(){if($('#dbx-break-style'))return;const s=document.createElement('style');s.id='dbx-break-style';s.textContent=`
#db41InfoGrid .db41-info.dbx-rich{min-height:184px!important;padding:12px 10px!important;display:flex!important;flex-direction:column!important;align-items:center!important;text-align:center!important}#db41InfoGrid .db41-info.dbx-rich>.i{font-size:31px!important}#db41InfoGrid .db41-info.dbx-rich>.v{font-size:29px!important;margin-top:5px!important}#db41InfoGrid .db41-info.dbx-rich>.a{font-size:12px!important;margin-top:5px!important;color:var(--d-muted)!important}#db41InfoGrid .dbx-break{width:100%;display:grid;grid-template-columns:1fr 1px 1fr;gap:7px;margin-top:11px;padding-top:9px;border-top:1px solid var(--d-line);text-align:center}#db41InfoGrid .dbx-break>i{background:var(--d-line)}#db41InfoGrid .dbx-break em{display:block;font-style:normal;font-size:10.5px;color:var(--d-muted);margin-bottom:3px}#db41InfoGrid .dbx-break strong{display:block;font-size:18px;color:var(--d-text)}#db41InfoGrid .dbx-break small{display:flex;justify-content:center;gap:8px;margin-top:5px;font-size:10.5px}#db41InfoGrid .dbx-sex{display:inline-flex;align-items:center;gap:3px;color:var(--d-muted);font-weight:800}#db41InfoGrid .dbx-female b{color:#d9468f;font-size:15px}#db41InfoGrid .dbx-male b{color:#247ee5;font-size:15px}[data-theme="dark"] #db41InfoGrid .dbx-female b{color:#ff83c0}[data-theme="dark"] #db41InfoGrid .dbx-male b{color:#78b8ff}
#tab-panel.db41 .db41-social #heroSosyalMedya>*,#tab-panel.db41 .db41-social #heroSosyalMedya>* *{color:var(--d-text)!important;text-shadow:none!important;opacity:1!important}#tab-panel.db41 .db41-social #heroSosyalMedya>*>span:last-child{font-weight:750!important;color:var(--d-text)!important}
`;document.head.appendChild(s)}
function canSeeService(){try{const f=g('gorebilir');return typeof f==='function'?!!f('tasima'):true}catch(_){return true}}
function ensureServiceCard(grid){if(!grid||!canSeeService()||grid.querySelector('[data-dbx-service="1"]')||$$('.db41-info',grid).some(c=>c.querySelector('.a')?.textContent?.trim()==='Servisler'))return;const b=document.createElement('button');b.type='button';b.className='db41-info';b.dataset.dbxService='1';b.onclick=()=>{try{g('sekmeAc')?.('tasima')}catch(_){}};b.innerHTML='<div class="i">🚌</div><div class="v">0</div><div class="a">Servisler</div>';grid.appendChild(b)}
function socialContrast(){const host=$('#heroSosyalMedya');if(!host)return;$$('*',host).forEach(e=>{if(e.style?.color)e.style.removeProperty('color');if(e.style?.opacity)e.style.removeProperty('opacity')})}
function enrich(card,label){const rich=label==='Personel'||label==='Öğrenciler';card.classList.toggle('dbx-rich',rich);const old=$('.dbx-break',card);if(!rich){old?.remove();return}const html=detayHtml(label==='Personel'?personelDetay():ogrenciDetay());if(!old)card.insertAdjacentHTML('beforeend',html);else if(old.outerHTML!==html)old.outerHTML=html}
function refresh(){style();socialContrast();const grid=$('#db41InfoGrid');if(!grid)return;ensureServiceCard(grid);$$('.db41-info',grid).forEach(card=>{const label=$('.a',card)?.textContent?.trim(),out=$('.v',card);if(!label||!out)return;let v=valueFor(label);if((!v)&&['Personel','Öğrenciler','Sınıflar'].includes(label)){const f=legacyFallback(label);if(f!=null)v=f}if(v!=null&&out.textContent!==String(v))out.textContent=String(v);enrich(card,label)});observeGrid(grid)}
function observeGrid(grid){if(gridObserver||!grid)return;let raf=0;gridObserver=new MutationObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(refresh)});gridObserver.observe(grid,{childList:true})}
function servisDinleyiciKur(){const db=g('db'),auth=g('auth'),uid=auth?.currentUser?.uid||'';if(!db||!uid||uid===servisUid&&servisUnsub)return;if(servisUnsub)try{servisUnsub()}catch(_){}servisUid=uid;try{const col=g('COL')?.servisler||'oy_servisler';servisUnsub=db.collection(col).onSnapshot(s=>{servisRemoteCount=s.size;refresh()},e=>console.warn('Servis sayacı:',e))}catch(e){console.warn(e)}}
window.dashboardBilgiKartlariYenile=()=>{servisDinleyiciKur();refresh()};
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{servisDinleyiciKur();refresh()},450));window.addEventListener('load',()=>setTimeout(refresh,600));
})();
