package com.koruk.okul;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.TextView;

public class WidgetThemeConfigActivity extends Activity {
    private int widgetId;
    @Override protected void onCreate(Bundle b){
        super.onCreate(b);
        widgetId=getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,AppWidgetManager.INVALID_APPWIDGET_ID);
        if(widgetId==AppWidgetManager.INVALID_APPWIDGET_ID){setResult(RESULT_CANCELED);finish();return;}

        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(28,24,28,24);
        root.setBackgroundColor(Color.WHITE);

        TextView title=new TextView(this);
        title.setText("Koruk Asistan Widget");
        title.setTextSize(20);
        title.setTextColor(Color.rgb(21,23,26));
        title.setTypeface(null,1);
        root.addView(title,new LinearLayout.LayoutParams(-1,-2));

        TextView sub=new TextView(this);
        sub.setText("Tema");
        sub.setTextSize(14);
        sub.setTextColor(Color.DKGRAY);
        sub.setPadding(0,18,0,6);
        root.addView(sub);

        RadioGroup group=new RadioGroup(this); group.setId(0x7f0a1001);
        RadioButton system=new RadioButton(this); system.setId(0x7f0a1002); system.setText("Sistem"); system.setTag(WidgetTheme.SYSTEM);
        RadioButton light=new RadioButton(this); light.setId(0x7f0a1003); light.setText("Açık"); light.setTag(WidgetTheme.LIGHT);
        RadioButton dark=new RadioButton(this); dark.setId(0x7f0a1004); dark.setText("Koyu"); dark.setTag(WidgetTheme.DARK);
        group.addView(system);group.addView(light);group.addView(dark);
        String current=WidgetTheme.get(this,widgetId);
        (WidgetTheme.DARK.equals(current)?dark:WidgetTheme.LIGHT.equals(current)?light:system).setChecked(true);
        root.addView(group);

        Button save=new Button(this);
        save.setText("Kaydet");
        save.setTextColor(Color.rgb(21,23,26));
        save.setBackgroundColor(Color.rgb(255,196,0));
        LinearLayout.LayoutParams bp=new LinearLayout.LayoutParams(-1,-2);
        bp.topMargin=18;
        root.addView(save,bp);
        save.setOnClickListener(v->{
            RadioButton checked=findViewById(group.getCheckedRadioButtonId());
            String mode=checked==null?WidgetTheme.SYSTEM:String.valueOf(checked.getTag());
            WidgetTheme.set(this,widgetId,mode);
            AppWidgetManager mgr=AppWidgetManager.getInstance(this);
            ComponentName p=mgr.getAppWidgetInfo(widgetId).provider;
            if(p!=null){
                String n=p.getClassName();
                if(n.endsWith("ModernDersZiliWidget"))ModernDersZiliWidget.updateWidget(this,mgr,widgetId);
                else if(n.endsWith("EtkinliklerWidget"))EtkinliklerWidget.updateWidget(this,mgr,widgetId);
                else if(n.endsWith("HavaZilWidget"))HavaZilWidget.updateWidget(this,mgr,widgetId);
            }
            Intent result=new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,widgetId);
            setResult(RESULT_OK,result);finish();
        });
        setContentView(root);
    }
}