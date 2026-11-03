/* Schwebendes Bewertungssiegel (Gruppe iSurance, ProvenExpert-Hauptprofil). v2 03.11.2026.
   Eigenes Element, KEIN Drittanbieter-Aufruf: keine Daten gehen an ProvenExpert, bis der Besucher den Link anklickt.
   Zahlen stammen vom oeffentlichen Profil https://www.provenexpert.com/isurance/ (Stand siehe PE.stand);
   Pflege: /opt/scripts/pe_zahlen_sync.py (--check/--apply). Kein aggregateRating-Schema.
   Einbindung: <script defer src=".../pe-seal.js" data-farbe="#RRGGBB" data-text="#RRGGBB"></script>
   Styles per CSSOM (kein <style>-Element), damit strenge CSP (style-src) nicht blockt. position:fixed -> kein CLS.
   Ab 900 px Karte (Sterne, Note, Anzahl, Weiterempfehlung), darunter kleiner Chip (Sterne + Note). */
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
  function sterne(w) {
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 60 12"); s.setAttribute("width", w); s.setAttribute("height", Math.round(w / 5));
    s.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 5; i++) {
      var p = document.createElementNS(NS, "path");
      p.setAttribute("d", STAR); p.setAttribute("transform", "translate(" + i * 12 + ")"); p.setAttribute("fill", "#ffc83d");
      s.appendChild(p);
    }
    return s;
  }
  function zeile(text, css) {
    var e = document.createElement("span");
    e.textContent = text; e.style.cssText = "display:block;" + css;
    return e;
  }
  function bauen() {
    if (document.querySelector(".pe-seal")) return;
    var a = document.createElement("a");
    a.className = "pe-seal";
    a.href = PE.url; a.target = "_blank"; a.rel = "noopener";
    a.title = "Bewertungen der iSurance Gruppe auf ProvenExpert, Stand " + PE.stand;
    var st = a.style;
    st.position = "fixed"; st.left = "16px"; st.bottom = "16px"; st.zIndex = "40";
    st.color = fg; st.textDecoration = "none"; st.background = bg;
    st.font = "600 13px/1.25 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
    st.boxShadow = "0 10px 30px rgba(0,0,0,.30), inset 0 0 0 1px rgba(255,255,255,.18)";

    var karte = document.createElement("span");
    karte.style.cssText = "display:block";
    var kopf = document.createElement("span");
    kopf.style.cssText = "display:flex;align-items:center;gap:8px";
    kopf.appendChild(sterne(80));
    var note = zeile(PE.s, "font-size:22px;font-weight:700;line-height:1;letter-spacing:-.01em");
    kopf.appendChild(note);
    karte.appendChild(kopf);
    karte.appendChild(zeile(PE.n + " Bewertungen" + (PE.rec ? " · " + PE.rec + " % Weiterempfehlung" : ""), "margin-top:6px;font-weight:600"));
    var marke = zeile("auf ProvenExpert · Gruppe iSurance", "margin-top:2px;font-size:11px;font-weight:500");
    karte.appendChild(marke);

    var chip = document.createElement("span");
    chip.style.cssText = "display:none;align-items:center;gap:6px;white-space:nowrap";
    chip.appendChild(sterne(50));
    chip.appendChild(zeile(PE.s, "font-size:13px;font-weight:700"));

    a.appendChild(karte); a.appendChild(chip);
    document.body.appendChild(a);
    function anpassen() {
      var gross = window.innerWidth >= 900;
      karte.style.display = gross ? "block" : "none";
      chip.style.display = gross ? "none" : "flex";
      st.padding = gross ? "12px 16px 11px" : "6px 11px";
      st.borderRadius = gross ? "18px" : "999px";
      st.maxWidth = gross ? "270px" : "none";
      st.bottom = gross ? "16px" : "84px";
      st.left = gross ? "16px" : "10px";
      st.zIndex = gross ? "40" : "30";
    }
    anpassen();
    window.addEventListener("resize", anpassen, { passive: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bauen);
  else bauen();
})();
