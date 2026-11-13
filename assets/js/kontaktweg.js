/* Pflichtfeld-Regeln fuer Formulare mit Feld email + Feld telefon:
   data-kontaktweg       : Name + (E-Mail ODER Telefon)
   data-telefon-optional : E-Mail bleibt Pflicht, Telefon optional
   Leere optionale Felder werden von plausi.js nicht geprueft (data-plausi nur, solange das Feld gefuellt ist). */
(function () {
  "use strict";
  function plausi(el) {
    var leer = !el.value.trim();
    if (leer && el.hasAttribute("data-plausi")) { el.__pl = el.getAttribute("data-plausi"); el.removeAttribute("data-plausi"); }
    else if (!leer && el.__pl && !el.hasAttribute("data-plausi")) el.setAttribute("data-plausi", el.__pl);
  }
  function init(f, nurTelefon) {
    var e = f.querySelector('[name="email"]'), t = f.querySelector('[name="telefon"]');
    if (!e || !t) return;
    t.required = false;
    if (!nurTelefon) e.required = false;
    function pruefen() {
      plausi(t);
      if (nurTelefon) return;
      plausi(e);
      var leer = !e.value.trim() && !t.value.trim();
      e.setCustomValidity(leer ? "Bitte geben Sie E-Mail oder Telefon an." : ""); t.setCustomValidity("");
    }
    ["input", "change", "blur"].forEach(function (ev) { f.addEventListener(ev, pruefen, true); });
    f.addEventListener("submit", pruefen, true);
    pruefen();
  }
  Array.prototype.forEach.call(document.querySelectorAll("form[data-kontaktweg]"), function (f) { init(f, false); });
  Array.prototype.forEach.call(document.querySelectorAll("form[data-telefon-optional]"), function (f) { init(f, true); });
})();
