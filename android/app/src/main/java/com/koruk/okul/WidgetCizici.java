package com.koruk.okul;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

/**
 * WidgetCizici — ana ekran widget'larının tamamını tek bir Bitmap olarak çizer.
 * RemoteViews halka/ilerleme çizgisi/yoğun yerleşim çizemediği için görünüm burada
 * çizilir; renkler {@link WidgetTheme.Palet}'ten gelir (açık / koyu / yarı saydam).
 * Tek tasarım dili: antrasit ya da beyaz zemin + sarı vurgu, sarı üstünde KOYU yazı.
 *
 * Boyutlar dp/sp cinsinden yazılır; d = ekran yoğunluğu, fs = yoğunluk × yazı ölçeği.
 * Çizim hesapları Context istemez (masaüstünde de önizlenebilir).
 */
public final class WidgetCizici {

    private final float d, fs, w, h;
    private final Canvas c;
    private final WidgetTheme.Palet p;

    private WidgetCizici(Canvas c, WidgetTheme.Palet p, float d, float fs, int w, int h) {
        this.c = c;
        this.p = p;
        this.d = d;
        this.fs = fs;
        this.w = w;
        this.h = h;
    }

    /**
     * Büyük yazı ayarı yalnızca boş yer varsa uygulanır: widget en küçük (tasarım) boyuttayken
     * metin büyütülürse satırlar üst üste biner. izin = 1 + (fazla yükseklik oranı × 0,8).
     */
    private static float etkinYazi(float d, float fs, int h, float tasarimH) {
        float oran = fs / d;
        if (oran <= 1f) return fs;
        float bosluk = h / d / tasarimH;
        float izin = 1f + Math.max(0f, bosluk - 1f) * 0.8f;
        return d * Math.min(oran, izin);
    }

    private static WidgetCizici baslat(WidgetTheme.Palet p, float d, float fs, int w, int h, float tasarimH, Bitmap[] cikis) {
        Bitmap b = Bitmap.createBitmap(Math.max(w, 1), Math.max(h, 1), Bitmap.Config.ARGB_8888);
        cikis[0] = b;
        WidgetCizici z = new WidgetCizici(new Canvas(b), p, d, etkinYazi(d, fs, h, tasarimH), w, h);
        z.cerceve();
        return z;
    }

    /* ================================================================== */
    /*  1) ŞİMDİ — 4×2: aktif ders / teneffüs / gün dışı geri sayımı        */
    /* ================================================================== */

    public static Bitmap simdi(WidgetTheme.Palet p, float d, float fs, JSONObject st, int w, int h) {
        Bitmap[] o = new Bitmap[1];
        WidgetCizici z = baslat(p, d, fs, w, h, 110, o);
        z.simdiCiz(st);
        return o[0];
    }

    private void simdiCiz(JSONObject st) {
        float pad = 14 * d;
        float basY = pad + 14 * d;
        float sagKenar = w - pad;
        String rozet = st.optString("rozet", "");
        float sol = baslikSatiri(st.optString("simge", "🔔"), st.optString("baslik", ""), rozet, pad, basY, sagKenar, 15);

        float ustY = pad + 32 * d;
        float govdeH = h - pad - ustY;
        float cap = Math.max(48 * d, Math.min(govdeH, w * 0.36f));
        float halkaCx = pad + cap / 2f;
        float halkaCy = ustY + govdeH / 2f;
        halkaCiz(halkaCx, halkaCy, cap / 2f - 6 * d, Math.max(8 * d, cap * 0.11f), st.optDouble("halkaOran", 0), st.optString("kalanDeger", ""), st.optString("kalanBirim", ""), cap);

        float sagX = pad + cap + 18 * d;
        float sagW = sagKenar - sagX;
        if (sagW < 60 * d) return;
        String etiket = st.optString("sagEtiket", "");
        String baslik = st.optString("sagBaslik", "");
        String alt = st.optString("sagAlt", "");
        boolean barVar = st.has("barOran");
        // Satır yükseklikleri yazı ölçeğiyle büyür; sığmayan isteğe bağlı satırlar (alt metin, saat uçları) düşer.
        float r = Math.max(1f, fs / d);
        float satE = 13 * d * r, satB = 24 * d * r, satA = 18 * d * r, satBar = 12 * d + 6 * d * r, satZ = 15 * d * r;
        float kalan = govdeH + 4 * d - satE - satB - (barVar ? satBar : 0);
        boolean altGoster = !alt.isEmpty() && kalan >= satA;
        if (altGoster) kalan -= satA;
        boolean zamanGoster = barVar && kalan >= satZ;
        float blok = satE + satB + (altGoster ? satA : 0) + (barVar ? satBar + (zamanGoster ? satZ : 0) : 0);
        float y = halkaCy - blok / 2f;

        Paint pe = yaziBoya(p.soluk, 10, true);
        pe.setLetterSpacing(0.08f);
        yaz(etiket, sagX, y + 10 * d * r, pe, sagW, Paint.Align.LEFT);
        y += satE;
        Paint pb = yaziBoya(p.yazi, 17, true);
        yaz(baslik, sagX, y + 18 * d * r, pb, sagW, Paint.Align.LEFT);
        y += satB;
        if (altGoster) {
            yaz(alt, sagX, y + 11 * d * r, yaziBoya(p.soluk, 12.5f, false), sagW, Paint.Align.LEFT);
            y += satA;
        }
        if (barVar) {
            y += 4 * d;
            cubuk(new RectF(sagX, y, sagX + sagW, y + 8 * d), st.optDouble("barOran", 0));
            y += 8 * d;
            if (zamanGoster) {
                Paint pz = yaziBoya(p.soluk, 10.5f, false);
                yaz(st.optString("barBas", ""), sagX, y + 13 * d * r, pz, sagW / 2f, Paint.Align.LEFT);
                yaz(st.optString("barSon", ""), sagX + sagW, y + 13 * d * r, pz, sagW / 2f, Paint.Align.RIGHT);
            }
        }
    }

