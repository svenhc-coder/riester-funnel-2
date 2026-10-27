/* Startseite: drei wechselnde Texte im Haupt-Knopf (Hero), alle fuehren in den Riester-Check (27.10.2026, Task 93d59f22).
   Alle drei Texte stehen im Knopf (uebereinanderliegend), die Breite bleibt gleich: kein Layoutsprung. Ohne JS bleibt der erste Text.
   Barrierefreiheit: kein Wechsel bei prefers-reduced-motion; Pause bei Maus/Fokus; nach zwei Durchlaeufen bleibt der erste Text
   stehen (WCAG 2.2.2). Unsichtbare Texte sind per visibility:hidden aus dem Zugriffsbaum, Screenreader lesen nur den aktuellen. */
(function () {
  'use strict';
  var k = document.querySelector('[data-vf-rotieren]');
  if (!k) return;
  var t = [].slice.call(k.children);
  if (t.length < 2) return;
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
  var i = 0, schritte = 0, max = t.length * 2, pause = false, timer = null;
  function weiter() {
    if (pause) return;
    t[i].classList.remove('is-aktiv');
    schritte++;
    i = schritte >= max ? 0 : (i + 1) % t.length;
    t[i].classList.add('is-aktiv');
    if (schritte >= max) { clearInterval(timer); }
  }
  timer = setInterval(weiter, 4500);
  function an() { pause = true; }
  function aus() { pause = false; }
  k.addEventListener('mouseenter', an); k.addEventListener('mouseleave', aus);
  k.addEventListener('focus', an); k.addEventListener('blur', aus);
})();
