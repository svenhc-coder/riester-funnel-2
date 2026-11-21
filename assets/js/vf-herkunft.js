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
   Ruft nichts im Netz auf und setzt keine Cookies. */
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

  // 21.11.2026 (d-bau3/Koordination): Klick-ID nur bei Einwilligung 30 Tage in localStorage 'vf_klick30' (Unterseiten, Wiederkehr);
  // ohne Einwilligung / bei Widerruf sofort geloescht.
  var K30 = 'vf_klick30', K30MS = 30 * 24 * 60 * 60 * 1000;
  function lese30() {
    try {
      var r = JSON.parse(window.localStorage.getItem(K30) || 'null');
      if (!r || !r.t || Date.now() - r.t > K30MS) { window.localStorage.removeItem(K30); return {}; }
      return r;
    } catch (e) { return {}; }
  }
  function schreib30() { try { var d = {}; IDS.forEach(function (k) { if (hier[k]) d[k] = hier[k]; }); d.t = Date.now(); window.localStorage.setItem(K30, JSON.stringify(d)); } catch (e) { /* gesperrt */ } }
  function loesch30() { try { window.localStorage.removeItem(K30); } catch (e) { /* gesperrt */ } }

  // Klick-IDs nur mit Einwilligung ueber Seitenwechsel tragen
  function merken() {
    var m = marketing();
    // 18.11.2026 (Koordination, Regel 12.11.): Sitzungs-Kontext (Einstiegsseite, utm) wie die Klick-IDs nur mit Marketing-Einwilligung
    if (m !== true) { loesch('vf_landing'); loesch('vf_utm'); loesch('vf_ref'); }
    else { if (!lies('vf_landing')) schreib('vf_landing', location.pathname); if (Object.keys(utmHier).length && !lies('vf_utm')) schreib('vf_utm', JSON.stringify(utmHier)); }
    if (m !== true) loesch30(); else if (Object.keys(hier).length) schreib30();
    if (m === false) { loesch('vf_klick'); return; }
    if (m === true && Object.keys(hier).length && !lies('vf_klick')) schreib('vf_klick', JSON.stringify(hier));
  }
  merken();
  try { window.addEventListener('vf-consent', merken); } catch (e) { /* alt */ }

  window.vfHerkunft = function () {
    var r = {};
    try {
      var m = marketing(), gemerkt = m === true ? json('vf_klick') : {};
      // 12.11.2026: Klick-IDs nur mit ausdruecklicher Marketing-Einwilligung (vorher gingen IDs der aktuellen URL auch ohne Wahl mit)
      if (m === true) IDS.forEach(function (k) { var v = klickId(gemerkt[k]) || hier[k] || klickId(lese30()[k]); if (v) r[k] = v; });
      var u = Object.keys(utmHier).length ? utmHier : json('vf_utm'), utm = {};
      UTM.forEach(function (k) { if (u[k]) utm[k] = String(u[k]).slice(0, 160); });
      if (m === true && Object.keys(utm).length) r.utm = utm;   // 13.11.2026: UTM wie Klick-IDs nur mit Einwilligung
      var pfad = lies('vf_landing') || location.pathname;
      if (typeof pfad !== 'string' || pfad.charAt(0) !== '/') pfad = location.pathname;
      r.landing_page = (location.origin + pfad.split('?')[0].split('#')[0]).slice(0, 500);
      if (typeof m === 'boolean') r.einwilligung_marketing = m;
      // Banner-Stand fehlt nie (wie CS/MH/B): granted | denied | unbeantwortet
      r.einwilligung_status = m === true ? 'granted' : m === false ? 'denied' : 'unbeantwortet';
      // Art.-7-Nachweis (08.11.2026): nur bei getroffener Wahl; Wortlaut/Version aus cookie-notice.js (window.VF_EINWILLIGUNG)
      if (typeof m === 'boolean' && window.VF_EINWILLIGUNG) {
        r.einwilligung_quelle = 'banner';
        r.einwilligung_marketing_text = String(window.VF_EINWILLIGUNG.text || '').slice(0, 600);
        r.einwilligung_marketing_version = String(window.VF_EINWILLIGUNG.version || '').slice(0, 40);
      }
    } catch (e) { /* nie den Lead blockieren */ }
    return r;
  };
})();

