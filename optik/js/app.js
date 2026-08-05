// js/app.js — Optik Okuma Ana Modülü

import { baglaGaleriSecici } from './galeriSecici.js';
import { ayarlariGetir, ayarlariKaydet, ayarlariSifirla, VARSAYILAN as HASSASIYET_VARSAYILAN } from './hassasiyetAyarlari.js';

// YENİ: sayfaTespitCV.js'i (ve dolayısıyla OpenCV.js'i) burada, uygulama
// açılır açılmaz erkenden yüklemeye başlıyoruz (fire-and-forget) — önceden
// SADECE kamera ekranı açıldığında (camera.js dinamik import'u üzerinden)
// yükleniyordu. Galeriden içe aktarma akışı kamerayı hiç açmadığı için,
// omrEngine.js:sayfaKoseleriniAraHibrit galeri okumalarında window.SayfaTespitCV'i
// hiç bulamayıp sessizce eski (daha az güvenilir) köşe bulma yöntemine
// düşüyordu. Burada erkenden tetiklemek, kamera açılana/gerekene kadar
// arka planda hazır olmasını sağlar.
import('./sayfaTespitCV.js').then((mod) => mod.cvHazirBekle()).catch(() => {});

// ════════════════════════════════════════════════════════════════
// VERİ KATMANI (localStorage)
// ════════════════════════════════════════════════════════════════
const DB = {
    _oku(k, def) { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? def; } catch { return def; } },
    _yaz(k, v)   { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },

    // Sınavlar
    sinavlariGetir()        { return this._oku('oy_op_sinavlar', []); },
    sinavKaydet(s)          {
        const liste = this.sinavlariGetir().filter(x => x.id !== s.id);
        s.guncelleme = new Date().toISOString();
        liste.unshift(s);
        this._yaz('oy_op_sinavlar', liste);
    },
    sinaviSil(id)           {
        this._yaz('oy_op_sinavlar', this.sinavlariGetir().filter(s => s.id !== id));
        localStorage.removeItem('oy_op_sonuc_' + id);
        localStorage.removeItem('oy_op_anahtar_' + id);
    },
    sinaviBul(id)           { return this.sinavlariGetir().find(s => s.id === id) || null; },

    // Sonuçlar (taranmış kağıtlar)
    sonuclariGetir(sid)     { return this._oku('oy_op_sonuc_' + sid, []); },
    sonucKaydet(sid, sonuc) {
        const liste = this.sonuclariGetir(sid).filter(s => s.id !== sonuc.id);
        sonuc.tarih = sonuc.tarih || new Date().toLocaleDateString('tr-TR');
        liste.push(sonuc);
        if (!this._yaz('oy_op_sonuc_' + sid, liste)) {
            // Sıkıştır
            const kucuk = liste.map(s => ({ ...s, kagitGoruntusu: null }));
            this._yaz('oy_op_sonuc_' + sid, kucuk);
        }
    },
    sonucSil(sid, sonucId)  {
        this._yaz('oy_op_sonuc_' + sid, this.sonuclariGetir(sid).filter(s => s.id !== sonucId));
    },

    // Cevap Anahtarı
    // YENİ (Ağustos 2026, Sedat isteği): kitapcikTuru verilirse ('A'/'B')
    // AYRI bir anahtar okur/yazar — tek kitapçıklı sınavlarda (kitapcikTuru
    // verilmez) eski davranış (sabit oy_op_anahtar_{sid} anahtarı) AYNEN
    // korunuyor, geriye dönük uyumlu.
    anahtariGetir(sid, kitapcikTuru)      { return this._oku('oy_op_anahtar_' + sid + (kitapcikTuru ? '_' + kitapcikTuru : ''), { dersler: [] }); },
    anahtarKaydet(sid, a, kitapcikTuru)   { a.guncelleme = new Date().toISOString(); this._yaz('oy_op_anahtar_' + sid + (kitapcikTuru ? '_' + kitapcikTuru : ''), a); },

    // YENİ (Ağustos 2026): Optik Form Editörü ile tasarlanmış özel şablonlar.
    // Her kayıt {id, ad, sablon} — sablon, optikSablonEditor.js'nin ürettiği
    // ham şema (ogeler dizisi); PDF/OMR'a verilmeden önce
    // OptikSablonMotoru.sablonuDerle ile derlenir (bkz. sablonDerlemesiniGetir).
    ozelSablonlariGetir()        { return this._oku('oy_op_ozelSablonlar', []); },
    ozelSablonKaydet(kayit)      {
        const liste = this.ozelSablonlariGetir().filter(x => x.id !== kayit.id);
        kayit.guncelleme = new Date().toISOString();
        liste.unshift(kayit);
        this._yaz('oy_op_ozelSablonlar', liste);
    },
    ozelSablonBul(id)            { return this.ozelSablonlariGetir().find(x => x.id === id) || null; },
    ozelSablonSil(id)            { this._yaz('oy_op_ozelSablonlar', this.ozelSablonlariGetir().filter(x => x.id !== id)); },

    // Varsayılan optik form — "Yeni Sınav" ekranı açılışında otomatik seçili gelir.
    varsayilanSablonIdGetir()    { return this._oku('oy_op_varsayilanSablonId', null); },
    varsayilanSablonIdKaydet(id) { this._yaz('oy_op_varsayilanSablonId', id); },

    // LGS Puanı — MEB'in açıkladığı gerçek istatistikler (Türkiye ort./std sapma, MinTASP/MaxTASP)
    // Puan referans ayarları (Türkiye ortalaması/std sapma/TASP aralığı):
    // sınav TÜRÜNE göre GLOBAL saklanır (ör. 'lgs', 'bursluluk') — tek bir
    // sınava değil, o türdeki TÜM sınavlara uygulanır. Böylece her yeni
    // deneme için aynı referans verisini tekrar tekrar girmeye gerek kalmaz.
    puanReferansGetir(sinavTuru)       { return this._oku('oy_op_puanref_' + sinavTuru, { dersIstatistik: {}, minTasp: null, maxTasp: null }); },
    puanReferansKaydet(sinavTuru, a)   { this._yaz('oy_op_puanref_' + sinavTuru, a); },
};

// ════════════════════════════════════════════════════════════════
// OPTİK FORM ŞABLONLARI
// ════════════════════════════════════════════════════════════════
const SABLONLAR = [
    { id: 'lgs',       ad: 'LGS',              soruSayisi: 90, sikSayisi: 4 },
    { id: 'bursluluk', ad: 'Bursluluk Sınavı', soruSayisi: 80, sikSayisi: 4 },
    { id: 'ozel',      ad: 'Özel Sınav',       soruSayisi: null, sikSayisi: 4 },
];

function sablonBul(id) { return SABLONLAR.find(s => s.id === id) || null; }

/**
 * YENİ (Ağustos 2026): bir sınav türü kimliğinin (LGS/Bursluluk/Özel sabit
 * VEYA Optik Form Editörü ile tasarlanmış özel bir şablon) gerçek, PDF/OMR
 * tarafından tüketilebilir "form" nesnesini döndürür. Sabit türler için
 * LayoutEngine.layoutHesapla, editörle tasarlanmış özel şablonlar için
 * OptikSablonMotoru.sablonuDerle kullanılır — çağıran kod hangisi olduğunu
 * bilmek zorunda kalmaz.
 */
function sablonDerlemesiniGetir(sablonId, ekOpsiyonlar) {
    if (sablonId === 'lgs' || sablonId === 'bursluluk' || sablonId === 'ozel') {
        return window.LayoutEngine.layoutHesapla({ sinavTuru: sablonId, ...ekOpsiyonlar });
    }
    const kayit = DB.ozelSablonBul(sablonId);
    if (!kayit) throw new Error('Özel şablon bulunamadı: ' + sablonId);
    return window.OptikSablonMotoru.sablonuDerle(kayit.sablon);
}

let _optikFormOnSecimCB = null; // sheet açıkken hangi callback'e sonuç döneceğimizi hatırlar

/**
 * Optik Form Editörü ekranını açar. mevcutKayitId verilirse o özel şablon
 * düzenlenir (yeniden derlenip aynı id ile üzerine kaydedilir); verilmezse
 * boş bir şablonla yeni bir tasarım başlatılır.
 */
function sablonEditoruAc(mevcutKayitId) {
    const konteyner = document.getElementById('sablonEditorKonteyner');
    // YENİ (teşhis, Ağustos 2026): Sedat konsola erişemiyor (mobil), bu yüzden
    // bir hata olursa sessizce boş ekran göstermek yerine hatayı DOĞRUDAN
    // ekrana (kırmızı, okunur) yazıyoruz.
    try {
        if (!window.OptikSablonEditor) {
            throw new Error('window.OptikSablonEditor tanımsız — optikSablonEditor.js hiç yüklenmemiş olabilir (script sırası veya önbellek).');
        }
        if (!window.OptikSablonMotoru) {
            throw new Error('window.OptikSablonMotoru tanımsız — optikSablonMotoru.js hiç yüklenmemiş olabilir.');
        }
        if (!window.LayoutEngine) {
            throw new Error('window.LayoutEngine tanımsız.');
        }
        const mevcutKayit = mevcutKayitId ? DB.ozelSablonBul(mevcutKayitId) : null;
        window.OptikSablonEditor.baslat(konteyner, {
            baslangicSablonu: mevcutKayit ? mevcutKayit.sablon : null,
            varsayilanMi: mevcutKayitId && DB.varsayilanSablonIdGetir() === mevcutKayitId,
            kaydet: async (sablon, varsayilanYapilsinMi) => {
                const id = mevcutKayitId || ('ozelTasarim_' + Date.now());
                DB.ozelSablonKaydet({ id, ad: sablon.ad || 'Adsız Şablon', sablon });
                if (varsayilanYapilsinMi) DB.varsayilanSablonIdKaydet(id);
                else if (DB.varsayilanSablonIdGetir() === id) DB.varsayilanSablonIdKaydet(null);
                ekranGit('yeniSinav');
                if (_optikFormOnSecimCB) {
                    const form = sablonDerlemesiniGetir(id);
                    _optikFormOnSecimCB({ id, ad: sablon.ad || 'Adsız Şablon', soruSayisi: form.soruSayisi, sikSayisi: form.sikSayisi });
                }
            },
        });
    } catch (e) {
        konteyner.innerHTML = `<div style="padding:16px; color:#b00020; font-family:monospace; font-size:13px; white-space:pre-wrap; background:#fff;">HATA (bunu bana gönder):\n\n${e.message}\n\n${e.stack || ''}</div>`;
        console.error('sablonEditoruAc hatası:', e);
    }
    ekranGit('sablonEditor');
    // YENİ (teşhis): .ekran/.aktif CSS'i display:flex'imi ezip yükseklik
    // çökmesine yol açabilir ihtimaline karşı — konteynerin yüksekliğini
    // CSS'e bağımlı kalmadan JS'ten zorla, viewport'a göre hesapla.
    requestAnimationFrame(() => {
        const ekran = document.getElementById('ekranSablonEditor');
        const header = ekran ? ekran.querySelector('.o-header') : null;
        const headerYuksekligi = header ? header.getBoundingClientRect().height : 56;
        konteyner.style.height = (window.innerHeight - headerYuksekligi) + 'px';
        konteyner.style.display = 'block';
    });
}

/**
 * Bir sınav TÜRÜNE (ör. 'lgs', 'bursluluk') ait ders listesini, gerçek bir
 * sınav kaydına ihtiyaç duymadan doğrudan LayoutEngine şablonundan çıkarır.
 * LGS/Bursluluk ders listesi türe göre SABİTTİR (özelleştirilemez), bu
 * yüzden global puan referans ayarları ekranı gibi belirli bir sınava bağlı
 * olmayan yerlerde de kullanılabilir.
 */
function _formTuruDersleriniGetir(sinavTuru) {
    try {
        const layout = window.LayoutEngine.layoutHesapla({ sinavTuru });
        const form   = layout.formlar[0];
        if (form.bolumler) {
            const dersler = [];
            form.bolumler.forEach(b => b.dersSutunlari.forEach(d => {
                dersler.push({ dersAdi: d.dersAdi, soruSayisi: d.sorular.length, sikSayisi: d.sorular[0]?.sikler.length || 4 });
            }));
            return dersler;
        } else if (form.izgara) {
            return [{ dersAdi: 'Genel', soruSayisi: form.izgara.sorular.length, sikSayisi: form.izgara.sorular[0]?.sikler.length || 4 }];
        }
    } catch (e) { console.warn('Ders listesi alınamadı', e); }
    return [{ dersAdi: 'Genel', soruSayisi: 20, sikSayisi: 4 }];
}

/** Sınav A/B (2) kitapçık türü kullanıyor mu — yoksa Tek Kitapçık mı. */
function _sinavKitapcikliMi(sinavId) {
    return DB.sinaviBul(sinavId)?.kitapcikTuruSayisi === 2;
}

/**
 * Bir SONUCUN (öğrencinin kağıdının) doğru cevap anahtarını okumak için
 * kullanılacak kitapçık türünü belirler — YENİ (Ağustos 2026, Sedat
 * isteği: "cevap anahtarı bile farklı kitapçık türüne göre ikili
 * girilmeli"). Sınav tek kitapçıklıysa undefined (eski/tek anahtar).
 * Sınav A/B ise, o SPESİFİK kağıttan OKUNAN kitapcikTuru kullanılır —
 * ekranda o an düzenlenmekte olan sekme DEĞİL (bir öğrencinin sonucunu
 * göstermek/puanlamak her zaman O ÖĞRENCİNİN kağıdından okunan türe göre
 * olmalı).
 */
function _sonucAnahtarTuru(sinavId, ogrenciKitapcikTuru) {
    if (!_sinavKitapcikliMi(sinavId)) return undefined;
    return (ogrenciKitapcikTuru === 'A' || ogrenciKitapcikTuru === 'B') ? ogrenciKitapcikTuru : undefined;
}

/**
 * KÖK NEDEN DÜZELTMESİ (Ağustos 2026, Sedat geri bildirimi: "Kitapçık
 * olmasına rağmen tüm öğrencilerde boş çıktı") — form üretimi için
 * kullanılan öğrenci listeleri kitapcikTuru'yu SABİT boş string ('')
 * olarak atıyordu, sınav A/B kitapçıklı olsa bile. Artık, kitapçıklı bir
 * sınavda, sinav.kitapcikAtamalari'nda (bkz. _kitapcikAtamaSheetAc) o
 * öğrenci için bir atama varsa onu kullanır; yoksa boş bırakır (K
 * baloncuğu öğrenci tarafından elle işaretlenmeli demektir).
 */
function _ogrenciKitapcikTuru(sinav, ogrenciId) {
    if (sinav.kitapcikTuruSayisi !== 2) return '';
    const tur = sinav.kitapcikAtamalari?.[ogrenciId];
    return (tur === 'A' || tur === 'B') ? tur : '';
}

// YENİ (Ağustos 2026, Sedat isteği: "Öğrencilerin kitapçık türü otomatik ve
// manuel atama yapabilme imkanı olsun") — atama sheet'i açıkken üzerinde
// çalışılan TASLAK (Kaydet'e basılana kadar sinav.kitapcikAtamalari
// DEĞİŞMEZ, sheet kapatılıp tekrar açılırsa kaydedilmemiş değişiklikler
// kaybolur — bu kasıtlı, basit ve öngörülebilir bir davranış).
let _kitapcikAtamaTaslak = {};

function _kitapcikAtamaSheetAc() {
    const sinav = DB.sinaviBul(_aktifSinavId);
    if (!sinav) return;
    const tumOgrenciler = _manuelTumOgrenciler();
    const atanmisOgrenciler = tumOgrenciler
        .filter(o => (sinav.ogrenciIdleri || []).includes(o.id))
        .sort((a, b) => (a.sinifAd || '').localeCompare(b.sinifAd || '') || (a.adSoyad || '').localeCompare(b.adSoyad || ''));
    if (!atanmisOgrenciler.length) { alert('Bu sınava henüz öğrenci eklenmemiş.'); return; }

    _kitapcikAtamaTaslak = { ...(sinav.kitapcikAtamalari || {}) };
    _kitapcikAtamaListesiCiz(atanmisOgrenciler);
    sheetAc('sheetKitapcikAtama');
}

function _kitapcikAtamaListesiCiz(atanmisOgrenciler) {
    const alan = document.getElementById('kitapcikAtamaListesi');
    if (!alan) return;
    alan.innerHTML = '';
    atanmisOgrenciler.forEach(o => {
        const satir = document.createElement('div');
        satir.className = 'anahtar-satir';
        const ad = document.createElement('span');
        ad.textContent = `${o.adSoyad || '(isimsiz)'} ${o.sinifAd ? '· ' + o.sinifAd : ''}`;
        ad.style.cssText = 'flex:1; font-size:13px;';
        satir.appendChild(ad);

        const grup = document.createElement('div');
        grup.className = 'sik-grubu';
        ['A', 'B'].forEach(harf => {
            const btn = document.createElement('button');
            btn.type = 'button'; btn.className = 'sik-daire'; btn.textContent = harf;
            if (_kitapcikAtamaTaslak[o.id] === harf) btn.classList.add('anahtar-sec');
            btn.addEventListener('click', () => {
                _kitapcikAtamaTaslak[o.id] = _kitapcikAtamaTaslak[o.id] === harf ? undefined : harf;
                _kitapcikAtamaListesiCiz(atanmisOgrenciler);
            });
            grup.appendChild(btn);
        });
        satir.appendChild(grup);
        alan.appendChild(satir);
    });
}

function _kitapcikOtomatikAta() {
    const sinav = DB.sinaviBul(_aktifSinavId);
    if (!sinav) return;
    const tumOgrenciler = _manuelTumOgrenciler();
    const atanmisOgrenciler = tumOgrenciler
        .filter(o => (sinav.ogrenciIdleri || []).includes(o.id))
        .sort((a, b) => (a.sinifAd || '').localeCompare(b.sinifAd || '') || (a.adSoyad || '').localeCompare(b.adSoyad || ''));
    atanmisOgrenciler.forEach((o, i) => { _kitapcikAtamaTaslak[o.id] = i % 2 === 0 ? 'A' : 'B'; });
    _kitapcikAtamaListesiCiz(atanmisOgrenciler);
}

function _kitapcikAtamaKaydet() {
    const sinav = DB.sinaviBul(_aktifSinavId);
    if (!sinav) return;
    sinav.kitapcikAtamalari = { ..._kitapcikAtamaTaslak };
    DB.sinavKaydet(sinav);
    sheetKapat('sheetKitapcikAtama');
}

function formDersleriniGetir(sinavId) {
    const sinav  = DB.sinaviBul(sinavId);
    const formId = sinav?.optikFormId || 'lgs';
    if (formId === 'ozel') return _ozelSinavDersleriGetir(sinav);
    // KÖK NEDEN DÜZELTMESİ (Sedat sorusu üzerine, Ağustos 2026 — "hangi
    // dersin nerede olduğunu nasıl okuyacak"): bu fonksiyon Optik Form
    // Editörü ile tasarlanmış özel şablonları (id 'ozelTasarim_' ile
    // başlar) HİÇ TANIMIYORDU — formId doğrudan _formTuruDersleriniGetir'e
    // (sadece 'lgs'/'bursluluk' bilir) gidiyordu, cevap anahtarı ve
    // puanlama YANLIŞ/BOŞ ders listesiyle çalışırdı. Artık editördeki
    // GERÇEK baloncuk bloklarından (her biri = bir ders sütunu grubu)
    // ders adı/soru sayısı/şık sayısı çıkarılıyor.
    if (formId.startsWith('ozelTasarim_')) return _ozelTasarimDersleriGetir(formId);
    return _formTuruDersleriniGetir(formId);
}

/**
 * Optik Form Editörü ile tasarlanmış bir şablonun GERÇEK (derlenmiş)
 * baloncuk bloklarından ders listesini çıkarır — cevap anahtarı ekranı ve
 * puanHesapla bunu kullanır. Bir ders birden fazla sütuna bölünmüşse
 * (bkz. optikSablonMotoru.js: baloncukBlokOlustur) TEK bir ders olarak
 * birleştirilir (toplam soru sayısıyla) — çünkü omrEngine sonucunda da
 * hepsi aynı "ders" anahtarı altında birleşik geliyor (bkz.
 * dersSutunuHesapla: baslangicSoruNo düzeltmesi).
 */
