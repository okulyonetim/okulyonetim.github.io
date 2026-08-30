/* Koruk Asistan — Classic Management visible parity
 * 708c82a görünür Personel / Periyodik İşler / Puantaj / Dilekçe deneyimini
 * mevcut ManagementModule ve local-first servislerine dokunmadan geri kurar.
 * Yalnız presentation/document katmanıdır; repository, veri yazma veya tema oluşturmaz.
 */
(function(global){
'use strict';
if(global.ClassicPersonnelParity)return;

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]||c));
const norm=v=>String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');
const data=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const people=()=>{const v=global.AppStore?.data?.('personel');return Array.isArray(v)?v:[]};
const canEdit=()=>!!(global.PermissionService?.can?.('management.personnel.edit','edit')||global.PermissionService?.can?.('management.personnel','edit')||global.duzenleyebilir?.('personel'));
let search='',observer=null,scheduled=false,newBridge=null;
const detailBridge=new Map();

function name(p){return String(p?.adSoyad||[p?.ad,p?.soyad].filter(Boolean).join(' ')||'İsimsiz Personel').trim()||'İsimsiz Personel';}
function nativeStaffPage(){const content=$('#managementContent');if(!content||content.querySelector('[data-classic-personnel-page]'))return false;return [...content.querySelectorAll('h3')].some(h=>h.textContent.trim()==='Personeller');}
function parityStaffPage(){return !!$('#managementContent [data-classic-personnel-page]');}
function shell(){return $('[data-management-module]');}
function headerRow(){return shell()?.querySelector(':scope > .ka-row.ka-row--between')||null;}
function searchWrap(){return shell()?.querySelector('[data-management-search-wrap]')||null;}
function content(){return $('#managementContent');}
function nativeHeading(){return content()?.querySelector('h3')||null;}
function setShellTitle(title){const h=headerRow()?.querySelector('h2');if(h&&h.textContent!==title)h.textContent=title;}

function captureBridges(){
  const c=content();
  if(!c||c.querySelector('[data-classic-personnel-page]'))return;
  const n=c.querySelector('[data-staff-new]');
  if(n)newBridge=n;
  c.querySelectorAll('[data-staff-detail]').forEach(b=>{
    const id=b.dataset.staffDetail;
    if(id)detailBridge.set(id,b);
  });
}
function restoreShell(){const h=headerRow(),s=searchWrap();if(h)h.hidden=false;if(s)s.hidden=false;}
function openDetail(id){const b=detailBridge.get(id);if(!b)return global.toast?.('Personel detayı açılamadı. Sayfayı yenileyip tekrar deneyin.');b.click();}
function openEditor(id){const b=detailBridge.get(id);if(!b)return global.toast?.('Personel düzenleme ekranı açılamadı.');b.click();$('#kaManagementStaffDetail [data-staff-edit]')?.click();}
function openNew(){if(newBridge)return newBridge.click();global.toast?.('Yeni personel formu açılamadı.');}
function filtered(){const q=norm(search.trim());return people().filter(p=>!q||norm(p.adSoyad||[p.ad,p.soyad].filter(Boolean).join(' ')).includes(q)||norm(p.tc).includes(q)||norm(p.gorev||p.unvan).includes(q)).sort((a,b)=>name(a).localeCompare(name(b),'tr'));}
function row(p){const role=p.gorev||p.unvan||'Personel',tc=p.tc?`TC: ${esc(p.tc)}`:'TC kaydı yok',phone=p.telefon?` · 📞 ${esc(p.telefon)}`:'',edit=canEdit()&&detailBridge.has(p.id);return `<article class="ka-card ka-list-card" data-classic-personnel-id="${esc(p.id)}"><div class="ka-card__body ka-row ka-row--between"><button type="button" class="ka-grow" data-classic-personnel-detail="${esc(p.id)}" style="border:0;background:none;text-align:left;padding:0;color:inherit;min-width:0"><div class="ka-row ka-wrap"><strong>${esc(name(p))}</strong><span class="ka-badge">${esc(role)}</span></div><div class="ka-muted">${tc}${phone}</div></button>${edit?`<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-classic-personnel-edit="${esc(p.id)}">Düzenle</button>`:''}</div></article>`;}
function render(force=false){
  if(!parityStaffPage()&&!nativeStaffPage())return false;
  captureBridges();const host=content();if(!host)return false;
  const h=headerRow(),s=searchWrap();if(h)h.hidden=true;if(s)s.hidden=true;
  const list=filtered(),sig=JSON.stringify([search,list.map(p=>[p.id,p.adSoyad,p.tc,p.gorev,p.telefon,p.kadroKademesi,p.guncellenmeTarihi])]);
  if(!force&&host.dataset.classicPersonnelSignature===sig&&host.querySelector('[data-classic-personnel-page]'))return true;
  host.dataset.classicPersonnelSignature=sig;
  host.innerHTML=`<section class="ka-stack" data-classic-personnel-page><div class="ka-row ka-row--between ka-wrap"><div class="ka-grow"><h2>Personel İşleri</h2><p class="ka-muted">Sürekli işçi, hizmetli ve diğer personel kayıtları &amp; dilekçe sistemi</p></div>${canEdit()&&newBridge?'<button class="ka-btn" type="button" data-classic-personnel-new>+ Yeni Personel</button>':''}</div><article class="ka-card"><div class="ka-card__body"><input type="search" data-classic-personnel-search value="${esc(search)}" placeholder="🔍 Ad, TC veya görev ile ara..." aria-label="Personel ara"></div></article><article class="ka-card"><div class="ka-card__body ka-stack" data-classic-personnel-list>${list.length?list.map(row).join(''):'<div class="ka-empty">Henüz personel eklenmedi. “+ Yeni Personel” ile ekleyin.</div>'}</div></article></section>`;
  const count=$('#managementCount');if(count)count.textContent=`${list.length} kayıt`;
  host.querySelector('[data-classic-personnel-new]')?.addEventListener('click',openNew);
  host.querySelector('[data-classic-personnel-search]')?.addEventListener('input',e=>{search=e.currentTarget.value;render(true)});
  host.querySelectorAll('[data-classic-personnel-detail]').forEach(b=>b.onclick=()=>openDetail(b.dataset.classicPersonnelDetail));
  host.querySelectorAll('[data-classic-personnel-edit]').forEach(b=>b.onclick=e=>{e.stopPropagation();openEditor(b.dataset.classicPersonnelEdit)});
  global.PermissionService?.apply?.(host);
  requestAnimationFrame(()=>host.querySelector('[data-classic-personnel-search]')?.setSelectionRange?.(search.length,search.length));
  return true;
}

