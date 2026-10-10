// Birim testleri: okuma öncesi metin hazırlama (speechText), cümle bölme (splitSentences) ve hazır ses
// dosya adları. gozkulak.js'teki kod doğrudan alınıp çalıştırılır; tarayıcı gerekmez.
//
// Beklenen değerler okunuşa göre tek tek gözden geçirildi. Bir kural değişince buradaki beklenen değer
// bilerek güncellenir. Dikkat: Türkçe okunuş değişirse o cümlenin hazır ses dosyasının adı da değişir;
// o cümleyi içeren sayfalar yeniden hazırlanmalıdır (Changelog'da belirtin).
import { readFileSync } from "node:fs";
import { fileURLToPath as __f } from "node:url";
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü
const src = readFileSync(process.argv[2] || __R + "/assets/js/gozkulak.js", "utf8");
const body = src.slice(src.indexOf("\tconst speechText = (() => {"), src.indexOf("\t/*\n\t * ---------- okunacak içerik"));
const { speechText, splitSentences } = new Function(body + "\nreturn { speechText, splitSentences };")();

let fail = 0;
const check = (name, ok, info) => {
	if (!ok) fail++;
	console.log((ok ? "✓ " : "✗ ") + name + (ok || info === undefined ? "" : "   " + info));
};