function _ozelTasarimDersleriGetir(formId) {
    try {
        const form = sablonDerlemesiniGetir(formId);
        const dersler = [];
        (form.formlar[0].bolumler || []).forEach((bolum) => {
            (bolum.dersSutunlari || []).forEach((sutun) => {
                const mevcut = dersler.find((d) => d.dersAdi === sutun.dersAdi);
                const soruSayisi = sutun.sorular.length;
                const sikSayisi = sutun.sorular[0]?.sikler.length || 4;
                if (mevcut) mevcut.soruSayisi += soruSayisi;
                else dersler.push({ dersAdi: sutun.dersAdi, soruSayisi, sikSayisi });
            });
        });
        return dersler.length ? dersler : [{ dersAdi: 'Genel', soruSayisi: 20, sikSayisi: 4 }];
    } catch (e) {
        console.error('_ozelTasarimDersleriGetir: şablon derlenemedi', e);
        return [{ dersAdi: 'Genel', soruSayisi: 20, sikSayisi: 4 }];
    }
}

/** Özel sınavlar için ders listesi, sınavın KENDİ soru/şık sayısına göre üretilir (sabit şablon değil). */
function _ozelSinavDersleriGetir(sinav) {
    try {
        const layout = window.LayoutEngine.layoutHesapla({
            sinavTuru: 'ozel',
            soruSayisi: sinav?.soruSayisi || 20,
            sikSayisi: sinav?.sikSayisi || 4,
            sayfaDuzeni: 'otomatik',
        });
        const form = layout.formlar[0];
        if (form.izgara) {
            return [{ dersAdi: 'Genel', soruSayisi: form.izgara.sorular.length, sikSayisi: form.izgara.sorular[0]?.sikler.length || 4 }];
        }
    } catch (e) { console.warn('Özel sınav ders listesi alınamadı', e); }
    return [{ dersAdi: 'Genel', soruSayisi: sinav?.soruSayisi || 20, sikSayisi: sinav?.sikSayisi || 4 }];
}

// ════════════════════════════════════════════════════════════════
// ANA UYGULAMA VERİ KAYNAĞI (ana okul uygulamasından)
// ════════════════════════════════════════════════════════════════
function veriKaynagi() {
    try { if (window.parent !== window && window.parent.OptikVeriKaynagi) return window.parent.OptikVeriKaynagi; } catch {}
    return null;
}

/**
 * YENİ (Ağustos 2026, Sedat isteği: "kimlik bilgilerinde... okul adını da
 * ekleyebilme olsun") — okul adını ana uygulamanın OptikVeriKaynagi
 * köprüsünden almaya çalışır. NOT: bu köprü şu an (Ağustos 2026 itibarıyla)
 * okulAdiGetir() metodunu SAĞLAMIYOR OLABİLİR — ana uygulama tarafında
 * ayrıca eklenmesi gerekebilir; o zamana kadar bu güvenli bir şekilde boş
 * döner (form kırılmaz, sadece okul adı alanı boş basılır).
 */
function _okulAdiGetir() {
    try { return veriKaynagi()?.okulAdiGetir?.() || ''; } catch { return ''; }
}

// ════════════════════════════════════════════════════════════════
// NAVİGASYON
// ════════════════════════════════════════════════════════════════
let _aktifSinavId = null;
let _aktifSonucId = null;

/**
 * KÖK NEDEN DÜZELTMESİ (Ağustos 2026, Sedat'ın "Bu formların okunması nasıl
 * olacak" sorusu üzerine bulundu): gerçek okuma akışı (formOkuyucu.js:
 * testFormunuOlustur) daha önce olmayan bir #sinavTuru DOM seçim kutusuna
 * bakıyordu — yani HER ZAMAN sessizce LGS'ye düşüyordu, aktif sınav ne
 * olursa olsun (Bursluluk, sabit-Özel, editörle tasarlanmış özel şablon
 * dahil). NOT: window.OptikAktifSinavTuru adında BENZER bir köprü daha
 * önce eklenmişti ama hiçbir yerden hiç ÇAĞRILMIYORDU — yarım kalmış bir
 * düzeltme girişimiydi, kaldırılıp yerine bu tam çalışan köprü kondu.
 *
 * Bu fonksiyon window.OptikAktifForm'u aktif sınavın GERÇEK, önceden
 * DERLENMİŞ form nesnesiyle (_layoutGetir ile — LGS/Bursluluk/Özel-sabit/
 * editörle tasarlanmış özel şablon FARK ETMEKSİZİN aynı kod yolu) doldurur.
 * _aktifSinavId her değiştiğinde çağrılmalı.
 */
function _optikAktifFormGuncelle() {
    const sinav = DB.sinaviBul(_aktifSinavId);
    if (!sinav) { window.OptikAktifForm = null; return; }
    try {
        const layout = _layoutGetir(sinav);
        window.OptikAktifForm = { form: layout.formlar[0], sinavTuru: sinav.optikFormId || 'lgs' };
    } catch (e) {
        console.error('_optikAktifFormGuncelle: form derlenemedi', e);
        window.OptikAktifForm = null;
    }
}

const Ekranlar = {
    sinavlar:     document.getElementById('ekranSinavlar'),
    yeniSinav:    document.getElementById('ekranYeniSinav'),
    sinavDetay:   document.getElementById('ekranSinavDetay'),
    ogrDetay:     document.getElementById('ekranOgrDetay'),
    optikOlustur: document.getElementById('ekranOptikOlustur'),
    manuelKagit:  document.getElementById('ekranManuelKagit'),
    lgsPuan:      document.getElementById('ekranLgsPuan'),
    sablonEditor: document.getElementById('ekranSablonEditor'),
};

function ekranGit(id) {
    Object.values(Ekranlar).forEach(e => e?.classList.remove('aktif'));
    Ekranlar[id]?.classList.add('aktif');
}

// ════════════════════════════════════════════════════════════════
// GERİ TUŞU KÖPRÜSÜ (ana uygulamadan çağrılır — bkz. js/app.js
// geriTusuIsle, js/optik-entegrasyon.js). Telefonun donanım geri
// tuşuna basılınca Optik aracının TAMAMINI kapatmak yerine, önce
// kendi iç durumunu (köşe seçimi/ayarlar/sheet/kamera/alt ekran)
// bir kademe geri alır; hiçbir iç durum kalmadığında false döner
// ve üst uygulama tüm aracı kapatır.
// ════════════════════════════════════════════════════════════════
const _EKRAN_USTU = {
    yeniSinav: 'sinavlar',
    sinavDetay: 'sinavlar',
    ogrDetay: 'sinavDetay',
    optikOlustur: 'sinavDetay',
    manuelKagit: 'sinavDetay',
    lgsPuan: 'sinavDetay',
    sablonEditor: 'yeniSinav',
};

function _aktifEkranId() {
    for (const id in Ekranlar) {
        if (Ekranlar[id]?.classList.contains('aktif')) return id;
    }
    return null;
}

window.optikGeriTusuIsle = function () {
    // 1) Köşe seçim ekranı (manuel köşe düzeltme) açıksa onu kapat.
    const koseAlani = document.getElementById('koseSecimAlani');
    if (koseAlani && koseAlani.style.display !== 'none') {
        const iptalBtn = document.getElementById('koseIptal');
        if (iptalBtn) iptalBtn.click(); else koseAlani.style.display = 'none';
        return true;
    }

    // 2) Kamera ayarlar sheet'i açıksa kapat.
    const ayarSheet = document.getElementById('kameraAyarSheet');
    if (ayarSheet && !ayarSheet.hidden) { ayarSheet.hidden = true; return true; }

    // 3) Canlı tarama sonuç kartı gösteriliyorsa kapat.
    const kart = document.getElementById('canliSonucKart');
    if (kart && !kart.hidden) { kart.hidden = true; return true; }

    // 4) Herhangi bir bottom-sheet (Kağıt Ekle, Form Seç, Onay) açıksa kapat.
    const acikSheet = document.querySelector('.bs-overlay:not([hidden])');
    if (acikSheet) { acikSheet.hidden = true; return true; }

    // 5) Kamera ekranı açıksa (tarama modundaysa) kamerayı kapat — bir
    //    önceki ekrana (genelde sınav detayı) döner.
    const kameraOv = document.getElementById('kameraOverlay');
    if (kameraOv && !kameraOv.hidden) {
        if (typeof kameraKapat === 'function') kameraKapat();
        return true;
    }

    // 6) Kök olmayan bir ekrandaysa bir üst ekrana dön.
    const aktif = _aktifEkranId();
    if (aktif && aktif !== 'sinavlar' && _EKRAN_USTU[aktif]) {
        ekranGit(_EKRAN_USTU[aktif]);
        return true;
    }

    // 7) Kökteyiz (sınav listesi, hiçbir şey açık değil) — üst uygulama
    //    tüm Optik aracını kapatsın.
    return false;
};

// ════════════════════════════════════════════════════════════════
// EKRAN 1 — SINAVLAR LİSTESİ
// ════════════════════════════════════════════════════════════════
function sinavlariRender() {
    const liste = DB.sinavlariGetir();
    const bosEl = document.getElementById('sinavBosAlan');
    const listEl = document.getElementById('sinavListesi');
    if (!listEl) return;
    bosEl.style.display = liste.length ? 'none' : 'flex';
    listEl.innerHTML = liste.map(s => {
        const sonuclar = DB.sonuclariGetir(s.id);
        const okunduSayisi = sonuclar.length;
        const badge = okunduSayisi > 0
            ? `<span class="durum-badge badge-okundu">OKUNDU (${okunduSayisi})</span>`
            : `<span class="durum-badge badge-bekliyor">BEKLİYOR</span>`;
        const ikonRenk = okunduSayisi > 0 ? '#E8F5E9' : '#FFF3E0';
        const ikonRenkS = okunduSayisi > 0 ? '#2E7D32' : '#E65100';
        return `<div class="sinav-kart" data-id="${s.id}">
            <div class="sinav-kart-ikon" style="background:${ikonRenk};">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${ikonRenkS}" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <div class="sinav-kart-bilgi">
                <span class="sinav-kart-ad">${_h(s.ad)}</span>
                <small class="sinav-kart-alt">${s.optikFormAd || ''} · ${_tarih(s.olusturma)}</small>
            </div>
            ${badge}
            <button class="menu-btn" data-id="${s.id}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
            </button>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.sinav-kart').forEach(kart => {
        kart.addEventListener('click', e => {
            if (e.target.closest('.menu-btn')) return;
            sinavDetayAc(kart.dataset.id);
        });
    });
    listEl.querySelectorAll('.menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const s = DB.sinaviBul(btn.dataset.id);
            if (!s) return;
            sheetOnay(`"${s.ad}" sınavını sil?`, `Bu işlem geri alınamaz.`, () => {
                DB.sinaviSil(btn.dataset.id);
                sinavlariRender();
            });
        });
    });
}

// ════════════════════════════════════════════════════════════════
// EKRAN 2 — YENİ SINAV
// ════════════════════════════════════════════════════════════════
let _ysSablonSecilen = null;

function yeniSinavAc() {
    _ysSablonSecilen = null;
    document.getElementById('ysSinavAd').value = '';
    document.getElementById('ysOptikFormAdi').textContent = 'Form seçin...';
    document.getElementById('ysOptikFormAdi').style.color = 'var(--text-faint)';
    const ozelBlok = document.getElementById('ysOzelAyarBlok');
    if (ozelBlok) ozelBlok.hidden = true;
    const ozelSoru = document.getElementById('ysOzelSoruSayisi');
    if (ozelSoru) ozelSoru.value = '';
    const ozelYanlis = document.getElementById('ysYanlisEtkisi');
    if (ozelYanlis) ozelYanlis.value = '0';
    const ktSayisi = document.getElementById('ysKitapcikTuruSayisi');
    if (ktSayisi) ktSayisi.value = '1';
    // YENİ (Ağustos 2026): Sedat isteği — kaydedilmiş bir varsayılan optik
    // form varsa, "Yeni Sınav" ekranı her açıldığında otomatik seçili gelsin
    // (tekrar tekrar aynı formu seçmek zorunda kalmasın).
    const varsayilanId = DB.varsayilanSablonIdGetir();
    if (varsayilanId) {
        try {
            const form = sablonDerlemesiniGetir(varsayilanId);
            const kayit = DB.ozelSablonBul(varsayilanId);
            const ad = kayit ? kayit.ad : (sablonBul(varsayilanId) || {}).ad;
            if (ad) {
                _ysSablonSecilen = { id: varsayilanId, ad, soruSayisi: form.soruSayisi, sikSayisi: form.sikSayisi };
                const metEl = document.getElementById('ysOptikFormAdi');
                metEl.textContent = `${ad} (${form.soruSayisi} Soru)`;
                metEl.style.color = 'var(--text)';
            }
        } catch (e) {
            // Varsayılan olarak işaretlenen şablon silinmiş olabilir — sessizce yok say, kullanıcı elle seçer.
        }
    }
    _ogrenciSeciminiRender();
    _ogrenciSecimOzetiGuncelle();
    ekranGit('yeniSinav');
}

function _ogrenciSeciminiRender() {
    const kap = document.getElementById('ysOgrenciSecimAlani');
    if (!kap) return;
    const kaynak = veriKaynagi();
    if (!kaynak) {
        kap.innerHTML = '<p class="ogr-secim-bilgi">Uygulama içinden açıldığında öğrenci seçimi aktif olur.</p>';
        return;
    }
    const siniflar = kaynak.siniflarGetir();
    kap.innerHTML = siniflar.map(s => {
        const ogrenciler = kaynak.ogrencilerGetir(s.id);
        return `<div class="sinif-grup">
            <div class="sinif-baslik" data-sinif="${s.id}">
                <input type="checkbox" class="sinif-cb" data-sinif="${s.id}" id="sinifCb_${s.id}">
                <label for="sinifCb_${s.id}" style="flex:1;cursor:pointer;">
                    <strong>${_h(s.ad)}</strong>
                </label>
                <small>${ogrenciler.length} öğrenci</small>
                <svg width="16" height="16" class="sinif-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div class="ogr-secim-listesi-kap" id="ogrListeKap_${s.id}">
                ${ogrenciler.map(o => `
                    <div class="ogr-secim-satir">
                        <input type="checkbox" class="sinif-cb ogr-cb" id="ogrCb_${o.id}" data-sinif="${s.id}" data-ogr="${o.id}" style="accent-color:var(--accent);">
                        <label for="ogrCb_${o.id}" style="flex:1;cursor:pointer;">${_h(o.adSoyad)}</label>
                        <small>${o.ogrenciNo || ''}</small>
                    </div>`).join('')}
            </div>
        </div>`;
    }).join('');

    // Sınıf toggle
    kap.querySelectorAll('.sinif-baslik').forEach(baslik => {
        baslik.addEventListener('click', e => {
            if (e.target.classList.contains('sinif-cb') || e.target.tagName === 'LABEL') return;
            const sinifId = baslik.dataset.sinif;
            const listKap = document.getElementById('ogrListeKap_' + sinifId);
            listKap?.classList.toggle('acik');
        });
    });
    // Sınıf checkbox → tüm öğrencileri seç
    kap.querySelectorAll('.sinif-cb[data-sinif]').forEach(cb => {
        if (cb.dataset.ogr) return;
        cb.addEventListener('change', () => {
            const sinifId = cb.dataset.sinif;
            kap.querySelectorAll(`.ogr-cb[data-sinif="${sinifId}"]`).forEach(oCb => oCb.checked = cb.checked);
        });
    });
}

function _seciliOgrIdleri() {
    const kap = document.getElementById('ysOgrenciSecimAlani');
    return [...kap.querySelectorAll('.ogr-cb:checked')].map(cb => cb.dataset.ogr);
}

/** "Öğrenciler" özet düğmesinin metnini seçili öğrenci/sınıf sayısına göre günceller. */
function _ogrenciSecimOzetiGuncelle() {
    const ozelEl = document.getElementById('ysOgrenciSecOzet');
    if (!ozelEl) return;
    const kap = document.getElementById('ysOgrenciSecimAlani');
    const seciliCb = kap ? [...kap.querySelectorAll('.ogr-cb:checked')] : [];
    if (!seciliCb.length) {
        ozelEl.textContent = 'Öğrenci seçin...';
        ozelEl.style.color = 'var(--text-faint)';
        return;
    }
    const siniflar = new Set(seciliCb.map(cb => cb.dataset.sinif));
    ozelEl.textContent = `${seciliCb.length} öğrenci` + (siniflar.size > 1 ? ` (${siniflar.size} sınıf)` : '');
    ozelEl.style.color = 'var(--text)';
}

function yeniSinavKaydet() {
    const ad = document.getElementById('ysSinavAd').value.trim();
    if (!ad) { alert('Sınav adı gerekli!'); return; }
    if (!_ysSablonSecilen) { alert('Optik form seçin!'); return; }

    let soruSayisi = _ysSablonSecilen.soruSayisi;
    let sikSayisi  = _ysSablonSecilen.sikSayisi;

    // Yanlış cevap etkisi sınav türünden BAĞIMSIZ, her zaman ekrandaki
    // seçiciden okunuyor (varsayılan/seçili değer 0 — Etkisiz).
    const yEtki = parseInt(document.getElementById('ysYanlisEtkisi')?.value, 10);
    let yanlisKatsayisi = Number.isFinite(yEtki) && yEtki > 0 ? yEtki : null;
    const kitapcikTuruSayisi = parseInt(document.getElementById('ysKitapcikTuruSayisi')?.value, 10) === 2 ? 2 : 1;

    if (_ysSablonSecilen.id === 'ozel') {
        soruSayisi = parseInt(document.getElementById('ysOzelSoruSayisi')?.value, 10) || 20;
        sikSayisi = parseInt(document.getElementById('ysOzelSikSayisi')?.value, 10) || 4;

        // Soru sayısı artık sabit, önceden test edilmiş seçeneklerden geliyor
        // (bkz. index.html ysOzelSoruSayisi) — bu kontrol yalnızca bir
        // güvenlik ağı, normal koşulda hiç tetiklenmemesi beklenir.
        try {
            window.LayoutEngine?.sayfaDuzeniOner(soruSayisi, sikSayisi);
        } catch (e) {
            alert(`${soruSayisi} soru / ${sikSayisi} şık bu düzende desteklenmiyor. Farklı bir şık sayısı deneyin.`);
            return;
        }
    }

    const sinav = {
        id:           'sinav_' + Date.now(),
        ad,
        optikFormId:  _ysSablonSecilen.id,
        optikFormAd:  _ysSablonSecilen.ad,
        soruSayisi,
        sikSayisi,
        yanlisKatsayisi,
        kitapcikTuruSayisi,
        ogrenciIdleri: _seciliOgrIdleri(),
        olusturma:    new Date().toISOString(),
    };
    DB.sinavKaydet(sinav);
    sinavlariRender();
    sinavDetayAc(sinav.id);
}

// ════════════════════════════════════════════════════════════════
// EKRAN 3 — SINAV DETAY
// ════════════════════════════════════════════════════════════════
function sinavDetayAc(sinavId) {
    _aktifSinavId = sinavId;
    _optikAktifFormGuncelle();
    const sinav = DB.sinaviBul(sinavId);
    if (!sinav) return;
    document.getElementById('sinavDetayBaslik').textContent = sinav.ad;
    // form adını kamera başlığına yaz
    const kFAdi = document.getElementById('kameraFormAdi');
    if (kFAdi) kFAdi.textContent = sinav.optikFormAd || sinav.optikFormId;
    const kmAdi = document.getElementById('kmFormAdi');
    if (kmAdi) kmAdi.textContent = sinav.optikFormAd || sinav.optikFormId;
    // Sınav türü hidden input (eski engine uyumluluğu)
    let stEl = document.getElementById('sinavTuru');
    if (!stEl) { stEl = document.createElement('input'); stEl.type='hidden'; stEl.id='sinavTuru'; document.body.appendChild(stEl); }
    stEl.value = sinav.optikFormId || 'lgs';
    let ssEl = document.getElementById('soruSayisi');
    if (!ssEl) { ssEl = document.createElement('input'); ssEl.type='hidden'; ssEl.id='soruSayisi'; document.body.appendChild(ssEl); }
    ssEl.value = sinav.soruSayisi || 90;
    _s('raporLgsEtiket', sinav.optikFormId === 'bursluluk' ? 'İOKBS (Bursluluk) Puanı' : 'LGS Puanı');

    sekmeAktiflestir('kagitlar');
    kagitlariRender();
    anahtarPaneliniRender();
    ekranGit('sinavDetay');
}

// Sekme sistemi
let _aktifSekme = 'kagitlar';
function sekmeAktiflestir(sekme) {
    _aktifSekme = sekme;
    document.querySelectorAll('#sekmeBar .sekme').forEach(b =>
        b.classList.toggle('aktif', b.dataset.sekme === sekme)
    );
    document.querySelectorAll('.sekme-panel').forEach(p =>
        p.classList.toggle('aktif', p.id === 'panel' + sekme.charAt(0).toUpperCase() + sekme.slice(1))
    );
    // FAB görünürlüğü
    const fabKume = document.getElementById('kagitFabKume');
    if (fabKume) fabKume.style.display = sekme === 'kagitlar' ? 'flex' : 'none';
}

// ════════════════════════════════════════════════════════════════
// KAĞITLAR SEKMESİ
// ════════════════════════════════════════════════════════════════
let _kagitFiltreSinif = '';

function kagitlariRender() {
    if (!_aktifSinavId) return;
    const sonuclar = DB.sonuclariGetir(_aktifSinavId);
    const bosEl    = document.getElementById('kagitBosAlan');
    const listEl   = document.getElementById('kagitListesi');
    const sinav    = DB.sinaviBul(_aktifSinavId);
    if (!listEl) return;

    // Sınıf filtre chip'leri
    const siniflar = [...new Set(sonuclar.map(r => r.ogrenci?.sinif).filter(Boolean))].sort();
    const chipKap  = document.getElementById('kagitSinifFiltre');
    if (chipKap) {
        chipKap.innerHTML = `<button class="chip ${_kagitFiltreSinif===''?'aktif':''}" data-sinif="">Tümü ${sonuclar.length}</button>` +
            siniflar.map(s => `<button class="chip ${_kagitFiltreSinif===s?'aktif':''}" data-sinif="${_h(s)}">${_h(s)} ${sonuclar.filter(r=>r.ogrenci?.sinif===s).length}</button>`).join('');
        chipKap.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
            _kagitFiltreSinif = c.dataset.sinif;
            kagitlariRender();
        }));
    }

    // Arama
    const aramaEl = document.getElementById('kagitArama');
    if (aramaEl && !aramaEl._bound) {
        aramaEl._bound = true;
        aramaEl.addEventListener('input', kagitlariRender);
    }
    const aramaMetni = aramaEl?.value.trim().toLocaleLowerCase('tr') || '';

    let liste = sonuclar;
    if (_kagitFiltreSinif) liste = liste.filter(r => r.ogrenci?.sinif === _kagitFiltreSinif);
    if (aramaMetni) liste = liste.filter(r =>
        (r.ogrenci?.adSoyad || '').toLocaleLowerCase('tr').includes(aramaMetni) ||
        (r.ogrenci?.ogrenciNo || '').includes(aramaMetni) ||
        (r.ogrenci?.sinif || '').toLocaleLowerCase('tr').includes(aramaMetni)
    );

    bosEl.style.display = sonuclar.length === 0 ? 'flex' : 'none';
    if (sonuclar.length === 0) { listEl.innerHTML = ''; return; }

    const RENKLER = ['#1565C0','#2E7D32','#E65100','#6A1B9A','#00695C','#C62828'];
    const formAd  = sinav?.optikFormAd || 'Puan';
    const sinavTuru = sinav?.optikFormId; // 'lgs' | 'bursluluk' | 'ozel' | ...

    // Puanı sınav türüne göre hesapla: LGS'de sabit formül, Bursluluk'ta
    // resmî İOKBS (TASP) yöntemi — ikisi dışındaki (ör. "özel", az sorulu
    // bir test) formlarda hiçbir puan formülü GEÇERLİ DEĞİL, bu yüzden
    // puan gösterilmez (yalnızca D/Y/B/N görünür).
    const puanMap = {}; // sonucId -> puan (number) | undefined
    const puanYontemMap = {}; // sonucId -> 'resmi' | 'tek-ogrenci-tahmini' (yalnızca bursluluk)
    if (sinavTuru === 'lgs') {
        sonuclar.forEach(r => {
            const sonuc = window.LgsPuanHesapla?.sabitFormulPuanHesapla(r.puan?.dersDetay || []);
            if (sonuc) puanMap[r.id] = sonuc.puan;
        });
    } else if (sinavTuru === 'bursluluk') {
        const dersler = formDersleriniGetir(_aktifSinavId);
        const harici = _lgsHariciVeriyiHazirla('bursluluk');
        const rapor = window.LgsPuanHesapla?.sinavRaporuHesapla(sonuclar, dersler, harici, 'bursluluk');
        (rapor?.ogrenciler || []).forEach(o => { puanMap[o.sonucId] = o.msp; puanYontemMap[o.sonucId] = o.mspYontemi; });
    }

    // Puana göre büyükten küçüğe sırala (puanı olmayanlar — ör. özel form
    // ya da henüz hesaplanamamış kayıtlar — listenin sonuna düşer).
    liste = liste.slice().sort((a, b) => {
        const pa = puanMap[a.id], pb = puanMap[b.id];
        if (pa == null && pb == null) return 0;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return pb - pa;
    });

    listEl.innerHTML = liste.map((r, i) => {
        const ogr   = r.ogrenci || {};
        const ad    = ogr.adSoyad || '(isimsiz)';
        const harf1 = ad[0]?.toUpperCase() || '?';
        const harf2 = ad.split(' ')[1]?.[0]?.toUpperCase() || '';
        const renk  = RENKLER[i % RENKLER.length];
        const p     = r.puan || {};

        const puan = puanMap[r.id];
        const tahminiMi = puanYontemMap[r.id] === 'tek-ogrenci-tahmini';
        const puanBadgeHtml = puan != null
            ? (() => {
                const puanSinif = puan >= 350 ? 'puan-yuksek' : puan >= 250 ? 'puan-orta' : 'puan-dusuk';
                return `<span class="puan-badge ${puanSinif}" ${tahminiMi ? 'title="Standardizasyon tanımsız (tek öğrenci) — net oranına dayalı yaklaşık puan, resmi MEB puanı değildir."' : ''}>
                    <span class="puan-badge-sayi">${puan.toFixed(1)}${tahminiMi ? ' *' : ''}</span>
                    <span class="puan-badge-ad">${_h(formAd)}${tahminiMi ? ' (tahmini)' : ''}</span>
                </span>`;
            })()
            : '';

        // D/Y/B/N — net, puanHesapla() tarafından sınavın kendi yanlış cevap
        // katsayısıyla (bkz. _sinavYanlisKatsayisi) zaten hesaplanmış hâliyle.
        const d = p.toplamD || 0, y = p.toplamY || 0, b = p.toplamB || 0;
        const net = (p.toplamNet != null ? p.toplamNet : (d - y / 3)).toFixed(2);

        return `<div class="kagit-kart" data-id="${r.id}">
            <div class="kagit-avatar" style="background:${renk};">${harf1}${harf2}</div>
            <div class="kagit-bilgi">
                <span class="kagit-ad">${_h(ad)}</span>
                <small class="kagit-alt">${_h(ogr.sinif||'')} · ${_h(ogr.ogrenciNo||'—')}</small>
                <div class="kagit-dvb">
                    <span class="kagit-dvb-d">D:${d}</span>
                    <span class="kagit-dvb-y">Y:${y}</span>
                    <span class="kagit-dvb-b">B:${b}</span>
                    <span class="kagit-dvb-n">N:${net}</span>
                </div>
            </div>
            ${puanBadgeHtml}
            <button class="menu-btn" data-id="${r.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
            </button>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.kagit-kart').forEach(kart => {
        kart.addEventListener('click', e => {
            if (e.target.closest('.menu-btn')) return;
            ogrDetayAc(kart.dataset.id);
        });
    });
    listEl.querySelectorAll('.menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const r = DB.sonuclariGetir(_aktifSinavId).find(x => x.id === btn.dataset.id);
            sheetOnay(`"${r?.ogrenci?.adSoyad || 'Bu kayıt'}" silinsin mi?`, 'Bu işlem geri alınamaz.', () => {
                DB.sonucSil(_aktifSinavId, btn.dataset.id);
                kagitlariRender();
            });
        });
    });
}