/* PARAM-WEITERREICHEN 18.11.2026 (Koordination): Ads-Parameter ueber Klick auf interne Links in der URL weiterreichen, keine Speicherung */
document.addEventListener("click",function(x){try{
 if(x.defaultPrevented||x.button||x.metaKey||x.ctrlKey||x.shiftKey||x.altKey)return;
 var a=x.target.closest&&x.target.closest("a[href]");if(!a||a.hasAttribute("download"))return;
 var h=a.getAttribute("href")||"";if(!h||h.charAt(0)==="#"||/^(mailto|tel|javascript):/i.test(h))return;
 var t=new URL(h,location.href);if(t.origin!==location.origin||(t.pathname===location.pathname&&t.hash))return;
 var cur=new URLSearchParams(location.search),ks=["gclid","gbraid","wbraid","utm_source","utm_medium","utm_campaign","utm_content","utm_term"],n=0;
 ks.forEach(function(k){var v=cur.get(k);if(v&&!t.searchParams.has(k)){t.searchParams.set(k,v.slice(0,200));n++;}});
 if(n)a.setAttribute("href",t.pathname+t.search+t.hash);}catch(e){}},true);

/* WERBEMESSUNG-KAESTCHEN 19.11.2026 (Sven-Entscheidung, Koordination): freiwillig, nicht vorangekreuzt, kein Google-Aufruf.
   Fuegt vor dem Absenden-Knopf aller Lead-Formulare ein Kaestchen ein (auch dynamisch gebaute Formulare) und haengt
   werbemessung_einwilligung/_zeit/_text/_version an window.vfHerkunft() -> landet in extra des Lead-POST. */
(function () {
  var TEXT = 'Ich willige in die Erfolgsmessung meiner Anfrage über Google ein.', VER = '2026-11-19-v2', IDS = { 'avd-lead-form': 1, 'lead-form': 1, 'pkv-lead-form': 1, 'leadform': 1, 'cform': 1, 'vform': 1 };
  try {
    var st = document.createElement('style');
    st.textContent = '.vf-wm{display:flex!important;gap:10px;align-items:flex-start;font-size:.85rem!important;line-height:1.45!important;font-weight:400!important;margin:12px 0!important;text-align:left!important;cursor:pointer;width:auto!important;color:inherit}' +
      '.vf-wm input{width:20px!important;height:20px!important;min-width:20px;margin:2px 0 0!important;flex:none;padding:0!important}.vf-wm a{color:inherit!important;text-decoration:underline}';
    document.head.appendChild(st);
  } catch (e) { /* ohne Stil weiter */ }
  function sync(ev) {
    try { var c = ev.target; if (!c || c.name !== 'werbemessung_einwilligung') return;
      var all = document.querySelectorAll('input[name="werbemessung_einwilligung"]');
      for (var i = 0; i < all.length; i++) all[i].checked = c.checked; } catch (e) { /* nie blockieren */ }
  }
  function einfuegen() {
    try {
      var fs = document.querySelectorAll('form');
      for (var i = 0; i < fs.length; i++) {
        var f = fs[i];
        if (!IDS[f.id] || f.querySelector('input[name="werbemessung_einwilligung"]')) continue;
        var btn = f.querySelector('[type=submit],button:not([type])');
        if (!btn || !btn.parentNode) continue;
        var l = document.createElement('label');
        l.className = 'vf-wm';
        l.innerHTML = '<input type="checkbox" name="werbemessung_einwilligung" value="1"><span>' + TEXT + ' <a href="/datenschutz#werbemessung" target="_blank" rel="noopener noreferrer">Mehr dazu</a></span>';
        btn.parentNode.insertBefore(l, btn);
      }
    } catch (e) { /* nie blockieren */ }
  }
  document.addEventListener('change', sync);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', einfuegen); else einfuegen();
  try { new MutationObserver(einfuegen).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) { /* alt */ }
  var alt = window.vfHerkunft;
  window.vfHerkunft = function () {
    var r = {};
    try { r = alt ? alt() : {}; } catch (e) { r = {}; }
    try {
      var bx = document.querySelectorAll('input[name="werbemessung_einwilligung"]'), b = null;
      for (var i = 0; i < bx.length; i++) if (bx[i].offsetParent !== null) { b = bx[i]; break; }
      if (!b && bx.length) b = bx[0];
      if (b && b.checked) {   // nur bei Haken senden, unangekreuzt GAR NICHT (kein false)
        r.werbemessung_einwilligung = true;
        r.werbemessung_einwilligung_zeit = new Date().toISOString();
        r.werbemessung_einwilligung_text = TEXT;
        r.werbemessung_einwilligung_version = VER;
      }
    } catch (e) { /* nie den Lead blockieren */ }
    return r;
  };
})();
