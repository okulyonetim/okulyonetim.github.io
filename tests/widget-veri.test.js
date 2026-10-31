/* Android widget veri sözleşmesi: uygulama tarafı (widget-adapter.js) native widget'lara hangi JSON'u gönderir.
 * Native taraf (DersZiliHesaplayici/WidgetCizici) bu biçime güvenir — alan adları/biçimi burada sabitlenir. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const tam=fs.readFileSync('js/core/platform/widget-adapter.js','utf8');
const src=tam.slice(0,tam.indexOf('})(window);')+'})(window);'.length); /* yalnız widget adaptörü IIFE'si */

function kur(veri,{bugun='2026-10-30T11:48:00'}={}){
  const cagrilar=[],dinleyiciler={};
  const RealDate=Date,sabit=new RealDate(bugun).getTime();
  class FakeDate extends RealDate{constructor(...a){if(a.length)super(...a);else super(sabit)}static now(){return sabit}}
  const win={Date:FakeDate,console,setTimeout:()=>0,clearTimeout:()=>{},addEventListener:(t,f)=>{dinleyiciler[t]=f},
    document:{readyState:'complete',addEventListener(){}},
    Capacitor:{isNativePlatform:()=>true,Plugins:{WidgetPlugin:{
      dersZiliGuncelle:async x=>{cagrilar.push(['zil',JSON.parse(x.veriJson)])},
      okulVerisiGuncelle:async x=>{cagrilar.push(['okul',x])}}}},
    AppStore:{data:t=>veri[t]||[],get:k=>k==='session.ready'?true:undefined,subscribe(){return()=>{}}},
    AKTIF_KULLANICI:{uid:'u1',bagliOgretmenId:'t1'}};
  win.window=win;
  vm.runInNewContext(src,win);
  return{win,cagrilar,dinleyiciler};
}
const veri={
  dersSaatleri:[{id:'ayarlar',dersler:[{saat:1,baslangic:'09:00',bitis:'09:40'},{saat:2,baslangic:'09:50',bitis:'10:30'}]}],
  dersProgrami:[
    {gun:'Cuma',saat:2,ders:'Fizik',sinif:'8-B',ogretmenId:'t1'},{gun:'Cuma',saat:1,ders:'Fizik',sinif:'6-A',ogretmenId:'t1'},
    {gun:'Cuma',saat:1,ders:'Fen',sinif:'7-C',ogretmenId:'baskasi'}],
  nobetAtamalari:[{tarih:'2026-10-30',ogretmenId:'t1',yerId:'y1'},{tarih:'2026-10-30',ogretmenId:'t2',yerId:'y2'},{tarih:'2026-10-20',ogretmenId:'t1',yerId:'y1'}],
  nobetYerleri:[{id:'y1',ad:'Zemin kat'},{id:'y2',ad:'Bahçe'}],
  ogretmenler:[{id:'t2',ad:'Ayşe',soyad:'Kaya'}],
  hatirlaticilar:[{baslik:'Kurul',tarih:'2026-10-30',saat:'14:30'},{baslik:'Geçmiş',tarih:'2026-10-01'},{baslik:'Bitti',tarih:'2026-10-31',tamamlandi:true}],
  gorevler:[{baslik:'Rapor',sorumluOgretmenIdler:['t1'],durum:'bekliyor',sonTarih:'2026-11-02'},{baslik:'Başkası',sorumluOgretmenIdler:['t9'],sonTarih:'2026-11-02'}],
  duyurular:[{baslik:'Toplantı',tarih:'2026-10-29'},{baslik:'Arşiv',tarih:'2026-10-28',arsivlendi:true}],
  notlar:[{baslik:'Not 1',eklenmeTarihi:'2026-10-12T10:00:00Z',sahipUid:'u1'},{baslik:'Başkasının',sahipUid:'x'}],
  haberler:[{baslik:'Haber A',tarih:'2026-10-31'}],
  yemekMenuleri:[{id:'2026-10',menu:{30:{items:['Mercimek','Pilav',' ']},31:{items:[]}}}]
};

