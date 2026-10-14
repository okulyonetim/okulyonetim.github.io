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
window.__GUIDE_SEED_MORE__=function(){
  const d=duty();
  const dersListesi=['Matematik','Türkçe','Fen Bilimleri','Sosyal Bilgiler','İngilizce','Beden Eğitimi','Görsel Sanatlar','Din Kültürü','Bilişim Teknolojileri','Hayat Bilgisi','Oyun ve Fiziki Etkinlikler'].map((ad,i)=>({id:'l'+i,ad}));
  return{dersListesi,dersProgrami:schedule(),dersSaatleri:[{id:'ayarlar',donemler:times}],nobetYerleri:d.places,nobetAtamalari:d.rows,evrak,duyurular,depolamaAyarlari:[{id:'ayarlar',mesaj:{MB:100,aktif:true},duyuru:{MB:100,aktif:true},dokuman:{MB:100,aktif:true},takvim:{MB:100,aktif:true}}]};
};
window.__GUIDE_SEED__=function(extra){
  const o={ogretmenler:teachers,siniflar:classes,veliler:students,bransListesi:[...new Set(teachers.map(t=>t.brans))].map((b,i)=>({id:'x'+i,ad:b}))};
  Object.assign(o,window.__GUIDE_SEED_MORE__?window.__GUIDE_SEED_MORE__(teachers,classes,students):{},extra||{});
  window.AppStore.setDataMany?window.AppStore.setDataMany(o):Object.entries(o).forEach(([k,v])=>window.AppStore.setData(k,v));
  return Object.keys(o).length;
};
})();
