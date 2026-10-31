package com.koruk.okul;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

/**
 * DersZiliHesaplayici — JS'den gelen HAM ders programını (zil saatleri + öğretmenin
 * haftalık programı + nöbet günleri) alıp O ANKİ saate göre widget'larda gösterilecek
 * durumu hesaplar. Bu iş native tarafta yapılır: uygulama kapalıyken de (yalnızca
 * Android'in widget alarmı tetiklendiğinde) sayaç, gün ve ders adı doğru kalır.
 *
 * HAM veri (bkz. js/core/platform/widget-adapter.js → zilVerisi):
 * {
 *   "tatilModu": false, "tatilNotu": "...", "okulAcilisTarihi": "2026-11-02",
 *   "dersYok": false, "durumMetniOzel": "...",
 *   "segmentler": [ {"saat":1,"bas":"09:00","bit":"09:40"}, ... ],            // zil saatleri
 *   "hafta": { "Pazartesi": [ {"saat":1,"ders":"Fizik","sinif":"8-B"} ], ... }, // öğretmenin programı
 *   "nobet": [ {"tarih":"2026-10-30","yer":"Zemin kat"} ]                      // öğretmenin nöbetleri
 * }
 * Eski biçim (segmentte "baslik"/"yer", "hafta" yok) da okunur.
 */
public class DersZiliHesaplayici {

    public static final String[] GUN_ADI = {"", "Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"};
    public static final String[] GUN_KISA = {"", "Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"};
    public static final String[] AY_ADI = {"Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"};
    public static final String[] AY_KISA = {"Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"};

    /** Tek bir zil dilimi (ders). */
    private static final class Dilim {
        int saat, bas, bit;
        String eskiBaslik = "", eskiYer = "";
    }

    /* ------------------------------------------------------------------ */
    /*  Şimdi / Zil şeridi / Zil halkası durumu                            */
    /* ------------------------------------------------------------------ */

    public static JSONObject hesapla(JSONObject ham, Calendar simdi) {
        JSONObject s = new JSONObject();
        try {
            if (ham == null) return yok(s, "Uygulamayı açınız");
            if (ham.optBoolean("tatilModu", false)) return tatil(ham, simdi, s);
            if (ham.optBoolean("dersYok", false)) return yok(s, ham.optString("durumMetniOzel", "Zil programı yok"));
            List<Dilim> dl = dilimler(ham);
            if (dl.isEmpty()) return yok(s, "Zil programı yok");

            int dow = simdi.get(Calendar.DAY_OF_WEEK);
            int dk = simdi.get(Calendar.HOUR_OF_DAY) * 60 + simdi.get(Calendar.MINUTE);
            String gunAdi = GUN_ADI[dow];
            boolean okulGunu = okulGunuMu(ham, dow);

            if (okulGunu) {
                int aktif = -1, sonraki = -1;
                for (int i = 0; i < dl.size(); i++) {
                    Dilim d = dl.get(i);
                    if (dk >= d.bas && dk < d.bit) { aktif = i; break; }
                    if (d.bas > dk && sonraki == -1) sonraki = i;
                }
                if (aktif >= 0) {
                    Dilim d = dl.get(aktif);
                    int kalan = d.bit - dk, toplam = d.bit - d.bas;
                    s.put("faz", "DERS");
                    s.put("simge", "🔔");
                    s.put("baslik", etiket(ham, d, gunAdi));
                    s.put("rozet", kalan + " dk kaldı");
                    s.put("kalanDeger", String.valueOf(kalan));
                    s.put("kalanBirim", "dk");
                    s.put("halkaOran", oran(kalan, toplam));
                    s.put("barOran", 1 - oran(kalan, toplam));
                    s.put("barBas", saatYaz(d.bas));
                    s.put("barSon", saatYaz(d.bit));
                    s.put("sagEtiket", "SIRADAKİ");
                    if (aktif + 1 < dl.size()) {
                        Dilim n = dl.get(aktif + 1);
                        s.put("sagBaslik", etiket(ham, n, gunAdi));
                        s.put("sagAlt", "Teneffüs " + saatYaz(d.bit) + " – " + saatYaz(n.bas));
                    } else {
                        s.put("sagBaslik", "Gün sonu");
                        s.put("sagAlt", saatYaz(d.bit) + "'de son zil");
                    }
                    return s;
                }
                if (sonraki >= 0) {
                    Dilim n = dl.get(sonraki);
                    int kalan = n.bas - dk;
                    if (sonraki == 0) {
                        s.put("faz", "ONCE");
                        s.put("simge", "🏫");
                        s.put("baslik", "Okul henüz başlamadı");
                        s.put("halkaOran", oran(kalan, Math.max(n.bas, 1)));
                        s.put("sagEtiket", "İLK DERS");
                        s.put("sagBaslik", etiket(ham, n, gunAdi));
                        s.put("sagAlt", saatYaz(n.bas) + "'de başlıyor");
                    } else {
                        Dilim o = dl.get(sonraki - 1);
                        int toplam = n.bas - o.bit;
                        s.put("faz", "TENEFFUS");
                        s.put("simge", "☕");
                        s.put("baslik", "Teneffüs");
                        s.put("halkaOran", oran(kalan, toplam));
                        s.put("barOran", 1 - oran(kalan, toplam));
                        s.put("barBas", saatYaz(o.bit));
                        s.put("barSon", saatYaz(n.bas));
                        s.put("sagEtiket", "SIRADAKİ");
                        s.put("sagBaslik", etiket(ham, n, gunAdi));
                        s.put("sagAlt", saatYaz(n.bas) + "'de başlıyor");
                    }
                    String[] b = kalanBicim(kalan);
                    s.put("kalanDeger", b[0]);
                    s.put("kalanBirim", b[1]);
                    s.put("rozet", sureYaz(kalan));
                    return s;
                }
            }
            return gunDisi(ham, dl, simdi, okulGunu, s);
        } catch (Exception e) {
            try { s.put("faz", "YOK"); s.put("simge", "🔔"); s.put("baslik", "Zil programı yok"); } catch (Exception ignored) {}
        }
        return s;
    }

