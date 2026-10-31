package com.koruk.okul;

import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * WidgetPlugin – JavaScript'ten native widget'lara veri köprüsü (bkz. js/core/platform/widget-adapter.js).
 *
 *   okulVerisiGuncelle({ okul, akisJson, etkinlikJson, yemekJson, havaIkon, havaSicaklik, havaAciklama })
 *       → Okul Akışı listesi + Hafta/Zil halkası/Yemek widget'larının ortak verisi.
 *   dersZiliGuncelle({ veriJson })
 *       → zil saatleri + öğretmenin haftalık programı + nöbet günleri (ham JSON).
 *
 * Geri sayım gibi anlık değerler JS'de DEĞİL, native tarafta (DersZiliHesaplayici) her çizimde
 * güncel saate göre hesaplanır; böylece uygulama kapalıyken de doğru kalır.
 */
@CapacitorPlugin(name = "WidgetPlugin")
public class WidgetPlugin extends Plugin {

    @PluginMethod
    public void okulVerisiGuncelle(PluginCall call) {
        Context c = getContext();
        c.getSharedPreferences(OkulWidget.PREFS_NAME, Context.MODE_PRIVATE).edit()
                .putString(OkulWidget.KEY_OKUL, call.getString("okul", ""))
                .putString(OkulWidget.KEY_AKIS_JSON, call.getString("akisJson", "[]"))
                .putString(OkulWidget.KEY_ETKINLIK_JSON, call.getString("etkinlikJson", "{}"))
                .putString(OkulWidget.KEY_YEMEK_JSON, call.getString("yemekJson", "{}"))
                .putString(OkulWidget.KEY_HAVA_IKON, call.getString("havaIkon", ""))
                .putString(OkulWidget.KEY_HAVA_SICAKLIK, call.getString("havaSicaklik", ""))
                .putString(OkulWidget.KEY_HAVA_ACIKLAMA, call.getString("havaAciklama", ""))
                .apply();
        GorselWidget.hepsiniGuncelle(c);
        call.resolve();
    }

    @PluginMethod
    public void dersZiliGuncelle(PluginCall call) {
        DersZiliWidget.veriGuncelle(getContext(), call.getString("veriJson", "{}"));
        call.resolve();
    }
}
