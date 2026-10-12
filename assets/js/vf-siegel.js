/* VersicherungsFuchs — Bewertungs-Hinweis rechts unten (ab 900 px, erst sichtbar unter dem Kopfbereich).
   12.10.2026 (Consent Mode BASIC, Task a0d3d60a): Das ProvenExpert-Skript (proseal-v2.js von s.provenexpert.net, 98 KB)
   wird NICHT mehr geladen - es ging ohne Einwilligung an ProvenExpert (IP, Browserdaten) und legte PE_PRO_SEAL_CACHE im
   sessionStorage ab. Es bleibt der statische Hinweis aus dem HTML (.vf-pe-fallback): ein einfacher Link auf das
   iSurance-Profil bei ProvenExpert, ohne Sterne/Noten/Anzahl (keine Zahlen, die wir nicht live belegen). Erst ein
   Klick fuehrt zu ProvenExpert. Ausgeblendet ist der Hinweis inert (kein unsichtbarer Tab-Stopp); der Schliessen-Knopf
   blendet ihn fuer die Sitzung aus, weil er beim Scrollen Inhalte ueberdeckte. */
(function () {
  var ZU = 'vf_siegel_zu';
  function zu() { try { return sessionStorage.getItem(ZU) === '1'; } catch (e) { return false; } }
  function knopf(w) {
    if (w.querySelector('.vf-siegel-zu')) return;
    var st = document.createElement('style');
    st.textContent = '.vf-siegel-zu{position:absolute;top:-10px;right:-10px;width:24px;height:24px;padding:0;border-radius:50%;'
      + 'border:1px solid rgba(255,255,255,.3);background:#151515;color:#f1f1f1;font:700 15px/1 system-ui,sans-serif;cursor:pointer}'
      + '.vf-siegel-zu:focus-visible{outline:2px solid #f97316;outline-offset:2px}';
    document.head.appendChild(st);
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'vf-siegel-zu'; b.setAttribute('aria-label', 'Bewertungshinweis ausblenden'); b.textContent = '×';
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
  }
  addEventListener('scroll', zeige, { passive: true }); addEventListener('load', function () { setTimeout(zeige, 400); }); zeige();
  addEventListener('resize', zeige);
})();
