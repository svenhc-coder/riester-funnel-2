/* VersicherungsFuchs — Cyber-Einstieg (Task 7d36201b, 08.10.2026).
   Misst den Absprung zu den Werkzeugen auf cyberpolicen.com als GA4-Ereignis "cyber_weiter"
   (werkzeug = ampel | radar, position = hero | ende). Kein Key Event: der Lead entsteht erst auf
   cyberpolicen.com und kommt dort mit utm_source=versicherungsfuchs im Dashboard an.
   Ohne Einwilligung geht das Ereignis als cookieloser Ping raus (Consent Mode advanced, vf-messung.js). */
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[data-vf-cyber]') : null;
    if (!a || typeof window.vfEvent !== 'function') return;
    try {
      window.vfEvent('cyber_weiter', {
        werkzeug: a.getAttribute('data-vf-cyber') || '',
        position: a.getAttribute('data-pos') || '',
        transport_type: 'beacon'
      });
    } catch (x) { /* Messung darf den Klick nie aufhalten */ }
  });
})();
