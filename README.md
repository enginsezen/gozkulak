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
| 1 | Menü (sesli okuma olmadan) | Sürüyor |
| 2 | Sesli okuma | — |
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

## Geliştirme

- Kodlama standardı: [WordPress Coding Standards](https://github.com/WordPress/WordPress-Coding-Standards), ayarlar `phpcs.xml.dist` içinde. `phpcs` komutu depo kökünde çalıştırılır.
- Güvenlik kuralları: ayar sayfasında yetki (`manage_options`) ve nonce denetimi; her girdi temizlenir, her çıktı escape edilir; ön yüzde `innerHTML` kullanılmaz; ayarlar sayfaya çalıştırılmayan bir JSON bloğu olarak aktarılır.
- `tools/faz0/`: Faz 0 ölçüm sayfası ve okunacak alanı bulan tarayıcı konsolu betiği.

## Lisans

GPL-2.0-or-later. Ayrıntılar `LICENSE` dosyasında.
