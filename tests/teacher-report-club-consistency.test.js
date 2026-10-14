// Öğretmen raporu ↔ profil tutarlılığı: raporda öğretmene profilinden FAZLA sosyal kulüp çıkmamalı.
// Sorun: rapor, kulüpleri öğretmen kimliğine (ogretmenIdler) ek olarak ISIM alanlarıyla da eşleştiriyordu (ogretmen / ogretmenler / …)
// ve artık kalan eski ogretmenId alanı da sayılıyordu; böylece öğretmenin gerçek kulübüne başka kulüpler eklenebiliyordu.
// Kural (tek yerde): kulüpte ogretmenIdler dizisi varsa YALNIZ o dizi geçerlidir; dizi yoksa eski tek-öğretmen alanlarına bakılır.
const fs=require('fs'),assert=require('assert');
const classic=fs.readFileSync('js/modules/people-classic-ui.js','utf8');
const parity=fs.readFileSync('js/modules/classic-parity.js','utf8');
const imp=fs.readFileSync('js/modules/people-import.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

const line=(src,start)=>{const l=src.split('\n').find(x=>x.startsWith(start));assert(l,start+' bulunamadı.');return l};
const code=[
  line(classic,'function clubBelongsTo('),
  line(classic,'function relatedRows('),
  line(classic,'function teacherClub('),
  line(classic,'function reportRelated(')
].join('\n');

function run(clubs,other={}){
  const factory=new Function('arr','norm','fullName',code+'\nreturn{relatedRows,reportRelated,teacherClub,clubBelongsTo};');
  const norm=v=>String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g,'');
  const store={sosyalKulupler:clubs,...other};
  return factory(t=>store[t]||[],norm,o=>`${o.ad} ${o.soyad}`.trim());
}
const names=rows=>rows.map(x=>x.ad);
const miyase={id:'o2',ad:'Miyase',soyad:'Gürtürk'};

// 1) İsim alanlı kulüpler kimlik eşleşmesi olmadan öğretmene eklenmez (raporun fazladan kulüp göstermesinin asıl nedeni)
{
  const api=run([
    {id:'k1',ad:'TARİH VE KÜLTÜREL MİRAS KULÜBÜ',ogretmenIdler:['o2']},
    {id:'k2',ad:'SİBERAY KULÜBÜ',ogretmenIdler:['o3'],ogretmen:'Miyase Gürtürk'},
    {id:'k3',ad:'SATRANÇ KULÜBÜ',ogretmenIdler:['o4'],ogretmenler:['Miyase Gürtürk']},
    {id:'k4',ad:'FOTOĞRAF KULÜBÜ',ogretmenIdler:['o5'],danisman:'Miyase Gürtürk',gorevliOgretmen:'Miyase Gürtürk'}
  ]);
  assert.deepStrictEqual(names(api.reportRelated('sosyalKulupler',miyase)),['TARİH VE KÜLTÜREL MİRAS KULÜBÜ'],'Rapor yalnız ogretmenIdler ile eşleşen kulüpleri içermeli.');
  assert.deepStrictEqual(names(api.relatedRows('sosyalKulupler','o2')),['TARİH VE KÜLTÜREL MİRAS KULÜBÜ'],'Profil kulüp listesi aynı kuralı kullanmalı.');
}

// 2) Dizi varken artık kalan eski ogretmenId sayılmaz; dizi yokken eski alan hâlâ çalışır
{
  const api=run([
    {id:'k1',ad:'YENİ',ogretmenIdler:['o2']},
    {id:'k2',ad:'ARTIK ALAN',ogretmenIdler:['o3'],ogretmenId:'o2'},
    {id:'k3',ad:'BOŞ DİZİ',ogretmenIdler:[],ogretmenId:'o2'},
    {id:'k4',ad:'ESKİ TEK ALAN',ogretmenId:'o2'},
    {id:'k5',ad:'ESKİ DANIŞMAN ALANI',danismanOgretmenId:'o2'},
    {id:'k6',ad:'BAŞKASININ',ogretmenId:'o9'}
  ]);
  assert.deepStrictEqual(names(api.reportRelated('sosyalKulupler',miyase)),['YENİ','ESKİ TEK ALAN','ESKİ DANIŞMAN ALANI']);
  assert.strictEqual(api.teacherClub('o2').ad,'YENİ','Öğretmen kartındaki kulüp ile rapor aynı kümeden gelmeli.');
  assert.strictEqual(api.teacherClub('o9').ad,'BAŞKASININ');
  assert.strictEqual(api.teacherClub('yok'),null);
}

