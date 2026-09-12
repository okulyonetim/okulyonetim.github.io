/* Okul Yönetim — Öğretmen silme yaşam döngüsü.
 * Mevcut öğretmen düzenleme modalına güvenli silme eylemi ekler.
 * Silme local-first ilerler; aktif atama ve kullanıcı bağlarını temizler,
 * tarihsel evrak/izin kayıtlarını korur.
 */
(function(global){
'use strict';
if(global.TeacherDeleteLifecycle)return;

const data=type=>{const rows=global.AppStore?.data?.(type);return Array.isArray(rows)?rows:[]};
const device=()=>global.DeviceData;
const fullName=t=>`${t?.ad||''} ${t?.soyad||''}`.trim()||'Öğretmen';

function canDelete(){
  return !global.PermissionService||global.PermissionService.can?.('people.teachers','edit')===true;
}
function collection(type){return global.COL?.[type]||''}
async function update(type,id,patch){
  if(!id||!collection(type)||!device()?.update)return;
  await device().update(type,collection(type),id,patch);
}
async function remove(type,id){
  if(!id||!collection(type)||!device()?.remove)return;
  await device().remove(type,collection(type),id);
}

async function clearClassAssignments(id){
  for(const row of data('siniflar').filter(x=>x.sinifOgretmeniId===id)){
    await update('siniflar',row.id,{sinifOgretmeniId:null});
  }
}
async function removeOwnedAssignments(id){
  for(const type of ['dersProgrami','nobetAtamalari','ogretmenYillikPlanSecimleri']){
    for(const row of data(type).filter(x=>x.ogretmenId===id))await remove(type,row.id);
  }
}
async function clearSharedReferences(id){
  const shared=['sosyalKulupler','belirliGunler'];
  for(const type of shared){
    for(const row of data(type)){
      let changed=false;
      const patch={};
      if(Array.isArray(row.ogretmenIdler)&&row.ogretmenIdler.includes(id)){
        patch.ogretmenIdler=row.ogretmenIdler.filter(x=>x!==id);changed=true;
      }
      if(row.ogretmenId===id){patch.ogretmenId=null;changed=true;}
      if(row.danismanOgretmenId===id){patch.danismanOgretmenId=null;changed=true;}
      if(changed)await update(type,row.id,patch);
    }
  }
}
async function clearUserBindings(id){
  for(const row of data('kullanicilar')){
    if(row.bagliOgretmenId!==id&&row.ogretmenId!==id)continue;
    const patch={};
    if(row.bagliOgretmenId===id)patch.bagliOgretmenId=null;
    if(row.ogretmenId===id)patch.ogretmenId=null;
    await update('kullanicilar',row.id,patch);
  }
}
async function deleteTeacher(id){
  if(!id)throw new Error('Öğretmen kaydı bulunamadı.');
  if(!canDelete())throw new Error('Bu işlem için yetkiniz yok.');
  const teacher=data('ogretmenler').find(x=>x.id===id);
  if(!teacher)throw new Error('Öğretmen kaydı bulunamadı.');
  if(!global.confirm?.(`“${fullName(teacher)}” adlı öğretmen silinsin mi?\n\nDers programı, nöbet, sınıf öğretmenliği ve kullanıcı bağlantıları temizlenecek. Tarihsel evrak ve izin kayıtları korunacak.`))return false;

  // Öğretmen kaydı en son silinir. Böylece bağımlılık temizliğinde hata oluşursa
  // ana kayıt yerinde kalır ve yarım silinmiş bir öğretmen oluşmaz.
  await clearClassAssignments(id);
  await removeOwnedAssignments(id);
  await clearSharedReferences(id);
  await clearUserBindings(id);
  if(global.OgretmenRepository?.sil)await global.OgretmenRepository.sil(id);
  else await remove('ogretmenler',id);
  return true;
}

function teacherIdFromModal(modal){
  return String(modal?.querySelector('#teacherForm input[name="id"]')?.value||'').trim();
}
function ensureDeleteButton(modal){
  if(!modal||modal.dataset.teacherDeleteReady==='1')return;
  modal.dataset.teacherDeleteReady='1';
  const id=teacherIdFromModal(modal),footer=modal.querySelector('.ka-modal__footer');
  if(!id||!footer||!canDelete())return;
  const cancel=footer.querySelector('[data-teacher-modal-close]');
  const button=document.createElement('button');
  button.type='button';
  button.dataset.teacherDelete='';
  button.className='ka-btn';
  button.textContent='Sil';
  button.setAttribute('aria-label','Öğretmeni sil');
  button.style.background='#b42318';
  button.style.borderColor='#b42318';
  button.style.color='#fff';
  button.style.marginRight='auto';
  button.addEventListener('click',async()=>{
    if(button.disabled)return;
    button.disabled=true;
    const old=button.textContent;button.textContent='Siliniyor…';
    try{
      const deleted=await deleteTeacher(id);
      if(!deleted){button.disabled=false;button.textContent=old;return;}
      modal.remove();
      global.toast?.('Öğretmen silindi.');
      global.PeopleModule?.render?.();
    }catch(err){
      console.error('[TeacherDeleteLifecycle]',err);
      global.toast?.('Öğretmen silinemedi: '+(err?.message||err));
      button.disabled=false;button.textContent=old;
    }
  });
  if(cancel)footer.insertBefore(button,cancel);else footer.prepend(button);
}

function scan(){document.querySelectorAll('[data-teacher-modal]').forEach(ensureDeleteButton)}
function install(){
  scan();
  const observer=new MutationObserver(scan);
  observer.observe(document.body,{childList:true,subtree:true});
  global.addEventListener('koruk:module-ready',scan);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();

global.TeacherDeleteLifecycle={deleteTeacher,scan};
})(window);
