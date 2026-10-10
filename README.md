# GözKulak

WordPress için erişilebilirlik menüsü ve Türkçe sesli okuma eklentisi. Adı "göz kulak olmak" deyiminden gelir: göz görsel ayarları, kulak sesli okumayı karşılar.

- **Temadan bağımsız:** menü Shadow DOM içinde çizilir; tema stilleri menüyü, menünün stilleri temayı etkilemez.
- **Ses tarayıcıda üretilir:** Türkçe sesli okuma [EMA Lightning](https://huggingface.co/canberkkkkkk/ema-lightning) modeliyle ziyaretçinin cihazında çalışır. Sunucuya paket kurulmaz, metin cihazdan çıkmaz.
- **Ziyaretçiden veri toplanmaz:** tercihler yalnızca ziyaretçinin tarayıcısında saklanır; ziyaretçiye açık AJAX ya da REST ucu yoktur.

## Durum

Geliştirme sürüyor. Yol haritası:

| Faz | İçerik | Durum |
| --- | --- | --- |
| 0 | Ses motorlarının cihazlarda ölçümü | Tamamlandı |
| 1 | Menü (sesli okuma olmadan) | Tamamlandı |
| 2 | Sesli okuma | Tamamlandı |
| 3 | Güvenlik sertleştirme ve testler | Sürüyor |
| 4 | Sitelere açma ve GitHub'dan güncelleme | — |

Faz 4'e kadar eklenti canlı sitelerde **test modunda** çalışır: menüyü yalnızca yöneticiler görür, ziyaretçilere hiçbir dosya yüklenmez.

## Kurulum

1. Depoyu zip olarak indirin ya da `git archive --prefix=gozkulak/ -o gozkulak.zip HEAD` ile paketleyin (geliştirme dosyaları pakete girmez).
2. WordPress panelinde Eklentiler → Yeni Eklenti Ekle → Eklenti Yükle.
3. Ayarlar → GözKulak.

Gereksinimler: WordPress 6.4+, PHP 7.4+.

## Ayarlar

- Kimler görsün: yalnızca yöneticiler (test modu) ya da herkes
- Konum, kenardan uzaklık, düğme boyutu, simge, renk
- Menüde sunulacak özellikler (görme; okuma ve dikkat)
- Okunacak alan: virgülle ayrılmış CSS seçicileri; eşleşme yoksa ana içerik otomatik bulunur
- Ses dosyalarının adresi: model ve ONNX Runtime dosyalarını barındıran kendi sunucunuz (isteğe bağlı). Dosyalar bu adresin altında `ema-lightning-onnx/13c431d/` ve `onnxruntime-web/1.30.0/` klasörlerinde aranır; boşsa ya da dosya alınamazsa sürüme sabitli Hugging Face ve jsDelivr adresleri kullanılır (adres yazılıysa "Yedek kaynaklar" ile kapatılabilir). Her dosya tarayıcıda SHA-256 ile doğrulanır.
- Hazır ses: seçilen sayfaların sesi yönetici panelinde bir kez üretilip sitede saklanır (aşağıda).

## Sesli okuma nasıl çalışır

- Türkçe sayfalar, ziyaretçi kapatmadıysa doğal sesle (EMA Lightning) okunur. Motor, eklentinin kendi klasöründeki `assets/js/gozkulak-tts-worker.js` dosyasından açılan bir Web Worker'da çalışır.
- Dosyalar önbellekte değilse ilk kullanımda indirme onayı istenir (yaklaşık 40 MB, bir kez). Doğrulanan dosyalar tarayıcının önbelleğinde (Cache Storage) saklanır.
- WebGPU yalnızca masaüstündeki Chromium tabanlı tarayıcılarda denenir; telefon ve tabletlerde, Safari ve Firefox'ta WASM kullanılır.
- Doğal ses yüklenemezse ya da cihazda gerçek zamana yetişmezse okuma tarayıcının kendi sesiyle sürer. İngilizce sayfalar tarayıcının sesiyle okunur.
- **Hazır ses:** Ayarlar → GözKulak → Hazır ses bölümünde seçilen sayfaların sesi, yöneticinin tarayıcısında cümle cümle bir kez üretilir ve `wp-content/uploads/gozkulak/` altına Ogg Opus dosyaları olarak yüklenir. Tamamı hazır bir sayfada ziyaretçi modeli indirmez ve onay sorulmaz; eksik cümleler ziyaretçinin tarayıcısında üretilir. Sayfa geniş masaüstü, dizüstü, tablet ve telefon genişliklerinde taranır. Şifreli ve herkese açık olmayan sayfalar hazırlanmaz.
- Üçüncü taraf bileşenler ve lisansları: `THIRD-PARTY-NOTICES.txt`.

## Güvenlik başlığı (CSP)

Sitede `Content-Security-Policy` başlığı varsa GözKulak'ın istediği izinler:

| Yönerge | İzin | Ne için |
| --- | --- | --- |
| `script-src` | `'self'` | Menü betiği. Ayarlar çalıştırılmayan bir JSON bloğuyla gelir; satır içi betik izni gerekmez. |
| `script-src` | `'wasm-unsafe-eval' blob:` | Doğal ses: WebAssembly ve doğrulanmış ONNX Runtime modülü (Worker içinde). |
| `worker-src` | `'self'` | Doğal ses motoru (eklentinin kendi klasöründen). |
| `connect-src` | ses sunucusunun adresi | Ör. `https://tts.example.com`. |
| `connect-src` | `https://huggingface.co https://*.huggingface.co https://*.hf.co https://cdn.jsdelivr.net` | Yalnızca "Yedek kaynaklar" açıksa ya da ses sunucusu adresi boşsa. |
| `connect-src` | `'self'` | Hazır ses dosyaları (yükleme klasörü başka bir alan adındaysa o da). |
| `media-src` | `'self' blob:` | Hazır ses. |
| `style-src` | `'self'` | `'unsafe-inline'` gerekmez: çalışma zamanı stilleri oluşturulabilir stil sayfasıyla eklenir. |

Örnek (yedek kaynaklar kapalı):

```
script-src 'self' 'wasm-unsafe-eval' blob:; worker-src 'self'; connect-src 'self' https://tts.example.com; media-src 'self' blob:; style-src 'self'
```

- Başlık genellikle Worker dosyasına da gönderilir (nginx `add_header` bütün yanıtlara ekler); bu durumda `script-src` ve `connect-src` izinleri Worker için de geçerlidir.
- **Trusted Types:** `require-trusted-types-for 'script'` varsa Worker adresi `gozkulak` adlı politikadan geçer. `trusted-types` yönergesi politika adlarını sınırlıyorsa listeye `gozkulak` eklenmelidir.
- **Yönetici paneli (hazır ses):** Hazırlama, sitenin sayfalarını aynı siteden bir çerçevede açar. Site sayfaları `X-Frame-Options: DENY` ya da `frame-ancestors 'none'` göndermemelidir (`SAMEORIGIN` / `'self'` uygundur).
- İzin eksikse menü yine çalışır: doğal ses kurulamazsa tarayıcının sesi, hazır ses çalınamazsa doğal ses okur. Test modunda nedeni panelde "(Tanı: …)" notunda görünür.
- Bu durumlar `tests/e2e/ema-csp.mjs` ile sınanır.

## Geliştirme

- Kodlama standardı: [WordPress Coding Standards](https://github.com/WordPress/WordPress-Coding-Standards), ayarlar `phpcs.xml.dist` içinde. Statik analiz: PHPStan en sıkı düzeyde ve WordPress Plugin Check. Komutlar ve uçtan uca testler `tests/README.md` içinde (PHP kurmadan, WebAssembly ile çalışır).
- Güvenlik kuralları: ayar sayfasında yetki (`manage_options`) ve nonce denetimi; her girdi temizlenir, her çıktı escape edilir; ön yüzde `innerHTML` kullanılmaz; ayarlar sayfaya çalıştırılmayan bir JSON bloğu olarak aktarılır.
- `tools/faz0/`: Faz 0 ölçüm sayfası ve okunacak alanı bulan tarayıcı konsolu betiği.
- `tools/tarama/`: sitelerin erişilebilirlik taraması için tarayıcı konsolu betiği.
- `tools/vps/tts-dosyalari.sh`: doğal ses dosyalarını kendi sunucunuza indirip SHA-256 ile doğrulayan betik (yalnızca curl, sha256sum, gzip; paket kurmaz). Sitenin kök klasöründe çalıştırılır; `.wasm`/`.mjs` için nginx `gzip_static` kopyaları da hazırlar.

## Lisans

GPL-2.0-or-later. Ayrıntılar `LICENSE` dosyasında.