    /* ================================================================== */
    /*  2) BUGÜNÜM — 4×3: günün ders çizelgesi                              */
    /* ================================================================== */

    public static Bitmap bugunum(WidgetTheme.Palet p, float d, float fs, JSONObject ham, Calendar simdi, int w, int h) {
        Bitmap[] o = new Bitmap[1];
        WidgetCizici z = baslat(p, d, fs, w, h, 180, o);
        z.bugunumCiz(ham, simdi);
        return o[0];
    }

    private void bugunumCiz(JSONObject ham, Calendar simdi) {
        float pad = 14 * d;
        Calendar gun = DersZiliHesaplayici.gosterilecekGun(ham, simdi);
        boolean bugun = DersZiliHesaplayici.ayniGun(gun, simdi);
        String tarih = DersZiliHesaplayici.GUN_ADI[gun.get(Calendar.DAY_OF_WEEK)] + ", " + gun.get(Calendar.DAY_OF_MONTH) + " " + DersZiliHesaplayici.AY_ADI[gun.get(Calendar.MONTH)];
        Integer fark = DersZiliHesaplayici.gunFarki(DersZiliHesaplayici.isoYaz(gun), simdi.getTimeInMillis());
        if (!bugun && fark != null && fark == 1) tarih = "Yarın · " + tarih;

        String rozet = "";
        JSONObject nb = DersZiliHesaplayici.nobetBilgisi(ham, simdi);
        if (bugun && nb.optBoolean("var") && nb.optBoolean("bugun")) {
            String yer = nb.optString("yer", "");
            rozet = "🛡 Nöbet" + (yer.isEmpty() ? "" : " · " + yer);
        } else if (!bugun) {
            rozet = "Sonraki gün";
        }
        float basY = pad + 14 * d;
        baslikSatiri("", tarih, rozet, pad, basY, w - pad, 16);

        JSONArray satirlar = DersZiliHesaplayici.gunSatirlari(ham, gun, simdi);
        float ust = pad + 36 * d;
        float alan = h - pad - ust;
        if (satirlar.length() == 0) {
            yaz("Zil programı yok", w / 2f, h / 2f + 12 * d, yaziBoya(p.soluk, 14, false), w - 2 * pad, Paint.Align.CENTER);
            return;
        }
        float satirH = Math.max(26 * d, Math.min(36 * d, alan / Math.max(1, Math.min(satirlar.length(), 5))));
        int sigan = Math.max(1, (int) Math.floor(alan / satirH));
        int baslangic = 0;
        if (satirlar.length() > sigan) {
            int ref = 0;
            for (int i = 0; i < satirlar.length(); i++) {
                String dr = satirlar.optJSONObject(i).optString("durum", "sonra");
                if (dr.equals("simdi")) { ref = i; break; }
                if (dr.equals("sonra")) { ref = i; break; }
                ref = i;
            }
            baslangic = Math.max(0, Math.min(satirlar.length() - sigan, ref - 1));
        }
        Paint pz = yaziBoya(p.soluk, 13, false);
        float zamanW = pz.measureText("00:00") + 10 * d;
        for (int i = 0; i < sigan && baslangic + i < satirlar.length(); i++) {
            JSONObject s = satirlar.optJSONObject(baslangic + i);
            float y0 = ust + i * satirH;
            RectF r = new RectF(pad - 4 * d, y0 + 1 * d, w - pad + 4 * d, y0 + satirH - 1 * d);
            String durum = s.optString("durum", "sonra");
            boolean simdiSatir = durum.equals("simdi");
            boolean gecti = durum.equals("gecti");
            boolean bos = s.optBoolean("bos", false);
            int yaziRenk = simdiSatir ? p.vurguUstu : (gecti || bos ? soluk(p.yazi, gecti ? 0.45f : 0.7f) : p.yazi);
            int saatRenk = simdiSatir ? p.vurguUstu : soluk(p.soluk, gecti ? 0.55f : 1f);
            if (simdiSatir) kutu(r, 11 * d, p.vurgu);
            float cy = y0 + satirH / 2f;
            Paint ps = yaziBoya(saatRenk, 13, false);
            Paint pe = yaziBoya(yaziRenk, 14, simdiSatir);
            float sagW = 0;
            if (simdiSatir) {
                Paint pr = yaziBoya(p.vurguUstu, 13, true);
                String yuzde = "%" + Math.round(s.optDouble("oran", 0) * 100);
                sagW = pr.measureText(yuzde) + 8 * d;
                yazOrta(yuzde, w - pad - 6 * d, cy, pr, Paint.Align.RIGHT);
            }
            yazOrta(s.optString("saat", ""), pad + 4 * d, cy, ps, Paint.Align.LEFT);
            yaz(s.optString("etiket", ""), pad + 4 * d + zamanW, ortaTaban(pe, cy), pe, w - 2 * pad - zamanW - sagW - 8 * d, Paint.Align.LEFT);
        }
    }