function periodicTemplate(){const d=data('periyodikSablon').find(x=>x.id==='sablon');return Array.isArray(d?.gorevler)?d.gorevler:[];}
function decoratePeriodic(){
  const c=content(),h=nativeHeading();if(!c||!h||!['Aylık İşler','Periyodik İşler'].includes(h.textContent.trim()))return false;
  setShellTitle('Periyodik İşler');
  if(h.textContent!=='Periyodik İşler')h.textContent='Periyodik İşler';
  const intro=h.parentElement?.querySelector('.ka-muted');
  const introText='Okul taşıma, ek ders, puantaj, İŞKUR gibi her ay tekrarlayan işler';
  if(intro&&intro.textContent!==introText)intro.textContent=introText;
  const tplStrong=[...c.querySelectorAll('strong')].find(x=>x.textContent.trim()==='Aylık Şablon');
  const tplCard=tplStrong?.closest('.ka-card');
  const tplMuted=tplStrong?.parentElement?.querySelector('.ka-muted');
  const n=periodicTemplate().length;
  const tplText=n?`${n} görev tanımlı — "Bu Ayın Görevlerini Oluştur" ile tek tıkla ekleyebilirsiniz.`:'Henüz şablon tanımlanmadı. "Şablonu Düzenle" ile puantaj, ek ders, İŞKUR gibi her ay tekrarlayan görevlerinizi bir kez tanımlayın.';
  if(tplMuted&&tplMuted.textContent!==tplText)tplMuted.textContent=tplText;
  if(tplCard)tplCard.dataset.classicPeriodicTemplate='1';
  const empty=[...c.querySelectorAll('.ka-empty')].find(x=>x.textContent.trim()==='Henüz periyodik iş eklenmedi.');
  const emptyText='Henüz periyodik iş eklenmedi. "+ Yeni İş" ile okul taşıma, ek ders, puantaj, İŞKUR gibi tekrarlayan işlerini ekleyebilirsin.';
  if(empty&&empty.textContent!==emptyText)empty.textContent=emptyText;
  c.dataset.classicPeriodic='1';
  return true;
}

