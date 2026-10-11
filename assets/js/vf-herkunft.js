/* Herkunft im Lead (11.10.2026, P0-2 / Fix E, _briefings/ADS-LANDINGPAGES-CRO-GCLID-2026-10-11.md).
   window.vfHerkunft() -> { gclid?, gbraid?, wbraid?, utm?, landing_page, einwilligung_marketing? }
   Die Formularseiten legen das Ergebnis in extra des POST an /api/lead; das Backend reicht es an die
   Dashboard-Lead-Bridge weiter (crm.lead.gclid, utm_*, landing_page, payload.ads_consent).
   - Klick-IDs (gclid/gbraid/wbraid): immer aus der Adresse der aktuellen Seite. Ueber Seitenwechsel hinweg
     (Check -> Ergebnis/Anfrage) nur mit Marketing-Einwilligung: sessionStorage vf_klick, Erstkontakt gewinnt.
     Ohne Einwilligung wird nichts gemerkt; ein Widerruf loescht vf_klick.
   - utm: aktuelle Adresse, sonst vf_utm (legen vf-checks.js / versicherungs-check bereits ab; hier ergaenzt,
     falls es noch fehlt - gleiche Form {source, medium, campaign, content, term}).
   - landing_page: Einstiegsseite der Sitzung (vf_landing, nur Pfad, wie vf-checks.js) als Adresse ohne Query.
   - einwilligung_marketing: localStorage vf_cookie_consent (cookie-notice.js) 'accepted' -> true,
     'necessary' -> false, noch nicht entschieden -> weggelassen (das Dashboard leitet nie aus der Klick-ID ab).
   Ruft nichts im Netz auf und setzt keine Cookies. */
(function () {
  'use strict';
  var IDS = ['gclid', 'gbraid', 'wbraid'], UTM = ['source', 'medium', 'campaign', 'content', 'term'];

  function sitzung() { try { return window.sessionStorage || null; } catch (e) { return null; } }
  function lies(k) { var s = sitzung(); try { return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function schreib(k, v) { var s = sitzung(); try { if (s) s.setItem(k, v); } catch (e) { /* gesperrt */ } }
  function loesch(k) { var s = sitzung(); try { if (s) s.removeItem(k); } catch (e) { /* gesperrt */ } }
  function json(k) { try { var o = JSON.parse(lies(k) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }

  function marketing() {
    try {
      var c = window.localStorage.getItem('vf_cookie_consent');
      return c === 'accepted' ? true : (c === 'necessary' ? false : undefined);
    } catch (e) { return undefined; }
  }
  function klickId(v) { return v ? String(v).replace(/[^\w.-]/g, '').slice(0, 200) : ''; }
  function param() { try { return new URLSearchParams(location.search); } catch (e) { return null; } }

  // Werte dieses Seitenaufrufs (nur im Speicher)
  var p = param(), hier = {}, utmHier = {};
  if (p) {
    IDS.forEach(function (k) { var v = klickId(p.get(k)); if (v) hier[k] = v; });
    UTM.forEach(function (k) { var v = p.get('utm_' + k); if (v) utmHier[k] = String(v).slice(0, 160); });
  }

  // Sitzungs-Kontext wie vf-checks.js (nicht personenbezogen): erste Seite + erste utm
  if (!lies('vf_landing')) schreib('vf_landing', location.pathname);
  if (Object.keys(utmHier).length && !lies('vf_utm')) schreib('vf_utm', JSON.stringify(utmHier));

  // Klick-IDs nur mit Einwilligung ueber Seitenwechsel tragen
  function merken() {
    var m = marketing();
    if (m === false) { loesch('vf_klick'); return; }
    if (m === true && Object.keys(hier).length && !lies('vf_klick')) schreib('vf_klick', JSON.stringify(hier));
  }
  merken();
  try { window.addEventListener('vf-consent', merken); } catch (e) { /* alt */ }

  window.vfHerkunft = function () {
    var r = {};
    try {
      var m = marketing(), gemerkt = m === true ? json('vf_klick') : {};
      IDS.forEach(function (k) { var v = klickId(gemerkt[k]) || hier[k]; if (v) r[k] = v; });
      var u = Object.keys(utmHier).length ? utmHier : json('vf_utm'), utm = {};
      UTM.forEach(function (k) { if (u[k]) utm[k] = String(u[k]).slice(0, 160); });
      if (Object.keys(utm).length) r.utm = utm;
      var pfad = lies('vf_landing') || location.pathname;
      if (typeof pfad !== 'string' || pfad.charAt(0) !== '/') pfad = location.pathname;
      r.landing_page = (location.origin + pfad.split('?')[0].split('#')[0]).slice(0, 500);
      if (typeof m === 'boolean') r.einwilligung_marketing = m;
    } catch (e) { /* nie den Lead blockieren */ }
    return r;
  };
})();
