(() => {
  const T = (el) => (el.innerText || "").replace(/\s+/g, " ").trim();
  const SKIP = "header, footer, nav, aside, form, script, style, noscript, [aria-hidden='true']";
  const css = (el) => el.id ? "#" + CSS.escape(el.id)
    : el.tagName.toLowerCase() + [...el.classList].slice(0, 2).map((c) => "." + CSS.escape(c)).join("");
  const path = (el) => { const p = []; for (let e = el; e && e !== document.body && p.length < 4; e = e.parentElement) { p.unshift(css(e)); if (e.id) break; } return p.join(" > ") || "body"; };
  const leaves = [...document.querySelectorAll("p, li, h1, h2, h3, h4, h5, td, dd, dt, blockquote")]
    .filter((e) => !e.closest(SKIP) && !e.querySelector("p, li"));
  const score = new Map();
  let total = 0;
  for (const e of leaves) {
    const n = T(e).length;
    if (n < 3) continue;
    total += n;
    for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) score.set(a, (score.get(a) || 0) + n);
  }
  let best = document.body, bestDepth = 0;
  for (const [el, n] of score) {
    if (n < total * 0.8) continue;
    let d = 0;
    for (let a = el; a; a = a.parentElement) d++;
    if (d > bestDepth) { best = el; bestDepth = d; }
  }
  const theme = ((document.querySelector('link[href*="/wp-content/themes/"]') || {}).href || "").match(/themes\/([^/]+)/);
  const lines = [location.href,
    "tema: " + (theme ? theme[1] : "?") + " · sayfa metni: " + T(document.body).length + " kr. · paragraf metni: " + total + " kr.", "",
    "OTOMATİK ÖNERİ: " + path(best) + " → " + T(best).length + " kr. | " + T(best).slice(0, 90), "", "ADAY SEÇİCİLER:"];
  const C = ["main", "[role=main]", "article", ".entry-content", ".post-content", "#content", "#Content", "#primary", "#main", ".site-main",
    ".the_content_wrapper", ".sections_group", "#listing-overview", ".listing-section", "#titlebar", ".listing-titlebar",
    ".opening-hours", ".listing-details-sidebar", ".entry-header", ".hero-section", "h1"];
  for (const s of C) {
    const els = document.querySelectorAll(s);
    if (els.length) lines.push(s + " ×" + els.length + ": " + T(els[0]).length + " kr. | " + T(els[0]).slice(0, 70));
  }
  lines.push("", "ÖNERİNİN İÇİNDEKİ BAŞLIKLAR:");
  for (const h of [...best.querySelectorAll("h1, h2, h3, h4")].slice(0, 15)) lines.push("  " + h.tagName + " " + T(h).slice(0, 70));
  lines.push("", "ÖNERİNİN DIŞINDA KALAN METİNLİ BÖLÜMLER:");
  let k = 0;
  for (let a = best; a && a !== document.body && a.parentElement; a = a.parentElement) {
    for (const sib of a.parentElement.children) {
      if (sib === a || k >= 25) continue;
      const t = T(sib);
      if (t.length > 40) { k++; lines.push("  " + path(sib) + (sib.matches(SKIP) || sib.closest(SKIP) ? " (atlanır)" : "") + ": " + t.length + " kr. | " + t.slice(0, 60)); }
    }
  }
  const out = lines.join("\n");
  if (typeof copy === "function") copy(out);
  console.log(out);
  return "Sonuç panoya kopyalandı; sohbete yapıştırın.";
})();
