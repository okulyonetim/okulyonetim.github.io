/* Koruk Asistan — Ders Kesim Raporu: saf mantık (ekrandan bağımsız, testlenir)
 * - Öğretmenin ders programından sınıf / ders satırları (her sınıf-ders çifti bir kez), dönem tahmini, tarih biçimi ve A4 belge gövdesi (kâğıt stili: css/design-system-base.css .dkr-*).
 * Ekran: ders-kesim.js. Çıktı merkezi ReportEngine ile yazdırılır / PDF alınır.
 */
(function(global){
'use strict';
if(global.DersKesimCore)return;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NOKTA='………………………',NOKTA_K='………………',MIN_SATIR=3;
/* Her satırın hazır durum metni; ekranda satır satır değiştirilebilir. */
const DURUM='Müfredata uygun tamamlanmıştır.';
const DONEMLER=[['1','1. Dönem'],['2','2. Dönem']];

const donemNo=v=>String(v)==='2'?'2':'1';
/* Eylül–Ocak 1. dönem, Şubat'tan itibaren 2. dönem (Temmuz–Ağustos'ta yıl sonu raporu için 2.). */
const varsayilanDonem=(d=new Date())=>{const ay=d.getMonth()+1;return ay>=2&&ay<=8?'2':'1'};

/* Ders programı kayıtları → [{sinif, ders, durum}] (öğretmenin her sınıf-ders çifti bir kez; sınıf sırasıyla, sonra ders adıyla). */
function programSatirlari(program,ogretmenId){
 const id=String(ogretmenId??'').trim(),map=new Map();
 if(!id)return[];
 (Array.isArray(program)?program:[]).forEach(d=>{
  if(!d||String(d.ogretmenId??'')!==id)return;
  const sinif=String(d.sinif||'').trim(),ders=String(d.ders||'').trim();
  if(!sinif||!ders)return;
  const k=`${sinif}\u0000${ders}`;
  if(!map.has(k))map.set(k,{sinif,ders,durum:DURUM});
 });
 return[...map.values()].sort((a,b)=>a.sinif.localeCompare(b.sinif,'tr',{numeric:true,sensitivity:'base'})||a.ders.localeCompare(b.ders,'tr'));
}

/* ── metin biçimleri (Yazılı Kâğıdı Teslim Tutanağı ile aynı yazım) ── */
const tarihMetni=(iso,bos=NOKTA_K)=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||''));return m?`${m[3]}.${m[2]}.${m[1]}`:bos};
/* "Koruk İlk - Ortaokulu" / "… Müdürlüğü" → "KORUK İLK - ORTAOKULU MÜDÜRLÜĞÜNE" */
function muhatap(okul){
 const ad=String(okul||'').trim().toLocaleUpperCase('tr').replace(/\s*M[ÜU]D[ÜU]RL[ÜU][ĞG][ÜU](NE)?$/,'').trim();
 return`${ad||NOKTA} MÜDÜRLÜĞÜNE`;
}
const adMetni=ad=>String(ad||'').trim()||NOKTA;

/* ── A4 belge gövdesi ──
 * m: {okul, yil, donem, belgeTarihi, ogretmen, mudur, satirlar:[{sinif,ders,durum}]} */
function belge(m={}){
 const satirlar=(Array.isArray(m.satirlar)?m.satirlar:[]).filter(r=>r&&(String(r.sinif||'').trim()||String(r.ders||'').trim()||String(r.durum||'').trim()));
 const bos=satirlar.length?0:MIN_SATIR;
 const satirHtml=satirlar.map((r,i)=>`<tr><td class="dkr-orta">${i+1}</td><td class="dkr-orta">${esc(String(r.sinif||'').trim())}</td><td>${esc(String(r.ders||'').trim())}</td><td>${esc(String(r.durum||'').trim())}</td></tr>`).join('');
 const bosHtml=Array.from({length:bos},(_,i)=>`<tr><td class="dkr-orta">${i+1}</td><td></td><td></td><td></td></tr>`).join('');
 const yil=String(m.yil||'').trim()||'……………',donem=donemNo(m.donem);
 const kolon=['dkr-c-sira','dkr-c-sinif','','dkr-c-durum'].map(c=>`<col${c?` class="${c}"`:''}>`).join('');
 return`<article class="dkr-paper">
<div class="dkr-baslik">DERS KESİM RAPORU</div>
<div class="dkr-muhatap">${esc(muhatap(m.okul))}</div>
<p class="dkr-govde">${esc(yil)} Eğitim-Öğretim yılının ${donem}. Döneminde ders verdiğim sınıflara ait ders kesim durumu aşağıdadır. Bilgilerinize arz ederim.</p>
<table class="dkr-tablo"><colgroup>${kolon}</colgroup><thead><tr><th colspan="4" class="dkr-ust">Ayrıntılı Ders Kesim Durumu</th></tr><tr><th>No</th><th>Sınıf</th><th>Ders Adı</th><th>Durum</th></tr></thead><tbody>${satirHtml}${bosHtml}</tbody></table>
<div class="dkr-tarih">${esc(tarihMetni(m.belgeTarihi))}</div>
<div class="dkr-imzalar"><div class="dkr-imza"><b>Okul Müdürü</b><span>${esc(adMetni(m.mudur))}</span></div><div class="dkr-imza"><b>Ders Öğretmeni</b><span>${esc(adMetni(m.ogretmen))}</span></div></div>
</article>`;
}

global.DersKesimCore={DURUM,DONEMLER,MIN_SATIR,donemNo,varsayilanDonem,programSatirlari,tarihMetni,muhatap,belge};
})(window);