    /* ================================================================== */
    /*  3) HAFTA — 4×2: hafta şeridi                                        */
    /* ================================================================== */

    public static Bitmap hafta(WidgetTheme.Palet p, float d, float fs, JSONObject ham, Calendar simdi, JSONObject etkinlik,
                               String havaIkon, String havaSicaklik, String havaAciklama, int w, int h) {
        Bitmap[] o = new Bitmap[1];
        WidgetCizici z = baslat(p, d, fs, w, h, 110, o);
        z.haftaCiz(ham, simdi, etkinlik, havaIkon, havaSicaklik, havaAciklama);
        return o[0];
    }

    private void haftaCiz(JSONObject ham, Calendar simdi, JSONObject etkinlik, String havaIkon, String havaSicaklik, String havaAciklama) {
        float pad = 14 * d;
        JSONObject oz = DersZiliHesaplayici.haftaOzeti(ham, simdi);
        JSONArray gunler = oz.optJSONArray("gunler");
        float basY = pad + 14 * d;
        Paint pb = yaziBoya(p.yazi, 16, true);
        String hava = havaYaz(havaIkon, havaSicaklik, havaAciklama);
        Paint ph = yaziBoya(p.soluk, 12, false);
        float havaW = hava.isEmpty() ? 0 : Math.min(ph.measureText(hava), w * 0.45f);
        yaz(oz.optString("baslik", "Bu hafta"), pad, ortaTaban(pb, basY), pb, w - 2 * pad - havaW - 10 * d, Paint.Align.LEFT);
        if (!hava.isEmpty()) yaz(hava, w - pad, ortaTaban(ph, basY), ph, havaW, Paint.Align.RIGHT);
        if (gunler == null || gunler.length() == 0) return;

        String olay = haftaOlayi(gunler, etkinlik);
        float altSatir = (!olay.isEmpty() && h >= 120 * d) ? 24 * d : 0;
        float ust = pad + 34 * d;
        float kutuH = h - pad - ust - altSatir;
        float kutuMin = 40 * Math.max(1f, fs / d) * d;
        if (kutuH < kutuMin) { kutuH = h - pad - ust; altSatir = 0; }
        float bosluk = 8 * d;
        int n = gunler.length();
        float kw = (w - 2 * pad - (n - 1) * bosluk) / n;
        for (int i = 0; i < n; i++) {
            JSONObject g = gunler.optJSONObject(i);
            float x = pad + i * (kw + bosluk);
            RectF r = new RectF(x, ust, x + kw, ust + kutuH);
            boolean bugun = g.optBoolean("bugun");
            kutu(r, 14 * d, p.kart);
            if (bugun) kutuCerceve(r, 14 * d, p.vurgu, 2 * d);
            float cx = x + kw / 2f;
            String kisa = g.optString("kisa", "");
            boolean nobet = g.optBoolean("nobet");
            int ders = g.optInt("ders"), toplam = Math.max(g.optInt("toplam"), ders);

            // Dikey yığın: gün adı, tarih, ders noktaları. Satır yükseklikleri yazı boyundan hesaplanır;
            // sığmazsa önce yazılar biraz küçülür, sonra noktalar düşer (gün adı ile tarih asla çakışmaz).
            float ic = kutuH - 8 * d;
            float olcek = 1f;
            boolean noktalar = toplam > 0;
            float noktaCap = Math.max(3 * d, Math.min(6 * d, (kw - 12 * d) / (Math.min(toplam, 9) * 1.6f + 0.001f)));
            while (yigin(olcek, noktalar, noktaCap) > ic) {
                if (olcek > 0.8f) olcek -= 0.05f;
                else if (noktalar) { noktalar = false; olcek = 1f; }
                else if (olcek > 0.6f) olcek -= 0.05f;
                else break;
            }
            float toplamH = yigin(olcek, noktalar, noktaCap);
            float y0 = ust + (kutuH - toplamH) / 2f;
            Paint pk = yaziBoya(p.soluk, 12 * olcek, false);
            Paint pn = yaziBoya(bugun ? p.vurguYazi : p.yazi, 20 * olcek, true);
            float tabanK = y0 + pk.getTextSize() * 0.72f;
            float tabanN = tabanK + pk.getTextSize() * 0.24f + 3 * d + pn.getTextSize() * 0.72f;
            pk.setTextAlign(Paint.Align.CENTER);
            pn.setTextAlign(Paint.Align.CENTER);
            c.drawText(sigdir(kisa, pk, kw - 4 * d), cx, tabanK, pk);
            c.drawText(String.valueOf(g.optInt("no")), cx, tabanN, pn);
            if (nobet) c.drawCircle(x + kw - 5 * d, ust + 5 * d, 2.5f * d, boya(p.vurgu));
            if (noktalar) {
                int adet = Math.min(toplam, 9);
                float aralik = noktaCap * 0.6f;
                float toplamW = adet * noktaCap + (adet - 1) * aralik;
                float dx = cx - toplamW / 2f;
                float dy = tabanN + 5 * d + noktaCap / 2f;
                for (int k = 0; k < adet; k++) {
                    c.drawCircle(dx + noktaCap / 2f + k * (noktaCap + aralik), dy, noktaCap / 2f, boya(k < ders ? p.vurgu : p.iz));
                }
            }
        }
        if (altSatir > 0) {
            Paint po = yaziBoya(p.soluk, 12, false);
            yaz("📅 " + olay, pad, ortaTaban(po, h - pad - altSatir / 2f + 2 * d), po, w - 2 * pad, Paint.Align.LEFT);
        }
    }

