# GözKulak testleri

Uçtan uca testler (Playwright, Chromium). Eklenti paketine girmez (`.gitattributes`: `/tests export-ignore`).

## Kurulum (ilk kez)

```
cd tests
npm install
npx playwright install chromium
```

`npm install`, testlerin kullandığı gerçek ONNX Runtime'ı (`onnxruntime-web@1.30.0`) ve axe-core'u da indirir.

## Çalıştırma

```
npm test            # temel testler (yaklaşık 6 dk)
npm run test:all    # ek olarak başarım ve ekran görüntüsü testleri
node e2e/ema.mjs    # tek bir test (sunucu açık olmalı: npm run serve)
```

`run.mjs` test sunucusu kapalıysa kendisi açar. Sonuçta her test için ✓/✗ yazar. Test çıktısında `HATALAR: yok` ya da `HATA SAYISI: 0` yoksa test başarısız sayılır. Ekran görüntüleri `tests/shots/` klasörüne düşer.

## Test sunucusu (`serve.mjs`)

`http://127.0.0.1:8080` adresinde çalışır; PHP ya da WordPress gerektirmez.

| Adres | İçerik |
| --- | --- |
| `/wp-content/plugins/gozkulak/` | depo kökü (eklentinin kendisi) |
| `/gk-mock/` | koyu mod, kontrast, yazı boyutu için tema benzetimleri (Listeo, BeTheme, Elementor kalıpları) |
| `/gk-tara/` | klavye, telefon paneli ve erişilebilirlik tarama betiği sayfaları |
| `/gk-oku/` | sesli okuma: içerik çıkarma, cümleler, çalışma saatleri, içindekiler tablosu |
| `/gk-tts/page.php?w=…&b=…&fb=…&mix=1` | doğal ses deneme sayfası |

Doğal ses testleri gerçek ONNX Runtime ve gerçek Worker ile çalışır; yalnızca model dosyaları sahtedir (`fixtures/ema-fake`, yaklaşık 9 KB: 450 Hz ton üretir). Sahte modeller `fixtures/kaynak/make.py` (Python `onnx`) ve `norm.wat` (wabt) ile üretilir.

Sunucu, motor Worker'ını (`assets/js/gozkulak-tts-worker.js`) her istekte gerçek dosyadan üretir: model özetleri sahte modellerinkiyle, yedek kaynak `alt/` ile değiştirilir. Değişkenler:

- `w`: `worker-test.js` (normal), `worker-slow.js` (gerçek zamanın 1/3'ü), `worker-slow2.js`, `worker-lag.js` (2× hızlı ama uzun cümlenin başında 3,5 sn gecikme), `worker-hang.js` (ikinci işte takılır), `worker-csp.php` (katı CSP başlığı)
- `b`: `main` (kendi sunucu), `bad` (bozuk dosya: yedeğe geçer), `alt`, `broken` (hiçbir dosya yok), `none`
- `fb=0`: yedek kaynaklar kapalı
- `mix=1`: sayfaya `lang="en"` bir paragraf eklenir

## WordPress isteyen testler

`admin-base.mjs`, `admin-tts.mjs`, `ema2.mjs`, `tara-wp.mjs`, `wp12.mjs`, `wp12m.mjs` yerel bir WordPress ister: `http://localhost:8080`, yönetici `admin` / `admin`, eklenti `wp-content/plugins/gozkulak` olarak bağlı, deneme yazısı `?p=6`. `npm test` bunları çalıştırmaz.

Bu testleri çalıştırmadan önce `serve.mjs`'i kapatın; ikisi de 8080 portunu kullanır.
