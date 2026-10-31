package com.koruk.okul;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;

import java.util.Calendar;
import java.util.Locale;

/**
 * OkulWidget — "Okul Akışı" (4×3): nöbetçiler, duyuru, görev, hatırlatma, not ve haberler TEK
 * kaydırılabilir listede. Sayfa çevirme yok; her satıra dokunmak uygulamada ilgili sayfayı açar.
 * Liste satırlarını OkulAkisServisi üretir (RemoteViewsService).
 *
 * Veriler uygulama açıkken JS tarafından (widget-adapter.js → WidgetPlugin.okulVerisiGuncelle)
 * SharedPreferences'a JSON olarak yazılır; widget internet gerektirmeden bunları okur.
 * Aynı dosya diğer widget'ların ortak verisini de taşır (hava, etkinlik, yemek menüsü).
 */
public class OkulWidget extends AppWidgetProvider {

    public static final String PREFS_NAME = "OkulWidgetPrefs";

    public static final String KEY_OKUL = "widget_okul";
    public static final String KEY_AKIS_JSON = "widget_akis_json";
    public static final String KEY_ETKINLIK_JSON = "widget_etkinlik_json";
    public static final String KEY_YEMEK_JSON = "widget_yemek_json";

    public static final String KEY_HAVA_IKON = "widget_hava_ikon";
    public static final String KEY_HAVA_SICAKLIK = "widget_hava_sicaklik";
    public static final String KEY_HAVA_ACIKLAMA = "widget_hava_aciklama";

    public static final String ACTION_YENILE = "com.koruk.okul.ACTION_YENILE";
    public static final String EXTRA_WIDGET_ID = AppWidgetManager.EXTRA_APPWIDGET_ID;

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (!ACTION_YENILE.equals(intent.getAction())) return;
        int id = intent.getIntExtra(EXTRA_WIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return;
        AppWidgetManager m = AppWidgetManager.getInstance(context);
        m.notifyAppWidgetViewDataChanged(id, R.id.akis_liste);
        updateWidget(context, m, id);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager m, int[] ids) {
        for (int id : ids) updateWidget(context, m, id);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager m, int id, android.os.Bundle b) {
        updateWidget(context, m, id);
    }

    public static void updateWidget(Context c, AppWidgetManager m, int id) {
        SharedPreferences prefs = c.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String okul = prefs.getString(KEY_OKUL, "");
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_okul);
        WidgetTheme.style(v, c, id, R.id.akis_root);
        int fg = WidgetTheme.text(c, id), muted = WidgetTheme.muted(c, id);
        v.setTextColor(R.id.akis_baslik, fg);
        v.setTextColor(R.id.akis_zaman, muted);
        v.setTextColor(R.id.akis_yenile, muted);
        v.setTextColor(R.id.akis_bos, muted);
        v.setTextViewText(R.id.akis_baslik, okul == null || okul.isEmpty() ? "Koruk Asistan" : okul);
        Calendar now = Calendar.getInstance();
        v.setTextViewText(R.id.akis_zaman, String.format(Locale.US, "%02d:%02d", now.get(Calendar.HOUR_OF_DAY), now.get(Calendar.MINUTE)));

        Intent svc = new Intent(c, OkulAkisServisi.class);
        svc.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
        svc.setData(Uri.parse(svc.toUri(Intent.URI_INTENT_SCHEME)));
        v.setRemoteAdapter(R.id.akis_liste, svc);
        v.setEmptyView(R.id.akis_liste, R.id.akis_bos);

        int mutable = Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0;
        Intent sablon = new Intent(c, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setPendingIntentTemplate(R.id.akis_liste, PendingIntent.getActivity(c, 8000 + id, sablon, PendingIntent.FLAG_UPDATE_CURRENT | mutable));

        Intent ac = new Intent(c, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setOnClickPendingIntent(R.id.akis_baslik, PendingIntent.getActivity(c, 8500 + id, ac, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        Intent yenile = new Intent(c, OkulWidget.class).setAction(ACTION_YENILE).putExtra(EXTRA_WIDGET_ID, id);
        v.setOnClickPendingIntent(R.id.akis_yenile, PendingIntent.getBroadcast(c, 9000 + id, yenile, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        m.updateAppWidget(id, v);
    }

    /** Veri değiştiğinde: liste satırlarını yeniden okutur ve başlığı tazeler. */
    public static void updateAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, OkulWidget.class));
        if (ids.length == 0) return;
        m.notifyAppWidgetViewDataChanged(ids, R.id.akis_liste);
        for (int id : ids) updateWidget(c, m, id);
    }
}