    /** Hafta kutusundaki yığının toplam yüksekliği: gün adı (+ cedilla payı), boşluk, tarih, isteğe bağlı noktalar. */
    private float yigin(float olcek, boolean noktalar, float noktaCap) {
        float k = 12 * olcek * fs, n = 20 * olcek * fs;
        return k * 0.72f + k * 0.24f + 3 * d + n * 0.72f + (noktalar ? 5 * d + noktaCap : 0);
    }

    private String haftaOlayi(JSONArray gunler, JSONObject etkinlik) {
        if (etkinlik == null) return "";
        for (int i = 0; i < gunler.length(); i++) {
            JSONObject g = gunler.optJSONObject(i);
            if (g == null) continue;
            JSONArray a = etkinlik.optJSONArray(g.optString("iso", ""));
            if (a == null || a.length() == 0) continue;
            JSONObject e = a.optJSONObject(0);
            if (e == null) continue;
            String sirf = g.optBoolean("bugun") ? "Bugün" : g.optString("kisa", "");
            String saat = e.optString("saat", "");
            return sirf + (saat.isEmpty() ? "" : " " + saat) + " · " + e.optString("baslik", "");
        }
        return "";
    }

    /* ================================================================== */
    /*  4) ZİL HALKASI — 2×2                                                */
    /* ================================================================== */

    public static Bitmap halka(WidgetTheme.Palet p, float d, float fs, JSONObject st, String havaIkon, String havaSicaklik, String havaAciklama, int w, int h) {
        Bitmap[] o = new Bitmap[1];
        WidgetCizici z = baslat(p, d, fs, w, h, 110, o);
        z.halkaWidgetCiz(st, havaIkon, havaSicaklik, havaAciklama);
        return o[0];
    }

