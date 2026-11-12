// Prueft das Regelwerk der Beratungsbedarfs-Ampel. Aufruf: node tools/pruefe_beratungsbedarf_regelwerk.js
const assert = require('assert');
const R = require('../assets/js/beratungsbedarf-regelwerk.js');

let n = 0;
function t(name, fn) { fn(); n++; }
const sp = (res, id) => res.sparten.find(s => s.id === id);
const ja = (ueber, alt) => ({ vorhanden: 'ja', ueber: ueber || 'ich', alt: !!alt });
const nein = { vorhanden: 'nein' };
const basis = { alter: '30-44', status: 'angestellt', wohnen: 'miete', partner: false, kinder: 0, absicherung: {} };
const mit = (o) => Object.assign({}, basis, o);

// Sparten-IDs wie dashboard luecken.ts
const ERLAUBT = ['haftpflicht', 'hausrat', 'unfall', 'bu', 'leben', 'rechtsschutz', 'kranken', 'altersvorsorge', 'wohngebaeude', 'kfz'];
t('IDs luecken.ts', () => { assert.deepStrictEqual(R.PRIO.slice().sort(), ERLAUBT.slice().sort()); });
t('Struktur', () => { const r = R.auswerten(basis); assert.strictEqual(r.sparten.length, 10); assert.ok(r.sparten.every(s => s.regel && s.satz && s.quelle && s.label)); });

t('Haftpflicht fehlt Erwachsener rot', () => assert.strictEqual(sp(R.auswerten(mit({ absicherung: { haftpflicht: nein } })), 'haftpflicht').ampel, 'rot'));
t('Haftpflicht ja ich gruen', () => assert.strictEqual(sp(R.auswerten(mit({ absicherung: { haftpflicht: ja() } })), 'haftpflicht').ampel, 'gruen'));
t('Haftpflicht ueber Partner gelb', () => { const x = sp(R.auswerten(mit({ partner: true, absicherung: { haftpflicht: ja('partner') } })), 'haftpflicht'); assert.strictEqual(x.ampel, 'gelb'); assert.ok(/Bedingungen/.test(x.satz)); });
t('Haftpflicht ueber Eltern gelb', () => assert.strictEqual(sp(R.auswerten(mit({ wohnen: 'eltern', absicherung: { haftpflicht: ja('eltern') } })), 'haftpflicht').ampel, 'gelb'));
t('Haftpflicht alt gelb', () => assert.strictEqual(sp(R.auswerten(mit({ absicherung: { haftpflicht: ja('ich', true) } })), 'haftpflicht').ampel, 'gelb'));
t('Haftpflicht weiss nicht gelb', () => assert.strictEqual(sp(R.auswerten(mit({ absicherung: { haftpflicht: { vorhanden: 'weiss' } } })), 'haftpflicht').ampel, 'gelb'));
t('Haftpflicht unter 18 nur soll -> gelb', () => assert.strictEqual(sp(R.auswerten(mit({ alter: 'u18', status: 'ausbildung', wohnen: 'eltern', absicherung: { haftpflicht: nein } })), 'haftpflicht').ampel, 'gelb'));
t('Hund ohne Tierhalter rot', () => { const x = sp(R.auswerten(mit({ hund: true, hundHaftpflicht: 'nein', absicherung: { haftpflicht: ja() } })), 'haftpflicht'); assert.strictEqual(x.ampel, 'rot'); assert.strictEqual(x.regel, 'HP-02'); });
t('Hund unklar gelb', () => assert.strictEqual(sp(R.auswerten(mit({ hund: true, absicherung: { haftpflicht: ja() } })), 'haftpflicht').ampel, 'gelb'));
t('Hund versichert gruen', () => assert.strictEqual(sp(R.auswerten(mit({ hund: true, hundHaftpflicht: 'ja', absicherung: { haftpflicht: ja() } })), 'haftpflicht').ampel, 'gruen'));

t('BU angestellt fehlt rot', () => assert.strictEqual(sp(R.auswerten(mit({ absicherung: { bu: nein } })), 'bu').ampel, 'rot'));
t('BU selbststaendig fehlt rot', () => assert.strictEqual(sp(R.auswerten(mit({ status: 'selbststaendig', absicherung: { bu: nein } })), 'bu').ampel, 'rot'));
t('BU Beamte fehlt gelb (soll)', () => assert.strictEqual(sp(R.auswerten(mit({ status: 'beamte', absicherung: { bu: nein } })), 'bu').ampel, 'gelb'));
t('BU Rente grau', () => assert.strictEqual(sp(R.auswerten(mit({ status: 'rente', alter: '60+', absicherung: { bu: nein } })), 'bu').ampel, 'grau'));
t('BU ueber Partner gelb nicht gruen', () => assert.strictEqual(sp(R.auswerten(mit({ partner: true, absicherung: { bu: ja('partner') } })), 'bu').ampel, 'gelb'));
t('BU Student fehlt rot', () => assert.strictEqual(sp(R.auswerten(mit({ status: 'ausbildung', alter: '18-29', absicherung: { bu: nein } })), 'bu').ampel, 'rot'));

