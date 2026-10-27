/* Koruk Asistan — Öğretmen ve Öğrenci A4 raporları
 * Öğretmenler / Öğrenciler ekranlarının (people-directory.js) rapor düğmeleri buraya bağlanır.
 * Çıktı ReportEngine.printReport ile üretilir; görünüm css/design-system-base.css içindeki ".ka-report .pr-*" bölümündedir.
 * Okuma yalnız AppStore'dan yapılır. Kulüp / izin / belge kuralları PeopleClassicUI.helpers, norm analizi PeopleImportUI,
 * sınav hesapları StudentExamResultMath üzerinden gelir; aynı kural bu dosyada ikinci kez yazılmaz.
 */
(function(global){
'use strict';
if(global.PeopleReports)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const norm=v=>String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i');
const fullName=o=>[o?.ad,o?.soyad].filter(Boolean).join(' ')||o?.adSoyad||'—';
const H=()=>global.PeopleClassicUI?.helpers||{};
const DAYS=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
const DAY_SHORT=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
const dash='—';

/* ---------- ortak yardımcılar (ekran da kullanır) ---------- */
function dateKey(v){return H().leaveDateKey?.(v)||''}
function dateTR(v){const k=dateKey(v);return k?k.split('-').reverse().join('.'):(v?String(v):dash)}
function dayName(v){const k=dateKey(v);if(!k)return dash;const d=new Date(k+'T12:00:00');return Number.isNaN(d.getTime())?dash:DAYS[(d.getDay()+6)%7]}
function lessonClass(l){return l?.sinif||l?.sinifAdi||dash}
function lessonName(l){return l?.ders||l?.dersAdi||dash}
/* Haftalık ders matrisi: gün × ders saati. Saati veya günü okunamayan kayıtlar "loose" olarak ayrıca döner. */
function timetable(lessons){
  const rows=(lessons||[]).map(l=>({l,d:DAYS.findIndex(x=>norm(x)===norm(l.gun)),s:parseInt(l.saat,10)||0}));
  const placed=rows.filter(r=>r.d>=0&&r.s>0),used=new Set(placed.map(r=>r.d));
  const days=[0,1,2,3,4,...[5,6].filter(i=>used.has(i))],cells=new Map();
  placed.forEach(r=>{const k=r.d+'_'+r.s;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(r.l)});
  return{days,slots:Math.max(0,...placed.map(r=>r.s)),cell:(d,s)=>cells.get(d+'_'+s)||[],loose:rows.filter(r=>!(r.d>=0&&r.s>0)).map(r=>r.l),count:rows.length};
}
/* Sınav hesapları tek yerde (student-exam-result-details.js). Yüklenemediyse yalnız kayıtlı net / puan okunur. */
function examMath(){
  if(global.StudentExamResultMath)return global.StudentExamResultMath;
  const num=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
  const fmt=(v,d=2)=>{const n=num(v);return n==null?dash:new Intl.NumberFormat('tr-TR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)};
  return{
    entries(type,v){const out=[];for(const exam of arr(type))for(const r of Array.isArray(exam.sonuclar)?exam.sonuclar:[]){if((r.ogrenciId&&r.ogrenciId===v.id)||(!r.ogrenciId&&norm(r.ogrenciAdi)===norm(v.ogrenciAdi)))out.push({type:type==='denemeSonuclari'?'Deneme':'Test',exam,result:r,tarih:exam.tarih||r.tarih||'',ad:exam.sinavAdi||exam.ad||exam.baslik||'Sınav'})}return out.sort((a,b)=>String(b.tarih).localeCompare(String(a.tarih)))},
    netOf:e=>num(e?.result?.net),scoreOf:r=>num(r?.lgsPuani??r?.lgsPuan),rankOf:()=>null,classRankOf:()=>null,participantCount:()=>null,classParticipantCount:()=>null,
    lessonRows:()=>[],fmt,intFmt:v=>fmt(v,0)
  };
}
/* Sınavları (deneme + test) tarih sırasıyla, net / puan / sıra bilgisiyle döndürür. */
function examRows(v){
  const M=examMath(),all=[...M.entries('denemeSonuclari',v),...M.entries('testSonuclari',v)].sort((a,b)=>String(b.tarih).localeCompare(String(a.tarih)));
  return all.map(e=>({
    e,ad:e.ad,type:e.type,tarih:e.tarih,net:M.netOf(e),score:M.scoreOf(e.result,e.exam),
    rank:M.rankOf(e.result,e.exam),count:M.participantCount(e.result,e.exam),crank:M.classRankOf(e.result,e.exam),ccount:M.classParticipantCount(e.result,e.exam),
    lessons:M.lessonRows(e)
  }));
}
function attendanceOf(v){
  const sum={yok:0,gec:0,izinli:0,var:0},list=[];
  arr('yoklama').forEach(x=>{const d=x?.kayitlar?.[v.id];if(!d||sum[d]===undefined)return;sum[d]++;list.push({tarih:x.tarih||'',durum:d,girenAdi:x.girenAdi||''})});
  list.sort((a,b)=>String(b.tarih).localeCompare(String(a.tarih)));
  return{sum,list};
}
/* Net gelişimi: eski → yeni sıralı noktalar. Ekran ve rapor aynı SVG'yi kullanır; renkler her bağlamın kendi CSS'inden gelir. */
function trendSvg(points,label='Net gelişimi'){
  const pts=(points||[]).filter(p=>Number.isFinite(p.value));
  if(!pts.length)return'';
  const W=320,Hh=120,L=26,R=10,T=14,B=24,min=Math.min(0,...pts.map(p=>p.value)),max=Math.max(...pts.map(p=>p.value),min+1),span=max-min||1;
  const x=i=>pts.length===1?(L+W-R)/2:L+(W-L-R)*i/(pts.length-1),y=v=>T+(Hh-T-B)*(1-(v-min)/span);
  const grid=[0,.5,1].map(t=>{const gy=T+(Hh-T-B)*t,val=max-span*t;return `<line class="pr-trend-grid" x1="${L}" x2="${W-R}" y1="${gy.toFixed(1)}" y2="${gy.toFixed(1)}"/><text class="pr-trend-axis" x="${L-4}" y="${(gy+3).toFixed(1)}" text-anchor="end">${Math.round(val)}</text>`}).join('');
  const line=pts.length>1?`<polyline class="pr-trend-line" points="${pts.map((p,i)=>`${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')}"/>`:'';
  const dots=pts.map((p,i)=>`<circle class="pr-trend-dot" cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="3"/>${pts.length<=8||i===pts.length-1?`<text class="pr-trend-val" x="${x(i).toFixed(1)}" y="${(y(p.value)-7).toFixed(1)}" text-anchor="middle">${esc(String(Math.round(p.value*10)/10).replace('.',','))}</text>`:''}`).join('');
  const first=pts[0],last=pts[pts.length-1];
  const ends=`<text class="pr-trend-axis" x="${L}" y="${Hh-6}" text-anchor="start">${esc(first.label||'')}</text>${pts.length>1?`<text class="pr-trend-axis" x="${W-R}" y="${Hh-6}" text-anchor="end">${esc(last.label||'')}</text>`:''}`;
  return `<svg class="pr-trend" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(label)}">${grid}${line}${dots}${ends}</svg>`;
}
function trendPoints(rows){
  return rows.filter(r=>Number.isFinite(r.net)).slice().reverse().slice(-12).map(r=>({value:r.net,label:(dateTR(r.tarih)||'').slice(0,5)}));
}

/* ---------- A4 rapor parçaları ---------- */
function table(headers,rows,empty='Kayıt yok.',cls=''){
  if(!rows.length)return `<p class="pr-empty">${esc(empty)}</p>`;
  return `<table${cls?` class="${cls}"`:''}><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c&&c.html!==undefined?c.html:esc(c===''||c==null?dash:c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function infoTable(pairs){
  const rows=[];for(let i=0;i<pairs.length;i+=2)rows.push(pairs.slice(i,i+2));
  return `<table class="pr-dl"><tbody>${rows.map(r=>`<tr>${[0,1].map(i=>r[i]?`<th scope="row">${esc(r[i][0])}</th><td>${esc(r[i][1]||dash)}</td>`:'<th></th><td></td>').join('')}</tr>`).join('')}</tbody></table>`;
}
function identity(mark,title,meta,kpis){
  return `<div class="pr-id"><span class="pr-id-mark">${esc(mark)}</span><div class="pr-id-main"><strong>${esc(title)}</strong><span>${esc(meta)}</span></div></div><div class="pr-kpis">${kpis.map(k=>`<div><b>${esc(k[0])}</b><span>${esc(k[1])}</span></div>`).join('')}</div>`;
}
const mark=(...parts)=>{const t=parts.join(' ').trim().split(/\s+/).filter(Boolean);return((t[0]?.[0]||'?')+(t.length>1?t[t.length-1][0]:'')).toLocaleUpperCase('tr')};
const section=(title,body,extra='')=>`<h2 class="bolum-baslik">${esc(title)}${extra?` <small>${esc(extra)}</small>`:''}</h2>${body}`;
const check=on=>({html:on?'<span class="pr-ck is-on">✓</span>':'<span class="pr-ck">□</span>'});

function timetableHtml(tt){
  if(!tt.count)return '<p class="pr-empty">Ders programında kaydı yok.</p>';
  const head=`<thead><tr><th class="pr-tt-h">Ders</th>${tt.days.map(d=>`<th>${DAYS[d]}</th>`).join('')}</tr></thead>`;
  const body=Array.from({length:tt.slots},(_,i)=>i+1).map(s=>`<tr><th scope="row" class="pr-tt-h">${s}</th>${tt.days.map(d=>{const c=tt.cell(d,s);return c.length?`<td class="pr-tt-c">${c.map(l=>`<b>${esc(lessonClass(l))}</b><span>${esc(lessonName(l))}</span>`).join('<br>')}</td>`:'<td class="pr-tt-0"></td>'}).join('')}</tr>`).join('');
  const loose=tt.loose.length?`<p class="pr-note">Saati belirtilmemiş dersler: ${tt.loose.map(l=>esc([l.gun,lessonClass(l),lessonName(l)].filter(Boolean).join(' · '))).join('; ')}</p>`:'';
  return `<table class="pr-tt">${head}<tbody>${body}</tbody></table>${loose}`;
}
function groupChecks(o,type,title){
  const rows=H().reportRelated?.(type,o)||[],labels=global.BelgeDurumuService?.etiketler?.(type)||[];
  if(!rows.length||!labels.length)return'';
  const act=k=>global.BelgeDurumuService?.aktifIndexler?.(type,k)||labels.map((_,i)=>i);
  const done=rows.reduce((n,k)=>n+act(k).filter(i=>!!k.kontroller?.[i]).length,0),all=rows.reduce((n,k)=>n+act(k).length,0);
  return `<h3 class="pr-sub">${esc(title)} <small>${done}/${all}</small></h3>${table(['Kayıt',...labels],rows.map(k=>[{html:`<span class="pr-left">${esc(H().docSummary?.(type,k)||dash)}</span>`},...labels.map((_,i)=>act(k).includes(i)?check(!!k.kontroller?.[i]):{html:dash})]),'Kayıt yok.','pr-checks')}`;
}
function normSection(id){
  const n=global.PeopleImportUI?.teacherNormData?.(id);
  if(!n||!n.rows.length)return '<p class="pr-empty">Ders programı kaydı yok.</p>';
  const fark=(f,nm)=>nm==null?{html:dash}:{html:`<span class="pr-diff ${f-nm>0?'is-over':f-nm<0?'is-under':'is-ok'}">${f-nm>0?'+':''}${f-nm}</span>`};
  const rows=n.rows.map(r=>[r.ders,r.sinif,r.norm==null?dash:r.norm,r.fiili,fark(r.fiili,r.norm)]);
  rows.push([{html:'<b>Toplam</b>'},{html:''},n.toplamNorm||dash,n.toplamFiili,n.toplamNorm?fark(n.toplamFiili,n.toplamNorm):{html:dash}]);
  return table(['Ders','Sınıf','Norm (plan)','Fiili (program)','Fark'],rows);
}

async function ensureEngine(){
  if(global.ReportEngine?.printReport)return;
  await global.AppLoader?.loadScript?.('js/modules/report-engine.js?v=8');
  if(!global.ReportEngine?.printReport)throw new Error('Rapor motoru hazır değil.');
}

/* ---------- Öğretmen profil raporu ---------- */
async function teacher(o){
  try{
    await ensureEngine();
    await global.PeopleImportUI?.prepareTeacherNormData?.();
    const h=H(),id=o.id,name=fullName(o);
    const lessons=arr('dersProgrami').filter(d=>d.ogretmenId===id),tt=timetable(lessons);
    const duties=arr('nobetAtamalari').filter(n=>n.ogretmenId===id).sort((a,b)=>String(dateKey(a.tarih)).localeCompare(String(dateKey(b.tarih))));
    const clubs=h.reportRelated('sosyalKulupler',o),guides=h.reportRelated('rehberlik',o),days=h.reportRelated('belirliGunler',o);
    const leaves=[...arr('ogretmenIzinleri'),...arr('personelIzinler')].filter(x=>x.ogretmenId===id||x.personelId===id||norm(x.ogretmen||'')===norm(name));
    const docs=arr('digerEvrak').filter(x=>x.ogretmenId===id||x.personelId===id||norm(x.ogretmen||'')===norm(name));
    const committees=arr('kurulKomisyonlar').filter(r=>String(r.baskanId||'')===String(id)||[...(r.asilUyeler||[]),...(r.yedekUyeler||[])].some(m=>m?.tur==='ogretmen'&&String(m.id)===String(id)));
    const myClass=h.teacherClass(o),cls=myClass==='—'?'':myClass;
    const duty=a=>h.dutyPlace?.(a)||'Nöbet';
    const header=identity(mark(name),name,[o.unvan||'Öğretmen',o.brans,cls&&`${cls} sınıf öğretmeni`].filter(Boolean).join(' · '),[
      [String(lessons.length),'Haftalık ders saati'],[String(duties.length),'Nöbet kaydı'],[String(clubs.length+guides.length+(cls?1:0)),'Sınıf / kulüp görevi'],[String(leaves.length),'İzin / rapor kaydı']
    ]);
    const personal=infoTable([
      ['Adı soyadı',name],['Ünvan',o.unvan||'Öğretmen'],['Branş',o.brans],['Kariyer basamağı',o.kariyerBasamagi||o.kariyer],
      ['Derece / kademe',[o.derece,o.kademeNo||o.kademeDerece||o.kademe].filter(Boolean).join(' / ')],['Kadro',o.kadrosu],
      ['Okul',h.teacherSchool(o)],['Sorumlu sınıf',cls],['Telefon',o.telefon||o.telefon1],['E-posta',o.eposta||o.email]
    ]);
    const duty_=table(['Tarih','Gün','Yer'],duties.map(x=>[dateTR(x.tarih),x.gun||dayName(x.tarih),duty(x)]),'Nöbet ataması yok.');
    const roles=[
      ...(cls?[['Sınıf öğretmenliği',cls,'']]:[]),
      ...clubs.map(x=>['Sosyal kulüp',x.ad||x.kulupAdi||dash,`${arr('veliler').filter(v=>v.kulupId===x.id).length} öğrenci`]),
      ...guides.map(x=>['Rehberlik',x.sinif||x.ad||x.danisman||dash,'']),
      ...committees.map(x=>['Kurul / komisyon',x.ad||dash,[x.egitimOgretimYili,String(x.baskanId||'')===String(id)?'Başkan':'Üye'].filter(Boolean).join(' · ')])
    ];
    const specialDays=table(['Etkinlik','Tarih','Durum'],days.map(x=>[x.ad||x.baslik||'Etkinlik',[dateTR(x.tarihBaslangic||x.tarih),x.tarihBitis?dateTR(x.tarihBitis):''].filter(Boolean).join(' — '),x.tamamlandi===true||x.yapildi===true?'Tamamlandı':x.tamamlandi===false||x.yapildi===false?'Bekliyor':dash]),'Görevli olduğu etkinlik yok.');
    const pairs=lessons.map(x=>({sinif:norm(lessonClass(x)),ders:norm(lessonName(x))})),cl=s=>Array.isArray(s.siniflar)?s.siniflar:String(s.siniflar||s.sinif||'').split(/[,;]/).map(x=>x.trim()).filter(Boolean);
    const exams=arr('sinavlar').filter(s=>s.ogretmenId===id||cl(s).some(c=>pairs.some(d=>d.sinif===norm(c)&&d.ders===norm(s.ders||s.dersAdi||'')))).sort((a,b)=>String(a.tarih||'').localeCompare(String(b.tarih||'')));
    const examHtml=table(['Tarih','Sınıf','Ders','Dönem / sıra','Tür'],exams.map(s=>[dateTR(s.tarih),cl(s).join(', ')||dash,s.ders||s.dersAdi||dash,[s.donem,s.yaziliSirasi||s.sira].filter(Boolean).join(' · ')||dash,s.tur||s.sinavTuru||dash]),'Yazılı sınav kaydı yok.');
    const docStatus=[['sosyalKulupler','Sosyal kulüpler'],['maarifRapor','Maarif model raporları'],['zumre','Zümre'],['sok','ŞÖK'],['rehberlik','Rehberlik'],['bepPlani','Yıllık / BEP planları']].map(([t,l])=>groupChecks(o,t,l)).filter(Boolean).join('')||'<p class="pr-empty">Belge kaydı yok.</p>';
    const leaveHtml=table(['Tür','Tarih aralığı','Gün','Belge no','Açıklama','MEBBİS'],leaves.map(x=>[x.tur||x.izinTuru||'İzin / rapor',`${dateTR(x.baslangicTarihi||x.baslangic)} — ${dateTR(x.bitisTarihi||x.bitis)}`,x.gunSayisi??x.gun??dash,x.belgeNo||dash,x.aciklama||x.notlar||dash,x.mebbisIslendiMi===true?'✓':x.mebbisIslendiMi===false?'⚠':dash]),'İzin / rapor kaydı yok.');
    const otherDocs=table(['Evrak','Sınıf','Tarih'],docs.map(x=>[x.evrakTuru||x.baslik||x.ad||'Evrak',x.sinif||dash,dateTR(x.tarih)]),'Evrak kaydı yok.');
    const body=`<div class="pr-doc">${header}${section('Kişisel bilgiler',personal)}${section('Haftalık ders programı',timetableHtml(tt),`${lessons.length} ders saati`)}${section('Haftalık norm analizi',normSection(id))}${section('Nöbet çizelgesi',duty_,`${duties.length} kayıt`)}${section('Görevler',table(['Görev','Açıklama','Ayrıntı'],roles,'Sınıf, kulüp, rehberlik veya kurul görevi yok.'))}${section('Belirli gün ve haftalar',specialDays)}${section('Yazılı sınavlar',examHtml)}${section('Belge durumu',docStatus)}${section('İzinler ve raporlar',leaveHtml,`${leaves.length} kayıt`)}${section('Diğer evraklar',otherDocs)}</div>`;
    await global.ReportEngine.printReport(`${name} — Öğretmen Profil Raporu`,body,{fileName:`${name}_Ogretmen_Profil_Raporu`,compact:true,fontSize:8.5,kenarBosluk:10,akis:true});
  }catch(e){console.error('[PeopleReports/teacher]',e);global.toast?.('Öğretmen raporu açılamadı.')}
}

/* ---------- Öğrenci bilgi raporu ---------- */
async function student(v){
  try{
    await ensureEngine();
    const M=examMath(),cls=arr('siniflar').find(s=>s.id===v.sinifId)?.ad||'Sınıfsız',name=v.ogrenciAdi||'Öğrenci';
    const att=attendanceOf(v),rows=examRows(v),svc=v.servisAdi||arr('servisler').find(s=>s.id===v.servisId)?.guzergah||'',club=v.kulupAdi||arr('sosyalKulupler').find(k=>k.id===v.kulupId)?.ad||'';
    const lastNet=rows.map(r=>r.net).find(n=>Number.isFinite(n)),lastScore=rows.map(r=>r.score).find(n=>Number.isFinite(n));
    const header=identity(mark(name),name,[cls,v.ogrenciNo&&`No ${v.ogrenciNo}`,v.cinsiyet].filter(Boolean).join(' · '),[
      [String(att.sum.yok),'Devamsızlık (gün)'],[String(att.sum.gec),'Geç kalma'],[String(rows.length),'Sınav'],[M.fmt(lastNet),'Son net']
    ]);
    const info=infoTable([
      ['Adı soyadı',name],['Sınıf',cls],['Öğrenci no',v.ogrenciNo],['Cinsiyet',v.cinsiyet],['Doğum tarihi',v.dogumTarihi?dateTR(v.dogumTarihi):''],['Kan grubu',v.kanGrubu],
      ['TC kimlik no',v.tcKimlikNo||v.tc],['Servis',svc],['Sosyal kulüp',club],['E-posta',v.eposta||v.email]
    ]);
    const contacts=[1,2,3].map(i=>{const tel=i===1?(v.telefon1||v.telefon):v['telefon'+i],rel=v['yakinlik'+i]||(i===1?v.yakinlik:'');return tel?[rel||dash,i===1?(v.veliAdi||dash):dash,tel]:null}).filter(Boolean);
    const contactHtml=`${table(['Yakınlık','Veli','Telefon'],contacts,'Veli telefonu girilmemiş.')}${v.adres?`<p class="pr-note"><b>Adres:</b> ${esc(v.adres)}</p>`:''}`;
    const attHtml=`<table class="pr-dl"><tbody><tr><th scope="row">Yok</th><td>${att.sum.yok}</td><th scope="row">Geç</th><td>${att.sum.gec}</td></tr><tr><th scope="row">İzinli</th><td>${att.sum.izinli}</td><th scope="row">Var</th><td>${att.sum.var}</td></tr></tbody></table>${att.list.some(x=>x.durum!=='var')?table(['Tarih','Gün','Durum'],att.list.filter(x=>x.durum!=='var').slice(0,24).map(x=>[dateTR(x.tarih),dayName(x.tarih),{yok:'Yok',gec:'Geç',izinli:'İzinli'}[x.durum]||x.durum])):''}`;
    const trend=trendSvg(trendPoints(rows));
    const examHtml=`${table(['Tarih','Sınav','Tür','Net','LGS puanı','Genel sıra','Sınıf sırası'],rows.map(r=>[dateTR(r.tarih),r.ad,r.type,M.fmt(r.net),M.fmt(r.score),r.rank==null?dash:`${M.intFmt(r.rank)}${r.count!=null?' / '+M.intFmt(r.count):''}`,r.crank==null?dash:`${M.intFmt(r.crank)}${r.ccount!=null?' / '+M.intFmt(r.ccount):''}`]),'Sınav sonucu yok.')}${trend?`<div class="pr-chart"><h3 class="pr-sub">Net gelişimi</h3>${trend}</div>`:''}`;
    const last=rows.find(r=>r.lessons.length),lessonHtml=last?`<h3 class="pr-sub">Son sınav ders dağılımı <small>${esc(last.ad)} · ${esc(dateTR(last.tarih))}</small></h3>${table(['Ders','Doğru','Yanlış','Boş','Net'],last.lessons.map(x=>[x.name,M.intFmt(x.d),M.intFmt(x.y),x.b==null?dash:M.intFmt(x.b),M.fmt(x.n)]))}`:'';
    const body=`<div class="pr-doc">${header}${section('Öğrenci bilgileri',info)}${section('Veli ve iletişim',contactHtml)}${section('Devamsızlık',attHtml)}${section('Sınav sonuçları',examHtml+lessonHtml,`${rows.length} sınav`)}${v.notlar?section('Notlar',`<p class="pr-note">${esc(v.notlar)}</p>`):''}</div>`;
    await global.ReportEngine.printReport(`${name} — Öğrenci Bilgi Raporu`,body,{fileName:`${name}_Ogrenci_Bilgi_Raporu`,compact:true,fontSize:9,kenarBosluk:8});
  }catch(e){console.error('[PeopleReports/student]',e);global.toast?.('Öğrenci raporu açılamadı.')}
}

global.PeopleReports={teacher,student,timetable,timetableHtml,examMath,examRows,attendanceOf,trendSvg,trendPoints,dateTR,dayName,lessonClass,lessonName,DAYS,DAY_SHORT};
})(window);