    private void halkaWidgetCiz(JSONObject st, String havaIkon, String havaSicaklik, String havaAciklama) {
        float pad = 12 * d;
        String faz = st.optString("faz", "YOK");
        String etiket = faz.equals("DERS") ? "ZİLE KALAN" : faz.equals("TENEFFUS") || faz.equals("ONCE") ? "DERSE KALAN" : faz.equals("TATIL") ? "OKULA KALAN" : faz.equals("YOK") ? "ZİL" : "SONRAKİ DERS";
        Paint pe = yaziBoya(p.soluk, 10, true);
        pe.setLetterSpacing(0.08f);
        yaz(etiket, w / 2f, pad + 10 * d, pe, w - 2 * pad, Paint.Align.CENTER);
        String hava = havaYaz(havaIkon, havaSicaklik, "");
        boolean havaSatiri = !hava.isEmpty() && h >= 125 * d;
        boolean altSatir = h >= 100 * d;
        float alt = (altSatir ? 18 * d : 0) + (havaSatiri ? 16 * d : 0);
        float ust = pad + 18 * d;
        float alan = h - pad - alt - ust;
        float cap = Math.max(40 * d, Math.min(alan, w - 2 * pad));
        float cy = ust + alan / 2f;
        halkaCiz(w / 2f, cy, cap / 2f - 5 * d, Math.max(7 * d, cap * 0.11f), st.optDouble("halkaOran", 0), st.optString("kalanDeger", ""), st.optString("kalanBirim", ""), cap);
        float y = h - pad;
        if (havaSatiri) {
            yaz(hava + (havaAciklama == null || havaAciklama.isEmpty() ? "" : " · " + havaAciklama), w / 2f, y - 3 * d, yaziBoya(p.soluk, 11, false), w - 2 * pad, Paint.Align.CENTER);
            y -= 16 * d;
        }
        if (altSatir) yaz(st.optString("baslik", ""), w / 2f, y - 3 * d, yaziBoya(p.yazi, 12, true), w - 2 * pad, Paint.Align.CENTER);
    }

    /* ================================================================== */
    /*  5) ZİL ŞERİDİ — 4×1                                                 */
    /* ================================================================== */

    public static Bitmap serit(WidgetTheme.Palet p, float d, float fs, JSONObject st, int w, int h) {
        Bitmap[] o = new Bitmap[1];
        WidgetCizici z = baslat(p, d, fs, w, h, 40, o);
        z.seritCiz(st);
        return o[0];
    }

    private void seritCiz(JSONObject st) {
        float pad = 14 * d;
        String rozet = st.optString("rozet", "");
        boolean cift = h >= 64 * d && st.has("barOran");
        if (cift) {
            float cy1 = h * 0.36f;
            baslikSatiri(st.optString("simge", ""), st.optString("baslik", ""), rozet, pad, cy1, w - pad, 15);
            float by = h * 0.66f;
            cubuk(new RectF(pad, by, w - pad, by + 8 * d), st.optDouble("barOran", 0));
            return;
        }
        float cy = h / 2f;
        float sagKenar = w - pad;
        float rozetSol = sagKenar;
        if (!rozet.isEmpty()) rozetSol = rozetCiz(rozet, sagKenar, cy);
        Paint ik = yaziBoya(p.yazi, 17, false);
        String simge = st.optString("simge", "");
        float x = pad;
        if (!simge.isEmpty()) {
            yazOrta(simge, x, cy, ik, Paint.Align.LEFT);
            x += ik.measureText(simge) + 8 * d;
        }
        Paint pb = yaziBoya(p.yazi, 15, true);
        String baslik = st.optString("baslik", "");
        float baslikW = pb.measureText(baslik);
        float bosluk = rozetSol - 12 * d - x - baslikW;
        float barW = 0;
        if (st.has("barOran") && bosluk >= 64 * d) {
            barW = Math.min(110 * d, bosluk - 12 * d);
            float bx = rozetSol - 12 * d - barW;
            cubuk(new RectF(bx, cy - 4 * d, bx + barW, cy + 4 * d), st.optDouble("barOran", 0));
            barW += 12 * d;
        }
        yaz(baslik, x, ortaTaban(pb, cy), pb, rozetSol - barW - 12 * d - x, Paint.Align.LEFT);
    }

    /* ================================================================== */
    /*  6) NÖBETİM — 2×1                                                    */
    /* ================================================================== */

    public static Bitmap nobetim(WidgetTheme.Palet p, float d, float fs, JSONObject nb, int w, int h) {
        Bitmap[] o = new Bitmap[1];
        WidgetCizici z = baslat(p, d, fs, w, h, 40, o);
        z.nobetimCiz(nb);
        return o[0];
    }

