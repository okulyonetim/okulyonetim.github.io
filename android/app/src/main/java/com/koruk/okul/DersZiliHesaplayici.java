package com.koruk.okul;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * DersZiliHesaplayici — JS'den gelen HAM ders programını (gün içindeki
 * segmentler: başlangıç/bitiş dakikası + başlık/yer) alıp, o ANKİ saate göre
 * "kalan dakika / ilerleme oranı / aktif-sonraki ders" gibi GÖRÜNTÜLENECEK
 * değerleri hesaplar.
 *
 * Bu hesaplamanın native tarafta yapılmasının sebebi: uygulama kapalıyken de
 * (sadece Android'in kendi widget alarmı tetiklendiğinde) sayacın DOĞRU
 * kalması gerekiyor — JS her seferinde çalışmadığı için "kalan dakika" gibi
 * anlık değerleri JS'de önceden hesaplayıp göndermek, uygulama kapandığı anda
 * bu değerlerin bayatlamasına yol açardı.
 *
 * Beklenen HAM veri (bkz. js/widget-bridge.js):
 * {
 *   "tatilModu": true|false, "tatilNotu": "...",
 *   "dersYok": true|false, "durumMetniOzel": "...",
 *   "segmentler": [ {"bas":510,"bit":550,"baslik":"FİZİK","yer":"(102)"}, ... ]  // dakika/gün
 * }
 */
public class DersZiliHesaplayici {

    public static JSONObject hesapla(JSONObject ham, int simdiDk, long simdiMillis) {
        JSONObject sonuc = new JSONObject();
        try {
            if (ham == null) { sonuc.put("durumMetni", "Uygulamayı açınız"); return sonuc; }

            if (ham.optBoolean("tatilModu", false)) {
                String tatilNotu = ham.optString("tatilNotu", "Okul tatilde");
                Integer kalanGun = gunFarkiHesapla(ham.optString("okulAcilisTarihi", null), simdiMillis);

                if (kalanGun != null && kalanGun > 0) {
                    // Halka merkezinde ders/teneffüs ile aynı düzende (etiket + büyük
                    // sayı + birim) gün sayısını göster; alt not olarak tam tarihi ekle.
                    sonuc.put("kalanDeger", (int) kalanGun);
                    sonuc.put("kalanBirim", "GÜN");
                    sonuc.put("kalanEtiket", "OKULA KALAN");
                    sonuc.put("altNot", tatilNotu);
                } else if (kalanGun != null && kalanGun == 0) {
                    sonuc.put("durumMetni", "Bugün okul açılıyor! \uD83C\uDF89");
                } else {
                    // Tarih girilmemiş veya geçmişte kalmış — eski davranışa (düz metin) düş.
                    sonuc.put("durumMetni", tatilNotu);
                }
                return sonuc;
            }
            if (ham.optBoolean("dersYok", false)) {
                sonuc.put("durumMetni", ham.optString("durumMetniOzel", "Uygulamayı açınız"));
                return sonuc;
            }

            JSONArray segmentler = ham.optJSONArray("segmentler");
            if (segmentler == null || segmentler.length() == 0) {
                sonuc.put("durumMetni", "Zil programı yok");
                return sonuc;
            }

            // Zaman çizelgesi satırları (her segment kendi başlangıcıyla görünür)
            JSONArray zaman = new JSONArray();
            int aktifIndex = -1;
            for (int i = 0; i < segmentler.length(); i++) {
                JSONObject s = segmentler.getJSONObject(i);
                int bas = dakika(s.opt("bas"), -1), bit = dakika(s.opt("bit"), -1);
                if (bas < 0 || bit < 0 || bit <= bas) continue;
                boolean simdiMi = simdiDk >= bas && simdiDk < bit;
                if (simdiMi) aktifIndex = i;

                JSONObject satir = new JSONObject();
                satir.put("saat", String.format("%02d:%02d", bas / 60, bas % 60));
                satir.put("etiket", s.optString("baslik", ""));
                satir.put("simdi", simdiMi);
                zaman.put(satir);
            }
            sonuc.put("zaman", zaman);

            if (aktifIndex == -1) {
                int sonrakiIndex = -1;
                for (int i = 0; i < segmentler.length(); i++) {
                    int bas = dakika(segmentler.getJSONObject(i).opt("bas"), -1); if (bas > simdiDk) { sonrakiIndex = i; break; }
                }
                if (sonrakiIndex == -1) {
                    sonuc.put("durumMetni", "Bugünkü dersler bitti");
                } else if (sonrakiIndex == 0) {
                    sonuc.put("durumMetni", "Okul henüz açılmadı");
                } else {
                    // Teneffüsteyiz: sonraki segment başlayana kadar geri sayım.
                    // Teneffüsün toplam süresi arayüzde gösterilmediği için halka sabit yarım çiziliyor.
                    JSONObject sonrakiSeg = segmentler.getJSONObject(sonrakiIndex);
                    int sonrakiBas = dakika(sonrakiSeg.opt("bas"), -1); if (sonrakiBas < 0) { sonuc.put("durumMetni", "Zil programı yok"); return sonuc; } int kalan = sonrakiBas - simdiDk;
                    sonuc.put("kalanDakika", kalan);
                    sonuc.put("ilerlemeOran", 0.5);
                    sonuc.put("aktifBaslik", "TENEFFÜS");
                    sonuc.put("aktifYer", "");
                    sonuc.put("sonrakiBaslik", sonrakiSeg.optString("baslik", ""));
                    sonuc.put("sonrakiYer", sonrakiSeg.optString("yer", ""));
                    sonuc.put("sonrakiSaat", String.format("%02d:%02d", sonrakiBas / 60, sonrakiBas % 60));
                    sonuc.put("sonrakiSaat", String.format("%02d:%02d", sonrakiSeg.getInt("bas") / 60, sonrakiSeg.getInt("bas") % 60));
                }
            } else {
                JSONObject seg = segmentler.getJSONObject(aktifIndex);
                int bas = dakika(seg.opt("bas"), -1), bit = dakika(seg.opt("bit"), -1); if (bas < 0 || bit <= bas) { sonuc.put("durumMetni", "Zil programı yok"); return sonuc; }
                int kalan = bit - simdiDk;
                int toplam = bit - bas;
                sonuc.put("kalanDakika", kalan);
                sonuc.put("ilerlemeOran", toplam > 0 ? (double) kalan / toplam : 0);
                sonuc.put("aktifBaslik", seg.optString("baslik", ""));
                sonuc.put("aktifYer", seg.optString("yer", ""));
                if (aktifIndex + 1 < segmentler.length()) {
                    JSONObject sonrakiSeg = segmentler.getJSONObject(aktifIndex + 1);
                    sonuc.put("sonrakiBaslik", sonrakiSeg.optString("baslik", ""));
                    sonuc.put("sonrakiYer", sonrakiSeg.optString("yer", ""));
                } else {
                    sonuc.put("sonrakiBaslik", "Gün Sonu");
                    sonuc.put("sonrakiSaat", "");
                    sonuc.put("sonrakiYer", "");
                }
            }
        } catch (Exception e) {
            try { sonuc.put("durumMetni", "Zil programı yok"); } catch (Exception ignored) {}
        }
        return sonuc;
    }

    private static int dakika(Object value, int fallback) {
        if (value == null) return fallback;
        if (value instanceof Number) return ((Number) value).intValue();
        String s = String.valueOf(value).trim();
        if (s.isEmpty()) return fallback;
        try {
            if (s.contains(":")) {
                String[] p = s.split(":");
                if (p.length == 2) return Integer.parseInt(p[0].trim()) * 60 + Integer.parseInt(p[1].trim());
            }
            return (int) Math.round(Double.parseDouble(s));
        } catch (Exception e) { return fallback; }
    }

    /**
     * "YYYY-MM-DD" biçimindeki okul açılış tarihi ile şu anki zaman arasındaki
     * TAM GÜN farkını hesaplar (saat farkını yok sayıp gece yarısına göre
     * karşılaştırır, böylece "bugün" her zaman 0 çıkar). Tarih boşsa/okunamazsa
     * null döner (çağıran taraf eski metin-tabanlı davranışa düşer).
     */
    private static Integer gunFarkiHesapla(String tarihStr, long simdiMillis) {
        if (tarihStr == null || tarihStr.isEmpty() || "null".equals(tarihStr)) return null;
        try {
            String[] parcalar = tarihStr.split("-");
            if (parcalar.length != 3) return null;
            int yil = Integer.parseInt(parcalar[0]);
            int ay = Integer.parseInt(parcalar[1]) - 1;
            int gun = Integer.parseInt(parcalar[2]);

            java.util.Calendar hedef = java.util.Calendar.getInstance();
            hedef.set(yil, ay, gun, 0, 0, 0);
            hedef.set(java.util.Calendar.MILLISECOND, 0);

            java.util.Calendar bugun = java.util.Calendar.getInstance();
            bugun.setTimeInMillis(simdiMillis);
            bugun.set(java.util.Calendar.HOUR_OF_DAY, 0);
            bugun.set(java.util.Calendar.MINUTE, 0);
            bugun.set(java.util.Calendar.SECOND, 0);
            bugun.set(java.util.Calendar.MILLISECOND, 0);

            long farkMs = hedef.getTimeInMillis() - bugun.getTimeInMillis();
            return (int) Math.round(farkMs / 86400000.0);
        } catch (Exception e) {
            return null;
        }
    }
}
