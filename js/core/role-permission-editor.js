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
  const roleName=r=>String(r?.ad||r?.rolAdi||r?.name||r?.id||'').trim();
  const selectedRole=()=>document.querySelector('#kaRolePermissionEditor select[data-role]')?.value||'';
  const roleById=id=>roles().find(r=>String(r.id)===String(id));
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
  function groupCatalog(){const groups=[];for(const e of catalog()){const group=e.key.split('.')[0];let g=groups.find(x=>x.key===group);if(!g){g={key:group,label:group,items:[]};groups.push(g)}g.items.push(e)}return groups;}
  function html(){
    const rs=roles(),rid=selectedRole()||String(rs[0]?.id||''),r=roleById(rid)||rs[0]||{},groups=groupCatalog();
    return `<div class="ka-card" id="kaRolePermissionEditor" style="margin:12px 0"><div class="ka-row ka-row--between" style="gap:8px;flex-wrap:wrap"><div><h3 style="margin:0">🔐 Rol ve Yetki Merkezi</h3><p class="ka-muted" style="margin:4px 0 0">Modül, bölüm ve işlem izinlerini ayrı ayrı belirleyin.</p></div><button type="button" class="ka-btn ka-btn--primary" data-save>${canEdit()?'Değişiklikleri Kaydet':'Salt okunur'}</button></div><div class="ka-row" style="margin-top:12px;gap:8px;align-items:center"><label for="ka-role-select"><strong>Rol</strong></label><select id="ka-role-select" data-role ${canEdit()?'':'disabled'}>${rs.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===rid?'selected':''}>${esc(roleName(x))}</option>`).join('')}</select></div><div data-tree style="margin-top:12px">${groups.map(g=>`<details open class="ka-card" style="margin:8px 0;padding:8px"><summary><strong>${esc(g.label)}</strong> <span class="ka-muted">(${g.items.length})</span></summary><div style="margin-top:8px">${g.items.map(e=>`<div class="ka-row" style="justify-content:space-between;gap:8px;border-top:1px solid var(--ka-border,rgba(127,127,127,.2));padding:8px 0"><span>${esc(e.label)} <small class="ka-muted">${esc(e.key)}</small></span><select data-permission="${esc(e.key)}" ${canEdit()?'':'disabled'}>${Object.keys(levelText).map(l=>`<option value="${l}" ${effective(r,e.key)===l?'selected':''}>${levelText[l]}</option>`).join('')}</select></div>`).join('')}</div></details>`).join('')}</div></div>`;
  }
  function render(){
    const root=document.querySelector('[data-settings-module]');if(!root||!canOpen())return;
    let host=root.querySelector('#kaRolePermissionEditorHost');if(!host){host=document.createElement('div');host.id='kaRolePermissionEditorHost';root.prepend(host)}
    host.innerHTML=html();bind(host);
  }
  function bind(host){
    host.querySelector('[data-role]')?.addEventListener('change',()=>render());
    host.querySelector('[data-save]')?.addEventListener('click',async()=>{
      if(!canEdit())return;const id=selectedRole(),r=roleById(id);if(!r)return;const yetkiler={...(r.yetkiler||{})};
      host.querySelectorAll('[data-permission]').forEach(el=>{yetkiler[el.dataset.permission]=levelValue[el.value]||'gizle';});
      try{await global.DeviceData.update('roller',global.COL.roller,id,{yetkiler,guncellenmeTarihi:new Date().toISOString()});global.toast?.('Rol yetkileri kaydedildi.');render();}
      catch(e){console.error('[RolePermissionEditor]',e);global.toast?.('Rol yetkileri kaydedilemedi.');}
    });
  }
  function mount(){if(!canOpen())return;const root=document.querySelector('[data-settings-module]');if(root?.querySelector('#kaRolePermissionEditorHost'))return;render();}
  const observer=new MutationObserver(()=>{if(document.querySelector('[data-settings-module]'))mount()});observer.observe(document.documentElement,{childList:true,subtree:true});
  global.addEventListener('koruk:permission-catalog-ready',mount);global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='settings')setTimeout(mount,0)});
  global.RolePermissionEditor={mount,render,catalog};setTimeout(mount,500);
})(window);