    private void nobetimCiz(JSONObject nb) {
        float pad = Math.min(14 * d, w * 0.09f);
        boolean var = nb.optBoolean("var");
        boolean bugun = nb.optBoolean("bugun");
        String ana, alt;
        if (!var) { ana = "Nöbet yok"; alt = "Yaklaşan nöbet görünmüyor"; }
        else {
            int k = nb.optInt("kalanGun", 0);
            ana = bugun ? "Bugün" : k == 1 ? "Yarın" : nb.optString("gunAdi", "");
            String yer = nb.optString("yer", "");
            alt = yer.isEmpty() ? nb.optString("tarihMetni", "") : yer;
            if (!bugun && k > 1 && !yer.isEmpty()) alt = nb.optString("tarihMetni", "") + " · " + yer;
        }
        float x = pad;
        if (bugun) {
            kutu(new RectF(pad - 4 * d, h * 0.24f, pad, h * 0.76f), 2 * d, p.vurgu);
            x += 6 * d;
        }
        Paint ik = yaziBoya(var ? p.yazi : p.soluk, 18, false);
        yazOrta("🛡", x, h / 2f, ik, Paint.Align.LEFT);
        x += ik.measureText("🛡") + 6 * d;
        float tw = w - pad - x;
        boolean ucSatir = h >= 76 * d;
        float blok = (ucSatir ? 14 * d : 0) + 20 * d + 15 * d;
        float y = h / 2f - blok / 2f;
        if (ucSatir) {
            Paint pe = yaziBoya(p.soluk, 10, true);
            pe.setLetterSpacing(0.08f);
            yaz("NÖBETİM", x, y + 10 * d, pe, tw, Paint.Align.LEFT);
            y += 14 * d;
        }
        Paint pa = yaziBoya(bugun ? p.vurguYazi : p.yazi, 16, true);
        yaz(ana, x, y + 16 * d, pa, tw, Paint.Align.LEFT);
        y += 20 * d;
        yaz(alt, x, y + 12 * d, yaziBoya(p.soluk, 12, false), tw, Paint.Align.LEFT);
    }

    /* ================================================================== */
    /*  7) BUGÜN YEMEKTE — 4×1                                              */
    /* ================================================================== */

    public static Bitmap yemek(WidgetTheme.Palet p, float d, float fs, String baslik, List<String> ogeler, int w, int h) {
        Bitmap[] o = new Bitmap[1];
        WidgetCizici z = baslat(p, d, fs, w, h, 40, o);
        z.yemekCiz(baslik, ogeler);
        return o[0];
    }

    private void yemekCiz(String baslik, List<String> ogeler) {
        float pad = 14 * d;
        boolean iki = h >= 62 * d;
        Paint pb = yaziBoya(p.yazi, 14, true);
        String simge = "🍽";
        Paint ik = yaziBoya(p.yazi, 17, false);
        if (ogeler == null || ogeler.isEmpty()) {
            float x = pad;
            float cy = h / 2f;
            Paint ps = yaziBoya(p.soluk, 12.5f, false);
            if (iki) {
                yazOrta(simge, x, h * 0.34f, ik, Paint.Align.LEFT);
                yazOrta(baslik, x + ik.measureText(simge) + 8 * d, h * 0.34f, pb, Paint.Align.LEFT);
                yaz("Menü girilmemiş", x, ortaTaban(ps, h * 0.66f), ps, w - 2 * pad, Paint.Align.LEFT);
            } else {
                yazOrta(simge, x, cy, ik, Paint.Align.LEFT);
                x += ik.measureText(simge) + 8 * d;
                float bw = pb.measureText(baslik);
                yazOrta(baslik, x, cy, pb, Paint.Align.LEFT);
                yaz("Menü girilmemiş", x + bw + 12 * d, ortaTaban(ps, cy), ps, w - pad - x - bw - 12 * d, Paint.Align.LEFT);
            }
            return;
        }
        StringBuilder sb = new StringBuilder();
        for (String s : ogeler) { if (sb.length() > 0) sb.append(" · "); sb.append(s); }
        Paint pm = yaziBoya(p.soluk, 13, false);
        if (!iki) {
            float cy = h / 2f;
            float x = pad;
            yazOrta(simge, x, cy, ik, Paint.Align.LEFT);
            x += ik.measureText(simge) + 8 * d;
            float bw = pb.measureText(baslik);
            yazOrta(baslik, x, cy, pb, Paint.Align.LEFT);
            x += bw + 12 * d;
            yaz(sb.toString(), x, ortaTaban(pm, cy), pm, w - pad - x, Paint.Align.LEFT);
            return;
        }
        float x = pad;
        float y1 = h * 0.30f;
        yazOrta(simge, x, y1, ik, Paint.Align.LEFT);
        x += ik.measureText(simge) + 8 * d;
        yazOrta(baslik, x, y1, pb, Paint.Align.LEFT);
        float tw = w - 2 * pad;
        List<String> satir = sar(sb.toString(), pm, tw, h >= 90 * d ? 3 : 2);
        float ly = h * 0.52f;
        for (String s : satir) {
            yaz(s, pad, ly + 12 * d, pm, tw, Paint.Align.LEFT);
            ly += 17 * d;
        }
    }