    /** Bugünkü dersler bitti ya da bugün okul günü değil: bir sonraki okul gününün ilk derse kalan süre. */
    private static JSONObject gunDisi(JSONObject ham, List<Dilim> dl, Calendar simdi, boolean okulGunu, JSONObject s) throws Exception {
        int n = 1;
        Calendar hedef = null;
        for (; n <= 8; n++) {
            Calendar c = (Calendar) simdi.clone();
            c.add(Calendar.DAY_OF_MONTH, n);
            if (okulGunuMu(ham, c.get(Calendar.DAY_OF_WEEK))) { hedef = c; break; }
        }
        if (hedef == null) return yok(s, "Zil programı yok");
        Dilim ilk = dl.get(0), son = dl.get(dl.size() - 1);
        hedef.set(Calendar.HOUR_OF_DAY, ilk.bas / 60);
        hedef.set(Calendar.MINUTE, ilk.bas % 60);
        hedef.set(Calendar.SECOND, 0);
        hedef.set(Calendar.MILLISECOND, 0);
        long kalanMs = hedef.getTimeInMillis() - simdi.getTimeInMillis();
        int kalan = (int) Math.max(0, kalanMs / 60000L);

        /* Halkanın başlangıcı: önceki okul gününün son zili (yoksa bugün 00:00). */
        long basMs = simdi.getTimeInMillis();
        Calendar g = (Calendar) simdi.clone();
        g.set(Calendar.HOUR_OF_DAY, 0); g.set(Calendar.MINUTE, 0); g.set(Calendar.SECOND, 0); g.set(Calendar.MILLISECOND, 0);
        basMs = g.getTimeInMillis();
        for (int m = 0; m <= 7; m++) {
            Calendar c = (Calendar) simdi.clone();
            c.add(Calendar.DAY_OF_MONTH, -m);
            if (!okulGunuMu(ham, c.get(Calendar.DAY_OF_WEEK))) continue;
            c.set(Calendar.HOUR_OF_DAY, son.bit / 60);
            c.set(Calendar.MINUTE, son.bit % 60);
            c.set(Calendar.SECOND, 0);
            c.set(Calendar.MILLISECOND, 0);
            if (c.getTimeInMillis() <= simdi.getTimeInMillis()) { basMs = c.getTimeInMillis(); break; }
        }
        long toplamMs = Math.max(1L, hedef.getTimeInMillis() - basMs);
        double kalanOran = Math.max(0.0, Math.min(1.0, (double) kalanMs / toplamMs));

        int hedefDow = hedef.get(Calendar.DAY_OF_WEEK);
        String hedefGun = GUN_ADI[hedefDow];
        String gunEt = n == 1 ? "Yarın" : hedefGun;
        s.put("faz", okulGunu ? "BITTI" : "HAFTASONU");
        s.put("simge", okulGunu ? "✅" : "🌴");
        s.put("baslik", okulGunu ? "Bugünkü dersler bitti" : (simdi.get(Calendar.DAY_OF_WEEK) == Calendar.SUNDAY || simdi.get(Calendar.DAY_OF_WEEK) == Calendar.SATURDAY ? "Hafta sonu" : "Bugün ders yok"));
        String[] b = kalanBicim(kalan);
        s.put("kalanDeger", b[0]);
        s.put("kalanBirim", b[1]);
        s.put("rozet", (n == 1 ? "Yarın " : GUN_KISA[hedefDow] + " ") + saatYaz(ilk.bas));
        s.put("halkaOran", kalanOran);
        s.put("sagEtiket", gunEt.toUpperCase(new Locale("tr", "TR")));
        s.put("sagBaslik", etiket(ham, ilk, hedefGun));
        s.put("sagAlt", saatYaz(ilk.bas) + " · " + sureYaz(kalan) + " sonra");
        return s;
    }

