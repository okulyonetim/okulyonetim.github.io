package com.koruk.okul;

import android.content.Context;
import android.graphics.Bitmap;

import org.json.JSONObject;

import java.util.Calendar;

/** HavaZilWidget — "Zil Halkası" (2×2): kalan süre halkası, güncel ders ve hava durumu. */
public class HavaZilWidget extends GorselWidget {

    @Override protected Bitmap ciz(Context c, int id, WidgetTheme.Palet p, float d, float fs, int w, int h, Calendar simdi) {
        android.content.SharedPreferences op = okulPrefs(c);
        return WidgetCizici.halka(p, d, fs, DersZiliHesaplayici.hesapla(ham(c), simdi),
                op.getString(OkulWidget.KEY_HAVA_IKON, ""), op.getString(OkulWidget.KEY_HAVA_SICAKLIK, ""),
                op.getString(OkulWidget.KEY_HAVA_ACIKLAMA, ""), w, h);
    }

    @Override protected String sozlu(Context c, Calendar simdi) {
        JSONObject s = DersZiliHesaplayici.hesapla(ham(c), simdi);
        return "Zil halkası. " + s.optString("baslik", "") + ". " + s.optString("rozet", "");
    }

    @Override protected String hedefSayfa() { return "schedule"; }
    @Override protected int istekKodu() { return 4; }
    @Override protected int varsayilanGenislik() { return 130; }
    @Override protected int varsayilanYukseklik() { return 130; }
    @Override protected long alarmMs() { return 60_000L; }
}
