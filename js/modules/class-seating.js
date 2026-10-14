/* Koruk Asistan — Sınıf Oturma Planı (köprü)
 * Editör: js/modules/class-seating-grid.js (ClassSeatingGrid, hücre ızgarası motoru).
 * Bu dosya yalnızca sınıfı, öğrencileri, yetkiyi ve kaydı bağlar; açık arayüz eskisiyle aynıdır:
 *   SinifOturma.ac(sinifId) · SinifOturma.kapat() · SinifOturma.serialize()
 * Kalıcı yazma: SinifOturmaService -> Repository -> DeviceData (yerel öncelikli). PDF / yazdırma: tek ReportEngine.
 */
(function(global){
'use strict';
if(global.SinifOturma)return;

const ENGINE='js/modules/class-seating-grid.js?v=2';
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};

let classId='';
let opening=false;

const currentClass=()=>arr('siniflar').find(x=>x.id===classId)||null;
const activeUser=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const activeTeacherId=()=>{const u=activeUser();return u.bagliOgretmenId||u.ogretmenId||''};
const isTeacherUser=()=>activeUser().admin!==true&&!!activeTeacherId();
const ownClass=()=>!!activeTeacherId()&&currentClass()?.sinifOgretmeniId===activeTeacherId();
const students=()=>arr('veliler')
  .filter(v=>v.sinifId===classId)
  .slice()
  .sort((a,b)=>(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));
const teacherName=()=>{
  const s=currentClass();
  const t=arr('ogretmenler').find(o=>o.id===s?.sinifOgretmeniId);
  return t?[t.ad,t.soyad].filter(Boolean).join(' '):'';
};
const canEdit=()=>isTeacherUser()?ownClass():(activeUser().admin===true||!global.PermissionService
  ||global.PermissionService.can('transport.classSeating.edit','edit')
  ||global.PermissionService.can('people.classes','edit'));

function schoolYear(){
  const d=new Date(),y=d.getFullYear();
  return d.getMonth()>=8?`${y} - ${y+1}`:`${y-1} - ${y}`;
}
function reportTitle(name){
  return `${schoolYear()} EĞİTİM ÖĞRETİM YILI ${(name||'').toLocaleUpperCase('tr')} SINIFI OTURMA DÜZENİ`;
}

async function ensureEngine(){
  if(!global.ClassSeatingGrid?.open)await global.AppLoader?.loadScript?.(ENGINE);
  if(!global.ClassSeatingGrid?.open)throw new Error('Sınıf oturma motoru yüklenemedi.');
}
async function printPlan(o){
  if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');
  if(!global.ReportEngine?.printReport){global.toast?.('Rapor motoru hazır değil.');return}
  return global.ReportEngine.printReport(o.title,o.body,{
    fileName:o.fileName,
    yon:o.yon==='yatay'?'yatay':'dikey',
    baslikGoster:false,
    logoGoster:false,
    tarihGoster:false,
    kenarBosluk:5,
    fontSize:8,
    extraHead:o.extraHead
  });
}

async function open(id){
  if(opening)return false;
  opening=true;
  try{
    classId=id;
    const s=currentClass();
    if(!s)throw new Error('Sınıf bulunamadı.');
    const className=s.ad||'';
    await ensureEngine();
    if(global.SyncEngine&&global.COL?.sinifOturma){
      global.SyncEngine.register('sinifOturma',global.COL.sinifOturma);
      await global.SyncEngine.localHydrate(['sinifOturma']);
    }
    let plan=null;
    try{
      const doc=await global.SinifOturmaService.planGetir(id);
      if(doc?.exists)plan=doc.data();
    }catch(e){console.warn('[ClassSeating/load]',e)}
    const editable=canEdit();
    global.ClassSeatingGrid.open({
      plan,
      className,
      teacher:teacherName(),
      title:reportTitle(className),
      fileName:`${className||'Sinif'}_Oturma_Plani`,
      editable,
      students:students().map(v=>({id:v.id,name:v.ogrenciAdi||'',no:v.ogrenciNo||'',gender:v.cinsiyet||''})),
      onSave:async payload=>{
        if(!canEdit())throw new Error('Bu sınıfın oturma planını düzenleme yetkiniz yok.');
        await global.SinifOturmaService.planKaydet(id,payload);
        global.SyncEngine?.schedule?.(0);
      },
      print:printPlan
    });
    return true;
  }finally{opening=false}
}

global.SinifOturma={
  ac:open,
  kapat:()=>global.ClassSeatingGrid?.requestClose?.()??false,
  serialize:()=>global.ClassSeatingGrid?.serialize?.()||null,
  acikMi:()=>!!global.ClassSeatingGrid?.isOpen?.()
};
})(window);