// ════════════════════════════════════════════════════════════════
// ÖĞRENCİ / KAĞIT DETAY
// ════════════════════════════════════════════════════════════════
let _ogrDetayDersler = [];

function ogrDetayAc(sonucId) {
    _aktifSonucId = sonucId;
    const sonuc = DB.sonuclariGetir(_aktifSinavId).find(s => s.id === sonucId);
    if (!sonuc) return;

    const ogr = sonuc.ogrenci || {};
    document.getElementById('ogrDetayAd').textContent     = ogr.adSoyad || 'Kağıt Detayı';
    document.getElementById('ogrDetayAdSoyad').value = ogr.adSoyad || '';
    document.getElementById('ogrDetayNo').value      = ogr.ogrenciNo || '';
    document.getElementById('ogrDetaySinif').value   = ogr.sinif || '';
    // YENİ (Ağustos 2026): kitapçık türü, sadece A/B kitapçıklı sınavlarda gösterilir.
    const ktWrap = document.getElementById('ogrDetayKitapcikWrap');
    if (ktWrap) {
        const kitapcikli = _sinavKitapcikliMi(_aktifSinavId);
        ktWrap.hidden = !kitapcikli;
        if (kitapcikli) document.getElementById('ogrDetayKitapcik').value = (ogr.kitapcikTuru === 'A' || ogr.kitapcikTuru === 'B') ? ogr.kitapcikTuru : '';
    }

    // Resim (doğru/yanlış baloncuk renklendirmeli)
    ogrDetayResimCiz(sonuc);

    // GEÇİCİ TEŞHİS: bu kutu normalde kullanıcıya gösterilmiyordu (sadece
    // iç teşhis amaçlıydı, sonuc.uyarilar verisi hep kaydediliyordu — sadece
    // ekranda gizliydi). Optik okuma sorununu teşhis etmek için ŞİMDİLİK
    // tekrar gösteriliyor; sorun bulununca bu blok eski haline
    // (display:none + içerik boş) döndürülmeli.
    const uyariKutusu = document.getElementById('ogrDetayUyarilar');
    if (uyariKutusu) {
        uyariKutusu.textContent = (sonuc.uyarilar || []).join('\n') || '(uyarı yok)';
        uyariKutusu.style.display = 'block';
    }


    // Ders listesi
    _ogrDetayDersler = formDersleriniGetir(_aktifSinavId);
    const dersSecici = document.getElementById('ogrDetayDers');
    dersSecici.innerHTML = _ogrDetayDersler.map((d, i) => `<option value="${i}">${d.dersAdi}</option>`).join('');
    dersSecici.selectedIndex = 0;
    ogrDetayIzgaraCiz(sonuc);
    ogrDetayIstatistikGuncelle(sonuc);

    // İçerik/Resim sekme sıfırla
    document.querySelectorAll('.ir-sekme').forEach(b => b.classList.toggle('aktif', b.dataset.ir === 'icerik'));
    document.getElementById('irIcerik').classList.add('aktif');
    document.getElementById('irResim').classList.remove('aktif');

    ekranGit('ogrDetay');
}

/**
 * "Resim" sekmesinde taranan kağıt görüntüsünün ÜZERİNE, öğrencinin
 * işaretlediği/doğru cevabın hangi baloncuk olduğunu gösteren yarı
 * saydam renkli daireler çizer:
 *   - Yeşil: işaretlenen şık doğru
 *   - Kırmızı: işaretlenen şık yanlış
 *   - Sarı: yanlış (veya boş) cevaplı sorularda doğru şıkkın kendisi
 * "İçerik" sekmesindeki renklendirmeyle aynı mantığı kullanır.
 *
 * Baloncuk piksel koordinatları (sonuc.baloncukNoktalari) sadece bu
 * güncellemeden SONRA taranan kağıtlarda mevcuttur — eski kayıtlarda
 * yoksa düz görüntü gösterilir.
 * @param {object} sonuc
 */
function ogrDetayResimCiz(sonuc) {
    const resimAl = document.getElementById('ogrDetayResimAlani');
    if (!resimAl) return;

    if (!sonuc.kagitGoruntusu) {
        resimAl.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-faint);">Görüntü yok</div>';
        return;
    }

    if (!sonuc.baloncukNoktalari || !sonuc.baloncukNoktalari.length) {
        // Bu güncellemeden ÖNCE taranmış eski bir kayıt — baloncuk
        // koordinatı yok, düz görüntü göster.
        resimAl.innerHTML = `<img src="${sonuc.kagitGoruntusu}" alt="Taranan kağıt">`;
        return;
    }

    const anahtar = DB.anahtariGetir(_aktifSinavId, _sonucAnahtarTuru(_aktifSinavId, sonuc.ogrenci?.kitapcikTuru));
    const dogruMapTum = {}; // "dersAdi|soruNo" -> doğru harf
    (anahtar.dersler || []).forEach(d => {
        (d.anahtarlar || []).forEach(a => { dogruMapTum[d.dersAdi + '|' + a.soruNo] = a.dogru; });
    });

    const cevaplar = sonuc.cevaplar || {};
    const kagitGoruntusu = sonuc.kagitGoruntusu;
    const baloncukNoktalari = sonuc.baloncukNoktalari;

    const img = new Image();
    img.onload = () => {
        // Ekran arada başka bir öğrenciye geçmiş olabilir — geç gelen
        // yükleme eski görüntüyü üzerine çizmesin.
        if (sonuc.id !== _aktifSonucId) return;

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        baloncukNoktalari.forEach(soru => {
            const dogruHarf = dogruMapTum[soru.ders + '|' + soru.soruNo];
            if (!dogruHarf) return; // bu soru için cevap anahtarı girilmemiş
            const isaretli = (cevaplar[soru.ders] || {})[soru.soruNo] || null;

            soru.sikler.forEach(sik => {
                let renk = null;
                if (isaretli && sik.harf === isaretli) {
                    renk = (isaretli === dogruHarf) ? 'rgba(76,175,80,0.55)' : 'rgba(244,67,54,0.55)';
                } else if (sik.harf === dogruHarf && isaretli !== dogruHarf) {
                    renk = 'rgba(255,193,7,0.6)'; // doğru cevap işareti (sarı)
                }
                if (!renk) return;
                ctx.beginPath();
                ctx.arc(sik.x, sik.y, sik.r, 0, Math.PI * 2);
                ctx.fillStyle = renk;
                ctx.fill();
            });
        });

        resimAl.innerHTML = '';
        resimAl.appendChild(canvas);
    };
    img.onerror = () => {
        resimAl.innerHTML = `<img src="${kagitGoruntusu}" alt="Taranan kağıt">`;
    };
    img.src = kagitGoruntusu;
}

/**
 * "Resim" sekmesindeki kağıt görüntüsüne (öğrenci detayında dokununca)
 * tam ekran, iki parmakla yakınlaştırılabilir/kaydırılabilir bir
 * görüntüleyici açar — js/duyurular.js'deki duyuruLightboxAcById ile
 * AYNI pinch-zoom/pan deseni (tek görsel, ok/sayaç yok).
 * @param {string} kaynakUrl - img.src ya da canvas.toDataURL() çıktısı
 */
function ogrDetayResimBuyutAc(kaynakUrl) {
    if (!kaynakUrl) return;
    const eski = document.getElementById('ogrResimBuyutOverlay');
    if (eski) eski.remove();

    const ov = document.createElement('div');
    ov.id = 'ogrResimBuyutOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:999998;background:rgba(0,0,0,.92);display:flex;flex-direction:column;';
    ov.innerHTML = `
      <div style="display:flex;justify-content:flex-end;padding:10px;">
        <button id="orbKapat" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:20px;width:36px;height:36px;font-size:18px;cursor:pointer;">✕</button>
      </div>
      <div id="orbGovde" style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;touch-action:none;">
        <img id="orbResim" src="${kaynakUrl}" style="max-width:92%;max-height:92%;object-fit:contain;border-radius:6px;transform-origin:center center;">
      </div>
      <div style="text-align:center;color:rgba(255,255,255,.6);padding:10px;font-size:12px;">İki parmakla yakınlaştırın</div>
    `;
    document.body.appendChild(ov);

    ov.querySelector('#orbKapat').onclick = () => ov.remove();

    let zoom = 1, panX = 0, panY = 0;
    const resimEl = ov.querySelector('#orbResim');
    function transformUygula() {
        resimEl.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    }

    let baslangicX = null, baslangicY = null;
    let surukleniyor = false, panBaslX = 0, panBaslY = 0;
    let pinchBaslangic = 0, zoomBaslangic = 1;
    const govdeEl = ov.querySelector('#orbGovde');
    // DÜZELTME: pinch bitip iki parmak art arda kalkınca (her biri kendi
    // touchend'ini "changedTouches.length===1" ile tetikler) bu YANLIŞLIKLA
    // çift-dokunuş sanılıp zoom sıfırlanıyordu (yakınlaştırıp bırakınca eski
    // haline dönme hatası). Artık çift-dokunuş SADECE tüm temas süresince
    // tek parmak kalmış VE neredeyse hiç hareket etmemiş gerçek bir
    // dokunuşta değerlendiriliyor.
    let dokunmaBirDegdi = false, dokunmaBasX = 0, dokunmaBasY = 0, coklu = false;
    let sonDokunma = 0;

    function mesafe(t1, t2) {
        const dx = t1.clientX - t2.clientX, dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    govdeEl.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            coklu = true;
            pinchBaslangic = mesafe(e.touches[0], e.touches[1]);
            zoomBaslangic = zoom;
            surukleniyor = false;
        } else if (e.touches.length === 1) {
            coklu = false;
            dokunmaBirDegdi = true;
            dokunmaBasX = e.touches[0].clientX; dokunmaBasY = e.touches[0].clientY;
            if (zoom > 1.02) {
                surukleniyor = true;
                baslangicX = e.touches[0].clientX;
                baslangicY = e.touches[0].clientY;
                panBaslX = panX; panBaslY = panY;
            }
        }
    }, { passive: true });

    govdeEl.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            const m = mesafe(e.touches[0], e.touches[1]);
            // Pinch bittiğinde otomatik sıfırlama YOK — kullanıcı elini
            // çekene kadar yakınlaşmış halde kalır.
            zoom = Math.min(4, Math.max(1, zoomBaslangic * (m / pinchBaslangic)));
            transformUygula();
        } else if (e.touches.length === 1) {
            if (Math.abs(e.touches[0].clientX-dokunmaBasX) > 10 || Math.abs(e.touches[0].clientY-dokunmaBasY) > 10) dokunmaBirDegdi = false;
            if (surukleniyor) {
                panX = panBaslX + (e.touches[0].clientX - baslangicX);
                panY = panBaslY + (e.touches[0].clientY - baslangicY);
                transformUygula();
            }
        }
    }, { passive: true });

    govdeEl.addEventListener('touchend', (e) => {
        surukleniyor = false;
        if (e.touches.length > 0) return; // hâlâ parmak varsa (pinch'ten tek parmağa geçiş), değerlendirme sonraya
        if (dokunmaBirDegdi && !coklu) {
            const simdi = Date.now();
            if (simdi - sonDokunma < 300) {
                zoom = zoom > 1.02 ? 1 : 2.2;
                panX = 0; panY = 0;
                transformUygula();
                sonDokunma = 0;
            } else {
                sonDokunma = simdi;
            }
        }
        coklu = false;
    });
}

