/* Koruk Asistan — Android WebView çalışma zamanı düzeltmeleri.
 * Bu dosya MainActivity tarafından uygulama hazır olduğunda yüklenir.
 * Amaç: native geri navigasyonu ile aynı oturumda arama IME kararlılığı,
 * öğretmen arama kutusu boşluğu ve planlı tatil formu taslağını korumak.
 */
(function(global){
'use strict';
if(global.KorukNativeRuntimeFixes)return;

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const norm=v=>String(v||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();

function installStyle(){
  if(document.getElementById('koruk-native-runtime-style'))return;
  const style=document.createElement('style');
  style.id='koruk-native-runtime-style';
  style.textContent=`
    .ogm-search input[data-exact-search]{padding-left:44px!important;padding-right:12px!important;text-indent:0!important}
    .ogm-search span{left:14px!important;top:50%!important;transform:translateY(-50%)!important;pointer-events:none!important;z-index:2}
  `;
  document.head.appendChild(style);
}

let searchState=null;
function isPeopleSearch(el){
  return el instanceof HTMLInputElement&&(el.id==='peopleSearch'||el.hasAttribute('data-exact-search'));
}
function searchRows(input){
  const classic=input.closest('[data-people-classic]');
  if(classic){
    if(input.closest('.ogm-tools'))return qa('.ogm-grid .ogm-card',classic);
    const table=input.closest('.classic-card')?.querySelector('.classic-table tbody');
    if(table)return qa('tr',table);
    return qa('.student-row,.ogm-card,.classic-table tbody tr',classic);
  }
  const people=input.closest('#peopleContent')||q('#peopleContent');
  if(!people)return[];
  return qa('.ka-teacher-card,.ka-class-card,.ka-student-card',people);
}
function applyPeopleSearch(input){
  const needle=norm(input.value);
  const rows=searchRows(input);
  rows.forEach(row=>{row.hidden=!!needle&&!norm(row.textContent).includes(needle)});
  const visible=rows.filter(row=>!row.hidden).length;
  const summary=input.closest('.classic-toolbar')?.querySelector('.classic-summary');
  if(summary&&rows.length)summary.textContent=`${visible} kayıt`;
}
function findSearchReplacement(state){
  if(!state)return null;
  if(state.id)return document.getElementById(state.id);
  const root=q('#v2ModuleRoot')||document;
  return qa('[data-exact-search]',root).find(x=>x.placeholder===state.placeholder)||q('[data-exact-search]',root);
}
function restoreSearchState(){
  if(!searchState)return;
  const input=findSearchReplacement(searchState);
  if(!input)return;
  if(input.value!==searchState.value)input.value=searchState.value;
  applyPeopleSearch(input);
  if(searchState.focused&&Date.now()-searchState.typedAt<1800&&document.activeElement!==input){
    try{input.focus({preventScroll:true});const p=searchState.selection;input.setSelectionRange?.(p,p)}catch(_){input.focus?.()}
  }
}
function captureSearchInput(e){
  const input=e.target;
  if(!isPeopleSearch(input))return;
  searchState={id:input.id||'',placeholder:input.placeholder||'',value:input.value,selection:input.selectionStart??input.value.length,focused:document.activeElement===input,typedAt:Date.now()};
  /* PeopleClassicUI / PeopleModule her harfte render() çağırıp inputu DOM'dan
     silmesin. Android IME'nin kapanmasının gerçek nedeni buydu. */
  e.stopImmediatePropagation();
  applyPeopleSearch(input);
}

let holidayDraft=null;
let holidaySaving=false;
let restoringHoliday=false;
function holidayCard(){return q('[data-quality-holiday-card]')}
function holidayRows(card){return qa('[data-quality-holiday-range-row]',card)}
function isHolidayField(el){return !!el?.closest?.('[data-quality-holiday-card]')&&!!el.matches?.('[data-quality-holiday-name],[data-quality-holiday-start],[data-quality-holiday-end],[data-quality-holiday-note]')}
function snapshotHoliday(card=holidayCard()){
  if(restoringHoliday||!card)return;
  holidayDraft={dirty:true,rows:holidayRows(card).map((row,i)=>({
    id:String(row.dataset.holidayId||`draft-${i}`),
    ad:q('[data-quality-holiday-name]',row)?.value||'',
    baslangicTarihi:q('[data-quality-holiday-start]',row)?.value||'',
    bitisTarihi:q('[data-quality-holiday-end]',row)?.value||'',
    not:q('[data-quality-holiday-note]',row)?.value||''
  }))};
}
function setHolidayRow(row,draft){
  row.dataset.holidayId=draft.id||row.dataset.holidayId||'';
  const name=q('[data-quality-holiday-name]',row),start=q('[data-quality-holiday-start]',row),end=q('[data-quality-holiday-end]',row),note=q('[data-quality-holiday-note]',row);
  if(name)name.value=draft.ad||'';
  if(start)start.value=draft.baslangicTarihi||'';
  if(end)end.value=draft.bitisTarihi||'';
  if(note)note.value=draft.not||'';
  const title=row.querySelector('.ka-row strong');if(title)title.textContent=draft.ad||'Tatil';
}
function restoreHolidayDraft(){
  if(restoringHoliday||!holidayDraft?.dirty)return;
  const card=holidayCard();if(!card)return;
  restoringHoliday=true;
  try{
    let rows=holidayRows(card);
    const add=q('[data-quality-holiday-add]',card);
    while(rows.length<holidayDraft.rows.length&&add){add.click();rows=holidayRows(card)}
    while(rows.length>holidayDraft.rows.length){const last=rows[rows.length-1],rm=q('[data-quality-holiday-remove]',last);if(!rm)break;rm.click();rows=holidayRows(card)}
    rows.forEach((row,i)=>{if(holidayDraft.rows[i])setHolidayRow(row,holidayDraft.rows[i])});
  }finally{restoringHoliday=false}
}
function holidayFieldChanged(e){if(isHolidayField(e.target))snapshotHoliday(e.target.closest('[data-quality-holiday-card]'))}
function holidayClick(e){
  const card=e.target.closest?.('[data-quality-holiday-card]');if(!card)return;
  if(e.target.closest('[data-quality-holiday-save]'))holidaySaving=true;
  if(e.target.closest('[data-quality-holiday-add],[data-quality-holiday-remove]'))setTimeout(()=>snapshotHoliday(card),0);
}

let restoreQueued=false;
function queueRestore(){
  if(restoreQueued)return;restoreQueued=true;
  requestAnimationFrame(()=>{restoreQueued=false;installStyle();restoreSearchState();restoreHolidayDraft()});
}
function start(){
  installStyle();
  document.addEventListener('input',captureSearchInput,true);
  document.addEventListener('input',holidayFieldChanged,true);
  document.addEventListener('change',holidayFieldChanged,true);
  document.addEventListener('click',holidayClick,false);
  const mo=new MutationObserver(queueRestore);mo.observe(document.documentElement,{childList:true,subtree:true});
  global.AppStore?.subscribe?.('data.dersSaatleri',()=>{if(holidaySaving){holidayDraft=null;holidaySaving=false}else queueRestore()});
  global.addEventListener('koruk:app-ready',queueRestore);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')queueRestore()});
  setInterval(()=>{restoreHolidayDraft();restoreSearchState()},800);
}

global.KorukNativeRuntimeFixes={applyPeopleSearch,restoreSearchState,snapshotHoliday,restoreHolidayDraft};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
