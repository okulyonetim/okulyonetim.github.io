package com.koruk.okul;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONObject;
import java.util.Calendar;

public class ModernDersZiliWidget extends AppWidgetProvider {
    private static final long INTERVAL=60000L;

    @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){
        for(int id:ids)updateWidget(c,m,id);alarm(c);
    }
    @Override public void onEnabled(Context c){alarm(c);}
    @Override public void onDisabled(Context c){
        AlarmManager a=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        if(a!=null)a.cancel(pi(c));
    }
    @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager m,int id,Bundle b){updateWidget(c,m,id);}

    private static PendingIntent pi(Context c){
        Intent i=new Intent(c,ModernDersZiliWidget.class).setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] ids=AppWidgetManager.getInstance(c).getAppWidgetIds(new ComponentName(c,ModernDersZiliWidget.class));
        i.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS,ids);
        return PendingIntent.getBroadcast(c,931,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    private static void alarm(Context c){
        AlarmManager a=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        if(a!=null)try{a.setRepeating(AlarmManager.RTC,System.currentTimeMillis()+INTERVAL,INTERVAL,pi(c));}catch(Exception ignored){}
    }

    public static void updateWidget(Context c,AppWidgetManager m,int id){
        SharedPreferences p=c.getSharedPreferences(DersZiliWidget.PREFS_NAME,Context.MODE_PRIVATE);
        JSONObject raw=null;
        try{String s=p.getString(DersZiliWidget.KEY_JSON,null);if(s!=null)raw=new JSONObject(s);}catch(Exception ignored){}
        Calendar now=Calendar.getInstance();
        JSONObject d=DersZiliHesaplayici.hesapla(raw,now.get(Calendar.HOUR_OF_DAY)*60+now.get(Calendar.MINUTE),now.getTimeInMillis());
        RemoteViews v=new RemoteViews(c.getPackageName(),R.layout.widget_ders_zili_modern);
        WidgetTheme.style(v,c,id,R.id.modern_dz_root,R.id.modern_dz_card,R.id.modern_dz_next_card);

        int fg=WidgetTheme.text(c,id),muted=WidgetTheme.muted(c,id),accent=WidgetTheme.accent(c,id);
        v.setTextColor(R.id.modern_dz_title,fg);v.setTextColor(R.id.modern_dz_count,fg);
        v.setTextColor(R.id.modern_dz_unit,muted);v.setTextColor(R.id.modern_dz_next_label,muted);
        v.setTextColor(R.id.modern_dz_next,fg);v.setTextColor(R.id.modern_dz_active,fg);
        v.setTextColor(R.id.modern_dz_active_label,muted);v.setTextColor(R.id.modern_dz_badge,WidgetTheme.onAccent(c,id));
        v.setInt(R.id.modern_dz_badge,"setBackgroundColor",accent);

        String durum=d.optString("durumMetni","");
        int kalan=d.optInt("kalanDeger",d.optInt("kalanDakika",0));
        String birim=d.optString("kalanBirim","DAKİKA");
        v.setTextViewTextSize(R.id.modern_dz_count, android.util.TypedValue.COMPLEX_UNIT_SP, durum.isEmpty()?24f:16f);\n        v.setTextViewText(R.id.modern_dz_count,durum.isEmpty()?String.valueOf(kalan):durum);
        v.setTextViewText(R.id.modern_dz_unit,durum.isEmpty()?(birim.toLowerCase(new java.util.Locale("tr","TR"))+" kaldı"):"");
        String next=d.optString("sonrakiBaslik","—");
        String nextYer=d.optString("sonrakiYer","");
        v.setTextViewText(R.id.modern_dz_next,(next+(nextYer.isEmpty()?"":" "+nextYer)).trim());
        String active=d.optString("aktifBaslik","—");
        String activeYer=d.optString("aktifYer","");
        v.setTextViewText(R.id.modern_dz_active,(active+(activeYer.isEmpty()?"":" "+activeYer)).trim());
        double rate=d.optDouble("ilerlemeOran",0);
        v.setProgressBar(R.id.modern_dz_progress,100,(int)Math.round(Math.max(0,Math.min(1,rate))*100),false);

        Bundle o=m.getAppWidgetOptions(id);
        int h=o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,100);
        v.setViewVisibility(R.id.modern_dz_details,h>=150?View.VISIBLE:View.GONE);

        Intent open=new Intent(c,MainActivity.class).putExtra("kategori","dersProgrami").setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setOnClickPendingIntent(R.id.modern_dz_root,PendingIntent.getActivity(c,id+200,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
        m.updateAppWidget(id,v);
    }

    public static void updateAll(Context c){
        AppWidgetManager m=AppWidgetManager.getInstance(c);
        int[] ids=m.getAppWidgetIds(new ComponentName(c,ModernDersZiliWidget.class));
        for(int id:ids)updateWidget(c,m,id);
    }
}