function ogrDetayIzgaraCiz(sonuc) {
    const dersSecici = document.getElementById('ogrDetayDers');
    const alan       = document.getElementById('ogrDetaySorular');
    if (!alan || !dersSecici || !_ogrDetayDersler.length) return;

    const idx     = parseInt(dersSecici.value || '0', 10);
    const ders    = _ogrDetayDersler[idx] || _ogrDetayDersler[0];
    const dersAdi = ders.dersAdi;

    const anahtar = DB.anahtariGetir(_aktifSinavId, _sonucAnahtarTuru(_aktifSinavId, sonuc.ogrenci?.kitapcikTuru));
    const dKaydi  = (anahtar.dersler || []).find(d => d.dersAdi === dersAdi);
    const dogruMap = {};
    (dKaydi?.anahtarlar || []).forEach(a => { dogruMap[a.soruNo] = a.dogru; });

    const cevaplar     = sonuc.cevaplar || {};
    const dersCevaplar = cevaplar[dersAdi] || {};

    const harfler = [];
    for (let i = 0; i < ders.sikSayisi; i++) harfler.push(String.fromCharCode(65 + i));

    // DVB özeti
    let d = 0, y = 0, b = 0;
    for (let n = 1; n <= ders.soruSayisi; n++) {
        const isr = dersCevaplar[n] || null;
        const dg  = dogruMap[n] || null;
        if (!isr) b++; else if (dg && isr === dg) d++; else y++;
    }
    const dvbEl = document.getElementById('ogrDetayDersDvb');
    if (dvbEl) dvbEl.innerHTML =
        `<span style="color:#4CAF50;">D:${d}</span>
         <span style="color:#F44336;">Y:${y}</span>
         <span>B:${b}</span>`;

    alan.innerHTML = '';
    for (let soruNo = 1; soruNo <= ders.soruSayisi; soruNo++) {
        const isaretli = dersCevaplar[soruNo] || null;
        const dogru    = dogruMap[soruNo] || null;
        const anahtarVar = !!dogru;

        const satir = document.createElement('div');
        satir.className = 'ogr-soru-satiri';

        const no = document.createElement('span');
        no.className = 'soru-no';
        if (anahtarVar && !isaretli)      no.style.color = 'var(--text-faint)';
        else if (anahtarVar && isaretli === dogru) no.style.color = '#4CAF50';
        else if (anahtarVar && isaretli !== dogru) no.style.color = '#F44336';
        no.textContent = soruNo + ')';
        satir.appendChild(no);

        const grup = document.createElement('div');
        grup.className = 'sik-grubu';
        harfler.forEach(harf => {
            const btn = document.createElement('button');
            btn.type = 'button'; btn.className = 'sik-daire'; btn.textContent = harf;
            if (anahtarVar) {
                if (isaretli === harf && dogru === harf) btn.classList.add('ogr-dogru');
                else if (isaretli === harf && dogru !== harf) btn.classList.add('ogr-yanlis');
                else if (dogru === harf) btn.classList.add('dogru-border');
            } else {
                if (isaretli === harf) btn.classList.add('manuel-sec');
            }
            btn.addEventListener('click', () => {
                const son = DB.sonuclariGetir(_aktifSinavId).find(s => s.id === _aktifSonucId);
                if (!son) return;
                if (!son.cevaplar) son.cevaplar = {};
                if (!son.cevaplar[dersAdi]) son.cevaplar[dersAdi] = {};
                const zaten = son.cevaplar[dersAdi][soruNo] === harf;
                son.cevaplar[dersAdi][soruNo] = zaten ? null : harf;
                son.puan = puanHesapla(son.cevaplar, DB.anahtariGetir(_aktifSinavId, _sonucAnahtarTuru(_aktifSinavId, son.ogrenci?.kitapcikTuru)), _ogrDetayDersler, _sinavYanlisKatsayisi(_aktifSinavId));
                DB.sonucKaydet(_aktifSinavId, son);
                ogrDetayIzgaraCiz(son);
                ogrDetayResimCiz(son);
                ogrDetayIstatistikGuncelle(son);
            });
            grup.appendChild(btn);
        });
        satir.appendChild(grup);
        alan.appendChild(satir);
    }
}

function ogrDetayIstatistikGuncelle(sonuc) {
    const p = sonuc.puan || {};
    _s('ogrDetayNet',  p.toplamNet?.toFixed(2) ?? '0.0');
    const sinav = DB.sinaviBul(_aktifSinavId);
    _s('ogrDetayFormPuan', `${sinav?.optikFormAd || 'Net'}: ${p.toplamNet?.toFixed(1) ?? '—'}`);
    _s('ogrAltD', p.toplamD ?? 0);
    _s('ogrAltY', p.toplamY ?? 0);
    _s('ogrAltB', p.toplamB ?? 0);
    _s('ogrAltN', p.toplamNet?.toFixed(2) ?? '0.0');
}

function ogrDetayKaydet() {
    const son = DB.sonuclariGetir(_aktifSinavId).find(s => s.id === _aktifSonucId);
    if (!son) return;
    // YENİ (Ağustos 2026, Sedat isteği: "kitapçık türünü de değiştirip
    // sonucu yeniden değerlendirme yapabileyim") — kitapçık türü
    // değişirse doğru cevap anahtarı (A/B) da değişir, puan bu yeni
    // anahtarla YENİDEN hesaplanmalı.
    const ktEl = document.getElementById('ogrDetayKitapcik');
    const yeniKitapcikTuru = (ktEl && !document.getElementById('ogrDetayKitapcikWrap')?.hidden) ? (ktEl.value || undefined) : son.ogrenci?.kitapcikTuru;
    son.ogrenci = {
        ...son.ogrenci,
        adSoyad: document.getElementById('ogrDetayAdSoyad').value,
        ogrenciNo: document.getElementById('ogrDetayNo').value,
        sinif: document.getElementById('ogrDetaySinif').value,
        kitapcikTuru: yeniKitapcikTuru,
    };
    const dersler = formDersleriniGetir(_aktifSinavId);
    const anahtar = DB.anahtariGetir(_aktifSinavId, _sonucAnahtarTuru(_aktifSinavId, yeniKitapcikTuru));
    son.puan = puanHesapla(son.cevaplar, anahtar, dersler, _sinavYanlisKatsayisi(_aktifSinavId));
    DB.sonucKaydet(_aktifSinavId, son);
    kagitlariRender();
    ekranGit('sinavDetay');
}

// ── Öğrenci detay: numara girilince ad soyad / sınıfı otomatik doldur ──
function _ogrDetayNoIleAra() {
    const no = document.getElementById('ogrDetayNo').value.trim();
    if (!no) return;
    const bulunan = _manuelTumOgrenciler().find(o => String(o.ogrenciNo || '').trim() === no);
    if (!bulunan) return;
    document.getElementById('ogrDetayAdSoyad').value = bulunan.adSoyad || '';
    document.getElementById('ogrDetaySinif').value   = bulunan.sinifAd || '';
    document.getElementById('ogrDetayAd').textContent = bulunan.adSoyad || 'Kağıt Detayı';
}

// ════════════════════════════════════════════════════════════════
// PUAN HESAPLAMA
// ════════════════════════════════════════════════════════════════
/**
 * @param {number|null} yanlisKatsayisi - kaç yanlış 1 doğruyu götürür (varsayılan 3 —
 *        LGS/Bursluluk resmî kuralı). null/0 verilirse yanlış hiç puan kaybettirmez.
 *        DÜZELTME: burada eskiden sabit y/4 kullanılıyordu, bu LGS/Bursluluk'ın resmî
 *        y/3 kuralıyla ÇELİŞİYORDU (kart rozetindeki net ile öğrenci detayındaki net
 *        farklı çıkıyordu) — artık tek doğru kaynak burası, varsayılan 3'e düzeltildi.
 */
function puanHesapla(cevaplar, anahtar, dersler, yanlisKatsayisi = 3) {
    const cezaHesapla = (y) => (yanlisKatsayisi ? y / yanlisKatsayisi : 0);
    let topD = 0, topY = 0, topB = 0;
    const dersDetay = [];
    dersler.forEach(ders => {
        const dersAdi  = ders.dersAdi;
        const dKaydi   = (anahtar.dersler || []).find(d => d.dersAdi === dersAdi);
        const dogruMap = {};
        (dKaydi?.anahtarlar || []).forEach(a => { dogruMap[a.soruNo] = a.dogru; });
        const dersCevaplar = (cevaplar || {})[dersAdi] || {};
        let d = 0, y = 0, b = 0;
        for (let n = 1; n <= ders.soruSayisi; n++) {
            const isr = dersCevaplar[n] || null;
            const dg  = dogruMap[n] || null;
            if (!isr) b++; else if (dg && isr === dg) d++; else y++;
        }
        const net = d - cezaHesapla(y);
        topD += d; topY += y; topB += b;
        dersDetay.push({ dersAdi, d, y, b, net: parseFloat(net.toFixed(2)) });
    });
    const toplamNet = topD - cezaHesapla(topY);
    return { toplamD: topD, toplamY: topY, toplamB: topB, toplamNet: parseFloat(toplamNet.toFixed(2)), dersDetay };
}

/** Bir sınav kaydından, o sınavda kullanılacak yanlış cevap katsayısını okur (kayıtta yoksa 3 — LGS/Bursluluk resmî kuralı varsayılan olarak kullanılır). */
function _sinavYanlisKatsayisi(sinavId) {
    const sinav = DB.sinaviBul(sinavId);
    if (!sinav) return 3;
    return sinav.yanlisKatsayisi ?? 3;
}

// ════════════════════════════════════════════════════════════════
// LGS PUANI RAPORU (bkz. js/lgsPuanHesapla.js)
// ════════════════════════════════════════════════════════════════

/**
 * DB'de saklanan (sınav türüne göre GLOBAL) puan referans ayarını
 * (bazı alanları boş/null olabilir) LgsPuanHesapla'nın beklediği "harici"
 * formatına çevirir — yalnızca dolu (geçerli sayı) alanlar dahil edilir,
 * böylece eksik olanlar tahmini hesaplanmaya devam eder.
 * @param {string} sinavTuru - 'lgs' | 'bursluluk'
 */
function _lgsHariciVeriyiHazirla(sinavTuru) {
    const ayar = DB.puanReferansGetir(sinavTuru);
    const dersIstatistik = {};
    Object.keys(ayar.dersIstatistik || {}).forEach(dersAdi => {
        const d = ayar.dersIstatistik[dersAdi] || {};
        const ort = parseFloat(d.ortalama), std = parseFloat(d.stdSapma);
        if (Number.isFinite(ort) && Number.isFinite(std)) dersIstatistik[dersAdi] = { ortalama: ort, stdSapma: std };
    });
    const harici = { dersIstatistik };
    const minT = parseFloat(ayar.minTasp), maxT = parseFloat(ayar.maxTasp);
    if (Number.isFinite(minT)) harici.minTasp = minT;
    if (Number.isFinite(maxT)) harici.maxTasp = maxT;
    return harici;
}

