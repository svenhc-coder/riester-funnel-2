/* VersicherungsFuchs Cookie-Hinweis - TDDDG-konform (§ 25 TDDDG, DSK 2023).
   - "Nur notwendige" und "Alle akzeptieren" gleichberechtigt auf der ersten Ebene
   - Eine Stufe: Marketing (Google Ads Conversion-Messung + Google Analytics 4) - Consent Mode BASIC (12.10.2026,
     Sven, Task a0d3d60a): assets/js/vf-messung.js laedt die Google-Tags erst nach "Alle akzeptieren" (Ereignis
     'vf-consent'); vorher geht kein Aufruf an Google. Alle gtag-Aufrufe macht vf-messung.js, nicht diese Datei.
   - Persistenz: localStorage 'vf_cookie_consent' = 'accepted' | 'necessary', Zeitpunkt in 'vf_cookie_consent_at';
     nach 12 Monaten wird erneut gefragt (so steht es in der Datenschutzerklaerung, Abschnitt 3).
   - Widerruf (Art. 7 Abs. 3 DSGVO): Link mit class="vf-cn-trigger" ("Cookie-Einstellungen" in der Fusszeile jeder Seite)
     -> Wahl loeschen, Ereignis 'vf-consent-widerruf' (vf-messung.js: consent denied, ga-disable, Google-Cookies loeschen),
     Hinweis sofort wieder zeigen. Kein Neuladen noetig.
   Tastatur (11.10.2026, Audit WCAG 2.4.3): Der Hinweis steht direkt nach dem Skip-Link am Anfang des <body>, also frueh
   in der Tab-Reihenfolge; Esc im Hinweis = "Nur notwendige"; nach der Wahl springt der Fokus auf den Skip-Link. */
(function () {
  'use strict';

  var KEY = 'vf_cookie_consent', KEY_AT = 'vf_cookie_consent_at', JAHR = 365 * 24 * 3600 * 1000;
  var BOX = null;

  function loeschen() {
    try { localStorage.removeItem(KEY); localStorage.removeItem(KEY_AT); } catch (e) {}
  }
  function readConsent() {
    try {
      var v = localStorage.getItem(KEY);
      if (v !== 'accepted' && v !== 'necessary') return null;
      var at = parseInt(localStorage.getItem(KEY_AT) || '', 10);
      if (!at) { localStorage.setItem(KEY_AT, String(Date.now())); return v; }   // Wahl von vor dem 12.10.2026
      if (Date.now() - at > JAHR) { loeschen(); return null; }
      return v;
    } catch (e) { return null; }
  }
  function writeConsent(v) {
    try { localStorage.setItem(KEY, v); localStorage.setItem(KEY_AT, String(Date.now())); } catch (e) {}
  }
  function melde(name) {
    try { window.dispatchEvent(new Event(name)); } catch (e) {}
  }
  function build() {
    var el = document.createElement('div');
    el.className = 'vf-cn';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', 'vf-cn-title');
    el.setAttribute('aria-describedby', 'vf-cn-desc');
    /* 12.10.2026 BASIC: Text beschreibt genau das Verhalten - ohne Zustimmung wird Google gar nicht geladen. */
    el.innerHTML = ''
      + '<div class="vf-cn__inner">'
      + '  <h2 id="vf-cn-title" class="vf-cn__title">Cookies &amp; Datenschutz</h2>'
      + '  <p id="vf-cn-desc" class="vf-cn__body">'
      + '    Mit Ihrer Zustimmung laden wir Google Analytics (Statistik) und die Anzeigen-Messung von Google Ads;'
      + '    dabei setzt Google Cookies und erhält Angaben zu Ihrem Besuch.'
      + '    Ohne Zustimmung laden wir keine Google-Dienste und setzen keine Analyse- oder Werbe-Cookies.'
      + '    Ihre Wahl können Sie jederzeit über „Cookie-Einstellungen“ im Fußbereich ändern. Details in der'
      + '    <a href="/datenschutz">Datenschutzerklärung</a>.'
      + '  </p>'
      + '  <div class="vf-cn__actions">'
      + '    <button type="button" class="vf-cn__btn vf-cn__btn--accept" data-vf-cn="accept">Alle akzeptieren</button>'
      + '    <button type="button" class="vf-cn__btn vf-cn__btn--reject" data-vf-cn="reject">Nur notwendige</button>'
      + '  </div>'
      + '</div>';
    return el;
  }
  function waehle(a) {
    if (a === 'accept') { writeConsent('accepted'); melde('vf-consent'); }
    else { writeConsent('necessary'); melde('vf-consent-widerruf'); }
    hide();
  }
  function show(fokus) {
    if (BOX) return;
    BOX = build();
    var skip = document.querySelector('.vf-skip');
    document.body.insertBefore(BOX, skip ? skip.nextSibling : document.body.firstChild);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { if (BOX) BOX.classList.add('is-visible'); });
    });
    BOX.addEventListener('click', function (e) {
      var t = e.target && e.target.closest && e.target.closest('[data-vf-cn]');
      if (t) waehle(t.getAttribute('data-vf-cn'));
    });
    BOX.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      e.preventDefault(); waehle('reject');
    });
    if (fokus) { var b = BOX.querySelector('button'); if (b) try { b.focus({ preventScroll: true }); } catch (err) { b.focus(); } }
  }
  function hide() {
    if (!BOX) return;
    var box = BOX;
    if (box.contains(document.activeElement)) {
      var ziel = document.querySelector('.vf-skip') || document.querySelector('main');
      if (ziel) { if (!ziel.hasAttribute('tabindex') && ziel.tagName === 'MAIN') ziel.setAttribute('tabindex', '-1'); try { ziel.focus({ preventScroll: true }); } catch (err) { ziel.focus(); } }
    }
    box.classList.remove('is-visible');
    BOX = null;
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 320);
  }
  function init() {
    if (readConsent()) return;
    show(false);
  }
  function bindReset() {
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest && e.target.closest('.vf-cn-trigger');
      if (!t) return;
      e.preventDefault();
      loeschen();
      melde('vf-consent-widerruf');
      show(true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); bindReset(); });
  } else { init(); bindReset(); }
})();
/* window.vfAdsConversion steht seit 12.10.2026 in assets/js/vf-messung.js (nur mit Einwilligung, einmal je Lead). */