t('Leben Familie+Haus muss rot', () => assert.strictEqual(sp(R.auswerten(mit({ partner: true, kinder: 2, wohnen: 'haus', absicherung: { leben: nein } })), 'leben').ampel, 'rot'));
t('Leben Partner ohne Kredit soll gelb', () => assert.strictEqual(sp(R.auswerten(mit({ partner: true, absicherung: { leben: nein } })), 'leben').ampel, 'gelb'));
t('Leben allein ohne Kredit grau', () => assert.strictEqual(sp(R.auswerten(mit({ absicherung: { leben: nein } })), 'leben').ampel, 'grau'));
t('Leben allein mit Kredit kann -> grau bei fehlend', () => assert.strictEqual(sp(R.auswerten(mit({ kredit: true, absicherung: { leben: nein } })), 'leben').ampel, 'grau'));

t('Kfz ohne Fahrzeug grau', () => assert.strictEqual(sp(R.auswerten(basis), 'kfz').ampel, 'grau'));
t('Kfz Fahrzeug ohne Haftpflicht rot', () => assert.strictEqual(sp(R.auswerten(mit({ fahrzeug: true, absicherung: { kfz: nein } })), 'kfz').ampel, 'rot'));

t('Wohngebaeude Haus fehlt rot', () => assert.strictEqual(sp(R.auswerten(mit({ wohnen: 'haus', absicherung: { wohngebaeude: nein } })), 'wohngebaeude').ampel, 'rot'));
t('Wohngebaeude ETW fehlt gelb', () => assert.strictEqual(sp(R.auswerten(mit({ wohnen: 'etw', absicherung: { wohngebaeude: nein } })), 'wohngebaeude').ampel, 'gelb'));
t('Wohngebaeude Mieter grau', () => assert.strictEqual(sp(R.auswerten(basis), 'wohngebaeude').ampel, 'grau'));
t('Vermietet Mieter-Wohnung -> Gebaeude muss', () => assert.strictEqual(sp(R.auswerten(mit({ vermietet: true, absicherung: { wohngebaeude: nein } })), 'wohngebaeude').ampel, 'rot'));

t('Altersvorsorge selbststaendig fehlt rot', () => assert.strictEqual(sp(R.auswerten(mit({ status: 'selbststaendig', absicherung: { altersvorsorge: nein } })), 'altersvorsorge').ampel, 'rot'));
t('Altersvorsorge angestellt fehlt gelb', () => assert.strictEqual(sp(R.auswerten(mit({ absicherung: { altersvorsorge: nein } })), 'altersvorsorge').ampel, 'gelb'));
t('Altersvorsorge Rente grau', () => assert.strictEqual(sp(R.auswerten(mit({ status: 'rente', alter: '60+' })), 'altersvorsorge').ampel, 'grau'));

t('Hausrat Mieter fehlt gelb', () => assert.strictEqual(sp(R.auswerten(mit({ absicherung: { hausrat: nein } })), 'hausrat').ampel, 'gelb'));
t('Hausrat bei Eltern fehlt grau', () => assert.strictEqual(sp(R.auswerten(mit({ wohnen: 'eltern', absicherung: { hausrat: nein } })), 'hausrat').ampel, 'grau'));
t('Unfall Kinder fehlt gelb', () => assert.strictEqual(sp(R.auswerten(mit({ kinder: 1, absicherung: { unfall: nein } })), 'unfall').ampel, 'gelb'));
t('Rechtsschutz angestellt fehlt gelb', () => assert.strictEqual(sp(R.auswerten(mit({ absicherung: { rechtsschutz: nein } })), 'rechtsschutz').ampel, 'gelb'));
t('Kranken Beamte fehlt gelb', () => assert.strictEqual(sp(R.auswerten(mit({ status: 'beamte', absicherung: { kranken: nein } })), 'kranken').ampel, 'gelb'));
t('Kranken Angestellter fehlt grau', () => assert.strictEqual(sp(R.auswerten(mit({ absicherung: { kranken: nein } })), 'kranken').ampel, 'grau'));

t('Gesamt rot bei einer Luecke', () => assert.strictEqual(R.auswerten(mit({ absicherung: { haftpflicht: nein } })).gesamt, 'rot'));
t('Gesamt gruen wenn alles Noetige da', () => {
  const ab = {}; R.PRIO.forEach(id => { ab[id] = ja(); });
  const r = R.auswerten(mit({ absicherung: ab }));
  assert.strictEqual(r.gesamt, 'gruen');
  assert.strictEqual(r.empfehlungen.length, 0);
});
t('Empfehlungen max 3, rot vor gelb, Prioritaet', () => {
  const r = R.auswerten(mit({ partner: true, kinder: 1, kredit: true, fahrzeug: true, absicherung: { haftpflicht: nein, bu: nein, kfz: nein, leben: nein, hausrat: nein } }));
  assert.strictEqual(r.empfehlungen.length, 3);
  assert.deepStrictEqual(r.empfehlungen.map(x => x.sparte), ['haftpflicht', 'bu', 'leben']);
  assert.ok(r.empfehlungen.every(x => x.ampel === 'rot'));
});
t('Deterministisch', () => { const e = mit({ absicherung: { bu: nein } }); assert.deepStrictEqual(R.auswerten(e), R.auswerten(e)); });
t('Leere Eingabe wirft nicht', () => { assert.doesNotThrow(() => R.auswerten()); assert.doesNotThrow(() => R.auswerten({})); });
t('Keine Garantie-Woerter', () => { const r = R.auswerten(mit({ hund: true, vermietet: true, kinder: 2, partner: true, wohnen: 'haus' })); const txt = JSON.stringify(r); assert.ok(!/garantiert|immer abgesichert|100 ?%|Rückruf|melden uns/i.test(txt)); });

console.log('OK ' + n + ' Pruefungen');