function lgsPuanRaporunuAcVeGoster() {
    const sinav      = DB.sinaviBul(_aktifSinavId);
    const sinavTuru  = sinav?.optikFormId === 'bursluluk' ? 'bursluluk' : 'lgs';
    const dersler    = formDersleriniGetir(_aktifSinavId);
    const sonuclar   = DB.sonuclariGetir(_aktifSinavId);

    const bosEl      = document.getElementById('lgsBosAlan');
    const listEl     = document.getElementById('lgsOgrenciListesi');
    const kaynakEl   = document.getElementById('lgsKaynakEtiketi');
    const ayarBtn    = document.getElementById('btnLgsAyarToggle');
    if (!listEl) return;

    _s('lgsPuanBaslik', sinavTuru === 'bursluluk' ? 'İOKBS (Bursluluk) Puanı' : 'LGS Puanı');

    if (sinavTuru === 'bursluluk') {

        // ── Bursluluk (İOKBS): resmî yöntem, ortalama/std sapma/MinTASP/
        // MaxTASP normalde sınava giren öğrencilerin kendi verisinden
        // hesaplanır (bkz. ODSGM İOKBS Kılavuzu). Ama bu, sınıfta TEK
        // öğrenci varsa (ya da tüm öğrenciler eşit TASP aldıysa) standardizasyon
        // matematiksel olarak tanımsız kalır — o yüzden LGS'deki gibi
        // "Referans Verilerini Gir" paneli burada da açık: kullanıcı geçmiş
        // yıllardan bilinen (ya da tahmini) ortalama/std sapma/TASP aralığı
        // girerse, TEK öğrencinin netiyle bile bir puan hesaplanabilir —
        // dışarıdaki "sadece netlerimi giriyorum puanım çıkıyor" hesaplama
        // araçlarının yaptığı da tam olarak bu (geçmiş yıl istatistiklerine
        // dayalı simülasyon).
        if (ayarBtn) ayarBtn.style.display = '';

        const harici = _lgsHariciVeriyiHazirla('bursluluk');
        const rapor = window.LgsPuanHesapla?.sinavRaporuHesapla(sonuclar, dersler, harici, 'bursluluk');
        if (!rapor) return;

        _s('lgsOzetSayi', rapor.gecerliSayisi);
        _s('lgsOzetOrtalama', rapor.sinavOrtalamaMsp != null ? rapor.sinavOrtalamaMsp.toFixed(1) : '—');
        _s('lgsOzetOrtalamaEtiket', 'Sınav Ortalaması (İOKBS Puanı)');

        if (kaynakEl) {
            kaynakEl.textContent = rapor.standardizeEdilemedi
                ? 'Resmi İOKBS standardizasyonu tanımsız kaldı: en az 2 farklı öğrenci sonucu (birbirinden farklı TASP) gerekiyor — şu an tek öğrenci var ya da tüm öğrenciler eşit TASP aldı. Bu yüzden aşağıdaki puan(lar) resmi yöntemle DEĞİL, doğrudan net/soru oranına dayalı yaklaşık bir formülle hesaplandı (gerçek İOKBS puanı değildir). "MEB Verilerini Gir" panelinden geçmiş yıl ortalama/standart sapma/TASP aralığı girerseniz resmi yönteme göre daha güvenilir bir sonuç alınabilir.'
                : (rapor.tamamiGercek
                    ? 'Girilen referans verileriyle (geçmiş yıl/tahmini ortalama-standart sapma-TASP aralığı) hesaplandı — resmî sonuçtan farklı olabilir.'
                    : 'İOKBS resmî yöntemiyle hesaplandı: Ham Puan = Doğru − Yanlış/3; ortalama, standart sapma ve TASP aralığı bu sınava giren öğrencilerin kendi verisinden alınır (bkz. ODSGM İOKBS Kılavuzu). Daha güvenilir bir tahmin için "MEB Verilerini Gir" panelinden geçmiş yıl değerlerini girebilirsiniz.');
            kaynakEl.className = 'lgs-kaynak-etiketi';
        }

        if (!rapor.gecerliSayisi) {
            bosEl.style.display = 'flex';
            listEl.innerHTML = '';
            ekranGit('lgsPuan');
            return;
        }
        bosEl.style.display = 'none';

        listEl.innerHTML = rapor.ogrenciler.map((o, i) => {
            const ogr = o.ogrenci || {};
            const detaySatirlari = o.dersPuanlari.map(d => `
            <span>${_h(d.dersAdi)}</span>
            <span>${d.net.toFixed(2)}</span>
            <span>SP ${d.standartPuan.toFixed(1)}</span>
            <span>×${d.katsayi} = ${d.agirlikliPuan.toFixed(1)}</span>
        `).join('');
            return `
        <div class="lgs-ogr-satir" data-idx="${i}">
            <div class="lgs-ogr-ust">
                <span class="lgs-ogr-sira">${i + 1}</span>
                <div class="lgs-ogr-ad">
                    <strong>${_h(ogr.adSoyad || 'İsimsiz')}</strong>
                    <small>${_h(ogr.sinif || '')}${ogr.sinif && ogr.ogrenciNo ? ' · ' : ''}${_h(ogr.ogrenciNo || '')}</small>
                </div>
                <span class="lgs-ogr-msp"${o.mspYontemi === 'tek-ogrenci-tahmini' ? ' title="Net/soru oranına dayalı yaklaşık puan — resmi İOKBS puanı değildir."' : ''}>${o.msp != null ? o.msp.toFixed(1) : '—'}${o.mspYontemi === 'tek-ogrenci-tahmini' ? ' *' : ''}</span>
            </div>
            <div class="lgs-ogr-detay">
                <span class="lgs-detay-baslik">Ders</span>
                <span class="lgs-detay-baslik">Net (HP)</span>
                <span class="lgs-detay-baslik">Standart</span>
                <span class="lgs-detay-baslik">Ağırlıklı</span>
                ${detaySatirlari}
            </div>
        </div>`;
        }).join('');

        listEl.querySelectorAll('.lgs-ogr-satir').forEach(satir => {
            satir.addEventListener('click', () => {
                satir.querySelector('.lgs-ogr-detay')?.classList.toggle('acik');
            });
        });

        ekranGit('lgsPuan');
        return;
    }

    // ── LGS: sabit katsayılı tahmini puan formülü (ana puan) + resmî
    // yöntemin (Türkiye ortalaması girilirse gerçek, girilmezse bu
    // sınavdan tahmini) MSP'si ikincil bilgi olarak gösterilir.
    if (ayarBtn) ayarBtn.style.display = '';

    const harici      = _lgsHariciVeriyiHazirla('lgs');
    const rapor       = window.LgsPuanHesapla?.sinavRaporuHesapla(sonuclar, dersler, harici, 'lgs');
    const sabitListe  = window.LgsPuanHesapla?.sinavRaporuSabitFormulHesapla(sonuclar) || [];
    if (!rapor) return;

    // Sabit formül puanına göre öğrenci -> puan eşlemesi (sonucId ile)
    const sabitPuanMap = {};
    sabitListe.forEach(s => { sabitPuanMap[s.sonucId] = s; });

    const sabitOrtalama = sabitListe.length
        ? sabitListe.reduce((a, s) => a + s.puan, 0) / sabitListe.length
        : 0;

    _s('lgsOzetSayi', rapor.gecerliSayisi);
    _s('lgsOzetOrtalama', sabitListe.length ? sabitOrtalama.toFixed(1) : '—');
    _s('lgsOzetOrtalamaEtiket', 'Sınav Ortalaması (Tahmini Puan)');

    if (kaynakEl) {
        kaynakEl.textContent = 'Sabit katsayılı tahmini puan formülü kullanıldı (Türkiye ortalaması gerektirmez — deneme sınavı için uygundur).';
        kaynakEl.className = 'lgs-kaynak-etiketi karma';
    }

    if (!rapor.gecerliSayisi) {
        bosEl.style.display = 'flex';
        listEl.innerHTML = '';
        ekranGit('lgsPuan');
        return;
    }
    bosEl.style.display = 'none';

    const istatistikMap = {};
    rapor.dersIstatistik.forEach(i => { istatistikMap[i.dersAdi] = i; });

    // Sıralama: sabit formül puanına göre büyükten küçüğe (bu artık ana puan)
    const siraliOgrenciler = rapor.ogrenciler.slice().sort((a, b) => {
        const pa = sabitPuanMap[a.sonucId]?.puan ?? -Infinity;
        const pb = sabitPuanMap[b.sonucId]?.puan ?? -Infinity;
        return pb - pa;
    });

    listEl.innerHTML = siraliOgrenciler.map((o, i) => {
        const ogr = o.ogrenci || {};
        const sabit = sabitPuanMap[o.sonucId];
        const detaySatirlari = o.dersPuanlari.map(d => {
            const kaynak = istatistikMap[d.dersAdi]?.kaynak || 'tahmini';
            const sabitDers = sabit?.dersNetleri.find(x => x.dersAdi === d.dersAdi);
            return `
            <span>${_h(d.dersAdi)}</span>
            <span>${d.net.toFixed(2)}</span>
            <span>×${sabitDers?.katsayi ?? '—'} = ${sabitDers ? sabitDers.katki.toFixed(1) : '—'}</span>
            <span>SP ${d.standartPuan.toFixed(1)} <span class="lgs-ders-rozet ${kaynak}">${kaynak === 'gercek' ? 'MEB' : 'tahmini'}</span></span>
        `;
        }).join('');
        return `
        <div class="lgs-ogr-satir" data-idx="${i}">
            <div class="lgs-ogr-ust">
                <span class="lgs-ogr-sira">${i + 1}</span>
                <div class="lgs-ogr-ad">
                    <strong>${_h(ogr.adSoyad || 'İsimsiz')}</strong>
                    <small>${_h(ogr.sinif || '')}${ogr.sinif && ogr.ogrenciNo ? ' · ' : ''}${_h(ogr.ogrenciNo || '')}</small>
                </div>
                <div class="lgs-ogr-puanlar">
                    <span class="lgs-ogr-sabit">${sabit ? sabit.puan.toFixed(1) : '—'}</span>
                    <span class="lgs-ogr-msp2">İst. MSP: ${o.msp != null ? o.msp.toFixed(1) : '—'}</span>
                </div>
            </div>
            <div class="lgs-ogr-detay">
                <span class="lgs-detay-baslik">Ders</span>
                <span class="lgs-detay-baslik">Net</span>
                <span class="lgs-detay-baslik">Sabit Katkı</span>
                <span class="lgs-detay-baslik">İst. Standart</span>
                ${detaySatirlari}
            </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.lgs-ogr-satir').forEach(satir => {
        satir.addEventListener('click', () => {
            satir.querySelector('.lgs-ogr-detay')?.classList.toggle('acik');
        });
    });

    ekranGit('lgsPuan');
}

/**
 * "MEB Verilerini Gir / Düzenle" panelini, sınavın dersleri ve DB'de kayıtlı
 * (varsa) değerlerle doldurarak render eder.
 */
/**
 * Bir sınav türü için ders satırları + genel (MinTASP/MaxTASP) satırının
 * HTML'ini üretir — hem rapor ekranındaki panelde hem de global
 * hem rapor ekranındaki inline panelde (bkz. _lgsAyarPaneliniRender) ORTAK
 * kullanılır, tek bir yerden değiştirilebilsin diye.
 */
function _puanReferansIcerikHtml(sinavTuru) {
    const dersler = _formTuruDersleriniGetir(sinavTuru);
    const ayar = DB.puanReferansGetir(sinavTuru);
    const ortEtiket = sinavTuru === 'bursluluk' ? 'Referans Ortalama (geçmiş yıl/tahmini)' : 'Türkiye Ortalaması';

    const dersSatirlari = dersler.map(d => {
        const kayitli = (ayar.dersIstatistik || {})[d.dersAdi] || {};
        return `
        <div class="lgs-ayar-ders-satir">
            <span class="lgs-ayar-ders-baslik">${_h(d.dersAdi)} <small style="color:var(--text-faint);font-weight:400;">(katsayı ${window.LgsPuanHesapla?.dersKatsayisi(d.dersAdi, sinavTuru) ?? '?'})</small></span>
            <div class="lgs-ayar-inputlar">
                <label>${_h(ortEtiket)}
                    <input type="number" step="0.01" class="lgs-ayar-ort" data-ders="${_h(d.dersAdi)}" value="${kayitli.ortalama ?? ''}" placeholder="tahmini">
                </label>
                <label>Standart Sapma
                    <input type="number" step="0.01" class="lgs-ayar-std" data-ders="${_h(d.dersAdi)}" value="${kayitli.stdSapma ?? ''}" placeholder="tahmini">
                </label>
            </div>
        </div>`;
    }).join('');

    return `
        ${dersSatirlari}
        <div class="lgs-ayar-genel-satir">
            <label>MinTASP
                <input type="number" step="0.01" class="lgs-ayar-mintasp" value="${ayar.minTasp ?? ''}" placeholder="tahmini">
            </label>
            <label>MaxTASP
                <input type="number" step="0.01" class="lgs-ayar-maxtasp" value="${ayar.maxTasp ?? ''}" placeholder="tahmini">
            </label>
        </div>`;
}

/** Bir konteynerdeki (panel/sheet bölümü) inputlardan okuyup sinavTuru'ne göre GLOBAL kaydeder. */
function _puanReferansKaydet(konteyner, sinavTuru) {
    const dersIstatistik = {};
    konteyner.querySelectorAll('.lgs-ayar-ort').forEach(input => {
        const dersAdi = input.dataset.ders;
        const stdInput = konteyner.querySelector(`.lgs-ayar-std[data-ders="${CSS.escape(dersAdi)}"]`);
        const ort = input.value.trim(), std = stdInput?.value.trim();
        if (ort !== '' && std !== '') dersIstatistik[dersAdi] = { ortalama: parseFloat(ort), stdSapma: parseFloat(std) };
    });
    const minTaspVal = konteyner.querySelector('.lgs-ayar-mintasp')?.value.trim();
    const maxTaspVal = konteyner.querySelector('.lgs-ayar-maxtasp')?.value.trim();
    DB.puanReferansKaydet(sinavTuru, {
        dersIstatistik,
        minTasp: minTaspVal !== '' ? parseFloat(minTaspVal) : null,
        maxTasp: maxTaspVal !== '' ? parseFloat(maxTaspVal) : null,
    });
}

/** Bir kaydet butonuna kısa süreliğine "✓ Kaydedildi" yazdırıp eski hâline döndürür. */
function _kaydetButonuOnayGoster(btn, eskiMetin) {
    if (!btn) return;
    btn.textContent = '✓ Kaydedildi';
    setTimeout(() => { btn.textContent = eskiMetin; }, 1400);
}

/* Not: eskiden buradaki puanReferansSheetAc() fonksiyonu Sınavlar
   ekranındaki ⋮ menüsünden açılan global "Puan Referans Ayarları"
   sheet'ini yönetiyordu — o ayar artık ana uygulamanın admin'e özel
   Ayarlar sekmesinde (bkz. js/optik-ayarlari.js), sheet ve ⋮ menü
   butonu index.html'den kaldırıldı, bu yüzden fonksiyon da kaldırıldı. */

function _lgsAyarPaneliniRender() {
    const panel = document.getElementById('lgsAyarPanel');
    if (!panel || !_aktifSinavId) return;
    const sinav = DB.sinaviBul(_aktifSinavId);
    const sinavTuru = sinav?.optikFormId === 'bursluluk' ? 'bursluluk' : 'lgs';

    panel.innerHTML = `
        ${_puanReferansIcerikHtml(sinavTuru)}
        <button type="button" class="lgs-ayar-kaydet-btn" id="btnLgsAyarKaydet">Kaydet ve Yeniden Hesapla</button>
        <button type="button" class="lgs-ayar-temizle-btn" id="btnLgsAyarTemizle">Tüm girilen değerleri temizle (tahminiye dön)</button>
        <small class="lgs-ayar-not">Bu değerler ${sinavTuru === 'bursluluk' ? 'Bursluluk' : 'LGS'} türündeki TÜM sınavlarda kullanılır (Ayarlar ⋮ menüsünden de düzenlenebilir).</small>
    `;

    document.getElementById('btnLgsAyarKaydet').addEventListener('click', () => {
        _puanReferansKaydet(panel, sinavTuru);
        lgsPuanRaporunuAcVeGoster();
    });
    document.getElementById('btnLgsAyarTemizle').addEventListener('click', () => {
        DB.puanReferansKaydet(sinavTuru, { dersIstatistik: {}, minTasp: null, maxTasp: null });
        _lgsAyarPaneliniRender();
        lgsPuanRaporunuAcVeGoster();
    });
}

// ════════════════════════════════════════════════════════════════
// ANAHTAR SEKMESİ
// ════════════════════════════════════════════════════════════════
// YENİ (Ağustos 2026): Cevap Anahtarı ekranında o an DÜZENLENMEKTE olan
// kitapçık türü ('A'/'B') — sadece kitapcikTuruSayisi=2 olan sınavlarda
// anlamlı, tek kitapçıklı sınavlarda hep undefined kalır.
let _anahtarAktifKitapcik;

function anahtarPaneliniRender() {
    if (!_aktifSinavId) return;
    const kitapcikli = _sinavKitapcikliMi(_aktifSinavId);
    const secici = document.getElementById('anahKitapcikSecici');
    if (secici) secici.hidden = !kitapcikli;
    if (kitapcikli && _anahtarAktifKitapcik !== 'A' && _anahtarAktifKitapcik !== 'B') {
        _anahtarAktifKitapcik = 'A';
    } else if (!kitapcikli) {
        _anahtarAktifKitapcik = undefined;
    }
    const btnA = document.getElementById('btnAnahKitapcikA');
    const btnB = document.getElementById('btnAnahKitapcikB');
    if (btnA && btnB) {
        btnA.classList.toggle('aktif', _anahtarAktifKitapcik === 'A');
        btnB.classList.toggle('aktif', _anahtarAktifKitapcik === 'B');
    }
    const dersler = formDersleriniGetir(_aktifSinavId);
    const dersSecici = document.getElementById('anahDersSecici');
    if (!dersSecici) return;
    dersSecici.innerHTML = dersler.map((d, i) =>
        `<option value="${i}">${d.dersAdi} (${d.soruSayisi} soru)</option>`
    ).join('');
    dersSecici.selectedIndex = 0;
    anahtarIzgaraCiz();
}

function anahtarIzgaraCiz() {
    if (!_aktifSinavId) return;
    const dersSecici = document.getElementById('anahDersSecici');
    const alan       = document.getElementById('anahSoruListesi');
    if (!dersSecici || !alan) return;
    const dersler = formDersleriniGetir(_aktifSinavId);
    const idx     = parseInt(dersSecici.value || '0', 10);
    const ders    = dersler[idx] || dersler[0];
    if (!ders) return;

    const anahtar = DB.anahtariGetir(_aktifSinavId, _anahtarAktifKitapcik);
    const dKaydi  = (anahtar.dersler || []).find(d => d.dersAdi === ders.dersAdi);
    const cevapMap = {};
    (dKaydi?.anahtarlar || []).forEach(a => { cevapMap[a.soruNo] = a.dogru; });

    const harfler = [];
    for (let i = 0; i < ders.sikSayisi; i++) harfler.push(String.fromCharCode(65 + i));

    alan.innerHTML = '';
    for (let soruNo = 1; soruNo <= ders.soruSayisi; soruNo++) {
        const secili = cevapMap[soruNo] || null;
        const satir = document.createElement('div');
        satir.className = 'anahtar-satir';

        const no = document.createElement('span');
        no.className = 'soru-no'; no.textContent = soruNo + ')'; satir.appendChild(no);

        const grup = document.createElement('div');
        grup.className = 'sik-grubu';
        harfler.forEach(harf => {
            const btn = document.createElement('button');
            btn.type = 'button'; btn.className = 'sik-daire'; btn.textContent = harf;
            if (secili === harf) btn.classList.add('anahtar-sec');
            btn.addEventListener('click', () => {
                const zaten = btn.classList.contains('anahtar-sec');
                grup.querySelectorAll('.sik-daire').forEach(b => b.classList.remove('anahtar-sec'));
                const yeniCevap = zaten ? null : harf;
                if (!zaten) btn.classList.add('anahtar-sec');
                _anahtarCevapKaydet(ders.dersAdi, soruNo, yeniCevap);
                // Sonuçları yeniden hesapla
                _tumSonuclariYenidenHesapla();
            });
            grup.appendChild(btn);
        });
        satir.appendChild(grup);

        const silBtn = document.createElement('button');
        silBtn.className = 'menu-btn'; silBtn.type = 'button';
        silBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        silBtn.addEventListener('click', () => { _anahtarCevapKaydet(ders.dersAdi, soruNo, null); anahtarIzgaraCiz(); _tumSonuclariYenidenHesapla(); });
        satir.appendChild(silBtn);
        alan.appendChild(satir);
    }
}

function _anahtarCevapKaydet(dersAdi, soruNo, dogru) {
    const anahtar = DB.anahtariGetir(_aktifSinavId, _anahtarAktifKitapcik);
    if (!anahtar.dersler) anahtar.dersler = [];
    let ders = anahtar.dersler.find(d => d.dersAdi === dersAdi);
    if (!ders) { ders = { dersAdi, anahtarlar: [] }; anahtar.dersler.push(ders); }
    ders.anahtarlar = ders.anahtarlar.filter(a => a.soruNo !== soruNo);
    if (dogru) ders.anahtarlar.push({ soruNo, dogru });
    ders.anahtarlar.sort((a, b) => a.soruNo - b.soruNo);
    DB.anahtarKaydet(_aktifSinavId, anahtar, _anahtarAktifKitapcik);
}

function _tumSonuclariYenidenHesapla() {
    // KÖK NEDEN DÜZELTMESİ (Ağustos 2026, Sedat isteği: "cevap anahtarı
    // bile farklı kitapçık türüne göre ikili girilmeli") — önceden TEK bir
    // anahtar döngü DIŞINDA okunup TÜM öğrencilere uygulanıyordu; A/B
    // sınavlarda bu, kitapçık türü B olan öğrencilerin A anahtarıyla (veya
    // tersi) yanlış puanlanması demekti. Artık her öğrencinin KENDİ
    // kağıdından okunan kitapçık türüne göre doğru anahtar seçiliyor
    // (aynı türden anahtarlar tekrar tekrar okunmasın diye küçük bir
    // önbellekle).
    const kitapcikli = _sinavKitapcikliMi(_aktifSinavId);
    const anahtarOnbellek = new Map(); // kitapcikTuru (veya 'tek') -> anahtar
    function anahtariGetirOnbellekli(kitapcikTuru) {
        const anahtarKey = kitapcikTuru || 'tek';
        if (!anahtarOnbellek.has(anahtarKey)) {
            anahtarOnbellek.set(anahtarKey, DB.anahtariGetir(_aktifSinavId, kitapcikTuru));
        }
        return anahtarOnbellek.get(anahtarKey);
    }
    const dersler = formDersleriniGetir(_aktifSinavId);
    const yanlisKatsayisi = _sinavYanlisKatsayisi(_aktifSinavId);
    DB.sonuclariGetir(_aktifSinavId).forEach(sonuc => {
        const anahtar = kitapcikli
            ? anahtariGetirOnbellekli(_sonucAnahtarTuru(_aktifSinavId, sonuc.ogrenci?.kitapcikTuru))
            : anahtariGetirOnbellekli(undefined);
        sonuc.puan = puanHesapla(sonuc.cevaplar, anahtar, dersler, yanlisKatsayisi);
        DB.sonucKaydet(_aktifSinavId, sonuc);
    });
    if (_aktifSekme === 'kagitlar') kagitlariRender();
}

// ════════════════════════════════════════════════════════════════
// KAMERA
// ════════════════════════════════════════════════════════════════
let _seviyeAktif = false;
let _canliModAktif = false;   // canlı tarama modu açık mı (camera.js ile senkron tutulur)
let _canliKartZamanlayici = null;

function kameraAc() {
    const ov = document.getElementById('kameraOverlay');
    if (!ov) return;
    // Taramadan hemen önce köprüyü tazele (bkz. galeriSecimIsle'daki aynı not).
    _optikAktifFormGuncelle();
    ov.hidden = false;
    const s = document.getElementById('start');
    if (s) s.click();
    _seviyeBaslat();
    document.getElementById('kameraFormAdi').textContent = DB.sinaviBul(_aktifSinavId)?.optikFormAd || 'LGS';
}

function kameraKapat() {
    const ov = document.getElementById('kameraOverlay');
    if (!ov) return;
    const st = document.getElementById('stop');
    if (st) st.click();
    ov.hidden = true;
    _seviyeKaldir();
    _canliModAktif = false;
    if (_canliKartZamanlayici) { clearTimeout(_canliKartZamanlayici); _canliKartZamanlayici = null; }
    const kart = document.getElementById('canliSonucKart');
    if (kart) kart.hidden = true;
    const ayarSheet = document.getElementById('kameraAyarSheet');
    if (ayarSheet) ayarSheet.hidden = true;
}

function _seviyeGuncelle(e) {
    const halka = document.getElementById('seviyeHalka');
    const nokta = document.getElementById('seviyeNokta');
    const mesaj = document.getElementById('seviyeMesaj');
    if (!halka || !nokta) return;
    const beta  = Math.max(-90, Math.min(90,  e.beta  || 0));
    const gamma = Math.max(-45, Math.min(45,  e.gamma || 0));
    const x = (gamma / 45) * 20, y = (beta / 90) * 20;
    const duz = Math.abs(beta) < 10 && Math.abs(gamma) < 10;
    nokta.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    halka.className = 'seviye-halka ' + (duz ? 'duz' : 'egik');
    nokta.className = 'seviye-nokta ' + (duz ? 'duz' : 'egik');
    if (mesaj) mesaj.textContent = duz ? '✓ Düz' : 'Düzleştirin';
}
function _seviyeBaslat() {
    if (_seviyeAktif) return;
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(r => {
            if (r === 'granted') { window.addEventListener('deviceorientation', _seviyeGuncelle); _seviyeAktif = true; }
        }).catch(() => {});
    } else {
        window.addEventListener('deviceorientation', _seviyeGuncelle);
        _seviyeAktif = true;
    }
}
function _seviyeKaldir() {
    if (!_seviyeAktif) return;
    window.removeEventListener('deviceorientation', _seviyeGuncelle);
    _seviyeAktif = false;
}

// OMR sonucu gelince
window.addEventListener('omrSonucHazir', e => {
    _omrSonucuisle(e.detail);
});
window.addEventListener('omrOkumaTamamlandi', () => {
    // Canlı tarama modunda kamerayı KAPATMA — döngü otomatik olarak
    // sıradaki kağıt için devam eder (bkz. camera.js _canliOtomatikOku).
    if (_canliModAktif) return;
    kameraKapat();
});

function _omrSonucuisle(raw) {
    if (!raw || !_aktifSinavId) return;
    const dersler = formDersleriniGetir(_aktifSinavId);
    // NOT: anahtar burada değil, aşağıda kimlik.kitapcikTuru netleştikten
    // SONRA okunuyor (bkz. "YENİ: kitapçık türüne duyarlı anahtar" notu) —
    // A/B sınavlarda hangi anahtarın kullanılacağı kağıttan okunan
    // kitapçık harfine bağlı.

    // omrEngine dizi dondurur: [{ders, soruNo, isaretliSik}]
    // puanHesapla nesne bekler: {dersAdi: {soruNo: harf}}
    const cevaplarDizi = Array.isArray(raw.cevaplar) ? raw.cevaplar : [];
    const cevaplarNesne = {};
    cevaplarDizi.forEach(c => {
        if (!c.ders) return;
        if (!cevaplarNesne[c.ders]) cevaplarNesne[c.ders] = {};
        if (c.isaretliSik) cevaplarNesne[c.ders][c.soruNo] = c.isaretliSik;
    });

    // Numara: "0103" -> "103" (leading zero kaldir)
    const kimlik = Object.assign({}, raw.ogrenciKimlik || {});
    if (kimlik.ogrenciNo) {
        const parsed = parseInt(kimlik.ogrenciNo, 10);
        if (!isNaN(parsed)) kimlik.ogrenciNo = String(parsed);
    }

    // KÖK NEDEN DÜZELTMESİ (Sedat isteği, Ağustos 2026 — "hangi sınıf
    // seçili ise o sınıftaki öğrencilerle eşleştirsin, değilse uyarı
    // versin"): eşleştirme önceden TÜM okuldaki öğrenciler arasında
    // yapılıyordu — aynı numara İlkokul'da ve Ortaokul'da (veya iki farklı
    // sınıfta) farklı öğrencilere ait olabileceğinden yanlış öğrenciyle
    // sessizce eşleşme riski vardı. Artık SADECE bu sınava atanmış
    // (sinav.ogrenciIdleri) öğrenciler arasında aranıyor; atanmışlar
    // arasında bulunamazsa (numara hiç yok VEYA başka bir öğrenciye ait
    // ama bu sınava seçili değil) ad/sınıf otomatik doldurulmuyor, bunun
    // yerine kağıda görünür bir uyarı ekleniyor.
    const eslestimeUyarilari = [];
    // YENİ (Ağustos 2026, Sedat isteği): A/B kitapçıklı bir sınavda kağıttan
    // kitapçık türü okunamazsa (K baloncuğu boş/belirsiz), doğru cevap
    // anahtarı belirlenemez — sessizce yanlış (ya da boş) anahtarla
    // puanlamak yerine görünür bir uyarı veriyoruz.
    if (_sinavKitapcikliMi(_aktifSinavId) && kimlik.kitapcikTuru !== 'A' && kimlik.kitapcikTuru !== 'B') {
        eslestimeUyarilari.push('⚠ Bu sınav A/B kitapçık türü kullanıyor ama kağıttan kitapçık türü okunamadı — hangi anahtarın kullanılacağı belirsiz, puanlama yanlış olabilir. Kitapçık işaretini ve taramayı kontrol edin.');
    }
    if (kimlik.ogrenciNo) {
        try {
            const sinav = DB.sinaviBul(_aktifSinavId);
            const atanmisIdler = sinav?.ogrenciIdleri || [];
            const tumOgrenciler = _manuelTumOgrenciler();
            const atanmisOgrenciler = tumOgrenciler.filter(o => atanmisIdler.includes(o.id));
            const eslesme = atanmisOgrenciler.find(o =>
                String(parseInt(o.ogrenciNo || '0', 10)) === kimlik.ogrenciNo
            );
            if (eslesme) {
                kimlik.adSoyad = eslesme.adSoyad || kimlik.adSoyad || '';
                kimlik.sinif   = eslesme.sinifAd || kimlik.sinif || '';
            } else {
                const baskaOgrencideVarMi = tumOgrenciler.some(o =>
                    String(parseInt(o.ogrenciNo || '0', 10)) === kimlik.ogrenciNo
                );
                eslestimeUyarilari.push(
                    baskaOgrencideVarMi
                        ? `⚠ Numara ${kimlik.ogrenciNo}, bu sınava atanmış öğrenciler arasında yok — aynı numaralı BAŞKA bir öğrenci var ama bu sınava seçili değil (farklı sınıf/kademe olabilir). Ad/sınıf otomatik doldurulamadı, elle kontrol edin.`
                        : `⚠ Numara ${kimlik.ogrenciNo} ile eşleşen hiçbir öğrenci bulunamadı. Ad/sınıf otomatik doldurulamadı, elle kontrol edin.`
                );
            }
        } catch(e) {}
    }

    const sonuc = {
        id:            'sonuc_' + Date.now(),
        ogrenci:       kimlik,
        cevaplar:      cevaplarNesne,
        kagitGoruntusu:raw.kagitGoruntusu || null,
        baloncukNoktalari: raw.baloncukNoktalari || null,
        // YENİ: omrEngine.js'in ürettiği teşhis uyarıları (köşe tutarlılık
        // artıkları, dışlanan köşe vb.) — önceden hiç yakalanmıyordu, sadece
        // browser console'a gidip kayboluyordu. Kağıt Detayı ekranında
        // gösterilecek (bkz. ogrDetayAc).
        uyarilar:      [...eslestimeUyarilari, ...(Array.isArray(raw.uyarilar) ? raw.uyarilar : [])],
        elleGirildi:   false,
        tarih:         new Date().toLocaleDateString('tr-TR'),
    };
    // YENİ (Ağustos 2026): kitapçık türüne duyarlı anahtar — kağıttan
    // OKUNAN kitapcikTuru'na göre A/B'den doğrusu seçiliyor (bkz.
    // _sonucAnahtarTuru notu, dosya üstü).
    sonuc.puan = puanHesapla(sonuc.cevaplar, DB.anahtariGetir(_aktifSinavId, _sonucAnahtarTuru(_aktifSinavId, kimlik.kitapcikTuru)), dersler, _sinavYanlisKatsayisi(_aktifSinavId));

    // Aynı öğrencinin (öğrenci numarasıyla) bu sınav için daha önce
    // kaydedilmiş bir formu var mı? Varsa sessizce ikinci bir satır daha
    // eklemek yerine kullanıcıya SOR — "Kağıtlar" listesinde aynı
    // öğrenci için iki kayıt birden görünmesin (bkz. kullanıcı geri
    // bildirimi: aynı formu tekrar okutunca yeni kayıt oluşuyordu).
    const noStr = (kimlik.ogrenciNo || '').toString().trim();
    const mevcut = noStr
        ? DB.sonuclariGetir(_aktifSinavId).find(s => (s.ogrenci?.ogrenciNo || '').toString().trim() === noStr)
        : null;

    if (mevcut) {
        sheetOnay(
            `${mevcut.ogrenci?.adSoyad || 'Bu öğrencinin'} zaten kayıtlı bir optik formu var`,
            'Bu numaraya (' + noStr + ') ait bir kayıt zaten mevcut. Yeni taramayla önceki kayıt güncellensin mi? Vazgeçerseniz bu tarama kaydedilmez, önceki kayıt aynen kalır.',
            () => {
                sonuc.id = mevcut.id; // aynı id ile kaydet = DB.sonucKaydet üzerine yazar
                DB.sonucKaydet(_aktifSinavId, sonuc);
                kagitlariRender();
                if (_canliModAktif) _canliKartGoster(sonuc);
            },
            'Güncelle'
        );
        return;
    }

    DB.sonucKaydet(_aktifSinavId, sonuc);
    kagitlariRender();
    if (_canliModAktif) _canliKartGoster(sonuc);
}

/** Canlı tarama modunda: otomatik kaydedilen sonucu birkaç saniye gösteren kart. */
function _canliKartGoster(sonuc) {
    const kart = document.getElementById('canliSonucKart');
    if (!kart) return;
    const o = sonuc.ogrenci || {};
    _s('kskAd', o.adSoyad || '—');
    _s('kskNumara', o.ogrenciNo || '—');
    _s('kskSinif', o.sinif || '—');
    const p = sonuc.puan || {};
    const toplamSoru = (p.toplamD || 0) + (p.toplamY || 0) + (p.toplamB || 0);
    const yuzde = toplamSoru ? ((p.toplamD || 0) / toplamSoru * 100) : null;
    _s('kskPuan', yuzde != null ? yuzde.toFixed(1) : '—');
    _s('kskNet', p.toplamNet != null ? p.toplamNet.toFixed(2) : '—');
    kart.dataset.sonucId = sonuc.id;
    kart.hidden = false;

    if (_canliKartZamanlayici) clearTimeout(_canliKartZamanlayici);
    _canliKartZamanlayici = setTimeout(() => { kart.hidden = true; }, 3500);
}

// ════════════════════════════════════════════════════════════════
// MANUEL KAĞIT GİRİŞİ
// ════════════════════════════════════════════════════════════════
let _manuelCevaplar = {};
let _manuelDersler  = [];
let _manuelSeciliOgrenciId = null;

function manuelKagitAc() {
    _manuelCevaplar = {};
    _manuelDersler  = formDersleriniGetir(_aktifSinavId);
    _manuelSeciliOgrenciId = null;

    document.getElementById('manuelAdSoyad').value = '';
    document.getElementById('manuelNo').value = '';
    document.getElementById('manuelSinif').value = '';
    document.getElementById('manuelKitapcik').value = '';

    const sinav = DB.sinaviBul(_aktifSinavId);
    document.getElementById('manuelFormAdi').textContent = sinav?.optikFormAd || '—';
    document.getElementById('manuelNet').textContent = '0.0';

    const dersEl = document.getElementById('manuelDers');
    dersEl.innerHTML = _manuelDersler.map((d, i) => `<option value="${i}">${d.dersAdi}</option>`).join('');
    dersEl.selectedIndex = 0;

    // Sınıftan seç butonu — sadece ana uygulama içinden açıldığında (öğrenci verisi varsa) göster
    const siniftanSecWrap = document.getElementById('manuelSiniftanSecWrap');
    const sinifListesiKap = document.getElementById('manuelSinifListesi');
    if (siniftanSecWrap) siniftanSecWrap.style.display = veriKaynagi() ? 'block' : 'none';
    if (sinifListesiKap) { sinifListesiKap.style.display = 'none'; sinifListesiKap.innerHTML = ''; }

    manuelIzgaraCiz();
    _manuelIstatistikGuncelle();
    ekranGit('manuelKagit');
}

// ── Öğrenci no ile otomatik bulma ──
function _manuelTumOgrenciler() {
    const kaynak = veriKaynagi();
    if (!kaynak) return [];
    try {
        const siniflar = kaynak.siniflarGetir() || [];
        const tum = [];
        siniflar.forEach(s => {
            (kaynak.ogrencilerGetir(s.id) || []).forEach(o => tum.push({ ...o, sinifAd: s.ad }));
        });
        return tum;
    } catch { return []; }
}

function _manuelOgrenciSecimiUygula(o) {
    document.getElementById('manuelNo').value = o.ogrenciNo || '';
    document.getElementById('manuelAdSoyad').value = o.adSoyad || '';
    document.getElementById('manuelSinif').value = o.sinifAd || '';
    _manuelSeciliOgrenciId = o.id || null;
    const sinifListesiKap = document.getElementById('manuelSinifListesi');
    if (sinifListesiKap) sinifListesiKap.style.display = 'none';
}

function _manuelNoIleAra() {
    const no = document.getElementById('manuelNo').value.trim();
    if (!no) return;
    const bulunan = _manuelTumOgrenciler().find(o => String(o.ogrenciNo || '').trim() === no);
    if (bulunan) _manuelOgrenciSecimiUygula(bulunan);
}

// ── Sınıf seç → öğrenci listesi ──
function _manuelSinifListesiRender() {
    const kap = document.getElementById('manuelSinifListesi');
    const kaynak = veriKaynagi();
    if (!kap || !kaynak) return;
    const siniflar = kaynak.siniflarGetir() || [];
    if (!siniflar.length) { kap.innerHTML = '<p class="ogr-secim-bilgi">Sınıf bulunamadı.</p>'; return; }
    kap.innerHTML = siniflar.map(s => {
        const ogrenciler = kaynak.ogrencilerGetir(s.id) || [];
        return `<div class="sinif-grup">
            <div class="sinif-baslik" data-sinif="${s.id}">
                <span style="flex:1;"><strong>${_h(s.ad)}</strong></span>
                <small>${ogrenciler.length} öğrenci</small>
                <svg width="16" height="16" class="sinif-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div class="ogr-secim-listesi-kap" id="manuelOgrListeKap_${s.id}">
                ${ogrenciler.map(o => `
                    <div class="ogr-secim-satir manuel-ogr-satir" data-ogr="${o.id}">
                        <label style="flex:1;">${_h(o.adSoyad)}</label>
                        <small>${o.ogrenciNo || ''}</small>
                    </div>`).join('')}
            </div>
        </div>`;
    }).join('');

    kap.querySelectorAll('.sinif-baslik').forEach(baslik => {
        baslik.addEventListener('click', () => {
            document.getElementById('manuelOgrListeKap_' + baslik.dataset.sinif)?.classList.toggle('acik');
        });
    });
    kap.querySelectorAll('.manuel-ogr-satir').forEach(satir => {
        satir.addEventListener('click', () => {
            const o = _manuelTumOgrenciler().find(x => x.id === satir.dataset.ogr);
            if (o) { _manuelOgrenciSecimiUygula(o); _manuelIstatistikGuncelle(); }
        });
    });
}

function _manuelSiniftanSecToggle() {
    const kap = document.getElementById('manuelSinifListesi');
    if (!kap) return;
    const acilacak = kap.style.display === 'none';
    if (acilacak && !kap.innerHTML) _manuelSinifListesiRender();
    kap.style.display = acilacak ? 'block' : 'none';
}

function manuelIzgaraCiz() {
    const dersEl = document.getElementById('manuelDers');
    const alan   = document.getElementById('manuelSorular');
    if (!alan || !dersEl || !_manuelDersler.length) return;
    const idx     = parseInt(dersEl.value || '0', 10);
    const ders    = _manuelDersler[idx] || _manuelDersler[0];
    const dersAdi = ders.dersAdi;
    if (!_manuelCevaplar[dersAdi]) _manuelCevaplar[dersAdi] = {};
    const secimler = _manuelCevaplar[dersAdi];
    const harfler  = []; for (let i = 0; i < ders.sikSayisi; i++) harfler.push(String.fromCharCode(65 + i));

    alan.innerHTML = '';
    for (let soruNo = 1; soruNo <= ders.soruSayisi; soruNo++) {
        const secili = secimler[soruNo] || null;
        const satir = document.createElement('div'); satir.className = 'ogr-soru-satiri';
        const no = document.createElement('span'); no.className = 'soru-no'; no.textContent = soruNo + ')'; satir.appendChild(no);
        const grup = document.createElement('div'); grup.className = 'sik-grubu';
        harfler.forEach(harf => {
            const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'sik-daire'; btn.textContent = harf;
            if (secili === harf) btn.classList.add('manuel-sec');
            btn.addEventListener('click', () => {
                const zaten = secimler[soruNo] === harf;
                secimler[soruNo] = zaten ? null : harf;
                manuelIzgaraCiz(); _manuelIstatistikGuncelle();
            });
            grup.appendChild(btn);
        });
        satir.appendChild(grup); alan.appendChild(satir);
    }
}

function _manuelIstatistikGuncelle() {
    // YENİ (Ağustos 2026): manuel girişte de kitapçık türüne duyarlı anahtar.
    const kt = document.getElementById('manuelKitapcik')?.value;
    const anahtar = DB.anahtariGetir(_aktifSinavId, _sonucAnahtarTuru(_aktifSinavId, kt));
    const p = puanHesapla(_manuelCevaplar, anahtar, _manuelDersler, _sinavYanlisKatsayisi(_aktifSinavId));
    _s('manuelD', p.toplamD); _s('manuelY', p.toplamY); _s('manuelB', p.toplamB);
    _s('manuelN', p.toplamNet?.toFixed(2) ?? '0.0');
    _s('manuelNet', p.toplamNet?.toFixed(2) ?? '0.0');
}

function manuelKaydet() {
    const dersler = formDersleriniGetir(_aktifSinavId);
    const kitapcikTuru = document.getElementById('manuelKitapcik').value;
    const anahtar = DB.anahtariGetir(_aktifSinavId, _sonucAnahtarTuru(_aktifSinavId, kitapcikTuru));
    const sonuc = {
        id:          'sonuc_' + Date.now(),
        ogrenci: {
            adSoyad:   document.getElementById('manuelAdSoyad').value,
            ogrenciNo: document.getElementById('manuelNo').value,
            sinif:     document.getElementById('manuelSinif').value,
            kitapcikTuru,
            ogrenciId: _manuelSeciliOgrenciId || '',
        },
        cevaplar:    _manuelCevaplar,
        kagitGoruntusu: null,
        elleGirildi: true,
        tarih:       new Date().toLocaleDateString('tr-TR'),
    };
    sonuc.puan = puanHesapla(sonuc.cevaplar, anahtar, dersler, _sinavYanlisKatsayisi(_aktifSinavId));
    DB.sonucKaydet(_aktifSinavId, sonuc);
    kagitlariRender();
    ekranGit('sinavDetay');
}

// ════════════════════════════════════════════════════════════════
// OPTİK FORM OLUŞTUR
// ════════════════════════════════════════════════════════════════
async function optikOlusturAc() {
    document.getElementById('optikOlusturDurum').textContent = '';
    ekranGit('optikOlustur');
}

/** layoutHesapla() için doğru parametreleri üretir — Özel sınavlarda kendi soru/şık sayısını, seçilen yön/sayfa düzenini de ekler. */
function _layoutParamlariHazirla(sinav, secimler = {}) {
    const yon = secimler.yon || 'dikey';
    const sayfaDuzeni = secimler.sayfaDuzeni || 'otomatik';
    if (sinav?.optikFormId === 'ozel') {
        return { sinavTuru: 'ozel', soruSayisi: sinav.soruSayisi || 20, sikSayisi: sinav.sikSayisi || 4, sayfaDuzeni, yon };
    }
    // LGS/Bursluluk gibi sabit şablonlar her zaman dikey tam sayfadır; yön/düzen seçimi burada anlamsız.
    return { sinavTuru: sinav?.optikFormId };
}

/**
 * YENİ (Ağustos 2026): sınavın kullandığı forma ait GERÇEK layout nesnesini
 * döndürür — LGS/Bursluluk/Sabit Özel için LayoutEngine.layoutHesapla,
 * Optik Form Editörü ile tasarlanmış özel şablonlar (id 'ozelTasarim_...'
 * ile başlar) için OptikSablonMotoru.sablonuDerle üzerinden. Önizleme ve
 * gerçek PDF üretimi AYNI bu fonksiyonu kullanır, ikisi arasında sapma
 * olmasın diye.
 *
 * KAPSAM SINIRI: editörle tasarlanmış özel şablonlar şu an için LGS/
 * Bursluluk'taki gibi "sayfa başına birden fazla form" veya yatay yönlendirme
 * paketlemesini DESTEKLEMİYOR — her zaman tek sayfa, dikey, tasarlandığı
 * gibi basılır (yzYonSegment/yzDuzenSegment bu türde devre dışı bırakılmalı,
 * bkz. _sinavSabitSablonMu).
 */
function _layoutGetir(sinav, secimler = {}) {
    if (sinav?.optikFormId && sinav.optikFormId.startsWith('ozelTasarim_')) {
        return sablonDerlemesiniGetir(sinav.optikFormId);
    }
    return window.LayoutEngine.layoutHesapla(_layoutParamlariHazirla(sinav, secimler));
}

/** Sınav sabit bir MEB şablonu mu (LGS/Bursluluk) YA DA editörle tasarlanmış özel bir şablon mu — bu durumlarda yön/sayfa düzeni SEÇİLEMEZ. */
function _sinavSabitSablonMu(sinav) {
    if (sinav?.optikFormId && sinav.optikFormId.startsWith('ozelTasarim_')) return true;
    return !!sinav?.optikFormId && sinav.optikFormId !== 'ozel';
}

async function _pdfKaydet(doc, dosyaAdi) {
    if (window.DisaAktar && typeof window.DisaAktar.dosyaKaydet === 'function') {
        return window.DisaAktar.dosyaKaydet(
            doc.output('datauristring').split(',')[1],
            dosyaAdi,
            'application/pdf',
            () => doc.save(dosyaAdi)
        );
    }
    doc.save(dosyaAdi);
}

async function _yzOgrenciListesiGetir(sinav) {
    const kaynak = veriKaynagi();
    if (!kaynak) return null;
    const okulAdi = _okulAdiGetir();
    const ogrList = [];
    kaynak.siniflarGetir().forEach(s => {
        kaynak.ogrencilerGetir(s.id).forEach(o => {
            if (sinav.ogrenciIdleri.includes(o.id)) {
                ogrList.push({ adSoyad: o.adSoyad, ogrenciNo: o.ogrenciNo, sinif: s.ad, sinavAdi: sinav.ad, okulAdi, kitapcikTuru: _ogrenciKitapcikTuru(sinav, o.id), ogrenciId: o.id, sinavId: sinav.optikFormId });
            }
        });
    });
    return ogrList;
}

// ── Yazdırma Seçenekleri sheet (yön / sayfa düzeni / önizleme) ──
let _yzMod = null; // 'bos' | 'ogrenciler'
let _yzSecimleri = { yon: 'dikey', sayfaDuzeni: 'otomatik' };

function yazdirmaSecenekleriAc(mod) {
    const sinav = DB.sinaviBul(_aktifSinavId);
    if (!sinav) return;
    if (mod === 'ogrenciler' && !sinav.ogrenciIdleri?.length) { alert('Bu sınava öğrenci eklenmemiş.'); return; }

    _yzMod = mod;
    _yzSecimleri = { yon: 'dikey', sayfaDuzeni: 'otomatik' };

    document.getElementById('yzOnizlemeDurum').textContent = '';

    const sabitMi = _sinavSabitSablonMu(sinav);
    document.getElementById('yzSabitSablonNotu').hidden = !sabitMi;
    document.getElementById('yzCokluBilgiNotu').hidden = sabitMi || mod !== 'ogrenciler';

    ['yzYonSegment', 'yzDuzenSegment'].forEach(id => {
        document.getElementById(id).querySelectorAll('button').forEach(b => { b.disabled = sabitMi; });
    });
    document.getElementById('yzYonSegment').querySelectorAll('button').forEach(b => b.classList.toggle('yz-aktif', b.dataset.yon === 'dikey'));
    document.getElementById('yzDuzenSegment').querySelectorAll('button').forEach(b => b.classList.toggle('yz-aktif', b.dataset.duzen === 'otomatik'));

    sheetAc('sheetYazdirmaSecenekleri');
}

function _yzSegmentBagla(containerId, datasetAdi, secimAnahtari) {
    document.getElementById(containerId).querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            document.getElementById(containerId).querySelectorAll('button').forEach(b => b.classList.remove('yz-aktif'));
            btn.classList.add('yz-aktif');
            let deger = btn.dataset[datasetAdi];
            // "1"/"2"/"4"/"6" gibi salt sayısal değerleri (data-duzen) Number'a çevir —
            // layoutEngine.js'teki switch(formsPerA4){case 4: ...} sıkı (===) tip
            // karşılaştırması yapıyor, string "4" sayısal 4'e EŞİT SAYILMAZ.
            // 'otomatik' / 'dikey' / 'yatay' gibi metin değerler olduğu gibi kalır.
            if (/^\d+$/.test(deger)) deger = Number(deger);
            _yzSecimleri[secimAnahtari] = deger;
            // seçenek değişti — önizleme artık ayrı bir pencerede olduğu için burada gizlenecek bir şey yok
        });
    });
}

/* ====================================================================
   OPTİK FORM ÖNİZLEME/YAZDIRMA PENCERESİ
   Android'in çıplak WebView bileşeninde <iframe src="blob:...">  ile PDF
   göstermek ÇALIŞMIYOR (PDF görüntüleyici eklentisi yok) — WebView bunu
   render edemeyip bir indirme/"Aç" akışına düşüyor, önizleme boş kalıyor.

   Çözüm: formu jsPDF ile değil canvasFormGenerator.js ile (AYNI çizim
   fonksiyonlarını kullanarak, bkz. pdfFormGenerator.js export notu) bir
   <canvas>'a çizip PNG'ye çeviriyoruz, sonra bu görselleri uygulamanın
   geri kalanında zaten kullanılan "HTML + Yazdır/PDF İndir + Kapat" kalıbına
   (bkz. js/app.js uygulamaHtmlYazdir) sarıp açıyoruz. Bu hem önizlemeyi
   gerçekten görünür kılıyor hem de Android'de gerçek sistem yazdırma
   diyaloğunu (PrintPlugin → PrintManager, "PDF olarak kaydet" dahil)
   devreye sokuyor.
   ==================================================================== */
/**
 * optik modülü, isim çakışmalarını önlemek için ana uygulamadan KASITLI
 * OLARAK ayrı bir iframe'de çalışır (bkz. js/optik-entegrasyon.js) — bu
 * yüzden ana uygulamanın uygulamaHtmlYazdir() yardımcı fonksiyonu bu
 * sayfanın kendi `window`'unda değil, `window.parent`'ta bulunur. Optik
 * bir gün bağımsız (iframe olmadan) açılırsa diye basit bir yedek de var.
 */
function _uygulamaHtmlYazdirCagir(rawHtml, isAdi, yon) {
    try {
        if (window.parent && window.parent !== window && typeof window.parent.uygulamaHtmlYazdir === 'function') {
            window.parent.uygulamaHtmlYazdir(rawHtml, isAdi, yon);
            return;
        }
    } catch (e) { /* çapraz pencere erişimi engellenmiş olabilir — aşağıdaki yedeğe düş */ }
    try {
        const blob = new Blob([rawHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (!win) throw new Error('popup_blocked');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e2) {
        alert('Önizleme penceresi açılamadı: ' + (e2 && e2.message));
    }
}

function _optikOnizlePenceresiAc(sayfalar, baslik, sayfaBilgi) {
    const yatayMi = sayfalar[0] && sayfalar[0].genislikMM > sayfalar[0].yukseklikMM;
    const sayfaHtml = sayfalar.map((s, i) =>
        `<img class="oy-sayfa" src="${s.dataUrl}" style="width:${s.genislikMM}mm;height:${s.yukseklikMM}mm;" alt="Sayfa ${i + 1}">`
    ).join('\n');

    const rawHtml = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>${_h(baslik)}</title><style>
      body{margin:0;background:#e5e7eb;font-family:Manrope,Arial,sans-serif;}
      .oy-bilgi{padding:10px 14px;font-size:12.5px;color:#374151;background:#f3f2ff;text-align:center;}
      .oy-sayfa{display:block;margin:14px auto;box-shadow:0 2px 10px rgba(0,0,0,.25);background:#fff;}
      @media print{
        body{background:#fff;}
        .oy-bilgi{display:none;}
        .oy-sayfa{margin:0;box-shadow:none;page-break-after:always;}
      }
    </style></head><body>
    <div class="oy-bilgi">${_h(sayfaBilgi)}</div>
    ${sayfaHtml}
    </body></html>`;

    _uygulamaHtmlYazdirCagir(rawHtml, baslik.replace(/\s+/g, '_'), yatayMi ? 'yatay' : 'dikey');
}

/** Önizleme: gerçek indirmeyi tetiklemeden, seçilen yön/düzenle NASIL görüneceğini bir yazdırma penceresinde gösterir. */
async function yzOnizleOlustur() {
    const sinav = DB.sinaviBul(_aktifSinavId);
    const durumEl = document.getElementById('yzOnizlemeDurum');
    if (!sinav) return;
    durumEl.textContent = 'Önizleme hazırlanıyor...';
    try {
        const layout = _layoutGetir(sinav, _yzSecimleri);
        const { bosFormGorseliOlustur, ogrenciFormGorselleriOlustur } = await import('./canvasFormGenerator.js');
        let sayfalar, sayfaBilgi;

        if (_yzMod === 'bos') {
            const gorsel = await bosFormGorseliOlustur(layout, {
                adSoyad: 'ÖRNEK ÖĞRENCİ', ogrenciNo: '1', sinif: '—',
                sinavAdi: sinav.ad, okulAdi: _okulAdiGetir() || 'Okul Adı', kitapcikTuru: '', ogrenciId: '', sinavId: sinav.optikFormId
            });
            sayfalar = [gorsel];
            sayfaBilgi = '1 sayfa (boş form) — önizleme';
        } else {
            const ogrList = await _yzOgrenciListesiGetir(sinav);
            if (!ogrList || !ogrList.length) { alert('Öğrenci bilgisi bulunamadı.'); durumEl.textContent = ''; return; }
            // Hızlı olması için önizlemede sadece ilk sayfayı dolduracak kadar öğrenci kullanılır;
            // gerçek "Oluştur ve İndir"de TÜM öğrenciler işlenir.
            const slotSayisi = layout.formlar.length;
            const ornekListe = ogrList.slice(0, slotSayisi);
            sayfalar = await ogrenciFormGorselleriOlustur(layout, ornekListe);
            const toplamSayfa = Math.ceil(ogrList.length / slotSayisi);
            sayfaBilgi = slotSayisi > 1
                ? `Örnek sayfa (${ornekListe.length}/${slotSayisi} form dolu, her form ayrı öğrenci) — toplam ${ogrList.length} öğrenci için ${toplamSayfa} sayfa üretilecek`
                : `Örnek sayfa — toplam ${ogrList.length} öğrenci için ${ogrList.length} sayfa üretilecek`;
        }

        durumEl.textContent = '';
        _optikOnizlePenceresiAc(sayfalar, 'Optik Form Önizleme', sayfaBilgi);
    } catch (e) { durumEl.textContent = '❌ Hata: ' + e.message; }
}

/** Seçilen yön/sayfa düzeniyle GERÇEK PDF'i üretir ve indirir. */
/** Bir promise'i sınırlı sürede bekler; süre dolarsa HANGİ adımda takıldığını
 *  belirten net bir hatayla reddeder — böylece "Oluşturuluyor..." ekranda
 *  süresiz asılı kalamaz (bkz. kullanıcı bildirimi: dakikalarca takılı kalma). */
function _zamanAsimliBekle(promise, ms, asamaAdi) {
    return new Promise((resolve, reject) => {
        const zamanlayici = setTimeout(() => {
            reject(new Error(`${asamaAdi} ${Math.round(ms / 1000)} saniyede tamamlanmadı (zaman aşımı) — cihaz/depolama izni onayı beklemiş olabilir.`));
        }, ms);
        promise.then(
            (deger) => { clearTimeout(zamanlayici); resolve(deger); },
            (hata) => { clearTimeout(zamanlayici); reject(hata); }
        );
    });
}

async function yzOnaylaVeIndir() {
    const sinav = DB.sinaviBul(_aktifSinavId);
    const durumEl = document.getElementById('optikOlusturDurum');
    if (!sinav) return;
    sheetKapat('sheetYazdirmaSecenekleri');
    durumEl.textContent = 'Oluşturuluyor...';
    try {
        const layout = _layoutGetir(sinav, _yzSecimleri);
        if (_yzMod === 'bos') {
            const { formPdfOlustur } = await import('./pdfFormGenerator.js');
            const doc = await _zamanAsimliBekle(formPdfOlustur(layout, {
                adSoyad: '', ogrenciNo: '', sinif: '',
                sinavAdi: sinav.ad, okulAdi: _okulAdiGetir(), kitapcikTuru: '', ogrenciId: '', sinavId: sinav.optikFormId
            }), 30000, 'PDF oluşturma');
            await _zamanAsimliBekle(_pdfKaydet(doc, sinav.ad.replace(/\s+/g, '_') + '_bos.pdf'), 20000, 'Dosya kaydetme');
            durumEl.textContent = '✅ PDF indirildi.';
        } else {
            const ogrList = await _yzOgrenciListesiGetir(sinav);
            if (!ogrList) { alert('Uygulama içinden açılması gerekiyor.'); durumEl.textContent = ''; return; }
            if (!ogrList.length) { alert('Öğrenci bilgisi bulunamadı.'); durumEl.textContent = ''; return; }
            durumEl.textContent = `Oluşturuluyor... (${ogrList.length} öğrenci)`;
            const { topluFormPdfOlustur } = await import('./pdfFormGenerator.js');
            const doc = await _zamanAsimliBekle(topluFormPdfOlustur(layout, ogrList), 60000, 'PDF oluşturma');
            durumEl.textContent = `Kaydediliyor... (${ogrList.length} öğrenci)`;
            await _zamanAsimliBekle(_pdfKaydet(doc, sinav.ad.replace(/\s+/g, '_') + '_ogrenciler.pdf'), 20000, 'Dosya kaydetme');
            durumEl.textContent = `✅ ${ogrList.length} öğrenci için PDF indirildi.`;
        }
    } catch (e) { durumEl.textContent = '❌ Hata: ' + e.message; }
}

// ════════════════════════════════════════════════════════════════
// BOTTOM SHEETS
// ════════════════════════════════════════════════════════════════
function sheetAc(id)   { const el = document.getElementById(id); if (el) el.hidden = false; }
function sheetKapat(id){ const el = document.getElementById(id); if (el) el.hidden = true; }

function sheetOnay(baslik, metin, onayFn, onaylaEtiket) {
    _s('sheetOnayBaslik', baslik);
    _s('sheetOnayMetin', metin);
    const onaylaBtn = document.getElementById('sheetOnayOnayla');
    if (onaylaBtn) onaylaBtn.textContent = onaylaEtiket || 'Sil';
    document.getElementById('sheetOnayOnayla').onclick = () => { sheetKapat('sheetOnay'); onayFn(); };
    sheetAc('sheetOnay');
}

function optikFormSheetAc(onSecim) {
    _optikFormOnSecimCB = onSecim;
    const liste = document.getElementById('optikFormSeciciListesi');
    if (liste) {
        const ozelSablonlar = DB.ozelSablonlariGetir();
        const tasarlaSatiri = `
            <button class="bs-liste-satir" data-tasarla="1">
                <div class="bs-liste-ikon" style="background:#FCE4EC;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C2185B" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
                </div>
                <div class="bs-liste-bilgi">
                    <strong>🎨 Kendi Formunu Tasarla</strong>
                    <small>Baloncukları, alanları serbestçe yerleştir</small>
                </div>
            </button>`;
        const ozelSatirlari = ozelSablonlar.map(k => `
            <button class="bs-liste-satir" data-ozel-id="${k.id}">
                <div class="bs-liste-ikon" style="background:#F3E5F5;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8E24AA" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div class="bs-liste-bilgi">
                    <strong>${_h(k.ad)}</strong>
                    <small>Kendi tasarladığın form — düzenlemek için uzun bas</small>
                </div>
            </button>`).join('');
        liste.innerHTML = tasarlaSatiri + ozelSatirlari + SABLONLAR.map(s => `
            <button class="bs-liste-satir" data-id="${s.id}">
                <div class="bs-liste-ikon" style="background:#E3F2FD;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E88E5" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div class="bs-liste-bilgi">
                    <strong>${_h(s.ad)}</strong>
                    <small>${s.soruSayisi ? s.soruSayisi + ' Soru' : 'Soru sayısını kendin belirle'}</small>
                </div>
            </button>`).join('');
        liste.querySelectorAll('[data-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                sheetKapat('sheetOptikForm');
                onSecim(SABLONLAR.find(s => s.id === btn.dataset.id));
            });
        });
        liste.querySelectorAll('[data-ozel-id]').forEach(btn => {
            let uzunBasmaTetiklendiMi = false;
            btn.addEventListener('click', () => {
                if (uzunBasmaTetiklendiMi) { uzunBasmaTetiklendiMi = false; return; } // uzun basma zaten işlemi yaptı, tıklamayı yok say
                sheetKapat('sheetOptikForm');
                const kayit = DB.ozelSablonBul(btn.dataset.ozelId);
                const form = sablonDerlemesiniGetir(kayit.id);
                onSecim({ id: kayit.id, ad: kayit.ad, soruSayisi: form.soruSayisi, sikSayisi: form.sikSayisi });
            });
            // YENİ (Sedat geri bildirimi, Ağustos 2026): satırda zaten
            // "düzenlemek için uzun bas" yazıyordu ama hiç bağlanmamıştı —
            // Pointer Events ile gerçek uzun-basma algılama (500ms, 10px'ten
            // fazla parmak kayarsa iptal — kaydırmayla karışmasın).
            let uzunBasmaZamanlayici = null;
            let uzunBasmaBaslangic = null;
            const UZUN_BASMA_MS = 500, UZUN_BASMA_TOLERANS_PX = 10;
            btn.addEventListener('pointerdown', (ev) => {
                uzunBasmaBaslangic = { x: ev.clientX, y: ev.clientY };
                uzunBasmaZamanlayici = setTimeout(() => {
                    uzunBasmaZamanlayici = null;
                    uzunBasmaTetiklendiMi = true; // sonra gelecek click'i bastır
                    if (navigator.vibrate) navigator.vibrate(15);
                    sheetKapat('sheetOptikForm');
                    sablonEditoruAc(btn.dataset.ozelId);
                }, UZUN_BASMA_MS);
            });
            const uzunBasmaIptal = (ev) => {
                if (uzunBasmaZamanlayici && ev && ev.type === 'pointermove' && uzunBasmaBaslangic) {
                    const dx = ev.clientX - uzunBasmaBaslangic.x, dy = ev.clientY - uzunBasmaBaslangic.y;
                    if (Math.hypot(dx, dy) < UZUN_BASMA_TOLERANS_PX) return; // küçük titreşim, iptal etme
                }
                if (uzunBasmaZamanlayici) { clearTimeout(uzunBasmaZamanlayici); uzunBasmaZamanlayici = null; }
            };
            btn.addEventListener('pointermove', uzunBasmaIptal);
            btn.addEventListener('pointerup', uzunBasmaIptal);
            btn.addEventListener('pointercancel', uzunBasmaIptal);
        });
        const tasarlaBtn = liste.querySelector('[data-tasarla]');
        if (tasarlaBtn) {
            tasarlaBtn.addEventListener('click', () => {
                sheetKapat('sheetOptikForm');
                sablonEditoruAc(null);
            });
        }
    }
    sheetAc('sheetOptikForm');
}

