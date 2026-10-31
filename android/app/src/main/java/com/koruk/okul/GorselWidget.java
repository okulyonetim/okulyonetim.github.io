package com.koruk.okul;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.util.Calendar;

/**
 * GorselWidget — Bitmap ile çizilen tüm widget'ların ortak tabanı (Şimdi, Bugünüm, Hafta,
 * Zil halkası, Zil şeridi, Nöbetim, Bugün yemekte). Alt sınıflar yalnızca ne çizileceğini,
 * tıklanınca hangi sayfanın açılacağını ve yenileme sıklığını söyler; boyut/tema/alarm/tıklama
 * işleri burada bir kez yapılır.
 *
 * Tema: WidgetTheme (Sistem / Açık / Koyu + yarı saydam) — widget eklenirken seçilir
 * (WidgetThemeConfigActivity), Sistem seçiliyse cihazın açık/koyu ayarını izler.
 */
public abstract class GorselWidget extends AppWidgetProvider {

    /** Bitmap'in en çok piksel sayısı: RemoteViews bellek sınırını aşmamak için. */
    private static final long EN_COK_PIKSEL = 900_000L;

    protected abstract Bitmap ciz(Context c, int id, WidgetTheme.Palet p, float d, float fs, int w, int h, Calendar simdi);

    /** Ekran okuyucular için widget özeti. */
    protected abstract String sozlu(Context c, Calendar simdi);

    /** Dokununca uygulamada açılacak sayfa (shell sayfa kimliği: schedule, duty, calendar, food ...). */
    protected abstract String hedefSayfa();

    protected abstract int istekKodu();

    /** Varsayılan boyut (dp); Android seçenek vermezse kullanılır. */
    protected abstract int varsayilanGenislik();
    protected abstract int varsayilanYukseklik();

    /** Kendini yenileme aralığı (ms): geri sayım widget'ları 1 dk, diğerleri 15 dk. */
    protected long alarmMs() { return 15 * 60_000L; }

    @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) updateWidget(c, m, id);
        alarmKur(c);
    }

    @Override public void onEnabled(Context c) { alarmKur(c); }

    @Override public void onDisabled(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(alarmIntent(c));
    }

    @Override public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle b) {
        updateWidget(c, m, id);
    }

    private void alarmKur(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        try {
            am.setRepeating(AlarmManager.RTC, System.currentTimeMillis() + alarmMs(), alarmMs(), alarmIntent(c));
        } catch (Exception ignored) {
            // Kısıtlı cihazlarda Android'in kendi 30 dk'lık updatePeriodMillis'i yedek olarak çalışır.
        }
    }

    private PendingIntent alarmIntent(Context c) {
        Intent i = new Intent(c, getClass());
        i.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] ids = AppWidgetManager.getInstance(c).getAppWidgetIds(new ComponentName(c, getClass()));
        i.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        return PendingIntent.getBroadcast(c, 900 + istekKodu(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    public final void updateWidget(Context c, AppWidgetManager m, int id) {
        Calendar simdi = Calendar.getInstance();
        DisplayMetrics dm = c.getResources().getDisplayMetrics();
        Configuration cfg = c.getResources().getConfiguration();
        float d = dm.density;
        float fs = d * Math.max(0.85f, Math.min(1.3f, cfg.fontScale));

        Bundle o = m.getAppWidgetOptions(id);
        boolean yatay = cfg.orientation == Configuration.ORIENTATION_LANDSCAPE;
        int wDp = o.getInt(yatay ? AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH : AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
        int hDp = o.getInt(yatay ? AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT : AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
        if (wDp <= 0) wDp = varsayilanGenislik();
        if (hDp <= 0) hDp = varsayilanYukseklik();
        float olcek = 1f;
        long alan = (long) Math.round(wDp * d) * Math.round(hDp * d);
        if (alan > EN_COK_PIKSEL) olcek = (float) Math.sqrt((double) EN_COK_PIKSEL / alan);
        int wPx = Math.max(1, Math.round(wDp * d * olcek));
        int hPx = Math.max(1, Math.round(hDp * d * olcek));

        WidgetTheme.Palet p = WidgetTheme.palet(c, id);
        Bitmap bmp = ciz(c, id, p, d * olcek, fs * olcek, wPx, hPx, simdi);

        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_gorsel);
        v.setImageViewBitmap(R.id.widget_gorsel, bmp);
        v.setContentDescription(R.id.widget_gorsel, sozlu(c, simdi));
        Intent open = new Intent(c, MainActivity.class).putExtra("page", hedefSayfa())
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setOnClickPendingIntent(R.id.widget_gorsel, PendingIntent.getActivity(c, istekKodu() * 1000 + id, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        m.updateAppWidget(id, v);
    }

    public final void updateAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int id : m.getAppWidgetIds(new ComponentName(c, getClass()))) updateWidget(c, m, id);
    }

    /* ---------------- Ortak veri okuma ---------------- */

    /** Zil + haftalık program + nöbet ham verisi (JS yazar: WidgetPlugin.dersZiliGuncelle). */
    protected static JSONObject ham(Context c) {
        try {
            String s = c.getSharedPreferences(DersZiliWidget.PREFS_NAME, Context.MODE_PRIVATE).getString(DersZiliWidget.KEY_JSON, null);
            return s == null ? null : new JSONObject(s);
        } catch (Exception e) { return null; }
    }

    protected static SharedPreferences okulPrefs(Context c) {
        return c.getSharedPreferences(OkulWidget.PREFS_NAME, Context.MODE_PRIVATE);
    }

    /** Tüm widget türlerini yeniden çizer (JS yeni veri yazdığında çağrılır). */
    public static void hepsiniGuncelle(Context c) {
        new DersZiliWidget().updateAll(c);
        new BugunumWidget().updateAll(c);
        new EtkinliklerWidget().updateAll(c);
        new HavaZilWidget().updateAll(c);
        new ModernDersZiliWidget().updateAll(c);
        new NobetimWidget().updateAll(c);
        new YemekWidget().updateAll(c);
        OkulWidget.updateAll(c);
    }
}