(async()=>{
  const {win,cagrilar,dinleyiciler}=kur(veri);
  assert.strictEqual(await win.KorukWidgetAdapter.update(),true);
  const zil=cagrilar.find(c=>c[0]==='zil')[1],okul=cagrilar.find(c=>c[0]==='okul')[1];

  /* zil + program + nöbet (ham) */
  assert.deepStrictEqual(zil.segmentler,[{saat:1,bas:'09:00',bit:'09:40'},{saat:2,bas:'09:50',bit:'10:30'}],'zil saatleri saat/bas/bit olarak gitmeli');
  assert.deepStrictEqual(zil.hafta.Cuma.map(x=>[x.saat,x.sinif]),[[1,'6-A'],[2,'8-B']],'yalnız kendi programı, saate göre sıralı');
  assert.deepStrictEqual(zil.nobet,[{tarih:'2026-10-30',yer:'Zemin kat'}],'geçmiş ve başkasının nöbeti gitmemeli');

  /* Okul Akışı */
  const akis=JSON.parse(okul.akisJson);
  assert.strictEqual(akis[0].tur,'nobet');assert.match(akis[0].alt,/Ayşe Kaya \(Bahçe\)/,'bugünkü nöbetçiler akışın başında');
  const turler=akis.map(a=>a.tur);
  assert(turler.includes('hatirlatici')&&turler.includes('gorev')&&turler.includes('duyuru')&&turler.includes('not')&&turler.includes('haber'),'beş tür de akışta olmalı');
  assert(!akis.some(a=>a.baslik==='Geçmiş'||a.baslik==='Bitti'||a.baslik==='Başkası'||a.baslik==='Arşiv'||a.baslik==='Başkasının'),'geçmiş/tamamlanmış/başkasının/arşiv kayıtları akışa girmemeli');
  const h=akis.find(a=>a.tur==='hatirlatici');assert.strictEqual(h.alt,'Bugün · 14:30');assert.strictEqual(h.sayfa,'calendar');
  assert.strictEqual(akis.find(a=>a.tur==='duyuru').sayfa,'announcements');
  assert.strictEqual(akis.find(a=>a.tur==='not').sayfa,'notes');
  assert.strictEqual(akis.find(a=>a.tur==='haber').sayfa,'news');
  assert(akis.every(a=>a.baslik&&a.sayfa&&!('_t' in a)),'her satırda başlık+sayfa olmalı, iç alanlar sızmamalı');

  /* ortak veri: etkinlik, yemek */
  const et=JSON.parse(okul.etkinlikJson);
  assert.deepStrictEqual(et['2026-10-30'],[{saat:'14:30',baslik:'Kurul'}]);
  assert(!et['2026-10-01']&&!et['2026-10-31'],'geçmiş ve tamamlanan hatırlatma etkinliğe girmemeli');
  const ye=JSON.parse(okul.yemekJson);
  assert.deepStrictEqual(ye['2026-10-30'],['Mercimek','Pilav'],'boş öğeler atılmalı');
  assert(!('2026-10-31' in ye),'menüsü boş gün haritada olmamalı');
  assert('havaIkon' in okul&&'havaSicaklik' in okul&&'havaAciklama' in okul&&'okul' in okul);

  /* tatil modu: ham veri tatil bilgisi taşır, akış tatil satırı gösterir */
  const t=kur({...veri,dersSaatleri:[{id:'ayarlar',tatilModu:true,okulAcilisTarihi:'2026-11-23',tatilModuNotu:'Ara tatil',dersler:[]}]});
  await t.win.KorukWidgetAdapter.update();
  const tz=t.cagrilar.find(c=>c[0]==='zil')[1];assert.strictEqual(tz.tatilModu,true);assert.strictEqual(tz.okulAcilisTarihi,'2026-11-23');
  assert.strictEqual(JSON.parse(t.cagrilar.find(c=>c[0]==='okul')[1].akisJson)[0].tur,'tatil');

  /* yönetici (öğretmen bağlantısı yok): program/nöbet boş, widget yine çalışır */
  const y=kur(veri);y.win.AKTIF_KULLANICI={uid:'a1',admin:true};
  await y.win.KorukWidgetAdapter.update();
  const yz=y.cagrilar.find(c=>c[0]==='zil')[1];assert.deepStrictEqual(yz.hafta,{});assert.deepStrictEqual(yz.nobet,[]);

  /* widget dokunuşu: widgetSayfaAc olayı araç sayfasını (openTab 'tool:<id>') açar; bilinmeyen sayfa açılmaz */
  const acilan=[];win.ShellUI={openTab:key=>acilan.push(key)};
  dinleyiciler.widgetSayfaAc({detail:{page:'duty'}});dinleyiciler.widgetSayfaAc({detail:{page:'calendar'}});dinleyiciler.widgetSayfaAc({detail:{page:'../hack'}});
  assert.deepStrictEqual(acilan,['tool:duty','tool:calendar']);
  console.log('Widget veri sözleşmesi başarılı.');
})().catch(e=>{console.error(e);process.exit(1)});
