// Test Art. 9 DSGVO (Audit 10.10.2026): Gesundheits-/Rauch-/Zahnangaben gehen nicht mit Kontaktdaten an /api/lead.
// Ohne Browser:   node tools/pruefe_gesundheit.js
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const wurzel = path.join(__dirname, '..');
const lies = (r) => fs.readFileSync(path.join(wurzel, r), 'utf8');

const ctx = { location: { search: '', pathname: '/versicherungs-check/', host: 'versicherungs-fuchs.online' },
  sessionStorage: { getItem: () => null, setItem: () => {} }, document: { referrer: '' }, URLSearchParams, JSON, Object };
ctx.window = ctx;
vm.runInNewContext(lies('assets/js/vf-checks.js'), ctx);

// 1. Filter entfernt genau die Gesundheitsfelder, alles andere bleibt
const roh = { status: 'angestellt', alter: '30_39', raucher: 'ja', gesundheit: 'mehrere', zahn_bedarf: 'in_behandlung', zielbild: 'beratung' };
assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.vfOhneGesundheit(roh))), { status: 'angestellt', alter: '30_39', zielbild: 'beratung' });
assert.strictEqual(roh.gesundheit, 'mehrere', 'Original bleibt unveraendert (Auswertung im Browser braucht es)');
assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.vfOhneGesundheit(null))), {});

// 2. Jede Frage mit Gesundheitsbezug (auch Verzweigungen) steht in der Liste
const MUSTER = /gesundheit|rauch|zähne|zahn(?!zusatz)/i;
let gefunden = 0;
for (const [typ, c] of Object.entries(ctx.VF_CHECKS)) {
  const fragen = c.questions.concat((c.branch && c.branch.questions) || []);
  for (const q of fragen) {
    if (MUSTER.test(q.question)) {
      gefunden++;
      assert.ok(ctx.VF_GESUNDHEIT_FELDER.includes(q.id), `${typ}: Frage "${q.id}" hat Gesundheitsbezug, fehlt in VF_GESUNDHEIT_FELDER`);
    }
  }
}
assert.ok(gefunden >= 7, 'Plausibilitaet: mindestens 7 Gesundheitsfragen erwartet, gefunden ' + gefunden);

// 3. Beide Lead-Wege mit Check-Antworten nutzen den Filter und laden die neue vf-checks.js
for (const [seite, variable] of [['versicherungs-check/ergebnis/index.html', 'answers'], ['versicherungs-check/voranfrage/index.html', 'checkAns']]) {
  const t = lies(seite);
  assert.ok(t.includes(`answers:window.vfOhneGesundheit(${variable})`), seite + ': /api/lead ohne vfOhneGesundheit');
  assert.ok(!new RegExp(`answers:${variable}[,}]`).test(t), seite + ': ungefilterte Antworten im Payload');
  assert.ok(/vf-checks\.js\?v=20261011/.test(t), seite + ': vf-checks.js ohne neue Version (Cache)');
}
console.log(`OK vf-gesundheit (${gefunden} Gesundheitsfragen in ${Object.keys(ctx.VF_CHECKS).length} Checks, 2 Lead-Wege)`);
