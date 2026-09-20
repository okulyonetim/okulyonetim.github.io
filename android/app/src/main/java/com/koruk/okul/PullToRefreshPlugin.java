package com.koruk.okul;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/* Pull-to-refresh artık js/core/core.js'deki installUnifiedPullToRefresh() motoru
   tarafından tüm platformlarda (APK, PWA, web) tek merkezden yönetilmektedir.
   Native SwipeRefreshLayout katmanı (LogoSwipeRefreshLayout) kaldırıldı;
   bu eklenti yalnızca appHazir() sinyali için tutulmaktadır.

   setEnabled() geriye dönük uyumluluk için no-op olarak bırakıldı: JS tarafı
   hâlâ bu metodu çağırıyor olabilir; native katmanda artık karşılığı yok
   çünkü JS motoru hasScrolledAncestor() ve blocked() kontrollerini kendisi
   yapıyor. */
@CapacitorPlugin(name = "PullToRefreshPlugin")
public class PullToRefreshPlugin extends Plugin {

    @PluginMethod
    public void setEnabled(PluginCall call) {
        /* No-op: pull-to-refresh artık JS motoru tarafından yönetiliyor.
           Native enable/disable köprüsü gerekmiyor. */
        call.resolve();
    }

    /* YENİ: JS tarafı (auth.js: uygulamaBaslat() sonrası) uygulamanın
       GERÇEKTEN kullanılabilir olduğu anı bildirmek için bunu çağırır —
       pull-to-refresh göstergesi artık sabit bir süre tahmin etmek yerine
       bu sinyali bekleyip HEMEN kapanabiliyor (bkz. MainActivity.markAppReady). */
    @PluginMethod
    public void appHazir(PluginCall call) {
        MainActivity activity = (MainActivity) getActivity();
        if (activity != null) {
            activity.runOnUiThread(activity::markAppReady);
        }
        call.resolve();
    }
}
