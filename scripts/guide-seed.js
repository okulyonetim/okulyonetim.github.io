/* Kullanım kılavuzu ekran görüntüleri için ÖRNEK (uydurma) okul verisi.
 * scripts/guide-build.py bu dosyayı yerel çalışan uygulamaya yükler; gerçek öğrenci / personel verisi içermez.
 * Adlar, telefonlar ve e-postalar tamamen kurgusaldır (telefon: 0555 000 00 xx, e-posta: example.com). */
(function(){
const names=['Ahmet','Elif','Mert','Zeynep','Can','Defne','Emir','Asya','Kaan','Mina','Arda','Ela','Berk','Naz','Yusuf','Ada','Eren','İpek','Burak','Selin'];
const FEMALE=new Set(['Elif','Zeynep','Defne','Asya','Mina','Ela','Naz','Ada','İpek','Selin']);
const guardians=['Hülya','Sedat','Gül','Ramazan','Leyla','Nihat','Sevgi','Orhan','Nur','Cemal'];
const surnames=['Aksoy','Bulut','Çelik','Demir','Erdem','Güneş','Kaya','Özkan','Polat','Şahin','Tunç','Yıldız'];
const teachers=[
 ['Ayşe','Yılmaz','Matematik','Kadın'],['Mehmet','Demir','Türkçe','Erkek'],['Zeynep','Kaya','Özel Eğitim','Kadın'],['Hasan','Çelik','Fen Bilimleri','Erkek'],
 ['Elif','Şahin','İngilizce','Kadın'],['Murat','Aydın','Sosyal Bilgiler','Erkek'],['Fatma','Koç','Sınıf Öğretmeni','Kadın'],['Ali','Arslan','Beden Eğitimi','Erkek'],
 ['Selin','Öztürk','Görsel Sanatlar','Kadın'],['Kemal','Başaran','Din Kültürü','Erkek'],['Derya','Erdoğan','Sınıf Öğretmeni','Kadın'],['Burak','Taş','Bilişim Teknolojileri','Erkek']
].map((t,i)=>({id:'t'+String(i+1).padStart(2,'0'),ad:t[0],soyad:t[1],unvan:'Öğretmen',brans:t[2],cinsiyet:t[3],telefon:'0555 000 00 '+String(i+10),eposta:(t[0]+'.'+t[1]).toLocaleLowerCase('tr').replace(/[ıİ]/g,'i').replace(/[çÇ]/g,'c').replace(/[ğĞ]/g,'g').replace(/[öÖ]/g,'o').replace(/[şŞ]/g,'s').replace(/[üÜ]/g,'u')+'@example.com',aktif:true}));
const classDefs=[['1-A',1,'t07'],['2-A',2,'t11'],['5-A',5,'t01'],['5-B',5,'t02'],['6-A',6,'t04'],['6-B',6,'t05'],['7-A',7,'t06'],['8-A',8,'t03']];
const classes=classDefs.map((c,i)=>({id:'c'+i,ad:c[0],seviye:c[1],sinifOgretmeniId:c[2]}));
const students=[];let n=0;
classes.forEach((c,ci)=>{for(let k=0;k<(ci%3===0?7:5);k++){const name=names[(n+ci)%names.length],sur=surnames[(n*3+ci)%surnames.length];students.push({id:'v'+n,sinifId:c.id,ogrenciAdi:name+' '+sur,ogrenciNo:String(1001+n),cinsiyet:FEMALE.has(name)?'Kız':'Erkek',veliAdi:guardians[n%guardians.length]+' '+sur,telefon:'0555 000 01 '+String(10+n)});n++}});

/* ---- Ders programı, nöbet, evrak, duyuru: kurgusal örnekler ---- */
const DAYS=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma'];
function schedule(){
  const byBranch={Matematik:'t01','Türkçe':'t02','Özel Eğitim':'t03','Fen Bilimleri':'t04','İngilizce':'t05','Sosyal Bilgiler':'t06','Beden Eğitimi':'t08','Görsel Sanatlar':'t09','Din Kültürü':'t10','Bilişim Teknolojileri':'t12'};
  const upper=Object.entries(byBranch).filter(([b])=>b!=='Özel Eğitim');
  const busy=new Set(),rows=[];let k=0;
  classes.forEach((c,ci)=>{
    DAYS.forEach((day,di)=>{
      for(let slot=1;slot<=6;slot++){
        let ders,tid;
        if(c.seviye<=2){ders=['Türkçe','Matematik','Hayat Bilgisi','Oyun ve Fiziki Etkinlikler'][(di+slot)%4];tid=c.sinifOgretmeniId}
        else{for(let t=0;t<upper.length;t++){const [b,id]=upper[(ci*3+di*2+slot+t)%upper.length];if(!busy.has(id+day+slot)){ders=b;tid=id;break}}}
        if(!ders||busy.has(tid+day+slot))continue;
        busy.add(tid+day+slot);rows.push({id:'d'+(k++),sinif:c.ad,gun:day,saat:slot,ders,ogretmenId:tid});
      }
    });
  });
  return rows;
}
const times=[['08:30','09:10'],['09:25','10:05'],['10:20','11:00'],['11:15','11:55'],['12:10','12:50'],['13:05','13:45'],['13:55','14:35']].map((t,i)=>({saat:i+1,baslangic:t[0],bitis:t[1]}));
function duty(){
  const places=[{id:'y1',ad:'Bahçe',sira:1},{id:'y2',ad:'Zemin Kat',sira:2},{id:'y3',ad:'1. Kat',sira:3}];
  const rows=[],pool=['t08','t06','t05','t12','t10','t09','t01','t02','t04','t11'];let n=0;
  for(let d=1;d<=31;d++){const dt=new Date(2026,9,d);if(dt.getDay()===0||dt.getDay()===6)continue;
    places.forEach((p,i)=>{const o=teachers.find(t=>t.id===pool[(n+i*3)%pool.length]);rows.push({id:'n'+rows.length,tarih:'2026-10-'+String(d).padStart(2,'0'),yerId:p.id,ogretmenId:o.id,ogretmenAdSoyad:o.ad+' '+o.soyad})});n++}
  return{places,rows};
}
const evrak=[
 {id:'e1',evrakAdi:'Eylül ayı devam-devamsızlık çizelgesi',tur:'Giden Evrak',tarih:'2026-10-05',durum:'Tamamlandı',sorumluOgretmenIdler:['t07'],aciklama:'İlçe milli eğitim müdürlüğüne gönderildi.'},
 {id:'e2',evrakAdi:'Rehberlik hizmetleri yıllık planı',tur:'Gelen Evrak',tarih:'2026-10-08',durum:'İşlemde',sorumluOgretmenIdler:['t03','t11'],aciklama:'Sınıf öğretmenlerinden bilgi toplanıyor.'},
 {id:'e3',evrakAdi:'Veli toplantısı tutanağı',tur:'Tutanak',tarih:'2026-10-09',durum:'Beklemede',sorumluOgretmenIdler:['t01'],aciklama:''},
 {id:'e4',evrakAdi:'Zümre toplantısı gündemi',tur:'İç Yazışma',tarih:'2026-10-12',durum:'Beklemede',sorumluOgretmenIdler:['t02','t04'],aciklama:'Toplantı salı günü yapılacak.'},
 {id:'e5',evrakAdi:'Eski yıl ders dağıtım çizelgesi',tur:'Diğer',tarih:'2026-09-02',durum:'Arşivlendi',sorumluOgretmenIdler:[],aciklama:''}
];
const duyurular=[
 {id:'a1',baslik:'Veli toplantısı',icerik:'Birinci dönem veli toplantısı cuma günü saat 15.00’te sınıflarda yapılacaktır. Katılımınızı bekleriz.',tarih:'2026-10-13T09:10:00.000Z',olusturanAdi:'Okul Yöneticisi',arsivlendi:false,resimler:[]},
 {id:'a2',baslik:'Kitap okuma haftası etkinlikleri',icerik:'Kitap okuma haftasında her sınıf bir kitap seçip etkinlik hazırlayacaktır. Sınıf öğretmenleri planlamayı pazartesiye kadar tamamlayacaktır.',tarih:'2026-10-09T08:00:00.000Z',olusturanAdi:'Okul Yöneticisi',arsivlendi:false,resimler:[]},
 {id:'a3',baslik:'Okul servis saatleri',icerik:'Servis kalkış saatlerinde değişiklik yoktur.',tarih:'2026-09-20T08:00:00.000Z',olusturanAdi:'Okul Yöneticisi',arsivlendi:true,resimler:[]}
];
/* ---- Sınavlar, takvim, notlar: kurgusal örnekler (sabit saat: 14 Ekim 2026 çarşamba 10:25) ---- */
const sinavlar=[
 {id:'w1',tur:'Yazılı',ders:'Matematik',siniflar:'5-A, 5-B',sinif:'5-A',donem:'1. Dönem',yaziliSirasi:'1. Yazılı',dersSaati:'3',ogretmenId:'t01',tarih:'2026-10-14',senaryoNo:'1',yayinevi:'',notlar:'Sınav kâğıtları sınıfa 3. ders başında götürülecek.'},
 {id:'w2',tur:'Yazılı',ders:'Türkçe',siniflar:'6-A, 6-B',sinif:'6-A',donem:'1. Dönem',yaziliSirasi:'1. Yazılı',dersSaati:'2',ogretmenId:'t02',tarih:'2026-10-16',senaryoNo:'2',yayinevi:'Örnek Yayınları',notlar:''},
 {id:'w4',tur:'Yazılı',ders:'İngilizce',siniflar:'8-A',sinif:'8-A',donem:'1. Dönem',yaziliSirasi:'1. Yazılı',dersSaati:'5',ogretmenId:'t05',tarih:'2026-10-09',senaryoNo:'1',yayinevi:'',notlar:''}
];
const denemeSinavlari=[
 {id:'d1',ad:'2. Deneme Sınavı',tarih:'2026-10-14',oturumTuru:'İki Oturum',sozelBaslama:'09:40',sozelSuresiDk:75,sozelBitis:'10:55',araSureDk:20,sayisalBaslama:'11:15',sayisalSuresiDk:75,sayisalBitis:'12:30',baslamaSaati:'09:40',bitisSaati:'12:30',sinavSuresiDk:'',sinflar:'8-A',notlar:'Kitapçıklar sınav öncesi dağıtılacak.'},
 {id:'d2',ad:'3. Deneme Sınavı',tarih:'2026-10-21',oturumTuru:'Tek Oturum',baslamaSaati:'10:00',bitisSaati:'11:20',sinavSuresiDk:80,sinflar:'8-A',notlar:''},
 {id:'d3',ad:'1. Deneme Sınavı',tarih:'2026-10-07',oturumTuru:'Tek Oturum',baslamaSaati:'10:00',bitisSaati:'11:20',sinavSuresiDk:80,sinflar:'8-A',notlar:''}
];
const yoklama=[
 {id:'c0_2026-10-14',sinifId:'c0',tarih:'2026-10-14',kayitlar:{v0:'var',v1:'yok',v2:'var',v3:'gec',v4:'var',v5:'izinli',v6:'var'},girenAdi:'Okul Yöneticisi'},
 {id:'c2_2026-10-14',sinifId:'c2',tarih:'2026-10-14',kayitlar:{v12:'var',v13:'var',v14:'yok',v15:'var',v16:'var'},girenAdi:'Okul Yöneticisi'},
 {id:'c4_2026-10-14',sinifId:'c4',tarih:'2026-10-14',kayitlar:{v24:'var',v25:'var',v26:'var',v27:'gec',v28:'var'},girenAdi:'Okul Yöneticisi'}
];
const hatirlaticilar=[
 {id:'h1',baslik:'Veli toplantısı hazırlığı',tarih:'2026-10-14',oncelik:'Yüksek',aciklama:'Sunum ve imza listesi hazırlanacak.',tamamlandi:false,sahipUid:'u1'},
 {id:'h2',baslik:'Zümre toplantısı',tarih:'2026-10-20',oncelik:'Orta',aciklama:'',tamamlandi:false,sahipUid:'u1'}
];
const gorevler=[
 {id:'g1',baslik:'Dönem planlarını topla',sonTarih:'2026-10-16',durum:'devam ediyor',aciklama:'',sahipUid:'u1'},
 {id:'g2',baslik:'Servis listesini güncelle',sonTarih:'2026-10-12',durum:'yapilacak',aciklama:'',sahipUid:'u1'},
 {id:'g3',baslik:'Kitap okuma haftası planı',sonTarih:'2026-10-14',durum:'yapilacak',aciklama:'',sahipUid:'u1'}
];
const notlar=[
 {id:'n1',baslik:'Veli toplantısı gündemi',tip:'metin',renk:'sari',tarih:'2026-10-13',icerik:'<p>Dönem başı bilgilendirme, devamsızlık ve sınav takvimi.</p>',etiketler:['toplantı'],sahipUid:'u1'},
 {id:'n2',baslik:'Bu hafta yapılacaklar',tip:'todo',renk:'yesil',tarih:'2026-10-14',maddeler:[{metin:'Yazılı sınav kâğıtlarını çoğalt',tamamlandi:true},{metin:'Nöbet değişimini bildir',tamamlandi:false},{metin:'Kulüp raporunu hazırla',tamamlandi:false}],etiketler:[],sahipUid:'u1'}
];
/* ---- Ödev Takip / Not Çizelgesi: 7-A sınıfı (c6) için kurgusal örnekler ---- */
const gbRoster=students.filter(s=>s.sinifId==='c6').map(s=>({id:'o_'+s.id,ad:s.ogrenciAdi,no:s.ogrenciNo}));
const gbCells=(cols,fn)=>{const h={};gbRoster.forEach((st,i)=>cols.forEach((c,j)=>{const v=fn(i,j);if(v!==null&&v!==undefined)h[st.id+'_'+c]=v}));return h};
const odevTakip=[
 {id:'odv1',ad:'7-A Türkçe Ödevleri',sinifId:'c6',sinifAdi:'7-A',sahipUid:'u1',olusturmaTarihi:'2026-10-06T09:00:00.000Z',ogrenciler:gbRoster,
  sutunlar:[{id:'s1',baslik:'1. Ünite Testi',ders:'Türkçe',tarih:'2026-10-08',aciklama:''},{id:'s2',baslik:'Kitap Özeti',ders:'Türkçe',tarih:'2026-10-12',aciklama:''},{id:'s3',baslik:'Paragraf Soruları',ders:'Türkçe',tarih:'2026-10-14',aciklama:''}],
  hucreler:gbCells(['s1','s2','s3'],(i,j)=>(i+j)%5===0?'−':((i*2+j)%7===0?null:'+'))},
 {id:'odv2',ad:'7-A Matematik Ödevleri',sinifId:'c6',sinifAdi:'7-A',sahipUid:'u1',olusturmaTarihi:'2026-10-05T09:00:00.000Z',ogrenciler:gbRoster,sutunlar:[],hucreler:{}}
];
const notCizelgesi=[
 {id:'nc1',ad:'7-A Ders İçi Performans',sinifId:'c6',sinifAdi:'7-A',hucreModu:'puan',sahipUid:'u1',olusturmaTarihi:'2026-10-06T09:00:00.000Z',ogrenciler:gbRoster,
  sutunlar:[{id:'p1',baslik:'Etkinlik 1',tarih:'2026-10-07'},{id:'p2',baslik:'Etkinlik 2',tarih:'2026-10-13'},{id:'p3',baslik:'Proje',tarih:'2026-10-14'}],
  hucreler:gbCells(['p1','p2','p3'],(i,j)=>[70,85,90,60,95,80,75][(i+j*3)%7])},
 {id:'nc2',ad:'7-A Derse Katılım',sinifId:'c6',sinifAdi:'7-A',hucreModu:'artiEksi',sahipUid:'u1',olusturmaTarihi:'2026-10-05T09:00:00.000Z',ogrenciler:gbRoster,sutunlar:[{id:'k1',baslik:'Hafta 1',tarih:'2026-10-02'},{id:'k2',baslik:'Hafta 2',tarih:'2026-10-09'}],hucreler:gbCells(['k1','k2'],(i,j)=>(i+j)%3===0?'eksi':'arti')}
];
/* ---- Kurul ve Komisyonlar: kurgusal örnek kayıtlar (öğretmen kimlikleri yukarıdaki listeden) ---- */
const kurulKomisyonlar=[
 {id:'kk1',ad:'Satın Alma Komisyonu',kategori:'Satın Alma ve Mali İşler',tur:'Komisyon',egitimOgretimYili:'2026-2027',baskanId:'t01',
  asilUyeler:[{tur:'ogretmen',id:'t02',sira:1},{tur:'ogretmen',id:'t04',sira:2},{tur:'ogretmen',id:'t06',sira:3}],yedekUyeler:[{tur:'ogretmen',id:'t05',sira:1}],
  gorevler:[{id:'1',metin:'İhtiyaç ve teknik şartları ilgili birimle netleştirmek',sira:1},{id:'2',metin:'Piyasa araştırması ve teklifleri toplamak',sira:2}],
  belgeTurleri:['Toplantı tutanağı / karar','İmza çizelgesi'],belgeler:[],mevzuatDayanaklari:'',
  notlar:[{id:'n1',baslik:'İlk toplantı',icerik:'Ekim ayı ihtiyaç listesi görüşüldü.',tarih:'2026-10-12'}],
  isler:[{id:'i1',baslik:'Teklifleri topla',icerik:'',sonTarih:'2026-10-20',tamamlandi:false},{id:'i2',baslik:'Karşılaştırma tutanağı',icerik:'',sonTarih:'2026-10-25',tamamlandi:true}]},
 {id:'kk2',ad:'Öğretmenler Kurulu',kategori:'Eğitim-Öğretim',tur:'Kurul',egitimOgretimYili:'2026-2027',baskanId:'t03',
  asilUyeler:[{tur:'ogretmen',id:'t01',sira:1},{tur:'ogretmen',id:'t02',sira:2},{tur:'ogretmen',id:'t05',sira:3},{tur:'ogretmen',id:'t07',sira:4}],yedekUyeler:[],
  gorevler:[],belgeTurleri:[],belgeler:[],mevzuatDayanaklari:'',notlar:[],isler:[]}
];
window.__GUIDE_SEED_MORE__=function(){
  const d=duty();
  const dersListesi=['Matematik','Türkçe','Fen Bilimleri','Sosyal Bilgiler','İngilizce','Beden Eğitimi','Görsel Sanatlar','Din Kültürü','Bilişim Teknolojileri','Hayat Bilgisi','Oyun ve Fiziki Etkinlikler'].map((ad,i)=>({id:'l'+i,ad}));
  return{dersListesi,dersProgrami:schedule(),dersSaatleri:[{id:'ayarlar',donemler:times}],nobetYerleri:d.places,nobetAtamalari:d.rows,evrak,duyurular,sinavlar,denemeSinavlari,yoklama,hatirlaticilar,gorevler,notlar,odevTakip,notCizelgesi,kurulKomisyonlar,depolamaAyarlari:[{id:'ayarlar',mesaj:{MB:100,aktif:true},duyuru:{MB:100,aktif:true},dokuman:{MB:100,aktif:true},takvim:{MB:100,aktif:true}}]};
};
window.__GUIDE_SEED__=function(extra){
  const o={ogretmenler:teachers,siniflar:classes,veliler:students,bransListesi:[...new Set(teachers.map(t=>t.brans))].map((b,i)=>({id:'x'+i,ad:b}))};
  Object.assign(o,window.__GUIDE_SEED_MORE__?window.__GUIDE_SEED_MORE__(teachers,classes,students):{},extra||{});
  window.AppStore.setDataMany?window.AppStore.setDataMany(o):Object.entries(o).forEach(([k,v])=>window.AppStore.setData(k,v));
  return Object.keys(o).length;
};
})();
