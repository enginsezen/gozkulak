import { readFileSync } from "node:fs";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü
// Metin hazırlama kuralları: gozkulak.js'teki speechText ve splitSentences doğrudan sınanır.
const src = readFileSync(process.argv[2] || __R + "/assets/js/gozkulak.js", "utf8");
const body = src.slice(src.indexOf("\tconst speechText = (() => {"), src.indexOf("\t/*\n\t * ---------- okunacak içerik"));
const { speechText, splitSentences } = new Function(body + "\nreturn { speechText, splitSentences };")();
const cases = [
	["Pazartesi 09:00 - 17:30", "Pazartesi 09:00 ile 17:30"],
	["Karabük78 rehberi", "Karabük 78 rehberi."],
	["Karabük78'de yeni işletmeler", "Karabük 78'de"],
	["Sezen.Pro web tasarım", "Sezen nokta pro web tasarım."],
	["karabuk78.com adresinden", "karabuk 78 nokta com adresinden."],
	["1Safranbolu’nun Kalbinde Bir Osmanlı Çarşısı", "1, Safranbolu'nun Kalbinde Bir Osmanlı Çarşısı."],
	["2 Zamana Direnen 48 Ahşap Dükkân", "2, Zamana Direnen 48 Ahşap Dükkân."],
	["1.Bölüm Giriş", "1, Bölüm Giriş."],
	["Ziyaret ettik.Sonra çarşıya gittik.", "ettik. Sonra"],
	["200m2 kapalı alan", "200 metrekare kapalı alan."],
	["Dr.Ahmet Yılmaz", "Doktor"],
	["Pazartesi - Cuma 09.00-18.00", "ile"],
	["DEMİRYOLU MAKASI İMALATI", "demiryolu makası imalatı."],
	["TEKLİF AL", "teklif al."],
	["SEZEN.PRO ve SEZEN firması", null],
	["MZA Demiryolu ve TCDD ile KVKK", "MZA Demiryolu ve TCDD ile KVKK."],
	["KVKK’nın 11. maddesi", "KVKK nın 11'inci maddesi."],
	["19. yüzyıl başlarında", "19'uncu yüzyıl"],
	["Karayolu 7. km Çevrikköprü", "7'nci kilometre"],
	["1. Veri Sorumlusu", "1, Veri Sorumlusu."],
	["Hıdırlık Sokak No:6, Kat:1", "numara 6, kat 1"],
	["Safranbolu / Karabük", "Safranbolu, Karabük."],
	["Musalla Mah. Hıdırlık Sok. No: 2/B", "Mahallesi"],
	["Bayır Mah. Fevzi Çakmak Cad. Bayır Sok.", "Caddesi"],
	["Tel: +90 549 737 20 21", "Telefon: artı 90, 549, 737, 20, 21."],
	["+903704422353", "artı 90, 370, 442, 23, 53."],
	["Tel: +90 370 415 61 90 Fax: +90 370 412 10 06", "Faks: artı 90, 370, 412, 10, 06"],
	["0370 415 61 90", "0, 370, 415, 61, 90."],
	["(“KVKK”)", null],
	["IP adresi", "ip adresi."],
	["09/06/2026", "09.06.2026."],
	["Başlangıç ₺5.000 + ve 1000₺/yıl", "lira"],
	["%20 indirim", "yüzde 20 indirim."],
	["info@mzademiryolu.com.tr", "info et mzademiryolu nokta com nokta tr."],
	["ℹ️ Yapay Zeka İncelemesi", "Yapay Zeka İncelemesi."],
	["UNESCO Dünya Mirası", "unesco Dünya Mirası."],
	["Karabük Demir Çelik Fabrikaları 1937'de kuruldu", "1937'de"],
	["A101 ve BİM", null],
	["ANA SAYFA", "ana sayfa."],
	["T.C. Kimlik", null],
	["Ltd. Şti. San. ve Tic.", null],
];
let fail = 0;
for (const [input, expect] of cases) {
	const out = speechText.tr(input);
	const ok = expect === null || out.includes(expect.replace(/\.$/, "")) && (!expect.endsWith(".") || out === expect || out.endsWith(expect));
	if (!ok) fail++;
	console.log((ok ? "✓ " : "✗ ") + input + "  →  " + out + (ok ? "" : "   (beklenen: " + expect + ")"));
}
console.log("\nEN:", speechText.en("MZA RAILWAY MACHINERY - About us / Contact: +90 370 415 61 90"));
console.log("sıra ekleri:", [1, 2, 3, 6, 9, 10, 19, 20, 40, 60, 100, 1000, 1937, 2026].map((n) => n + "'" + speechText.ordinalSuffix(n)).join(" "));
const para = "Safranbolu Eski Çarşı’da bulunan Kaymakamlar Gezi Evi, geleneksel yaşamı tanıtmak amacıyla müzeye dönüştürülmüş tarihi bir konaktır. 19. yüzyıl başlarında inşa edildiği kabul edilen yapı, önemli örneklerden biridir! Musalla Mah. Hıdırlık Sok. No:6 adresindedir. Dr. A. Yılmaz anlattı. Fiyat 3.5 milyon. 1. Veri Sorumlusu başlığı. Son";
const parts = splitSentences(para).map(([a, b]) => para.slice(a, b));
console.log("\nCümleler (" + parts.length + "):\n  " + parts.join("\n  "));
const long = "Bu çok uzun bir cümledir, " + "kelime ".repeat(40) + "ve virgüller, burada, devam eder; " + "başka kelime ".repeat(30) + "son.";
console.log("\nuzun cümle parçaları:", splitSentences(long).map(([a, b]) => b - a).join(", "));
console.log("\nHATA SAYISI:", fail);
