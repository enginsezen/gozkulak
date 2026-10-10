=== GözKulak ===
Contributors: enginsezen
Tags: accessibility, erişilebilirlik, text-to-speech, sesli okuma
Requires at least: 6.4
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.2.4
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Erişilebilirlik menüsü ve Türkçe sesli okuma. Ses ziyaretçinin tarayıcısında üretilir.

== Description ==

GözKulak, temadan bağımsız bir erişilebilirlik menüsü ekler. Menü Shadow DOM içinde çizilir; tema stilleri menüyü etkilemez.

* Ziyaretçiden veri toplanmaz; tercihler yalnızca ziyaretçinin tarayıcısında saklanır.
* Ziyaretçiye açık AJAX veya REST ucu yoktur.
* Eklenti silinince kendi ayarlarını kaldırır.

Ayarlar: Ayarlar → GözKulak.

== Changelog ==

= 0.2.4 =
* Koyu mod ve yüksek kontrast, sayfa açıldıktan sonra yüklenen stil dosyalarında (ertelenmiş CSS kullanan hız eklentileri) sayfayı yeniden okur. Geç gelen beyaz zeminler artık koyulaşıyor.
* Sürüm denetimi: sayfa eski (önbellekteki) bir betik dosyası kullanıyorsa test modunda menüde ve konsolda uyarı çıkar.

= 0.2.3 =
* Koyu mod yeniden yazıldı: ters çevirme filtresi yerine renkler öğe öğe dönüştürülür. Fotoğraflar, slaytlar ve logolar özgün renklerinde kalır; sitenin kendi efektleri (ör. griden renkliye geçen logolar) çalışır; fotoğraflı bölümlerdeki kutular da koyulaşır; düğme ve bağlantıların üzerine gelme renkleri uyarlanır.
* Yüksek kontrast: yarı saydam katmanlar ve renk geçişleri özgün saydamlıklarıyla siyaha döner (görseller gereğinden fazla kararmaz).
* Yüksek kontrast: bağlantılar yeniden sarı.
* Geçiş efekti olan öğeler (Elementor bölümleri gibi) ve sonradan yüklenen satır içi zemin görselleri (Slider Revolution gibi) doğru işlenir.

= 0.2.2 =
* Yüksek kontrast: renk geçişli zeminler (ör. Listeo ilan başlığı) siyaha döner; açık renkli ::before / ::after görsel katmanları (Listeo manşeti, Elementor kapsayıcıları) yarı saydam siyaha çevrilir; fotoğraf zeminleri korunur.
* Yüksek kontrast: SVG simgeler (Elementor, Blocksy) beyaz görünür, arkalarında siyah kutu oluşmaz.
* Satır aralığı: başlıklarda daha ölçülü değer (1,45 / 1,7).

= 0.2.1 =
* Satır ve harf aralığı yalnızca metin bloklarına uygulanır; site başlığı ve menü hariç (simgeler ve logo kaymaz).
* Yazı büyütülünce piksel cinsinden satır yükseklikleri de büyür (satırlar üst üste binmez); başlıktaki dikey ortalama yükseklikleri korunur.
* Yüksek kontrast: saydam ve yarı saydam katmanlar korunur; manşet görselleri ve Slider Revolution slaytları kaybolmaz. Sayfa zemin desenleri kaldırılır.
* Koyu mod: CSS ile verilen arka plan görselleri (Elementor vb.) ve Slider Revolution modülleri negatif görünmez; iç içe görseller iki kez çevrilmez.
* Görselleri gizle: Slider Revolution ve canvas görselleri de gizlenir.

= 0.2.0 =
* Faz 1.2: menü özellikleri. Yazı boyutu, satır ve harf aralığı, yüksek kontrast, koyu mod, gri tonlama, okunaklı yazı, bağlantı vurgusu, büyük imleç, okuma maskesi ve cetveli, animasyon durdurma, görsel gizleme.
* Tercihler ziyaretçinin tarayıcısında saklanır; tek tuşla sıfırlama; Alt + Shift + G kısayolu.

= 0.1.1 =
* Test modu: "Yalnızca yöneticiler" görünürlüğü (varsayılan). Ziyaretçilere hiçbir dosya yüklenmez.

= 0.1.0 =
* Faz 1.1: eklenti iskeleti, ayar sayfası ve menü düğmesi.
