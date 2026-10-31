package com.koruk.okul;

import android.content.Context;
import android.graphics.Bitmap;

import org.json.JSONObject;

import java.util.Calendar;

/** ModernDersZiliWidget — "Zil Şeridi" (4×1): tek satırda ders/teneffüs, ilerleme çubuğu ve kalan süre. */
public class ModernDersZiliWidget extends GorselWidget {

    @Override protected Bitmap ciz(Context c, int id, WidgetTheme.Palet p, float d, float fs, int w, int h, Calendar simdi) {
        return WidgetCizici.serit(p, d, fs, DersZiliHesaplayici.hesapla(ham(c), simdi), w, h);
    }

    @Override protected String sozlu(Context c, Calendar simdi) {
        JSONObject s = DersZiliHesaplayici.hesapla(ham(c), simdi);
        return "Zil şeridi. " + s.optString("baslik", "") + ". " + s.optString("rozet", "");
    }

    @Override protected String hedefSayfa() { return "schedule"; }
    @Override protected int istekKodu() { return 5; }
    @Override protected int varsayilanGenislik() { return 290; }
    @Override protected int varsayilanYukseklik() { return 60; }
    @Override protected long alarmMs() { return 60_000L; }
}
