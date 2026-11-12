/* Sticky-CTA mobil (Sven dringend, 12.11.2026): Schnellzugriff auf den Primaer-CTA der Seite, nur <= 640 px.
   Erscheint erst nach Scroll, nie solange der Cookie-Hinweis sichtbar ist, nicht solange der Seiten-CTA/das Formular im Bild ist, schliessbar
   (pro Sitzung). Verdeckt keine Inhalte: Seite bekommt solange unten Platz (padding-bottom). Gleiche Datei bei VF, MH, IG, B.
   Konfiguration per data-Attribute am Script-Tag: data-label, data-href | data-href-sel, data-banner, data-banner-klasse, data-ziel, data-bg, data-fg */
(function () {
  var S = document.currentScript || document.querySelector('script[src*="sticky-cta"]');
  if (!S) return;
  var C = {
    label: S.getAttribute("data-label") || "Jetzt starten",
    href: S.getAttribute("data-href") || "",
    hrefSel: S.getAttribute("data-href-sel") || "",
    banner: S.getAttribute("data-banner") || "",
    bannerKlasse: S.getAttribute("data-banner-klasse") || "",
    ziel: S.getAttribute("data-ziel") || "",
    bg: S.getAttribute("data-bg") || "#e2691a",
    fg: S.getAttribute("data-fg") || "#1b1b1f"
  };
  var KEY = "sticky-cta-zu", mq = window.matchMedia("(max-width:640px)"), el = null, zu = false, pad0 = null, tick = false;
  try { zu = sessionStorage.getItem(KEY) === "1"; } catch (e) {}
  if (zu) return;

  function sichtbar(e) {
    if (!e) return false;
    var r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return !e.hidden && cs.display !== "none" && cs.visibility !== "hidden" && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
  }
  function bannerSichtbar() {
    if (!C.banner) return false;
    var b = document.querySelector(C.banner);
    if (!b) return false;
    if (C.bannerKlasse && !b.classList.contains(C.bannerKlasse)) return false;
    return sichtbar(b);
  }
  function zielSichtbar() {
    if (!C.ziel) return false;
    var l = document.querySelectorAll(C.ziel);
    for (var i = 0; i < l.length; i++) if (sichtbar(l[i])) return true;
    return false;
  }
  function ziel() {
    if (C.hrefSel) { var a = document.querySelector(C.hrefSel); if (a && a.getAttribute("href")) return a.getAttribute("href"); }
    return C.href;
  }
  function bauen() {
    if (el) return;
    var h = ziel();
    if (!h) return;
    el = document.createElement("div");
    el.id = "sticky-cta"; el.setAttribute("role", "region"); el.setAttribute("aria-label", "Schnellzugriff"); el.hidden = true;
    var a = document.createElement("a"); a.href = h; a.textContent = C.label;
    var b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", "Schnellzugriff schließen"); b.textContent = "×";
    el.appendChild(a); el.appendChild(b);
    var st = document.createElement("style");
    st.textContent = "#sticky-cta{position:fixed;left:8px;right:8px;bottom:8px;z-index:60;display:flex;gap:6px;align-items:stretch}#sticky-cta[hidden]{display:none}" +
      "#sticky-cta a{flex:1;display:flex;align-items:center;justify-content:center;text-align:center;min-height:48px;padding:0 12px;border-radius:12px;font:600 15px/1.2 system-ui,Segoe UI,Arial,sans-serif;text-decoration:none;background:" + C.bg + ";color:" + C.fg + ";box-shadow:0 8px 24px rgba(0,0,0,.35)}" +
      "#sticky-cta button{width:48px;min-height:48px;border-radius:12px;border:1px solid rgba(255,255,255,.3);background:rgba(10,10,20,.88);color:#fff;font-size:22px;line-height:1;cursor:pointer}" +
      "@media(min-width:641px){#sticky-cta{display:none!important}}@media(prefers-reduced-motion:no-preference){#sticky-cta:not([hidden]){animation:stickyIn .25s ease-out}}@keyframes stickyIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}";
    document.head.appendChild(st);
    document.body.appendChild(el);
    b.addEventListener("click", function () { zu = true; try { sessionStorage.setItem(KEY, "1"); } catch (e) {} zeigen(false); });
  }
  function zeigen(an) {
    if (!el) return;
    if (an) {
      if (!el.hidden) return;
      el.hidden = false; pad0 = document.body.style.paddingBottom; document.body.style.paddingBottom = (el.offsetHeight + 16) + "px";
    } else {
      if (el.hidden) return;
      el.hidden = true; document.body.style.paddingBottom = pad0 || "";
    }
  }
  function pruefen() {
    if (zu) return;
    if (!mq.matches) { zeigen(false); return; }
    bauen();
    zeigen(window.scrollY > 300 && !bannerSichtbar() && !zielSichtbar());
  }
  function t() { if (tick) return; tick = true; window.requestAnimationFrame(function () { tick = false; pruefen(); }); }
  window.addEventListener("scroll", t, { passive: true });
  window.addEventListener("resize", t);
  setInterval(pruefen, 1500);
  pruefen();
})();