    private static JSONObject tatil(JSONObject ham, Calendar simdi, JSONObject s) throws Exception {
        String not = ham.optString("tatilNotu", "Okul tatilde");
        Integer gun = gunFarki(ham.optString("okulAcilisTarihi", null), simdi.getTimeInMillis());
        s.put("simge", "🏖");
        s.put("baslik", "Okul tatilde");
        s.put("sagEtiket", "OKULA KALAN");
        s.put("sagBaslik", not);
        if (gun != null && gun > 0) {
            s.put("faz", "TATIL");
            s.put("kalanDeger", String.valueOf(gun));
            s.put("kalanBirim", "gün");
            s.put("rozet", gun + " gün");
            s.put("halkaOran", Math.min(1.0, gun / 30.0));
            s.put("sagAlt", tarihYaz(ham.optString("okulAcilisTarihi", "")) + " tarihinde açılıyor");
        } else if (gun != null && gun == 0) {
            s.put("faz", "TATIL");
            s.put("baslik", "Bugün okul açılıyor! 🎉");
            s.put("kalanDeger", "0");
            s.put("kalanBirim", "gün");
            s.put("rozet", "Bugün");
            s.put("halkaOran", 0.0);
        } else {
            s.put("faz", "TATIL");
            s.put("kalanDeger", "");
            s.put("kalanBirim", "");
            s.put("rozet", "Tatil");
            s.put("halkaOran", 0.0);
        }
        return s;
    }

    private static JSONObject yok(JSONObject s, String metin) throws Exception {
        s.put("faz", "YOK");
        s.put("simge", "🔔");
        s.put("baslik", metin);
        s.put("kalanDeger", "");
        s.put("kalanBirim", "");
        s.put("rozet", "");
        s.put("halkaOran", 0.0);
        return s;
    }

    /* ------------------------------------------------------------------ */
    /*  Bugünüm: bir günün ders listesi                                    */
    /* ------------------------------------------------------------------ */

    /**
     * @param gun   listelenecek gün
     * @param simdi şimdiki an (listelenen gün bugünse durumlar işaretlenir)
     * Her satır: {saat:"09:00", etiket:"1. Ders · 6-A", durum:"gecti|simdi|sonra", oran:0..1, bos:bool}
     */
    public static JSONArray gunSatirlari(JSONObject ham, Calendar gun, Calendar simdi) {
        JSONArray out = new JSONArray();
        try {
            if (ham == null) return out;
            List<Dilim> dl = dilimler(ham);
            String gunAdi = GUN_ADI[gun.get(Calendar.DAY_OF_WEEK)];
            boolean bugun = ayniGun(gun, simdi);
            int dk = simdi.get(Calendar.HOUR_OF_DAY) * 60 + simdi.get(Calendar.MINUTE);
            for (Dilim d : dl) {
                JSONObject r = new JSONObject();
                r.put("saat", saatYaz(d.bas));
                r.put("etiket", etiket(ham, d, gunAdi));
                r.put("bos", bosMu(ham, d, gunAdi));
                String durum = "sonra";
                double o = 0;
                if (bugun) {
                    if (dk >= d.bit) durum = "gecti";
                    else if (dk >= d.bas) { durum = "simdi"; o = (double) (dk - d.bas) / Math.max(1, d.bit - d.bas); }
                }
                r.put("durum", durum);
                r.put("oran", o);
                out.put(r);
            }
        } catch (Exception ignored) {}
        return out;
    }

