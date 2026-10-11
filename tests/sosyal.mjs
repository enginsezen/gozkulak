// GitHub "Social preview" kartı (docs/img/sosyal.png, 1280×640): sağda docs/img/okuma.png, yazı tipi eklentininki.
// Önce `npm run gorseller`; kart elle yüklenir: repo → Settings → General → Social preview.
//
//   cd tests && npm run sosyal
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const R = fileURLToPath(new globalThis.URL("..", import.meta.url)).replace(/\/$/, "");
const f = (p) => pathToFileURL(join(R, p)).href;

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:A;src:url(${f("assets/fonts/atkinson-hyperlegible-next-latin-ext-wght-normal.woff2")}) format("woff2");font-weight:200 800;unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1E00-1E9F}
@font-face{font-family:A;src:url(${f("assets/fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2")}) format("woff2");font-weight:200 800;unicode-range:U+0000-00FF,U+0131,U+2000-206F}
*{box-sizing:border-box;margin:0}
body{width:1280px;height:640px;overflow:hidden;font-family:A,sans-serif;background:#0b5394;color:#fff;display:flex;align-items:center;position:relative}
.sol{width:560px;padding:0 40px 0 72px}
h1{font-size:84px;font-weight:800;letter-spacing:-1px;line-height:1}
p{font-size:30px;line-height:1.3;margin-top:22px;font-weight:500}
ul{list-style:none;padding:0;margin-top:30px;font-size:22px;line-height:1.6;color:#d6e6f7}
li::before{content:"• ";color:#ffd54a}
.sag{position:absolute;left:600px;top:56px;width:760px;height:584px;border-radius:14px 0 0 0;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.35);background:#fff}
.sag img{position:absolute;left:-300px;top:-130px;width:1280px}
</style>
<div class="sol"><h1>GözKulak</h1><p>WordPress için erişilebilirlik menüsü ve Türkçe sesli okuma</p>
<ul><li>Ses tarayıcıda üretilir</li><li>Temadan bağımsız</li><li>Ziyaretçiden veri toplanmaz</li></ul></div>
<div class="sag"><img src="${f("docs/img/okuma.png")}" alt=""></div>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 640 } });
await p.goto(f("tests/package.json"));
await p.setContent(html, { waitUntil: "load" });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: join(R, "docs/img/sosyal.png") });
await b.close();
console.log("docs/img/sosyal.png");
