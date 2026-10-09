/* Koruk Asistan — Merkezi Rol Yetki Editörü
 * RolePermissionCatalog ile aynı kaynaktan çalışır.
 * Firestore şemasını değiştirmez; mevcut rollerin yetkiler alanını günceller.
 */
(function(global){
  'use strict';
  if(global.RolePermissionEditor)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const levelText={hidden:'Gizli',preview:'Önizleme',read:'Görüntüle',edit:'Düzenle'};
  const levelValue={hidden:'gizle',preview:'goruntule',read:'goruntule',edit:'duzenle'};
  const catalog=()=>global.RolePermissionCatalog?.catalog||[];
  const roles=()=>Array.isArray(global.AppStore?.data?.('roller'))?global.AppStore.data('roller'):[];
  const active=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
  const canOpen=()=>active().admin===true||global.PermissionService?.can?.('settings.roles','read')===true;
  const canEdit=()=>active().admin===true||global.PermissionService?.can?.('settings.roles.edit','edit')===true;
  const canCreate=()=>active().admin===true||global.PermissionService?.can?.('settings.roles.create','edit')===true;
  const canClone=()=>active().admin===true||global.PermissionService?.can?.('settings.roles.clone','edit')===true;
  const canDelete=()=>active().admin===true||global.PermissionService?.can?.('settings.roles.delete','edit')===true;
  const roleName=r=>String(r?.ad||r?.rolAdi||r?.name||r?.id||'').trim();
  const selectedRole=()=>document.querySelector('#kaRolePermissionEditor select[data-role]')?.value||'';
  const roleById=id=>roles().find(r=>String(r.id)===String(id));
  const service=()=>global.KullaniciYonetimiService;
  const notify=m=>global.toast?.(m);
  function effective(r,key){
    const y=r?.yetkiler||{};
    if(Object.prototype.hasOwnProperty.call(y,key)){
      const v=String(y[key]);
      if(v==='duzenle')return'edit'; if(v==='goruntule')return'read'; if(v==='gizle')return'hidden';
      if(v==='edit'||v==='read'||v==='preview'||v==='hidden')return v;
    }
    const aliases=global.RolePermissionCatalog?.legacyAliases?.[key]||[];
    for(const a of aliases){const v=String(y[a]||'');if(v==='duzenle')return'edit';if(v==='goruntule')return'read';if(v==='gizle')return'hidden';}
    return'hidden';
  }
  function groups(){
    const map=new Map();
    for(const e of catalog()){
      const parts=String(e.key||'').split('.');
      const key=parts[0]||'other';
      if(!map.has(key))map.set(key,{key,label:e.moduleLabel||key,items:[]});
      map.get(key).items.push(e);
    }
    return [...map.values()];
  }
  function roleButtons(){return `<div class="ka-row" style="gap:6px;flex-wrap:wrap;margin-top:10px">
    ${canCreate()?'<button type="button" class="ka-btn" data-action="create">＋ Yeni Rol</button>':''}
    ${canClone()?'<button type="button" class="ka-btn" data-action="clone">⧉ Rolü Kopyala</button>':''}
    ${canDelete()?'<button type="button" class="ka-btn" data-action="delete">🗑 Rolü Sil</button>':''}
  </div>`;}
  function html(){
    const rs=roles(),rid=selectedRole()||String(rs[0]?.id||''),r=roleById(rid)||rs[0]||{},gs=groups();
    return `<div class="ka-card" id="kaRolePermissionEditor" style="margin:12px 0">
      <div class="ka-row ka-row--between" style="gap:8px;flex-wrap:wrap">
        <div><h3 style="margin:0">🔐 Rol ve Yetki Merkezi</h3><p class="ka-muted" style="margin:4px 0 0">Modül, sayfa ve işlem izinlerini ayrı ayrı belirleyin.</p></div>
        ${canEdit()?'<button type="button" class="ka-btn ka-btn--primary" data-save>Değişiklikleri Kaydet</button>':'<span class="ka-muted">Salt okunur</span>'}
      </div>
      <div class="ka-row" style="margin-top:12px;gap:8px;align-items:center;flex-wrap:wrap">
        <label for="ka-role-select"><strong>Rol</strong></label>
        <select id="ka-role-select" data-role ${canEdit()?'':'disabled'}>${rs.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===rid?'selected':''}>${esc(roleName(x))}</option>`).join('')}</select>
      </div>
      ${roleButtons()}
      <div data-tree style="margin-top:12px">${gs.map(g=>`<details open class="ka-card" data-group="${esc(g.key)}" style="margin:8px 0;padding:8px">
        <summary><strong>${esc(g.label)}</strong> <span class="ka-muted">(${g.items.length})</span></summary>
        ${canEdit()?`<div class="ka-row" style="gap:6px;margin:8px 0;flex-wrap:wrap"><button type="button" class="ka-btn" data-group-action="edit">Tümünü Düzenle</button><button type="button" class="ka-btn" data-group-action="read">Tümünü Görüntüle</button><button type="button" class="ka-btn" data-group-action="hidden">Tümünü Gizle</button></div>`:''}
        <div style="margin-top:8px">${g.items.map(e=>`<div class="ka-row" style="justify-content:space-between;gap:8px;border-top:1px solid var(--ka-border,rgba(127,127,127,.2));padding:8px 0;flex-wrap:wrap">
          <span style="min-width:220px"><strong>${esc(e.label||e.key)}</strong> <small class="ka-muted">${esc(e.key)}</small></span>
          <select data-permission="${esc(e.key)}" ${canEdit()?'':'disabled'}>${Object.keys(levelText).map(l=>`<option value="${l}" ${effective(r,e.key)===l?'selected':''}>${levelText[l]}</option>`).join('')}</select>
        </div>`).join('')}</div>
      </details>`).join('')}</div>
    </div>`;
  }
  function render(){
    const root=document.querySelector('[data-settings-module]');
    const page=global.SettingsModule?.currentPage?.()||'home';
    const content=root?.querySelector('#settingsContent');
    let host=root?.querySelector('#kaRolePermissionEditorHost');
    if(page!=='roles'||!root||!content||!canOpen()){
      host?.remove();
      return;
    }
    if(!host){host=document.createElement('div');host.id='kaRolePermissionEditorHost';content.prepend(host)}
    else if(host.parentElement!==content)content.prepend(host);
    host.innerHTML=html();bind(host);
  }
  function setGroup(host,group,value){
    const keys=new Set((catalog().filter(e=>String(e.key||'').split('.')[0]===group).map(e=>e.key)));
    host.querySelectorAll('[data-permission]').forEach(el=>{if(keys.has(el.dataset.permission))el.value=value;});
  }
  async function createRole(){
    if(!canCreate())return;
    const name=prompt('Yeni rol adı:','Yeni Rol'); if(!name?.trim())return;
    const id='rol_'+Date.now().toString(36); const base={id,ad:name.trim(),yetkiler:{},guncellenmeTarihi:new Date().toISOString()};
    if(!service()?.rolKaydet)throw new Error('KullaniciYonetimiService.rolKaydet bulunamadı');
    await service().rolKaydet(null,base); notify('Yeni rol oluşturuldu.'); render();
  }
  async function cloneRole(){
    if(!canClone())return;
    const src=roleById(selectedRole()); if(!src)return;
    const name=prompt('Kopyalanacak rolün yeni adı:',`${roleName(src)} Kopya`); if(!name?.trim())return;
    const id='rol_'+Date.now().toString(36); const copy={...src,id,ad:name.trim(),yetkiler:{...(src.yetkiler||{})},guncellenmeTarihi:new Date().toISOString()};
    if(!service()?.rolKaydet)throw new Error('KullaniciYonetimiService.rolKaydet bulunamadı');
    await service().rolKaydet(null,copy); notify('Rol kopyalandı.'); render();
  }
  async function deleteRole(){
    if(!canDelete())return;
    const id=selectedRole(),r=roleById(id); if(!r)return;
    if(roles().length<=1){notify('Son rol silinemez.');return;}
    if(!confirm(`“${roleName(r)}” rolü silinsin mi?`))return;
    if(!service()?.rolSil)throw new Error('KullaniciYonetimiService.rolSil bulunamadı');
    await service().rolSil(id,roles().length); notify('Rol silindi.'); render();
  }
  function bind(host){
    host.querySelector('[data-role]')?.addEventListener('change',()=>render());
    host.querySelector('[data-action="create"]')?.addEventListener('click',()=>createRole().catch(e=>{console.error(e);notify('Rol oluşturulamadı.')}));
    host.querySelector('[data-action="clone"]')?.addEventListener('click',()=>cloneRole().catch(e=>{console.error(e);notify('Rol kopyalanamadı.')}));
    host.querySelector('[data-action="delete"]')?.addEventListener('click',()=>deleteRole().catch(e=>{console.error(e);notify('Rol silinemedi.')}));
    host.querySelectorAll('[data-group-action]').forEach(btn=>btn.addEventListener('click',()=>setGroup(host,btn.closest('[data-group]')?.dataset.group,btn.dataset.groupAction)));
    host.querySelector('[data-save]')?.addEventListener('click',async()=>{
      if(!canEdit())return;const id=selectedRole(),r=roleById(id);if(!r)return;const yetkiler={...(r.yetkiler||{})};
      host.querySelectorAll('[data-permission]').forEach(el=>{yetkiler[el.dataset.permission]=levelValue[el.value]||'gizle';});
      try{
        if(!service()?.rolKaydet)throw new Error('KullaniciYonetimiService.rolKaydet bulunamadı');
        await service().rolKaydet(id,{yetkiler,guncellenmeTarihi:new Date().toISOString()});
        notify('Rol yetkileri kaydedildi.');render();
      }catch(e){console.error('[RolePermissionEditor]',e);notify('Rol yetkileri kaydedilemedi.');}
    });
  }
  function mount(){render();}
  const observer=new MutationObserver(records=>{const relevant=records.some(record=>{const target=record.target; if(target?.id==='kaRolePermissionEditorHost'||target?.closest?.('#kaRolePermissionEditorHost'))return false; if(target?.id==='settingsContent')return true; return [...(record.addedNodes||[]),...(record.removedNodes||[])].some(node=>node?.nodeType===1&&(node.matches?.('[data-settings-module],#settingsContent')||node.querySelector?.('[data-settings-module],#settingsContent')))});if(relevant)mount()});observer.observe(document.documentElement,{childList:true,subtree:true});
  global.addEventListener('koruk:permission-catalog-ready',mount);global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='settings')setTimeout(mount,0)});
  global.RolePermissionEditor={mount,render,catalog};setTimeout(mount,500);
})(window);