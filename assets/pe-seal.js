/* Bewertungs-Chip (Gruppe iSurance, ProvenExpert-Hauptprofil). v6 06.11.2026 (Sven: mobil nur Stern + Zahl, schmal, verdeckt nichts; Desktop unveraendert). v5 (Text-Ausweichen) war messbar nie sichtbar. v4 05.11.2026 (Sven 04.11. 22:44: "klein, erst nach Scrollen").
   Eigenes Element, KEIN Drittanbieter-Aufruf: keine Daten gehen an ProvenExpert, bis der Besucher den Link anklickt.
   Zahlen stammen vom oeffentlichen Profil https://www.provenexpert.com/isurance/ (Stand siehe PE.stand);
   Pflege: /opt/scripts/pe_zahlen_sync.py (--check/--apply). Kein aggregateRating-Schema.
   Einbindung: <script defer src=".../pe-seal.js" data-farbe="#RRGGBB" data-text="#RRGGBB"></script>
   Styles per CSSOM (kein <style>-Element), damit strenge CSP (style-src) nicht blockt. position:fixed -> kein CLS.
   v4: nur noch kleiner Chip (Stern + Note), ueberall gleich. Erscheint erst, wenn der erste Bildschirm weggescrollt ist.
   Bleibt anklickbar. Wird ausgeblendet, solange er ein Cookie-/Einwilligungs-Banner oder eine Dialog-Ebene ueberdecken wuerde.
   v6: unter 900 px nur Stern + Zahl (11 px), im Seitenfluss am Ende (Footer) statt schwebend, damit nichts verdeckt wird.
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

    /* Kandidaten: alle sichtbaren fixed/sticky-Elemente (Banner, Leisten, Dialoge), Liste wird alle 1,2 s neu aufgebaut */
    var kand = [];
    function sammeln() {
      var k = [], all = document.body.getElementsByTagName("*");
      for (var i = 0; i < all.length; i++) {
        var e = all[i];
        if (e === a || a.contains(e) || e.contains(a)) continue;
        var cs = getComputedStyle(e);
        if ((cs.position === "fixed" || cs.position === "sticky") && cs.display !== "none" && cs.visibility !== "hidden" && parseFloat(cs.opacity) !== 0) k.push(e);
      }
      kand = k;
    }
    function verdeckt() {
      var r = a.getBoundingClientRect();
      for (var i = 0; i < kand.length; i++) {
        var b = kand[i].getBoundingClientRect();
        if (b.width < 2 || b.height < 2) continue;
        if (b.left < r.right + 6 && b.right > r.left - 6 && b.top < r.bottom + 6 && b.bottom > r.top - 6) return true;
      }
      return false;
    }
    var sichtbar = null;
    function pruefen() {
      var mobil = window.innerWidth < 900;
      var sv = a.firstChild; if (sv && sv.setAttribute) { var sz = mobil ? "11" : "13"; sv.setAttribute("width", sz); sv.setAttribute("height", sz); }
      if (mobil) {
        /* v6: unter 900 px NICHT schwebend (Messung 06.11.: v5 mit Text-Ausweichen war nie sichtbar). Der Chip steht im Fluss am Seitenende
           (im Footer), verdeckt damit nichts und bleibt anklickbar. */
        if (!a.__statisch) { (document.querySelector("footer") || document.body).appendChild(a); a.__statisch = true; }
        st.position = "static"; st.display = "inline-flex"; st.margin = "10px 16px 18px"; st.left = ""; st.bottom = ""; st.zIndex = "auto";
        st.padding = "3px 7px"; st.gap = "4px"; st.font = "700 11px/1 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
        st.opacity = "1"; st.visibility = "visible"; st.pointerEvents = "auto"; st.transition = "none";
        sichtbar = null; return;
      }
      if (a.__statisch) {   /* zurueck zum schwebenden Desktop-Chip */
        document.body.appendChild(a); a.__statisch = false;
        st.position = "fixed"; st.margin = "0"; st.zIndex = "30"; st.opacity = "0"; st.visibility = "hidden"; st.pointerEvents = "none";
        if (!reduziert) st.transition = "opacity .25s ease";
        sichtbar = null;
      }
      st.bottom = "14px"; st.left = "12px"; st.padding = "4px 9px"; st.gap = "5px";
      st.font = "700 12px/1 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
      var soll = (window.pageYOffset || document.documentElement.scrollTop || 0) > window.innerHeight * 0.9;
      if (soll) soll = !verdeckt();
      if (soll === sichtbar) return;
      sichtbar = soll;
      if (soll) { st.visibility = "visible"; st.pointerEvents = "auto"; st.opacity = "1"; }
      else { st.opacity = "0"; st.pointerEvents = "none"; st.visibility = "hidden"; }
    }
    sammeln(); pruefen();
    window.addEventListener("scroll", pruefen, { passive: true });
    window.addEventListener("resize", pruefen, { passive: true });
    setInterval(function () { sammeln(); pruefen(); }, 1200);   /* Banner kann spaeter erscheinen/verschwinden */
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bauen);
  else bauen();
})();
