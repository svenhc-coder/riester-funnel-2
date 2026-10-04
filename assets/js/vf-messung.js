/* VersicherungsFuchs — Messung, Consent Mode ADVANCED (05.10.2026, Sven: fuer alle Marken; vorher BASIC seit 16.09.).
   Google Ads (AW-820163824) + Google Analytics 4 (G-VYF5P956SP) laden SOFORT. Ohne Einwilligung bleibt der
   Consent-Status "denied" (consent default im <head>): Google setzt keine Cookies und bekommt nur cookielose Pings
   fuer die Conversion-Modellierung; ads_data_redaction entfernt Klick-Kennungen. Mit Einwilligung
   (localStorage vf_cookie_consent = 'accepted') consent update -> volle Messung. Kein url_passthrough.
   EIN page_view (GA4-config; AW-config mit send_page_view:false — Memory page-view-doppelt-messung-py).
   Schluesselereignisse (in GA4 als Key Events markieren): check_start, submit_lead_form, purchase. */
(function () {
  var AW = 'AW-820163824', GA = 'G-VYF5P956SP', geladen = false;
  function einwilligung() {
    try { return localStorage.getItem('vf_cookie_consent') === 'accepted'; } catch (e) { return false; }
  }
  function lade() {
    if (geladen) return;
    geladen = true;
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') { window.gtag = function () { window.dataLayer.push(arguments); }; }
    /* Sicherung: fehlt der consent default im <head>, hier "denied" setzen, bevor irgendetwas geladen wird */
    var hatDefault = false;
    for (var i = 0; i < window.dataLayer.length; i++) {
      var x = window.dataLayer[i];
      if (x && x[0] === 'consent' && x[1] === 'default') { hatDefault = true; break; }
    }
    if (!hatDefault) {
      window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });
    }
    window.gtag('set', 'ads_data_redaction', true);
    if (einwilligung()) {
      window.gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' });
    }
    window.gtag('js', new Date());
    window.gtag('config', AW, { send_page_view: false });
    window.gtag('config', GA);
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + AW;
    document.head.appendChild(s);
  }
  /* Ereignisse gehen auch ohne Einwilligung raus - dann als cookieloser Ping (Consent Mode advanced) */
  window.vfEvent = function (name, params) {
    lade();
    try { window.gtag('event', name, params || {}); } catch (e) {}
  };
  window.addEventListener('vf-consent', lade);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lade); else lade();
})();
