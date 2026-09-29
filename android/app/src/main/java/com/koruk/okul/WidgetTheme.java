package com.koruk.okul;

import android.app.UiModeManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import android.widget.RemoteViews;

public final class WidgetTheme {
    public static final String PREFS="KorukWidgetThemePrefs";
    public static final String KEY_PREFIX="theme_";
    public static final String SYSTEM="system";
    public static final String LIGHT="light";
    public static final String DARK="dark";

    private WidgetTheme(){}

    public static String get(Context c,int id){
        return c.getSharedPreferences(PREFS,Context.MODE_PRIVATE)
                .getString(KEY_PREFIX+id,SYSTEM);
    }

    public static void set(Context c,int id,String mode){
        c.getSharedPreferences(PREFS,Context.MODE_PRIVATE)
                .edit().putString(KEY_PREFIX+id,mode==null?SYSTEM:mode).apply();
    }

    public static boolean isDark(Context c,int id){
        String mode=get(c,id);
        if(DARK.equals(mode)) return true;
        if(LIGHT.equals(mode)) return false;
        int night=c.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return night==Configuration.UI_MODE_NIGHT_YES;
    }

    public static int bg(Context c,int id){return isDark(c,id)?Color.rgb(20,23,26):Color.WHITE;}
    public static int card(Context c,int id){return isDark(c,id)?Color.rgb(30,34,38):Color.rgb(248,249,250);}
    public static int text(Context c,int id){return isDark(c,id)?Color.WHITE:Color.rgb(21,23,26);}
    public static int muted(Context c,int id){return isDark(c,id)?Color.rgb(184,190,196):Color.rgb(95,101,108);}
    public static int border(Context c,int id){return Color.rgb(255,196,0);}
    public static int accent(Context c,int id){return Color.rgb(255,196,0);}
    public static int onAccent(Context c,int id){return Color.rgb(17,17,17);}

    /** Native Android widgetlerde web design-system ile aynı antrasit/sarı dili. */
    private static int rootBackground(Context c,int id){
        return isDark(c,id) ? R.drawable.widget_theme_root_dark : R.drawable.widget_theme_root_light;
    }
    private static int cardBackground(Context c,int id){
        return isDark(c,id) ? R.drawable.widget_theme_card_dark : R.drawable.widget_theme_card_light;
    }

    public static void style(RemoteViews v,Context c,int id,int root,int... cards){
        v.setInt(root,"setBackgroundResource",rootBackground(c,id));
        for(int card:cards)v.setInt(card,"setBackgroundResource",cardBackground(c,id));
    }
}