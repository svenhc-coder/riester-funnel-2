/* VersicherungsFuchs — Messung, Consent Mode v2 BASIC (12.10.2026, Sven, Task a0d3d60a; loest ADVANCED vom 05.10. ab).
   Google Ads (AW-820163824) + Google Analytics 4 (G-VYF5P956SP).
   - VOR der Einwilligung geht KEIN Aufruf an Google: kein gtag.js, keine cookielosen Pings. Im <head> steht nur der
     dataLayer-Stub mit consent default "denied".
   - Ereignisse (vfEvent, gtag('event'), Ads-Conversion) gehen nur mit gueltiger Einwilligung in den dataLayer. Was vor
     der Einwilligung eingereiht wurde, wird verworfen - sonst wuerde gtag.js es nach dem Laden nachsenden.
   - Reihenfolge nach "Alle akzeptieren": consent update granted -> js/config -> Loader. Der erste page_view geht damit
     schon mit "granted" raus. GENAU EIN page_view (GA4-config; AW-config mit send_page_view:false).
   - Widerruf (Art. 7 Abs. 3 DSGVO, Ereignis 'vf-consent-widerruf' aus cookie-notice.js): consent update denied,
     geladene Tags per window['ga-disable-<ID>'] stilllegen, Google-Cookies _ga*, _gid, _gat*, _gcl_* und _gcl_ls loeschen.
   - Einwilligung: localStorage vf_cookie_consent = 'accepted' (cookie-notice.js verwaltet Ablauf nach 12 Monaten).
   Schluesselereignisse (in GA4 als Key Events markieren): check_start, submit_lead_form, purchase. */
(function () {
  var AW = 'AW-820163824', GA = 'G-VYF5P956SP', KEY = 'vf_cookie_consent';
  var ok = false, geladen = false, convGesendet = false;
  var dl = window.dataLayer = window.dataLayer || [];

  function einwilligung() {
    try { return localStorage.getItem(KEY) === 'accepted'; } catch (e) { return false; }
  }
  /* Waechter: Ereignisse nur mit Einwilligung; consent/set/js/config duerfen immer in den dataLayer */
  window.gtag = function () {
    if (arguments[0] === 'event' && !ok) return;
    dl.push(arguments);
  };
  function verwerfeEreignisse() {
    for (var i = dl.length - 1; i >= 0; i--) {
      var x = dl[i];
      if (x && (x[0] === 'event' || (typeof x === 'object' && !('length' in x) && x.event))) dl.splice(i, 1);
    }
  }
  function aus(v) { window['ga-disable-' + GA] = v; window['ga-disable-' + AW] = v; }
  function zustand(v) {
    window.gtag('consent', 'update', { ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v });
  }
  function cookiesWeg() {
    var re = /^(_ga|_gid|_gat|_gcl_)/;
    try {
      document.cookie.split(';').forEach(function (c) {
        var n = c.split('=')[0].trim(); if (!re.test(n)) return;
        var x = '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/', t = location.hostname.split('.');
        document.cookie = n + x;
        for (var i = 0; i < t.length - 1; i++) { var d = t.slice(i).join('.'); document.cookie = n + x + ';domain=' + d; document.cookie = n + x + ';domain=.' + d; }
      });
    } catch (e) {}
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (k && re.test(k)) localStorage.removeItem(k); }
    } catch (e) {}
  }
  function lade() {
    if (geladen || !ok) return;
    geladen = true;
    window.gtag('js', new Date());
    window.gtag('config', AW, { send_page_view: false });
    window.gtag('config', GA);
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + AW;
    document.head.appendChild(s);
  }
  function an() {
    if (!einwilligung()) return;
    ok = true; aus(false); zustand('granted'); lade();
  }
  function ab() {
    ok = false; aus(true); zustand('denied'); if (!geladen) verwerfeEreignisse(); cookiesWeg();
    /* gemerkte Anzeigen-Klick-ID (vf-herkunft.js, nur mit Einwilligung gespeichert) sofort mit loeschen */
    try { sessionStorage.removeItem('vf_klick'); } catch (e) {}
  }

  window.vfEvent = function (name, params) {
    if (!ok) return;
    try { window.gtag('event', name, params || {}); } catch (e) {}
  };
  /* Ads-Conversion "Lead": nur mit Einwilligung, hoechstens einmal je Seitenaufruf (ein Lead-Formular je Seite; auf
     /riester-check/result/ geht nach dem Lead ein zweiter /api/lead-Aufruf fuer das Upgrade raus - kein zweiter Lead).
     Ohne Einwilligung wird nichts gemerkt und nichts nachgesendet. Aufruf aus dem fetch-Wrapper der 7 Lead-Seiten. */
  window.vfAdsConversion = function () {
    if (!ok || convGesendet) return;
    convGesendet = true;
    window.gtag('event', 'conversion', { send_to: AW + '/B3c6CLqJ_NgcEPDpiocD', value: 1.0, currency: 'EUR' });
  };

  window.addEventListener('vf-consent', an);
  window.addEventListener('vf-consent-widerruf', ab);
  if (einwilligung()) an(); else { aus(true); verwerfeEreignisse(); }
})();
