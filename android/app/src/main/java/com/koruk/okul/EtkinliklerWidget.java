package com.koruk.okul;

import android.content.Context;
import android.graphics.Bitmap;

import org.json.JSONObject;

import java.util.Calendar;

/** EtkinliklerWidget — "Hafta" (4×2): Pzt–Cum şeridi (ders sayısı, nöbet günü, bugün), hava ve yaklaşan etkinlik. */
public class EtkinliklerWidget extends GorselWidget {

    @Override protected Bitmap ciz(Context c, int id, WidgetTheme.Palet p, float d, float fs, int w, int h, Calendar simdi) {
        android.content.SharedPreferences op = okulPrefs(c);
        JSONObject etkinlik = null;
        try { etkinlik = new JSONObject(op.getString(OkulWidget.KEY_ETKINLIK_JSON, "{}")); } catch (Exception ignored) {}
        return WidgetCizici.hafta(p, d, fs, ham(c), simdi, etkinlik,
                op.getString(OkulWidget.KEY_HAVA_IKON, ""), op.getString(OkulWidget.KEY_HAVA_SICAKLIK, ""),
                op.getString(OkulWidget.KEY_HAVA_ACIKLAMA, ""), w, h);
    }

    @Override protected String sozlu(Context c, Calendar simdi) { return "Haftalık ders ve nöbet özeti"; }
    @Override protected String hedefSayfa() { return "calendar"; }
    @Override protected int istekKodu() { return 3; }
    @Override protected int varsayilanGenislik() { return 290; }
    @Override protected int varsayilanYukseklik() { return 130; }
}
