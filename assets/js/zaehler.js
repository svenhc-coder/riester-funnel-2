/* Anonyme Seitenstatistik ohne Cookies: kein Storage, keine IP/Kennung, nur Zaehl-Beacon (siehe Datenschutzerklaerung). */
(function () {
  "use strict";
  var AN = false; /* true erst, wenn der Endpunkt live ist (Runde 5) */
  var nav = navigator;
  if (!AN || nav.doNotTrack === "1" || nav.globalPrivacyControl || !nav.sendBeacon || !window.IntersectionObserver) return;
  var EP = "https://dashboard.isurance-group.de/api/messung/ereignis";
  var p = location.pathname.toLowerCase().replace(/\/index\.html$/, "/").replace(/\.html$/, "");
  if (!/^\/[a-z0-9\/-]{0,120}$/.test(p)) return;
  var w = innerWidth, g = w < 768 ? "mobil" : w < 1100 ? "tablet" : "desktop";
  function senden(e, v) { try { nav.sendBeacon(EP, JSON.stringify({ pfad: p, ereignis: e, wert: v || "", geraet: g })); } catch (x) {} }
  var FELD = [["vorname", /vorname|first/], ["nachname", /nachname|last|familienname/], ["email", /mail/], ["telefon", /tel|phone|mobil/],
    ["plz", /plz|zip|postal/], ["sparte", /sparte|branche|produkt/], ["einwilligung", /einwillig|consent|datenschutz|privacy/], ["nachricht", /nachricht|message|anliegen/]];
  function feldName(el) {
    var s = ((el.name || "") + " " + (el.id || "") + " " + (el.getAttribute("autocomplete") || "")).toLowerCase();
    for (var i = 0; i < FELD.length; i++) if (FELD[i][1].test(s)) return FELD[i][0];
    return "";
  }
  var start = false, abgesendet = false, letztes = "", weg = false;
  senden("seite");
  [25, 50, 75, 90].forEach(function (s) {
    var m = document.createElement("i");
    m.setAttribute("aria-hidden", "true");
    m.style.cssText = "position:absolute;left:0;width:1px;height:1px;pointer-events:none;visibility:hidden;top:" + s + "%";
    var h = document.documentElement; if (getComputedStyle(h).position === "static") h.style.position = "relative";
    h.appendChild(m);
    var io = new IntersectionObserver(function (l) { if (l[0].isIntersecting) { senden("scroll", String(s)); io.disconnect(); } });
    io.observe(m);
  });
  addEventListener("focusin", function (e) {
    var t = e.target; if (!t || !t.form || !/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (!start) { start = true; senden("form_start"); }
    var f = feldName(t); if (f) letztes = f;
  });
  addEventListener("submit", function () { abgesendet = true; }, true);
  function gehen() {
    if (weg) return; weg = true;
    if (start && !abgesendet) senden("feld_abbruch", letztes);
    senden("ausstieg");
  }
  addEventListener("pagehide", gehen);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") gehen(); });
})();
