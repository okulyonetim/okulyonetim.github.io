/* Yıllık plan ekranları: hub → sınıf → ders sayfalarının HTML'i (DOM'suz, sahte verilerle). */
const assert=require('assert'),fs=require('fs'),vm=require('vm'),zip=require('./helpers/zip');
const ctx={};ctx.window=ctx;vm.createContext(ctx);
/* Saat sabitlenir: 24 Ekim 2026 (plan satırlarında 19–25 Ekim haftası) */
ctx.Date=class extends Date{constructor(...a){a.length?super(...a):super(2026,9,24,10,0,0)}static now(){return new Date().getTime()}};
['yillik-plan-core','yillik-plan-word','yillik-plan-excel','yillik-plan-dialog','yillik-plan-ui'].forEach(f=>vm.runInContext(fs.readFileSync(`js/modules/${f}.js`,'utf8'),ctx,{filename:f}));
const C=ctx.YillikPlanCore,J=x=>JSON.parse(JSON.stringify(x));

const docx=zip.oku(fs.readFileSync('tests/fixtures/5-sinif-sosyal-bilgiler-yillik-plan-2026-2027.docx'));
const parsed=C.docxAyristir(docx['word/document.xml'].toString('utf8'));
const idMap={};parsed.basliklar.forEach((b,i)=>idMap[b.anahtar]='h'+i);
const sosyal={id:'p5sb',...J(C.kayitHazirla(parsed,idMap))};
const havuz=J(parsed.basliklar).map((b,i)=>({id:'h'+i,ad:b.ad,sira:i}));
const secmeli={id:'p5ok',dersAdi:'Okuma Becerileri',seviye:5,egitimOgretimYili:'2026-2027',grup:'secmeli',yayin:'MEB Yayınları',sutunlar:['h0'],baslikGruplari:{},satirlar:[{no:1,hafta:'1. hafta',baslangic:'2026-09-14',bitis:'2026-09-20',tarih:'14-20 Eylül',saat:'2 saat',degerler:{h0:'Okuma kültürü'}}]};
const eski={id:'p6mat',dersAdi:'Matematik',seviye:6,egitimOgretimYili:'2026-2027',sutunlar:['h0','h2'],satirlar:[{ay:'EYLÜL',hafta:'1.HAFTA(14-20)',saat:'5',degerler:{h0:'Doğal sayılar',h2:'M.6.1.1.1. Doğal sayıları okur.'}},{ay:'EKİM',hafta:'6.HAFTA(19-25)',saat:'5',degerler:{h0:'Kesirler',h2:'M.6.1.2.1. Kesri gösterir.'}}]};
const veri={yillikPlanTanimlari:[sosyal,secmeli,eski],yillikPlanBasliklari:havuz,
 okulBilgileri:[{id:'ayarlar',okulAdi:'Atatürk Ortaokulu',kademeler:['ilkokul','ortaokul'],mudurId:'t9'}],
 ogretmenler:[{id:'t9',ad:'Hasan',soyad:'Demir'},{id:'t1',ad:'Ali',soyad:'Veli'}],
 dersProgrami:[{ogretmenId:'t1',sinif:'5-A',ders:'Sosyal Bilgiler Dersi'}],ogretmenYillikPlanSecimleri:[],
 yillikPlanNotlari:[{id:'t1_p5sb',notlar:{3:'Harita çalışması yap'}}],belirliGunler:[]};
let yazar=true;
ctx.YillikPlanService={_yaziYetkisiVar:()=>yazar};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ui=ctx.YillikPlanUI.create({arr:t=>veri[t]||[],esc,norm:C.norm,modal:()=>({}),toast(){},today:()=>'2026-10-24',teacherId:()=>'t1',yenile(){},exceljs:()=>{},dersler:()=>[]});
const sayi=(html,re)=>(html.match(re)||[]).length;

