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
   Ruft nichts im Netz auf und setzt keine Cookies.

   11.10.2026 (Sven, _briefings/EINWILLIGUNG-ADS-MESSUNG-FORMULAR-2026-10-11.md; Text-Entwurf, der Anwalt prueft vor dem
   Live-Gang): freiwilliges Haekchen zur Werbe-Erfolgsmessung in jedem Lead-Formular.
   - Platzhalter <div data-vf-werbung="ID"></div> direkt ueber dem Absende-Knopf; vfWerbungEinbauen(wurzel) fuellt ihn
     (bei DOMContentLoaded automatisch, Seiten mit per JS gebauten Formularen rufen es nach dem Aufbau selbst auf).
   - Nie Pflicht, nie vorausgewaehlt, speichert nichts auf dem Geraet, wirkt nur auf diese Anfrage.
   - vfHerkunft(formular) liest das Haekchen dieses Formulars: einwilligung_marketing = true, wenn Haekchen gesetzt ODER
     Banner 'accepted'; false nur ohne Haekchen bei 'necessary'; sonst weggelassen (vfEinwilligungFuerAnfrage).
   - Einwilligungsnachweis (Art. 7 Abs. 1 DSGVO): einwilligung_quelle = 'formular' | 'banner' | 'formular,banner' (nur bei
     einwilligung_marketing true); enthaelt sie 'formular', zusaetzlich einwilligung_marketing_text (exakter sichtbarer
     Wortlaut ohne HTML, aus EINWILLIGUNG_TEXT - derselben Konstante, aus der das Haekchen gebaut wird) und
     einwilligung_marketing_version ('2026-10'). */
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

  // Freiwilliges Haekchen (11.10.2026): Regel und Formular-Wert
  var HAEKCHEN = 'einwilligung_werbung';
  function einwilligungFuerAnfrage(haekchen, banner) {
    if (haekchen === true) return true;
    if (banner === true) return true;
    if (banner === false) return false;
    return undefined;
  }
  function haekchenAus(quelle) {
    if (quelle === true || quelle === false) return quelle;
    try {
      var el = quelle && quelle.querySelector ? quelle.querySelector('input[name="' + HAEKCHEN + '"]') : null;
      return !!(el && el.checked);
    } catch (e) { return false; }
  }
  window.vfEinwilligungFuerAnfrage = einwilligungFuerAnfrage;

  function einwilligungQuelle(haekchen, banner) {
    var teile = [];
    if (haekchen === true) teile.push('formular');
    if (banner === true) teile.push('banner');
    return teile.length ? teile.join(',') : undefined;
  }
  window.vfEinwilligungQuelle = einwilligungQuelle;

  // Wortlaut: EINE Konstante fuer Anzeige und Nachweis (Text-Entwurf, der Anwalt prueft). Neue Fassung = neue Version.
  var EINWILLIGUNG_VERSION = '2026-10';
  var EINWILLIGUNG_TEXT = {
    einleitung: 'Freiwillig:',
    kern: 'Meine Anfrage darf zur Erfolgsmessung unserer Google-Werbung genutzt werden. Dazu übermitteln wir Google die '
      + 'Klick-Kennung meines Anzeigenklicks und, falls vorhanden, meine E-Mail-Adresse und Telefonnummer in verschlüsselter '
      + '(gehashter) Form. Die Beratung hängt nicht davon ab. Widerruf jederzeit per E-Mail.',
    link: 'Mehr in der Datenschutzerklärung'
  };
  var EINWILLIGUNG_KLARTEXT = (EINWILLIGUNG_TEXT.einleitung + ' ' + EINWILLIGUNG_TEXT.kern + ' ' + EINWILLIGUNG_TEXT.link).slice(0, 1000);
  window.vfEinwilligungText = { text: EINWILLIGUNG_KLARTEXT, version: EINWILLIGUNG_VERSION };
  var WERBUNG_TEXT = '<strong>' + EINWILLIGUNG_TEXT.einleitung + '</strong> ' + EINWILLIGUNG_TEXT.kern + ' '
    + '<a href="/datenschutz#google-ads-anfragen" target="_blank" rel="noopener">' + EINWILLIGUNG_TEXT.link + '</a>';
  var WERBUNG_STIL = '.vf-werbung{display:flex;gap:.6rem;align-items:flex-start;flex:0 0 100%;width:100%;box-sizing:border-box;'
    + 'margin:.75rem 0 .25rem;text-align:left;font-size:.8rem;line-height:1.5;color:inherit}'
    + '.vf-werbung input[type=checkbox]{flex:0 0 auto;width:20px;height:20px;min-width:20px;margin:.1rem 0 0;padding:0;'
    + 'accent-color:var(--primary,#f97316);cursor:pointer}'
    + '.vf-werbung label{margin:0;font-weight:400;cursor:pointer;color:inherit}'
    + '.vf-werbung a{color:inherit;text-decoration:underline;text-underline-offset:2px}'
    + '.vf-werbung input[type=checkbox]:focus-visible,.vf-werbung a:focus-visible{outline:2px solid var(--primary,#f97316);'
    + 'outline-offset:2px;border-radius:2px}';
  function stil() {
    if (typeof document === 'undefined' || document.getElementById('vf-werbung-stil')) return;
    var s = document.createElement('style');
    s.id = 'vf-werbung-stil';
    s.textContent = WERBUNG_STIL;
    (document.head || document.documentElement).appendChild(s);
  }
  /** Fuellt alle noch leeren Platzhalter [data-vf-werbung] unterhalb von wurzel (Standard: ganze Seite). */
  function einbauen(wurzel) {
    if (typeof document === 'undefined') return;
    var d = wurzel && wurzel.querySelectorAll ? wurzel : document;
    try {
      var plaetze = d.querySelectorAll('[data-vf-werbung]');
      if (!plaetze.length) return;
      stil();
      for (var i = 0; i < plaetze.length; i++) {
        var p = plaetze[i];
        if (p.getAttribute('data-vf-werbung-fertig')) continue;
        var id = String(p.getAttribute('data-vf-werbung') || 'vf-werbung').replace(/[^\w-]/g, '') || 'vf-werbung';
        p.className = (p.className ? p.className + ' ' : '') + 'vf-werbung';
        p.innerHTML = '<input type="checkbox" id="' + id + '" name="' + HAEKCHEN + '" value="ja">'
          + '<label for="' + id + '">' + WERBUNG_TEXT + '</label>';
        p.setAttribute('data-vf-werbung-fertig', '1');
      }
    } catch (e) { /* ohne Haekchen bleibt das Formular voll nutzbar */ }
  }
  window.vfWerbungEinbauen = einbauen;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { einbauen(); });
    else einbauen();
  }

  window.vfHerkunft = function (formular) {
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
      var hk = haekchenAus(formular), ew = einwilligungFuerAnfrage(hk, m);
      if (typeof ew === 'boolean') r.einwilligung_marketing = ew;
      var quelle = ew === true ? einwilligungQuelle(hk, m) : undefined;
      if (quelle) {
        r.einwilligung_quelle = quelle;
        if (quelle.split(',').indexOf('formular') !== -1) {
          r.einwilligung_marketing_text = EINWILLIGUNG_KLARTEXT;
          r.einwilligung_marketing_version = EINWILLIGUNG_VERSION;
        }
      }
    } catch (e) { /* nie den Lead blockieren */ }
    return r;
  };
})();