const TR = {
	"Saat, gün ve tarih": [
		["Pazartesi 09:00 - 17:30", "Pazartesi 09:00 ile 17:30."],
		["Pazartesi - Cuma 09.00-18.00", "Pazartesi ile Cuma 09.00 ile 18.00."],
		["Pazartesi - Cuma: 09:00 - 18:00", "Pazartesi ile Cuma: 09:00 ile 18:00."],
		["Cumartesi 10.00-14.00", "Cumartesi 10.00 ile 14.00."],
		["7/24 açık", "7 gün 24 saat açık."],
		["09/06/2026", "09.06.2026."],
		["Kuruluş tarihi 01/02/1999", "Kuruluş tarihi 01.02.1999."],
		["Toplantı 15.10.2026 tarihinde.", "Toplantı 15.10.2026 tarihinde."],
		["Saat 14:30'da başlar.", "Saat 14:30'da başlar."],
		["Salı", "Salı."],
		["7", "7."],
	],
	"Telefon": [
		["Tel: +90 549 737 20 21", "Telefon: artı 90, 549, 737, 20, 21."],
		["+903704422353", "artı 90, 370, 442, 23, 53."],
		["Tel: +90 370 415 61 90 Fax: +90 370 412 10 06", "Telefon: artı 90, 370, 415, 61, 90 Faks: artı 90, 370, 412, 10, 06."],
		["0370 415 61 90", "0, 370, 415, 61, 90."],
		["Tel: 0 (370) 712 34 56", "Telefon: 0, 370, 712, 34, 56."],
		["GSM: 0532 123 45 67", "Cep telefonu: 0, 532, 123, 45, 67."],
		["+90 (532) 123 45 67", "artı 90, 532, 123, 45, 67."],
		["Sipariş no 12345678", "Sipariş no 12345678."],
	],
	"Adres ve kısaltmalar": [
		["Hıdırlık Sokak No:6, Kat:1", "Hıdırlık Sokak numara 6, kat 1."],
		["Musalla Mah. Hıdırlık Sok. No: 2/B", "Musalla Mahallesi Hıdırlık Sokak numara 2 B."],
		["Bayır Mah. Fevzi Çakmak Cad. Bayır Sok.", "Bayır Mahallesi Fevzi Çakmak Caddesi Bayır Sokak."],
		["Cumhuriyet Mah. Atatürk Cad. No: 12 D: 3 Kat: 2", "Cumhuriyet Mahallesi Atatürk Caddesi numara 12 daire 3 kat 2."],
		["Hürriyet Mh. İnönü Cd. No:5", "Hürriyet Mahallesi İnönü Caddesi numara 5."],
		["Atatürk Bul. No: 5", "Atatürk Bulvarı numara 5."],
		["Atatürk Blv. 12", "Atatürk Bulvarı 12."],
		["Atatürk bulv. 12", "Atatürk Bulvarı 12."],
		["Kültür Apt. 4", "Kültür Apartmanı 4."],
		["Ltd. Şti. San. ve Tic.", "Limited Şirketi Sanayi ve Ticaret."],
		["ABC Tic. A.Ş.", "ABC Ticaret Anonim Şirketi."],
		["Dr.Ahmet Yılmaz", "Doktor Ahmet Yılmaz."],
		["Prof. Dr. Ayşe Kaya", "Profesör Doktor Ayşe Kaya."],
		["Doç. Dr. Ali Veli", "Doçent Doktor Ali Veli."],
		["elma, armut vb. meyveler", "elma, armut ve benzeri meyveler."],
		["kalem, defter vs.", "kalem, defter vesaire."],
		["örn. Safranbolu", "örneğin Safranbolu."],
		["T.C. Kimlik", "T.C. Kimlik."],
	],
	"Fiil olan kısaltmalar (bul, sok)": [
		["Keşif noktalarını tek platformda bul. ", "Keşif noktalarını tek platformda bul."],
		["Hemen bul.\n", "Hemen bul."],
		["Elini cebine sok. ", "Elini cebine sok."],
		["İçeri sok, sonra çık", "İçeri sok, sonra çık."],
	],
	"Sıra sayıları ve numaralı başlıklar": [
		["KVKK’nın 11. maddesi", "KVKK nın 11'inci maddesi."],
		["19. yüzyıl başlarında", "19'uncu yüzyıl başlarında."],
		["Karayolu 7. km Çevrikköprü", "Karayolu 7'nci kilometre Çevrikköprü."],
		["3. kat", "3'üncü kat."],
		["100. yıl", "100'üncü yıl."],
		["1. Veri Sorumlusu", "1, Veri Sorumlusu."],
		["1. Bölüm", "1, Bölüm."],
		["2) Giriş", "2, Giriş."],
		["1Safranbolu’nun Kalbinde Bir Osmanlı Çarşısı", "1, Safranbolu'nun Kalbinde Bir Osmanlı Çarşısı."],
		["2 Zamana Direnen 48 Ahşap Dükkân", "2, Zamana Direnen 48 Ahşap Dükkân."],
		["1.Bölüm Giriş", "1, Bölüm Giriş."],
	],
	"Birim, para, yüzde": [
		["200m2 kapalı alan", "200 metrekare kapalı alan."],
		["5 km yürüyüş", "5 kilometre yürüyüş."],
		["120 m² daire", "120 metrekare daire."],
		["30 cm", "30 santimetre."],
		["25 kg", "25 kilogram."],
		["₺1.250,50", "1.250,50 lira."],
		["1.500 TL", "1.500 lira."],
		["%20 indirim", "yüzde 20 indirim."],
		["% 8", "yüzde 8."],
		["500 TL/ay", "500 lira aylık."],
		["Başlangıç ₺5.000 + ve 1000₺/yıl", "Başlangıç 5.000 lira ve 1000 lira yıllık."],
		["Fiyat ₺5.000 +", "Fiyat 5.000 lira."],
		["Kahve + çay", "Kahve ve çay."],
	],
	"Adresler, e-posta, bitişik yazım": [
		["Sezen.Pro web tasarım", "Sezen nokta pro web tasarım."],
		["karabuk78.com adresinden", "karabuk 78 nokta com adresinden."],
		["info@mzademiryolu.com.tr", "info et mzademiryolu nokta com nokta tr."],
		["info@karabuk78.com adresine yazın", "info et karabuk 78 nokta com adresine yazın."],
		["https://www.karabuk78.com/isletmeler/ adresi", "karabuk 78 nokta com adresi."],
		["www.sezen.pro", "sezen nokta pro."],
		["Ziyaret ettik.Sonra çarşıya gittik.", "Ziyaret ettik. Sonra çarşıya gittik."],
		["Karabük78 rehberi", "Karabük 78 rehberi."],
		["Karabük78'de yeni işletmeler", "Karabük 78'de yeni işletmeler."],
		["A101 ve BİM", "A 101 ve BİM."],
		["BMW X5", "BMW X 5."],
		["B2B satış", "B 2 B satış."],
	],
	"Büyük harf": [
		["DEMİRYOLU MAKASI İMALATI", "demiryolu makası imalatı."],
		["TEKLİF AL", "teklif al."],
		["ANA SAYFA", "ana sayfa."],
		["SEZEN.PRO ve SEZEN firması", "sezen nokta pro ve sezen firması."],
		["MZA Demiryolu ve TCDD ile KVKK", "MZA Demiryolu ve TCDD ile KVKK."],
		["MZA'nın ürünleri", "MZA nın ürünleri."],
		["PDF'yi indir", "PDF yi indir."],
		["IP adresi", "ip adresi."],
		["UNESCO Dünya Mirası", "yunesko Dünya Mirası."],
		["NATO ve UNESCO", "nato ve yunesko."],
		["KARDEMİR'in", "kardemir'in."],
		["WIFI ücretsiz", "vayfay ücretsiz."],
		["AVM içinde", "AVM içinde."],
		["(“KVKK”)", "(\"KVKK\")."],
		["Karabük Demir Çelik Fabrikaları 1937'de kuruldu", "Karabük Demir Çelik Fabrikaları 1937'de kuruldu."],
	],
	"İngilizce sözcükler (Türkçe okunuşla)": [
		["Wi-Fi var", "vayfay var."],
		["WI-FI", "vayfay."],
		["wifi şifresi", "vayfay şifresi."],
		["Ücretsiz Wi-Fi'ye bağlanın", "Ücretsiz vayfay'ye bağlanın."],
		["Unesco listesinde", "yunesko listesinde."],
		["UNESCO'nun koruması", "yunesko'nun koruması."],
	],
	"İşaretler": [
		["Safranbolu / Karabük", "Safranbolu, Karabük."],
		["Kahve & Çay", "Kahve ve Çay."],
		["Ankara - İstanbul", "Ankara, İstanbul."],
		["2/B blok", "2 B blok."],
		["→ Devamı", "Devamı."],
		["✓ Ücretsiz otopark", "Ücretsiz otopark."],
		["ℹ️ Yapay Zeka İncelemesi", "Yapay Zeka İncelemesi."],
		["😀 Merhaba", "Merhaba."],
		["“Tırnak” içinde", "\"Tırnak\" içinde."],
		["", ""],
	],
};
const EN = [
	["MZA RAILWAY MACHINERY - About us / Contact: +90 370 415 61 90", "MZA railway machinery, About us, Contact: plus 90, 370, 415, 61, 90."],
	["Email: info@mza.com.tr", "Email: info at mza dot com dot tr."],
	["1. Introduction", "1, Introduction."],
	["NASA and the USA", "nasa and the USA."],
	["Visit https://www.mzademiryolu.com/en/ today", "Visit mzademiryolu dot com today."],
];
const SPLIT = [
	["Birinci cümle. İkinci cümle!", ["Birinci cümle.","İkinci cümle!"]],
	["Dr. Ahmet geldi. Sonra gitti.", ["Dr. Ahmet geldi.","Sonra gitti."]],
	["Fiyat 3.5 milyon. Son.", ["Fiyat 3.5 milyon.","Son."]],
	["Tarih 09.06.2026 oldu. Son.", ["Tarih 09.06.2026 oldu.","Son."]],
	["Musalla Mah. Hıdırlık Sok. No. 6. Bitti.", ["Musalla Mah. Hıdırlık Sok. No. 6.","Bitti."]],
	["A. Yılmaz anlattı. Son.", ["A. Yılmaz anlattı.","Son."]],
	["1. Veri Sorumlusu başlığı. Son.", ["1. Veri Sorumlusu başlığı.","Son."]],
	["Ne? Nasıl! Peki…", ["Ne?","Nasıl!","Peki…"]],
	["\"Merhaba.\" dedi. Sonra.", ["\"Merhaba.\" dedi.","Sonra."]],
	["elma vb. meyveler. Son.", ["elma vb. meyveler.","Son."]],
	["küçük harfle. devam eder.", ["küçük harfle. devam eder."]],
	["Sayı 12. Sonraki cümle.", ["Sayı 12.","Sonraki cümle."]],
];


