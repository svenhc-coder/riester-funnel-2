/* VersicherungsFuchs — Cyber-Einstieg (Task 7d36201b, 08.10.2026).
   1) Misst den Absprung zu den Werkzeugen auf cyberpolicen.com als GA4-Ereignis "cyber_weiter"
      (werkzeug = ampel | radar, position = hero | ende). Kein Key Event: der Lead entsteht erst auf
      cyberpolicen.com und kommt dort mit utm_source=versicherungsfuchs im Dashboard an.
      Ohne Einwilligung geht das Ereignis als cookieloser Ping raus (Consent Mode advanced, vf-messung.js).
   2) Gestaffelter Reveal (.cy-reveal) und Scroll-Fortschrittsbalken (.cy-fortschritt), nur GPU-Eigenschaften.
      Die Klasse cy-js setzt ein Inline-Skript im <head>; laeuft diese Datei nicht, nimmt es sie nach 3 s zurueck. */
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

  window.cyRevealOk = true;
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var bloecke = document.querySelectorAll('.cy-reveal');
  if (still || !('IntersectionObserver' in window)) {
    for (var i = 0; i < bloecke.length; i++) bloecke[i].classList.add('cy-sichtbar');
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('cy-sichtbar'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    for (var j = 0; j < bloecke.length; j++) io.observe(bloecke[j]);
  }

  var balken = document.querySelector('.cy-fortschritt');
  if (balken && !still) {
    var wartet = false;
    var setze = function () {
      wartet = false;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      balken.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
    };
    window.addEventListener('scroll', function () { if (!wartet) { wartet = true; requestAnimationFrame(setze); } }, { passive: true });
    setze();
  }
})();
