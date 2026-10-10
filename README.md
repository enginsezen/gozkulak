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
| 2 | Sesli okuma | Sürüyor |
| 3 | Güvenlik sertleştirme ve testler | — |
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

## Sesli okuma nasıl çalışır

- Türkçe sayfalar, ziyaretçi kapatmadıysa doğal sesle (EMA Lightning) okunur. Motor, eklentinin kendi klasöründeki `assets/js/gozkulak-tts-worker.js` dosyasından açılan bir Web Worker'da çalışır.
- Dosyalar önbellekte değilse ilk kullanımda indirme onayı istenir (yaklaşık 40 MB, bir kez). Doğrulanan dosyalar tarayıcının önbelleğinde (Cache Storage) saklanır.
- WebGPU yalnızca masaüstündeki Chromium tabanlı tarayıcılarda denenir; telefon ve tabletlerde, Safari ve Firefox'ta WASM kullanılır.
- Doğal ses yüklenemezse ya da cihazda gerçek zamana yetişmezse okuma tarayıcının kendi sesiyle sürer. İngilizce sayfalar tarayıcının sesiyle okunur.
- Üçüncü taraf bileşenler ve lisansları: `THIRD-PARTY-NOTICES.txt`.

## Geliştirme

- Kodlama standardı: [WordPress Coding Standards](https://github.com/WordPress/WordPress-Coding-Standards), ayarlar `phpcs.xml.dist` içinde. `phpcs` komutu depo kökünde çalıştırılır.
- Güvenlik kuralları: ayar sayfasında yetki (`manage_options`) ve nonce denetimi; her girdi temizlenir, her çıktı escape edilir; ön yüzde `innerHTML` kullanılmaz; ayarlar sayfaya çalıştırılmayan bir JSON bloğu olarak aktarılır.
- `tools/faz0/`: Faz 0 ölçüm sayfası ve okunacak alanı bulan tarayıcı konsolu betiği.
- `tools/tarama/`: sitelerin erişilebilirlik taraması için tarayıcı konsolu betiği.

## Lisans

GPL-2.0-or-later. Ayrıntılar `LICENSE` dosyasında.
