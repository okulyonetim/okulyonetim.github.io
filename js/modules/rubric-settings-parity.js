/* Koruk Asistan — Rubric Settings V2 parity adapter
 * Legacy ayar ekranındaki yeni kategori, özel ölçüt silme ve overwrite onayını
 * mevcut V2 engine'e dokunmadan merkezi design-system davranışlarıyla tamamlar.
 */
(function(global){
'use strict';
if(global.RubricSettingsParity)return;
const svc=()=>global.RubricSettingsService;
const toast=m=>global.toast?.(m);
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
function settingsBackdrop(){return document.querySelector('.ka-modal-backdrop[style*="100000"]');}
function currentKind(){return document.querySelector('#kaRubricOverlay h2')?.textContent?.includes('Proje')?'project':'rubric';}
async function currentRubric(){const s=svc();return clone((await s?.personalGet?.('rubric'))||s?.schoolGet?.('rubric')||null);}
function modal(title,body,actions){const ov=document.createElement('div');ov.className='ka-modal-backdrop';ov.style.zIndex='100001';ov.innerHTML=`<section class="ka-modal"><header class="ka-modal__header"><h3>${title}</h3></header><div class="ka-modal__body">${body}</div><footer class="ka-modal__footer">${actions}</footer></section>`;document.body.appendChild(ov);return ov;}
function closeSettings(){settingsBackdrop()?.remove();}
async function createCategory(){
 const full=await currentRubric();
 if(!full?.varsayilan?.gruplar){toast('Önce genel ölçütleri bu cihaza kaydedin.');return;}
 const ov=modal('Yeni kategori',`<div class="ka-field"><label class="ka-field__label" for="rtnewname">Yeni kategori adı</label><input id="rtnewname" autocomplete="off" placeholder="Örn. Fen Bilimleri"></div>`,`<button type="button" class="ka-btn ka-btn--secondary" id="rtnewcancel">Vazgeç</button><button type="button" class="ka-btn" id="rtnewsave">Oluştur</button>`);
 ov.querySelector('#rtnewcancel').onclick=()=>ov.remove();
 ov.querySelector('#rtnewsave').onclick=async()=>{const name=ov.querySelector('#rtnewname').value.trim();if(!name)return toast('Kategori adı girin.');full.dersOzel=full.dersOzel||{};if(full.dersOzel[name])return toast('Bu kategori zaten var.');full.dersOzel[name]=clone(full.varsayilan);await svc().personalSet('rubric',full);ov.remove();closeSettings();toast('Kategori cihaz verisine kaydedildi. Ölçütler panelini yeniden açabilirsiniz.');};
 ov.querySelector('#rtnewname').focus();
}
async function deleteCustom(target){
 const full=await currentRubric();if(!full?.dersOzel?.[target])return toast('Silinecek özel ölçüt bulunamadı.');
 if(!global.confirm?.(`“${target}” özel ölçütleri silinsin ve genel varsayılana dönülsün mü?`))return;
 delete full.dersOzel[target];await svc().personalSet('rubric',full);closeSettings();toast('Özel ölçüt silindi; genel varsayılana dönüldü.');
}
function addDeleteButton(){const sel=document.getElementById('rtd'),foot=settingsBackdrop()?.querySelector('.ka-modal__footer');if(!sel||!foot||!sel.value||sel.value==='__new__'||document.getElementById('rtdeletecustom'))return;const b=document.createElement('button');b.type='button';b.id='rtdeletecustom';b.className='ka-btn ka-btn--secondary';b.textContent='Sil, varsayılana dön';b.onclick=()=>deleteCustom(sel.value);foot.prepend(b);}
function observe(){const mo=new MutationObserver(()=>addDeleteButton());mo.observe(document.documentElement,{subtree:true,childList:true});}
document.addEventListener('change',e=>{if(e.target?.id!=='rtd')return;setTimeout(addDeleteButton,0);if(e.target.value!=='__new__')return;e.preventDefault();e.stopImmediatePropagation();e.target.value='';createCategory().catch(err=>{console.error('[RubricSettingsParity/create]',err);toast('Kategori oluşturulamadı.');});},true);
document.addEventListener('click',e=>{if(e.target?.id!=='rtcloud')return;if(!global.confirm?.('Okul varsayılanı mevcut cihaz ayarının üzerine yüklensin mi?')){e.preventDefault();e.stopImmediatePropagation();}},true);
observe();
global.RubricSettingsParity={createCategory,deleteCustom,refresh:addDeleteButton,kind:currentKind};
})(window);
