/* Koruk Asistan — Haftanın ayeti / hadisi / özlü sözü havuzları
 * Üç ayrı kart (ana sayfa) her hafta kendi havuzundan bir söz gösterir; seçim hafta numarasına göre sıradandır (aynı hafta herkes aynı sözü görür).
 * Havuz = hazır liste (Ayarlar'dan tek tek kapatılabilir) + yöneticinin eklediği sözler. Ayarlar: AppConfig.get().sozHavuzu
 *   { ayet|hadis|ozluSoz: { kapali:[hazır söz id'leri], ozel:[{metin,kaynak}] } }
 * Dashboard (kart) ve Ayarlar (havuz editörü) bu tek kaynağı kullanır.
 */
(function(global){
'use strict';
if(global.HaftaSozleri)return;
const TURLER=[
 {key:'ayet',baslik:'Haftanın Ayeti',kisa:'Ayet',aciklama:'Meal metinleri kısa tutulmuştur; kendi mealinizi “Söz ekle” ile havuza katabilirsiniz.'},
 {key:'hadis',baslik:'Haftanın Hadisi',kisa:'Hadis',aciklama:'Kaynak bilgisi hadisin geçtiği eserdir.'},
 {key:'ozluSoz',baslik:'Haftanın Özlü Sözü',kisa:'Özlü söz',aciklama:'Atatürk, düşünür ve atasözlerinden seçmeler; okulunuza uygun sözleri ekleyebilirsiniz.'}
];
/* [id, metin, kaynak] */
const HAZIR={
 ayet:[
  ['a01','Yaratan Rabbinin adıyla oku!','Alak Suresi, 1'],
  ['a02','De ki: “Hiç bilenlerle bilmeyenler bir olur mu?”','Zümer Suresi, 9'],
  ['a03','İyilik ve takvâ üzerinde yardımlaşın; günah ve düşmanlık üzerinde yardımlaşmayın.','Mâide Suresi, 2'],
  ['a04','Müminler ancak kardeştirler. Öyleyse kardeşlerinizin arasını düzeltin.','Hucurât Suresi, 10'],
  ['a05','Allah, adaleti, iyilik yapmayı ve akrabaya yardım etmeyi emreder.','Nahl Suresi, 90'],
  ['a06','Elbette zorlukla beraber bir kolaylık vardır.','İnşirah Suresi, 5'],
  ['a07','İnsan için ancak çalıştığının karşılığı vardır.','Necm Suresi, 39'],
  ['a08','“Rabbim, ilmimi artır” de.','Tâhâ Suresi, 114'],
  ['a09','Allah hiç kimseye gücünün üstünde bir yük yüklemez.','Bakara Suresi, 286'],
  ['a10','Allah, içinizden iman edenlerin ve kendilerine ilim verilenlerin derecelerini yükseltir.','Mücâdele Suresi, 11'],
  ['a11','Biliniz ki kalpler ancak Allah’ı anmakla huzur bulur.','Ra’d Suresi, 28'],
  ['a12','İyilikle kötülük bir olmaz. Sen kötülüğü en güzel olan davranışla önle.','Fussilet Suresi, 34'],
  ['a13','Allah katında en değerli olanınız, takvâda en ileride olanınızdır.','Hucurât Suresi, 13'],
  ['a14','Kim zerre kadar iyilik yaparsa onun karşılığını görür.','Zilzâl Suresi, 7'],
  ['a15','Ey iman edenler! Sabır ve namazla yardım dileyin. Şüphesiz Allah sabredenlerle beraberdir.','Bakara Suresi, 153'],
  ['a16','Rabbin, yalnız kendisine kulluk etmenizi ve anne babaya iyi davranmanızı emretti.','İsrâ Suresi, 23'],
  ['a17','Adaletli olun; bu, takvâya daha yakındır.','Mâide Suresi, 8'],
  ['a18','İnsanlara güzel söz söyleyin.','Bakara Suresi, 83']
 ],
 hadis:[
  ['h01','Ameller niyetlere göredir.','Buhârî, Bed’ü’l-Vahy 1'],
  ['h02','Kolaylaştırınız, zorlaştırmayınız; müjdeleyiniz, nefret ettirmeyiniz.','Buhârî, İlim 11'],
  ['h03','Sizin en hayırlınız, Kur’ân’ı öğrenen ve öğretendir.','Buhârî, Fezâilü’l-Kur’ân 21'],
  ['h04','Hiçbiriniz, kendiniz için istediğinizi kardeşiniz için de istemedikçe gerçek anlamda iman etmiş olmazsınız.','Buhârî, İman 7'],
  ['h05','Güzel söz sadakadır.','Buhârî; Müslim'],
  ['h06','Mümin, müminin bir duvarın tuğlaları gibidir; birbirini destekler.','Buhârî, Salât 88; Müslim, Birr 65'],
  ['h07','Kim ilim öğrenmek için bir yola girerse, Allah ona cennete giden yolu kolaylaştırır.','Müslim, Zikr 38'],
  ['h08','İki nimet vardır ki insanların çoğu bunların kıymetini bilmez: sağlık ve boş vakit.','Buhârî, Rikāk 1'],
  ['h09','Merhamet etmeyene merhamet olunmaz.','Buhârî, Edeb 18'],
  ['h10','Doğruluktan ayrılmayın; çünkü doğruluk iyiliğe, iyilik de cennete götürür.','Buhârî, Edeb 69'],
  ['h11','Güçlü kimse güreşte rakibini yenen değil, öfkelendiğinde kendine hâkim olandır.','Buhârî, Edeb 76'],
  ['h12','Küçüklerimize merhamet etmeyen, büyüklerimize saygı göstermeyen bizden değildir.','Tirmizî, Birr 15'],
  ['h13','Din, samimiyet ve hayırhahlıktır.','Müslim, İman 95'],
  ['h14','Kardeşinin yüzüne tebessüm etmen sadakadır.','Tirmizî, Birr 36'],
  ['h15','Temizlik imanın yarısıdır.','Müslim, Tahâret 1'],
  ['h16','Hepiniz birer çobansınız ve güttüğünüz sürüden sorumlusunuz.','Buhârî, Cum’a 11; Müslim, İmâre 20']
 ],
 ozluSoz:[
  ['o01','Hayatta en hakiki mürşit ilimdir, fendir.','Mustafa Kemal Atatürk'],
  ['o02','Öğretmenler! Yeni nesil sizin eseriniz olacaktır.','Mustafa Kemal Atatürk'],
  ['o03','Bütün ümidim gençliktedir.','Mustafa Kemal Atatürk'],
  ['o04','Yurtta sulh, cihanda sulh.','Mustafa Kemal Atatürk'],
  ['o05','Sanatsız kalan bir milletin hayat damarlarından biri kopmuş demektir.','Mustafa Kemal Atatürk'],
  ['o06','Küçük hanımlar, küçük beyler! Sizler hepiniz geleceğin bir gülü, yıldızı ve ikbal ışığısınız.','Mustafa Kemal Atatürk'],
  ['o07','Yaratılanı severiz, Yaratandan ötürü.','Yunus Emre'],
  ['o08','Gelin tanış olalım, işi kolay kılalım; sevelim sevilelim, dünya kimseye kalmaz.','Yunus Emre'],
  ['o09','Eline, diline, beline sahip ol.','Hacı Bektaş-ı Veli'],
  ['o10','Eğitim, dünyayı değiştirmek için kullanabileceğiniz en güçlü silahtır.','Nelson Mandela'],
  ['o11','Hayal gücü bilgiden daha önemlidir.','Albert Einstein'],
  ['o12','Damlaya damlaya göl olur.','Atasözü'],
  ['o13','Bir elin nesi var, iki elin sesi var.','Atasözü'],
  ['o14','Ağaç yaşken eğilir.','Atasözü']
 ]
};
const str=(v,max)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max);
const turKey=k=>TURLER.some(t=>t.key===k)?k:'ayet';
/* Ayarlar kaydından tek bir türün kapalı/özel listelerini güvenli biçimde çıkarır. */
function ayar(sozHavuzu,tur){
 const raw=sozHavuzu&&typeof sozHavuzu==='object'&&!Array.isArray(sozHavuzu)?sozHavuzu[turKey(tur)]:null,ids=new Set(HAZIR[turKey(tur)].map(x=>x[0]));
 return{
  kapali:Array.isArray(raw?.kapali)?raw.kapali.map(String).filter(id=>ids.has(id)):[],
  ozel:Array.isArray(raw?.ozel)?raw.ozel.map(x=>({metin:str(x?.metin,300),kaynak:str(x?.kaynak,80)})).filter(x=>x.metin):[]
 };
}
const hazir=tur=>HAZIR[turKey(tur)].map(([id,metin,kaynak])=>({id,metin,kaynak,hazir:true}));
/* Aktif havuz: kapatılmamış hazır sözler + yöneticinin eklediği sözler (sıra sabit). */
function havuz(tur,sozHavuzu){
 const a=ayar(sozHavuzu,tur),kapali=new Set(a.kapali);
 return[...hazir(tur).filter(x=>!kapali.has(x.id)),...a.ozel.map((x,i)=>({id:`ozel-${i+1}`,metin:x.metin,kaynak:x.kaynak,hazir:false}))];
}
/* Pazartesi başlangıçlı hafta sayacı (1970-01-05 Pazartesi); yerel tarihe göre, saat dilimi kaymaz. */
function haftaNo(d=new Date()){return Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(1970,0,5))/(7*864e5))}
function buHafta(tur,sozHavuzu,d=new Date()){const list=havuz(tur,sozHavuzu);return list.length?list[haftaNo(d)%list.length]:null}
global.HaftaSozleri={TURLER,HAZIR,ayar,hazir,havuz,haftaNo,buHafta};
})(window);
