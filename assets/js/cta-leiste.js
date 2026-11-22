/* CTA-Messung + mobile Leiste (Anfrage senden). Sven 17.11.2026.
   - Klick auf a[data-cta-ort] -> GA4 cta_klick {cta_ort, cta_ziel} ueber vfEvent (nur mit Einwilligung, vf-messung.js);
     die Hero-Hauptaktion meldet zusaetzlich hero_anfrage_klick.
   - Leiste (nur <= 640 px): erst wenn der Hero verlassen ist, nicht ueber einem Formular, nicht bei offenem Cookie-Hinweis.
   - Termin-Knopf: VF hat keinen Buchungslink, daher bewusst keiner (Stand 18.11.2026). */
(function () {
  'use strict';
  var S = document.currentScript;
  var HREF = (S && S.getAttribute('data-anfrage')) || '/check-anfrage/';

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[data-cta-ort]');
    if (!a || typeof window.vfEvent !== 'function') return;
    var p = { ort: a.getAttribute('data-cta-ort'), marke: 'versicherungsfuchs', cta_ort: a.getAttribute('data-cta-ort'), cta_ziel: a.getAttribute('data-cta-ziel') || '' };
    try {
      window.vfEvent('cta_klick', p);
      if (p.cta_ort === 'hero') window.vfEvent('hero_anfrage_klick', p);
    } catch (x) { /* Messung darf den Klick nie stoeren */ }
  }, true);

  function start() {
    var mq = window.matchMedia('(max-width:640px)');
    var bar = document.createElement('div');
    bar.id = 'sticky-cta'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Schnellzugriff');
    var a1 = document.createElement('a');
    a1.className = 'btn-primary'; a1.href = HREF; a1.textContent = 'Anfrage senden';
    a1.setAttribute('data-cta-ort', 'leiste-anfrage'); a1.setAttribute('data-cta-ziel', 'anfrage');
    bar.appendChild(a1);
    document.body.appendChild(bar);

    var hero = document.querySelector('.hero, .check-hero, .avd-hero, .pkv-hero, .page-hero, main h1');
    var heroWeg = !hero && window.scrollY > 400, formSichtbar = false;
    function banner() {
      var b = document.querySelector('.vf-cn');
      return !!b && b.classList.contains('is-visible');
    }
    function pruefen() {
      var an = mq.matches && heroWeg && !formSichtbar && !banner();
      bar.classList.toggle('is-on', an);
      document.documentElement.classList.toggle('cta-leiste-an', an);
    }
    if ('IntersectionObserver' in window) {
      if (hero) new IntersectionObserver(function (es) {
        var e = es[es.length - 1];
        heroWeg = !e.isIntersecting && e.boundingClientRect.bottom <= 0; pruefen();
      }).observe(hero);
      var sicht = {};
      var fo = new IntersectionObserver(function (es) {
        es.forEach(function (e) { sicht[e.target.__ctaId] = e.isIntersecting; });
        formSichtbar = Object.keys(sicht).some(function (k) { return sicht[k]; }); pruefen();
      });
      Array.prototype.forEach.call(document.querySelectorAll('main form'), function (f, i) { f.__ctaId = i; fo.observe(f); });
    } else {
      window.addEventListener('scroll', function () { heroWeg = window.scrollY > 400; pruefen(); }, { passive: true });
    }
    setInterval(pruefen, 500); // Cookie-Hinweis wird spaeter ein- und ausgeblendet
    if (mq.addEventListener) mq.addEventListener('change', pruefen);
    pruefen();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