    /** Bugün (ya da bugün bittiyse/okul günü değilse bir sonraki okul günü) hangi gün gösterilmeli? */
    public static Calendar gosterilecekGun(JSONObject ham, Calendar simdi) {
        Calendar c = (Calendar) simdi.clone();
        try {
            List<Dilim> dl = dilimler(ham);
            int dk = simdi.get(Calendar.HOUR_OF_DAY) * 60 + simdi.get(Calendar.MINUTE);
            boolean bitti = !dl.isEmpty() && dk >= dl.get(dl.size() - 1).bit;
            if (okulGunuMu(ham, c.get(Calendar.DAY_OF_WEEK)) && !bitti) return c;
            for (int i = 1; i <= 8; i++) {
                c = (Calendar) simdi.clone();
                c.add(Calendar.DAY_OF_MONTH, i);
                if (okulGunuMu(ham, c.get(Calendar.DAY_OF_WEEK))) return c;
            }
        } catch (Exception ignored) {}
        return (Calendar) simdi.clone();
    }

    /* ------------------------------------------------------------------ */
    /*  Hafta özeti (Hafta widget'ı)                                       */
    /* ------------------------------------------------------------------ */

    /** {baslik, gunler:[{kisa,no,iso,ders,toplam,nobet,bugun}]} — Pzt..Cum. Hafta sonu ise gelecek hafta. */
    public static JSONObject haftaOzeti(JSONObject ham, Calendar simdi) {
        JSONObject out = new JSONObject();
        try {
            int dow = simdi.get(Calendar.DAY_OF_WEEK);
            Calendar pzt = (Calendar) simdi.clone();
            int geri = (dow + 5) % 7;                      // Pazartesi'ye kaç gün geri
            pzt.add(Calendar.DAY_OF_MONTH, -geri);
            boolean sonraki = dow == Calendar.SATURDAY || dow == Calendar.SUNDAY;
            if (sonraki) pzt.add(Calendar.DAY_OF_MONTH, 7);
            out.put("baslik", sonraki ? "Önümüzdeki hafta" : "Bu hafta");
            int toplam = ham == null ? 0 : dilimler(ham).size();
            JSONArray gunler = new JSONArray();
            for (int i = 0; i < 5; i++) {
                Calendar c = (Calendar) pzt.clone();
                c.add(Calendar.DAY_OF_MONTH, i);
                JSONObject g = new JSONObject();
                g.put("kisa", GUN_KISA[c.get(Calendar.DAY_OF_WEEK)]);
                g.put("no", c.get(Calendar.DAY_OF_MONTH));
                String iso = isoYaz(c);
                g.put("iso", iso);
                g.put("ders", dersSayisi(ham, GUN_ADI[c.get(Calendar.DAY_OF_WEEK)]));
                g.put("toplam", toplam);
                g.put("nobet", nobetVarMi(ham, iso));
                g.put("bugun", !sonraki && ayniGun(c, simdi));
                gunler.put(g);
            }
            out.put("gunler", gunler);
        } catch (Exception ignored) {}
        return out;
    }

    /* ------------------------------------------------------------------ */
    /*  Nöbetim                                                            */
    /* ------------------------------------------------------------------ */

