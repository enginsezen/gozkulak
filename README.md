# GözKulak

WordPress için erişilebilirlik menüsü ve Türkçe sesli okuma eklentisi. Adı "göz kulak olmak" deyiminden gelir: göz görsel ayarları, kulak sesli okumayı karşılar.

- **Temadan bağımsız:** menü Shadow DOM içinde çizilir; tema stilleri menüyü, menünün stilleri temayı etkilemez.
- **Ses tarayıcıda üretilir:** Türkçe ses [EMA Lightning](https://huggingface.co/canberkkkkkk/ema-lightning) modeliyle tarayıcıda üretilir. Hazırlanmış sayfalarda yöneticinin tarayıcısında bir kez üretilip sitede ses dosyası olarak saklanır; diğer sayfalarda ziyaretçinin cihazında üretilir. Sunucuya paket kurulmaz; okunan metin hiçbir ses servisine gönderilmez.
- **Ziyaretçiden veri toplanmaz:** tercihler yalnızca ziyaretçinin tarayıcısında saklanır; ziyaretçiye açık AJAX ya da REST ucu yoktur.
- **İmzalı güncelleme:** yeni sürümler GitHub'dan gelir ve kurulmadan önce Ed25519 imzasıyla doğrulanır.

## Menü

Menü metinleri sayfanın diline göre Türkçe ya da İngilizcedir. Yönetici, hangi özelliklerin sunulacağını seçer.

- **Görme:** yazı boyutu, satır aralığı, harf aralığı, yüksek kontrast, koyu mod, gri tonlama, okunaklı yazı tipi ([Atkinson Hyperlegible Next](https://github.com/googlefonts/atkinson-hyperlegible-next), eklentiyle gelir), bağlantıları vurgulama, büyük imleç.
- **Okuma ve dikkat:** okuma maskesi, okuma cetveli, animasyonları durdurma, görselleri gizleme.
- **Sesli okuma:** sayfayı, seçili metni ya da tıklanan yerden itibaren okur; okunan cümle sayfada vurgulanır. Okuma hızı ayarlanır, cümleler arasında ileri ve geri gidilir; menü kapatılınca okuma, ekranda kalan küçük bir oynatıcıdan yönetilir.

Koyu mod ve yüksek kontrast renkleri filtreyle değil, öğe öğe dönüştürür; görseller ve videolar olduğu gibi kalır.

## Durum

Beş faz tamamlandı (2026-10-11); eklenti üç sitede ziyaretçilere açık, güncellemeler GitHub'dan imzalı olarak gelir. Yol haritası:

| Faz | İçerik | Durum |
| --- | --- | --- |
| 0 | Ses motorlarının cihazlarda ölçümü | Tamamlandı |
| 1 | Menü (sesli okuma olmadan) | Tamamlandı |
| 2 | Sesli okuma | Tamamlandı |
| 3 | Güvenlik sertleştirme ve testler | Tamamlandı |
| 4 | Sitelere açma ve GitHub'dan güncelleme | Tamamlandı |

"Kimler görsün: Yalnızca yöneticiler" seçiliyken eklenti **test modunda** çalışır: menüyü yalnızca yöneticiler görür, ziyaretçilere hiçbir dosya yüklenmez.

## Kurulum

1. Son sürümün kurulum zip'ini indirin: [Releases → gozkulak.zip](https://github.com/enginsezen/gozkulak/releases/latest/download/gozkulak.zip). Her sürümde yanında zip'in SHA-256 özeti (`gozkulak.zip.sha256`) de vardır.
2. WordPress panelinde Eklentiler → Yeni Eklenti Ekle → Eklenti Yükle.
3. Ayarlar → GözKulak. Eklenti önce test modunda açılır; denedikten sonra "Kimler görsün: Herkes" seçilir.

Kurulum zip'i, sürüm etiketi gönderilince GitHub Actions tarafından oluşturulur (`.github/workflows/surum.yml`): `git archive --prefix=gozkulak/ -o gozkulak.zip vX.Y.Z`. Aynı komutla kendiniz de oluşturabilirsiniz. Zip'in içindeki klasörün adı `gozkulak` olmalıdır; GitHub'ın "Download ZIP" ve "Source code" arşivleri klasörü `gozkulak-main` ya da `gozkulak-X.Y.Z` adıyla verir, bunlarla kurulursa ilk panel güncellemesinde eklentinin klasörü değişir.

Gereksinimler: WordPress 6.4+, PHP 7.4+.

### Güncellemeler

0.4.0'dan sonra yeni sürümler WordPress panelindeki Güncellemeler listesinde görünür (GitHub etiketleri, `vX.Y.Z`). WordPress güncellemeleri kendi denetimlerinde (en geç 12 saatte bir) görür; Güncellemeler → "Tekrar denetle" ya da Ayarlar → GözKulak → "Şimdi denetle" hemen denetler. Paket GitHub'ın etiket arşividir. Kurulmadan önce eklenti paketteki `gozkulak.sig` dosyasını doğrular: dosya listesinin Ed25519 imzası eklentiye gömülü açık anahtarla tutmalı, her dosya listeyle birebir aynı olmalı ve sürüm kurulu olandan yeni olmalı. Doğrulama tutmazsa güncelleme kurulmaz, eski sürüm yerinde ve etkin kalır. Gizli anahtar repoda değil, sürümü çıkaranın bilgisayarındadır; GitHub hesabı ele geçirilse bile sitelere imzasız kod kurulamaz. Eski bir imzalı sürüm yeni bir etiketle sunulsa da kurulmaz.

Ayarlar → GözKulak → Güncelleme satırı kurulu sürümü, GitHub'daki en yeni sürümü ve son denetimin sonucunu gösterir.

## Ayarlar

- Kimler görsün: yalnızca yöneticiler (test modu) ya da herkes
- Konum, kenardan uzaklık, düğme boyutu, simge, renk
- Menüde sunulacak özellikler (yukarıdaki liste)
- Okunacak alan: virgülle ayrılmış CSS seçicileri; eşleşme yoksa ana içerik otomatik bulunur
- Ses dosyalarının adresi: model ve ONNX Runtime dosyalarını barındıran kendi sunucunuz (isteğe bağlı; `tools/vps/tts-dosyalari.sh` ile hazırlanır). Dosyalar bu adresin altında `ema-lightning-onnx/13c431d/` ve `onnxruntime-web/1.30.0/` klasörlerinde aranır; boşsa ya da dosya alınamazsa sürüme sabitli Hugging Face ve jsDelivr adresleri kullanılır (adres yazılıysa "Yedek kaynaklar" ile kapatılabilir). Her dosya tarayıcıda SHA-256 ile doğrulanır.
- Okunuş sözlüğü: sitenize özel kelimelerin okunuşu, her satırda `kelime = okunuş` (ör. `Wireless = vayırlıs`; kısaltmalarda sonda nokta olabilir: `Doç. = doçent`). Büyük-küçük harf fark etmez, bütün kelime eşleşir. Büyük harfli bir kısaltma kendisiyle eşleştirilirse (`ABC = ABC`) harf harf okunur; bu İngilizce sayfalarda da geçerlidir, diğer okunuşlar yalnızca Türkçe sayfalarda.
- Hazır ses: seçilen sayfaların sesi yönetici panelinde bir kez üretilip sitede saklanır (aşağıda).

## Sesli okuma nasıl çalışır

- Okunan metin sayfada değişmez; yalnızca okunacak kopyası hazırlanır: saat, tarih, telefon, adres kısaltmaları (Mah., Cad., Şti.…), sıra sayıları, yüzde ve para okunur biçime çevrilir. Sayaçlar (0'dan sayan rakamlar) son değerleriyle okunur. Siteye özel okunuşlar sözlükten gelir; koda siteye özel kural yazılmaz.
- Türkçe sayfalar, ziyaretçi kapatmadıysa doğal sesle (EMA Lightning) okunur. Motor, eklentinin kendi klasöründeki `assets/js/gozkulak-tts-worker.js` dosyasından açılan bir Web Worker'da çalışır.
- Dosyalar önbellekte değilse ilk kullanımda indirme onayı istenir (yaklaşık 40 MB, bir kez). Doğrulanan dosyalar tarayıcının önbelleğinde (Cache Storage) saklanır.
- WebGPU yalnızca masaüstündeki Chromium tabanlı tarayıcılarda denenir; telefon ve tabletlerde, Safari ve Firefox'ta WASM kullanılır.
- Doğal ses yüklenemezse ya da cihazda gerçek zamana yetişmezse okuma tarayıcının kendi sesiyle sürer. İngilizce sayfalar tarayıcının sesiyle okunur.
- **Hazır ses:** Ayarlar → GözKulak → Hazır ses bölümünde seçilen sayfaların sesi, yöneticinin tarayıcısında cümle cümle bir kez üretilir ve `wp-content/uploads/gozkulak/` altına Ogg Opus dosyaları olarak yüklenir. Tamamı hazır bir sayfada ziyaretçi modeli indirmez ve onay sorulmaz; eksik cümleler ziyaretçinin tarayıcısında üretilir. Sayfa geniş masaüstü, dizüstü, tablet ve telefon genişliklerinde taranır; açılıp kapanan bölümler (akordeon, sık sorulan sorular, sekmeler, `<details>`) açılmış hâlleriyle de hazırlanır. Hazırla yalnızca eksik cümleleri üretir; "Kullanılmayan dosyaları sil" artık kullanılmayanları kaldırır. Şifreli ve herkese açık olmayan sayfalar hazırlanmaz.
- Kapalı bölümlerin içeriği, ekran okuyucularda olduğu gibi okunmaz; ziyaretçi bölümü açınca okunur.
- Üçüncü taraf bileşenler ve lisansları: `THIRD-PARTY-NOTICES.txt`.

## Dış bağlantılar

- **Ziyaretçinin tarayıcısı:** yalnızca doğal sesle dinlemeyi onaylayınca model ve ONNX Runtime dosyalarını indirir. Önce ayarlardaki ses sunucusundan; yoksa ya da dosya alınamazsa (yedek kaynaklar açıksa) Hugging Face ve jsDelivr'den. Sayfa adresi (Referer) ve çerez gönderilmez; okunan metin ve tercihler hiçbir yere gönderilmez. Hazır ses dosyaları sitenin kendisinden gelir.
- **Sitenin sunucusu:** güncelleme denetiminde GitHub'a (api.github.com) en yeni sürümü sorar, güncelleme kurulurken paketi github.com'dan indirir. İsteklerin kimliği `GozKulak/<sürüm>`dür; sitenin adresi gönderilmez.
- Okunaklı yazı tipi eklentinin kendi klasöründen gelir; Google Fonts kullanılmaz.

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
| `font-src` | `'self'` | Okunaklı yazı tipi (eklentinin kendi klasöründen). |

Örnek (yedek kaynaklar kapalı):

```
script-src 'self' 'wasm-unsafe-eval' blob:; worker-src 'self'; connect-src 'self' https://tts.example.com; media-src 'self' blob:; style-src 'self'; font-src 'self'
```

- Başlık genellikle Worker dosyasına da gönderilir (nginx `add_header` bütün yanıtlara ekler); bu durumda `script-src` ve `connect-src` izinleri Worker için de geçerlidir.
- **Trusted Types:** `require-trusted-types-for 'script'` varsa Worker adresi `gozkulak` adlı politikadan geçer. `trusted-types` yönergesi politika adlarını sınırlıyorsa listeye `gozkulak` eklenmelidir.
- **Yönetici paneli (hazır ses):** Hazırlama, sitenin sayfalarını aynı siteden bir çerçevede açar. Site sayfaları `X-Frame-Options: DENY` ya da `frame-ancestors 'none'` göndermemelidir (`SAMEORIGIN` / `'self'` uygundur).
- İzin eksikse menü yine çalışır: doğal ses kurulamazsa tarayıcının sesi, hazır ses çalınamazsa doğal ses okur. Test modunda nedeni panelde "(Tanı: …)" notunda görünür.
- Bu durumlar `tests/e2e/ema-csp.mjs` ile sınanır.

## Geliştirme

- Kodlama standardı: [WordPress Coding Standards](https://github.com/WordPress/WordPress-Coding-Standards), ayarlar `phpcs.xml.dist` içinde. Statik analiz: PHPStan en sıkı düzeyde ve WordPress Plugin Check. Komutlar ve uçtan uca testler `tests/README.md` içinde (PHP kurmadan, WebAssembly ile çalışır).
- Güvenlik kuralları: ayar sayfasında yetki (`manage_options`) ve nonce denetimi; her girdi temizlenir, her çıktı escape edilir; ön yüzde `innerHTML` kullanılmaz; ayarlar sayfaya çalıştırılmayan bir JSON bloğu olarak aktarılır.
- `tools/surum/`: sürüm imzalama (`imzala.mjs`, gizli anahtar repo dışında) ve GitHub arşivini eklentinin yaptığı gibi doğrulama (`dogrula.mjs`).
- `tools/faz0/`: Faz 0 ölçüm sayfası ve okunacak alanı bulan tarayıcı konsolu betiği.
- `tools/tarama/`: sitelerin erişilebilirlik taraması için tarayıcı konsolu betiği.
- `tools/hazir-ses/`, `tools/tani/`: hazır ses dinleme denemesi ve tanı betikleri.
- `tools/vps/tts-dosyalari.sh`: doğal ses dosyalarını kendi sunucunuza indirip SHA-256 ile doğrulayan betik (yalnızca curl, sha256sum, gzip; paket kurmaz). Sitenin kök klasöründe çalıştırılır; `.wasm`/`.mjs` için nginx `gzip_static` kopyaları da hazırlar.

## Lisans

GPL-2.0-or-later. Ayrıntılar `LICENSE` dosyasında.
