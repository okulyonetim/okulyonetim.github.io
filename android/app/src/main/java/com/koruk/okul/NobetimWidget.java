package com.koruk.okul;

import android.content.Context;
import android.graphics.Bitmap;

import org.json.JSONObject;

import java.util.Calendar;

/** NobetimWidget — "Nöbetim" (2×1): bugünkü ya da bir sonraki nöbet günü ve yeri. */
public class NobetimWidget extends GorselWidget {

    @Override protected Bitmap ciz(Context c, int id, WidgetTheme.Palet p, float d, float fs, int w, int h, Calendar simdi) {
        return WidgetCizici.nobetim(p, d, fs, DersZiliHesaplayici.nobetBilgisi(ham(c), simdi), w, h);
    }

    @Override protected String sozlu(Context c, Calendar simdi) {
        JSONObject n = DersZiliHesaplayici.nobetBilgisi(ham(c), simdi);
        if (!n.optBoolean("var")) return "Nöbetim. Yaklaşan nöbet yok";
        return "Nöbetim. " + (n.optBoolean("bugun") ? "Bugün" : n.optString("gunAdi", "")) + " " + n.optString("yer", "");
    }

    @Override protected String hedefSayfa() { return "duty"; }
    @Override protected int istekKodu() { return 6; }
    @Override protected int varsayilanGenislik() { return 140; }
    @Override protected int varsayilanYukseklik() { return 60; }
}