// ════════════════════════════════════════════════════════════════
// GALERİ
// ════════════════════════════════════════════════════════════════
function galeriSecimIsle(dosyalar) {
    if (!dosyalar?.length) return;
    sheetKapat('sheetKagitEkle');
    // Taramadan hemen önce köprüyü tazele — sınav bilgisi (ör. seçilen
    // form) son sinavDetayAc()'tan beri değişmiş olabilir.
    _optikAktifFormGuncelle();
    // galeriSecici.js baglaGaleriSecici fonksiyonu kullanılıyor
    // Her dosya için omrEngine ile işle
    Array.from(dosyalar).forEach(async dosya => {
        const reader = new FileReader();
        reader.onload = async e => {
            const img = new Image();
            img.onload = async () => {
                const cvs = document.getElementById('canvas');
                cvs.width = img.width; cvs.height = img.height;
                cvs.getContext('2d').drawImage(img, 0, 0);
                try {
                    // galeriSecici.js flow'u kullaniliyor - bu satir kaldirildi
                    // formOkuyucu.js ile işle
                    const { formuOkuVeGoster } = await import('./formOkuyucu.js');
                    await formuOkuVeGoster('canvas', 'resultCanvas', 'statusText', 'hataKutusu');
                } catch(err) { console.error('Galeri okuma hatası', err); }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(dosya);
    });
}

// ════════════════════════════════════════════════════════════════
// ANAHTAR EXCEL İÇE/DIŞA AKTAR
// ════════════════════════════════════════════════════════════════
async function anahtarExcelYukle(dosya) {
    try {
        // Önce eski CevapAnahtari modülünü dene
        const kaynak = window.CevapAnahtari;
        if (kaynak?.exceldenYukle) {
            await kaynak.exceldenYukle(dosya);
            const a = kaynak.getir?.();
            if (a?.dersler?.length) { DB.anahtarKaydet(_aktifSinavId, a, _anahtarAktifKitapcik); anahtarIzgaraCiz(); _tumSonuclariYenidenHesapla(); return; }
        }
        // CSV fallback
        const metin = await dosya.text();
        const satirlar = metin.split('\n').filter(s => s.trim());
        const baslikSatir = satirlar[0].toLowerCase();
        const dersIdx  = baslikSatir.split(',').findIndex(h => h.includes('ders'));
        const soruIdx  = baslikSatir.split(',').findIndex(h => h.includes('soru') || h.includes('no'));
        const cevapIdx = baslikSatir.split(',').findIndex(h => h.includes('cevap') || h.includes('doğru') || h.includes('dogru'));
        if (dersIdx < 0 || soruIdx < 0 || cevapIdx < 0) { alert('CSV formatı tanınmadı. Beklenen sütunlar: Ders, Soru No, Doğru Cevap'); return; }
        const yeniAnahtar = { dersler: [] };
        satirlar.slice(1).forEach(satir => {
            const huc = satir.split(',');
            const dersAdi = (huc[dersIdx] || '').trim();
            const soruNo  = parseInt((huc[soruIdx] || '').trim(), 10);
            const dogru   = (huc[cevapIdx] || '').trim().toUpperCase();
            if (!dersAdi || !soruNo || !dogru) return;
            let ders = yeniAnahtar.dersler.find(d => d.dersAdi === dersAdi);
            if (!ders) { ders = { dersAdi, anahtarlar: [] }; yeniAnahtar.dersler.push(ders); }
            ders.anahtarlar.push({ soruNo, dogru });
        });
        DB.anahtarKaydet(_aktifSinavId, yeniAnahtar, _anahtarAktifKitapcik);
        anahtarIzgaraCiz();
        _tumSonuclariYenidenHesapla();
        alert(`✅ ${yeniAnahtar.dersler.reduce((t, d) => t + d.anahtarlar.length, 0)} soru cevabı yüklendi.`);
    } catch (e) { alert('İçe aktarma hatası: ' + e.message); }
}

async function anahtarDisaAktar() {
    const anahtar = DB.anahtariGetir(_aktifSinavId, _anahtarAktifKitapcik);
    const derslerDolu = (anahtar.dersler || []).filter(d => d.anahtarlar?.length);
    if (!derslerDolu.length) { alert('Dışa aktarılacak cevap anahtarı yok.'); return; }

    // SheetJS ile xlsx oluştur
    if (!window.XLSX) {
        await new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
        });
    }

    const satirlar = [['Ders', 'Soru No', 'Doğru Cevap']];
    derslerDolu.forEach(d => d.anahtarlar.forEach(a => {
        satirlar.push([d.dersAdi, a.soruNo, a.dogru]);
    }));

    const ws = XLSX.utils.aoa_to_sheet(satirlar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cevap Anahtarı');
    const dosyaAdi = (DB.sinaviBul(_aktifSinavId)?.ad || 'anahtar') + '_cevap_anahtari.xlsx';
    XLSX.writeFile(wb, dosyaAdi);
}

// ════════════════════════════════════════════════════════════════
// BAŞLAT — TÜM OLAY DİNLEYİCİLERİ
// ════════════════════════════════════════════════════════════════
function baslat() {
    // ── Ekran 1: Sınavlar ──
    sinavlariRender();
    document.getElementById('fabYeniSinav').addEventListener('click', yeniSinavAc);

    // ── Ekran 2: Yeni Sınav ──
    document.getElementById('btnYeniSinavKapat').addEventListener('click', () => ekranGit('sinavlar'));
    document.getElementById('btnYeniSinavKaydet').addEventListener('click', yeniSinavKaydet);
    document.getElementById('ysOgrenciSecBtn').addEventListener('click', () => {
        sheetAc('sheetOgrenciSecimi');
    });
    document.getElementById('btnOgrenciSecTamam').addEventListener('click', () => {
        sheetKapat('sheetOgrenciSecimi');
        _ogrenciSecimOzetiGuncelle();
    });
    document.getElementById('ysOptikFormSec').addEventListener('click', () => {
        optikFormSheetAc(sablon => {
            _ysSablonSecilen = sablon;
            const metEl = document.getElementById('ysOptikFormAdi');
            metEl.textContent = sablon.soruSayisi ? `${sablon.ad} (${sablon.soruSayisi} Soru)` : sablon.ad;
            metEl.style.color = 'var(--text)';
            const ozelBlok = document.getElementById('ysOzelAyarBlok');
            if (ozelBlok) ozelBlok.hidden = sablon.id !== 'ozel';
        });
    });
    document.getElementById('btnSablonEditorGeri').addEventListener('click', () => ekranGit('yeniSinav'));

    // ── Ekran 3: Sınav Detay ──
    document.getElementById('btnSinavDetayGeri').addEventListener('click', () => { _aktifSinavId = null; window.OptikAktifForm = null; ekranGit('sinavlar'); sinavlariRender(); });
    document.getElementById('btnOptikOlustur').addEventListener('click', optikOlusturAc);

    // Sekmeler
    document.querySelectorAll('#sekmeBar .sekme').forEach(btn =>
        btn.addEventListener('click', () => {
            sekmeAktiflestir(btn.dataset.sekme);
            if (btn.dataset.sekme === 'anahtar') anahtarIzgaraCiz();
        })
    );

    // Kağıtlar FABları
    document.getElementById('fabKamera').addEventListener('click', kameraAc);
    document.getElementById('fabKagitEkle').addEventListener('click', () => sheetAc('sheetKagitEkle'));
    document.getElementById('btnPuanYenidenHesapla')?.addEventListener('click', function () {
        this.classList.remove('donuyor');
        void this.offsetWidth; // animasyonu sıfırla, tekrar tetikleyebilmek için
        this.classList.add('donuyor');
        _tumSonuclariYenidenHesapla();
    });

    // ── Ekran 4: Öğrenci Detay ──
    document.getElementById('btnOgrDetayGeri').addEventListener('click', () => { _aktifSonucId = null; ekranGit('sinavDetay'); });
    document.getElementById('btnOgrDetayKaydet').addEventListener('click', ogrDetayKaydet);
    // Kağıt görüntüsüne dokununca tam ekran yakınlaştırılabilir görüntüleyici
    // aç — içerik dinamik olarak img/canvas olarak değiştiği için delege
    // (event delegation) kullanılıyor, o an ne varsa onun kaynağını alır.
    document.getElementById('ogrDetayResimAlani').addEventListener('click', (e) => {
        const img = e.currentTarget.querySelector('img');
        const canvas = e.currentTarget.querySelector('canvas');
        const kaynak = canvas ? canvas.toDataURL('image/png') : (img ? img.src : null);
        if (kaynak) ogrDetayResimBuyutAc(kaynak);
    });
    document.getElementById('ogrDetayNo').addEventListener('change', _ogrDetayNoIleAra);
    document.getElementById('ogrDetayNo').addEventListener('blur', _ogrDetayNoIleAra);
    document.getElementById('ogrDetayDers').addEventListener('change', () => {
        const son = DB.sonuclariGetir(_aktifSinavId).find(s => s.id === _aktifSonucId);
        if (son) ogrDetayIzgaraCiz(son);
    });
    document.querySelectorAll('.ir-sekme').forEach(btn =>
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ir-sekme').forEach(b => b.classList.toggle('aktif', b === btn));
            document.getElementById('irIcerik').classList.toggle('aktif', btn.dataset.ir === 'icerik');
            document.getElementById('irResim').classList.toggle('aktif', btn.dataset.ir === 'resim');
        })
    );
    // Pill sil butonları (öğrenci detay + manuel)
    document.querySelectorAll('.pill-sil').forEach(btn =>
        btn.addEventListener('click', () => {
            const el = document.getElementById(btn.dataset.h);
            if (el) el.value = '';
            if (['manuelNo', 'manuelAdSoyad', 'manuelSinif'].includes(btn.dataset.h)) _manuelSeciliOgrenciId = null;
        })
    );

    // ── Ekran 5: Optik Oluştur ──
    document.getElementById('btnOptikOlusturGeri').addEventListener('click', () => ekranGit('sinavDetay'));
    document.getElementById('btnBosForm').addEventListener('click', () => yazdirmaSecenekleriAc('bos'));
    document.getElementById('btnOgrencilerIcinForm').addEventListener('click', () => yazdirmaSecenekleriAc('ogrenciler'));
    document.getElementById('btnYzOnizle').addEventListener('click', yzOnizleOlustur);
    document.getElementById('btnYzOnayla').addEventListener('click', yzOnaylaVeIndir);
    _yzSegmentBagla('yzYonSegment', 'yon', 'yon');
    _yzSegmentBagla('yzDuzenSegment', 'duzen', 'sayfaDuzeni');

    // ── Ekran 6: Manuel Kağıt ──
    document.getElementById('btnManuelKapat').addEventListener('click', () => ekranGit('sinavDetay'));
    document.getElementById('btnLgsPuanGeri').addEventListener('click', () => ekranGit('sinavDetay'));
    document.getElementById('btnLgsAyarToggle').addEventListener('click', () => {
        const panel = document.getElementById('lgsAyarPanel');
        if (!panel) return;
        const acilacak = panel.style.display === 'none';
        if (acilacak) _lgsAyarPaneliniRender();
        panel.style.display = acilacak ? 'flex' : 'none';
    });
    document.getElementById('btnManuelKaydet').addEventListener('click', manuelKaydet);
    document.getElementById('manuelDers').addEventListener('change', manuelIzgaraCiz);
    document.getElementById('btnManuelSiniftanSec').addEventListener('click', _manuelSiniftanSecToggle);
    document.getElementById('manuelNo').addEventListener('change', _manuelNoIleAra);
    document.getElementById('manuelNo').addEventListener('blur', _manuelNoIleAra);
    // Elle sınıf/ad değiştirilirse artık listeden gelen eşleşme geçersiz sayılır
    document.getElementById('manuelAdSoyad').addEventListener('input', () => { _manuelSeciliOgrenciId = null; });

    // ── Kamera ──
    document.getElementById('kameraKapatBtn').addEventListener('click', kameraKapat);
    // galeriInput -> baglaGaleriSecici asagida bagliyor

    // ── Bottom sheets ──
    document.getElementById('sheetKagitEkle').addEventListener('click', e => { if (e.target === e.currentTarget) sheetKapat('sheetKagitEkle'); });
    document.getElementById('sheetOptikForm').addEventListener('click', e => { if (e.target === e.currentTarget) sheetKapat('sheetOptikForm'); });
    document.getElementById('sheetOnay').addEventListener('click', e => { if (e.target === e.currentTarget) sheetKapat('sheetOnay'); });
    document.getElementById('sheetOnayIptal').addEventListener('click', () => sheetKapat('sheetOnay'));
    document.getElementById('bsGaleri').addEventListener('click', () => {
        sheetKapat('sheetKagitEkle');
        const inp = document.getElementById('galeriInputSheet');
        if (inp) inp.click();
    });
    // galeriInputSheet -> baglaGaleriSecici asagida bagliyor
    document.getElementById('bsManuel').addEventListener('click', () => { sheetKapat('sheetKagitEkle'); manuelKagitAc(); });

    // ── Anahtar araçlar ──
    document.getElementById('anahDersSecici').addEventListener('change', anahtarIzgaraCiz);
    document.getElementById('anahtarExcelInput').addEventListener('change', function () {
        if (this.files[0]) anahtarExcelYukle(this.files[0]); this.value = '';
    });
    document.getElementById('btnAnahtarDisaAktar').addEventListener('click', anahtarDisaAktar);
    // YENİ (Ağustos 2026): A/B kitapçık seçici — sekme değişince ekranı
    // o kitapçığın anahtarıyla yeniden çizer.
    document.getElementById('btnAnahKitapcikA')?.addEventListener('click', () => { _anahtarAktifKitapcik = 'A'; anahtarPaneliniRender(); });
    document.getElementById('btnAnahKitapcikB')?.addEventListener('click', () => { _anahtarAktifKitapcik = 'B'; anahtarPaneliniRender(); });
    // YENİ (Ağustos 2026, Sedat isteği): "Öğrencilerin kitapçık türü otomatik
    // ve manuel atama yapabilme imkanı olsun".
    document.getElementById('btnKitapcikAtamalari')?.addEventListener('click', _kitapcikAtamaSheetAc);
    document.getElementById('btnKitapcikOtomatikAta')?.addEventListener('click', _kitapcikOtomatikAta);
    document.getElementById('btnKitapcikAtamaKaydet')?.addEventListener('click', _kitapcikAtamaKaydet);
    document.getElementById('btnAnahtarTemizle').addEventListener('click', () => {
        sheetOnay('Cevap anahtarı silinsin mi?', 'Bu işlem geri alınamaz.', () => {
            DB.anahtarKaydet(_aktifSinavId, { dersler: [] }, _anahtarAktifKitapcik);
            anahtarIzgaraCiz(); _tumSonuclariYenidenHesapla();
        });
    });
    document.getElementById('btnMiniAnahtar').addEventListener('click', async () => {
        if (!_aktifSinavId) return;
        const dersler = formDersleriniGetir(_aktifSinavId);
        const anahtar = DB.anahtariGetir(_aktifSinavId);
        const sinavAdi = DB.sinaviBul(_aktifSinavId)?.ad;
        const { DisaAktar } = await import('./disaAktar.js').catch(() => ({ DisaAktar: window.DisaAktar }));
        (DisaAktar || window.DisaAktar)?.miniAnahtarPdfIndir?.(dersler, anahtar, sinavAdi);
    });

    // Raporlar
    document.querySelectorAll('.rapor-satir').forEach(btn =>
        btn.addEventListener('click', async () => {
            const r = btn.dataset.rapor;
            if (r === 'excel') {
                const sonuclar = DB.sonuclariGetir(_aktifSinavId);
                const { DisaAktar } = await import('./disaAktar.js').catch(() => ({ DisaAktar: window.DisaAktar }));
                (DisaAktar || window.DisaAktar)?.excelIndir?.(sonuclar, { sinavAdi: DB.sinaviBul(_aktifSinavId)?.ad });
            } else if (r === 'lgs') {
                lgsPuanRaporunuAcVeGoster();
            } else { alert(`"${btn.querySelector('span').textContent}" raporu yakında eklenecek.`); }
        })
    );

    // galeriSecici.js bağla - hem kamera overlay hem bottom sheet
    baglaGaleriSecici('galeriInput', 'canvas');
    baglaGaleriSecici('galeriInputSheet', 'canvas');

    // Kamera start/stop butonları
    import('./camera.js').then(mod => {
        const startBtn = document.getElementById('start');
        const stopBtn  = document.getElementById('stop');
        const captureBtn = document.getElementById('capture');
        const statusEl = document.getElementById('statusText');
        if (startBtn) startBtn.addEventListener('click', async () => {
            try {
                statusEl.textContent = 'Kamera açılıyor...';
                await (mod.startCamera?.() || window.startCamera?.());
                statusEl.textContent = 'Hazır';
                // Kamera açılınca varsayılan olarak canlı tarama modu AÇIK
                // başlasın (kullanıcı isterse Ayarlar'dan kapatabilir).
                const canliSwBaslangic = document.getElementById('canliModSwitch');
                if (canliSwBaslangic && !canliSwBaslangic.checked) {
                    canliSwBaslangic.checked = true;
                    canliSwBaslangic.dispatchEvent(new Event('change'));
                }
                // Torch butonunu sadece cihaz destekliyorsa göster.
                const torchBtn = document.getElementById('kameraTorchBtn');
                if (torchBtn) {
                    setTimeout(() => {
                        torchBtn.hidden = !mod.torchDesteginiKontrolEt?.();
                    }, 300); // stream track'i hazır olsun diye küçük gecikme
                }
            } catch (e) { statusEl.textContent = 'Kamera açılamadı'; }
        });
        if (stopBtn) stopBtn.addEventListener('click', () => {
            try { mod.stopCamera?.() || window.stopCamera?.(); } catch {}
            _canliModAktif = false;
            const sw = document.getElementById('canliModSwitch');
            if (sw) sw.checked = false;
        });
        if (captureBtn) captureBtn.addEventListener('click', async () => {
            try { statusEl.textContent = 'İşleniyor...'; await (mod.capturePhoto?.() || window.capturePhoto?.()); } catch (e) { statusEl.textContent = 'Fotoğraf alınamadı'; }
        });

        // ── Canlı tarama modu aç/kapat ──
        const canliSw = document.getElementById('canliModSwitch');
        if (canliSw) canliSw.addEventListener('change', () => {
            if (canliSw.checked) {
                _canliModAktif = true;
                mod.canliTaramaBaslat?.(
                    () => { /* sonuç zaten omrSonucHazir olayıyla _omrSonucuisle'a gidiyor */ },
                    (durum) => { if (statusEl) statusEl.textContent = durum === 'okunuyor' ? 'Okunuyor...' : (durum === 'hizalandi' ? 'Hizalandı, sabit tutun...' : 'Kağıt aranıyor...'); }
                );
                captureBtn.style.opacity = '0.45'; // manuel tuş hâlâ çalışır ama vurgu canlı modda
            } else {
                _canliModAktif = false;
                mod.canliTaramaDurdur?.();
                captureBtn.style.opacity = '1';
                if (statusEl) statusEl.textContent = 'Hazır';
            }
        });

        // ── Ayarlar sheet aç/kapat ──
        const menuBtn = document.getElementById('kameraMenuBtn');
        const ayarSheet = document.getElementById('kameraAyarSheet');
        const ayarKapat = document.getElementById('kameraAyarKapat');
        if (menuBtn && ayarSheet) menuBtn.addEventListener('click', () => {
            const a = ayarlariGetir();
            const hy = document.getElementById('hsYuzdelik');
            const hd = document.getElementById('hsDoluluk');
            const hh = document.getElementById('hsHiz');
            const hk = document.getElementById('hsKoyuluk');
            const ha = document.getElementById('hsAyirtEdici');
            const hn = document.getElementById('hsNumaraFark');
            if (hy) hy.value = Math.round(a.yuzdelik * 100);
            if (hd) hd.value = Math.round(a.minDoluluk * 100);
            if (hh) hh.value = a.tespitAraligiMs;
            if (hk) hk.value = Math.round(a.koyulukEsik * 100);
            if (ha) ha.value = Math.round(a.ayirtEdiciFark * 100);
            if (hn) hn.value = Math.round(a.numaraMinFark * 100);
            if (canliSw) canliSw.checked = _canliModAktif;
            ayarSheet.hidden = false;
        });
        if (ayarKapat) ayarKapat.addEventListener('click', () => { ayarSheet.hidden = true; });

        const _ayarUygula = () => {
            const hy = document.getElementById('hsYuzdelik');
            const hd = document.getElementById('hsDoluluk');
            const hh = document.getElementById('hsHiz');
            const hk = document.getElementById('hsKoyuluk');
            const ha = document.getElementById('hsAyirtEdici');
            const hn = document.getElementById('hsNumaraFark');
            ayarlariKaydet({
                yuzdelik: hy ? Number(hy.value) / 100 : undefined,
                minDoluluk: hd ? Number(hd.value) / 100 : undefined,
                tespitAraligiMs: hh ? Number(hh.value) : undefined,
                koyulukEsik: hk ? Number(hk.value) / 100 : undefined,
                ayirtEdiciFark: ha ? Number(ha.value) / 100 : undefined,
                numaraMinFark: hn ? Number(hn.value) / 100 : undefined,
            });
        };
        ['hsYuzdelik', 'hsDoluluk', 'hsHiz', 'hsKoyuluk', 'hsAyirtEdici', 'hsNumaraFark'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', _ayarUygula);
        });
        const hsSifirla = document.getElementById('hsSifirla');
        if (hsSifirla) hsSifirla.addEventListener('click', () => {
            ayarlariSifirla();
            const a = HASSASIYET_VARSAYILAN;
            const hy = document.getElementById('hsYuzdelik');
            const hd = document.getElementById('hsDoluluk');
            const hh = document.getElementById('hsHiz');
            const hk = document.getElementById('hsKoyuluk');
            const ha = document.getElementById('hsAyirtEdici');
            const hn = document.getElementById('hsNumaraFark');
            if (hy) hy.value = Math.round(a.yuzdelik * 100);
            if (hd) hd.value = Math.round(a.minDoluluk * 100);
            if (hh) hh.value = a.tespitAraligiMs;
            if (hk) hk.value = Math.round(a.koyulukEsik * 100);
            if (ha) ha.value = Math.round(a.ayirtEdiciFark * 100);
            if (hn) hn.value = Math.round(a.numaraMinFark * 100);
        });

        // ── Kamera flaşı (torch) ──
        const torchBtn = document.getElementById('kameraTorchBtn');
        if (torchBtn) torchBtn.addEventListener('click', async () => {
            const yeniDurum = !mod.torchDurumu?.();
            const basarili = await mod.torchAyarla?.(yeniDurum);
            if (basarili) torchBtn.style.color = yeniDurum ? '#FFD54A' : '#fff';
        });

        // ── Canlı sonuç kartı: Sil / Düzenle ──
        const kskSil = document.getElementById('kskSil');
        const kskDuzenle = document.getElementById('kskDuzenle');
        const kart = document.getElementById('canliSonucKart');
        if (kskSil) kskSil.addEventListener('click', () => {
            const id = kart?.dataset.sonucId;
            if (id && _aktifSinavId) { DB.sonucSil(_aktifSinavId, id); kagitlariRender(); }
            if (kart) kart.hidden = true;
        });
        if (kskDuzenle) kskDuzenle.addEventListener('click', () => {
            if (kart) kart.hidden = true;
            mod.stopCamera?.();
            kameraKapat();
            ekranGit('sinavDetay');
        });
    }).catch(() => {
        // camera.js global fonksiyonlardan kullan
        const startBtn = document.getElementById('start');
        const stopBtn  = document.getElementById('stop');
        const captureBtn = document.getElementById('capture');
        if (startBtn) startBtn.addEventListener('click', () => { try { window.startCamera?.(); } catch {} });
        if (stopBtn) stopBtn.addEventListener('click', () => { try { window.stopCamera?.(); } catch {} });
        if (captureBtn) captureBtn.addEventListener('click', () => { try { window.capturePhoto?.(); } catch {} });
    });
}

// ════════════════════════════════════════════════════════════════
// YARDIMCILAR
// ════════════════════════════════════════════════════════════════
function _s(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function _h(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function _tarih(iso) { if (!iso) return ''; try { return new Date(iso).toLocaleDateString('tr-TR'); } catch { return ''; } }

// Başlat
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', baslat);
else baslat();
