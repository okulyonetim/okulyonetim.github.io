/* Koruk Asistan — Yıllık plan Word çıktısı (MEB ünitelendirilmiş yıllık plan şablonu)
   Plan kaydı → word/document.xml gövdesi (saf mantık, DOM'suz) + şablon paketine yazma (JSZip, tembel). */
(function(global){
'use strict';
const C=global.YillikPlanCore;
if(!C)throw new Error('YillikPlanWord için YillikPlanCore gerekli.');
const NOKTA='…'.repeat(7);
const SABLON_YOLU='assets/yillik-plan/sablon.docx';
const JSZIP_YOLU='assets/vendor/jszip.min.js';
const DOCX_TURU='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const buyuk=s=>String(s||'').toLocaleUpperCase('tr');
const IZGARA_SOL=[596,596],TABLO_GENISLIGI=14205,ZUMRE_SATIR_SUTUN=2;

/* Örnek şablondaki sütun düzeni: başlık metni, üst grup, ızgara genişlikleri, yazı boyutu (yarım punto) */
const MEB={
 unite_tema:{ad:'ÜNİTE/TEMA',grup:'TEMA/İÇERİK ÇERÇEVESİ',gen:[681,284],boy:14},
 icerik_cercevesi:{ad:'KONU(İÇERİK ÇERÇEVESİ)',grup:'TEMA/İÇERİK ÇERÇEVESİ',gen:[992],boy:14},
 ogrenme_ciktilari:{ad:'ÖĞRENME ÇIKTILARI',grup:'ÖĞRENME ÇIKTILARI VE SÜREÇ BECERİLERİ',gen:[2551],boy:14},
 surec_becerileri:{ad:'SÜREÇ BECERİLERİ',grup:'ÖĞRENME ÇIKTILARI VE SÜREÇ BECERİLERİ',gen:[2694],boy:14},
 olcme_degerlendirme:{ad:'ÖLÇME VE DEĞERLENDİRME',grup:'ÖĞRENME KANITLARI',gen:[1842],boy:14},
 sosyal_duygusal:{ad:'SOSYAL - DUYGUSAL ÖĞRENME BECERİLERİ',grup:'PROGRAMLAR ARASI BİLEŞENLER',gen:[993],boy:13},
 degerler:{ad:'DEĞERLER',grup:'PROGRAMLAR ARASI BİLEŞENLER',gen:[992],boy:13},
 okuryazarlik:{ad:'OKURYAZARLIK BECERİLERİ',grup:'PROGRAMLAR ARASI BİLEŞENLER',gen:[992],boy:13},
 belirli_gunler:{ad:'BELİRLİ GÜN VE HAFTALAR',grup:'BELİRLİ GÜN VE HAFTALAR',gen:[992],boy:14}
};

/* ---------- XML parçaları ---------- */
const FONT='<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>';
function rpr({boy=14,kalin=false,renk='000000'}={}){return`<w:rPr>${FONT}${kalin?'<w:b/><w:bCs/>':''}<w:color w:val="${renk}"/><w:sz w:val="${boy}"/><w:szCs w:val="${boy}"/><w:lang w:val="tr-TR"/></w:rPr>`}
function paragraf(metin,o={}){
 const r=rpr(o),ind=o.ind?'<w:ind w:left="113" w:right="113"/>':'';
 const ust=`<w:pPr><w:autoSpaceDE w:val="0"/><w:autoSpaceDN w:val="0"/><w:adjustRightInd w:val="0"/>${ind}<w:jc w:val="${o.jc||'center'}"/>${r}</w:pPr>`;
 return metin===''||metin==null?`<w:p>${ust}</w:p>`:`<w:p>${ust}<w:r>${r}<w:t xml:space="preserve">${esc(metin)}</w:t></w:r></w:p>`;
}
const KENAR=(renk,yonler)=>`<w:tcBorders>${yonler.map(y=>`<w:${y} w:val="single" w:sz="6" w:space="0" w:color="${renk}"/>`).join('')}</w:tcBorders>`;
const DOLU_KENAR=['top','left','bottom','right'];
function hucre({genislik,span=1,metinler=[''],gri=false,dikey='',birlesme='',kenarRengi='auto',ortala=true,...o}){
 const kenar=birlesme==='restart'?['top','left','right']:birlesme==='continue'?['left','right']:DOLU_KENAR;
 const pr=`<w:tcPr><w:tcW w:w="${genislik}" w:type="dxa"/>${span>1?`<w:gridSpan w:val="${span}"/>`:''}${birlesme==='restart'?'<w:vMerge w:val="restart"/>':birlesme==='continue'?'<w:vMerge/>':''}${KENAR(kenarRengi,kenar)}${gri?'<w:shd w:val="solid" w:color="C0C0C0" w:fill="FFFFFF"/>':''}${dikey?`<w:textDirection w:val="${dikey}"/>`:''}${ortala&&!birlesme?'<w:vAlign w:val="center"/>':''}</w:tcPr>`;
 const ps=birlesme==='continue'?paragraf('',o):metinler.map(m=>paragraf(m,{...o,jc:ortala?'center':'left'})).join('');
 return`<w:tc>${pr}${ps}</w:tc>`;
}
/* Örnekteki gibi: başlık satırları sayfalarda yinelenmez (tblHeader yok); veri satırları bölünmez. */
const satir=(hucreler,yukseklik,baslik=false)=>`<w:tr><w:trPr>${baslik?'':'<w:cantSplit/>'}<w:trHeight w:val="${yukseklik}"/></w:trPr>${hucreler.join('')}</w:tr>`;
const satirlaBol=m=>String(m??'').split('\n').map(x=>x.trimEnd());

/* ---------- Sütun düzeni ---------- */
/* Çıktı her planda örnek şablonun düzenindedir (9 sütun, 2 satırlı gruplu başlık). Planın sütunları ada/anahtara göre bu yuvalara oturtulur;
   eşleşmeyen sütun, adıyla birlikte "SÜREÇ BECERİLERİ" yuvasına eklenir (içerik kaybolmaz). */
const YUVALAR=['unite_tema','icerik_cercevesi','ogrenme_ciktilari','surec_becerileri','olcme_degerlendirme','sosyal_duygusal','degerler','okuryazarlik','belirli_gunler'];
const KOPRU={surec_bilesenleri:'surec_becerileri',kazanim:'ogrenme_ciktilari',kazanim_aciklamasi:'ogrenme_ciktilari'};
const BULANIK=[
 [/kanit|olcme|degerlendirme/,'olcme_degerlendirme'],[/okuryazar/,'okuryazarlik'],[/sosyal|duygusal/,'sosyal_duygusal'],[/belirli|bayram|^gunler?\b/,'belirli_gunler'],
 [/^degerler?$|deger egitimi/,'degerler'],[/kazan|cikti|ogrenme/,'ogrenme_ciktilari'],[/beceri|surec/,'surec_becerileri'],[/unite|tema/,'unite_tema'],[/konu|icerik/,'icerik_cercevesi']
];
/* Farklılaştırma ve Okul temelli planlama örnekte sütun değil, tablonun altındaki iki açıklama satırıdır; eski planlarda her satıra tekrar yazılmış olabilir. */
const DIPNOT_SUTUNLARI={farklilastirma:'FARKLILAŞTIRMA',okul_temelli:'OKUL TEMELLİ PLANLAMA'};
function yuvaBul(c){
 if(DIPNOT_SUTUNLARI[c.key])return{yuva:'',ek:false};
 if(MEB[c.key])return{yuva:c.key,ek:false};
 if(KOPRU[c.key])return{yuva:KOPRU[c.key],ek:false};
 const ad=C.key(c.ad),b=BULANIK.find(([re])=>re.test(ad));
 return b?{yuva:b[1],ek:false}:{yuva:'surec_becerileri',ek:true};
}
function kolonlar(plan,basliklar){
 const kaynak=new Map(YUVALAR.map(y=>[y,[]]));
 C.sutunBilgileri(plan,basliklar).forEach(c=>{const e=yuvaBul(c);if(e.yuva)kaynak.get(e.yuva).push({id:c.id,ad:c.ad,ek:e.ek})});
 return YUVALAR.map(y=>({key:y,ad:MEB[y].ad,grup:MEB[y].grup,gen:MEB[y].gen.slice(),boy:MEB[y].boy,kaynak:kaynak.get(y)}));
}
/* Yuvanın bir satırdaki metni: eşlenen sütunların değerleri alt alta (eşleşmeyen sütun "Ad: değer" biçiminde). */
function yuvaMetni(r,k){
 return satirlaBol(k.kaynak.map(c=>{const v=String(r.degerler?.[c.id]??'').trim();return v?(c.ek?`${c.ad}: ${v}`:v):''}).filter(Boolean).join('\n'));
}
const yuvaBirlesik=(r,k)=>k.kaynak.length>0&&k.kaynak.every(c=>(r.birlesik||[]).includes(c.id));

/* Dikey birleşik hücre durumu: restart (üst hücre) / continue (devam) / '' (tek hücre) */
function birlesmeDurumlari(satirlar,liste){
 const durum=satirlar.map(()=>({}));
 liste.forEach(k=>{
  satirlar.forEach((r,i)=>{
   const devam=yuvaBirlesik(r,k),onceki=i>0?durum[i-1][k.key]:'';
   const sonraki=satirlar[i+1]?yuvaBirlesik(satirlar[i+1],k):false;
   durum[i][k.key]=devam&&(onceki==='restart'||onceki==='continue')?'continue':sonraki?'restart':'';
  });
 });
 return durum;
}

/* ---------- Tablo ---------- */
function baslikSatirlari(liste){
 const baslik={boy:13,kalin:true,renk:'333333',gri:true};
 const gruplar=[];liste.forEach(k=>{const son=gruplar[gruplar.length-1],n=k.gen.length;if(son&&C.norm(son.ad)===C.norm(k.grup)){son.genislik+=k.gen.reduce((a,b)=>a+b,0);son.span+=n}else gruplar.push({ad:k.grup,genislik:k.gen.reduce((a,b)=>a+b,0),span:n})});
 const ust=[hucre({genislik:IZGARA_SOL[0]+IZGARA_SOL[1],span:2,metinler:['SÜRE'],...baslik}),...gruplar.map(g=>hucre({genislik:g.genislik,span:g.span,metinler:[g.ad],...baslik}))];
 const alt=[hucre({genislik:IZGARA_SOL[0],metinler:['HAFTA'],...baslik}),hucre({genislik:IZGARA_SOL[1],metinler:['DERS SAATİ'],...baslik}),...liste.map(k=>hucre({genislik:k.gen.reduce((a,b)=>a+b,0),span:k.gen.length,metinler:[k.ad],...baslik}))];
 return[satir(ust,285,true),satir(alt,285,true)];
}
/* "3" → "3 saat" (eski kayıtlarda yalnız sayı olabilir). */
const saatMetni=v=>/^\d+(\s*\+\s*\d+)*$/.test(String(v||'').trim())?`${String(v).trim()} saat`:String(v||'').trim();
function planSatiri(g,i,plan,basliklar,liste,durum,gunler){
 const r=g.r;
 /* Örnekte tatil ve sosyal etkinlik dahil her satır sırayla numaralıdır (20. hafta = Yarıyıl tatili); eski kayıtlarda satırın kendi yazdığı numara korunur. */
 const etiket=r.no===undefined?g.hafta:`${i+1}. hafta`;
 const hafta=hucre({genislik:IZGARA_SOL[0],metinler:[etiket||'—',g.tarih||''],gri:true,dikey:'btLr',ind:true,boy:13,kalin:true,kenarRengi:'333333'});
 const saat=hucre({genislik:IZGARA_SOL[1],metinler:[saatMetni(g.saat)],boy:13});
 const icerik=liste.map((k,j)=>{
  const d=durum[i][k.key],genislik=k.gen.reduce((a,b)=>a+b,0),span=k.gen.length;
  if(d==='continue')return hucre({genislik,span,birlesme:'continue',boy:k.boy});
  let metinler;
  if(g.ozel&&j<5)metinler=[g.ozel];
  else if(k.key==='belirli_gunler'&&!k.kaynak.length)metinler=C.satirGunleri(plan,basliklar,g,gunler);
  else{const deger=yuvaMetni(r,k);metinler=g.bayram&&j<5?[g.bayram,...deger]:deger}
  return hucre({genislik,span,metinler:metinler.length?metinler:[''],boy:k.boy,birlesme:d});
 });
 return satir([hafta,saat,...icerik],1242);
}
/* Örnekteki standart alt bölümler: planda yoksa (eski/Excel planları) aynı metinlerle eklenir. */
const VARSAYILAN_DIPNOTLAR=[
 {ad:'FARKLILAŞTIRMA',metin:'Farklılaştırma kapsamındaki tüm uygulamalar; öğrencilerin ilgi, ihtiyaç ve istekleri göz önünde bulundurularak öğretmenler tarafından planlanır ve uygulanır.'},
 {ad:'OKUL TEMELLİ PLANLAMA',metin:'Okul temelli planlama; Zümre Öğretmenler Kurulu tarafından ders kapsamında yapılması kararlaştırılan; okul dışı öğrenme etkinlikleri, araştırma ve gözlem, sosyal etkinlikler, proje çalışmaları, yerel çalışmalar, okuma çalışmaları vb. çalışmalar için ayrılan süredir. Çalışmalar için ayrılan süre eğitim öğretim yılı içinde\nplanlanır ve yıllık planlarda ifade edilir.\n*Bu çerçeve planda belirtilen okul temelli planlama haftaları örnek olarak sunulmuştur. Planlama, zümre öğretmenler kurulunda alınan kararlara göre okul ve ders koşulları göz önünde bulundurularak yapılmalıdır.'}
];
/* Plan dipnotu varsa o; yoksa eski planın Farklılaştırma/Okul temelli sütunlarındaki ilk dolu değer; o da yoksa örnekteki standart metin. */
function dipnotlariBul(plan,basliklar){
 if((plan.dipnotlar||[]).some(d=>d&&d.metin))return plan.dipnotlar.filter(d=>d&&d.metin);
 const sutunlar=C.sutunBilgileri(plan,basliklar);
 return VARSAYILAN_DIPNOTLAR.map(v=>{
  const kaynak=sutunlar.find(c=>DIPNOT_SUTUNLARI[c.key]===v.ad);
  const metin=kaynak?(plan.satirlar||[]).map(r=>String(r.degerler?.[kaynak.id]||'').trim()).find(Boolean):'';
  return{ad:v.ad,metin:metin||v.metin};
 });
}
function dipSatirlari(plan,basliklar,toplamIzgara,sagGenislik){
 const out=[],yil=String(plan.egitimOgretimYili||'').replace(/\s*[-–]\s*/,'/'),yilSonu=plan.yilSonu||`${yil?yil+' ':''}Eğitim-Öğretim Yılı Sonu`;
 out.push(satir([hucre({genislik:TABLO_GENISLIGI,span:toplamIzgara,metinler:[yilSonu],gri:true,boy:22,kalin:true})],509));
 dipnotlariBul(plan,basliklar).forEach(d=>{
  const uzun=String(d.metin||'').length>120;
  out.push(satir([hucre({genislik:1873,span:3,metinler:[d.ad||''],gri:true,boy:13,kalin:true,ortala:false}),hucre({genislik:sagGenislik,span:toplamIzgara-3,metinler:satirlaBol(d.metin),boy:13,ortala:false})],uzun?509:327));
 });
 return out;
}
const TABLO_OZELLIKLERI='<w:tblPr><w:tblW w:w="14205" w:type="dxa"/><w:tblInd w:w="-38" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="30" w:type="dxa"/><w:right w:w="30" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="0"/></w:tblPr>';
function anaTablo(plan,basliklar,gunler){
 const liste=kolonlar(plan,basliklar);
 if(!liste.some(k=>k.kaynak.length))throw new Error('Planda yazdırılacak sütun yok.');
 const izgara=[...IZGARA_SOL,...liste.flatMap(k=>k.gen)],gorunum=C.satirGorunumu(plan),durum=birlesmeDurumlari(gorunum.map(g=>g.r),liste);
 const govde=gorunum.map((g,i)=>planSatiri(g,i,plan,basliklar,liste,durum,gunler));
 const sag=TABLO_GENISLIGI-1873;
 return`<w:tbl>${TABLO_OZELLIKLERI}<w:tblGrid>${izgara.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${baslikSatirlari(liste).join('')}${govde.join('')}${dipSatirlari(plan,basliklar,izgara.length,sag).join('')}</w:tbl>`;
}

/* ---------- Başlık, zümre ve onay bölümü ---------- */
/* Zümre ve onay bölümü tek parça kalsın: her paragrafta keepNext (sığmazsa bölüm bir sonraki sayfaya geçer). */
const TUT='<w:keepNext/>';
const bos=(boy)=>`<w:p><w:pPr>${TUT}${boy?`<w:rPr><w:sz w:val="${boy}"/><w:szCs w:val="${boy}"/><w:lang w:val="tr-TR"/></w:rPr>`:''}</w:pPr></w:p>`;
const kucukPar=(metin,jc='center')=>`<w:p><w:pPr>${TUT}<w:jc w:val="${jc}"/><w:rPr><w:sz w:val="13"/><w:szCs w:val="13"/><w:lang w:val="tr-TR"/></w:rPr></w:pPr>${metin?`<w:r><w:rPr><w:sz w:val="13"/><w:szCs w:val="13"/><w:lang w:val="tr-TR"/></w:rPr><w:t xml:space="preserve">${esc(metin)}</w:t></w:r>`:''}</w:p>`;
function baslikMetni(plan,bilgi){
 const yil=String(plan.egitimOgretimYili||'').replace(/\s*[-–]\s*/,'/'),okul=buyuk(String(bilgi.okul||'').trim())||NOKTA,sinif=Number(plan.seviye)>0?`${plan.seviye}. SINIF `:'';
 return`${yil?yil+' ':''}EĞİTİM-ÖĞRETİM YILI ${okul} ${sinif}${buyuk(plan.dersAdi)} DERSİ ÜNİTELENDİRİLMİŞ YILLIK PLANI`;
}
function baslikParagrafi(metin){return`<w:p><w:pPr><w:pStyle w:val="Header"/><w:jc w:val="center"/><w:rPr><w:lang w:val="tr-TR"/></w:rPr></w:pPr><w:r><w:rPr><w:lang w:val="tr-TR"/></w:rPr><w:t xml:space="preserve">${esc(metin)}</w:t></w:r></w:p>`}
function adListesi(bilgi){
 const gor=new Set(),out=[];
 [bilgi.ogretmen,...String(bilgi.zumre||'').split(/[\n,;]+/)].forEach(a=>{const ad=String(a||'').trim().replace(/\s+/g,' '),k=C.norm(ad);if(ad&&!gor.has(k)){gor.add(k);out.push(ad)}});
 return out;
}
function zumreTablosu(bilgi){
 const adlar=adListesi(bilgi),sutun=ZUMRE_SATIR_SUTUN,adet=Math.max(adlar.length,sutun),satirSayisi=Math.ceil(adet/sutun);
 const hucreXml=ad=>`<w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr>${TUT}<w:jc w:val="center"/></w:pPr>${ad===null?'':`<w:r><w:rPr/><w:t xml:space="preserve">${esc(ad||NOKTA)}</w:t></w:r>`}</w:p></w:tc>`;
 const satirlar=Array.from({length:satirSayisi},(_,s)=>`<w:tr><w:trPr><w:trHeight w:val="${adlar.length?560:800}" w:hRule="atLeast"/></w:trPr>${Array.from({length:sutun},(_,c)=>{const j=s*sutun+c;return hucreXml(adlar.length?(j<adlar.length?adlar[j]:null):NOKTA)}).join('')}</w:tr>`);
 return`<w:tbl><w:tblPr><w:jc w:val="center"/><w:tblW w:w="12000" w:type="dxa"/><w:tblLayout w:type="autofit"/><w:bidiVisual w:val="0"/><w:tblCellMar><w:top w:w="10" w:type="dxa"/><w:left w:w="10" w:type="dxa"/><w:right w:w="10" w:type="dxa"/><w:bottom w:w="10" w:type="dxa"/></w:tblCellMar><w:tblBorders><w:top w:val="single" w:sz="0" w:color="white"/><w:left w:val="single" w:sz="0" w:color="white"/><w:right w:val="single" w:sz="0" w:color="white"/><w:bottom w:val="single" w:sz="0" w:color="white"/><w:insideH w:val="single" w:sz="0" w:color="white"/><w:insideV w:val="single" w:sz="0" w:color="white"/></w:tblBorders></w:tblPr><w:tblGrid>${Array.from({length:sutun},()=>'<w:gridCol/>').join('')}</w:tblGrid>${satirlar.join('')}</w:tbl>`;
}
function tarihBicimi(v){
 const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(v||'').trim());
 return m?`${m[3]}.${m[2]}.${m[1]}`:String(v||'').trim();
}
/* Gövde: başlık + plan tablosu + zümre öğretmenleri + onay. `bilgi` boşsa yer tutucular noktalı kalır. */
function govdeXml(plan,basliklar,bilgi={},gunler=[]){
 const b=bilgi||{};
 return[bos(),baslikParagrafi(baslikMetni(plan,b)),bos(),anaTablo(plan,basliklar,gunler),bos(),bos(),kucukPar('Zümre Öğretmenleri'),bos(13),zumreTablosu(b),bos(),bos(),
  kucukPar('UYGUNDUR.'),kucukPar(tarihBicimi(b.tarih)||NOKTA),bos(13),bos(13),kucukPar(String(b.mudur||'').trim()||NOKTA),kucukPar('OKUL MÜDÜRÜ'),bos()].join('');
}
function belgeXml(sablonXml,plan,basliklar,bilgi,gunler){
 if(!String(sablonXml).includes('{{GOVDE}}'))throw new Error('Şablonda {{GOVDE}} işaretçisi yok.');
 return String(sablonXml).replace('{{GOVDE}}',()=>govdeXml(plan,basliklar,bilgi,gunler));
}
function cekirdekXml(sablonXml,plan,bilgi){
 const baslik=`${plan.seviye?plan.seviye+'. Sınıf ':''}${plan.dersAdi||''} Yıllık Planı ${plan.egitimOgretimYili||''}`.trim(),simdi=new Date().toISOString().replace(/\.\d+Z$/,'Z');
 return String(sablonXml).replace(/\{\{BASLIK\}\}/g,()=>esc(baslik)).replace(/\{\{YAZAR\}\}/g,()=>esc(bilgi?.ogretmen||'Koruk Asistan')).replace(/\{\{TARIH\}\}/g,simdi);
}

/* ---------- Dosya adı ve paket ---------- */
function slug(s){return String(s||'').toLocaleLowerCase('tr').replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
function dosyaAdi(plan,dolu){
 return[plan.seviye?`${plan.seviye}-sinif`:'',slug(plan.dersAdi),'yillik-plan',String(plan.egitimOgretimYili||'').replace(/\s+/g,''),dolu?'':'bos-sablon'].filter(Boolean).join('-')+'.docx';
}
/* JSZip yerel kopyadan, yalnız Word indirilirken/içe aktarılırken merkezi yükleyiciyle (AppLoader) getirilir. */
function betikYukle(src,hazir){
 if(hazir())return Promise.resolve();
 const hata=()=>new Error('Word paketleyici yüklenemedi.');
 if(!global.AppLoader?.loadScript)return Promise.reject(hata());
 return global.AppLoader.loadScript(src).then(()=>{if(!hazir())throw hata()});
}
let sablonOnbellek=null;
async function sablonYukle(){
 await betikYukle(JSZIP_YOLU,()=>typeof global.JSZip!=='undefined');
 if(!sablonOnbellek){const r=await global.fetch(SABLON_YOLU);if(!r.ok)throw new Error('Word şablonu alınamadı ('+r.status+').');sablonOnbellek=await r.arrayBuffer()}
 return global.JSZip.loadAsync(sablonOnbellek);
}
/* Plan → .docx Blob. dolu=false: kişisel bilgiler noktalı bırakılır ("Boş şablonu indir"). */
async function olustur(plan,basliklar,bilgi,dolu=true,gunler=[]){
 const paket=await sablonYukle(),b=dolu?(bilgi||{}):{};
 paket.file('word/document.xml',belgeXml(await paket.file('word/document.xml').async('string'),plan,basliklar,b,gunler));
 const cekirdek=paket.file('docProps/core.xml');
 if(cekirdek)paket.file('docProps/core.xml',cekirdekXml(await cekirdek.async('string'),plan,b));
 return paket.generateAsync({type:'blob',mimeType:DOCX_TURU,compression:'DEFLATE'});
}
/* Yüklenen .docx dosyasının word/document.xml metni (içe aktarma). */
async function belgeXmlOku(arrayBuffer){
 await betikYukle(JSZIP_YOLU,()=>typeof global.JSZip!=='undefined');
 let paket;try{paket=await global.JSZip.loadAsync(arrayBuffer)}catch(_){throw new Error('Dosya geçerli bir Word (.docx) belgesi değil.')}
 const parca=paket.file('word/document.xml');if(!parca)throw new Error('Word belgesinde içerik bulunamadı.');
 return parca.async('string');
}
/* Blob'u cihaza kaydeder: uygulamada yerel kaydetme, tarayıcıda indirme. */
async function indir(blob,ad){
 if(typeof global.uygulamaDosyaKaydet==='function'){
  const b64=await new Promise((ok,hata)=>{const r=new FileReader();r.onload=()=>ok(String(r.result||'').split(',')[1]||'');r.onerror=()=>hata(r.error||new Error('Dosya hazırlanamadı.'));r.readAsDataURL(blob)});
  return global.uygulamaDosyaKaydet(b64,ad,DOCX_TURU,false);
 }
 const url=global.URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=ad;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>global.URL.revokeObjectURL(url),1200);
 return{web:true};
}
global.YillikPlanWord={belgeXmlOku,indir,olustur,belgeXml,govdeXml,anaTablo,baslikMetni,cekirdekXml,dosyaAdi,adListesi,tarihBicimi,DOCX_TURU,SABLON_YOLU};
})(typeof window!=='undefined'?window:globalThis);