    /** {var, bugun, gunAdi, tarih, yer, kalanGun} — bugünkü ya da bir sonraki nöbet. */
    public static JSONObject nobetBilgisi(JSONObject ham, Calendar simdi) {
        JSONObject out = new JSONObject();
        try {
            out.put("var", false);
            JSONArray a = ham == null ? null : ham.optJSONArray("nobet");
            if (a == null) return out;
            String bugun = isoYaz(simdi), enYakin = null, yer = "";
            for (int i = 0; i < a.length(); i++) {
                JSONObject n = a.optJSONObject(i);
                if (n == null) continue;
                String t = n.optString("tarih", "");
                if (t.length() < 10 || t.compareTo(bugun) < 0) continue;
                if (enYakin == null || t.compareTo(enYakin) < 0) { enYakin = t; yer = n.optString("yer", ""); }
            }
            if (enYakin == null) return out;
            Calendar c = isoCoz(enYakin);
            Integer fark = gunFarki(enYakin, simdi.getTimeInMillis());
            out.put("var", true);
            out.put("bugun", enYakin.equals(bugun));
            out.put("tarih", enYakin);
            out.put("yer", yer == null ? "" : yer);
            out.put("kalanGun", fark == null ? 0 : fark);
            out.put("gunAdi", c == null ? "" : GUN_ADI[c.get(Calendar.DAY_OF_WEEK)]);
            out.put("tarihMetni", c == null ? "" : c.get(Calendar.DAY_OF_MONTH) + " " + AY_KISA[c.get(Calendar.MONTH)]);
        } catch (Exception ignored) {}
        return out;
    }

    /* ------------------------------------------------------------------ */
    /*  Yardımcılar                                                        */
    /* ------------------------------------------------------------------ */

    private static boolean nobetVarMi(JSONObject ham, String iso) {
        JSONArray a = ham == null ? null : ham.optJSONArray("nobet");
        if (a == null) return false;
        for (int i = 0; i < a.length(); i++) {
            JSONObject n = a.optJSONObject(i);
            if (n != null && iso.equals(n.optString("tarih", ""))) return true;
        }
        return false;
    }

    private static int dersSayisi(JSONObject ham, String gunAdi) {
        JSONArray a = programGunu(ham, gunAdi);
        return a == null ? 0 : a.length();
    }

    private static JSONArray programGunu(JSONObject ham, String gunAdi) {
        JSONObject h = ham == null ? null : ham.optJSONObject("hafta");
        return h == null ? null : h.optJSONArray(gunAdi);
    }

    /** Öğretmenin haftalık programı hiç yoksa (ör. yönetici) "boş" kavramı kullanılmaz. */
    private static boolean programVarMi(JSONObject ham) {
        JSONObject h = ham == null ? null : ham.optJSONObject("hafta");
        if (h == null) return false;
        java.util.Iterator<String> it = h.keys();
        while (it.hasNext()) {
            JSONArray a = h.optJSONArray(it.next());
            if (a != null && a.length() > 0) return true;
        }
        return false;
    }

    private static JSONObject dersBul(JSONObject ham, String gunAdi, int saat) {
        JSONArray a = programGunu(ham, gunAdi);
        if (a == null) return null;
        for (int i = 0; i < a.length(); i++) {
            JSONObject d = a.optJSONObject(i);
            if (d != null && d.optInt("saat", -1) == saat) return d;
        }
        return null;
    }

    private static boolean bosMu(JSONObject ham, Dilim d, String gunAdi) {
        return programVarMi(ham) && dersBul(ham, gunAdi, d.saat) == null;
    }

    /** "4. Ders · 8-B" / "4. Ders · boş" / "4. Ders". */
    private static String etiket(JSONObject ham, Dilim d, String gunAdi) {
        String t = d.saat + ". Ders";
        if (programVarMi(ham)) {
            JSONObject x = dersBul(ham, gunAdi, d.saat);
            if (x == null) return t + " · boş";
            String sinif = x.optString("sinif", "");
            return sinif.isEmpty() ? t : t + " · " + sinif;
        }
        if (!d.eskiBaslik.isEmpty() && !d.eskiBaslik.equals(t)) return (d.eskiBaslik + " " + d.eskiYer).trim();
        return t;
    }

    private static boolean okulGunuMu(JSONObject ham, int dow) {
        if (dow != Calendar.SATURDAY && dow != Calendar.SUNDAY) return true;
        return dersSayisi(ham, GUN_ADI[dow]) > 0;
    }

    private static List<Dilim> dilimler(JSONObject ham) {
        List<Dilim> out = new ArrayList<>();
        JSONArray a = ham == null ? null : ham.optJSONArray("segmentler");
        if (a == null) return out;
        for (int i = 0; i < a.length(); i++) {
            JSONObject s = a.optJSONObject(i);
            if (s == null) continue;
            int bas = dakika(s.opt("bas"), -1), bit = dakika(s.opt("bit"), -1);
            if (bas < 0 || bit <= bas) continue;
            Dilim d = new Dilim();
            d.saat = s.optInt("saat", out.size() + 1);
            d.bas = bas;
            d.bit = bit;
            d.eskiBaslik = s.optString("baslik", "");
            d.eskiYer = s.optString("yer", "");
            out.add(d);
        }
        return out;
    }

