import { chromium } from "playwright";
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
p.on("pageerror", (e) => console.log("HATA", e.message));
await p.goto(process.argv[2] || "http://127.0.0.1:8080/gk-oku/hours.html");
await p.waitForFunction(() => window.GozKulak);
for (const s of await p.evaluate(() => GozKulak.sentences())) console.log(JSON.stringify(s.text), "→", JSON.stringify(s.speech));
await b.close();
