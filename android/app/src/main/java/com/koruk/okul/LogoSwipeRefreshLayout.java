package com.koruk.okul;

import android.content.Context;
import android.graphics.Color;
import android.view.Gravity;
import android.webkit.WebView;
import android.widget.FrameLayout;

import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

/**
 * Android APK pull-to-refresh.
 *
 * WebView ile elle MotionEvent/intercept yarıştırmak yerine AndroidX
 * SwipeRefreshLayout'ın nested-scroll mekanizmasını kullanır. Bu, WebView'in
 * requestDisallowInterceptTouchEvent() ve nested scrolling davranışlarıyla
 * custom ViewGroup çözümünden çok daha güvenilir çalışır.
 *
 * Tarayıcı sürümünde bu sınıf kullanılmaz; Chrome/Safari kendi native PTR
 * davranışını kullanır.
 */
public class LogoSwipeRefreshLayout extends SwipeRefreshLayout {

    private final WebView webView;
    private final LogoPullRefreshView indicator;
    private boolean pullEnabled = true;
    private boolean refreshing = false;
    private boolean innerContentKaydirilmis = false;

    private static final int INDICATOR_SIZE_DP = 48;
    private static final int INDICATOR_TOP_MARGIN_DP = 24;

    public LogoSwipeRefreshLayout(Context context, WebView webView) {
        super(context);
        this.webView = webView;

        setEnabled(true);
        setNestedScrollingEnabled(true);
        setDistanceToTriggerSync(dp(72));
        setProgressViewOffset(false, -dp(72), dp(24));

        // AndroidX'in standart spinner'ı görünmesin; görseli okul logosu sağlar.
        setColorSchemeColors(Color.TRANSPARENT);

        addView(webView, new LayoutParams(
            LayoutParams.MATCH_PARENT,
            LayoutParams.MATCH_PARENT
        ));

        indicator = new LogoPullRefreshView(context);
        FrameLayout.LayoutParams indicatorLp = new FrameLayout.LayoutParams(
            dp(INDICATOR_SIZE_DP),
            dp(INDICATOR_SIZE_DP)
        );
        indicatorLp.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        indicatorLp.topMargin = dp(INDICATOR_TOP_MARGIN_DP);
        indicator.setVisibility(INVISIBLE);
        addView(indicator, indicatorLp);

        setOnRefreshListener(() -> {
            if (!pullEnabled) {
                setRefreshing(false);
                return;
            }

            refreshing = true;
            indicator.setVisibility(VISIBLE);
            indicator.setSpinning(true);
        });
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    public void setPullEnabled(boolean enabled) {
        pullEnabled = enabled;
        setEnabled(enabled);

        if (!enabled && isRefreshing()) {
            setRefreshing(false);
        }

        if (!enabled) {
            refreshing = false;
            indicator.setSpinning(false);
            indicator.setVisibility(INVISIBLE);
        }
    }

    @Override
    public void setRefreshing(boolean refreshing) {
        super.setRefreshing(refreshing);
        this.refreshing = refreshing;

        if (refreshing) {
            indicator.setVisibility(VISIBLE);
            indicator.setSpinning(true);
        } else {
            indicator.setSpinning(false);
            indicator.setVisibility(INVISIBLE);
        }
    }

    public boolean isRefreshing() {
        return super.isRefreshing();
    }

    public void setInnerContentKaydirilmis(boolean value) {
        innerContentKaydirilmis = value;
    }

    @Override
    public boolean canChildScrollUp() {
        // WebView'in gerçek dikey kaydırması HTML içindeki .ka-app-content
        // tarafından yapılıyorsa WebView.canScrollVertically(-1) bunu göremez.
        // JS bridge bu durumda innerContentKaydirilmis'i günceller.
        return innerContentKaydirilmis || webView.canScrollVertically(-1);
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        setEnabled(pullEnabled);
    }
}
