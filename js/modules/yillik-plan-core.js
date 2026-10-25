/* Koruk Asistan — Yıllık plan çekirdeği (DOM'suz saf mantık)
 * MEB biçimli ünitelendirilmiş yıllık plan Word dosyasını (word/document.xml) okur; başlık eşleştirme, hafta tarihleri, numaralama,
 * ünite listesi, "bu hafta" ve belirli gün eşleme burada tek yerde durur. Arayüz (yillik-plan-ui.js), Word çıktısı (yillik-plan-word.js),
 * ana sayfa (dashboard.js) ve katalog aracı (scripts/yillik-plan-katalog.mjs) aynı kodu kullanır.
 *
 * Plan kaydı (yillikPlanTanimlari): { dersAdi, seviye, egitimOgretimYili:'2026-2027', grup:'zorunlu|secmeli|iho', yayin, sutunlar:[başlıkId], baslikGruplari:{başlıkId:'GRUP'},
 *   satirlar:[{ no, hafta:'1. hafta', tarih:'14-20 Eylül', baslangic:'2026-09-14', bitis:'2026-09-20', saat:'3 saat', ozel:'ARA TATİL', birlesik:[başlıkId], degerler:{başlıkId:metin} }],
 *   yilSonu, dipnotlar:[{ad,metin}], kaynak }. Eski kayıtlar (ay + "1.HAFTA(14-20)") okunurken aynı işlevlerle çözülür.
 */
