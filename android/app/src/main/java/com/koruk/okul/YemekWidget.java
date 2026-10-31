package com.koruk.okul;

import android.content.Context;
import android.graphics.Bitmap;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

/**
 * YemekWidget — "Bugün Yemekte" (4×1): günün yemek menüsü. Öğle yemeği saatinden sonra
 * ya da bugün menü yoksa, menüsü olan ilk sonraki gün ("Yarın yemekte" / "Pazartesi menüsü").
 * Veri: {"2026-10-30":["Mercimek Çorbası", ...]} (JS yazar).
 */
public class YemekWidget extends GorselWidget {

    /** Bu saatten (dk) sonra bugünün menüsü yerine bir sonrakine bakılır. */
    private static final int OGLEDEN_SONRA = 14 * 60 + 30;

    @Override protected Bitmap ciz(Context c, int id, WidgetTheme.Palet p, float d, float fs, int w, int h, Calendar simdi) {
        Secim s = sec(c, simdi);
        return WidgetCizici.yemek(p, d, fs, s.baslik, s.ogeler, w, h);
    }

    @Override protected String sozlu(Context c, Calendar simdi) {
        Secim s = sec(c, simdi);
        return s.baslik + ". " + (s.ogeler.isEmpty() ? "Menü girilmemiş" : android.text.TextUtils.join(", ", s.ogeler));
    }

    @Override protected String hedefSayfa() { return "food"; }
    @Override protected int istekKodu() { return 7; }
    @Override protected int varsayilanGenislik() { return 290; }
    @Override protected int varsayilanYukseklik() { return 60; }

    private static final class Secim { String baslik = "Bugün yemekte"; List<String> ogeler = new ArrayList<>(); }

    private Secim sec(Context c, Calendar simdi) {
        Secim s = new Secim();
        JSONObject harita;
        try { harita = new JSONObject(okulPrefs(c).getString(OkulWidget.KEY_YEMEK_JSON, "{}")); } catch (Exception e) { return s; }
        int dk = simdi.get(Calendar.HOUR_OF_DAY) * 60 + simdi.get(Calendar.MINUTE);
        int baslangic = dk >= OGLEDEN_SONRA ? 1 : 0;
        for (int i = baslangic; i < baslangic + 8; i++) {
            Calendar g = (Calendar) simdi.clone();
            g.add(Calendar.DAY_OF_MONTH, i);
            JSONArray a = harita.optJSONArray(DersZiliHesaplayici.isoYaz(g));
            if (a == null || a.length() == 0) continue;
            for (int k = 0; k < a.length(); k++) {
                String t = a.optString(k, "").trim();
                if (!t.isEmpty()) s.ogeler.add(t);
            }
            if (s.ogeler.isEmpty()) continue;
            s.baslik = i == 0 ? "Bugün yemekte" : i == 1 ? "Yarın yemekte" : DersZiliHesaplayici.GUN_ADI[g.get(Calendar.DAY_OF_WEEK)] + " menüsü";
            return s;
        }
        s.baslik = baslangic == 0 ? "Bugün yemekte" : "Yarın yemekte";
        return s;
    }
}
