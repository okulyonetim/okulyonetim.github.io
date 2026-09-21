const fs=require('fs');
const src=fs.readFileSync('js/modules/tools.js','utf8');

if(!src.includes("const teacherRows=()=>{const merged=new Map();for(const row of [...arr('ogretmenler'),...(global.DeviceData?.list?.('ogretmenler')||[])])")){
  throw new Error('Kontrol listesi öğretmen kaynağı AppStore + DeviceData birleşimini kullanmalı.');
}
if(!src.includes("function teacherName(id,fallback='')")){
  throw new Error('Silinmiş öğretmen için kayıtlı ad geri dönüşü bulunmalı.');
}
if(!src.includes("teacherName(id,snapshots[String(id)]||'')")){
  throw new Error('Özel hedef öğretmenlerinde saklanan ad anlık öğretmen kaydı yoksa kullanılmalı.');
}
if(!src.includes("function recordTeacherName(row,id)")){
  throw new Error('Bağlı evrak kayıtlarındaki tarihsel öğretmen adı desteklenmeli.');
}
if(!src.includes("const hedefIds=bagliTip?[]:fd.getAll('hedefOgretmenIdler').map(String),hedefOgretmenAdlari=Object.fromEntries")){
  throw new Error('Yeni kontrol listesi hedeflerinde öğretmen adı snapshotı saklanmalı.');
}
if(!src.includes("teacherRows().slice().sort((a,b)=>teacherName(a.id).localeCompare(teacherName(b.id),'tr'))")){
  throw new Error('Öğretmen seçim listesi birleşik kaynaktan üretilmeli.');
}

if(!src.includes("if(typeof SyncEngine.pull==='function')await SyncEngine.pull(hydrated)")){
  throw new Error('Kontrol listeleri açılırken öğretmen ve bağlı evrak kaynakları güncel remote snapshot ile yenilenmeli.');
}
console.log('Kontrol listesi öğretmen kaynağı + remote refresh + silinmiş öğretmen adı regresyon testi başarılı.');