    /* ================================================================== */
    /*  Ortak parçalar                                                     */
    /* ================================================================== */

    private void cerceve() {
        RectF r = new RectF(0, 0, w, h);
        float yaricap = 22 * d;
        kutu(r, yaricap, p.bg);
        float k = 0.8f * d;
        kutuCerceve(new RectF(k, k, w - k, h - k), yaricap - k, p.cerceve, 1.4f * d);
    }

    /** Başlık satırı: simge + başlık solda, sarı rozet sağda. Dönüş: başlığın bittiği x. */
    private float baslikSatiri(String simge, String baslik, String rozet, float solX, float cy, float sagKenar, float sp) {
        float rozetSol = sagKenar;
        if (rozet != null && !rozet.isEmpty()) rozetSol = rozetCiz(rozet, sagKenar, cy);
        float x = solX;
        if (simge != null && !simge.isEmpty()) {
            Paint ik = yaziBoya(p.yazi, sp + 4, false);
            yazOrta(simge, x, cy, ik, Paint.Align.LEFT);
            x += ik.measureText(simge) + 8 * d;
        }
        Paint pb = yaziBoya(p.yazi, sp, true);
        float maks = rozetSol - (rozet != null && !rozet.isEmpty() ? 10 * d : 0) - x;
        yaz(baslik, x, ortaTaban(pb, cy), pb, maks, Paint.Align.LEFT);
        return x;
    }

    /** Sağa dayalı sarı hap rozet (sarı üstünde koyu yazı). Dönüş: rozetin sol kenarı. */
    private float rozetCiz(String s, float sagX, float cy) {
        Paint t = yaziBoya(p.vurguUstu, 12, true);
        float maks = w * 0.5f;
        String yazi = sigdir(s, t, maks - 20 * d);
        float tw = t.measureText(yazi);
        float ph = 24 * d;
        RectF r = new RectF(sagX - tw - 20 * d, cy - ph / 2f, sagX, cy + ph / 2f);
        kutu(r, ph / 2f, p.vurgu);
        yazOrta(yazi, r.centerX(), cy, t, Paint.Align.CENTER);
        return r.left;
    }

    private void halkaCiz(float cx, float cy, float r, float kalinlik, double oran, String deger, String birim, float cap) {
        RectF rect = new RectF(cx - r, cy - r, cx + r, cy + r);
        Paint iz = boya(p.iz);
        iz.setStyle(Paint.Style.STROKE);
        iz.setStrokeWidth(kalinlik);
        c.drawArc(rect, 0, 360, false, iz);
        double o = Math.max(0, Math.min(1, oran));
        if (o > 0.001) {
            Paint dolu = boya(p.vurgu);
            dolu.setStyle(Paint.Style.STROKE);
            dolu.setStrokeWidth(kalinlik);
            dolu.setStrokeCap(Paint.Cap.ROUND);
            c.drawArc(rect, -90, (float) (o >= 0.999 ? 359.9 : 360 * o), false, dolu);
        }
        if (deger == null || deger.isEmpty()) return;
        float ic = (r - kalinlik / 2f) * 2f;
        float sp = deger.length() <= 2 ? 30 : deger.length() <= 4 ? 24 : 19;
        Paint pd = yaziBoya(p.yazi, sp, true);
        while (pd.measureText(deger) > ic * 0.92f && sp > 12) { sp -= 1; pd.setTextSize(sp * fs); }
        boolean birimVar = birim != null && !birim.isEmpty() && ic > 44 * d;
        float vTaban = cy + pd.getTextSize() * (birimVar ? 0.18f : 0.34f);
        pd.setTextAlign(Paint.Align.CENTER);
        c.drawText(deger, cx, vTaban, pd);
        if (birimVar) {
            Paint pu = yaziBoya(p.soluk, 11, false);
            pu.setTextAlign(Paint.Align.CENTER);
            c.drawText(birim, cx, vTaban + pu.getTextSize() * 1.35f, pu);
        }
    }