    private static double oran(int kalan, int toplam) {
        if (toplam <= 0) return 0;
        return Math.max(0.0, Math.min(1.0, (double) kalan / toplam));
    }

    /** Halka ortasındaki büyük sayı + birim. */
    public static String[] kalanBicim(int dk) {
        if (dk < 60) return new String[]{String.valueOf(dk), "dk"};
        if (dk < 24 * 60) return new String[]{(dk / 60) + ":" + String.format(Locale.US, "%02d", dk % 60), "saat"};
        return new String[]{String.valueOf(dk / (24 * 60)), "gün"};
    }

    /** "12 dk", "2 sa 10 dk", "1 gün 15 sa". */
    public static String sureYaz(int dk) {
        if (dk < 60) return dk + " dk";
        if (dk < 24 * 60) return (dk / 60) + " sa" + (dk % 60 == 0 ? "" : " " + (dk % 60) + " dk");
        int g = dk / (24 * 60), sa = (dk % (24 * 60)) / 60;
        return g + " gün" + (sa == 0 ? "" : " " + sa + " sa");
    }

    public static String saatYaz(int dk) { return String.format(Locale.US, "%02d:%02d", dk / 60, dk % 60); }

    public static String isoYaz(Calendar c) {
        return String.format(Locale.US, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    public static Calendar isoCoz(String iso) {
        try {
            String[] p = iso.substring(0, 10).split("-");
            Calendar c = Calendar.getInstance();
            c.set(Integer.parseInt(p[0]), Integer.parseInt(p[1]) - 1, Integer.parseInt(p[2]), 12, 0, 0);
            c.set(Calendar.MILLISECOND, 0);
            return c;
        } catch (Exception e) { return null; }
    }

    private static String tarihYaz(String iso) {
        Calendar c = isoCoz(iso == null ? "" : iso);
        return c == null ? "" : c.get(Calendar.DAY_OF_MONTH) + " " + AY_ADI[c.get(Calendar.MONTH)];
    }

    public static boolean ayniGun(Calendar a, Calendar b) {
        return a.get(Calendar.YEAR) == b.get(Calendar.YEAR) && a.get(Calendar.DAY_OF_YEAR) == b.get(Calendar.DAY_OF_YEAR);
    }

    private static int dakika(Object value, int fallback) {
        if (value == null) return fallback;
        if (value instanceof Number) return ((Number) value).intValue();
        String s = String.valueOf(value).trim();
        if (s.isEmpty()) return fallback;
        try {
            if (s.contains(":")) {
                String[] p = s.split(":");
                if (p.length == 2) return Integer.parseInt(p[0].trim()) * 60 + Integer.parseInt(p[1].trim());
            }
            return (int) Math.round(Double.parseDouble(s));
        } catch (Exception e) { return fallback; }
    }

    /** "YYYY-MM-DD" ile şimdiki an arasındaki TAM GÜN farkı (gece yarısına göre); okunamazsa null. */
    static Integer gunFarki(String tarihStr, long simdiMillis) {
        if (tarihStr == null || tarihStr.isEmpty() || "null".equals(tarihStr)) return null;
        try {
            String[] p = tarihStr.split("-");
            if (p.length != 3) return null;
            Calendar hedef = Calendar.getInstance();
            hedef.set(Integer.parseInt(p[0]), Integer.parseInt(p[1]) - 1, Integer.parseInt(p[2].substring(0, 2)), 0, 0, 0);
            hedef.set(Calendar.MILLISECOND, 0);
            Calendar bugun = Calendar.getInstance();
            bugun.setTimeInMillis(simdiMillis);
            bugun.set(Calendar.HOUR_OF_DAY, 0);
            bugun.set(Calendar.MINUTE, 0);
            bugun.set(Calendar.SECOND, 0);
            bugun.set(Calendar.MILLISECOND, 0);
            return (int) Math.round((hedef.getTimeInMillis() - bugun.getTimeInMillis()) / 86400000.0);
        } catch (Exception e) { return null; }
    }
}
