from pathlib import Path

index = Path('index.html')
text = index.read_text(encoding='utf-8')
marker = '<script src="js/modules/schedule-excel-tools.js"></script>'
if marker not in text:
    if '</body>' not in text:
        raise SystemExit('index.html: </body> bulunamadı')
    text = text.replace('</body>', f'  {marker}\n</body>')
    index.write_text(text, encoding='utf-8')

module = r'''/* Koruk Asistan — Ders programı Excel şablonu / toplu aktarım araçları */
(function(global){
'use strict';
if(global.ScheduleExcelTools)return;
const DAYS=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma'];
const PERIODS=[1,2,3,4,5,6,7];
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').trim().toLocaleLowerCase('tr').replace(/\s+/g,' ');
const teacherName=o=>`${o?.ad||''} ${o?.soyad||''}`.trim();
const canEdit=()=>global.PermissionService?.can?.('academic.schedule.edit','edit')??global.DersProgramiService?._duzenleyebilir?.()??false;
function loadScript(src,test){if(test())return Promise.resolve();return new Promise((ok,no)=>{const old=[...document.scripts].find(s=>s.src===src);if(old){if(test())return ok();old.addEventListener('load',ok,{once:true});old.addEventListener('error',no,{once:true});return}const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
const ensureExcelJS=()=>loadScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',()=>!!global.ExcelJS);
const ensureXlsx=()=>loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',()=>!!global.XLSX);
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
function safeSheetName(s){return String(s||'').replace(/[\\/*?:\[\]]/g,' ').slice(0,31)||'Program'}
async function downloadTemplate(){
  if(!canEdit())throw new Error('Bu işlem için yetkiniz yok.');
  await ensureExcelJS();
  const teachers=[...arr('ogretmenler')].filter(o=>teacherName(o)).sort((a,b)=>teacherName(a).localeCompare(teacherName(b),'tr'));
  const classes=[...arr('siniflar')].map(x=>String(x.ad||'').trim()).filter(Boolean).sort((a,b)=>a.localeCompare(b,'tr',{numeric:true}));
  const lessons=[...arr('dersListesi')].map(x=>String(x.ad||'').trim()).filter(Boolean).sort((a,b)=>a.localeCompare(b,'tr'));
  if(!teachers.length)throw new Error('Şablon oluşturmak için öğretmen kaydı bulunamadı.');
  if(!classes.length)throw new Error('Şablon oluşturmak için sınıf kaydı bulunamadı.');
  if(!lessons.length)throw new Error('Şablon oluşturmak için ders kaydı bulunamadı.');
  const wb=new global.ExcelJS.Workbook();wb.creator='Koruk Asistan';wb.created=new Date();
  const ws=wb.addWorksheet('Ders Programı',{views:[{state:'frozen',xSplit:1,ySplit:2}]});
  const list=wb.addWorksheet('Listeler',{state:'veryHidden'});
  list.getCell('A1').value='Öğretmenler';teachers.forEach((o,i)=>list.getCell(i+2,1).value=teacherName(o));
  list.getCell('B1').value='Sınıflar';classes.forEach((v,i)=>list.getCell(i+2,2).value=v);
  list.getCell('C1').value='Dersler';lessons.forEach((v,i)=>list.getCell(i+2,3).value=v);
  ws.mergeCells(1,1,1,71);const title=ws.getCell(1,1);title.value='DERS PROGRAMI TOPLU AKTARIM ŞABLONU';title.font={bold:true,size:16};title.alignment={horizontal:'center',vertical:'middle'};ws.getRow(1).height=28;
  ws.getCell(2,1).value='Öğretmen';ws.getCell(2,1).font={bold:true};ws.getColumn(1).width=24;
  let col=2;
  for(const day of DAYS){for(const p of PERIODS){const c1=ws.getCell(2,col),c2=ws.getCell(2,col+1);c1.value=`${day} ${p} - Sınıf`;c2.value=`${day} ${p} - Ders`;c1.font=c2.font={bold:true};c1.alignment=c2.alignment={textRotation:90,horizontal:'center',vertical:'middle',wrapText:true};ws.getColumn(col).width=12;ws.getColumn(col+1).width=18;col+=2}}
  ws.getRow(2).height=95;
  teachers.forEach((o,i)=>{const r=i+3;ws.getCell(r,1).value=teacherName(o);ws.getCell(r,1).font={bold:true};let c=2;for(const day of DAYS){for(const p of PERIODS){ws.getCell(r,c).dataValidation={type:'list',allowBlank:true,formulae:[`'Listeler'!$B$2:$B$${classes.length+1}`],showErrorMessage:true,errorTitle:'Geçersiz sınıf',error:'Listeden bir sınıf seçin.'};ws.getCell(r,c+1).dataValidation={type:'list',allowBlank:true,formulae:[`'Listeler'!$C$2:$C$${lessons.length+1}`],showErrorMessage:true,errorTitle:'Geçersiz ders',error:'Listeden bir ders seçin.'};c+=2}}});
  ws.autoFilter={from:{row:2,column:1},to:{row:2,column:71}};
  ws.eachRow((row,rowNo)=>{row.eachCell({includeEmpty:true},cell=>{cell.border={top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}};if(rowNo>=3)cell.alignment={vertical:'middle',wrapText:true}})});
  const info=wb.addWorksheet('Açıklama');info.getColumn(1).width=100;['KORUK ASİSTAN — DERS PROGRAMI ŞABLONU','1. Öğretmen adlarını değiştirmeyin.','2. Her ders saati için Sınıf ve Ders alanlarını açılır listeden seçin.','3. Ders yoksa iki alanı da boş bırakın.','4. Dosyayı .xlsx olarak kaydedip uygulamadaki “Excel’den İçe Aktar” alanından yükleyin.','5. Uygulama öğretmen ve sınıf çakışmalarını içe aktarmadan önce kontrol eder.'].forEach((v,i)=>{info.getCell(i+1,1).value=v;info.getCell(i+1,1).alignment={wrapText:true};if(i===0)info.getCell(i+1,1).font={bold:true,size:14}});
  const buf=await wb.xlsx.writeBuffer();downloadBlob(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'Ders_Programi_Toplu_Aktarim_Sablonu.xlsx');
  global.toast?.('Ders programı Excel şablonu indirildi.');
}
function teacherByName(name){return arr('ogretmenler').find(o=>norm(teacherName(o))===norm(name))||null}
function validClass(name){return arr('siniflar').some(x=>norm(x.ad)===norm(name))}
function canonicalClass(name){return arr('siniflar').find(x=>norm(x.ad)===norm(name))?.ad||''}
function canonicalLesson(name){return arr('dersListesi').find(x=>norm(x.ad)===norm(name))?.ad||''}
async function parseTemplate(file){
  await ensureXlsx();const wb=global.XLSX.read(await file.arrayBuffer(),{type:'array'}),ws=wb.Sheets['Ders Programı']||wb.Sheets[wb.SheetNames[0]],data=global.XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:''});
  const header=data[1]||[];if(norm(header[0])!=='öğretmen')throw new Error('Bu dosya ders programı toplu aktarım şablonu değil.');
  const rows=[],errors=[];
  for(let r=2;r<data.length;r++){const row=data[r]||[],t=teacherByName(row[0]);if(!String(row[0]||'').trim())continue;if(!t){errors.push(`${r+1}. satır: öğretmen bulunamadı (${row[0]})`);continue}let c=1;for(const day of DAYS){for(const p of PERIODS){const sinif=String(row[c]||'').trim(),ders=String(row[c+1]||'').trim();c+=2;if(!sinif&&!ders)continue;if(!sinif||!ders){errors.push(`${teacherName(t)} / ${day} ${p}: sınıf ve ders birlikte seçilmeli.`);continue}const cls=canonicalClass(sinif),lesson=canonicalLesson(ders);if(!cls){errors.push(`${teacherName(t)} / ${day} ${p}: sınıf uygulamada bulunamadı (${sinif}).`);continue}if(!lesson){errors.push(`${teacherName(t)} / ${day} ${p}: ders uygulamada bulunamadı (${ders}).`);continue}rows.push({sinif:cls,gun:day,saat:p,ders:lesson,ogretmenId:t.id})}}}
  if(!rows.length&&errors.length)throw new Error(errors.slice(0,5).join('\n'));if(!rows.length)throw new Error('Şablonda aktarılacak ders bulunamadı.');return{rows,errors};
}
function validateRows(rows,replaceAll){const errors=[],seenClass=new Map(),seenTeacher=new Map(),existing=replaceAll?[]:arr('dersProgrami');for(const v of rows){const ck=`${norm(v.sinif)}|${v.gun}|${v.saat}`,tk=`${v.ogretmenId}|${v.gun}|${v.saat}`;if(seenClass.has(ck))errors.push(`${v.sinif} ${v.gun} ${v.saat}. ders: birden fazla ders var.`);else seenClass.set(ck,v);if(seenTeacher.has(tk)&&seenTeacher.get(tk).sinif!==v.sinif)errors.push(`${teacherName(arr('ogretmenler').find(x=>x.id===v.ogretmenId))} ${v.gun} ${v.saat}. ders: öğretmen çakışması.`);else seenTeacher.set(tk,v);const slot=existing.find(x=>norm(x.sinif)===norm(v.sinif)&&x.gun===v.gun&&Number(x.saat)===v.saat);if(slot)errors.push(`${v.sinif} ${v.gun} ${v.saat}. ders: mevcut programda dolu.`);const tc=existing.find(x=>x.ogretmenId===v.ogretmenId&&x.gun===v.gun&&Number(x.saat)===v.saat&&norm(x.sinif)!==norm(v.sinif));if(tc)errors.push(`${teacherName(arr('ogretmenler').find(x=>x.id===v.ogretmenId))} ${v.gun} ${v.saat}. ders: mevcut programla çakışıyor.`)}return[...new Set(errors)]}
async function clearAll(silent=false){if(!canEdit())throw new Error('Bu işlem için yetkiniz yok.');const rows=[...arr('dersProgrami')];if(!rows.length){if(!silent)global.toast?.('Ders programında silinecek kayıt yok.');return 0}if(!silent&&!confirm(`Tüm ders programı silinecek. ${rows.length} kayıt kalıcı olarak temizlenecek. Devam edilsin mi?`))return 0;for(const x of rows)await global.DersProgramiService.sil(x.id);if(!silent)global.toast?.(`Ders programı temizlendi: ${rows.length} kayıt silindi.`);return rows.length}
async function importTemplate(file){if(!canEdit())throw new Error('Bu işlem için yetkiniz yok.');const parsed=await parseTemplate(file);if(parsed.errors.length)throw new Error(`Şablonda ${parsed.errors.length} hata var:\n${parsed.errors.slice(0,8).join('\n')}`);const replaceAll=confirm('Mevcut ders programı silinip bu Excel dosyasıyla tamamen değiştirilsin mi?\n\nTamam = Tümünü değiştir\nİptal = Mevcut programa ekle');const conflicts=validateRows(parsed.rows,replaceAll);if(conflicts.length)throw new Error(`Aktarım durduruldu. ${conflicts.length} çakışma/hata bulundu:\n${conflicts.slice(0,8).join('\n')}`);if(!confirm(`${parsed.rows.length} ders kaydı aktarılacak.${replaceAll?' Mevcut program önce temizlenecek.':''}\n\nDevam edilsin mi?`))return;if(replaceAll)await clearAll(true);let added=0;for(const v of parsed.rows){await global.DersProgramiService.kaydet(null,v);added++}global.toast?.(`Ders programı başarıyla aktarıldı: ${added} kayıt.`);return{eklenen:added}}
function chooseImport(){let input=document.getElementById('kaScheduleTemplateImport');if(!input){input=document.createElement('input');input.id='kaScheduleTemplateImport';input.type='file';input.accept='.xlsx';input.hidden=true;input.addEventListener('change',async()=>{const f=input.files?.[0];input.value='';if(!f)return;try{await importTemplate(f)}catch(e){console.error('[ScheduleExcelTools]',e);alert(e?.message||'İçe aktarma başarısız.')}});document.body.appendChild(input)}input.click()}
function actionButton(cls,icon,title,desc,handler){const b=document.createElement('button');b.type='button';b.className=cls;b.innerHTML=`<span>${icon}</span><b>${title}</b><small>${desc}</small>`;b.addEventListener('click',handler);return b}
function enhanceSchedule(){const box=document.querySelector('.ka-schedule-actions');if(!box||box.dataset.excelTools==='1'||!canEdit())return;box.dataset.excelTools='1';const tpl=actionButton('ka-schedule-action','⇩','Excel Şablonu','Güncel öğretmen, sınıf ve derslerle',()=>downloadTemplate().catch(e=>global.toast?.(e.message)));tpl.dataset.scheduleTemplate='1';const clear=actionButton('ka-schedule-action','🗑','Tüm Programı Temizle','Bütün ders programı kayıtlarını sil',()=>clearAll().catch(e=>global.toast?.(e.message)));clear.dataset.scheduleClear='1';box.insertBefore(tpl,box.children[1]||null);box.appendChild(clear)}
function enhanceDataPage(){const root=document.getElementById('v2ModuleRoot');if(!root||root.querySelector('[data-schedule-excel-data-card]'))return;const title=String(document.getElementById('v2ModuleTitle')?.textContent||document.querySelector('h1,h2')?.textContent||'');if(!/veriler/i.test(title))return;const card=document.createElement('article');card.className='ka-card';card.dataset.scheduleExcelDataCard='1';card.innerHTML=`<div class="ka-card__header"><strong>📅 Ders Programı Toplu Aktarım</strong></div><div class="ka-card__body ka-stack"><p class="ka-muted">Uygulamadaki güncel öğretmen, sınıf ve derslerden oluşturulan Excel şablonunu indirin; açılır listelerden doldurup yeniden yükleyin.</p><div class="ka-row ka-row--wrap"><button class="ka-btn" type="button" data-schedule-template-download>⇩ Excel Şablonunu İndir</button><button class="ka-btn ka-btn--secondary" type="button" data-schedule-template-import>⇧ Doldurulmuş Excel'i Yükle</button><button class="ka-btn ka-btn--danger" type="button" data-schedule-template-clear>🗑 Tüm Programı Temizle</button></div></div>`;root.prepend(card);card.querySelector('[data-schedule-template-download]').onclick=()=>downloadTemplate().catch(e=>global.toast?.(e.message));card.querySelector('[data-schedule-template-import]').onclick=chooseImport;card.querySelector('[data-schedule-template-clear]').onclick=()=>clearAll().catch(e=>global.toast?.(e.message))}
function enhance(){enhanceSchedule();enhanceDataPage()}
const observer=new MutationObserver(()=>requestAnimationFrame(enhance));observer.observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('koruk:module-ready',()=>requestAnimationFrame(enhance));setTimeout(enhance,0);
global.ScheduleExcelTools={downloadTemplate,importTemplate,clearAll,chooseImport,enhance};
})(window);
'''
Path('js/modules/schedule-excel-tools.js').write_text(module, encoding='utf-8')
