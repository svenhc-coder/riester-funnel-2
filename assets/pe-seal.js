/* Schwebendes Bewertungssiegel (Gruppe iSurance, ProvenExpert-Hauptprofil). 03.11.2026.
   Eigenes Element, KEIN Drittanbieter-Aufruf: keine Daten gehen an ProvenExpert, bis der Besucher den Link anklickt.
   Zahlen stammen vom oeffentlichen Profil https://www.provenexpert.com/isurance/ (Stand siehe PE.stand);
   bei neuem Stand nur diese Konstante und das Datum anpassen. Kein aggregateRating-Schema.
   Einbindung: <script defer src=".../pe-seal.js" data-farbe="#RRGGBB" data-text="#RRGGBB"></script>
   Styles per CSSOM (kein <style>-Element), damit strenge CSP (style-src) nicht blockt. position:fixed -> kein CLS. */
(function () {
  "use strict";
  var PE = { n: 146, s: "4,91", stand: "03.11.2026", url: "https://www.provenexpert.com/isurance/" };
  if (window.__peSeal) return;
  window.__peSeal = 1;
  var tag = document.currentScript || document.querySelector('script[src*="pe-seal.js"]');
  var bg = (tag && tag.getAttribute("data-farbe")) || "#000070";
  var fg = (tag && tag.getAttribute("data-text")) || "#ffffff";
  var NS = "http://www.w3.org/2000/svg";
  function bauen() {
    if (document.querySelector(".pe-seal")) return;
    var a = document.createElement("a");
    a.className = "pe-seal";
    a.href = PE.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", "Kundenbewertungen der iSurance Gruppe auf ProvenExpert: " + PE.s + " von 5, " + PE.n + " Bewertungen, Stand " + PE.stand);
    a.title = "Bewertungen der iSurance Gruppe auf ProvenExpert, Stand " + PE.stand;
    var st = a.style;
    st.position = "fixed"; st.left = "16px"; st.bottom = "16px"; st.zIndex = "40";
    st.display = "none"; st.alignItems = "center"; st.gap = "10px";
    st.padding = "9px 14px"; st.borderRadius = "14px";
    st.background = bg; st.color = fg; st.textDecoration = "none";
    st.font = "600 13px/1.25 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
    st.boxShadow = "0 6px 22px rgba(0,0,0,.28)"; st.maxWidth = "230px";
    var stars = document.createElementNS(NS, "svg");
    stars.setAttribute("viewBox", "0 0 60 12"); stars.setAttribute("width", "60"); stars.setAttribute("height", "12");
    stars.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 5; i++) {
      var p = document.createElementNS(NS, "path");
      p.setAttribute("d", "M6 .7l1.6 3.4 3.7.5-2.7 2.6.7 3.7L6 9.1 2.7 10.9l.7-3.7L.7 4.6l3.7-.5z");
      p.setAttribute("transform", "translate(" + i * 12 + ")");
      p.setAttribute("fill", "currentColor");
      stars.appendChild(p);
    }
    var t = document.createElement("span");
    t.style.display = "block";
    var l1 = document.createElement("b");
    l1.textContent = PE.s + " / 5";
    l1.style.cssText = "display:block;font-size:15px";
    var l2 = document.createElement("span");
    l2.textContent = PE.n + " Bewertungen";
    l2.style.cssText = "display:block;font-weight:500;opacity:.92";
    var l3 = document.createElement("span");
    l3.textContent = "ProvenExpert · Gruppe iSurance";
    l3.style.cssText = "display:block;font-weight:500;font-size:11px;opacity:.8";
    t.appendChild(l1); t.appendChild(l2); t.appendChild(l3);
    var box = document.createElement("span");
    box.style.display = "block";
    box.appendChild(stars); box.appendChild(t);
    a.appendChild(box);
    document.body.appendChild(a);
    function anpassen() { st.display = window.innerWidth >= 900 ? "flex" : "none"; }
    anpassen();
    window.addEventListener("resize", anpassen, { passive: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bauen);
  else bauen();
})();