/* ---- Hub ---- */
let h=ui.render().html;
assert(h.includes('2026-2027 Yıllık Planlar'),'Hub başlığı eğitim yılını taşımalı.');
assert(h.includes('İLKOKUL')&&h.includes('ORTAOKUL')&&!h.includes('LİSE'),'Hub yalnız okulun kademelerini göstermeli.');
assert(h.includes('data-yp-sinif="5"')&&/5\. Sınıf<\/b><span>2 ders<\/span>/.test(h),'5. sınıf kutusu ders sayısını göstermeli.');
assert(/6\. Sınıf<\/b><span>1 ders<\//.test(h)&&/1\. Sınıf<\/b><span>Plan yok<\//.test(h));
assert(h.includes('Planlarım')&&h.includes('5. Sınıf Sosyal Bilgiler'),'Ders programındaki ders Planlarım şeridine düşmeli.');
assert(/Bu hafta: /.test(h),'Planlarım kartı bu haftanın temasını göstermeli.');
assert(h.includes('data-yp-word')&&h.includes('data-yp-excel')&&h.includes('data-yp-menu'),'Yazma yetkisi olana içe aktarma düğmeleri görünmeli.');
assert(h.includes('data-yp-tum'),'Tüm sınıfları göster anahtarı olmalı.');
yazar=false;assert(!ui.render().html.includes('data-yp-word'),'Yetkisiz kullanıcı içe aktarma düğmesi görmemeli.');yazar=true;

/* ---- Sınıf sayfası ---- */
assert.strictEqual(ui.dersiAc('Olmayan Ders','5-B'),false,'Plan yoksa sınıf sayfasına düşmeli.');
let s=ui.render().html;
assert(s.includes('5. Sınıf Yıllık Planları')&&s.includes('2 ders'));
assert(s.includes('Zorunlu dersler')&&s.includes('Seçmeli dersler')&&!s.includes('İHO dersleri'),'Yalnız dolu gruplar başlık almalı.');
assert(s.includes('38 ders haftası · 6 ünite/tema'),'Ders kartı hafta ve ünite sayısını göstermeli.');
assert(s.includes('<em>MEB Yayınları</em>'),'Yayın rozeti yalnız yayın bilgisi olan planda görünmeli.');
assert.strictEqual(sayi(s,/<em>MEB Yayınları<\/em>/g),1);
assert(/data-yp-filtre="tumu"[^>]*>Tümü<span>2<\/span>/.test(s)&&/data-yp-filtre="zorunlu"[^>]*>Zorunlu<span>1<\/span>/.test(s)&&/data-yp-filtre="iho"[^>]*>İHO<span>0<\/span>/.test(s),'Süzgeç sayıları doğru olmalı.');
assert(s.includes('data-yp-sinif="8"')&&!s.includes('data-yp-sinif="9"'),'Alt sınıf düğmeleri okulun kademeleriyle sınırlı olmalı.');
assert(s.includes('placeholder="Ders ara…"'));
assert.strictEqual(ui.dersiAc('Yok','7-A'),false);assert(ui.render().html.includes('Bu sınıf için yıllık plan henüz eklenmemiş.'));

/* ---- Ders sayfası (yeni biçimli plan) ---- */
assert.strictEqual(ui.dersiAc('Sosyal Bilgiler','5-A'),true);
let d=ui.render().html;
assert(d.includes('5. Sınıf Sosyal Bilgiler Yıllık Planı 2026-2027'),'Ders başlığı sınıf, ders ve yılı taşımalı.');
assert(d.includes('Planda yazacak bilgiler')&&d.includes('Bilgilerimle doldur ve indir')&&d.includes('Boş şablonu indir'));
assert(d.includes('value="Atatürk Ortaokulu"')&&d.includes('value="Ali Veli"')&&d.includes('value="Hasan Demir"')&&d.includes('value="2026-10-24"'),'Bilgi alanları okul, öğretmen, müdür ve tarihle önerilmeli.');
assert(d.includes('Üniteler/temalar')&&sayi(d,/<li><span>\d+<\/span>/g)===6,'Ünite listesi 6 maddeli olmalı.');
assert(d.includes('Hafta hafta öğrenme çıktıları')&&d.includes('data-yp-buhafta'),'Bu hafta düğmesi görünmeli.');
assert.strictEqual(sayi(d,/ is-now/g),1,'Yalnız bugünün haftası vurgulanmalı.');
assert(d.includes('ARA TATİL')&&d.includes('YARIYIL TATİLİ')&&sayi(d,/ka-yp-row is-ozel/g)>=4,'Tatil satırları tek hücreli olmalı.');
assert(sayi(d,/ka-yp-tag/g)>5,'Belirli gün etiketleri satırlarda görünmeli.');
assert(sayi(d,/id="ypRow-\d+"/g)===41,'Tüm 41 satır çizilmeli.');
assert(d.includes('1. hafta')&&d.includes('14-20 Eylül'));
assert(d.includes('data-yp-satir-ekle')&&d.includes('data-yp-tanim'),'Yazma yetkisinde düzenleme eylemleri görünmeli.');
assert(d.includes('data-yp-takip="ekle"'),'Planlarıma ekle düğmesi görünmeli.');
assert(/<b>SB\.5\.\d+\.\d+\.<\/b>/.test(d),'Öğrenme çıktısı kodu kalın yazılmalı.');
yazar=false;const dy=ui.render().html;assert(!dy.includes('data-yp-satir-ekle')&&!dy.includes('data-yp-tanim')&&dy.includes('Boş şablonu indir'),'Yetkisiz kullanıcı yalnız görüntüler ve indirir.');yazar=true;

/* ---- Eski kayıt ---- */
assert.strictEqual(ui.dersiAc('Matematik','6-B'),true);
const e=ui.render().html;
assert(e.includes('6. Sınıf Matematik Yıllık Planı 2026-2027')&&e.includes('1. hafta')&&e.includes('6. hafta')&&e.includes('14-20 Eylül'),'Eski biçimli plan aynı ekranda okunmalı.');
assert(e.includes('Kesirler')&&e.includes('<b>M.6.1.2.1.</b>'));
assert.strictEqual(sayi(e,/ is-now/g),1,'Eski kayıtta da bu hafta bulunmalı (19-25 Ekim).');

/* ---- Geri ---- */
assert.strictEqual(ui.geri(),true);assert(ui.render().html.includes('6. Sınıf Yıllık Planları'));
assert.strictEqual(ui.geri(),true);assert(ui.render().html.includes('2026-2027 Yıllık Planlar'));
assert.strictEqual(ui.geri(),false,'Hub\'dan geri akademik kabuğa bırakılmalı.');

console.log('yillik-plan-ui ekran testleri geçti');
