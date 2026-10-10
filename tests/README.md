# GözKulak testleri

Uçtan uca testler (Playwright, Chromium). Eklenti paketine girmez (`.gitattributes`: `/tests export-ignore`).

## Kurulum (ilk kez)

```
cd tests
npm install
npx playwright install chromium
```

Playwright yeni bir dağıtım sürümünü tanımıyorsa (ör. Ubuntu 26.04) tarayıcı şöyle indirilir: `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 npx playwright install chromium`.

`npm install`, testlerin kullandığı gerçek ONNX Runtime'ı (`onnxruntime-web@1.30.0`) ve axe-core'u da indirir.

## Çalıştırma

```
npm test            # temel testler (yaklaşık 6 dk)
npm run test:all    # ek olarak başarım ve ekran görüntüsü testleri
node e2e/ema.mjs    # tek bir test (sunucu açık olmalı: npm run serve)
```

Öne çıkan testler:

- `speechtext.mjs`: birim testleri. Metin hazırlamanın Türkçe ve İngilizce kuralları, sıra sayısı ekleri ve cümle bölme tam eşitlikle denetlenir; hazır ses dosya adlarının ön eki ve yöntemi korunur. Tarayıcı gerekmez.
- `axe.mjs`: GözKulak arayüzünün axe-core ile WCAG 2.2 A/AA ve en iyi uygulama taraması (menü kapalı/açık, onay kutusu, okuma sürerken, mini oynatıcı, maske, cetvel, koyu mod, kontrast, büyük yazı, İngilizce sayfa, telefon). İhlal varsa başarısız olur.
- `ema-csp.mjs`: güvenlik başlığı (CSP) ve Trusted Types altında doğal ses, hazır ses ve geri dönüşler.
- `ema-limit.mjs`: beklenenden büyük motor dosyasının kesilmesi.
- `npm run lighthouse`: başarım karşılaştırması (aynı sayfa eklentili / eklentisiz, mobil ve masaüstü, Lighthouse). Test sunucusu metinleri gerçek sunucular gibi gzip ile gönderir. Gözlenen (0.3.4): başarım 100 / 100, FCP aynı, TBT 0, CLS 0, aktarım +48 KB; benzetimde LCP mobilde +0,45 sn (gerçek yavaşlatmada fark yok).

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
- `b`: `main` (kendi sunucu), `bad` (bozuk dosya: yedeğe geçer), `big` / `bigc` (beklenenden büyük dosya, `Content-Length` ile / parça parça), `alt`, `broken` (hiçbir dosya yok), `none`
- `fb=0`: yedek kaynaklar kapalı
- `mix=1`: sayfaya `lang="en"` bir paragraf eklenir
- `csp`: sayfa ve Worker şu güvenlik başlığıyla sunulur: `onerilen`, `katı` (WebAssembly ve blob: yok), `medyasız` (`media-src` blob: yok), `tt` (Trusted Types zorunlu), `ttdar` (Trusted Types, `gozkulak` politikasına izin yok)
- `files`: virgülle ayrılmış birim özetleri; sayfaya hazır ses listesi olarak eklenir. `/gk-hazir/xx/<özet>.ogg` her özet için `fixtures/hazir/ton.ogg` deneme sesini verir

## PHP ve WordPress (sisteme PHP kurmadan)

PHP, WebAssembly ile çalışır (`@php-wasm/cli`, `@wp-playground/cli`); `npx` ilk seferde indirir.

```
npm run phpcs       # WordPress kodlama standardı; çıktı boşsa sorun yok (ilk seferde WPCS tests/.phpcs/ altına kurulur)
npm run phpstan     # PHPStan en sıkı düzeyde (WordPress uzantısıyla); "No errors" görünmeli (ilk seferde tests/.phpstan/ altına kurulur)
npm run plugin-check  # WordPress Plugin Check: paket (git archive) ayrı bir Playground'da (port 9401) denetlenir.
                      # Yalnızca readme'nin İngilizce olmadığına dair iki hata beklenir: eklenti WordPress.org'da değil
npm run wp          # WordPress Playground: http://127.0.0.1:9400, PHP 7.4, eklenti etkin (wp/blueprint.json)
node e2e/wp-audio.mjs   # hazır ses REST uçları (npm run wp açıkken)
node e2e/wp-prepare.mjs # hazır ses hazırlama, gerçek modelle (~40 MB iner: GK_TTS=https://ses-sunucunuz/ ya da yedek kaynaklar)
node e2e/wp-play.mjs    # ziyaretçide hazır sesin çalınması: tamamı hazır sayfa, karışık sayfa (gerçek modelle)
node e2e/wp-update.mjs  # imzalı GitHub güncellemesi: kendi Playground'unu (9403) ve GitHub benzeri sunucusunu (9402) açar.
                        # Değiştirilmiş/imzasız/başka anahtarla/fazla dosyalı/geri sürümlü paketler kurulmaz, geçerli olan kurulur
```

Site Türkçe kurulur (`<html lang="tr-TR">`); İngilizce sayfada Türkçe birim çıkmaz. Playground'da yönetici `admin` / `password`, abone `abone` / `abone-Parola-123`, yayımlanmış sayfa `?page_id=500`, taslak `501`. Site her açılışta sıfırdan kurulur. `--workers=1` gerekir: birden çok işçide bir istekte silinen klasör öteki işçide görünmeye devam ediyor.

## Eski WordPress testleri

`admin-base.mjs`, `admin-tts.mjs`, `ema2.mjs`, `tara-wp.mjs`, `wp12.mjs`, `wp12m.mjs` yerel bir WordPress ister: `http://localhost:8080`, yönetici `admin` / `admin`, eklenti `wp-content/plugins/gozkulak` olarak bağlı, deneme yazısı `?p=6`. `npm test` bunları çalıştırmaz.

Bu testleri çalıştırmadan önce `serve.mjs`'i kapatın; ikisi de 8080 portunu kullanır.
