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
    public static final String KEY_TRANSPARENT="transparent_";

    private WidgetTheme(){}

    public static String get(Context c,int id){
        return c.getSharedPreferences(PREFS,Context.MODE_PRIVATE)
                .getString(KEY_PREFIX+id,SYSTEM);
    }

    public static void set(Context c,int id,String mode){
        c.getSharedPreferences(PREFS,Context.MODE_PRIVATE)
                .edit().putString(KEY_PREFIX+id,mode==null?SYSTEM:mode).apply();
    }

    public static boolean isTransparent(Context c,int id){
        return c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getBoolean(KEY_TRANSPARENT+id,false);
    }

    public static void setTransparent(Context c,int id,boolean enabled){
        c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putBoolean(KEY_TRANSPARENT+id,enabled).apply();
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
        if(isDark(c,id)) return isTransparent(c,id) ? R.drawable.widget_theme_root_dark_transparent : R.drawable.widget_theme_root_dark;
        return isTransparent(c,id) ? R.drawable.widget_theme_root_light_transparent : R.drawable.widget_theme_root_light;
    }
    private static int cardBackground(Context c,int id){
        return isDark(c,id) ? R.drawable.widget_theme_card_dark : R.drawable.widget_theme_card_light;
    }

    /** Liste satırı gibi tek bir görünüme tema kartı arka planı verir. */
    public static void kart(RemoteViews v,Context c,int id,int view){
        v.setInt(view,"setBackgroundResource",cardBackground(c,id));
    }

    public static void style(RemoteViews v,Context c,int id,int root,int... cards){
        v.setInt(root,"setBackgroundResource",rootBackground(c,id));
        for(int card:cards)v.setInt(card,"setBackgroundResource",cardBackground(c,id));
    }

    /** Bitmap ile çizilen widget'ların renk paleti: tek tasarım dili (antrasit/beyaz zemin + sarı vurgu), açık/koyu/yarı saydam. */
    public static final class Palet {
        public boolean koyu, saydam;
        public int bg, kart, yazi, soluk, vurgu, vurguYazi, vurguUstu, iz, cerceve;
    }

    public static Palet palet(Context c,int id){
        boolean koyu=isDark(c,id),saydam=isTransparent(c,id);
        return palet(koyu,saydam);
    }

    /** Context gerektirmeyen çekirdek (önizleme/test için de kullanılır). */
    public static Palet palet(boolean koyu,boolean saydam){
        Palet p=new Palet();
        p.koyu=koyu;p.saydam=saydam;
        p.bg=koyu?(saydam?Color.argb(0x80,20,20,20):Color.rgb(20,23,26)):(saydam?Color.argb(0x80,247,247,247):Color.WHITE);
        p.kart=koyu?(saydam?Color.argb(0x66,30,34,38):Color.rgb(30,34,38)):(saydam?Color.argb(0x99,255,255,255):Color.rgb(241,243,245));
        p.yazi=koyu?Color.WHITE:Color.rgb(21,23,26);
        p.soluk=koyu?Color.rgb(184,190,196):Color.rgb(95,101,108);
        p.vurgu=Color.rgb(255,196,0);
        p.vurguYazi=koyu?Color.rgb(255,196,0):Color.rgb(166,112,0);
        p.vurguUstu=Color.rgb(17,17,17);
        p.iz=koyu?Color.rgb(42,48,54):Color.rgb(224,227,231);
        p.cerceve=koyu?Color.argb(140,255,196,0):Color.rgb(210,173,43);
        return p;
    }
}
