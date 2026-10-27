/* Koruk Asistan — Öğretmen evrak kataloğu (tek kaynak)
 * Öğretmenden istenen evrakların listesi, dönem/grup/kimden bilgisi ve hazır form dosyaları burada durur.
 * Kullananlar: evrak-teslim.js (imza çizelgesi ve tebliğ) · ogretmen-dosyasi.js (öğretmenin kendi dosya takibi).
 * Kimlikler (b01, d01, s01 …) sıraya göre üretilir; kayıtlı işaretler bu kimliklere bağlıdır — satır eklerken sona ekleyin.
 */
(function(global){
'use strict';
if(global.EvrakKatalog)return;

const DONEMLER=[['basi','Sene Başı'],['donem1','1. Dönem Sonu'],['sonu','Sene Sonu']];
const KIMDEN=[['herkes','Herkes'],['rehber','Sınıf rehber öğretmenleri'],['zumre','Zümre başkanları'],['kulup','Kulüp danışman öğretmenler'],['belirli','Belirli gün/hafta görevlileri']];
const GRUPLAR={idari:'Genel (İdari) Evraklar',rehberlik:'Rehberlik Dosyası',kulup:'Kulüp Dosyası',ozel:'Eklediğiniz Maddeler'};
/* Her dönemin evrak listesi ayrıdır. Satır: [grup, ad (çizelge sütunu), yazı metni (tebliğ yazısındaki madde), varsayılan kimden, ek]
 * ek: { f: hazır form anahtarları (FORMLAR), a: uygulama içindeki ilgili sayfaların kimliği (AppNav; tek kimlik ya da liste) }; sıra, çıktıdaki sütun sırasıdır. */
const BASI=[
 ["idari","Öğretmen Dosyası Kapağı",null,null,{f:["kapak"]}],
 ["idari","Atatürk Portresi",null,null,{f:["ataturk"]}],
 ["idari","Türk Bayrağı",null,null,{f:["bayrak"]}],
 ["idari","İstiklal Marşı",null,null,{f:["istiklal"]}],
 ["idari","Gençliğe Hitabe",null,null,{f:["hitabe"]}],
 ["idari","Öğretmen Öz Geçmiş (CV / Tanıtım Formu)"],
 ["idari","Yıllık İş Günü / Eğitim-Öğretim İş Takvimi",null,null,{f:["is-takvimi","takvim"]}],
 ["idari","Ders Giriş-Çıkış Saatleri",null,null,{f:["ders-saatleri"]}],
 ["idari","Ünitelendirilmiş Yıllık Plan",null,null,{a:"plans"}],
 ["idari","Maarif Aylık Raporları (Öğrenme Çıktıları)",null,null,{a:"form-maarif"}],
 ["idari","Günlük Planlar"],
 ["idari","Dersine Girilen Sınıfların Güncel Öğrenci Listesi (e-Okul)",null,null,{a:"student-list"}],
 ["idari","Şube Öğretmenler Kurulu Toplantı Tutanakları",null,"rehber",{a:"form-sok"}],
 ["idari","Zümre Öğretmenler Kurulu Toplantı Tutanakları (1. ve 2. Dönem)",null,"zumre",{a:"form-zumre"}],
 ["idari","İl / İlçe Zümre Toplantı Tutanakları",null,"zumre",{a:"form-zumre"}],
 ["idari","Veli Toplantısı Evrakları",null,null,{a:"veli-toplantisi"}],
 ["idari","Sınav Analizleri"],
 ["idari","Kazanım Değerlendirme Ölçekleri"],
 ["idari","Proje / Performans / Ders İçi Katılım Değerlendirme Ölçeği",null,null,{f:["proje-degerlendirme"],a:"project"}],
 ["idari","Proje Ödevleri Dağıtım Listesi",null,null,{f:["proje-dagitim","proje-secim"]}],
 ["idari","Gezi İzin Belgesi ve Gezi Planı",null,null,{a:"gezi"}],
 ["idari","Sınıf Oturma Planı ve Ödev Çizelgesi",null,null,{a:["class-seats","homework"]}],
 ["idari","Sosyal Kulüp Dosyası (danışman öğretmenler)",null,"kulup",{a:"form-kulup"}],
 ["idari","Sınıf Rehber Öğretmeni Dosyası",null,"rehber",{a:"sinif-rehberlik"}],
 ["idari","Ders Dışı Egzersiz ve Sosyal Etkinlik Belgeleri"],
 ["idari","Öğrenci Ürün Dosyası Örnekleri"],
 ["idari","Öğrenci Performans Çizelgesi",null,null,{a:"grades"}],
 ["idari","BEP’li Öğrenci Dosyası (varsa)",null,null,{a:"bep-hazirla"}],
 ["idari","Yazılı Kâğıtları ve Puanlanmış Cevap Anahtarı",null,null,{f:["yazili-teslim"]}],
 ["idari","Ders Kesim Raporu"],
 ["idari","Aday Öğretmen Çalışmaları / Performans Değerlendirme Formları"],
 ["idari","Belirli Gün ve Haftalar Çizelgesi / Program Akışları",null,"belirli",{a:"form-belirli"}],
 ["rehberlik","Sınıf Öğrenci Listesi",null,null,{a:"student-list"}],
 ["rehberlik","Sınıf Oturma Planı",null,null,{a:"class-seats"}],
 ["rehberlik","Rehberlik Raporları",null,null,{a:"sinif-rehberlik"}],
 ["rehberlik","Devamsızlık Çizelgesi / Mektupları"],
 ["rehberlik","Veli İletişim Bilgileri"],
 ["rehberlik","Veli Görüşme Kayıtları",null,null,{a:"parentmeeting"}],
 ["rehberlik","Veli Toplantı Tutanakları",null,null,{a:"veli-toplantisi"}],
 ["rehberlik","Veli Formu"],
 ["rehberlik","Öğrenci Tanıma ve Gözlem Formları"],
 ["rehberlik","Rehberlik Servisine Öğrenci Yönlendirme Formu"],
 ["rehberlik","Uygulanan Test-Anket-Formlar (varsa)"],
 ["rehberlik","Sosyal Medya Veli İzin Belgesi"],
 ["rehberlik","Sınıf Kuralları"],
 ["rehberlik","Sınıf Risk Haritası"],
 ["rehberlik","Sınıf Rehber Öğretmeninin Görevleri"],
 ["rehberlik","Sınıf Başkanı Seçimi ve Görevleri"],
 ["rehberlik","Sınıf Nöbetçi Öğrenci Görevleri / Aylık Nöbetçi Öğrenci Listesi"],
 ["rehberlik","Sınıf Kitaplık Listesi"],
 ["rehberlik","Sınıf Rehberlik Programı Kazanımları",null,null,{a:"sinif-rehberlik"}],
 ["rehberlik","Yıllık Rehberlik Çalışma Planı",null,null,{a:"sinif-rehberlik"}],
 ["kulup","Kulüp Öğrenci Listesi (Eğitici Kulüplere Seçilenler)"],
 ["kulup","Kulüp Tüzüğü / Yönetmeliği"],
 ["kulup","Kulüp Yıllık Çalışma Planı",null,null,{a:"form-kulup"}],
 ["kulup","Kulüp Toplum Hizmeti Çalışma Planı"],
 ["kulup","Kulüp Toplantı Tutanakları / Karar Defteri",null,null,{a:"form-kulup"}],
 ["kulup","Kulüp Aylık Çalışma Raporları",null,null,{a:"form-kulup"}],
 ["kulup","Kulüp Yıl Sonu Faaliyet Raporu",null,null,{a:"form-kulup"}],
 ["kulup","Kulüp Bütçesi Evrakları"],
 ["kulup","Kulüp Görev Dağılım Çizelgesi"],
 ["kulup","Pano Çalışmaları Dosyası"]
];
const DONEM1=[
 ["idari","Her dersten iki yazılı notunu e-Okul'a işle","Her dersten iki yazılı sınav notunun e-Okul'a işlenmesi"],
 ["idari","Sınav analizlerini hazırla ve teslim et","Sınav analizlerinin hazırlanarak teslim edilmesi"],
 ["idari","Ders ve etkinliklere katılım puanlarını ver","Ders ve etkinliklere katılım puanlarının verilmesi"],
 ["idari","Kazanım değerlendirme ölçeklerini dosyana koy","Kazanım değerlendirme ölçeklerinin öğretmen dosyasına konulması"],
 ["idari","Puanların e-Okul'daki karşılığını kontrol et","Puanların e-Okul'daki karşılığının kontrol edilmesi"],
 ["rehberlik","Not girişinin özel kurallarını uygula","Not girişine ilişkin özel kurallara uyulması"],
 ["idari","Mazeretli öğrencilerin sınavlarını tamamla","Mazeretli öğrencilerin sınavlarının tamamlanması"],
 ["idari","Maarif aylık raporlarını tamamla ve teslim et","Maarif aylık raporlarının tamamlanarak teslim edilmesi",null,{a:"form-maarif"}],
 ["idari","Yıllık planın birinci dönem işlenişini kontrol et","Yıllık planın birinci dönem işlenişinin kontrol edilmesi"],
 ["rehberlik","Karne bilgileri — öğretmen görüşünü doldur","Karne bilgileri öğretmen görüşü bölümünün doldurulması"],
 ["idari","Gelişim düzeyleri ve sosyal-duygusal öğrenme becerilerini gir","Gelişim düzeyleri ile sosyal-duygusal öğrenme becerilerinin girilmesi"],
 ["rehberlik","Davranış notlarını gir","Davranış notlarının girilmesi"],
 ["idari","Sınıf kitaplığını oluştur, okunan kitapları gir","Sınıf kitaplığının oluşturulması ve okunan kitapların girilmesi"],
 ["kulup","Sosyal etkinlik girişlerini tamamla","Sosyal etkinlik girişlerinin tamamlanması"],
 ["idari","Öğretmen puan çizelgesini kontrol et ve imzala","Öğretmen puan çizelgesinin kontrol edilerek imzalanması"],
 ["idari","Ders defterini ve sınıf defterini kapat","Ders defteri ile sınıf defterinin kapatılması"],
 ["idari","Devamsızlık girişlerini kapat","Devamsızlık girişlerinin tamamlanarak kapatılması"],
 ["idari","Nöbet defterini kontrol et","Nöbet defterinin kontrol edilmesi"],
 ["idari","Yazılı kâğıtlarını teslim tutanağıyla teslim et","Yazılı sınav kâğıtlarının teslim tutanağıyla teslim edilmesi",null,{f:["yazili-teslim"]}],
 ["rehberlik","Takdir / teşekkür ve onur belgesi durumunu kontrol et","Takdir, teşekkür ve onur belgesi durumlarının kontrol edilmesi"],
 ["idari","Dönem sonu şube öğretmenler kurulu (ŞÖK) toplantısına katıl","Dönem sonu şube öğretmenler kurulu toplantısına katılım sağlanması","rehber",{a:"form-sok"}],
 ["idari","Dönem sonu zümre toplantısına katıl","Dönem sonu zümre öğretmenler kurulu toplantısına katılım sağlanması","zumre",{a:"form-zumre"}],
 ["rehberlik","Dönem sonu veli toplantısını yap","Dönem sonu veli toplantısının yapılması"],
 ["rehberlik","Sınıf rehberlik dönem sonu faaliyet raporunu teslim et","Sınıf rehberlik dönem sonu faaliyet raporunun teslim edilmesi",null,{a:"sinif-rehberlik"}],
 ["kulup","Kulüp dönem sonu faaliyet ve aylık raporlarını teslim et","Öğrenci kulübü dönem sonu faaliyet raporu ile aylık raporların teslim edilmesi",null,{a:"form-kulup"}],
 ["idari","Ders dışı egzersiz çalışmalarının dönem kaydını tamamla","Ders dışı egzersiz çalışmalarına ait dönem kayıtlarının tamamlanması"],
 ["idari","Dönem içinde yapılan gezilerin evrakını dosyala","Dönem içinde yapılan gezilere ait evrakın dosyalanması",null,{a:"gezi"}],
 ["idari","Kurul, komisyon ve belirli gün-hafta işlerini tamamla","Kurul, komisyon ve belirli gün ve haftalara ilişkin görevlerin tamamlanması","belirli",{a:"form-belirli"}],
 ["idari","Anasınıfı gelişim / beceri edinme formlarını doldur","Anasınıfı gelişim ve beceri edinme formlarının doldurulması"],
 ["idari","İkinci dönem için oturma planını ve ödev çizelgesini yenile","İkinci dönem için oturma planı ile ödev çizelgesinin yenilenmesi",null,{a:["class-seats","homework"]}],
 ["idari","Gerekirse tutanak tut, dilekçe yaz","Gerekli durumlarda tutanak tutulması ve dilekçe yazılması",null,{a:"tutanak"}],
 ["idari","Yarıyıl tatili izin işlemlerini kontrol et","Yarıyıl tatiline ilişkin izin işlemlerinin kontrol edilmesi"],
 ["idari","Öğretmen dosyasını idareye teslim et","Öğretmen dosyasının okul idaresine teslim edilmesi"]
];
const SONU=[
 ["idari","İkinci dönem yazılı ve katılım notlarını tamamla","İkinci dönem yazılı ve katılım notlarının tamamlanması"],
 ["idari","Sınav analizlerini hazırla ve teslim et","Sınav analizlerinin hazırlanarak teslim edilmesi"],
 ["idari","Proje notunu gir","Proje notunun girilmesi"],
 ["idari","Proje ve katılım değerlendirme ölçeklerini idareye teslim et","Proje ve katılım değerlendirme ölçeklerinin idareye teslim edilmesi",null,{f:["proje-degerlendirme"],a:"project"}],
 ["idari","Maarif aylık raporlarının yıl sonu dosyasını tamamla","Maarif aylık raporlarının yıl sonu dosyasının tamamlanması",null,{a:"form-maarif"}],
 ["rehberlik","Karne bilgileri — öğretmen görüşünü doldur","Karne bilgileri öğretmen görüşü bölümünün doldurulması"],
 ["rehberlik","Yıl sonu davranış notlarını gir","Yıl sonu davranış notlarının girilmesi"],
 ["idari","Gelişim düzeyi ile sosyal-duygusal öğrenme becerisi girişlerini tamamla","Gelişim düzeyi ile sosyal-duygusal öğrenme becerisi girişlerinin tamamlanması"],
 ["kulup","Sınıf kitaplığı ve sosyal etkinlik girişlerini yıl sonuna göre kapat","Sınıf kitaplığı ve sosyal etkinlik girişlerinin yıl sonuna göre kapatılması"],
 ["idari","Ders kesim raporunu hazırla","Ders kesim raporunun hazırlanması"],
 ["idari","BEP'li öğrenciler için değerlendirme / ilerleme raporunu hazırla","BEP'li öğrenciler için değerlendirme ve ilerleme raporunun hazırlanması",null,{a:"bep-hazirla"}],
 ["idari","Öğretmen puan çizelgesini kontrol et ve imzala","Öğretmen puan çizelgesinin kontrol edilerek imzalanması"],
 ["idari","Sene sonu şube öğretmenler kurulu (ŞÖK) toplantısına katıl","Sene sonu şube öğretmenler kurulu toplantısına katılım sağlanması","rehber",{a:"form-sok"}],
 ["idari","Yıl sonu zümre toplantısına katıl","Yıl sonu zümre öğretmenler kurulu toplantısına katılım sağlanması","zumre",{a:"form-zumre"}],
 ["rehberlik","Rehberlik yıl sonu faaliyet raporunu teslim et","Rehberlik yıl sonu faaliyet raporunun teslim edilmesi",null,{a:"sinif-rehberlik"}],
 ["kulup","Kulüp yıl sonu faaliyet raporunu ve aylık raporları teslim et","Öğrenci kulübü yıl sonu faaliyet raporu ile aylık raporların teslim edilmesi",null,{a:"form-kulup"}],
 ["idari","Ders dışı egzersiz bitiş raporunu teslim et","Ders dışı egzersiz bitiş raporunun teslim edilmesi"],
 ["idari","Yıl içi gezilerin evrakını dosyala","Yıl içinde yapılan gezilere ait evrakın dosyalanması",null,{a:"gezi"}],
 ["idari","Belirli gün ve hafta görevlerinin dosyasını tamamla","Belirli gün ve haftalara ilişkin görevlerin dosyasının tamamlanması","belirli",{a:"form-belirli"}],
 ["idari","Sınıf defterlerini ve nöbet defterini kapat","Sınıf defterleri ile nöbet defterinin kapatılması"],
 ["idari","Yazılı kâğıtlarını teslim tutanağıyla teslim et","Yazılı sınav kâğıtlarının teslim tutanağıyla teslim edilmesi",null,{f:["yazili-teslim"]}],
 ["rehberlik","Takdir / teşekkür belgelerini karneyle birlikte ver","Takdir ve teşekkür belgelerinin karneyle birlikte verilmesi"],
 ["rehberlik","Karne işlemlerini tamamla, mühür ve imzayı yaptır","Karne işlemlerinin tamamlanarak mühür ve imzanın yaptırılması"],
 ["idari","Anasınıfı yıl sonu beceri edinim raporlarını hazırla","Anasınıfı yıl sonu beceri edinim raporlarının hazırlanması"],
 ["idari","Yaz tatili izin ve görev işlemlerini kontrol et","Yaz tatiline ilişkin izin ve görev işlemlerinin kontrol edilmesi"],
 ["idari","Öğretmen dosyasını idareye teslim et","Öğretmen dosyasının okul idaresine teslim edilmesi"]
];

/* Sene başında rehberlik evrakı sınıf rehber öğretmenlerinden, dönem ve yıl sonunda herkesten istenir. */
const katalogYap=(donem,onek,rows,rehberVarsayilan)=>rows.map((x,i)=>({id:onek+String(i+1).padStart(2,'0'),donem,grup:x[0],ad:x[1],yazi:x[2]||x[1],kimden:x[3]||(x[0]==='kulup'?'kulup':x[0]==='rehberlik'&&rehberVarsayilan?'rehber':'herkes'),formlar:x[4]?.f||[],araclar:[].concat(x[4]?.a||[])}));
const KATALOG=[...katalogYap('basi','b',BASI,true),...katalogYap('donem1','d',DONEM1,false),...katalogYap('sonu','s',SONU,false)];

/* Hazır form dosyaları (assets/ogretmen-dosyasi/). docx = alanları doldurulup indirilen Word şablonu ({{OKUL}}, {{AD_SOYAD}} …),
 * pdf = olduğu gibi indirilen belge, satir = şablondaki tekrarlanan satırların uygulamadaki kaynağı (saatler = Ayarlar › Ders Saatleri), yil = yalnız o eğitim-öğretim yılında geçerli (tarihleri yıla özgü formlar). */
const DOSYA_KOKU='assets/ogretmen-dosyasi/';
const FORMLAR={
 kapak:{ad:'Öğretmen Dosyası Kapağı',docx:'ogretmen-dosya-kapagi.docx'},
 ataturk:{ad:'Atatürk Portresi',pdf:'ataturk-portresi.pdf'},
 bayrak:{ad:'Türk Bayrağı',pdf:'turk-bayragi.pdf'},
 istiklal:{ad:'İstiklal Marşı',pdf:'istiklal-marsi.pdf'},
 hitabe:{ad:'Gençliğe Hitabe',pdf:'genclige-hitabe.pdf'},
 'is-takvimi':{ad:'Eğitim ve Öğretim Yılı Çalışma Takvimi (iş günleri)',pdf:'calisma-takvimi-2026-2027.pdf',yil:'2026-2027'},
 takvim:{ad:'Kurul ve Zümre Toplantıları Takvimi',docx:'kurul-zumre-takvimi-2026-2027.docx',yil:'2026-2027'},
 'ders-saatleri':{ad:'Ders Giriş-Çıkış Saatleri',docx:'ders-giris-cikis-saatleri.docx',satir:'saatler'},
 'proje-secim':{ad:'Proje Ödevi Seçim Formu',docx:'proje-odevi-secim-formu.docx'},
 'proje-dagitim':{ad:'Proje Ödevleri Dağıtım Listesi',docx:'proje-dagitim-listesi.docx'},
 'proje-degerlendirme':{ad:'Proje Ödev Değerlendirme ve Takip Formu',docx:'proje-odev-degerlendirme-formu.docx'},
 'yazili-teslim':{ad:'Yazılı Kâğıtları Teslim Tutanağı',docx:'yazili-kagitlari-teslim-tutanagi.docx'}
};

/* Eğitim-öğretim yılı: Eylül'den itibaren yeni yıl. */
function egitimYili(d=new Date()){const y=d.getFullYear();return d.getMonth()+1>=9?`${y}-${y+1}`:`${y-1}-${y}`}
/* Bir maddenin o yıl kullanılabilir formları (yıla özgü formlar başka yılda gizlenir). */
function formlar(madde,yil=egitimYili()){return(madde?.formlar||[]).map(k=>({key:k,...FORMLAR[k]})).filter(f=>f.ad&&(!f.yil||f.yil===yil))}

global.EvrakKatalog={DONEMLER,KIMDEN,GRUPLAR,KATALOG,FORMLAR,DOSYA_KOKU,egitimYili,formlar};
})(window);
