/* Koruk Asistan — Öğrenci Listesi gerçek DOCX üreticisi.
 * Harici kütüphane gerektirmez: tarayıcı içinde minimal OOXML ZIP üretir.
 */
(function(global){
'use strict';
if(global.StudentListDocx)return;

const enc=new TextEncoder();
const u32=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
function crc32(bytes){
 let c=0xffffffff;
 for(let i=0;i<bytes.length;i++){
  c^=bytes[i];
  for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);
 }
 return (c^0xffffffff)>>>0;
}
function le16(n){return [n&255,(n>>>8)&255]}
function le32(n){return [n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]}
function zip(files){
 const parts=[],central=[];let offset=0;
 files.forEach(f=>{
  const name=enc.encode(f.name),data=enc.encode(f.data),crc=crc32(data);
  const local=new Uint8Array([
   80,75,3,4,20,0,0,0,0,0,0,0,0,0,...le32(crc),...le32(data.length),...le32(data.length),...le16(name.length),0,0,...name,...data
  ]);
  parts.push(local);
  central.push(new Uint8Array([
   80,75,1,2,20,0,20,0,0,0,0,0,0,0,...le32(crc),...le32(data.length),...le32(data.length),...le16(name.length),0,0,0,0,0,0,0,0,0,0,...le32(offset),...name
  ]));
  offset+=local.length;
 });
 const centralStart=offset,centralSize=central.reduce((n,x)=>n+x.length,0);
 const end=new Uint8Array([80,75,5,6,0,0,0,0,...le16(files.length),...le16(files.length),...le32(centralSize),...le32(centralStart),0,0]);
 const all=[...parts,...central,end],size=all.reduce((n,x)=>n+x.length,0),out=new Uint8Array(size);let p=0;
 all.forEach(x=>{out.set(x,p);p+=x.length});return out;
}
function xml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function p(text,opts={}){
 const bold=opts.bold?' w:b="1"':'';
 const size=opts.size?` w:sz="${opts.size}" w:szCs="${opts.size}"`:'';
 const align=opts.align&&opts.align!=='left'?` w:jc="${opts.align}"`:'';
 return `<w:p><w:pPr>${align}</w:pPr><w:r><w:rPr>${bold}${size}</w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
}
function cell(text,twips,align,bold){
 const jc=align==='center'?'center':align==='right'?'right':'left';
 return `<w:tc><w:tcPr><w:tcW w:w="${twips}" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:jc w:val="${jc}"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr>${bold?'<w:b/>':''}</w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p></w:tc>`;
}
function row(values,widths,aligns,header){
 return `<w:tr>${header?'<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>':'<w:trPr><w:cantSplit/></w:trPr>'}${values.map((v,i)=>cell(v,widths[i],aligns[i],header)).join('')}</w:tr>`;
}
function table(rows,widths,aligns){
 const grid=widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('');
 return `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a,b)=>a+b,0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="70" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows.map((r,i)=>row(r,widths,aligns,i===0)).join('')}</w:tbl>`;
}
function buildDocument(data){
 const orientation=data.orientation==='landscape'?'landscape':'portrait';
 const pageW=orientation==='landscape'?16838:11906, usable=pageW-1440;
 const raw=(data.widths||[]).map(v=>Math.max(1,Number(v)||126)*15);
 const total=raw.reduce((a,b)=>a+b,0)||1,scale=Math.min(1,usable/total);
 const widths=raw.map(v=>Math.max(360,Math.round(v*scale)));
 const school=data.school||'',title=data.title||'',year=data.year?`${data.year} Eğitim-Öğretim Yılı`:'';
 const heads=(data.columns||[]).map(c=>c.label||'');
 const rows=(data.rows||[]).map(r=>(data.columns||[]).map(c=>r?.[c.key]??''));
 const aligns=(data.columns||[]).map(c=>c.align||'left');
 const body=[];
 body.push(p(school,{bold:true,size:28,align:'center'}));
 body.push(p(title,{bold:true,size:24,align:'center'}));
 if(year)body.push(p(year,{size:18,align:'center'}));
 body.push(p(''));
 body.push(table([heads,...rows],widths,aligns));
 body.push(p(''));
 body.push(p(`Toplam öğrenci sayısı: ${rows.length}`,{size:18,align:'right'}));
 body.push(p(''));
 body.push(`<w:tbl><w:tblPr><w:tblW w:w="${usable}" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="${Math.floor(usable/2)}"/><w:gridCol w:w="${Math.ceil(usable/2)}"/></w:tblGrid><w:tr>${cell(`Öğretmen: ${data.teacher||''}${data.branch?' — '+data.branch:''}\nİmza: ........................`,Math.floor(usable/2),'left',false)}${cell(`${data.principalTitle||'Okul Müdürü'}: ${data.principal||''}\nİmza: ........................`,Math.ceil(usable/2),'right',false)}</w:tr></w:tbl>`);
 const sect=orientation==='landscape'?`<w:pgSz w:w="16838" w:h="11906"/>`:`<w:pgSz w:w="11906" w:h="16838"/>`;
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}<w:sectPr>${sect}<w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}
function contentTypes(){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`}
function rels(){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`}
function styles(){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style></w:styles>`}
function generate(data){
 const files=[
  {name:'[Content_Types].xml',data:contentTypes()},
  {name:'_rels/.rels',data:rels()},
  {name:'word/document.xml',data:buildDocument(data)},
  {name:'word/styles.xml',data:styles()}
 ];
 return zip(files);
}
global.StudentListDocx={generate};
})(window);
