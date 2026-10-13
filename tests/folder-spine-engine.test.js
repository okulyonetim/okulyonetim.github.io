// Klasör Sırtlığı Oluşturucu: sayfa dizilimi, seri üretimi ve sığdırma hesabı (js/modules/folder-spine.js).
const fs=require('fs'),vm=require('vm'),assert=require('assert'),test=require('node:test');
const src=fs.readFileSync('js/modules/folder-spine.js','utf8');
function load(){
  const win={};win.window=win;
  win.document={documentElement:{},styleSheets:[],getElementById:()=>null,readyState:'complete'};
  win.getComputedStyle=()=>({getPropertyValue:()=>''});   /* belirteç yok → modüldeki varsayılan oranlar */
  
  vm.createContext(win);vm.runInContext(src,win);
  return win.FolderSpine.engine;
}
const E=load();
const J=v=>JSON.parse(JSON.stringify(v));   /* vm bağlamından gelen diziler farklı prototipe sahiptir */

test('5 cm sırtlık A4 portreye 4 adet sığar; 8 cm 2 adet', ()=>{
  const a=E.pageLayout({...E.defaults(),size:'5'});
  assert.deepStrictEqual(J([a.W,a.H,a.cols,a.rows,a.per]),[50,280,4,1,4]);
  const b=E.pageLayout({...E.defaults(),size:'8'});
  assert.deepStrictEqual(J([b.W,b.cols,b.per]),[80,2,2]);
});
test('özel ölçü sınırlanır ve sayfaya sığar', ()=>{
  const p=E.pageLayout({...E.defaults(),size:'ozel',w:99,h:99,margin:5});
  assert(p.W<=200&&p.H<=287&&p.cols>=1&&p.rows>=1);
  const q=E.pageLayout({...E.defaults(),size:'ozel',w:6,h:12,margin:5});
  assert.strictEqual(q.cols*q.W+(q.cols-1)*q.gap<=200,true);
  assert.strictEqual(q.rows,2);
});
test('köşe işaretli kesimde boşluk işaret payı kadar açılır', ()=>{
  const p=E.pageLayout({...E.defaults(),size:'5',cut:'marks',gap:0});
  assert(p.gap>=6);assert.strictEqual(p.cols,3);
});
test('seri: numaralı, aylık, liste ve tek', ()=>{
  const b={...E.defaults(),title:'Maaş',sub:'',no:'',year:'2026-2027'};
  const n=E.buildItems({...b,mode:'numbered',from:5,count:3},'Okul');
  assert.deepStrictEqual(J(n.map(x=>x.no)),['5','6','7']);
  assert.strictEqual(E.buildItems({...b,mode:'monthly',months:'okul'},'Okul').map(x=>x.sub).join(','),'Eylül,Ekim,Kasım,Aralık,Ocak,Şubat,Mart,Nisan,Mayıs,Haziran');
  assert.strictEqual(E.buildItems({...b,mode:'monthly',months:'takvim'},'Okul').length,12);
  const l=E.buildItems({...b,mode:'list',list:'5-A\n5-B | Sınıf dosyası | 3\n\n'},'Okul');
  assert.deepStrictEqual(J(l.map(x=>[x.title,x.sub,x.no])),[['5-A','',''],['5-B','Sınıf dosyası','3']]);
  assert.strictEqual(E.buildItems({...b,mode:'single',copies:4},'Okul').length,4);
  assert.strictEqual(E.buildItems({...E.defaults(),title:'',mode:'single'},'Okul').length,0,'boş içerikle sırtlık üretilmez');
  assert.strictEqual(E.buildItems({...b,mode:'numbered',from:1,count:9999},'Okul').length,120,'adet sınırı');
});
test('başlık alana sığar: uzun metin satırlara bölünür, yazı boyu küçülür', ()=>{
  const short=E.fitText('EVRAK',200,26,23,.7,1.16,3),long=E.fitText('ÖĞRETMEN ÖZLÜK DOSYALARI VE MAAŞ EVRAKLARI',200,26,23,.7,1.16,3);
  assert(short.fs>long.fs);assert(long.lines.length>=2);
  for(const x of [short,long]){
    const longest=Math.max(...x.lines.map(l=>l.length));
    assert(longest*x.fs*.7<=200+.01,'satır boyu sınırı aşılmamalı');
    assert(x.lines.length*x.fs*1.16<=26+.01||x.fs<=.81,'satırların kalınlığı enine alanı aşmamalı');
  }
  assert.strictEqual(E.fitText('',100,10,10,.6,1.2,2),null);
});
test('sırtlık işaretlemesi: yön ve şablon sınıfları, kaçış, satır içi değişkenler', ()=>{
  const P=E.pageLayout({...E.defaults(),size:'5'});
  const s={...E.defaults(),theme:'koyu',dir:'up'};
  const h=E.labelHtml({title:'A<B>',sub:'x"y',no:'7',year:'2026',code:'K1',school:'Okul'},P,s);
  assert(/class="ka-spine t-koyu lb-renk d-up/.test(h));
  assert(!/<B>/.test(h)&&/A&lt;B&gt;/.test(h)&&/x&quot;y/.test(h));
  for(const v of ['--sp-w:50mm','--sp-h:280mm','--sp-top:','--sp-foot:','--sp-tfs:','--sp-sfs:'])assert(h.includes(v),v);
  assert(!/color|background|border/.test(h.match(/style="([^"]*)"/)[1]),'satır içi stil yalnız --sp-* ölçü/renk değişkenleri taşır');
  assert(!/ka-spine__sub/.test(E.labelHtml({title:'T',sub:'',no:'',year:'',code:'',school:''},P,s)),'boş alt başlık basılmaz');
});
test('sayfa dizilimi: her sayfada en çok per kadar hücre', ()=>{
  const P=E.pageLayout({...E.defaults(),size:'5'}),items=E.buildItems({...E.defaults(),title:'T',mode:'numbered',from:1,count:6},'Okul');
  const s0=E.sheetHtml(items,P,E.defaults(),0),s1=E.sheetHtml(items,P,E.defaults(),1);
  assert.strictEqual((s0.match(/ka-spine-cell/g)||[]).length,4);assert.strictEqual((s1.match(/ka-spine-cell/g)||[]).length,2);
  assert(/--sp-cols:4/.test(s0)&&/cut-line/.test(s0));
});

test('okul şeridi (varsayılan şablon): logo kutusu + okul adı şeridi + ortada başlık + altta yatay dönem', ()=>{
  const P=E.pageLayout({...E.defaults(),size:'5'}),d=E.defaults();
  assert.strictEqual(d.theme,'okul');
  const item={title:'OKUL SAĞLIĞI',sub:'(136)',no:'',year:'2022-2023',code:'',school:'Aselsan Konya MTAL'};
  const m=E.model(item,P,d,true);
  assert(m.okul&&m.boxS>40&&m.boxS<=50,'logo kutusu sırtlık genişliğinde, yaklaşık kare');
  assert(m.bandFit&&m.bandFit.lines.length>=1&&m.bandLen>0,'okul adı şeridi hesaplanır');
  assert(Math.abs(m.top-(m.boxS+m.bandLen))<1e-6,'üst blok = kutu + şerit');
  assert(m.yearFit&&!m.schoolFit,'dönem altta; okul adı alt bilgide tekrarlanmaz');
  assert(m.tFit&&m.tFit.fs>4,'başlığa orta alan kalır');
  const noLogo=E.model(item,P,d,false);
  assert.strictEqual(noLogo.boxS,0,'logo yoksa kutu çizilmez');assert(noLogo.top<m.top);
  const klasik=E.model(item,P,{...d,theme:'klasik'},true);
  assert(!klasik.okul&&!klasik.bandFit&&klasik.schoolFit,'diğer şablonlarda okul adı alt bilgidedir');
  const own=E.model(item,P,{...d,band:'Özel Okul Adı'},true);
  assert(/ÖZEL/.test(own.bandFit.lines.join(' '))&&!/ASELSAN/.test(own.bandFit.lines.join(' ')),'okul adı yazısı alanı okul bilgisinin yerine geçer');
  assert.strictEqual(E.model(item,P,{...d,school:false},true).bandFit,null,'okul adı kapalıysa şerit yok');
});
test('okul şeridi işaretlemesi: şerit, dönem ve numara rozeti', ()=>{
  const P=E.pageLayout({...E.defaults(),size:'5'}),d=E.defaults();
  const h=E.labelHtml({title:'Gelen Evrak',sub:'',no:'7',year:'2025-2026',code:'',school:'Atatürk İlkokulu'},P,d);
  assert(/class="ka-spine t-okul lb-renk d-down/.test(h));
  for(const v of ['ka-spine__band','--sp-c2:','--sp-c2ink:','--sp-band:','--sp-bfs:','--sp-box:'])assert(h.includes(v),v);
  assert(!h.includes('ka-spine__top'),'okul şeridinde tek üst blok yok');
  assert(h.indexOf('ka-spine__band')<h.indexOf('ka-spine__main')&&h.indexOf('ka-spine__main')<h.indexOf('ka-spine__foot'),'sıra: şerit → başlık → dönem');
  assert(h.indexOf('ka-spine__no')>h.indexOf('ka-spine__main'),'numara rozeti ortadaki alanda');
  assert(/ka-spine__foot"><div class="ka-spine__year">2025-2026/.test(h));
  assert(!/color|background|border/.test(h.match(/style="([^"]*)"/)[1]));
  assert(/lb-beyaz/.test(E.labelHtml({title:'A',sub:'',no:'',year:'',code:'',school:''},P,{...d,logobg:'beyaz'})));
});
test('yazı rengi seçimi için parlaklık hesabı', ()=>{
  assert(E.lum('#ffffff')>.99&&E.lum('#000000')<.001);
  assert(E.lum('#d9731a')>.2&&E.lum('#d9731a')<.35,'turuncu orta parlaklıkta');
  assert(E.lum('#14284b')<.03,'lacivert koyu');
  assert.strictEqual(E.lum('nope'),null);
});