    private void cubuk(RectF r, double oran) {
        float yar = r.height() / 2f;
        kutu(r, yar, p.iz);
        double o = Math.max(0, Math.min(1, oran));
        if (o <= 0.001) return;
        float gen = Math.max(r.height(), (float) (r.width() * o));
        kutu(new RectF(r.left, r.top, r.left + gen, r.bottom), yar, p.vurgu);
    }

    private void kutu(RectF r, float yaricap, int renk) {
        Paint q = boya(renk);
        c.drawRoundRect(r, yaricap, yaricap, q);
    }

    private void kutuCerceve(RectF r, float yaricap, int renk, float kalinlik) {
        Paint q = boya(renk);
        q.setStyle(Paint.Style.STROKE);
        q.setStrokeWidth(kalinlik);
        c.drawRoundRect(r, yaricap, yaricap, q);
    }

    private Paint boya(int renk) {
        Paint q = new Paint(Paint.ANTI_ALIAS_FLAG);
        q.setColor(renk);
        return q;
    }

    private Paint yaziBoya(int renk, float sp, boolean kalin) {
        Paint q = boya(renk);
        q.setTextSize(sp * fs);
        q.setTypeface(kalin ? Typeface.DEFAULT_BOLD : Typeface.DEFAULT);
        return q;
    }

    /** Verilen alanda sığmayan metni "…" ile keser, taban çizgisine çizer. */
    private void yaz(String s, float x, float taban, Paint q, float maksW, Paint.Align hiza) {
        if (s == null || s.isEmpty() || maksW <= 0) return;
        float asil = q.getTextSize();
        float kucuk = asil;
        while (q.measureText(s) > maksW && kucuk > asil * 0.8f) { kucuk -= asil * 0.04f; q.setTextSize(kucuk); }
        String t = sigdir(s, q, maksW);
        q.setTextAlign(hiza);
        c.drawText(t, x, taban, q);
    }

    /** Metni dikey olarak cy çevresinde ortalayarak çizer. */
    private void yazOrta(String s, float x, float cy, Paint q, Paint.Align hiza) {
        if (s == null || s.isEmpty()) return;
        q.setTextAlign(hiza);
        c.drawText(s, x, ortaTaban(q, cy), q);
    }

    private float ortaTaban(Paint q, float cy) {
        Paint.FontMetrics fm = q.getFontMetrics();
        return cy - (fm.ascent + fm.descent) / 2f;
    }

    private String sigdir(String s, Paint q, float maksW) {
        if (s == null) return "";
        if (q.measureText(s) <= maksW) return s;
        String e = "…";
        int n = s.length();
        while (n > 0 && q.measureText(s.substring(0, n) + e) > maksW) n--;
        return n <= 0 ? "" : s.substring(0, n).trim() + e;
    }

    /** Metni en çok {@code satirSayisi} satıra " · " sınırlarından böler; sığmayan sondan kesilir. */
    private List<String> sar(String s, Paint q, float maksW, int satirSayisi) {
        List<String> out = new ArrayList<>();
        String[] ogeler = s.split(" · ");
        StringBuilder cur = new StringBuilder();
        int i = 0;
        while (i < ogeler.length && out.size() < satirSayisi) {
            String aday = cur.length() == 0 ? ogeler[i] : cur + " · " + ogeler[i];
            if (q.measureText(aday) <= maksW || cur.length() == 0) { cur = new StringBuilder(aday); i++; }
            else { out.add(cur.toString()); cur = new StringBuilder(); }
        }
        if (cur.length() > 0 && out.size() < satirSayisi) out.add(cur.toString());
        if (i < ogeler.length && !out.isEmpty()) {
            int son = out.size() - 1;
            out.set(son, sigdir(out.get(son) + " …", q, maksW));
        }
        return out;
    }

    private static int soluk(int renk, float oran) {
        int a = Math.round(((renk >>> 24) & 0xFF) * oran);
        return (a << 24) | (renk & 0x00FFFFFF);
    }

    private static String havaYaz(String ikon, String sicaklik, String aciklama) {
        String t = sicaklik == null ? "" : sicaklik.trim();
        if (t.isEmpty() || t.equals("--°") || t.equals("--") || t.equalsIgnoreCase("null")) return "";
        String s = (ikon == null || ikon.isEmpty() ? "" : ikon + " ") + t;
        String a = aciklama == null ? "" : aciklama.trim();
        if (!a.isEmpty() && !a.equals("—") && !a.equals("--")) s += " · " + a;
        return s;
    }
}
