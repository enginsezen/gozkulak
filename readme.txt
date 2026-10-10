=== GözKulak ===
Contributors: enginsezen
Tags: accessibility, erişilebilirlik, text-to-speech, sesli okuma
Requires at least: 6.4
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.2.10
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Erişilebilirlik menüsü ve Türkçe sesli okuma. Ses ziyaretçinin tarayıcısında üretilir.

== Description ==

GözKulak, temadan bağımsız bir erişilebilirlik menüsü ekler. Menü Shadow DOM içinde çizilir; tema stilleri menüyü etkilemez.

* Ziyaretçiden veri toplanmaz; tercihler yalnızca ziyaretçinin tarayıcısında saklanır.
* Ziyaretçiye açık AJAX veya REST ucu yoktur.
* Eklenti silinince kendi ayarlarını kaldırır.

Ayarlar: Ayarlar → GözKulak.

== Harici hizmetler ==

Türkçe doğal ses (EMA Lightning) için gereken model ve ONNX Runtime dosyaları eklenti paketinde yer almaz. Yalnızca ziyaretçi doğal sesle dinlemeyi onayladığında, ziyaretçinin tarayıcısı bu dosyaları indirir:

* Ayarlarda "Ses dosyalarının adresi" yazılıysa önce o sunucudan.
* Yoksa ya da dosya oradan alınamazsa Hugging Face (huggingface.co, model dosyaları, commit'e sabitli) ve jsDelivr'den (cdn.jsdelivr.net, onnxruntime-web 1.30.0). Kendi sunucu adresi yazılıysa bu yedek kaynaklar "Yedek kaynaklar" ayarıyla kapatılabilir; o zaman ziyaretçinin tarayıcısı üçüncü taraflara hiç bağlanmaz.

Bu isteklerde yalnızca standart HTTP bilgileri (IP adresi, tarayıcı bilgisi) iletilir; sayfa adresi (Referer) ve çerez gönderilmez. Okunan metin ve ziyaretçi tercihleri hiçbir sunucuya gönderilmez. Her dosya SHA-256 ile doğrulanır. Hugging Face: https://huggingface.co/privacy — jsDelivr: https://www.jsdelivr.com/terms/privacy-policy-jsdelivr-net

Üçüncü taraf bileşenler ve lisansları: THIRD-PARTY-NOTICES.txt

== Changelog ==

= 0.2.10 =
* Sayfa okunurken içindekiler tabloları atlanır (LuckyWP, Easy Table of Contents, Table of Contents Plus, Rank Math, Yoast, Elementor ve benzerleri); başlıklar sayfada zaten okunuyor. Seçilen metin içindekiler tablosundaysa yine okunur.

= 0.2.9 =
* Doğal ses: tek kelimelik ya da çok kısa cümleler ("Salı", "7", tek kelimelik başlıklar) bir sonraki cümleyle birlikte üretilir; model bunları tek başına zayıf ve tuhaf seslendiriyordu. Vurgu yine cümle cümle geçer.
* Doğal ses: telefonda kesik kesik çalmaya karşı okumanın başında (ve ses biterse) kısa bir tampon biriktirilir; motor yüklenince bir ısınma çalıştırması yapılır.
* Sağa yaslanan ya da yan yana dizilen satır parçaları (Listeo çalışma saatleri, içindekiler tablosu numaraları) satırla birlikte okunur: "Salı 09:00 ile 17:30" tek cümle.
* Okumaya hazırlık: harf ve rakam bitişik yazılmış sözcükler ("Karabük78" → "Karabük 78"), alan adı gibi yazılmış adlar ("Sezen.Pro" → "Sezen nokta pro"), noktadan sonra boşluk unutulmuş yazımlar ve satır başındaki sıra numaraları ("1, Safranbolu'nun…") artık harf harf okunmuyor.

= 0.2.8 =
* Faz 2.2: Türkçe doğal ses (EMA Lightning, yapay zekâ). Ses ziyaretçinin cihazında, eklentinin kendi dosyasından açılan bir Web Worker'da üretilir; sayfa donmaz.
* Model ve ONNX Runtime dosyaları sürüme sabitlidir ve her biri SHA-256 ile doğrulanır; doğrulanan dosyalar tarayıcının önbelleğinde saklanır. Dosya önbellekte değilse ilk kullanımda indirme onayı istenir (yaklaşık 40 MB, bir kez).
* Yeni ayarlar: "Ses dosyalarının adresi" (kendi sunucunuz) ve "Yedek kaynaklar". Adres boşsa Hugging Face ve jsDelivr kullanılır; her dosya için kaynaklar sırayla denenir, 30 saniye veri gelmeyen indirme bir sonraki kaynağa geçer.
* İndirme yalnızca onaydan sonra yapılır; önbellekte eksik dosya varsa (ör. WebGPU'dan WASM'a geçişte) yeniden sorulur. Sayfanın güvenlik başlığı (CSP) motoru engelliyorsa bu, indirmeden önce anlaşılır.
* Cümleler aralıksız okunur: motor çalan sesin önünden gider, ilk parça kısa pencerelerle çabuk başlar. Duraklatınca okuma cümlenin ortasından sürer. Vurgu, cümlenin sesi başladığı anda geçer.
* Doğal ses yüklenemezse, takılırsa ya da cihazda gerçek zamana yetişmezse okuma bulunduğu cümleden tarayıcının sesiyle sürer (yavaş cihazda bu tercih hatırlanır; duraklatılmış okuma duraklatılmış kalır). Yavaşlık, tamamlanan cümlelerin üretim hızından ve sayfa görünürken yaşanan beklemelerden ölçülür. WebGPU yalnızca masaüstü Chromium tarayıcılarda denenir; sorun çıkarsa WASM'a geçilir.
* Türkçe sayfadaki başka dilde işaretli bölümler (lang="en" gibi) tarayıcının o dildeki sesiyle okunur.
* Panelde "Doğal ses (yapay zekâ)" seçeneği, indirme çubuğu ve "Bu ses yapay zekâ ile üretilmiştir" notu.

= 0.2.7 =
* Faz 2.1: sesli okuma (önce tarayıcının kendi sesiyle). Sayfayı, seçili metni ya da tıklanan yeri okur; okunan cümle sayfada vurgulanır, gerekirse sayfa kaydırılır.
* Duraklat, devam, önceki/sonraki cümle, durdur ve dört okuma hızı; panel kapalıyken düğmenin üstünde küçük bir oynatıcı.
* Okunacak alan "Okunacak alan" ayarındaki seçicilerden, yoksa sayfanın ana bölgesinden alınır; yalnızca görünen metin okunur, tekrarlanan bloklar bir kez okunur.
* Metin okumaya hazırlanır: saat aralıkları, telefonlar, adres kısaltmaları, sıra sayıları, büyük harfli başlıklar, kısaltma ekleri, tarih, para birimi, e-posta ve web adresleri.
* Ayarlar sayfasında "Sesli okuma" özelliği açılıp kapatılabilir.

= 0.2.6 =
* Telefon: panel ekranın genişliğini kullanır ve görünen ekran yüksekliğine göre sınırlanır; başlık ve kapat düğmesi her zaman görünür (düğmenin kenar uzaklığı hesaba katılır).
* Dokunmatik ekranda okuma maskesi ve cetveli ekranda sabit kalır, içerik altından kaydırılır; yeri sağ kenardaki tutamaçla sürüklenerek değiştirilir. Sayfaya dokunmak katmanı oynatmaz.
* Klavyeyle gezerken katman odaklanan öğeyi izler; dokunarak odaklanan bağlantılar katmanı oynatmaz.

= 0.2.5 =
* Klavye: menü düğmesi sayfanın ilk sekme durağı; odak menüden çıkınca panel kapanır.
* İki tonlu odak çerçevesi (sarı iç halka, koyu dış çizgi) her zeminde görünür.
* Ekran okuyucu: aç/kapa kutularında "Açık/Kapalı" yazısı tekrar okunmaz (durum aria-pressed ile bildirilir); yazı boyutu değeri okunur.

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
