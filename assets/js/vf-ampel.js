/* Beratungsbedarfs-Ampel: Wizard + Ergebnis + Lead. Antworten bleiben im Browser (localStorage) bis zum Absenden.
   Regeln: assets/js/beratungsbedarf-regelwerk.js. Keine Gesundheitsdaten, keine Preise, keine KI. */
(function () {
  'use strict';
  var R = window.BeratungsbedarfRegelwerk;
  var root = document.getElementById('ampel-app');
  if (!root || !R) return;
  var API_URL = 'https://api.versicherungs-fuchs.online';
  var KEY = 'vf_beratungsbedarf_v1';
  var state = { schritt: 0, e: { alter: '', status: '', wohnen: '', partner: null, kinder: 0, hund: false, fahrzeug: false, vermietet: false, kredit: false, hundHaftpflicht: '', absicherung: {} } };

  function laden() { try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.e) { state.e = Object.assign(state.e, s.e); state.schritt = Math.min(s.schritt || 0, 2); } } catch (x) { /* ohne Speicher weiter */ } }
  function speichern() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (x) { /* egal */ } }
  function loeschen() { try { localStorage.removeItem(KEY); } catch (x) { /* egal */ } }
  function ereignis(name, p) { try { if (typeof window.gtag === 'function') window.gtag('event', name, p || {}); } catch (x) { /* egal */ } }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') n.className = attrs[k]; else if (k === 'text') n.textContent = attrs[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]); else if (attrs[k] !== false && attrs[k] !== null) n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (kids || []).forEach(function (c) { n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function radioGruppe(legende, name, optionen, wert, onChange) {
    var fs = el('fieldset', { class: 'am-fs' }, [el('legend', { text: legende })]);
    optionen.forEach(function (o) {
      var id = 'am-' + name + '-' + o[0];
      var inp = el('input', { type: 'radio', name: name, id: id, value: String(o[0]), checked: String(wert) === String(o[0]) ? true : false, onchange: function () { onChange(o[0]); speichern(); } });
      fs.appendChild(el('label', { class: 'am-opt', for: id }, [inp, el('span', { text: o[1] })]));
    });
    return fs;
  }
  function haken(text, wert, onChange) {
    var inp = el('input', { type: 'checkbox', checked: wert ? true : false, onchange: function (ev) { onChange(ev.target.checked); speichern(); } });
    return el('label', { class: 'am-opt am-chk' }, [inp, el('span', { text: text })]);
  }
  function fortschritt() {
    var namen = ['Ihre Situation', 'Ihr Haushalt', 'Ihre Absicherung', 'Ergebnis'];
    var ol = el('ol', { class: 'am-steps', 'aria-label': 'Fortschritt' });
    namen.forEach(function (n, i) { ol.appendChild(el('li', { class: i === state.schritt ? 'aktiv' : (i < state.schritt ? 'fertig' : ''), 'aria-current': i === state.schritt ? 'step' : false, text: n })); });
    return ol;
  }
  function knoepfe(weiterOk, weiterText) {
    var d = el('div', { class: 'am-nav' });
    if (state.schritt > 0) d.appendChild(el('button', { type: 'button', class: 'am-btn am-sek', text: 'Zurück', onclick: function () { state.schritt--; speichern(); render(); } }));
    d.appendChild(el('button', { type: 'button', class: 'am-btn am-prim', id: 'am-weiter', text: weiterText || 'Weiter', disabled: weiterOk ? false : true, onclick: function () {
      if (state.schritt === 0) ereignis('beratungsbedarf_start');
      state.schritt++; speichern(); render();
      if (state.schritt === 3) { var r = R.auswerten(state.e); ereignis('beratungsbedarf_ergebnis', { gesamt: r.gesamt }); }
    } }));
    return d;
  }
  function refreshWeiter(ok) { var b = document.getElementById('am-weiter'); if (b) b.disabled = !ok; }

  function schritt0() {
    var e = state.e;
    var ok = function () { return !!(e.alter && e.status && e.wohnen); };
    var w = el('div');
    w.appendChild(radioGruppe('Wie alt sind Sie?', 'alter', [['u18', 'unter 18'], ['18-29', '18 bis 29'], ['30-44', '30 bis 44'], ['45-59', '45 bis 59'], ['60+', '60 oder älter']], e.alter, function (v) { e.alter = v; refreshWeiter(ok()); }));
    w.appendChild(radioGruppe('Was trifft auf Sie zu?', 'status', [['angestellt', 'Angestellt'], ['selbststaendig', 'Selbstständig'], ['beamte', 'Beamtin oder Beamter'], ['ausbildung', 'Ausbildung oder Studium'], ['rente', 'Rente']], e.status, function (v) { e.status = v; refreshWeiter(ok()); }));
    w.appendChild(radioGruppe('Wie wohnen Sie?', 'wohnen', [['miete', 'Zur Miete'], ['haus', 'Im eigenen Haus'], ['etw', 'In der eigenen Eigentumswohnung'], ['eltern', 'Bei den Eltern']], e.wohnen, function (v) { e.wohnen = v; refreshWeiter(ok()); }));
    w.appendChild(knoepfe(ok()));
    return w;
  }
  function schritt1() {
    var e = state.e; var w = el('div');
    w.appendChild(radioGruppe('Leben Sie mit einem Partner oder einer Partnerin?', 'partner', [['ja', 'Ja'], ['nein', 'Nein']], e.partner === null ? '' : (e.partner ? 'ja' : 'nein'), function (v) { e.partner = v === 'ja'; refreshWeiter(ok()); }));
    w.appendChild(radioGruppe('Wie viele Kinder leben in Ihrem Haushalt?', 'kinder', [['0', 'Keine'], ['1', 'Eines'], ['2', 'Zwei'], ['3', 'Drei oder mehr']], String(e.kinder), function (v) { e.kinder = parseInt(v, 10); refreshWeiter(ok()); }));
    var fs = el('fieldset', { class: 'am-fs' }, [el('legend', { text: 'Was trifft noch zu? (Mehrfachauswahl)' })]);
    fs.appendChild(haken('Ich habe einen Hund', e.hund, function (v) { e.hund = v; render(); }));
    fs.appendChild(haken('Ich besitze ein Auto oder Motorrad', e.fahrzeug, function (v) { e.fahrzeug = v; }));
    fs.appendChild(haken('Ich vermiete eine Immobilie', e.vermietet, function (v) { e.vermietet = v; }));
    fs.appendChild(haken('Ich habe einen laufenden Kredit oder eine Baufinanzierung', e.kredit, function (v) { e.kredit = v; }));
    w.appendChild(fs);
    if (e.hund) w.appendChild(radioGruppe('Ist Ihr Hund über eine Tierhalterhaftpflicht abgesichert?', 'hh', [['ja', 'Ja'], ['nein', 'Nein'], ['weiss', 'Weiß ich nicht']], e.hundHaftpflicht, function (v) { e.hundHaftpflicht = v; }));
    function ok() { return e.partner !== null; }
    w.appendChild(knoepfe(ok()));
    return w;
  }
  function schritt2() {
    var e = state.e; var bed = R.bedarf(e); var w = el('div');
    w.appendChild(el('p', { class: 'am-hint', text: 'Nur Sparten, die für Ihre Situation eine Rolle spielen. „Weiß ich nicht“ ist eine gültige Antwort.' }));
    var anzahl = 0;
    R.PRIO.forEach(function (id) {
      if (bed[id].s === 'nein') return;
      anzahl++;
      var a = e.absicherung[id] = e.absicherung[id] || { vorhanden: '', ueber: 'ich', alt: false };
      var box = el('div', { class: 'am-sparte' }, [el('h3', { text: R.LABEL[id] })]);
      var neu = function () { render(); };
      box.appendChild(radioGruppe('Haben Sie diese Absicherung?', 'v-' + id, [['ja', 'Ja'], ['nein', 'Nein'], ['weiss', 'Weiß ich nicht']], a.vorhanden, function (v) { a.vorhanden = v; neu(); }));
      if (a.vorhanden === 'ja') {
        box.appendChild(radioGruppe('Über wen läuft sie?', 'u-' + id, [['ich', 'Über mich'], ['partner', 'Über Partner oder Partnerin'], ['eltern', 'Über die Eltern'], ['weiss', 'Weiß ich nicht']], a.ueber, function (v) { a.ueber = v; }));
        box.appendChild(haken('Der Vertrag ist älter als 5 Jahre', a.alt, function (v) { a.alt = v; }));
      }
      w.appendChild(box);
    });
    function ok() { return R.PRIO.every(function (id) { return bed[id].s === 'nein' || (e.absicherung[id] && e.absicherung[id].vorhanden); }); }
    w.appendChild(knoepfe(ok(), 'Ergebnis anzeigen'));
    return w;
  }

  var AMPEL_TXT = { rot: 'Lücke', gelb: 'Bitte prüfen', gruen: 'Gedeckt', grau: 'Nicht vorrangig' };
  var GESAMT_TXT = { rot: 'Es gibt mindestens eine wichtige Lücke.', gelb: 'Keine klare Lücke, aber einiges sollten Sie prüfen.', gruen: 'Ihre wichtigsten Bereiche sind nach Ihren Angaben gedeckt.', grau: 'Für Ihre Situation ist derzeit nichts vorrangig.' };
  function ergebnis() {
    var r = R.auswerten(state.e); var w = el('div');
    w.appendChild(el('div', { class: 'am-gesamt am-' + r.gesamt, role: 'status' }, [el('span', { class: 'am-punkt', 'aria-hidden': 'true' }), el('div', {}, [el('strong', { text: 'Gesamt: ' + AMPEL_TXT[r.gesamt] }), el('p', { text: GESAMT_TXT[r.gesamt] })])]));
    if (r.empfehlungen.length) {
      w.appendChild(el('h3', { text: 'Das sollten Sie als Erstes anschauen' }));
      var ol = el('ol', { class: 'am-empf' });
      r.empfehlungen.forEach(function (x) { ol.appendChild(el('li', {}, [el('strong', { text: x.label + ': ' }), x.satz, el('small', { text: ' (Regel ' + x.regel + ' · Quelle: ' + x.quelle + ')' })])); });
      w.appendChild(ol);
    }
    w.appendChild(el('h3', { text: 'Alle Bereiche' }));
    var ul = el('ul', { class: 'am-liste' });
    r.sparten.forEach(function (s) { ul.appendChild(el('li', { class: 'am-' + s.ampel }, [el('span', { class: 'am-punkt', 'aria-hidden': 'true' }), el('div', {}, [el('strong', { text: s.label + ' – ' + AMPEL_TXT[s.ampel] }), el('p', { text: s.satz }), el('small', { text: 'Regel ' + s.regel + ' · Quelle: ' + s.quelle })])])); });
    w.appendChild(ul);
    w.appendChild(el('p', { class: 'am-hint', text: 'Regelbasierte Auswertung nach Ihren Angaben, keine Beratung und keine Prüfung Ihrer Verträge. Ob eine Lücke tatsächlich besteht, zeigt erst der Blick in Ihre Unterlagen.' }));
    w.appendChild(leadForm(r));
    w.appendChild(el('div', { class: 'am-nav' }, [
      el('button', { type: 'button', class: 'am-btn am-sek', text: 'Angaben ändern', onclick: function () { state.schritt = 2; speichern(); render(); } }),
      el('button', { type: 'button', class: 'am-btn am-sek', text: 'Neu starten', onclick: function () { loeschen(); location.reload(); } })
    ]));
    return w;
  }
  function turnstileLaden(fertig) {
    if (window.turnstile) return fertig();
    var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = fertig; document.head.appendChild(s);
  }
  function leadForm(r) {
    var f = el('form', { class: 'am-lead', novalidate: true });
    f.appendChild(el('h3', { text: 'Ergebnis mit einem Berater besprechen' }));
    f.appendChild(el('p', { class: 'am-hint', text: 'Kostenlos und unverbindlich. Wir sehen dabei Ihr Ergebnis, damit Sie nichts doppelt erklären müssen. Bitte keine Angaben zur Gesundheit.' }));
    var feld = function (id, label, typ, ac, pflicht) { return [el('label', { for: id, text: label }), el('input', { type: typ, id: id, name: id, autocomplete: ac, required: pflicht ? true : false })]; };
    feld('am-name', 'Name', 'text', 'name', true).forEach(function (n) { f.appendChild(n); });
    feld('am-email', 'E-Mail-Adresse', 'email', 'email', true).forEach(function (n) { f.appendChild(n); });
    feld('am-tel', 'Telefon (optional, für Rückfragen)', 'tel', 'tel', false).forEach(function (n) { f.appendChild(n); });
    f.appendChild(el('div', { class: 'am-hp', 'aria-hidden': 'true' }, [el('label', { for: 'am-website', text: 'Website' }), el('input', { type: 'text', id: 'am-website', name: 'website', tabindex: '-1', autocomplete: 'off' })]));
    f.appendChild(el('label', { class: 'am-opt am-chk', for: 'am-consent' }, [el('input', { type: 'checkbox', id: 'am-consent' }), el('span', {}, ['Ich bin einverstanden, dass meine Angaben und mein Ergebnis zur Bearbeitung meiner Anfrage gespeichert und verarbeitet werden. Mehr in der ', el('a', { href: '/datenschutz', text: 'Datenschutzerklärung' }), '.'])]));
    var fehler = el('p', { class: 'am-fehler', role: 'alert', hidden: true });
    var btn = el('button', { type: 'submit', class: 'am-btn am-prim', text: 'Anfrage senden' });
    var tsToken = '';
    var tsKey = root.getAttribute('data-turnstile-sitekey') || '';
    if (tsKey) {
      var tsBox = el('div', { class: 'am-ts' });
      f.appendChild(tsBox);
      turnstileLaden(function () { try { window.turnstile.render(tsBox, { sitekey: tsKey, callback: function (t) { tsToken = t; }, 'expired-callback': function () { tsToken = ''; }, 'error-callback': function () { tsToken = ''; } }); } catch (x) { /* Fehlermeldung beim Senden */ } });
    }
    f.appendChild(fehler); f.appendChild(btn);
    f.addEventListener('submit', function (ev) {
      ev.preventDefault(); fehler.hidden = true;
      if (document.getElementById('am-website').value) return;
      var name = document.getElementById('am-name').value.trim(), mail = document.getElementById('am-email').value.trim(), tel = document.getElementById('am-tel').value.trim();
      var melde = function (t) { fehler.textContent = t; fehler.hidden = false; };
      if (!name) return melde('Bitte geben Sie Ihren Namen an.');
      if (!mail || mail.indexOf('@') < 1) return melde('Bitte geben Sie eine gültige E-Mail-Adresse an.');
      if (!document.getElementById('am-consent').checked) return melde('Bitte bestätigen Sie die Verarbeitung Ihrer Angaben.');
      btn.disabled = true; btn.textContent = 'Wird gesendet …';
      if (tsKey && !tsToken) { btn.disabled = false; btn.textContent = 'Anfrage senden'; return melde('Bitte warten Sie kurz auf die Sicherheitsprüfung und senden Sie erneut. Alternativ erreichen Sie uns unter 0221 16829452 oder info@isurance-group.de.'); }
      var e = state.e; var je = {}; r.sparten.forEach(function (s) { je[s.id] = s.ampel; });
      var payload = {
        name: name, email: mail, phone: tel || undefined,
        answers: { check: 'beratungsbedarf-ampel', quelle: 'beratungsbedarf-ampel', telefon: tel, ampel_gesamt: r.gesamt, ampel_je_sparte: je,
          empfehlungen: r.empfehlungen.map(function (x) { return x.sparte + ':' + x.regel; }),
          situation: { alter: e.alter, status: e.status, wohnen: e.wohnen, partner: !!e.partner, kinder: e.kinder, hund: !!e.hund, fahrzeug: !!e.fahrzeug, vermietet: !!e.vermietet, kredit: !!e.kredit },
          absicherung: Object.keys(e.absicherung).reduce(function (o, k) { var a = e.absicherung[k]; if (a && a.vorhanden) o[k] = { vorhanden: a.vorhanden, ueber: a.vorhanden === 'ja' ? a.ueber : null, alt: a.vorhanden === 'ja' ? !!a.alt : null }; return o; }, {}) },
        extra: Object.assign({ tel: tel, cf_turnstile: tsToken || undefined, ki_quelle: (window.vfKiQuelle && window.vfKiQuelle()) || undefined }, window.vfHerkunft ? window.vfHerkunft() : {}),
        source: 'beratungsbedarf-ampel'
      };
      fetch(API_URL + '/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (res) { if (!res.ok) { var er = new Error('http'); er.status = res.status; throw er; } return res.json(); })
        .then(function () {
          ereignis('formular_absenden', { formular: 'beratungsbedarf-ampel' });
          loeschen();
          root.textContent = '';
          root.appendChild(el('div', { class: 'am-ok', role: 'status', tabindex: '-1' }, [el('h2', { text: 'Danke! Ihre Anfrage ist bei uns angekommen.' }), el('p', { text: 'Ihr Ergebnis haben wir mitgespeichert.' })]));
          root.querySelector('.am-ok').focus();
        })
        .catch(function (er) {
          btn.disabled = false; btn.textContent = 'Anfrage senden';
          try { if (tsKey && window.turnstile) window.turnstile.reset(); tsToken = ''; } catch (x) { /* egal */ }
          melde(er && er.status === 429 ? 'Zu viele Anfragen in kurzer Zeit. Bitte warten Sie einige Minuten.' : 'Es gab ein Problem beim Senden. Bitte versuchen Sie es erneut. Alternativ erreichen Sie uns unter 0221 16829452 oder info@isurance-group.de.');
        });
    });
    return f;
  }

  function render() {
    root.textContent = '';
    root.appendChild(fortschritt());
    var inhalt = state.schritt === 0 ? schritt0() : state.schritt === 1 ? schritt1() : state.schritt === 2 ? schritt2() : ergebnis();
    root.appendChild(inhalt);
    var h = root.querySelector('legend, h3'); if (h && state.schritt > 0) { try { root.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (x) { /* egal */ } }
  }
  laden(); render();
})();
