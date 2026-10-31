package com.koruk.okul;

import android.content.Context;
import android.graphics.Bitmap;

import org.json.JSONObject;

import java.util.Calendar;

/** BugunumWidget — "Bugünüm" (4×3): günün ders çizelgesi; bugün bittiyse/okul günü değilse bir sonraki okul günü. */
public class BugunumWidget extends GorselWidget {

    @Override protected Bitmap ciz(Context c, int id, WidgetTheme.Palet p, float d, float fs, int w, int h, Calendar simdi) {
        return WidgetCizici.bugunum(p, d, fs, ham(c), simdi, w, h);
    }

    @Override protected String sozlu(Context c, Calendar simdi) {
        JSONObject s = DersZiliHesaplayici.hesapla(ham(c), simdi);
        return "Bugünkü ders çizelgesi. " + s.optString("baslik", "");
    }

    @Override protected String hedefSayfa() { return "schedule"; }
    @Override protected int istekKodu() { return 2; }
    @Override protected int varsayilanGenislik() { return 290; }
    @Override protected int varsayilanYukseklik() { return 200; }
    @Override protected long alarmMs() { return 60_000L; }
}
