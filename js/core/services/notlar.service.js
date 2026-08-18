/* ================================================================
   js/core/services/notlar.service.js
   NOTLAR MODÜLÜ — İŞ KURALLARI + YETKİ KONTROLÜ

   Bu katman:
   - Her yazma işleminden önce duzenleyebilir('notlar') kontrolü yapar.
   - Yeni not eklerken, tam yetkili olmayan kullanıcının kaydını KİŞİSEL
     olarak damgalar (sahipUid) — bu kural önceden js/app.js'teki genel
     kaydet() fonksiyonunda gizliydi, artık burada açık ve modüle özel.
   - Görünürlük filtresini (kisiselKayitGorunurMu — app.js'te tanımlı,
     hatirlaticilar/gorevler ile paylaşılıyor) uygular.
   - Zengin metin HTML'ini hem okuma hem yazma sırasında sanitize eder.
   - db değişkenine DOĞRUDAN dokunmaz — sadece NotlarRepository çağırır.
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

function _notlarHtmlGuvenliYap(html){
  if(typeof html !== 'string' || !html) return '';
  if(typeof document === 'undefined') return html.replace(/<[^>]*>/g, '');

  const tpl = document.createElement('template');
  tpl.innerHTML = html;

  const yasakEtiketler = new Set([
    'SCRIPT','STYLE','IFRAME','OBJECT','EMBED','LINK','META','BASE','FORM',
    'INPUT','BUTTON','TEXTAREA','SELECT','OPTION','SVG','MATH','VIDEO','AUDIO'
  ]);

  Array.from(tpl.content.querySelectorAll('*')).forEach(el => {
    if(yasakEtiketler.has(el.tagName)){
      el.remove();
      return;
    }

    Array.from(el.attributes).forEach(attr => {
      const ad = attr.name.toLowerCase();
      const deger = String(attr.value || '').trim();

      if(ad.startsWith('on') || ad === 'srcdoc'){
        el.removeAttribute(attr.name);
        return;
      }

      if((ad === 'href' || ad === 'src' || ad === 'xlink:href') &&
         /^(?:javascript|vbscript|data):/i.test(deger)){
        el.removeAttribute(attr.name);
        return;
      }

      // Not editörü metin biçimlendirmesi için style kullanabiliyor; yalnız
      // URL/işlev üretebilen CSS kalıplarını temizle.
      if(ad === 'style' && /(url\s*\(|expression\s*\(|@import|javascript:)/i.test(deger)){
        el.removeAttribute(attr.name);
      }
    });
  });

  return tpl.innerHTML;
}

function _notlarKaydiGuvenliYap(kayit){
  if(!kayit || typeof kayit !== 'object' || typeof kayit.icerik !== 'string') return kayit;
  return { ...kayit, icerik: _notlarHtmlGuvenliYap(kayit.icerik) };
}

const NotlarService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('notlar')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  /* Ham listeyi görünürlük kuralına göre filtreler (kişisel notlar yalnız
     sahibine ve adminlere görünür — bkz. js/app.js kisiselKayitGorunurMu).
     Mevcut eski kayıtlardaki olası zararlı HTML de UI'ya ulaşmadan temizlenir. */
  gorunurListele(hamListe){
    const liste = (typeof kisiselKayitGorunurMu === 'function')
      ? hamListe.filter(kisiselKayitGorunurMu)
      : hamListe;
    return liste.map(_notlarKaydiGuvenliYap);
  },

  notKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));

    if(veri && typeof veri.icerik === 'string'){
      veri = { ...veri, icerik: _notlarHtmlGuvenliYap(veri.icerik) };
    }

    // DÜZELTME: Artık admin de dahil HERKESİN yeni notu sahipUid ile damgalanır
    // — "kimse kimsenin notunu göremesin" kuralı (öğretmenler birbirinden gizli,
    // admin her şeyi görür) için her kaydın bir sahibi olması gerekiyor;
    // sahipsiz kayıtlar artık öğretmenlere hiç görünmüyor (bkz. app.js
    // kisiselKayitGorunurMu).
    if(!mevcutId && typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI){
      veri = { ...veri, sahipUid: AKTIF_KULLANICI.uid };
    }
    if(!mevcutId && typeof IstatistikService !== 'undefined') IstatistikService.notEklemeKaydet();
    return mevcutId ? NotlarRepository.notGuncelle(mevcutId, veri) : NotlarRepository.notEkle(veri);
  },
  notSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return NotlarRepository.notSil(id);
  },
  notMaddeleriGuncelle(id, maddeler){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return NotlarRepository.notMaddeleriGuncelle(id, maddeler);
  }
};
