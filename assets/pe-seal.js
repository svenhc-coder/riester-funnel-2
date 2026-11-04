/* Bewertungs-Chip (Gruppe iSurance, ProvenExpert-Hauptprofil). v4 05.11.2026 (Sven 04.11. 22:44: "klein, erst nach Scrollen").
   Eigenes Element, KEIN Drittanbieter-Aufruf: keine Daten gehen an ProvenExpert, bis der Besucher den Link anklickt.
   Zahlen stammen vom oeffentlichen Profil https://www.provenexpert.com/isurance/ (Stand siehe PE.stand);
   Pflege: /opt/scripts/pe_zahlen_sync.py (--check/--apply). Kein aggregateRating-Schema.
   Einbindung: <script defer src=".../pe-seal.js" data-farbe="#RRGGBB" data-text="#RRGGBB"></script>
   Styles per CSSOM (kein <style>-Element), damit strenge CSP (style-src) nicht blockt. position:fixed -> kein CLS.
   v4: nur noch kleiner Chip (Stern + Note), ueberall gleich. Erscheint erst, wenn der erste Bildschirm weggescrollt ist.
   Bleibt anklickbar. Wird ausgeblendet, solange er ein Cookie-/Einwilligungs-Banner oder eine Dialog-Ebene ueberdecken wuerde.
   prefers-reduced-motion: ohne Einblend-Animation. Das ORIGINAL-ProvenExpert-Widget (v3) wird nicht mehr geladen. */
(function () {
  "use strict";
  var PE = { n: 146, s: "4,91", stand: "03.11.2026", rec: 100, url: "https://www.provenexpert.com/isurance/" };
  if (window.__peSeal) return;
  window.__peSeal = 1;
  var tag = document.currentScript || document.querySelector('script[src*="pe-seal.js"]');
  var bg = (tag && tag.getAttribute("data-farbe")) || "#000070";
  var fg = (tag && tag.getAttribute("data-text")) || "#ffffff";
  var NS = "http://www.w3.org/2000/svg";
  var STAR = "M6 .7l1.6 3.4 3.7.5-2.7 2.6.7 3.7L6 9.1 2.7 10.9l.7-3.7L.7 4.6l3.7-.5z";
  function stern() {
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 12 12"); s.setAttribute("width", "13"); s.setAttribute("height", "13");
    s.setAttribute("aria-hidden", "true"); s.style.cssText = "display:block;flex:none";
    var p = document.createElementNS(NS, "path");
    p.setAttribute("d", STAR); p.setAttribute("fill", "#ffc83d");
    s.appendChild(p);
    return s;
  }
  function bauen() {
    if (document.querySelector(".pe-seal")) return;
    var a = document.createElement("a");
    a.className = "pe-seal";
    a.href = PE.url; a.target = "_blank"; a.rel = "noopener";
    a.title = "Bewertungen der iSurance Gruppe auf ProvenExpert, Stand " + PE.stand;
    a.setAttribute("aria-label", PE.s + " von 5 Sternen, " + PE.n + " Bewertungen auf ProvenExpert");
    var st = a.style;
    st.position = "fixed"; st.left = "12px"; st.zIndex = "30";
    st.display = "inline-flex"; st.alignItems = "center"; st.gap = "5px"; st.whiteSpace = "nowrap";
    st.padding = "4px 9px"; st.borderRadius = "999px";
    st.color = fg; st.textDecoration = "none"; st.background = bg;
    st.font = "700 12px/1 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
    st.boxShadow = "0 4px 14px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.18)";
    st.opacity = "0"; st.visibility = "hidden"; st.pointerEvents = "none";
    var reduziert = false;
    try { reduziert = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    if (!reduziert) st.transition = "opacity .25s ease";
    a.appendChild(stern());
    var note = document.createElement("span");
    note.textContent = PE.s;
    a.appendChild(note);
    document.body.appendChild(a);

    var SPERR = '[id*="cookie" i],[class*="cookie" i],[id*="consent" i],[class*="consent" i],[role="dialog"],[aria-modal="true"]';
    function verdeckt() {
      var r = a.getBoundingClientRect(), l = document.querySelectorAll(SPERR);
      for (var i = 0; i < l.length; i++) {
        var e = l[i];
        if (e === a || e.contains(a)) continue;
        var cs = getComputedStyle(e);
        if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) continue;
        if (cs.position !== "fixed" && cs.position !== "sticky") continue;
        var b = e.getBoundingClientRect();
        if (b.width < 2 || b.height < 2) continue;
        if (b.left < r.right + 6 && b.right > r.left - 6 && b.top < r.bottom + 6 && b.bottom > r.top - 6) return true;
      }
      return false;
    }
    var sichtbar = null;
    function pruefen() {
      /* mobil bleibt Luft fuer klebende CTA-/Navigationsleisten, am Desktop ganz unten links */
      st.bottom = window.innerWidth >= 900 ? "14px" : "84px";
      var soll = (window.pageYOffset || document.documentElement.scrollTop || 0) > window.innerHeight * 0.9;
      if (soll) soll = !verdeckt();
      if (soll === sichtbar) return;
      sichtbar = soll;
      if (soll) { st.visibility = "visible"; st.pointerEvents = "auto"; st.opacity = "1"; }
      else { st.opacity = "0"; st.pointerEvents = "none"; st.visibility = "hidden"; }
    }
    pruefen();
    window.addEventListener("scroll", pruefen, { passive: true });
    window.addEventListener("resize", pruefen, { passive: true });
    setInterval(pruefen, 1200);   /* Banner kann spaeter erscheinen/verschwinden */
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bauen);
  else bauen();
})();
