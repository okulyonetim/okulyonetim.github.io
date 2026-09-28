package com.koruk.okul;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.RemoteViews;
import org.json.JSONObject;
import java.util.Calendar;

public class HavaZilWidget extends AppWidgetProvider {
    @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){for(int id:ids)updateWidget(c,m,id);}
    @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager m,int id,Bundle b){updateWidget(c,m,id);}
    public static void updateWidget(Context c,AppWidgetManager m,int id){
        SharedPreferences op=c.getSharedPreferences(OkulWidget.PREFS_NAME,Context.MODE_PRIVATE);
        SharedPreferences dp=c.getSharedPreferences(DersZiliWidget.PREFS_NAME,Context.MODE_PRIVATE);
        RemoteViews v=new RemoteViews(c.getPackageName(),R.layout.widget_hava_zil);
        WidgetTheme.style(v,c,id,R.id.modern_hava_root,R.id.modern_hava_weather,R.id.modern_hava_bell);
        int fg=WidgetTheme.text(c,id),muted=WidgetTheme.muted(c,id),accent=WidgetTheme.accent(c,id);
        v.setTextColor(R.id.hava_icon,fg);v.setTextColor(R.id.hava_temp,fg);v.setTextColor(R.id.hava_desc,muted);
        v.setTextColor(R.id.hava_next_label,muted);v.setTextColor(R.id.hava_next,fg);v.setTextColor(R.id.hava_next_time,accent);
        v.setTextColor(R.id.hava_title,fg);
        v.setTextViewText(R.id.hava_icon,op.getString(OkulWidget.KEY_HAVA_IKON,"⛅"));
        v.setTextViewText(R.id.hava_temp,op.getString(OkulWidget.KEY_HAVA_SICAKLIK,"--°"));
        v.setTextViewText(R.id.hava_desc,op.getString(OkulWidget.KEY_HAVA_ACIKLAMA,"—"));
        try{
            String s=dp.getString(DersZiliWidget.KEY_JSON,"{}");
            JSONObject raw=new JSONObject(s==null?"{}":s);
            Calendar now=Calendar.getInstance();
            JSONObject d=DersZiliHesaplayici.hesapla(raw,now.get(Calendar.HOUR_OF_DAY)*60+now.get(Calendar.MINUTE),now.getTimeInMillis());
            String next=d.optString("sonrakiBaslik","—"), place=d.optString("sonrakiYer","");
            v.setTextViewText(R.id.hava_next,(next+(place.isEmpty()?"":" "+place)).trim());
            v.setTextViewText(R.id.hava_next_time,d.optString("sonrakiSaat",""));
        }catch(Exception e){v.setTextViewText(R.id.hava_next,"—");}
        Intent open=new Intent(c,MainActivity.class).putExtra("kategori","dersProgrami").setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setOnClickPendingIntent(R.id.modern_hava_root,PendingIntent.getActivity(c,id+400,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
        m.updateAppWidget(id,v);
    }
    public static void updateAll(Context c){AppWidgetManager m=AppWidgetManager.getInstance(c);for(int id:m.getAppWidgetIds(new ComponentName(c,HavaZilWidget.class)))updateWidget(c,m,id);}
}