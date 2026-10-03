/* Koruk Asistan — İlkokula Başlama Yaşı Hesaplama
 * 2026-2027 eğitim öğretim yılı / 30 Eylül 2026 esaslı bilgilendirme aracı.
 * Kaynak: MEB Temel Eğitim Genel Müdürlüğü Haziran 2026 veli bilgilendirme bülteni.
 */
(function(global){
'use strict';
if(global.SchoolAgeCalculator)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const REF=new Date(2026,8,30);
const MONTHS=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
function monthsAtRef(date){
  let m=(REF.getFullYear()-date.getFullYear())*12+(REF.getMonth()-date.getMonth());
  if(REF.getDate()<date.getDate())m--;
  return Math.max(0,m);
}
function ageText(date){const total=monthsAtRef(date);const years=Math.floor(total/12),months=total%12;return `${years} yaş ${months} ay`}
function exactAge(date){let y=REF.getFullYear()-date.getFullYear(),m=REF.getMonth()-date.getMonth(),d=REF.getDate()-date.getDate();if(d<0){m--;d+=new Date(REF.getFullYear(),REF.getMonth(),0).getDate()}if(m<0){y--;m+=12}return `${y} yaş ${m} ay ${d} gün`}
function statusFor(date){
  const m=monthsAtRef(date);
  const y=date.getFullYear(),mo=date.getMonth()+1;
  let preschool={kind:'ok',title:'Okul öncesi eğitime devam edebilir.',detail:'Doğum tarihine göre okul öncesi yaş grubundadır.'};
  let primary={kind:'danger',title:'İlkokula kayıt olamaz.',detail:'65 ay ve altındaki çocuklar için ilkokul 1. sınıf kaydı yapılamaz.'};
  if(m>=72){
    primary={kind:'required',title:'İlkokul 1. sınıf kaydı zorunlu.',detail:'72 ay ve üzeri çocukların ilkokul kaydı yapılır.'};
    preschool={kind:'info',title:'Veli dilekçesiyle okul öncesine devam edebilir.',detail:'İlkokul kaydı zorunlu yaş grubundadır; okul öncesine devam için ilgili kayıt şartları ayrıca değerlendirilir.'};
  }else if(m>=69){
    primary={kind:'warning',title:'İlkokul kaydı yapılır; veli dilekçesiyle ertelenebilir.',detail:'69–71 ay grubundadır. Veli dilekçesiyle kayıt bir yıl ertelenebilir ve okul öncesi eğitime devam edebilir.'};
    preschool={kind:'ok',title:'Okul öncesi eğitime devam edebilir.',detail:'Veli dilekçesiyle ilkokul kaydı ertelenerek okul öncesi eğitime devam edilebilir.'};
  }else if(m>=66){
    primary={kind:'info',title:'İlkokula başlama zorunluluğu bulunmamaktadır.',detail:'Veli dilekçesiyle 1. sınıfa kayıt yapılabilir veya okul öncesi eğitime devam edebilir.'};
    preschool={kind:'ok',title:'Okul öncesi eğitime devam edebilir.',detail:'66–68 ay grubunda okul öncesi eğitim seçeneği bulunmaktadır.'};
  }else if(m>=36){
    primary={kind:'danger',title:'İlkokula kayıt olamaz.',detail:'65 ay ve altındaki çocuklar için ilkokul 1. sınıf kaydı yapılamaz.'};
    preschool={kind:'ok',title:'Okul öncesi eğitime devam edebilir.',detail:'36–65 ay aralığında okul öncesi eğitim yaş grubundadır. Şube/kontenjan ve yerel kayıt esasları ayrıca uygulanır.'};
  }
  if(y===2023&&mo>=10)preschool={kind:'danger',title:'Bu yaş grubunda MEB kurumlarına kayıt yapılamaz.',detail:'Çizelgede 2023 Ekim–Aralık doğumlular için MEB kurumlarına kayıt yapılamayacağı belirtilmektedir.'};
  return{m,preschool,primary};
}
function badge(kind){return kind==='required'?'ZORUNLU':kind==='warning'?'VELİ DİLEKÇESİYLE':kind==='danger'?'KAYIT OLAMAZ':'BİLGİLENDİRME'}
function card(cls,icon,title,detail){return `<article class="ka-card ka-age-result ka-age-result--${cls.kind}"><div class="ka-card__body"><div class="ka-age-result__head"><span class="ka-age-result__icon">${icon}</span><div class="ka-grow"><span class="ka-age-result__eyebrow">${badge(cls.kind)}</span><h3>${esc(title)}</h3></div></div><p>${esc(detail)}</p></div></article>`}
function table(){
 const rows=[
 ['Eylül 2020 ve öncesi','72 ay ve üstü','İlkokul kaydı zorunlu','Veli dilekçesi ile okul öncesine devam edebilir.'],
 ['Ekim–Aralık 2020','69–71 ay','Kayıt yapılır veya veli dilekçesiyle ertelenebilir','Veli dilekçesiyle okul öncesine devam edebilir.'],
 ['Ocak–Mart 2021','66–68 ay','İlkokula başlama zorunluluğu yok','Veli dilekçesiyle 1. sınıfa kayıt veya okul öncesi.'],
 ['Nisan 2021 ve sonrası','65 ay ve altı','İlkokula kayıt olamaz','Okul öncesi eğitime devam edebilir.']
 ];
 return `<details class="ka-card ka-age-reference"><summary class="ka-card__body"><strong>2026–2027 yaş grubu özet çizelgesi</strong><span class="ka-muted">30 Eylül 2026</span></summary><div class="ka-card__body"><div class="ka-table-wrap"><table class="ka-table"><thead><tr><th>Doğum</th><th>Yaş</th><th>İlkokul</th><th>Okul öncesi</th></tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div></details>`;
}
function open(root){
 root=root||document.getElementById('v2ModuleRoot');if(!root)return false;
 root.innerHTML=`<section class="ka-page ka-stack" data-school-age-calculator><article class="ka-card"><div class="ka-card__body ka-stack"><div class="ka-age-hero"><span class="ka-age-hero__icon">🎒</span><div><small>2026–2027 EĞİTİM ÖĞRETİM YILI</small><h2>İlkokula Başlama Yaşı Hesaplama</h2><p class="ka-muted">30 Eylül 2026 tarihi esas alınarak okul öncesi ve ilkokul 1. sınıf kayıt durumunu ayrı ayrı gösterir.</p></div></div><label class="ka-field"><span class="ka-field__label">Çocuğun doğum tarihi</span><input class="ka-input" type="date" data-age-date max="2026-09-30"></label><button class="ka-btn" type="button" data-age-calc>Hesapla</button></div></article><div data-age-result hidden></div>${table()}<article class="ka-card"><div class="ka-card__body"><strong>Önemli bilgi</strong><p class="ka-muted">Bu araç bilgilendirme amaçlıdır. Kesin kayıt yönlendirmesi adrese dayalı e-Kayıt/e-Okul kayıt sistemi ve güncel MEB usul ve esaslarına göre kontrol edilmelidir.</p></div></article></section>`;
 const input=root.querySelector('[data-age-date]'),out=root.querySelector('[data-age-result]');
 const calculate=()=>{
   if(!input.value){out.hidden=false;out.innerHTML='<article class="ka-card"><div class="ka-card__body">Lütfen doğum tarihini seçin.</div></article>';return}
   const d=new Date(input.value+'T00:00:00');if(Number.isNaN(d.getTime())||d>REF){out.hidden=false;out.innerHTML='<article class="ka-card"><div class="ka-card__body">Geçerli bir doğum tarihi seçin.</div></article>';return}
   const s=statusFor(d);out.hidden=false;out.innerHTML=`<div class="ka-stack"><article class="ka-card"><div class="ka-card__body ka-age-summary"><span>30 Eylül 2026 itibarıyla</span><strong>${monthsAtRef(d)} aylık</strong><b>${esc(ageText(d))}</b><small>${esc(exactAge(d))}</small></div></article><div class="ka-grid ka-age-results-grid">${card({kind:s.preschool.kind},'🏫','OKUL ÖNCESİ KAYIT DURUMU',s.preschool.title+' '+s.preschool.detail)}${card({kind:s.primary.kind},'🎒','İLKOKUL 1. SINIF KAYIT DURUMU',s.primary.title+' '+s.primary.detail)}</div></div>`;
   out.scrollIntoView({behavior:'smooth',block:'start'});
 };
 root.querySelector('[data-age-calc]')?.addEventListener('click',calculate);
 input?.addEventListener('change',calculate);
 return true;
}
function register(){
 const add=()=>{
   const groups=global.ShellUI?.MENU_GROUPS;if(!Array.isArray(groups))return false;
   const g=groups.find(x=>x.key==='documents');if(!g)return false;
   g.items=Array.isArray(g.items)?g.items:g.items=[];
   if(!g.items.some(x=>String(x[3]||'')==='school-age-calculator'))g.items.push(['Araçlar','🧰','documents','school-age-calculator']);
   global.ShellUI?.registerPageRoute?.('school-age-calculator',async({root})=>open(root));
   return true;
 };
 if(!add())setTimeout(add,250);
}
global.SchoolAgeCalculator={open};
if(global.ShellUI?.registerPageRoute)register();else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',register,{once:true});else setTimeout(register,50);
})(window);