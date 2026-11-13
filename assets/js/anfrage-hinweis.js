/* Anfrage-Hinweis (C31b): kontextbasierter, nicht blockierender Hinweis. Keine personenbezogenen Daten, kein Cookie.
   Konfiguration: <script defer src=".../anfrage-hinweis.js" data-config="/anfrage-hinweis.json" data-banner="#consent" data-bg="#..." data-fg="#...">
   Regeln (JSON): { "regeln": [ { "id": "...", "pfad": "regex", "term": "regex", "kampagne": "regex", "text": ["Variante A", "Variante B"],
   "cta": "Label", "href": "/ziel", "zeit": 20, "scroll": 40, "exit": true } ] } -- erste passende Regel gewinnt, letzte ohne Filter = Standard. */
(function () {
  "use strict";
  var S = document.currentScript;
  if (!S || !window.fetch) return;
  var CFG = S.getAttribute("data-config") || "", BAN = S.getAttribute("data-banner") || "", BANK = S.getAttribute("data-banner-klasse") || "";
  var BG = S.getAttribute("data-bg") || "#16222e", FG = S.getAttribute("data-fg") || "#ffffff", AKZ = S.getAttribute("data-akzent") || "#f97316", AFG = S.getAttribute("data-akzent-fg") || "#1b1b1f";
  var zu = false, gezeigt = false, el = null;
  /* Kein Storage (§ 25 TDDDG): Frequenzgrenze nur ueber Einstiegsseite (Referrer ausserhalb der eigenen Domain) + Speicher je Seitenaufruf */
  try { if (document.referrer && new URL(document.referrer).host === location.host) return; } catch (e) {}
  var p = location.pathname.toLowerCase(), qs = new URLSearchParams(location.search);
  var term = (qs.get("utm_term") || "").toLowerCase(), kamp = (qs.get("utm_campaign") || "").toLowerCase();
  var mobil = matchMedia("(max-width:767px)").matches;
  function bannerOffen() {
    if (!BAN) return false;
    var b = document.querySelector(BAN); if (!b) return false;
    if (BANK) return b.classList.contains(BANK);
    return !b.hidden && getComputedStyle(b).display !== "none" && getComputedStyle(b).visibility !== "hidden";
  }
  function stickyOffen() { var s = document.getElementById("sticky-cta"); return !!s && !s.hidden && getComputedStyle(s).display !== "none"; }
  function messen(aktion, regel, variante) {
    try { (window.dataLayer = window.dataLayer || []).push({ event: "anfrage_hinweis", ah_aktion: aktion, ah_regel: regel, ah_variante: variante }); } catch (e) {}
    /* cookielose Zaehlung (kein Storage/keine Kennung): nur mit Do-Not-Track/GPC aus; Regel-ID ohne Unterstrich */
    try {
      if (!/^(www\.)?versicherungs-fuchs\.online$/.test(location.hostname)) return; /* MESSHOST */
      var n = navigator; if (n.doNotTrack === "1" || n.globalPrivacyControl || !n.sendBeacon) return;
      var pf = location.pathname.toLowerCase().replace(/\/index\.html$/, "/").replace(/\.html$/, "");
      if (!/^\/[a-z0-9\/-]{0,120}$/.test(pf) || !/^[a-z0-9-]{1,40}$/.test(regel)) return;
      var w = innerWidth;
      n.sendBeacon("https://dashboard.isurance-group.de/api/messung/ereignis", JSON.stringify({ pfad: pf, ereignis: "hinweis_" + aktion, wert: regel + "_" + variante, geraet: w < 768 ? "mobil" : w < 1100 ? "tablet" : "desktop" }));
    } catch (e) {}
  }
  function waehlen(regeln) {
    for (var i = 0; i < regeln.length; i++) {
      var r = regeln[i];
      if (r.pfad && !new RegExp(r.pfad).test(p)) continue;
      if (r.term && !new RegExp(r.term).test(term)) continue;
      if (r.kampagne && !new RegExp(r.kampagne).test(kamp)) continue;
      return r;
    }
    return null;
  }
  fetch(CFG, { credentials: "omit" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (c) {
    if (!c || !c.regeln) return;
    var r = waehlen(c.regeln); if (!r || r.aus) return;
    var texte = [].concat(r.text), vi = Math.random() < 0.5 ? 0 : texte.length > 1 ? 1 : 0, variante = vi ? "B" : "A";
    var text = texte[vi], bereit = false, weit = false, t0 = Date.now();
    function bauen() {
      el = document.createElement("div"); el.id = "anfrage-hinweis"; el.setAttribute("role", "region"); el.setAttribute("aria-label", "Hinweis zur Anfrage"); el.hidden = true;
      var t = document.createElement("p"); t.textContent = text;
      var a = document.createElement("a"); a.href = r.href; a.textContent = r.cta;
      var b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", "Hinweis schließen"); b.textContent = "×";
      el.appendChild(t); el.appendChild(a); el.appendChild(b);
      var st = document.createElement("style");
      st.textContent = "#anfrage-hinweis{position:fixed;left:12px;bottom:12px;z-index:55;max-width:360px;display:grid;grid-template-columns:1fr auto;gap:8px 10px;align-items:center;padding:12px 14px;border-radius:14px;background:" + BG + ";color:" + FG + ";box-shadow:0 10px 30px rgba(0,0,0,.35);font:500 14px/1.35 system-ui,Segoe UI,Arial,sans-serif}" +
        "#anfrage-hinweis[hidden]{display:none}#anfrage-hinweis p{margin:0;grid-column:1/2}#anfrage-hinweis a{grid-column:1/2;justify-self:start;padding:8px 14px;border-radius:10px;background:" + AKZ + ";color:" + AFG + ";font-weight:700;text-decoration:none}" +
        "#anfrage-hinweis button{grid-column:2/3;grid-row:1/2;align-self:start;width:32px;height:32px;border-radius:8px;border:0;background:transparent;color:inherit;font-size:20px;cursor:pointer}" +
        "@media(max-width:767px){#anfrage-hinweis{left:8px;right:8px;max-width:none}}@media(prefers-reduced-motion:no-preference){#anfrage-hinweis:not([hidden]){animation:ahIn .25s ease-out}}@keyframes ahIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}";
      document.head.appendChild(st); document.body.appendChild(el);
      b.addEventListener("click", function () { schliessen(); messen("schliessen", r.id, variante); });
      a.addEventListener("click", function () { messen("klick", r.id, variante); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !el.hidden) { schliessen(); messen("schliessen", r.id, variante); } });
    }
    function schliessen() { zu = true; if (el) el.hidden = true; }
    function zeigen() {
      if (zu || gezeigt || bannerOffen()) return;
      if (!el) bauen();
      el.style.bottom = (stickyOffen() ? 76 : 12) + "px";
      el.hidden = false; gezeigt = true; messen("ausspielung", r.id, variante);
     
    }
    function pruefen() {
      if (zu || gezeigt) return;
      var sek = (Date.now() - t0) / 1000;
      var tief = (scrollY + innerHeight) / document.documentElement.scrollHeight * 100;
      if ((r.zeit && sek >= r.zeit) || (r.scroll && tief >= r.scroll && sek >= 5)) zeigen();
    }
    addEventListener("scroll", pruefen, { passive: true });
    setInterval(pruefen, 1500);
    if (r.exit && !mobil) document.addEventListener("mouseout", function (e) { if (!e.relatedTarget && e.clientY <= 0 && (Date.now() - t0) > 8000) zeigen(); });
  }).catch(function () {});
})();
