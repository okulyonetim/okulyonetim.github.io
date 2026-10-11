/* Koruk Asistan — Merkezi Rol Yetki Editörü
 * Tek editör: settings.js'in "Roller" sayfası bu modülü doğrudan çağırır (render + bind).
 * Kendi başına DOM'a enjekte olmaz (eski MutationObserver tabanlı prepend() kaldırıldı) —
 * böylece aynı sayfada iki ayrı rol editörü aynı anda görünmez.
 * RolePermissionCatalog (= PermissionService.catalog) ile aynı kaynaktan çalışır.
 * Firestore şemasını değiştirmez; mevcut rollerin yetkiler alanını günceller.
 */
(function(global){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Gizli/Önizleme/Salt okunur/Düzenleme — PermissionService.normalize ile birebir eşleşir.
  // (Önceki sürümde preview ve read ikisi de 'goruntule' yazılıyordu; bu, kaydedilen
  // önizleme kurallarının salt-okunura dönüşmesine yol açan bir veri kaybı hatasıydı.)
  const levelText={hidden:'Gizli',preview:'Önizleme',read:'Salt okunur',edit:'Düzenleme'};
  const levelValue={hidden:'gizle',preview:'onizle',read:'goruntule',edit:'duzenle'};
  const INHERIT='';
  const catalog=()=>global.RolePermissionCatalog?.catalog||global.PermissionService?.catalog||[];
  const roles=()=>Array.isArray(global.AppStore?.data?.('roller'))?global.AppStore.data('roller'):[];
  const active=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
  const canOpen=()=>active().admin===true||global.PermissionService?.can?.('settings.roles','read')===true;
  const canEdit=()=>active().admin===true||global.PermissionService?.can?.('settings.roles.edit','edit')===true;
  const canCreate=()=>active().admin===true||global.PermissionService?.can?.('settings.roles.create','edit')===true;
  const canClone=()=>active().admin===true||global.PermissionService?.can?.('settings.roles.clone','edit')===true;
  const canDelete=()=>active().admin===true||global.PermissionService?.can?.('settings.roles.delete','edit')===true;
  const roleName=r=>String(r?.ad||r?.rolAdi||r?.name||r?.id||'').trim();
  const isModuleKey=key=>String(key||'').startsWith('module.');
  const selectedRole=host=>host?.querySelector?.('[data-role]')?.value||'';
  const roleById=id=>roles().find(r=>String(r.id)===String(id));
  const service=()=>global.KullaniciYonetimiService;
  const notify=m=>global.toast?.(m);

  /* Yeni rol varsayılanı: Ana Sayfa salt okunur, diğer tüm modüller gizli başlar.
   * (Eski settings.js'teki secureRoleDefaults() ile aynı davranış — tek yerde.) */
  function secureRoleDefaults(){
    const y={};
    catalog().filter(e=>e.type==='page'&&isModuleKey(e.key)).forEach(e=>{y[e.key]=e.key==='module.dashboard'?'read':'hidden';});
    return y;
  }

  function storedToCanonical(v){
    const s=String(v??'');
    if(s==='duzenle')return'edit'; if(s==='goruntule')return'read'; if(s==='onizle')return'preview'; if(s==='gizle')return'hidden';
    if(s==='edit'||s==='read'||s==='preview'||s==='hidden')return s;
    return null;
  }
  /* key için rolde açıkça tanımlı seviyeyi döndürür; hiç tanımlı değilse:
   *  - module.* anahtarları için 'hidden' (üst sınır yok, güvenli varsayılan)
   *  - diğer anahtarlar için INHERIT ('') — yani modül tavanından devral */
  function effective(r,key){
    const y=r?.yetkiler||{};
    if(Object.prototype.hasOwnProperty.call(y,key)){
      const v=storedToCanonical(y[key]);
      if(v)return v;
    }
    const aliases=global.RolePermissionCatalog?.legacyAliases?.[key]||global.PermissionService?.aliases?.[key]||[];
    for(const a of aliases){const v=storedToCanonical(y[a]);if(v)return v;}
    return isModuleKey(key)?'hidden':INHERIT;
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
  function levelOptions(key,selected){
    const opts=[];
    if(!isModuleKey(key))opts.push([INHERIT,'Varsayılan / Üst kural']);
    Object.keys(levelText).forEach(l=>opts.push([l,levelText[l]]));
    return opts.map(([v,l])=>`<option value="${esc(v)}" ${selected===v?'selected':''}>${esc(l)}</option>`).join('');
  }
  function html(selectedId){
    const rs=roles(),rid=selectedId||String(rs[0]?.id||''),r=roleById(rid)||rs[0]||{},gs=groups();
    return `<div class="ka-card" id="kaRolePermissionEditor" style="margin:12px 0">
      <div class="ka-row ka-row--between" style="gap:8px;flex-wrap:wrap">
        <div><h3 style="margin:0">🔐 Rol ve Yetki Merkezi</h3><p class="ka-muted" style="margin:4px 0 0">Modül, sayfa ve işlem izinlerini ayrı ayrı belirleyin.</p></div>
        ${canEdit()?'<button type="button" class="ka-btn ka-btn--primary" data-save>Değişiklikleri Kaydet</button>':'<span class="ka-muted">Salt okunur</span>'}
      </div>
      <div class="ka-row" style="margin-top:12px;gap:8px;align-items:center;flex-wrap:wrap">
        <label for="ka-role-select"><strong>Rol</strong></label>
        <select id="ka-role-select" data-role ${canEdit()?'':'disabled'}>${rs.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===rid?'selected':''}>${esc(roleName(x))}</option>`).join('')}</select>
      </div>
      ${rid?`<div class="ka-grid" style="margin-top:10px;gap:8px">
        <label class="ka-field"><span class="ka-field__label">Rol Adı</span><input data-role-name value="${esc(r.ad||r.rolAdi||'')}" placeholder="Örn. Öğretmen" ${canEdit()?'':'disabled'}></label>
        <label class="ka-field"><span class="ka-field__label">Açıklama</span><input data-role-description value="${esc(r.aciklama||'')}" placeholder="Bu rolün kullanım amacı" ${canEdit()?'':'disabled'}></label>
      </div>`:''}
      ${roleButtons()}
      <div data-tree style="margin-top:12px">${gs.map(g=>`<details open class="ka-card" data-group="${esc(g.key)}" style="margin:8px 0;padding:8px">
        <summary><strong>${esc(g.label)}</strong> <span class="ka-muted">(${g.items.length})</span></summary>
        ${canEdit()?`<div class="ka-row" style="gap:6px;margin:8px 0;flex-wrap:wrap"><button type="button" class="ka-btn" data-group-action="edit">Tümünü Düzenle</button><button type="button" class="ka-btn" data-group-action="read">Tümünü Görüntüle</button><button type="button" class="ka-btn" data-group-action="hidden">Tümünü Gizle</button><button type="button" class="ka-btn" data-group-action="${INHERIT}">Tümünü Varsayılana Döndür</button></div>`:''}
        <div style="margin-top:8px">${g.items.map(e=>`<div class="ka-row" style="justify-content:space-between;gap:8px;border-top:1px solid var(--ka-border,rgba(127,127,127,.2));padding:8px 0;flex-wrap:wrap">
          <span style="min-width:220px"><strong>${esc(e.label||e.key)}</strong> <small class="ka-muted">${esc(e.key)}</small></span>
          <select data-permission="${esc(e.key)}" ${canEdit()?'':'disabled'}>${levelOptions(e.key,effective(r,e.key))}</select>
        </div>`).join('')}</div>
      </details>`).join('')}</div>
    </div>`;
  }
  /* Doğrudan çağrı API'si: settings.js kendi render() döngüsünde bunu çağırır.
   * host: #settingsContent içine yerleştirilecek innerHTML hedefi. */
  function render(host,selectedId){
    if(!host||!canOpen())return false;
    host.innerHTML=html(selectedId||selectedRole(host));
    bind(host);
    return true;
  }
  function setGroup(host,group,value){
    const keys=new Set((catalog().filter(e=>String(e.key||'').split('.')[0]===group).map(e=>e.key)));
    host.querySelectorAll('[data-permission]').forEach(el=>{if(!keys.has(el.dataset.permission))return;if(value===INHERIT&&isModuleKey(el.dataset.permission))return;el.value=value;});
  }
  async function createRole(host){
    if(!canCreate())return;
    const name=prompt('Yeni rol adı:','Yeni Rol'); if(!name?.trim())return;
    const id='rol_'+Date.now().toString(36); const base={id,ad:name.trim(),aciklama:'',yetkiler:secureRoleDefaults(),guncellenmeTarihi:new Date().toISOString()};
    if(!service()?.rolKaydet)throw new Error('KullaniciYonetimiService.rolKaydet bulunamadı');
    await service().rolKaydet(null,base); notify('Yeni rol oluşturuldu.'); render(host,id);
  }
  async function cloneRole(host){
    if(!canClone())return;
    const src=roleById(selectedRole(host)); if(!src)return;
    const name=prompt('Kopyalanacak rolün yeni adı:',`${roleName(src)} Kopya`); if(!name?.trim())return;
    const id='rol_'+Date.now().toString(36); const copy={...src,id,ad:name.trim(),yetkiler:{...(src.yetkiler||{})},guncellenmeTarihi:new Date().toISOString()};
    if(!service()?.rolKaydet)throw new Error('KullaniciYonetimiService.rolKaydet bulunamadı');
    await service().rolKaydet(null,copy); notify('Rol kopyalandı.'); render(host,id);
  }
  async function deleteRole(host){
    if(!canDelete())return;
    const id=selectedRole(host),r=roleById(id); if(!r)return;
    if(roles().length<=1){notify('Son rol silinemez.');return;}
    if(!confirm(`"${roleName(r)}" rolü silinsin mi?`))return;
    if(!service()?.rolSil)throw new Error('KullaniciYonetimiService.rolSil bulunamadı');
    await service().rolSil(id,roles().length); notify('Rol silindi.'); render(host);
  }
  function bind(host){
    host.querySelector('[data-role]')?.addEventListener('change',()=>render(host));
    host.querySelector('[data-action="create"]')?.addEventListener('click',()=>createRole(host).catch(e=>{console.error(e);notify('Rol oluşturulamadı.')}));
    host.querySelector('[data-action="clone"]')?.addEventListener('click',()=>cloneRole(host).catch(e=>{console.error(e);notify('Rol kopyalanamadı.')}));
    host.querySelector('[data-action="delete"]')?.addEventListener('click',()=>deleteRole(host).catch(e=>{console.error(e);notify('Rol silinemedi.')}));
    host.querySelectorAll('[data-group-action]').forEach(btn=>btn.addEventListener('click',()=>setGroup(host,btn.closest('[data-group]')?.dataset.group,btn.dataset.groupAction)));
    host.querySelector('[data-save]')?.addEventListener('click',async()=>{
      if(!canEdit())return;const id=selectedRole(host),r=roleById(id);if(!r)return;
      const ad=host.querySelector('[data-role-name]')?.value.trim()||roleName(r);
      const aciklama=host.querySelector('[data-role-description]')?.value.trim()||'';
      if(!ad){notify('Rol adı zorunludur.');return;}
      const yetkiler={...(r.yetkiler||{})};
      host.querySelectorAll('[data-permission]').forEach(el=>{
        const key=el.dataset.permission;
        if(el.value===INHERIT){delete yetkiler[key];return;}
        yetkiler[key]=levelValue[el.value]||'gizle';
      });
      try{
        if(!service()?.rolKaydet)throw new Error('KullaniciYonetimiService.rolKaydet bulunamadı');
        await service().rolKaydet(id,{ad,aciklama,yetkiler,guncellenmeTarihi:new Date().toISOString()});
        if((global.AKTIF_ROL||global.AppStore?.get?.('session.role'))?.id===id){
          const updated={...r,ad,aciklama,yetkiler};
          global.AKTIF_ROL=updated;global.AppStore?.set?.('session.role',updated);global.PermissionService?.refresh?.();
        }
        notify('Rol yetkileri kaydedildi.');render(host,id);
      }catch(e){console.error('[RolePermissionEditor]',e);notify('Rol yetkileri kaydedilemedi.');}
    });
  }
  global.RolePermissionEditor={render,html,catalog,canOpen,canEdit};
})(window);
