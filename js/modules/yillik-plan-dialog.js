/* Koruk Asistan — Yıllık plan pencereleri
 * Word'den toplu içe aktarma (MEB biçimi), plan tanımı, ana başlık havuzu, "Planlarım" seçimi ve hafta satırı düzenleme.
 * yillik-plan-ui.js tarafından create({ ...ctx, ui, yazabilir }) ile kurulur; kayıtlar YillikPlanService üzerinden yazılır. */
(function(global){
'use strict';
const C=global.YillikPlanCore;
const GRUPLAR=[['zorunlu','Zorunlu'],['secmeli','Seçmeli'],['iho','İHO']];
const SINIFLAR=[1,2,3,4,5,6,7,8,9,10,11,12];
const gunEkle=(iso,n)=>{const d=new Date(`${iso}T00:00:00`);d.setDate(d.getDate()+n);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};

/* Seçilen dosyayı bütün baytlarıyla okur (bazı Android seçicileri eksik/boş dönebilir). */
async function dosyaOku(file){
 const beklenen=Number(file?.size)||0,buffer=v=>v instanceof ArrayBuffer?v:ArrayBuffer.isView(v)?v.buffer.slice(v.byteOffset,v.byteOffset+v.byteLength):null,tam=b=>b instanceof ArrayBuffer&&b.byteLength>=4&&(!beklenen||b.byteLength===beklenen);
 let ab=null;
 if(typeof FileReader!=='undefined'){
  try{ab=await new Promise((ok,hata)=>{const r=new FileReader();r.onload=()=>ok(buffer(r.result));r.onerror=()=>hata(r.error||new Error('Word dosyası okunamadı.'));r.onabort=()=>hata(new Error('Word dosyası okuma işlemi iptal edildi.'));r.readAsArrayBuffer(file)})}catch(_){ab=null}
 }
 if(!tam(ab)&&typeof file.arrayBuffer==='function'){try{const y=buffer(await file.arrayBuffer());if(y&&y.byteLength>(ab?.byteLength||0))ab=y}catch(_){}}
 const n=ab?.byteLength||0;
 if(!n)throw new Error('Seçilen dosya okunamadı (0 bayt). Dosyayı cihazınıza indirip yeniden seçin.');
 if(beklenen&&n!==beklenen)throw new Error(`Dosya eksik okundu (${n} / ${beklenen} bayt). Dosyayı cihazınıza indirip yeniden seçin.`);
 const imza=new Uint8Array(ab,0,4);
 if(imza[0]!==0x50||imza[1]!==0x4b||imza[2]!==0x03||imza[3]!==0x04)throw new Error('Seçilen dosya geçerli bir Word (.docx) belgesi değil.');
 return ab;
}

function create(ctx){
const {esc,modal,toast,teacherId,ui}=ctx;
const service=()=>global.YillikPlanService;
const hataMetni=(e,varsayilan)=>e?.message==='yetkisiz'?'Bu işlem için yetkiniz yok.':(e?.message&&!/^[a-z-]+$/.test(e.message)?e.message:varsayilan);
const secenekler=(liste,secili)=>liste.map(([k,ad])=>`<option value="${esc(k)}"${String(k)===String(secili)?' selected':''}>${esc(ad)}</option>`).join('');
const sinifSecenekleri=secili=>secenekler([['','Seçin'],...SINIFLAR.map(n=>[n,`${n}. Sınıf`])],secili);
const gizleKaydet=ov=>{const k=ov.querySelector('[data-save]');if(k)k.hidden=true};

/* ---------- Plan seçenekleri ---------- */
function menu(){
 const ov=modal('Yıllık plan seçenekleri',`<div class="ka-yp-menu"><button class="ka-btn ka-btn--secondary" type="button" data-yp-m="yeni">＋ Yeni plan tanımı</button><button class="ka-btn ka-btn--secondary" type="button" data-yp-m="baslik">🏷️ Ana başlıklar</button></div>`);
 gizleKaydet(ov);
 ov.querySelector('[data-yp-m="yeni"]').onclick=()=>{ov.remove();tanim(null)};
 ov.querySelector('[data-yp-m="baslik"]').onclick=()=>{ov.remove();basliklar()};
}

/* ---------- Ana başlık havuzu ---------- */
function basliklar(){
 const satirlar=ui.havuz(),
  ov=modal('🏷️ Ana başlıklar',`<p class="ka-muted">Bu havuz bütün yıllık planların ortak sütun başlıklarını içerir.</p><div class="ka-yp-list">${satirlar.length?satirlar.map(b=>`<div class="ka-yp-list__row"><span>${esc(b.ad||'Başlık')}</span><button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-yp-baslik-sil="${esc(b.id)}">Sil</button></div>`).join(''):'<div class="ka-empty">Henüz ana başlık yok.</div>'}</div><div class="ka-row"><input data-yp-baslik-ad placeholder="Yeni başlık adı"><button class="ka-btn ka-btn--secondary" type="button" data-yp-baslik-ekle>Ekle</button></div>`);
 gizleKaydet(ov);
 ov.querySelector('[data-yp-baslik-ekle]').onclick=async()=>{
  const ad=ov.querySelector('[data-yp-baslik-ad]').value.trim();if(!ad)return;
  try{await service().baslikEkle({ad,sira:satirlar.length});ov.remove();basliklar()}catch(e){toast?.(hataMetni(e,'Başlık eklenemedi.'))}
 };
 ov.querySelectorAll('[data-yp-baslik-sil]').forEach(b=>b.onclick=async()=>{
  const id=b.dataset.ypBaslikSil,kullanimda=ui.planlar().some(p=>(p.sutunlar||[]).includes(id));
  if(kullanimda&&!confirm('Bu başlık en az bir planda kullanılıyor. Yine de silinsin mi?'))return;
  try{await service().baslikSil(id);ov.remove();basliklar()}catch(e){toast?.(hataMetni(e,'Başlık silinemedi.'))}
 });
}

/* ---------- Plan tanımı ---------- */
function tanim(planId){
 const plan=planId?ui.bul(planId):null,havuz=ui.havuz(),secili=new Set(plan?.sutunlar||[]),
  ov=modal(plan?'Plan bilgilerini düzenle':'Yeni plan tanımı',`<div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Ders adı</span><input data-yp-t="ders" value="${esc(plan?.dersAdi||'')}" placeholder="Örn: Fen Bilimleri"></label><label class="ka-field"><span class="ka-field__label">Sınıf</span><select data-yp-t="sinif">${sinifSecenekleri(plan?.seviye||'')}</select></label></div><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Eğitim-öğretim yılı</span><input data-yp-t="yil" value="${esc(plan?.egitimOgretimYili||ui.yil())}" placeholder="2026-2027"></label><label class="ka-field"><span class="ka-field__label">Ders türü</span><select data-yp-t="grup">${secenekler(GRUPLAR,plan?.grup||'zorunlu')}</select></label></div><label class="ka-field"><span class="ka-field__label">Yayın (isteğe bağlı)</span><input data-yp-t="yayin" value="${esc(plan?.yayin||'')}" placeholder="Örn: MEB Yayınları"></label><fieldset class="ka-field"><legend class="ka-field__label">Plan hangi sütunları içersin?</legend><div class="ka-yp-heading-grid">${havuz.length?havuz.map(h=>`<label class="ka-check"><input type="checkbox" data-yp-t-baslik value="${esc(h.id)}"${secili.has(h.id)?' checked':''}> ${esc(h.ad||'Başlık')}</label>`).join(''):'<div class="ka-empty">Önce “Ana başlıklar” bölümünden başlık ekleyin ya da Word’den içe aktarın.</div>'}</div></fieldset>`,!!plan);
 const al=a=>ov.querySelector(`[data-yp-t="${a}"]`).value.trim();
 ov.querySelector('[data-save]').onclick=async()=>{
  const dersAdi=al('ders'),seviye=Number(al('sinif'));
  if(!dersAdi)return toast?.('Ders adı zorunludur.');if(!seviye)return toast?.('Sınıf seçin.');
  const sutunlar=havuz.map(h=>h.id).filter(id=>ov.querySelector(`[data-yp-t-baslik][value="${id}"]`)?.checked);
  const veri={dersAdi,seviye,egitimOgretimYili:al('yil'),grup:al('grup'),yayin:al('yayin'),sutunlar};
  try{
   if(plan){const gruplar={};sutunlar.forEach(id=>{if(plan.baslikGruplari?.[id])gruplar[id]=plan.baslikGruplari[id]});await service().tanimGuncelle(plan.id,{...veri,baslikGruplari:gruplar});ov.remove();toast?.('Plan bilgileri kaydedildi.')}
   else{const ref=await service().tanimEkle({...veri,baslikGruplari:{},satirlar:[],dipnotlar:[],yilSonu:'',kaynak:'elle'});ov.remove();toast?.('Plan oluşturuldu.');if(ref?.id)ui.ac(ref.id)}
  }catch(e){toast?.(hataMetni(e,'Plan kaydedilemedi.'))}
 };
 ov.querySelector('[data-delete]')?.addEventListener('click',async()=>{
  if(!plan||!confirm(`“${plan.seviye}. Sınıf ${plan.dersAdi}” planı silinsin mi?`))return;
  try{await service().tanimSil(plan.id);ov.remove();toast?.('Plan silindi.');ui.geri()}catch(e){toast?.(hataMetni(e,'Plan silinemedi.'))}
 });
}

/* ---------- Planlarım seçimi ---------- */
function secim(){
 const tid=teacherId();if(!tid)return toast?.('Profilinize bağlı bir öğretmen kaydı bulunamadı.');
 const yil=ui.yil(),secili=new Set(ui.secilenPlanlar().map(p=>p.id)),
  liste=ui.planlar().filter(p=>ui.planYili(p)===yil).sort((a,b)=>Number(a.seviye)-Number(b.seviye)||String(a.dersAdi).localeCompare(String(b.dersAdi),'tr')),
  ov=modal('📚 Planlarım',`<p class="ka-muted">Takip etmek istediğiniz yıllık planları seçin. Ders programınızdaki dersler zaten otomatik görünür.</p><div class="ka-yp-picker">${liste.length?liste.map(p=>`<label class="ka-yp-picker__row"><input type="checkbox" value="${esc(p.id)}"${secili.has(p.id)?' checked':''}><span><strong>${esc(p.dersAdi)}</strong><small>${p.seviye}. Sınıf</small></span></label>`).join(''):'<div class="ka-empty">Bu yıl için kayıtlı yıllık plan yok.</div>'}</div>`);
 ov.querySelector('[data-save]').onclick=async()=>{
  const ids=[...ov.querySelectorAll('.ka-yp-picker input:checked')].map(x=>x.value);
  try{await service().secimKaydet(tid,ids);ov.remove();toast?.('Planlarım güncellendi.')}catch(e){toast?.(hataMetni(e,'Seçim kaydedilemedi.'))}
 };
}

/* ---------- Hafta satırı düzenleme ---------- */
const tarihAlani=(ad,anahtar,deger)=>`<label class="ka-field"><span class="ka-field__label">${ad}</span><input type="date" data-yp-s="${anahtar}" value="${esc(deger||'')}"></label>`;
function satir(planId,index){
 const plan=ui.bul(planId);if(!plan)return;
 const yil=plan.egitimOgretimYili,satirlar=(plan.satirlar||[]).map(r=>r.no!==undefined?{...r}:C.satirYukselt(r,yil)),yeni=index===null||index===undefined,
  eski=yeni?null:satirlar[index],onceki=satirlar[satirlar.length-1],sutunlar=C.sutunBilgileri(plan,ui.havuz());
 if(!yeni&&!eski)return;
 const bas=eski?.baslangic||(onceki?.bitis?gunEkle(onceki.bitis,1):''),bit=eski?.bitis||(bas?gunEkle(bas,6):''),saat=eski?.saat??onceki?.saat??'';
 const ov=modal(yeni?'Hafta satırı ekle':`${eski.hafta||'Hafta'} satırını düzenle`,`<div class="ka-grid">${tarihAlani('Başlangıç','bas',bas)}${tarihAlani('Bitiş','bit',bit)}</div><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Ders saati</span><input data-yp-s="saat" value="${esc(saat)}" placeholder="Örn: 3 saat"></label><label class="ka-field"><span class="ka-field__label">Tatil / özel satır</span><input data-yp-s="ozel" value="${esc(eski?.ozel||'')}" placeholder="Boş: normal ders haftası (ARA TATİL…)"></label></div><label class="ka-field"><span class="ka-field__label">Bayram / anma başlığı</span><input data-yp-s="bayram" value="${esc(eski?.bayram||'')}" placeholder="Örn: 29 Ekim Cumhuriyet Bayramı"></label><div class="ka-yp-row-fields">${sutunlar.map(c=>`<label class="ka-field"><span class="ka-field__label">${esc(c.ad)}</span><textarea rows="3" data-yp-s-sutun="${esc(c.id)}">${esc(eski?.degerler?.[c.id]||'')}</textarea></label>`).join('')}</div>`,!yeni);
 const al=a=>ov.querySelector(`[data-yp-s="${a}"]`).value.trim();
 ov.querySelector('[data-save]').onclick=async()=>{
  const b=al('bas'),e=al('bit')||b;
  if(!b)return toast?.('Başlangıç tarihi zorunludur.');if(e<b)return toast?.('Bitiş tarihi başlangıçtan önce olamaz.');
  const degerler={};ov.querySelectorAll('[data-yp-s-sutun]').forEach(t=>{const v=t.value.trim();if(v)degerler[t.dataset.ypSSutun]=v});
  const kayit={...(eski||{birlesik:[]}),baslangic:b,bitis:e,tarih:C.tarihMetni(b,e),ay:C.AY_ADI[Number(b.slice(5,7))-1]||'',saat:al('saat'),ozel:al('ozel'),bayram:al('bayram'),degerler};
  let sonuc;
  if(yeni){sonuc=[...satirlar];const yer=sonuc.findIndex(r=>r.baslangic&&r.baslangic>b);yer<0?sonuc.push(kayit):sonuc.splice(yer,0,kayit)}
  else{sonuc=satirlar.map((r,i)=>i===index?kayit:r)}
  C.numaralandir(sonuc);
  try{await service().tanimGuncelle(plan.id,{satirlar:sonuc});ov.remove();toast?.('Hafta satırı kaydedildi.')}catch(err){toast?.(hataMetni(err,'Satır kaydedilemedi.'))}
 };
 ov.querySelector('[data-delete]')?.addEventListener('click',async()=>{
  if(!confirm('Bu hafta satırı silinsin mi?'))return;
  const sonuc=satirlar.filter((_,i)=>i!==index);C.numaralandir(sonuc);
  try{await service().tanimGuncelle(plan.id,{satirlar:sonuc});ov.remove();toast?.('Satır silindi.')}catch(err){toast?.(hataMetni(err,'Satır silinemedi.'))}
 });
}

/* ---------- Word'den toplu içe aktarma ---------- */
function wordIceAktar(){
 let kayitlar=[];
 const ov=modal('📄 Word’den içe aktar',`<p class="ka-muted">MEB biçimli “Ünitelendirilmiş Yıllık Plan” Word dosyalarını (.docx) seçin. Birden çok dosya aynı anda eklenebilir; tablo, birleşik hücre ve tatil satırları olduğu gibi okunur.</p><label class="ka-field"><span class="ka-field__label">Word dosyaları</span><input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple data-yp-dosya></label><label class="ka-field"><span class="ka-field__label">Yayın (isteğe bağlı)</span><input data-yp-yayin placeholder="Örn: MEB Yayınları"></label><div class="ka-yp-import" data-yp-onizleme></div><label class="ka-field" data-yp-politika hidden><span class="ka-field__label">Kayıtlı plan bulunan dersler</span><select data-yp-politika-sec><option value="guncelle">Mevcut planı bu dosyayla güncelle</option><option value="atla">Atla, mevcut planı koru</option></select></label>`);
 const kaydet=ov.querySelector('[data-save]'),alan=ov.querySelector('[data-yp-onizleme]'),politika=ov.querySelector('[data-yp-politika]');
 kaydet.textContent='İçe aktar';kaydet.disabled=true;
 const mevcutMu=k=>{const a=C.planAnahtari({seviye:k.seviye,dersAdi:k.dersAdi,egitimOgretimYili:k.yil});return ui.planlar().find(p=>C.planAnahtari(p)===a)||null};
 const ozet=k=>{const s=k.ayrisan.satirlar,hafta=s.filter(r=>r.no>0).length,unite=C.uniteListesi(s,'unite_tema').length;return`${s.length} satır · ${hafta} ders haftası${unite?` · ${unite} ünite/tema`:''}`};
 function durumYaz(i){
  const k=kayitlar[i],el=alan.querySelector(`[data-yp-d="${i}"] [data-yp-durum]`);if(!el||!k)return;
  const eksik=!k.dersAdi.trim()||!(k.seviye>=1&&k.seviye<=12),var_=!eksik&&mevcutMu(k);
  el.className=`ka-yp-import__durum${eksik?' is-warn':var_?' is-info':''}`;
  el.textContent=eksik?'Ders adı ve sınıf gerekli':var_?'Bu ders için kayıtlı plan var':'Yeni plan';
  politika.hidden=!kayitlar.some(x=>x.ayrisan&&x.secili&&!(!x.dersAdi.trim()||!(x.seviye>=1&&x.seviye<=12))&&mevcutMu(x));
 }
 function cizOnizleme(){
  alan.innerHTML=kayitlar.map((k,i)=>k.hata?`<div class="ka-yp-import__item is-error" data-yp-d="${i}"><strong>${esc(k.ad)}</strong><span>${esc(k.hata)}</span></div>`
   :`<div class="ka-yp-import__item" data-yp-d="${i}"><label class="ka-check"><input type="checkbox" data-yp-sec="${i}"${k.secili?' checked':''}> <strong>${esc(k.ad)}</strong></label><small>${esc(ozet(k))}</small><div class="ka-yp-import__grid"><label class="ka-field"><span class="ka-field__label">Ders</span><input data-yp-a="dersAdi" value="${esc(k.dersAdi)}"></label><label class="ka-field"><span class="ka-field__label">Sınıf</span><select data-yp-a="seviye">${sinifSecenekleri(k.seviye||'')}</select></label><label class="ka-field"><span class="ka-field__label">Yıl</span><input data-yp-a="yil" value="${esc(k.yil)}"></label><label class="ka-field"><span class="ka-field__label">Tür</span><select data-yp-a="grup">${secenekler(GRUPLAR,k.grup)}</select></label></div><span data-yp-durum></span></div>`).join('')||'';
  kayitlar.forEach((_,i)=>durumYaz(i));
  kaydet.disabled=!kayitlar.some(k=>k.ayrisan&&k.secili);
 }
 ov.querySelector('[data-yp-dosya]').addEventListener('change',async e=>{
  const dosyalar=[...(e.target.files||[])];if(!dosyalar.length)return;
  kaydet.disabled=true;alan.innerHTML=`<div class="ka-muted">${dosyalar.length} dosya okunuyor…</div>`;kayitlar=[];
  for(const f of dosyalar){
   try{
    const xml=await global.YillikPlanWord.belgeXmlOku(await dosyaOku(f)),ayrisan=C.docxAyristir(xml);
    kayitlar.push({ad:f.name,ayrisan,secili:true,dersAdi:ayrisan.dersAdi||'',seviye:Number(ayrisan.seviye)||0,yil:ayrisan.egitimOgretimYili||C.okulYili(),grup:ayrisan.grup||'zorunlu'});
   }catch(err){kayitlar.push({ad:f.name,hata:err?.message||'Dosya okunamadı.'})}
  }
  cizOnizleme();
 });
 alan.addEventListener('change',e=>{
  const kutu=e.target.closest('[data-yp-d]');if(!kutu)return;const i=Number(kutu.dataset.ypD),k=kayitlar[i];if(!k)return;
  if(e.target.matches('[data-yp-sec]'))k.secili=e.target.checked;
  else if(e.target.dataset.ypA){const a=e.target.dataset.ypA;k[a]=a==='seviye'?Number(e.target.value)||0:e.target.value.trim()}
  durumYaz(i);kaydet.disabled=!kayitlar.some(x=>x.ayrisan&&x.secili&&x.dersAdi.trim()&&x.seviye>=1);
 });
 kaydet.onclick=async()=>{
  const secilen=kayitlar.filter(k=>k.ayrisan&&k.secili);
  if(secilen.some(k=>!k.dersAdi.trim()||!(k.seviye>=1&&k.seviye<=12)))return toast?.('Seçili dosyalarda ders adı ve sınıf doldurulmalı.');
  const atla=ov.querySelector('[data-yp-politika-sec]').value==='atla',yayin=ov.querySelector('[data-yp-yayin]').value.trim(),eski=kaydet.textContent;
  kaydet.disabled=true;
  const havuz=ui.havuz(),kimlik=new Map(havuz.map(h=>[C.baslikBilgisi(h.ad).key,h.id]));let yeniBaslik=0,eklenen=0,guncellenen=0,atlanan=0,sira=0;
  const baslikId=async b=>{
   if(kimlik.has(b.anahtar))return kimlik.get(b.anahtar);
   const ref=await service().baslikEkle({ad:b.ad,sira:havuz.length+yeniBaslik++});if(!ref?.id)throw new Error(`“${b.ad}” başlığı oluşturulamadı.`);kimlik.set(b.anahtar,ref.id);return ref.id;
  };
  try{
   for(const k of secilen){
    kaydet.textContent=`Aktarılıyor… ${++sira}/${secilen.length}`;
    const var_=mevcutMu(k);if(var_&&atla){atlanan++;continue}
    const anahtarId={};for(const b of k.ayrisan.basliklar)anahtarId[b.anahtar]=await baslikId(b);
    const veri=C.kayitHazirla({...k.ayrisan,dersAdi:k.dersAdi.trim(),seviye:k.seviye,egitimOgretimYili:k.yil.trim()||C.okulYili(),grup:k.grup,yayin},anahtarId);
    if(var_){await service().tanimGuncelle(var_.id,veri);guncellenen++}else{await service().tanimEkle(veri);eklenen++}
   }
   ov.remove();
   toast?.(`Word aktarımı tamamlandı: ${eklenen} yeni, ${guncellenen} güncellendi${atlanan?`, ${atlanan} atlandı`:''}.`);
  }catch(err){kaydet.disabled=false;kaydet.textContent=eski;toast?.(hataMetni(err,'Word aktarımı başarısız.'))}
 };
}

return{menu,basliklar,tanim,secim,satir,wordIceAktar};
}
global.YillikPlanDialog={create,dosyaOku,SINIFLAR};
})(window);
