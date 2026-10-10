=== GözKulak ===
Contributors: enginsezen
Tags: accessibility, erişilebilirlik, text-to-speech, sesli okuma
Requires at least: 6.4
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.4.6
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Erişilebilirlik menüsü ve Türkçe sesli okuma. Ses tarayıcıda üretilir; sunucuya paket kurulmaz.

== Description ==

GözKulak, temadan bağımsız bir erişilebilirlik menüsü ekler. Menü Shadow DOM içinde çizilir; tema stilleri menüyü etkilemez.

* Ziyaretçiden veri toplanmaz; tercihler yalnızca ziyaretçinin tarayıcısında saklanır.
* Ziyaretçiye açık AJAX veya REST ucu yoktur.
* Eklenti silinince kendi ayarlarını, hazır ses dosyalarını ve sayfa listelerini kaldırır.

Ayarlar: Ayarlar → GözKulak.

== Harici hizmetler ==

Türkçe doğal ses (EMA Lightning) için gereken model ve ONNX Runtime dosyaları eklenti paketinde yer almaz. Yalnızca ziyaretçi doğal sesle dinlemeyi onayladığında, ziyaretçinin tarayıcısı bu dosyaları indirir:

* Ayarlarda "Ses dosyalarının adresi" yazılıysa önce o sunucudan.
* Yoksa ya da dosya oradan alınamazsa Hugging Face (huggingface.co, model dosyaları, commit'e sabitli) ve jsDelivr'den (cdn.jsdelivr.net, onnxruntime-web 1.30.0). Kendi sunucu adresi yazılıysa bu yedek kaynaklar "Yedek kaynaklar" ayarıyla kapatılabilir; o zaman ziyaretçinin tarayıcısı üçüncü taraflara hiç bağlanmaz.

Bu isteklerde yalnızca standart HTTP bilgileri (IP adresi, tarayıcı bilgisi) iletilir; sayfa adresi (Referer) ve çerez gönderilmez. Okunan metin ve ziyaretçi tercihleri hiçbir sunucuya gönderilmez. Her dosya SHA-256 ile doğrulanır. Hugging Face: https://huggingface.co/privacy — jsDelivr: https://www.jsdelivr.com/terms/privacy-policy-jsdelivr-net

Üçüncü taraf bileşenler ve lisansları: THIRD-PARTY-NOTICES.txt

== Güvenlik başlığı (CSP) ==

Sitede Content-Security-Policy başlığı varsa gereken izinler:

* script-src: 'self'; doğal ses için ayrıca 'wasm-unsafe-eval' ve blob:
* worker-src: 'self'
* connect-src: 'self', ses sunucusunun adresi; yedek kaynaklar açıksa https://huggingface.co https://*.huggingface.co https://*.hf.co https://cdn.jsdelivr.net
* media-src: 'self' blob: (hazır ses)
* style-src: 'self' ('unsafe-inline' gerekmez)
* font-src: 'self' (okunaklı yazı tipi)
* Trusted Types politika adları sınırlıysa: gozkulak

Hazır ses hazırlanırken site sayfaları aynı siteden çerçevede açılır; X-Frame-Options: DENY gönderilmemelidir. İzin eksikse menü çalışır, okuma bir sonraki sese (doğal ses ya da tarayıcının sesi) geçer.

== Changelog ==

= 0.4.6 =
* "Okunaklı yazı" artık her cihazda aynı yazı tipini kullanır: Atkinson Hyperlegible Next (az gören okurlar için tasarlandı; I/l/1 ve O/0 kolay ayırt edilir). Yazı tipi eklentiyle gelir; başka bir siteye istek gitmez. Eskiden bu yazı tipi yüklenmiyordu; masaüstünde Verdana ya da Tahoma, telefonda sistemin yazı tipi kullanılıyordu.
* Yazı tipi dosyaları (yaklaşık 53 KB) yalnızca seçenek açılınca iner. Sitede güvenlik başlığı (CSP) varsa font-src 'self' izni gerekir.
* Düzeltme: Menüdeki büyük harfli başlıklarda i, I olarak görünüyordu ("SESLI OKUMA", "OKUMA VE DIKKAT"); artık "SESLİ OKUMA". Chromium menünün içinde sayfanın dilini büyük harf dönüşümünde kullanmıyordu.

= 0.4.5 =
* Düzeltme: Okunuş sözlüğünde sonu noktayla biten kısaltmalar ("Şti. = Şirketi", "Doç. = doçent") geçersiz sayılıyordu; artık kaydedilir.
* "Şti.'nin", "A.Ş.'ye" gibi ek almış kısaltmalar da okunur: "Şirketinin", "Anonim Şirketine". Eskiden yalnızca ardından boşluk ya da virgül gelince açılıyordu.
* Okunuş değiştiği için bu yazımları içeren sayfalar yeniden hazırlanmalıdır.

= 0.4.4 =
* Düzeltme: Koyu mod bazen kendiliğinden bozuluyordu; sayfa kaydırılınca ya da fareyle üzerine gelinince yazılar ve zeminler özgün renklerine dönüyordu (çok renkli sayfalarda). Ölçüm sırasında kullanılan geçici sınıf, renk kurallarından biriyle aynı adı taşıyordu.
* Sayaçlar (ekrana gelince 0'dan sayan rakamlar) son değerleriyle okunur. Eskiden okunan sayı dinlenen ana göre değişiyordu ("0 %"); sayfa kaydırıldıysa o cümlenin hazır sesi bulunamıyor ve indirme onayı soruluyordu. Sayaç sayarken vurgu kaybolmaz.
* "100 %" ve "25%" yazımları da "yüzde 100", "yüzde 25" okunur.
* Eklenti açıklaması ve ayarlar sayfasındaki ses açıklaması, hazır sesi de anlatacak şekilde düzeltildi.
* Okunuş değiştiği için sayaç ya da "sayı %" içeren sayfalar yeniden hazırlanmalıdır (Hazırla, ardından "Kullanılmayan dosyaları sil").

= 0.4.3 =
* Düzeltme: Güncellemeler → "Tekrar denetle" (ve ayarlardaki "Şimdi denetle") yeni sürümü her zaman hemen gösterir. WordPress eklentileri son denetimden bir dakika geçmeden yeniden denetlemiyordu; GitHub'ın sonucu da 6 saat saklandığı için yeni sürüm saatlerce görünmeyebiliyordu.

= 0.4.2 =
* Düzeltme: Güncellemeler sayfasından toplu güncellemeden sonra aynı sürüm yeniden öneriliyordu ve ikinci denemede hata veriyordu (güncelleme aslında kurulmuştu). Kurulu sürüm artık eklenti dosyasından okunur.
* "Zaten kurulu" durumu imza hatası gibi değil, ayrı ve açık bir iletiyle bildirilir.
* Ayarlar → GözKulak altında "Güncelleme" satırı: kurulu sürüm, GitHub'daki en yeni sürüm, son denetimin zamanı ve varsa hatası; "Şimdi denetle" bağlantısı.

= 0.4.1 =
* İşlevde değişiklik yok. Güncellemenin WordPress panelinden imza doğrulamasıyla kurulduğunu sitelerde denemek için çıkarıldı.

= 0.4.0 =
* GitHub'dan imzalı güncelleme: yeni sürümler WordPress panelindeki Güncellemeler listesinde görünür. Paket kurulmadan önce imzası ve her dosyası doğrulanır; tutmazsa güncelleme kurulmaz, eski sürüm yerinde ve etkin kalır. Bu sürüm sitelere bir kez elle kurulur; sonrakiler panelden gelir.
* Okunuş sözlüğü örneklerinde şirket adı yerine genel örnekler.

= 0.3.5 =
* Okunuş sözlüğü: Ayarlar → GözKulak → Sesli okuma altında sitenize özel kelimelerin okunuşu yazılır (her satırda "kelime = okunuş"). Büyük harfli bir kısaltma kendisiyle eşleştirilirse ("ABC = ABC") harf harf okunur.
* Eklentinin içindeki siteye özel kelimeler kaldırıldı; bunlar artık sitenin okunuş sözlüğüne yazılır.

= 0.3.4 =
* Güvenlik: şifreyle korunan sayfalar hazır ses için hazırlanamaz ve ses listeleri sayfaya yazılmaz. "Kullanılmayan dosyaları sil", artık herkese açık olmayan (taslak, çöp, özel, şifreli) sayfaların seslerini de siler. Ses alt klasörlerine boş index.php konur.
* Güvenlik: doğal ses dosyaları beklenen boyutta kesilir; bozuk ya da kötü niyetli bir sunucu ziyaretçinin belleğini dolduramaz.
* Trusted Types zorunlu sitelerde doğal ses çalışır ("gozkulak" politikası). Gereken güvenlik başlığı (CSP) izinleri açıklamada.
* Menü sayfanın ilk boyamasından sonra eklenir; PageSpeed / Lighthouse puanı eklenti yüzünden düşmez. Tercihler (koyu mod, yazı boyutu) yine hemen uygulanır.
* Okunuş: "Wi-Fi" ve "wifi" "vayfay", "UNESCO" "yunesko" okunur. "₺5.000 + ve …" artık "ve ve" diye okunmaz. Bu sözcükleri içeren sayfaların hazır sesi yeniden hazırlanmalıdır.
* Ayar girdileri tür denetiminden geçer (PHPStan en sıkı düzeyde temiz).

= 0.3.3 =
* Hazır ses, sayfayı geniş masaüstü, dizüstü, tablet ve telefon genişliklerinde tarar. Bölümleri ekran genişliğine göre gizleyen temalarda (ör. BeTheme) ziyaretçinin ekranında görünen bazı cümlelerin sesi eksik kalıyordu; sayfa hazır olduğu hâlde model yükleniyordu.
* Slayt noktaları ve sayfa numaraları ("0, 1, 2, 3") artık okunmuyor.

= 0.3.2 =
* Cümle sonundaki "bul." "Bulvarı", "sok." "Sokak" diye okunuyordu. "Bul." ve "Sok." artık yalnızca büyük harfle yazılınca adres kısaltması sayılır ("Atatürk Bul." → "Atatürk Bulvarı"). Bu cümlelerin hazır sesi yeniden hazırlanmalıdır.

= 0.3.1 =
* Masaüstünde (ör. Linux'taki Chrome) okuma tıklamadan 1,5 sn sonra başlıyordu: tarayıcının sesleri bekleniyordu. Hazır sesi olan metinde artık tarayıcının sesi sorulmaz; sesi olmayan tarayıcıda da sesler sayfada yalnızca bir kez beklenir.

= 0.3.0 =
* Hazır ses: Ayarlar → GözKulak altındaki "Hazır ses" bölümünden seçilen sayfaların sesi cümle cümle bir kez üretilip sitede saklanır (uploads/gozkulak/, Ogg Opus). Ziyaretçinin tarayıcısında model çalışmaz.
* Sayfanın tamamı hazırsa ses modeli indirilmez ve onay sorulmaz. Eksik cümle varsa onaydan sonra hazırlar dosyadan, eksikler tarayıcıda üretilir.
* Hazır ses hızlandırılınca perde korunur; hız değişince cümle baştan okunmaz.
* Yönetici panelinden kullanılmayan dosyalar ya da tüm hazır sesler silinebilir. Eklenti kaldırılınca hazır ses dosyaları ve sayfa listeleri de silinir.
* Hazır ses için yalnızca yöneticilere açık bir REST ucu eklendi (gozkulak/v1); dosya adı ve içerik denetlenir.

= 0.2.12 =
* Telefonda doğal ses okurken ses arada bitince sık sık kesilip yeniden başlamıyor. Kısa cümlelerde biriktirilen ses, tampon dolmadan çalınıyordu ve hemen yine bitiyordu; artık tampon dolana kadar beklenir. Ses okuma ortasında her bittiğinde biraz daha uzun biriktirilir (en çok 6 sn): sık ve kısa kesilmeler yerine seyrek bir bekleme olur.
* Test modunda, doğal sesle okunurken panelde üretim hızı ve kesilme sayısı görünür ("Tanı: …").

= 0.2.11 =
* Doğal ses, okuma sırasında yaşanan kısa takılmalar yüzünden artık tarayıcının sesine geçmiyor. Telefonda kısa cümlelerden sonra gelen uzun bir cümlede ses bir an bitebiliyor; tampon için bilerek beklenen süre de takılma sayılıyordu ve hızlı bir cihaz "yavaş" bulunuyordu. Yavaşlık kararı artık yalnızca üretim hızından verilir: en az 4 sn seste gerçek zamanın %60'ının ya da tamamlanan en az 8 sn seste gerçek zamanın altında kalırsa.
* Test modunda, doğal sesten tarayıcının sesine geçilirse notun sonunda teknik nedeni görünür ("Tanı: …").

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
