/* Probe-Weg fuer Conversion-Tests: ?conv_probe=<Token>. Nur der SHA-256 des Tokens steht hier (Klartext in .env).
   Bei gueltigem Token: GA4 debug_mode (DebugView) und Lead als Test (testlead=1 wird der URL ergaenzt).
   Aendert nichts fuer normale Besucher. Risiko bei Missbrauch: eine Test-Conversion. */
(function () {
  "use strict";
  var HASH = "649bd9518d0dc993e63c83dec0f86b8a14c16e645a6b1d06edca0710dbb60531";
  var t;
  try { t = new URLSearchParams(location.search).get("conv_probe"); } catch (e) { return; }
  if (!t || !window.crypto || !crypto.subtle || !window.TextEncoder) return;
  crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)).then(function (buf) {
    var hex = Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    if (hex !== HASH) return;
    window.__convProbe = true;
    try {
      var u = new URL(location.href);
      if (u.searchParams.get("testlead") !== "1") { u.searchParams.set("testlead", "1"); history.replaceState(null, "", u.pathname + u.search + u.hash); }
    } catch (e) {}
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ debug_mode: true, event: "conv_probe" });
      if (typeof window.gtag === "function") window.gtag("set", "debug_mode", true);
    } catch (e) {}
  });
})();