for (const [group, list] of Object.entries(TR)) {
	console.log("\n" + group);
	for (const [input, expect] of list) {
		const out = speechText.tr(input);
		check(JSON.stringify(input) + " → " + JSON.stringify(out), out === expect, "(beklenen: " + JSON.stringify(expect) + ")");
	}
}

console.log("\nİngilizce");
for (const [input, expect] of EN) {
	const out = speechText.en(input);
	check(JSON.stringify(input) + " → " + JSON.stringify(out), out === expect, "(beklenen: " + JSON.stringify(expect) + ")");
}

console.log("\nSıra sayısı ekleri");
const ORD = { 0: "ıncı", 1: "inci", 2: "nci", 3: "üncü", 4: "üncü", 5: "inci", 6: "ncı", 7: "nci", 8: "inci", 9: "uncu", 10: "uncu", 11: "inci", 19: "uncu", 20: "nci", 30: "uncu", 40: "ıncı", 50: "nci", 60: "ıncı", 70: "inci", 80: "inci", 90: "ıncı", 100: "üncü", 200: "üncü", 1000: "inci", 1001: "inci", 1937: "nci", 2026: "ncı", 1000000: "uncu", 1000000000: "ıncı" };
const wrong = Object.entries(ORD).filter(([n, e]) => speechText.ordinalSuffix(Number(n)) !== e).map(([n, e]) => n + "'" + speechText.ordinalSuffix(Number(n)) + " (beklenen " + e + ")");
check(Object.keys(ORD).length + " sayının eki", !wrong.length, wrong.join(", "));

