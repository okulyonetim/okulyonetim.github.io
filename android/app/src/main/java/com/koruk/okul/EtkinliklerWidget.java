package com.koruk.okul;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

public class EtkinliklerWidget extends AppWidgetProvider {
    @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){for(int id:ids)updateWidget(c,m,id);}
    @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager m,int id,Bundle b){updateWidget(c,m,id);}
    public static void updateWidget(Context c,AppWidgetManager m,int id){
        SharedPreferences p=c.getSharedPreferences(OkulWidget.PREFS_NAME,Context.MODE_PRIVATE);
        JSONArray a=new JSONArray();
        try{a=new JSONArray(p.getString(OkulWidget.KEY_ETKINLIK_JSON,"[]"));}catch(Exception ignored){}
        RemoteViews v=new RemoteViews(c.getPackageName(),R.layout.widget_etkinlikler);
        WidgetTheme.style(v,c,id,R.id.modern_event_root,R.id.modern_event_card);
        int fg=WidgetTheme.text(c,id),muted=WidgetTheme.muted(c,id),accent=WidgetTheme.accent(c,id);
        v.setTextColor(R.id.modern_event_title,fg);v.setTextColor(R.id.modern_event_more,muted);
        for(int i=0;i<4;i++){
            int row=i==0?R.id.ev1:i==1?R.id.ev2:i==2?R.id.ev3:R.id.ev4;
            int time=i==0?R.id.ev1_time:i==1?R.id.ev2_time:i==2?R.id.ev3_time:R.id.ev4_time;
            int title=i==0?R.id.ev1_title:i==1?R.id.ev2_title:i==2?R.id.ev3_title:R.id.ev4_title;
            if(i<a.length()){
                JSONObject x=a.optJSONObject(i);
                v.setViewVisibility(row,View.VISIBLE);
                v.setTextColor(time,accent);v.setTextColor(title,fg);
                v.setTextViewText(time,x==null?"":x.optString("saat",""));
                v.setTextViewText(title,x==null?"":x.optString("baslik",""));
            }else v.setViewVisibility(row,View.GONE);
        }
        Bundle o=m.getAppWidgetOptions(id);
        int h=o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,100);
        if(h<150){v.setViewVisibility(R.id.ev3,View.GONE);v.setViewVisibility(R.id.ev4,View.GONE);}
        Intent open=new Intent(c,MainActivity.class).putExtra("page","takvim").setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setOnClickPendingIntent(R.id.modern_event_root,PendingIntent.getActivity(c,id+300,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
        m.updateAppWidget(id,v);
    }
    public static void updateAll(Context c){AppWidgetManager m=AppWidgetManager.getInstance(c);for(int id:m.getAppWidgetIds(new ComponentName(c,EtkinliklerWidget.class)))updateWidget(c,m,id);}
}