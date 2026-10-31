package com.koruk.okul;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * OkulAkisServisi — "Okul Akışı" listesinin satırlarını üretir.
 * Satır: {tur:"duyuru|gorev|hatirlatici|not|haber|nobet|tatil", baslik, alt, sayfa}
 */
public class OkulAkisServisi extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        return new Fabrika(getApplicationContext(), id);
    }

    private static final class Fabrika implements RemoteViewsFactory {
        private final Context c;
        private final int id;
        private final List<JSONObject> satirlar = new ArrayList<>();

        Fabrika(Context c, int id) { this.c = c; this.id = id; }

        @Override public void onCreate() { }
        @Override public void onDestroy() { satirlar.clear(); }

        @Override public void onDataSetChanged() {
            satirlar.clear();
            try {
                JSONArray a = new JSONArray(c.getSharedPreferences(OkulWidget.PREFS_NAME, Context.MODE_PRIVATE)
                        .getString(OkulWidget.KEY_AKIS_JSON, "[]"));
                for (int i = 0; i < a.length(); i++) {
                    JSONObject s = a.optJSONObject(i);
                    if (s != null) satirlar.add(s);
                }
            } catch (Exception ignored) { }
        }

        @Override public int getCount() { return satirlar.size(); }

        @Override public RemoteViews getViewAt(int i) {
            RemoteViews r = new RemoteViews(c.getPackageName(), R.layout.widget_akis_satir);
            if (i < 0 || i >= satirlar.size()) return r;
            JSONObject s = satirlar.get(i);
            String tur = s.optString("tur", "");
            WidgetTheme.kart(r, c, id, R.id.akis_satir);
            r.setTextViewText(R.id.akis_tur, etiket(tur));
            r.setInt(R.id.akis_tur, "setBackgroundResource", etiketArkaplani(tur));
            r.setTextColor(R.id.akis_tur, WidgetTheme.onAccent(c, id));
            r.setTextViewText(R.id.akis_baslik, s.optString("baslik", ""));
            r.setTextColor(R.id.akis_baslik, WidgetTheme.text(c, id));
            String alt = s.optString("alt", "");
            r.setTextViewText(R.id.akis_alt, alt);
            r.setTextColor(R.id.akis_alt, WidgetTheme.muted(c, id));
            r.setViewVisibility(R.id.akis_alt, alt.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);
            Intent fill = new Intent().putExtra("page", s.optString("sayfa", ""));
            r.setOnClickFillInIntent(R.id.akis_satir, fill);
            return r;
        }

        @Override public RemoteViews getLoadingView() { return null; }
        @Override public int getViewTypeCount() { return 1; }
        @Override public long getItemId(int i) { return i; }
        @Override public boolean hasStableIds() { return false; }

        private static String etiket(String tur) {
            switch (tur) {
                case "duyuru": return "DUYURU";
                case "gorev": return "GÖREV";
                case "hatirlatici": return "TAKVİM";
                case "not": return "NOT";
                case "haber": return "HABER";
                case "nobet": return "NÖBET";
                case "tatil": return "TATİL";
                default: return "";
            }
        }

        private static int etiketArkaplani(String tur) {
            switch (tur) {
                case "gorev": return R.drawable.widget_etiket_turkuaz;
                case "hatirlatici": return R.drawable.widget_etiket_gok;
                case "not": return R.drawable.widget_etiket_turuncu;
                case "haber": return R.drawable.widget_etiket_mor;
                case "nobet": return R.drawable.widget_etiket_yesil;
                default: return R.drawable.widget_etiket_sari;
            }
        }
    }
}