(function(global){
'use strict';
if(global.YillikPlanCore)return;
const norm=v=>String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i');
const line=v=>String(v||'').replace(/\s+/g,' ').trim();
const key=v=>norm(line(v)).replace(/[^a-z0-9]+/g,' ').trim();
const AY={ocak:1,subat:2,mart:3,nisan:4,mayis:5,haziran:6,temmuz:7,agustos:8,eylul:9,ekim:10,kasim:11,aralik:12};
const AY_ADI=['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
const AY_KISA=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const pad=n=>String(n).padStart(2,'0');
const iso=(y,m,d)=>`${y}-${pad(m)}-${pad(d)}`;
const toDate=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(s||''));return m?new Date(Number(m[1]),Number(m[2])-1,Number(m[3])):null};

/* ---------- Başlık (sütun) eşleştirme: Word ve Excel içe aktarıcıları aynı tabloyu kullanır ---------- */
const BASLIKLAR={
 unite_tema:'Ünite / Tema',icerik_cercevesi:'Konu / İçerik Çerçevesi',ogrenme_ciktilari:'Öğrenme Çıktıları',surec_becerileri:'Süreç Becerileri',surec_bilesenleri:'Süreç Bileşenleri',
 kazanim:'Kazanım',kazanim_aciklamasi:'Kazanım Açıklaması',olcme_degerlendirme:'Ölçme ve Değerlendirme',sosyal_duygusal:'Sosyal-Duygusal Öğrenme Becerileri',degerler:'Değerler',
 okuryazarlik:'Okuryazarlık Becerileri',belirli_gunler:'Belirli Gün ve Haftalar',farklilastirma:'Farklılaştırma',okul_temelli:'Okul Temelli Planlama',yontem_teknikler:'Yöntem ve Teknikler',
 okul_disi_ogrenme:'Okul Dışı Öğrenme',islevler_yararli_dil:'İşlevler ve Yararlı Dil',baglam_gorev_odev:'Önerilen Bağlamlar, Görevler ve Ödevler'
};
const TAKMA={
 'tema':'unite_tema','theme':'unite_tema','unite tema':'unite_tema','unit theme':'unite_tema','unite':'unite_tema',
 'konu':'icerik_cercevesi','icerik cercevesi':'icerik_cercevesi','konu icerik cercevesi':'icerik_cercevesi','content frame':'icerik_cercevesi',
 'ogrenme ciktilari':'ogrenme_ciktilari','learning outcomes':'ogrenme_ciktilari','learning skills and learning outcome':'ogrenme_ciktilari',
 'surec becerileri':'surec_becerileri','surec bilesenleri':'surec_bilesenleri','kazanim':'kazanim','kazanim aciklamasi':'kazanim_aciklamasi',
 'olcme ve degerlendirme':'olcme_degerlendirme','assessment and evaluation':'olcme_degerlendirme','ogrenme kanitlari':'olcme_degerlendirme',
 'sosyal duygusal ogrenme becerileri':'sosyal_duygusal','social emotional learning skills':'sosyal_duygusal','degerler':'degerler','values':'degerler',
 'okuryazarlik becerileri':'okuryazarlik','literacy skills':'okuryazarlik','belirli gun ve haftalar':'belirli_gunler','national celebrations and important days':'belirli_gunler',
 'farklilastirma':'farklilastirma','differentiation':'farklilastirma','okul temelli planlama':'okul_temelli','school based planning':'okul_temelli',
 'yontem ve teknikler':'yontem_teknikler','okul disi ogrenme':'okul_disi_ogrenme','out of school learning activities':'okul_disi_ogrenme',
 'functions and useful language':'islevler_yararli_dil','suggested contexts tasks and assignments':'baglam_gorev_odev'
};
function baslikBilgisi(ad,grup='',kolon=0){
 const kaynak=line(ad)||line(grup)||`Sütun ${kolon}`,k=key(kaynak),a=TAKMA[k];
 return a?{key:a,name:BASLIKLAR[a]}:{key:k||`sutun_${kolon}`,name:kaynak};
}

/* ---------- Küçük XML okuyucu (OOXML için yeterli; tarayıcı ve Node'da aynı) ---------- */
const VARLIK={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
const coz=s=>s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(m,e)=>{if(e[0]==='#')return String.fromCodePoint(e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):parseInt(e.slice(1),10));return VARLIK[e.toLowerCase()]||m});
function xmlAgaci(xml){
 const root={ad:'#kok',oz:{},cocuk:[]},yigin=[root],re=/<(\/?)([\w:.-]+)((?:\s+[\w:.-]+="[^"]*")*)\s*(\/?)>|<[?!][^>]*>|([^<]+)/g;let m;
 while((m=re.exec(xml))){
  if(m[5]!==undefined){const ust=yigin[yigin.length-1];if(ust.ad==='w:t')ust.metin=(ust.metin||'')+coz(m[5]);continue}
  if(!m[2])continue;
  if(m[1]){if(yigin.length>1)yigin.pop();continue}
  const oz={};(m[3]||'').replace(/([\w:.-]+)="([^"]*)"/g,(_,k,v)=>{oz[k]=coz(v);return ''});
  const dugum={ad:m[2],oz,cocuk:[]};yigin[yigin.length-1].cocuk.push(dugum);if(!m[4])yigin.push(dugum);
 }
 return root;
}
const alt=(d,ad)=>d.cocuk.filter(c=>c.ad===ad);
const ilk=(d,ad)=>d.cocuk.find(c=>c.ad===ad)||null;
function metinDugum(d){
 if(d.ad==='w:t')return d.metin||'';if(d.ad==='w:tab')return' ';if(d.ad==='w:br'||d.ad==='w:cr')return'\n';
 if(d.ad==='w:p')return d.cocuk.map(metinDugum).join('');
 return d.cocuk.map(metinDugum).join(d.ad==='w:tc'?'\n':'');
}
const paragraflar=d=>d.cocuk.filter(c=>c.ad==='w:p').map(metinDugum);
function hucreMetni(tc){
 const t=paragraflar(tc).map(s=>s.replace(/[ \t\u00a0]{3,}/g,'\n').replace(/[ \t\u00a0]+/g,' ').split('\n').map(x=>x.trim()).join('\n').trim()).join('\n').replace(/\n{2,}/g,'\n').trim();
 return temizle(t);
}
/* Excel→Word dönüşümünden kalan baştaki/sondaki tırnak işaretlerini ve fazla boşlukları temizler. */
function temizle(t){
 t=String(t||'').replace(/[ \t ]+\n/g,'\n').trim();
 const adet=(t.match(/"/g)||[]).length;
 if(t.startsWith('"')&&(adet%2===1||t.endsWith('"')))t=t.replace(/^"\s*/,'').replace(/\s*"$/,'');
 return t.trim();
}

/* ---------- Tarih ---------- */
function tarihAraligi(metin,yil){
 const y=String(yil||'').split('-').map(Number);if(!y[0]||!y[1])return null;
 const t=norm(metin).replace(/\s+/g,' '),m=/(\d{1,2})\s*([a-z]+)?\s*[-–—]\s*(\d{1,2})\s*([a-z]+)/.exec(t);if(!m)return null;
 const m2=AY[m[4]],m1=m[2]?AY[m[2]]:m2;if(!m1||!m2)return null;
 const yilOf=ay=>ay>=9?y[0]:y[1];
 return{baslangic:iso(yilOf(m1),m1,Number(m[1])),bitis:iso(yilOf(m2),m2,Number(m[3]))};
}
const ayKisa=d=>AY_KISA[d.getMonth()];
function tarihMetni(bas,bit){
 const a=toDate(bas),b=toDate(bit||bas);if(!a||!b)return'';
 const g=n=>pad(n.getDate());
 return a.getMonth()===b.getMonth()?`${g(a)}-${g(b)} ${ayKisa(b)}`:`${g(a)} ${ayKisa(a)}-${g(b)} ${ayKisa(b)}`;
}
/* Eski kayıtlar: ay:'EYLÜL', hafta:'1.HAFTA(14-20)' */
function eskiAralik(row,yil){
 const ay=AY[norm(row?.ay)],g=/\((\d{1,2})-(\d{1,2})\)/.exec(row?.hafta||''),y=String(yil||'').split('-').map(Number);
 if(!ay||!g||!y[0]||!y[1])return null;
 const bas=Number(g[1]),bit=Number(g[2]),by=ay>=9?y[0]:y[1];let em=ay,ey=by;
 if(bit<bas){em=ay===12?1:ay+1;ey=em===1&&ay===12?by+1:by}
 return{baslangic:iso(by,ay,bas),bitis:iso(ey,em,bit)};
}
function satirAraligi(row,yil){
 const a=toDate(row?.baslangic),b=toDate(row?.bitis||row?.baslangic);if(a&&b)return{start:a,end:b};
 const e=eskiAralik(row,yil);return e?{start:toDate(e.baslangic),end:toDate(e.bitis)}:null;
}
function suAnkiHafta(plan,simdi=new Date()){
 const rows=plan?.satirlar||[];if(!rows.length)return 0;const now=new Date(simdi);now.setHours(0,0,0,0);
 for(let i=0;i<rows.length;i++){const r=satirAraligi(rows[i],plan.egitimOgretimYili);if(r&&now>=r.start&&now<=r.end)return i}
 for(let i=0;i<rows.length;i++){const r=satirAraligi(rows[i],plan.egitimOgretimYili);if(r&&r.start>=now)return i}
 return 0;
}

/* Bugün planın hangi satırının tarih aralığındaysa onun sırası; hiçbirinde değilse -1 ("bu hafta" vurgusu yalnız gerçekten içindeyken). */
function buHafta(plan,simdi=new Date()){
 const now=new Date(simdi);now.setHours(0,0,0,0);const yil=plan?.egitimOgretimYili,rows=plan?.satirlar||[];
 for(let i=0;i<rows.length;i++){const r=satirAraligi(rows[i],yil);if(r&&now>=r.start&&now<=r.end)return i}
 return -1;
}

/* ---------- Numaralama: yarıyıl tatili ve sosyal etkinlik "—", diğerleri 1…N ---------- */
const NUMARASIZ=/yariyil tatil|sosyal etkinlik/;
function numaralandir(satirlar){
 let n=0;
 (satirlar||[]).forEach(r=>{const siz=NUMARASIZ.test(norm(r.ozel||''));r.no=siz?0:++n;r.hafta=siz?'—':`${r.no}. hafta`});
 return n;
}

/* ---------- Ünite / tema listesi ---------- */
function uniteAdlari(metin){
 /* Hücrede birden çok tema "   " (3+ boşluk) veya satır sonuyla ayrılır; "SINAV HAFTASI", "OKUL TEMELLİ PLANLAMA*" ve "Sınav Haftası 1-11 Haziran" ünite adı değildir. */
 const t=String(metin||'').replace(/\*/g,'')
  .replace(/s[ıiIİ]nav\s+haftas[ıiIİ]\s*(\d{1,2}\s*[-–]\s*\d{1,2}\s*[A-Za-zÇĞİÖŞÜçğıöşü]+)?/gi,'\n')
  .replace(/okul\s+temell[iİ]\s+planlama/gi,'\n').replace(/"/g,' ');
 return t.split(/\n|\s{3,}/).map(line).filter(Boolean);
}
/* Geçiş haftasında iki tema tek tırnak içinde yazılır ("A B"); başka satırlardaki temaların birleşimiyse ayrı ünite sayılmaz. */
function birlesimMi(k,digerleri){
 return !k||digerleri.some(d=>k===d||(k.startsWith(d+' ')&&birlesimMi(k.slice(d.length+1),digerleri)));
}
function uniteListesi(satirlar,kolon){
 const seen=new Set(),out=[];
 (satirlar||[]).forEach(r=>{if(r.ozel)return;uniteAdlari(r.degerler?.[kolon]).forEach(u=>{const k=key(u);if(k&&!seen.has(k)){seen.add(k);out.push(u)}})});
 const anahtarlar=out.map(key);
 return out.filter((u,i)=>!birlesimMi(anahtarlar[i],anahtarlar.filter((_,j)=>j!==i)));
}
function uniteler(plan,basliklar){
 const havuz=Array.isArray(basliklar)?basliklar:[],h=havuz.find(x=>baslikBilgisi(x.ad).key==='unite_tema');
 return h?uniteListesi(plan?.satirlar,h.id):[];
}

/* ---------- Görünüm yardımcıları: yeni ve eski kayıtlar aynı biçimde okunur ---------- */
const isoD=d=>iso(d.getFullYear(),d.getMonth()+1,d.getDate());
const sutunBilgileri=(plan,basliklar)=>{
 const havuz=new Map((basliklar||[]).map(b=>[b.id,b]));
 return(plan?.sutunlar||[]).map(id=>{const b=havuz.get(id);if(!b)return null;const bilgi=baslikBilgisi(b.ad);return{id,key:bilgi.key,ad:bilgi.name,grup:(plan.baslikGruplari&&plan.baslikGruplari[id])||''}}).filter(Boolean);
};
const sutunBul=(plan,basliklar,anahtar)=>sutunBilgileri(plan,basliklar).find(c=>c.key===anahtar)?.id||'';
/* Satır → { r, i, no, hafta, tarih, saat, ozel, bayram, baslangic, bitis }. Eski kayıtta no yoktur: hafta numarası "1.HAFTA(14-20)" metninden alınır. */
/* Eski/Excel planlarda tatil ve sosyal etkinlik haftası her sütuna aynı metinle yazılmıştır; satır özel satır sayılır. */
const OZEL_RE=/^(sosyal etkinlik|ara tatil|yariyil tatili|yariyil tatil|ogretim yili sonu)\b/;
function ozelCikar(r){
 if(r?.ozel)return String(r.ozel);
 const degerler=Object.values(r?.degerler||{}).map(v=>line(v)).filter(Boolean);
 if(degerler.length<2)return'';
 const sayim=new Map();degerler.forEach(v=>sayim.set(v,(sayim.get(v)||0)+1));
 const [metin,adet]=[...sayim.entries()].sort((a,b)=>b[1]-a[1])[0];
 return adet>=2&&adet/degerler.length>=0.6&&OZEL_RE.test(norm(metin))?metin:'';
}
function satirGorunumu(plan){
 const yil=plan?.egitimOgretimYili;let sayac=0;
 return(plan?.satirlar||[]).map((r,i)=>{
  const aralik=satirAraligi(r,yil),bas=aralik?isoD(aralik.start):'',bit=aralik?isoD(aralik.end):'';
  let no,hafta;
  if(r.no!==undefined){no=Number(r.no)||0;hafta=r.hafta||(no?`${no}. hafta`:'—')}
  else{const m=/^\s*(\d+)/.exec(String(r.hafta||''));no=m?Number(m[1]):++sayac;hafta=`${no}. hafta`}
  return{r,i,no,hafta,tarih:r.tarih||(bas?tarihMetni(bas,bit):''),saat:r.saat||'',ozel:ozelCikar(r),bayram:r.bayram||'',baslangic:bas,bitis:bit};
 });
}
const dersHaftasi=plan=>satirGorunumu(plan).filter(v=>v.no>0).length;
const planAnahtari=plan=>`${Number(plan?.seviye)||0}|${dersAnahtari(plan?.dersAdi)}|${plan?.egitimOgretimYili||''}`;
const okulYili=(simdi=new Date())=>{const y=simdi.getFullYear(),b=simdi.getMonth()>=6?y:y-1;return`${b}-${b+1}`};
/* Excel içe aktarıcının eski biçimli satırı ({ay,hafta:'1.HAFTA(14-20)',saat,degerler}) → yeni satır biçimi */
function satirYukselt(row,yil){
 const a=satirAraligi(row,yil),bas=a?isoD(a.start):'',bit=a?isoD(a.end):'',m=/^\s*(\d+)/.exec(String(row?.hafta||''));
 return{no:m?Number(m[1]):0,hafta:m?`${Number(m[1])}. hafta`:String(row?.hafta||''),tarih:bas?tarihMetni(bas,bit):'',baslangic:bas,bitis:bit,ay:row?.ay||(bas?AY_ADI[toDate(bas).getMonth()]:''),saat:row?.saat||'',ozel:'',bayram:'',birlesik:[],degerler:{...(row?.degerler||{})}};
}

/* ---------- Belirli gün / haftalar (planda sütun yoksa okulun günlerinden doldurulur) ---------- */
function haftaGunleri(row,yil,gunler){
 const r=satirAraligi(row,yil);if(!r)return[];const out=[];
 (gunler||[]).forEach(g=>{const a=toDate(g.tarihBaslangic||g.baslangic),b=toDate(g.tarihBitis||g.bitis||g.tarihBaslangic||g.baslangic);if(a&&b&&a<=r.end&&b>=r.start&&g.ad&&!out.includes(g.ad))out.push(g.ad)});
 return out;
}
/* Satırın belirli gün etiketleri: planın kendi sütunu varsa o ("A - B" ve satır sonuyla ayrılır), yoksa okulun günlerinden tarih eşlemesiyle. */
function satirGunleri(plan,basliklar,gorunum,okulGunleri){
 const kolon=sutunBul(plan,basliklar,'belirli_gunler'),out=[],ekle=t=>{const x=line(t);if(x&&!out.some(o=>key(o)===key(x)))out.push(x)};
 if(gorunum.bayram)ekle(gorunum.bayram);
 if(kolon)String(gorunum.r.degerler?.[kolon]||'').split(/\n|\s+[-–]\s+/).forEach(ekle);
 else haftaGunleri(gorunum.r,plan?.egitimOgretimYili,okulGunleri).forEach(ekle);
 return out;
}

/* ---------- Başlıktan ders / sınıf / yıl ---------- */
const KUCUK=new Set(['ve','ile','veya','ya','da','de']);
function baslikHarfi(s){return line(s).toLocaleLowerCase('tr').split(' ').map((w,i)=>(i&&KUCUK.has(w))?w:w.charAt(0).toLocaleUpperCase('tr')+w.slice(1)).join(' ')}
function baslikBilgi(metin){
 const t=line(metin),yil=/(\d{4})\s*[/\-–]\s*(\d{4})/.exec(t),sinif=/(\d{1,2})\s*\.?\s*SINIF/i.exec(t.toLocaleUpperCase('tr')),ders=/SINIF\s+(.+?)\s+DERS[İI]/i.exec(t.toLocaleUpperCase('tr'));
 let dersAdi=ders?baslikHarfi(ders[1]):'';
 const grup=/SE[ÇC]MEL[İI]/i.test(t.toLocaleUpperCase('tr'))?'secmeli':/İHO|\bIHO\b|İMAM HAT[İI]P/i.test(t.toLocaleUpperCase('tr'))?'iho':'zorunlu';
 return{egitimOgretimYili:yil?`${yil[1]}-${yil[2]}`:'',seviye:sinif?Number(sinif[1]):0,dersAdi,grup};
}

/* ---------- MEB Word (document.xml) ayrıştırıcısı ---------- */
function tabloSatirlari(tbl){
 return alt(tbl,'w:tr').map(tr=>{let kolon=0;return alt(tr,'w:tc').map(tc=>{const pr=ilk(tc,'w:tcPr'),span=Number(ilk(pr||{cocuk:[]},'w:gridSpan')?.oz['w:val'])||1,vm=ilk(pr||{cocuk:[]},'w:vMerge'),c={kolon,span,vm:vm?(vm.oz['w:val']==='restart'?'restart':'continue'):'',metin:hucreMetni(tc)};kolon+=span;return c})});
}
function govdeOgeleri(xml){
 const kok=xmlAgaci(xml),body=ilk(ilk(kok,'w:document')||kok,'w:body')||kok;
 return body.cocuk;
}
const HAFTA_RE=/^\s*(?:(\d{1,2})\s*\.\s*hafta|[—–])/i;
function kolonTanimlari(ust,alt2){
 const gruplar=[];ust.forEach(c=>gruplar.push({bas:c.kolon,son:c.kolon+c.span-1,ad:c.metin}));
 return alt2.map(c=>{const g=gruplar.find(x=>c.kolon>=x.bas&&c.kolon<=x.son);return{kolon:c.kolon,span:c.span,ad:c.metin,grup:g?g.ad:''}});
}
function docxAyristir(documentXml,secenek={}){
 const ogeler=govdeOgeleri(documentXml),tablolar=ogeler.filter(o=>o.ad==='w:tbl');
 if(!tablolar.length)throw new Error('Word dosyasında plan tablosu bulunamadı.');
 const satirlarT=tablolar.map(tabloSatirlari),indis=satirlarT.reduce((en,s,i)=>s.length>satirlarT[en].length?i:en,0),tablo=satirlarT[indis];
 const baslikMetni=ogeler.filter(o=>o.ad==='w:p').map(metinDugum).map(line).find(s=>/YILLIK PLAN/i.test(s.toLocaleUpperCase('tr')))||'';
 const bilgi=baslikBilgi(baslikMetni),yil=secenek.egitimOgretimYili||bilgi.egitimOgretimYili;
 const ilkHafta=tablo.findIndex(s=>s[0]&&HAFTA_RE.test(s[0].metin));
 if(ilkHafta<2)throw new Error('Plan tablosunda başlık satırları veya hafta satırları bulunamadı.');
 const kolonlar=kolonTanimlari(tablo[ilkHafta-2],tablo[ilkHafta-1]),
  icerik=kolonlar.slice(2).map(k=>({...k,...baslikBilgisi(k.ad,k.grup,k.kolon)})),
  haftaK=kolonlar[0],saatK=kolonlar[1];
 if(!haftaK||!saatK||!icerik.length)throw new Error('Plan tablosunun sütunları tanınamadı.');
 const satirlar=[],sonDeger={};let yilSonu='';const dipnotlar=[];
 for(let i=ilkHafta;i<tablo.length;i++){
  const hucreler=tablo[i],ilkH=hucreler[0];
  if(!ilkH||!HAFTA_RE.test(ilkH.metin)){
   if(hucreler.length===1&&hucreler[0].metin)yilSonu=hucreler[0].metin;
   else if(hucreler.length>=2&&hucreler[0].metin&&hucreler[hucreler.length-1].metin)dipnotlar.push({ad:line(hucreler[0].metin),metin:hucreler[hucreler.length-1].metin});
   continue;
  }
  const [,...tarihSatirlari]=ilkH.metin.split('\n'),tarih=tarihSatirlari.map(line).filter(Boolean).join(' ').replace(/\s*\d+\s*saat\s*$/i,''),
   aralik=tarihAraligi(tarih,yil)||{baslangic:'',bitis:''},kolonOf=k=>hucreler.find(c=>c.kolon===k),satir={no:0,hafta:'',kaynakNo:Number(HAFTA_RE.exec(ilkH.metin)[1])||0,tarih,baslangic:aralik.baslangic,bitis:aralik.bitis,saat:(kolonOf(saatK.kolon)?.metin||'').trim(),ozel:'',bayram:'',birlesik:[],degerler:{}};
  const hamlar=icerik.map(k=>{const c=kolonOf(k.kolon);if(!c)return{k,metin:'',devam:false};if(c.vm==='continue')return{k,metin:sonDeger[k.key]||'',devam:true};if(c.vm==='restart')sonDeger[k.key]=c.metin;else delete sonDeger[k.key];return{k,metin:c.metin,devam:false}});
  /* Tatil/özel satır: ilk beş içerik hücresinden en az üçü aynı metni taşıyorsa (ARA TATİL, YARIYIL TATİLİ, SOSYAL ETKİNLİK, bayram) */
  const ilkBes=hamlar.slice(0,5).map(h=>h.metin).filter(Boolean),sayac=new Map();ilkBes.forEach(m=>sayac.set(norm(m),(sayac.get(norm(m))||0)+1));
  const ortak=[...sayac.entries()].sort((a,b)=>b[1]-a[1])[0];
  if(ortak&&ortak[1]>=3&&ilkBes.length===ortak[1]){satir.ozel=ilkBes.find(m=>norm(m)===ortak[0]);hamlar.forEach(h=>{if(ilkBes.includes(h.metin)&&h.metin===satir.ozel)h.metin=''})}
  /* Bayram/anma başlığı: bazı satırlarda hücrelerin başında aynı belirli gün metni tekrarlanır; satıra `bayram` olarak taşınır, hücrelerden ayrılır. */
  if(!satir.ozel){
   const ilkler=new Map();hamlar.forEach(h=>{if(!h.metin||h.devam)return;const ilk=h.metin.split('\n')[0].trim();if(ilk.length>=8){const k=norm(ilk);ilkler.set(k,{n:(ilkler.get(k)?.n||0)+1,ilk})}});
   const en=[...ilkler.values()].sort((a,b)=>b.n-a.n)[0];
   if(en&&en.n>=3){satir.bayram=en.ilk;hamlar.forEach(h=>{if(!h.metin||h.devam||!h.metin.startsWith(en.ilk))return;h.metin=h.metin.slice(en.ilk.length).replace(/^\s+/,'')})}
  }
  hamlar.forEach(h=>{if(h.devam)satir.birlesik.push(h.k.key);if(h.metin)satir.degerler[h.k.key]=h.metin});
  satirlar.push(satir);
 }
 if(!satirlar.length)throw new Error('Plan tablosunda hafta satırı bulunamadı.');
 numaralandir(satirlar);
 const basliklar=icerik.map(k=>({anahtar:k.key,ad:k.name,grup:k.grup,kolon:k.kolon,span:k.span}));
 return{dersAdi:secenek.dersAdi||bilgi.dersAdi,seviye:secenek.seviye||bilgi.seviye,egitimOgretimYili:yil,grup:secenek.grup||bilgi.grup,baslik:baslikMetni,basliklar,
  satirlar,yilSonu,dipnotlar,saatBasligi:saatK.ad,haftaBasligi:haftaK.ad,hucreGenislikleri:tablolar[indis]?(ilk(tablolar[indis],'w:tblGrid')?.cocuk||[]).map(g=>Number(g.oz['w:w'])||0):[],kaynak:'word'};
}

/* Anahtarlı (içe aktarma sonucu) plan → kayda yazılacak plan: başlık anahtarlarını havuz kimliklerine çevirir. */
function kayitHazirla(ayrisan,anahtarId){
 const sutunlar=[],gruplar={};
 ayrisan.basliklar.forEach(b=>{const id=anahtarId[b.anahtar];if(id&&!sutunlar.includes(id)){sutunlar.push(id);gruplar[id]=b.grup||''}});
 const cevir=o=>{const out={};Object.entries(o||{}).forEach(([k,v])=>{const id=anahtarId[k];if(id)out[id]=v});return out};
 const satirlar=ayrisan.satirlar.map(r=>({no:r.no,hafta:r.hafta,tarih:r.tarih,baslangic:r.baslangic,bitis:r.bitis,ay:r.baslangic?AY_ADI[toDate(r.baslangic).getMonth()]:'',saat:r.saat,ozel:r.ozel||'',bayram:r.bayram||'',birlesik:(r.birlesik||[]).map(k=>anahtarId[k]).filter(Boolean),degerler:cevir(r.degerler)}));
 return{dersAdi:ayrisan.dersAdi,seviye:ayrisan.seviye,egitimOgretimYili:ayrisan.egitimOgretimYili,grup:ayrisan.grup||'zorunlu',yayin:ayrisan.yayin||'',sutunlar,baslikGruplari:gruplar,satirlar,yilSonu:ayrisan.yilSonu||'',dipnotlar:ayrisan.dipnotlar||[],kaynak:ayrisan.kaynak||'word'};
}
/* Ders adları farklı yazılsa da aynı derse çözülür (Beden Eğitimi / Beden Eğitimi ve Spor, Fen Bilimleri, İngilizce / English…). */
const dersAnahtari=v=>{
 const k=key(v).replace(/\b(dersi|lesson)\b/g,'').replace(/\s+/g,' ').trim();
 if(k.includes('beden egitimi'))return'beden_egitimi';
 if(k.includes('bilisim teknolojileri'))return'bilisim_teknolojileri';
 if(k.includes('fen bilimleri'))return'fen_bilimleri';
 if(k.includes('ingilizce')||k.includes('english'))return'ingilizce';
 return k;
};
const sinifSayisi=v=>{const m=String(v||'').match(/\d+/);return m?Number(m[0]):null};

global.YillikPlanCore={norm,line,key,AY_ADI,AY_KISA,BASLIKLAR,baslikBilgisi,xmlAgaci,hucreMetni,tarihAraligi,tarihMetni,satirAraligi,suAnkiHafta,buHafta,numaralandir,dersHaftasi,sutunBilgileri,sutunBul,satirGorunumu,planAnahtari,okulYili,satirYukselt,satirGunleri,uniteAdlari,uniteListesi,uniteler,haftaGunleri,
 baslikBilgi,baslikHarfi,docxAyristir,kayitHazirla,dersAnahtari,sinifSayisi};
})(typeof window!=='undefined'?window:globalThis);
