import { chromium } from "playwright";
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
await p.goto("http://localhost:8080/wp-login.php");
await p.fill("#user_login", "admin"); await p.fill("#user_pass", "admin"); await p.click("#wp-submit");
await p.waitForLoadState("networkidle");
const A = "http://localhost:8080/wp-admin/options-general.php?page=gozkulak";
const field = 'input[name="gozkulak_settings[tts_base]"]';
async function save(v) {
	await p.goto(A);
	await p.fill(field, v);
	// tarayıcının kendi url doğrulamasını atla (sunucu tarafını sınıyoruz)
	await p.evaluate(() => document.querySelector("form").setAttribute("novalidate", ""));
	await p.click("#submit");
	await p.waitForLoadState("networkidle");
	const err = await p.evaluate(() => [...document.querySelectorAll(".notice-error, .error")].map((e) => e.textContent.trim()).join(" | "));
	return { kayıtlı: await p.inputValue(field), hata: err.slice(0, 90) };
}
console.log("geçerli:", JSON.stringify(await save("https://ses.example.com")));
console.log("http:", JSON.stringify(await save("http://ses.example.com/")));
console.log("betik:", JSON.stringify(await save("https://ses.example.com/\"><script>alert(1)</script>")));
await p.goto("http://localhost:8080/?p=6");
await p.waitForTimeout(500);
console.log("sayfa ayarı:", await p.evaluate(() => JSON.stringify(JSON.parse(document.getElementById("gozkulak-config").textContent).tts)));
console.log("boş:", JSON.stringify(await save("")));
await p.goto("http://localhost:8080/?p=6");
console.log("sayfa ayarı:", await p.evaluate(() => JSON.stringify(JSON.parse(document.getElementById("gozkulak-config").textContent).tts)));
const ph = await p.evaluate(() => 1);
await b.close();