// 3) Rapor ile profil HER ZAMAN aynı kümeyi görür (kulüp için)
{
  const clubs=[{id:'a',ad:'A',ogretmenIdler:['o2','o3']},{id:'b',ad:'B',ogretmenIdler:['o3'],ogretmen:'Miyase Gürtürk'},{id:'c',ad:'C',ogretmenId:'o2'}];
  const api=run(clubs);
  assert.deepStrictEqual(names(api.reportRelated('sosyalKulupler',miyase)),names(api.relatedRows('sosyalKulupler','o2')));
  assert.deepStrictEqual(names(api.reportRelated('sosyalKulupler',{id:'o3',ad:'Veysel',soyad:'Gül'})),['A','B']);
}

// 4) Kulüp dışındaki türler de YALNIZ kimlikle eşleşir: eski isim metni (danisman / ogretmen …) başka öğretmene atanmış kaydı getirmez
{
  const api=run([],{rehberlik:[
    {id:'r1',sinif:'8-A',ogretmenId:'o2'},
    {id:'r2',sinif:'2-A',ogretmenId:'o7',danisman:'Miyase Gürtürk'},
    {id:'r3',sinif:'5-A',danisman:'Miyase Gürtürk'},
    {id:'r4',sinif:'6-A',ogretmenIdler:['o2','o3']},
    {id:'r5',sinif:'7-A',ogretmenId:'o7'}
  ],bepPlani:[{id:'b1',ogretmenId:'o7',ad:'SEDAT KARAGÖZ',ogretmenler:['Miyase Gürtürk']},{id:'b2',sinif:'5-A',ders:'Matematik',ogretmenId:'o2'}]});
  assert.deepStrictEqual(api.reportRelated('rehberlik',miyase).map(x=>x.id),['r1','r4'],'Rehberlik yalnız kimlikle bağlı kayıtlardan gelmeli; başka öğretmene atanmış 2-A eski danışman metniyle gelmemeli.');
  assert.deepStrictEqual(api.reportRelated('bepPlani',miyase).map(x=>x.id),['b2'],'Diğer belge türlerinde de eski isim alanları eşleştirmeye girmemeli.');
  for(const t of ['rehberlik','bepPlani'])assert.deepStrictEqual(api.reportRelated(t,miyase).map(x=>x.id),api.relatedRows(t,'o2').map(x=>x.id),'Rapor ile profil aynı kümeyi görmeli: '+t);
}

// 5) Kaynak sözleşmesi: üç modül aynı kulüp kuralını kullanır, rapor kulüpte isim eşleştirmesi yapmaz
assert(/function reportRelated\(type,o\)\{return relatedRows\(type,o\.id\)\}/.test(classic),'reportRelated her türde yalnız relatedRows (kimlik) kullanmalı.');
for(const [name,src] of [['classic-parity.js',parity],['people-import.js',imp]]){
  assert(/function teacherRows\(type,id\)\{if\(type==='sosyalKulupler'\)return arr\(type\)\.filter\(x=>Array\.isArray\(x\.ogretmenIdler\)\?x\.ogretmenIdler\.includes\(id\):/.test(src),`${name}: teacherRows kulüp için dizi-öncelikli kuralı kullanmalı.`);
}
const cacheVer=Number(sw.match(/const CACHE_ADI='oy-cache-v(\d+)'/)?.[1]||0);
assert(cacheVer>=1289,'Service Worker cache sürümü bu düzeltmeden geri kalmamalı.');
console.log('Öğretmen raporu ↔ profil sosyal kulüp tutarlılığı başarılı.');
