/* KI-Quelle (08.10.2026, KI-Sichtbarkeit "Von der Nennung zur Anfrage", _briefings/KI-SICHTBARKEIT-STRATEGIE-2026-10-07.md).
   window.vfKiQuelle() -> 'chatgpt' | 'perplexity' | 'gemini' | 'claude' | 'copilot' | ''.
   Erkannt an Referrer-Host (chatgpt.com, chat.openai.com, perplexity.ai, gemini.google.com, claude.ai, copilot.microsoft.com)
   oder utm_source (ChatGPT haengt utm_source=chatgpt.com selbst an).
   Erstkontakt: zuerst die Werte, die vf-checks.js beim ersten Seitenaufruf der Sitzung bereits ablegt (sessionStorage
   vf_ref / vf_utm - besteht schon, hier wird nur gelesen), dann Referrer und Adresse der aktuellen Seite.
   Dieses Skript speichert nichts, setzt keine Cookies und ruft nichts im Netz auf.
   Google-KI-Uebersichten sind am Referrer nicht von der normalen Google-Suche zu unterscheiden. */
(function () {
  'use strict';
  var KI = [['chatgpt', /^(chatgpt\.com|chat\.openai\.com|chatgpt)$/], ['perplexity', /^(perplexity\.ai|perplexity)$/],
    ['gemini', /^(gemini\.google\.com|bard\.google\.com|gemini)$/], ['claude', /^(claude\.ai|claude)$/],
    ['copilot', /^(copilot\.microsoft\.com|copilot\.cloud\.microsoft|copilot)$/]];
  function kiAus(v) {
    if (!v) return '';
    var s = String(v).trim().toLowerCase().replace(/^www\./, '');
    for (var i = 0; i < KI.length; i++) { if (KI[i][1].test(s)) return KI[i][0]; }
    return '';
  }
  function hostVon(adresse) {
    try { var h = adresse ? new URL(adresse).hostname : ''; return h && h !== location.hostname ? h : ''; } catch (e) { return ''; }
  }
  window.vfKiQuelle = function () {
    try {
      var ref = '', utm = {}, jetzt = '';
      try { ref = sessionStorage.getItem('vf_ref') || ''; utm = JSON.parse(sessionStorage.getItem('vf_utm') || '{}') || {}; } catch (e) { /* gesperrt */ }
      try { jetzt = new URLSearchParams(location.search).get('utm_source') || ''; } catch (e) { jetzt = ''; }
      return kiAus(hostVon(ref)) || kiAus(utm.source) || kiAus(hostVon(document.referrer)) || kiAus(jetzt);
    } catch (e) { return ''; }
  };
  window.vfKiQuelleAus = kiAus;   // fuer Tests
})();
