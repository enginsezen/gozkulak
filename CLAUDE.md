# GözKulak — Claude Code talimatı

WordPress için temadan bağımsız erişilebilirlik menüsü ve Türkçe sesli okuma eklentisi. Türkçe ses, EMA Lightning modeliyle ziyaretçinin tarayıcısında (ONNX Runtime Web, Web Worker) üretilir. Sunucuya hiçbir şey kurulmaz.

Kişiye özel bilgiler (siteler, sunucu, test cihazları, güncel durum) `CLAUDE.local.md` dosyasında ve `ozel/` klasöründedir. İkisi de `.gitignore`'dadır ve repoya girmez. Oturum başında bunları oku; kaldığımız yer `ozel/kaldigimiz-yer.md` içinde.

## Çalışma kuralları

- Türkçe yanıt ver.
- VPS'e (CloudPanel) hiçbir paket kurulmaz; yalnızca statik dosya ve vhost ayarı yapılır.
- Adım adım ilerle. Bir fazı bitirip kullanıcının onayını almadan sonrakine geçme.
- Güvenlik:
  - PHP'de her girdi temizlenir, her çıktı escape edilir; ayarlar Settings API ile kaydedilir (nonce + `manage_options`).
  - Ön yüzde `innerHTML`, `outerHTML`, `insertAdjacentHTML` ya da `eval` kullanılmaz; DOM, `h()` / `s()` yardımcılarıyla kurulur.
  - Ziyaretçiye açık AJAX ya da REST ucu yoktur. Tek uç, hazır ses yüklemesidir (`gozkulak/v1`): yalnızca yöneticiler (`manage_options` + REST nonce'u), dosya adı ve içerik denetlenir. Ayarlar sayfaya `wp_json_encode` ile, çalıştırılmayan bir JSON bloğu olarak aktarılır.
  - Ziyaretçiden veri toplanmaz; tercihler yalnızca ziyaretçinin tarayıcısında (localStorage) tutulur.
  - Model, WASM ve ONNX Runtime dosyaları sürüme sabitlidir ve SHA-256 ile doğrulanır. Doğrulama tutmazsa motor çalışmaz.
- Repo herkese açık: anahtar, parola ya da sunucu bilgisi (alan adı, SSH kullanıcısı, yol) koda, belgeye ya da commit'e konmaz. Bunlar `CLAUDE.local.md` dosyasında durur.
- Kodun asıl kaynağı GitHub reposudur (enginsezen/gozkulak). Proje belgesindeki (`ozel/`) kararlar geçerlidir; yeni bir karar alınınca belge de güncellenir.
- Eklenti kaldırılınca kendi ayarlarını, hazır ses dosyalarını ve sayfa listelerini siler (`uninstall.php`).
- Kod yorumları ve kullanıcıya görünen metinler Türkçedir. Menü metinleri sayfanın diline göre Türkçe ya da İngilizcedir (`STR.tr` / `STR.en`).

## Yapı

| Yol | İçerik |
| --- | --- |
| `gozkulak.php` | Eklenti başlığı, `GOZKULAK_VERSION` |
| `includes/class-gozkulak-settings.php` | Tek seçenek (`gozkulak_settings`): varsayılanlar, `sanitize`, `normalize`, seçici ve ses adresi temizleme |
| `includes/class-gozkulak-admin.php` | Ayarlar → GözKulak sayfası (her çıktı escape edilir) |
| `includes/class-gozkulak-audio.php` | Hazır ses: `uploads/gozkulak/` altındaki cümle dosyaları (Ogg Opus), sayfa listesi (`_gozkulak_audio` meta), yöneticiye özel REST uçları |
| `includes/class-gozkulak-frontend.php` | Betiği yükler, ayarları `#gozkulak-config` JSON bloğu olarak yazar. Test modu: yalnızca yöneticiler görür |
| `assets/js/gozkulak.js` | Menü ve sesli okuma. Tek IIFE, ~3000 satır |
| `assets/js/gozkulak-tts-worker.js` | Doğal ses motoru (module Worker): sabitlenmiş dosya listesi ve SHA-256, Cache Storage, ORT içe aktarma, EMA (tts.js uyarlaması) |
| `assets/css/menu.css` | Shadow DOM içindeki menü |
| `assets/css/page.css` | Sayfaya uygulanan sınıflar (`html.gk-*`) |
| `tools/` | Faz 0 ölçüm sayfası, tarama ve tanı betikleri, `tools/vps/tts-dosyalari.sh`. Pakete girmez |
| `tests/` | Uçtan uca testler, deneme sayfaları, yerel test sunucusu (`tests/README.md`). Pakete girmez |

`gozkulak.js` içindeki modüller, sırayla:

- `runtime`: çalışma zamanı stil sayfası.
- `measureOriginal`: koyu mod ve kontrast için ölçüm.
- `fontScale`: yazı boyutu ve satır yüksekliği.
- `paint`: koyu mod ve yüksek kontrast. Filtre yok; renkler öğe öğe dönüştürülür.
- `speechText`: Türkçe/İngilizce okuma öncesi metin hazırlama.
- `splitSentences`.
- `content`: okunacak alan, bloklar, cümleler, vurgu aralığı.
- `browserVoice`: Web Speech API.
- `readMark`: CSS Highlight API ile okunan cümlenin vurgusu.
- `player`: Web Audio.
- `ema`: Worker istemcisi.
- `browserEngine` / `emaEngine`: okuma sıralayıcıları.
- `prepared` / `preparedEngine`: hazır ses; birimlerin dosya adları ve `<audio>` ile çalma (hız perdeyi korur).
- `reader`: durum makinesi; idle / asking / loading / playing / paused.
- `clickRead`.
- `overlay`: okuma maskesi ve cetveli.
- `speechUi`: panel bölümü ve mini oynatıcı.
- Panelin kendisi.

## Komutlar

```
cd tests && npm run phpcs                   # WordPress kodlama standardı (phpcs.xml.dist); çıktı boş olmalı. PHP gerekmez (WebAssembly)
cd tests && npm run phpstan                 # PHPStan en sıkı düzey (tests/phpstan.neon.dist); "No errors" olmalı
cd tests && npm run plugin-check            # WordPress Plugin Check, paket üzerinde (port 9401). Yalnızca readme dil hataları beklenir
cd tests && npm run wp                      # WordPress Playground (http://127.0.0.1:9400); ardından node e2e/wp-audio.mjs
node --check assets/js/gozkulak.js assets/js/gozkulak-tts-worker.js
cd tests && npm install && npx playwright install chromium   # ilk kez
cd tests && npm test                        # temel uçtan uca testler (~6 dk)
cd tests && npm run serve                   # deneme sayfaları: http://127.0.0.1:8080/gk-oku/hours.html vb.
```

Tanı için tarayıcı konsolunda `GozKulak.sentences()` bir sayfada okunacak cümleleri, `GozKulak.prepare("metin")` bir metnin nasıl okunacağını verir.

## Sürüm çıkarma

1. Sürüm numarasını dört yerde yükselt:
   - `gozkulak.php`: `Version:` başlığı ve `GOZKULAK_VERSION`.
   - `assets/js/gozkulak.js`: `SCRIPT_VERSION`.
   - `readme.txt`: `Stable tag`.
2. `readme.txt` dosyasında Changelog'a kısa Türkçe maddeler ekle.
3. `cd tests && npm run phpcs`, `npm run phpstan`, `node --check` ve `cd tests && npm test` çalıştır. Güncelleme koduna dokunulduysa `node e2e/wp-update.mjs`.
4. Commit'i at.
5. İmzala: `node tools/surum/imzala.mjs` (gizli anahtar `~/.config/gozkulak/imza-anahtari.pem`; repoya girmez). Ardından `git add gozkulak.sig && git commit -m "X.Y.Z imzası" && git tag vX.Y.Z && git push origin main --tags`.
6. Doğrula: `node tools/surum/dogrula.mjs X.Y.Z` (GitHub'ın arşivini indirip eklentinin yaptığı denetimi yapar). Tutmazsa sürümü sitelere duyurma.
7. Paketi oluştur: `git archive --prefix=gozkulak/ -o ../gozkulak-X.Y.Z.zip HEAD`. `tools/` ve `tests/` pakete girmez. Siteler 0.4.0'dan sonra güncellemeyi panelden alır; zip elle kurulum ve yedek içindir. Zip'i kullanıcıya mutlaka ver.
8. Kullanıcıya her güncellemeden sonra sitenin önbelleğini temizlemesini hatırlat. Eski betik önbellekten gelebilir; betik kendi sürümünü eklentiyle karşılaştırır ve uyuşmazsa test modunda uyarı verir.

## Bilinen tuzaklar

- Eklenti geneldir: metin hazırlamaya siteye özel kelime ya da kural yazılmaz. Koda yalnızca genel kurallar (saat, telefon, adres kısaltmaları, sıra sayıları, işaretler) ve Türkçede herkesin aynı okuduğu kısaltmalar girer. Siteye özel okunuşlar Ayarlar → GözKulak → "Okunuş sözlüğü"ne yazılır (`kelime = okunuş`; büyük harfli kısaltma kendisiyle eşleşirse harf harf okunur: `ABC = ABC`). Arayüzdeki ve belgelerdeki örneklerde de şirket ya da site adı kullanılmaz. Testlerdeki site cümleleri kural değil, genel kuralların sınama örnekleridir.

- JS düzenli ifadelerinde `\b` Türkçe harflerde çalışmaz. Yerine `(?<![\p{L}\p{N}])` ve `u` bayrağı kullanılır.
- Float ya da flex yüzünden blok olan satır içi öğeler (`span`, `a`…) okumada satırın parçasıdır: `content.kindOf` → `"soft"`.
- Model tek kelimelik girdiyi zayıf seslendirir. `emaEngine.job()` kısa cümleyi bir sonrakiyle birlikte üretir.
- Model, harf ile rakamın bitişik yazıldığı ya da noktayla birleştiği sözcükleri harf harf okur. `speechText.tr` bunları ayırır (`Karabük78` → `Karabük 78`, `Sezen.Pro` → `Sezen nokta pro`).
- Yavaş cihaz kararı yalnızca üretim hızına dayanır. Takılma süresi karar için kullanılmaz; tampon için beklenen süre takılma sayılmaz.
- Test modunda, doğal sesten tarayıcının sesine geçişin nedeni panelde "(Tanı: …)" diye görünür.
- Çok çekirdekli WASM kullanılmaz; COOP/COEP başlıkları gömülü içerikleri bozar. `numThreads = 1`.
- WebGPU yalnızca masaüstü Chromium'da denenir. Telefon, tablet, Safari ve Firefox'ta WASM kullanılır.