console.log("\nCümle bölme");
for (const [input, expect] of SPLIT) {
	const out = splitSentences(input).map(([a, b]) => input.slice(a, b));
	check(JSON.stringify(input) + " → " + JSON.stringify(out), JSON.stringify(out) === JSON.stringify(expect), "(beklenen: " + JSON.stringify(expect) + ")");
}
const long = "Bu çok uzun bir cümledir, " + "kelime ".repeat(40) + "ve virgüller, burada, devam eder; " + "başka kelime ".repeat(30) + "son.";
const parts = splitSentences(long);
const joined = parts.map(([a, b]) => long.slice(a, b)).join(" ").replace(/\s+/g, " ");
check("uzun cümle 260 karakterlik parçalara bölünür, metin kaybolmaz", parts.length > 1 && parts.every(([a, b]) => b - a <= 260) && joined === long.replace(/\s+/g, " ").trim(), parts.map(([a, b]) => b - a).join(", "));

console.log("\nHazır ses dosya adları");
// Dosya adı = SHA-256("gk1|ema-13c431d|opus24|" + okunacak metin) ilk 16 baytı. Ön ek ya da yöntem
// değişirse sitelerdeki bütün hazır sesler kullanılamaz hâle gelir: bilerek değiştirilmelidir.
const prefix = (/const PREFIX = "([^"]+)";/.exec(src) || [])[1];
check("ön ek değişmedi", prefix === "gk1|ema-13c431d|opus24|", prefix);
const hashSrc = src.slice(src.indexOf("async function hash(text)"), src.indexOf("// Listenin Türkçe bölümlerindeki birimler"));
check("özet yöntemi değişmedi", /digest\("SHA-256", new TextEncoder\(\)\.encode\(PREFIX \+ text\)\)/.test(hashSrc) && /\.slice\(0, 16\)/.test(hashSrc));

console.log("\nHATA SAYISI:", fail);
