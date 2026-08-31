const fs=require('fs');
const assert=require('assert');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
for(const token of ['Metin Notu','Yapılacaklar','Çizim','Görsel Not','Tablo Notu','Notlarımı Görüntüle','openTextQuickNote','openChecklistQuickNote','openDrawingQuickNote','openImageQuickNote','openTableQuickNote'])assert(shell.includes(token),`Hızlı Not launcher sözleşmesi eksik: ${token}`);
assert(shell.includes("NotlarService?.notKaydet?.(null"),'Hızlı not kayıtları mevcut NotlarService üzerinden yazılmalı.');
assert(shell.includes("page:'notes'"),'Notlarımı Görüntüle doğrudan Notlarım sayfasını açmalı.');
for(const token of ["tip:'metin'","tip:'todo'","'cizim'",'cizimData',"'goruntu'",'goruntu:data',"'tablo'",'tabloVeri','tabloSatir','tabloSutun','etiketler','renk','tarih'])assert(shell.includes(token),`Eski gerçek Hızlı Not modeli taşınmadı: ${token}`);
assert(!shell.includes('openUnsupportedQuickNote'),'Doğrulanmış not türleri pasif bırakılmamalı.');
const communication=fs.readFileSync('js/modules/communication.js','utf8');
for(const token of ['noteTypePreview','cizimData','x.goruntu','tabloVeri'])assert(communication.includes(token),`Notlarım zengin tür önizlemesi eksik: ${token}`);

for(const token of ['KİŞİSEL NOT DEFTERİ','Toplam Not','Bekleyen İş','Bu Ay','Benim Notlarım','Diğer Kullanıcıların Notları','data-note-open','data-note-color','data-note-edit','data-note-delete','data-note-item','noteForm','bindNotes(out)','noteSafeHtml','sanitizeHtml:v=>cleanHtml(v)','data-note-command','data-note-todo-add','data-note-image-input','data-note-table-rows','data-draw-tool=\"brush\"','data-draw-tool=\"highlighter\"','data-draw-tool=\"eraser\"','data-draw-tool=\"pan\"','data-draw-undo','data-draw-template','data-draw-fullscreen'])assert(communication.includes(token),`Notlar görünür/düzenleme paritesi eksik: ${token}`);
assert(communication.includes("data-note-add]')?.addEventListener('click',()=>window.ShellUI?.openQuickNote?.())"),'Yeni Not düğmesi ikinci tip seçici üretmemeli; canonical ShellUI Hızlı Not açılmalı.');
assert(!communication.includes("data-note-add]')?.addEventListener('click',()=>openNoteModal({}))"),'Communication yeni not için ikinci generic creator açmamalı.');
const css=fs.readFileSync('css/design-system.css','utf8');
for(const token of ['.ka-notes-workspace','.ka-notes-hero','.ka-notes-summary','.ka-notes-grid','.ka-note-card','.ka-note-rich-editor','.ka-note-drawing-toolbar','.ka-note-table-editor'])assert(css.includes(token),`Notlar merkezi design-system stili eksik: ${token}`);

console.log('Hızlı Not launcher + gerçek legacy metin/todo/çizim/görsel/tablo veri sözleşmesi + Notlar görünür paritesi başarılı.');
