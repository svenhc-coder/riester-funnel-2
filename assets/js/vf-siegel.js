/* VersicherungsFuchs — ProvenExpert-PRO-Siegel in VF-CI (15.09.2026, Standard wie auf allen Marken, trust.py):
   Container rechts unten, ab 900 px, erst sichtbar unter dem Kopfbereich; Widget-ID = iSurance-Profil (5 Marken).
   Ohne JS/vor dem Laden steht der Profil-Link.
   11.10.2026 (Audit): Das PE-Skript (98 KB, neben dem Google-Tag die CPU-Hauptlast im Mobil-Lauf) laedt erst, wenn das
   Siegel eingeblendet wird und der Browser frei ist (requestIdleCallback) - nicht mehr bei jedem Seitenaufruf ab 900 px.
   Ausgeblendet ist es inert (kein unsichtbarer Tab-Stopp). Ein Schliessen-Knopf blendet es fuer die Sitzung aus, weil es
   beim Scrollen Inhalte ueberdeckte. */
(function () {
  var WIDGET = 'e4d41697-b61a-483f-9e11-4b1da4244d2a', geladen = false, geplant = false, ZU = 'vf_siegel_zu';
  function zu() { try { return sessionStorage.getItem(ZU) === '1'; } catch (e) { return false; } }
  function init() {
    var el = document.getElementById('proSealWidget'); if (!el || geladen || innerWidth < 900) return; geladen = true;
    var wrap = el.parentElement, fb = wrap && wrap.querySelector('.vf-pe-fallback');
    function fertig() { if (el.children.length && fb) fb.style.display = 'none'; }
    window.loadProSeal = function () {
      if (window.provenExpert && window.provenExpert.proSeal) {
        window.provenExpert.proSeal({ widgetId: WIDGET, language: 'de-DE', usePageLanguage: false, bannerColor: '#f97316', textColor: '#FFFFFF',
          showBackPage: false, showReviews: false, hideDate: true, hideName: false, googleStars: false, displayReviewerLastName: false, embeddedSelector: '#proSealWidget' });
        if ('MutationObserver' in window) new MutationObserver(fertig).observe(el, { childList: true }); setTimeout(fertig, 2500);
      }
    };
    var s = document.createElement('script'); s.src = 'https://s.provenexpert.net/seals/proseal-v2.js'; s.async = true;
    s.onload = window.loadProSeal; document.head.appendChild(s);   // bei Fehler (Blocker) bleibt der Profil-Link, kein Neuversuch je Scroll
  }
  function spaeter() {
    if (geladen || geplant) return; geplant = true;
    if ('requestIdleCallback' in window) requestIdleCallback(init, { timeout: 2000 }); else setTimeout(init, 300);
  }
  function knopf(w) {
    if (w.querySelector('.vf-siegel-zu')) return;
    var st = document.createElement('style');
    st.textContent = '.vf-siegel-zu{position:absolute;top:-10px;right:-10px;width:24px;height:24px;padding:0;border-radius:50%;'
      + 'border:1px solid rgba(255,255,255,.3);background:#151515;color:#f1f1f1;font:700 15px/1 system-ui,sans-serif;cursor:pointer}'
      + '.vf-siegel-zu:focus-visible{outline:2px solid #f97316;outline-offset:2px}';
    document.head.appendChild(st);
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'vf-siegel-zu'; b.setAttribute('aria-label', 'Bewertungssiegel ausblenden'); b.textContent = '×';
    b.addEventListener('click', function () { try { sessionStorage.setItem(ZU, '1'); } catch (e) {} zeige(); });
    w.appendChild(b);
  }
  function kopfEnde() { var h = document.querySelector('main > section, header + section, .hero, section'); return h ? h.getBoundingClientRect().bottom + scrollY : 500; }
  function zeige() {
    var w = document.querySelector('.vf-siegel'); if (!w) return;
    knopf(w);
    var da = !zu() && scrollY > kopfEnde() - 80;
    w.classList.toggle('ist-da', da);
    if (da) w.removeAttribute('inert'); else w.setAttribute('inert', '');
    if (zu()) w.style.display = 'none';
    if (da && innerWidth >= 900) spaeter();
  }
  addEventListener('scroll', zeige, { passive: true }); addEventListener('load', function () { setTimeout(zeige, 400); }); zeige();
  addEventListener('resize', zeige);
})();