const MONTHS={ocak:0,subat:1,mart:2,nisan:3,mayis:4,haziran:5,temmuz:6,agustos:7,eylul:8,ekim:9,kasim:10,aralik:11};
function iso(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
function activeStaffStatus(personelId,day){return data('personelIzinler').find(k=>{if(k.personelId!==personelId)return false;const b=k.baslangic||k.baslangicTarihi||'',e=k.bitis||k.bitisTarihi||b;return b&&day>=b&&day<=e;})||null;}
function statusCode(tur){const n=norm(tur).replace(/\s+/g,' ');if(n.includes('cumartesi calismasi'))return'CÇ';if(n.includes('pazar tam calismasi'))return'PÇ';if(n.includes('ubgt'))return'UBGT';if(n.includes('yillik'))return'Y';if(n.includes('rapor')||n.includes('hastalik'))return'R';if(n.includes('mazeret')||n.includes('ucretsiz'))return'M';return n?'M':'';}
function officialHoliday(day){return data('resmiTatiller').some(t=>t.tarih===day);}
function legacyDayCode(personelId,y,m,d){const day=iso(y,m,d),k=activeStaffStatus(personelId,day),code=statusCode(k?.tur);if(code)return code;if(officialHoliday(day))return'T';const wd=new Date(y,m,d).getDay();if(wd===0||wd===6)return'H';return'X';}
function codeStyle(td,code){td.style.background='';td.style.color='';td.style.fontWeight='';if(code==='H'){td.style.background='#e8f5e9';td.style.color='#607d8b'}else if(code==='T'){td.style.background='#fff9c4';td.style.color='#7a6500'}else if(code==='Y'||code==='R'||code==='M'){td.style.background='#ffebee';td.style.color='#b3261e'}else if(['CÇ','PÇ','UBGT'].includes(code)){td.style.background='#e3f2fd';td.style.color='#1565c0'}else{td.style.background='#fff';td.style.color='#222'}if(code!=='X')td.style.fontWeight='700';}
function puantajPeriod(){const h=nativeHeading();if(!h)return null;const parts=norm(h.textContent).split(/\s+/),m=MONTHS[parts[0]],y=Number(parts.find(x=>/^20\d\d$/.test(x)));return Number.isInteger(m)&&y?{y,m}:null;}
function decoratePuantaj(){
  const table=$('#puantajTablosu');if(!table)return false;const per=puantajPeriod();if(!per)return false;
  setShellTitle('Puantaj & İmza Sirküsü');
  const list=people().filter(p=>p.adSoyad||p.ad).sort((a,b)=>String(a.adSoyad||a.ad||'').localeCompare(String(b.adSoyad||b.ad||''),'tr'));
  const sig=JSON.stringify([per.y,per.m,list.map(x=>x.id),data('personelIzinler').map(x=>[x.id,x.personelId,x.tur,x.baslangic,x.bitis,x.baslangicTarihi,x.bitisTarihi]),data('resmiTatiller').map(x=>[x.id,x.tarih])]);
  if(table.dataset.classicPuantajSignature===sig)return true;
  const rows=[...table.tBodies?.[0]?.rows||[]],days=new Date(per.y,per.m+1,0).getDate();
  rows.forEach((tr,ri)=>{const p=list[ri];if(!p)return;let work=0,special=0;for(let d=1;d<=days;d++){const td=tr.cells[d+1];if(!td)continue;const code=legacyDayCode(p.id,per.y,per.m,d);td.textContent=code;codeStyle(td,code);if(code==='X')work++;else if(!['H','T'].includes(code))special++;}const workCell=tr.cells[days+2],specialCell=tr.cells[days+3];if(workCell)workCell.textContent=String(work);if(specialCell)specialCell.textContent=String(special);});
  const legend=table.parentElement?.nextElementSibling;if(legend&&legend.textContent.includes('Kodlar:'))legend.innerHTML='Kodlar: <b>X</b>=Normal · <b>Y</b>=Yıllık İzin · <b>R</b>=Rapor · <b>M</b>=Mazeret · <b>H</b>=Hafta Tatili · <b>T</b>=Resmi Tatil · <b>CÇ</b>=Cumartesi Çalışması · <b>PÇ</b>=Pazar Tam Çalışması · <b>UBGT</b>=Ulusal Bayram/Genel Tatil Çalışması';
  table.dataset.classicPuantajSignature=sig;
  return true;
}

const OFFICIAL_PETITION_TYPES=[
  ['personelIzin','Personel İzin Dilekçesi'],
  ['diplomaKayit','Diploma Kayıt Örneği Talep Dilekçesi'],
  ['diplomaKayitCevap','Diploma Kayıt Örneği (Okul Cevabı)']
];
const PETITION_LEAVES=['Yıllık İzin','Mazeret İzni','Hastalık İzni','Ücretsiz İzin','Refakat İzni','Doğum İzni','Babalık İzni','Diğer'];
function schoolInfo(){const rows=data('okulBilgileri'),o=rows.find(x=>x.id==='ayarlar')||rows[0]||global.okulBilgileriAyari||{};return{okulAdi:o.okulAdi||'KORUK İLK-ORTAOKULU',il:o.il||'',ilce:o.ilce||'',mudurluk:o.mebMudurlugu||''};}
function numberWord(n){n=parseInt(n,10);if(!Number.isFinite(n)||n<=0)return'';const one=['','bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz'],ten=['','on','yirmi','otuz','kırk','elli','altmış','yetmiş','seksen','doksan'];if(n<100)return[ten[Math.floor(n/10)],one[n%10]].filter(Boolean).join(' ');if(n<1000)return[(Math.floor(n/100)===1?'yüz':one[Math.floor(n/100)]+' yüz'),numberWord(n%100)].filter(Boolean).join(' ');return String(n);}
function trDate(v){if(!v)return'....../....../............';const p=String(v).split('-');return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:String(v);}
function petitionCss(){return `font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.55;color:#000;background:#fff;min-height:260mm;padding:22mm 24mm 20mm 28mm;box-sizing:border-box`;}
function headingHtml(school,extra=''){return `<div style="text-align:center;margin-bottom:28mm"><div style="font-weight:700;text-transform:uppercase">${esc((school.okulAdi||'').toLocaleUpperCase('tr'))} MÜDÜRLÜĞÜNE</div>${school.il?`<div style="font-weight:700;text-transform:uppercase;margin-top:2px">${esc(school.il.toLocaleUpperCase('tr'))}</div>`:''}${extra}</div>`;}
function personelById(id){return people().find(x=>x.id===id)||{};}
function buildPetition(state){
  const school=schoolInfo();
  if(state.type==='personelIzin'){
    const p=personelById(state.personelId),ad=name(p),tc=p.tc||state.tc||'',gorev=p.gorev||p.unvan||'...........................',sure=Math.max(1,Number(state.sure)||1),body=state.body||`Okulunuzda ${gorev} olarak görev yapmaktayım. ${trDate(state.baslangic)} tarihinden itibaren ${sure} (${numberWord(sure)}) gün ${state.izinTuru||'izin'} hakkımı kullanmak istiyorum.`;
    return `<div style="${petitionCss()}">${headingHtml(school)}<div style="text-align:justify;margin-bottom:10mm;text-indent:12mm">${esc(body)}</div><div style="margin-bottom:18mm">Gereğini olurlarınıza arz ederim.</div><div style="text-align:right;margin-bottom:24mm"><div>${trDate(state.tarih||'')}</div><div style="height:14mm"></div><div>${esc(ad)}</div></div><div style="line-height:1.9">${tc?`<div>TC: ${esc(tc)}</div>`:''}<div>Görevi: ${esc(gorev)}</div>${p.adres?`<div>Adres: ${esc(p.adres)}</div>`:''}${p.telefon?`<div>Telefon: ${esc(p.telefon)}</div>`:''}</div></div>`;
  }
  if(state.type==='diplomaKayit'){
    const body=state.body||`${trDate(state.mezuniyetTarihi)} tarihinde ${school.okulAdi}'ndan mezun oldum. Diplomamı kaybettiğimden tarafıma diploma kayıt örneği düzenlenmesi hususunda;`;
    return `<div style="${petitionCss()}">${headingHtml(school)}<table style="border-collapse:collapse;margin-bottom:8mm"><tbody>${[['Adı ve Soyadı',state.adSoyad],['Baba Adı',state.babaAdi],['Anne Adı',state.anneAdi],['Doğum Yeri',state.dogumYeri],['Doğum Tarihi',trDate(state.dogumTarihi)],['Mezun Olduğu Sınıf',state.mezunSinif]].map(([a,b])=>`<tr><td style="font-weight:700;padding:1mm 6mm 1mm 0;white-space:nowrap">${esc(a)}</td><td>: ${esc(b||'')}</td></tr>`).join('')}</tbody></table><div style="text-align:justify;margin-bottom:8mm">${esc(body)}</div><div style="margin-bottom:18mm">Gereğini arz ederim.</div><div style="display:flex;justify-content:space-between;gap:16mm"><div style="line-height:1.8">${state.tc?`<div>TC: ${esc(state.tc)}</div>`:''}${state.adres?`<div>Adres: ${esc(state.adres)}</div>`:''}${state.telefon?`<div>Telefon: ${esc(state.telefon)}</div>`:''}</div><div style="text-align:right"><div>${trDate(state.tarih||'')}</div><div style="height:14mm"></div><div>${esc(state.adSoyad||'')}</div></div></div></div>`;
  }
  const kizOglu=state.kizOglu||'kızı/oğlu',body=state.body||`Dilekçe sahibi ${state.tc||'..........................'} T.C. Kimlik Nolu, ${trDate(state.dogumTarihi)} doğumlu, ${state.babaAdi||'...........................'} ${kizOglu} ${state.adSoyad||'...........................'}'ın ${school.okulAdi}'ndan (${state.ogrenimSuresi||'.....'} yıllık) ${trDate(state.diplomaTarihi)} tarih ve ${state.diplomaSayisi||'............'} sayılı diplomayı almaya hak kazandığı resmi kayıtların incelenmesinden anlaşılmıştır.`;
  return `<div style="${petitionCss()}"><div style="text-align:center;font-weight:700;margin-bottom:12mm">T.C.<br>${esc((school.il||'').toLocaleUpperCase('tr'))} ${esc((school.ilce||'').toLocaleUpperCase('tr'))}<br>${esc((school.okulAdi||'').toLocaleUpperCase('tr'))} MÜDÜRLÜĞÜ</div><div style="text-align:center;font-weight:700;text-decoration:underline;margin:3mm 0 9mm">DİPLOMA KAYIT ÖRNEĞİ</div><div style="text-align:justify;margin-bottom:12mm">${esc(body)}</div><div style="text-align:right;margin-top:20mm"><div>${trDate(state.tarih||'')}</div><div style="height:16mm"></div><div style="font-weight:700">Okul Müdürü</div></div></div>`;
}
function petitionFields(state){
  const type=state.type;
  if(type==='personelIzin')return `<label class="ka-field"><span class="ka-field__label">Personel</span><select data-op="personelId"><option value="">— Seçiniz —</option>${people().slice().sort((a,b)=>name(a).localeCompare(name(b),'tr')).map(p=>`<option value="${esc(p.id)}" ${p.id===state.personelId?'selected':''}>${esc(name(p))}</option>`).join('')}</select></label><label class="ka-field"><span class="ka-field__label">İzin Türü</span><select data-op="izinTuru">${PETITION_LEAVES.map(x=>`<option ${x===state.izinTuru?'selected':''}>${esc(x)}</option>`).join('')}</select></label><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Başlangıç</span><input type="date" data-op="baslangic" value="${esc(state.baslangic||'')}"></label><label class="ka-field"><span class="ka-field__label">Süre (gün)</span><input type="number" min="1" max="365" data-op="sure" value="${esc(state.sure||'1')}"></label></div>`;
  if(type==='diplomaKayit')return `<label class="ka-field"><span class="ka-field__label">Adı ve Soyadı</span><input data-op="adSoyad" value="${esc(state.adSoyad||'')}"></label><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">T.C. Kimlik No</span><input data-op="tc" value="${esc(state.tc||'')}"></label><label class="ka-field"><span class="ka-field__label">Mezun Olduğu Sınıf</span><input data-op="mezunSinif" value="${esc(state.mezunSinif||'')}"></label></div><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Baba Adı</span><input data-op="babaAdi" value="${esc(state.babaAdi||'')}"></label><label class="ka-field"><span class="ka-field__label">Anne Adı</span><input data-op="anneAdi" value="${esc(state.anneAdi||'')}"></label></div><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Doğum Yeri</span><input data-op="dogumYeri" value="${esc(state.dogumYeri||'')}"></label><label class="ka-field"><span class="ka-field__label">Doğum Tarihi</span><input type="date" data-op="dogumTarihi" value="${esc(state.dogumTarihi||'')}"></label></div><label class="ka-field"><span class="ka-field__label">Mezuniyet Tarihi</span><input type="date" data-op="mezuniyetTarihi" value="${esc(state.mezuniyetTarihi||'')}"></label><label class="ka-field"><span class="ka-field__label">Adres</span><textarea data-op="adres" rows="2">${esc(state.adres||'')}</textarea></label><label class="ka-field"><span class="ka-field__label">Telefon</span><input data-op="telefon" value="${esc(state.telefon||'')}"></label>`;
  return `<label class="ka-field"><span class="ka-field__label">Adı ve Soyadı</span><input data-op="adSoyad" value="${esc(state.adSoyad||'')}"></label><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">T.C. Kimlik No</span><input data-op="tc" value="${esc(state.tc||'')}"></label><label class="ka-field"><span class="ka-field__label">Doğum Tarihi</span><input type="date" data-op="dogumTarihi" value="${esc(state.dogumTarihi||'')}"></label></div><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Baba Adı</span><input data-op="babaAdi" value="${esc(state.babaAdi||'')}"></label><label class="ka-field"><span class="ka-field__label">Kızı / Oğlu</span><select data-op="kizOglu"><option value="oğlu" ${state.kizOglu==='oğlu'?'selected':''}>oğlu</option><option value="kızı" ${state.kizOglu==='kızı'?'selected':''}>kızı</option></select></label></div><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Öğrenim Süresi (yıl)</span><input type="number" min="1" data-op="ogrenimSuresi" value="${esc(state.ogrenimSuresi||'8')}"></label><label class="ka-field"><span class="ka-field__label">Diploma Sayısı</span><input data-op="diplomaSayisi" value="${esc(state.diplomaSayisi||'')}"></label></div><label class="ka-field"><span class="ka-field__label">Diploma Tarihi</span><input type="date" data-op="diplomaTarihi" value="${esc(state.diplomaTarihi||'')}"></label>`;
}
function closeOfficialPetition(){document.getElementById('classicOfficialPetitionOverlay')?.remove();}
function petitionTitle(type){return OFFICIAL_PETITION_TYPES.find(x=>x[0]===type)?.[1]||'Dilekçe';}
function openOfficialPetition(initialPersonelId=''){
  closeOfficialPetition();
  const state={type:'personelIzin',personelId:initialPersonelId,izinTuru:PETITION_LEAVES[0],sure:1,baslangic:'',tarih:'',body:''};let manual=false;
  const ov=document.createElement('div');ov.id='classicOfficialPetitionOverlay';ov.className='ka-modal-backdrop';ov.style.zIndex='1500';ov.innerHTML=`<section class="ka-modal" style="width:min(1180px,96vw);max-width:1180px;max-height:94dvh"><div class="ka-modal__header"><div><h2>Resmi Dilekçe Oluştur</h2><p class="ka-muted">A4 önizleme alanı doğrudan düzenlenebilir.</p></div><button class="ka-icon-button" type="button" data-op-close aria-label="Kapat">×</button></div><div class="ka-modal__body" style="display:grid;grid-template-columns:minmax(280px,360px) minmax(0,1fr);gap:16px;overflow:auto"><div class="ka-stack"><label class="ka-field"><span class="ka-field__label">Dilekçe Türü</span><select data-op-type>${OFFICIAL_PETITION_TYPES.map(([k,a])=>`<option value="${k}">${esc(a)}</option>`).join('')}</select></label><div class="ka-stack" data-op-fields></div><label class="ka-field"><span class="ka-field__label">Belge Tarihi</span><input type="date" data-op="tarih"></label><label class="ka-field"><span class="ka-field__label">Gövde Metni (opsiyonel manuel)</span><textarea rows="5" data-op="body" placeholder="Boş bırakılırsa otomatik resmi metin kullanılır."></textarea></label><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-op-regenerate>Otomatik Metni Yenile</button></div><div style="overflow:auto;background:#525659;padding:14px;border-radius:12px"><div data-op-preview contenteditable="true" style="width:min(210mm,100%);margin:0 auto;background:#fff;box-shadow:0 4px 18px rgba(0,0,0,.28)"></div></div></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-op-download>⬇ HTML İndir</button><span class="ka-grow"></span><button class="ka-btn ka-btn--secondary" type="button" data-op-close>Kapat</button><button class="ka-btn" type="button" data-op-print>🖨 Yazdır / PDF</button></div></section>`;
  document.body.appendChild(ov);
  const fields=ov.querySelector('[data-op-fields]'),preview=ov.querySelector('[data-op-preview]'),typeSel=ov.querySelector('[data-op-type]');
  const syncState=()=>{ov.querySelectorAll('[data-op]').forEach(el=>{state[el.dataset.op]=el.type==='number'?Number(el.value||0):el.value});};
  const refresh=(force=false)=>{syncState();if(force)manual=false;if(!manual)preview.innerHTML=buildPetition(state);};
  const bindFields=()=>{fields.innerHTML=petitionFields(state);fields.querySelectorAll('input,select,textarea').forEach(el=>el.addEventListener('input',()=>refresh(false)));fields.querySelectorAll('select,input[type=date]').forEach(el=>el.addEventListener('change',()=>refresh(false)));};
  typeSel.addEventListener('change',()=>{state.type=typeSel.value;state.body='';manual=false;ov.querySelector('[data-op="body"]').value='';bindFields();refresh(true)});
  ov.querySelector('[data-op="body"]').addEventListener('input',()=>refresh(false));ov.querySelector('[data-op="tarih"]').addEventListener('change',()=>refresh(false));
  preview.addEventListener('input',()=>{manual=true});
  ov.querySelectorAll('[data-op-close]').forEach(b=>b.onclick=closeOfficialPetition);ov.addEventListener('click',e=>{if(e.target===ov)closeOfficialPetition()});
  ov.querySelector('[data-op-regenerate]').onclick=()=>{state.body='';ov.querySelector('[data-op="body"]').value='';refresh(true)};
  ov.querySelector('[data-op-download]').onclick=()=>{const html=`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(petitionTitle(state.type))}</title></head><body>${preview.innerHTML}</body></html>`,blob=new Blob([html],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=petitionTitle(state.type).replace(/[^\p{L}\p{N}]+/gu,'_')+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
  ov.querySelector('[data-op-print]').onclick=async()=>{try{if(!global.ReportEngine&&global.AppLoader?.loadScript)await global.AppLoader.loadScript('js/modules/report-engine.js');if(!global.ReportEngine)throw new Error('Rapor motoru yüklenemedi.');global.ReportEngine.printReport(petitionTitle(state.type),preview.innerHTML,{fileName:petitionTitle(state.type).replace(/[^\p{L}\p{N}]+/gu,'_'),yon:'dikey',compact:false,ustBaslik:''})}catch(e){global.toast?.('Belge açılamadı: '+(e?.message||e))}};
  bindFields();refresh(true);
}
function decorateDilekce(){
  const c=content(),h=nativeHeading();if(!c||!h||h.textContent.trim()!=='Dilekçe & İzin Talepleri')return false;
  setShellTitle('Dilekçe & İzinler');
  if(!c.querySelector('[data-classic-official-petition]')){
    const nativeNew=c.querySelector('[data-dilekce-yeni]');
    const b=document.createElement('button');b.type='button';b.className='ka-btn ka-btn--secondary ka-btn--sm';b.dataset.classicOfficialPetition='1';b.textContent='📄 Resmi Dilekçe Oluştur';b.onclick=()=>openOfficialPetition();
    nativeNew?.parentElement?.insertBefore(b,nativeNew);
    const info=document.createElement('p');info.className='ka-muted';info.dataset.classicOfficialPetitionInfo='1';info.textContent='Personel izin dilekçesi, diploma kayıt örneği talebi ve okul cevap belgesini A4 önizleme ile hazırlayabilirsiniz.';h.parentElement?.appendChild(info);
  }
  return true;
}

function sync(){scheduled=false;if(nativeStaffPage()){captureBridges();render();return;}if(parityStaffPage())return;restoreShell();decoratePeriodic();decoratePuantaj();decorateDilekce();}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(sync);}
function start(){
  if(observer)return;
  const root=$('#v2ModuleRoot')||document.body;
  observer=new MutationObserver(schedule);observer.observe(root,{childList:true,subtree:true,characterData:true});
  ['data.personel','data.personelIzinler','data.periyodikIsler','data.periyodikSablon','data.resmiTatiller'].forEach(p=>global.AppStore?.subscribe?.(p,schedule));
  global.PermissionService?.subscribe?.(schedule);
  schedule();
}
function stop(){observer?.disconnect();observer=null;restoreShell();detailBridge.clear();newBridge=null;closeOfficialPetition();}

global.ClassicPersonnelParity={start,stop,refresh:()=>{render(true);schedule()},openOfficialPetition,legacyDayCode};
global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='management')schedule()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
