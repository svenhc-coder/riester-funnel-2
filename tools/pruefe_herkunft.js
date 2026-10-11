// Test assets/js/vf-herkunft.js (11.10.2026, P0-2 Herkunft im Lead) ohne Browser:   node tools/pruefe_herkunft.js
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const wurzel = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(wurzel, 'assets', 'js', 'vf-herkunft.js'), 'utf8');
function lauf({ search = '', pathname = '/pkv-check/', sitzung = {}, consent = null, document } = {}) {
  const lokal = { vf_cookie_consent: consent }, hoerer = {};
  const ctx = {
    location: { search, pathname, origin: 'https://versicherungs-fuchs.online' },
    sessionStorage: { getItem: (k) => (k in sitzung ? sitzung[k] : null), setItem: (k, v) => { sitzung[k] = String(v); },
      removeItem: (k) => { delete sitzung[k]; } },
    localStorage: { getItem: (k) => lokal[k] ?? null },
    addEventListener: (n, f) => { hoerer[n] = f; },
    URLSearchParams, JSON, String, Object,
  };
  if (document) ctx.document = document;
  ctx.window = ctx;
  vm.runInNewContext(code, ctx);
  return { h: (formular) => JSON.parse(JSON.stringify(ctx.vfHerkunft(formular))), sitzung, lokal, hoerer, ctx };
}
// 1. Ads-Klick ohne Banner-Entscheidung: Klick-ID der Seite geht mit, nichts gemerkt, keine Einwilligung behauptet
let t = lauf({ search: '?gclid=Cj0K_abc-1.2&utm_source=google&utm_medium=cpc&utm_campaign=pkv' });
assert.deepStrictEqual(t.h(), { gclid: 'Cj0K_abc-1.2', utm: { source: 'google', medium: 'cpc', campaign: 'pkv' },
  landing_page: 'https://versicherungs-fuchs.online/pkv-check/' });
assert.ok(!('vf_klick' in t.sitzung), 'ohne Einwilligung nichts gemerkt');
assert.strictEqual(t.sitzung.vf_landing, '/pkv-check/');
// 2. Zustimmung per Banner auf der Einstiegsseite -> gemerkt, einwilligung_marketing true
t.lokal.vf_cookie_consent = 'accepted'; t.hoerer['vf-consent']();
assert.strictEqual(t.sitzung.vf_klick, JSON.stringify({ gclid: 'Cj0K_abc-1.2' }));
assert.strictEqual(t.h().einwilligung_marketing, true);
// 3. Folgeseite (Anfrage) ohne Parameter traegt Klick-ID, utm und Einstiegsseite weiter
let f = lauf({ pathname: '/check-anfrage/', sitzung: t.sitzung, consent: 'accepted' });
assert.deepStrictEqual(f.h(), { gclid: 'Cj0K_abc-1.2', utm: { source: 'google', medium: 'cpc', campaign: 'pkv' },
  landing_page: 'https://versicherungs-fuchs.online/pkv-check/', einwilligung_marketing: true, einwilligung_quelle: 'banner' });
// 4. Widerruf ("Nur notwendige") loescht die gemerkte Klick-ID
f = lauf({ pathname: '/check-anfrage/', sitzung: t.sitzung, consent: 'necessary' });
assert.ok(!('vf_klick' in t.sitzung), 'Widerruf loescht vf_klick');
assert.deepStrictEqual(f.h(), { utm: { source: 'google', medium: 'cpc', campaign: 'pkv' },
  landing_page: 'https://versicherungs-fuchs.online/pkv-check/', einwilligung_marketing: false });
// 5. Bereinigung: nur [A-Za-z0-9_.-], max. 200 Zeichen; gbraid/wbraid
t = lauf({ search: '?gbraid=0AA%3Cscript%3E&wbraid=' + 'x'.repeat(300) });
assert.deepStrictEqual([t.h().gbraid, t.h().wbraid.length], ['0AAscript', 200]);
// 6. Erstkontakt gewinnt bei gemerkter Klick-ID
t = lauf({ search: '?gclid=NEU', sitzung: { vf_klick: JSON.stringify({ gclid: 'ALT' }) }, consent: 'accepted' });
assert.strictEqual(t.h().gclid, 'ALT');
// 7. Gesperrter/kaputter Speicher wirft nie
t = lauf({ sitzung: { vf_klick: '{kaputt', vf_utm: '{kaputt' }, consent: 'accepted' });
assert.deepStrictEqual(t.h(), { landing_page: 'https://versicherungs-fuchs.online/pkv-check/', einwilligung_marketing: true, einwilligung_quelle: 'banner' });
// 8. Freiwilliges Werbe-Haekchen (Sven 11.10.2026): true = Haekchen ODER Banner 'accepted', false nur ohne Haekchen bei
//    'necessary', sonst weglassen. Das Haekchen wirkt nur auf diese Anfrage und speichert nichts.
const formMit = (an) => ({ querySelector: (sel) => (sel === 'input[name="einwilligung_werbung"]' ? { checked: an } : null) });
t = lauf({ search: '?gclid=Cj0K_x' });
assert.strictEqual(t.h(formMit(true)).einwilligung_marketing, true, 'Haekchen ohne Banner-Wahl -> true');
assert.strictEqual(t.h(formMit(true)).gclid, 'Cj0K_x', 'Klick-ID der Seite geht mit');
assert.ok(!('vf_klick' in t.sitzung), 'Haekchen merkt nichts auf dem Geraet');
assert.ok(!('einwilligung_marketing' in t.h(formMit(false))), 'ohne Haekchen + keine Wahl -> weggelassen');
assert.ok(!('einwilligung_marketing' in t.h()), 'Aufruf ohne Formular unveraendert');
t = lauf({ consent: 'necessary' });
assert.strictEqual(t.h(formMit(true)).einwilligung_marketing, true, 'Haekchen trotz "nur notwendige" -> true (nur diese Anfrage)');
assert.strictEqual(t.h(formMit(false)).einwilligung_marketing, false, 'ohne Haekchen + nur notwendige -> false');
t = lauf({ consent: 'accepted' });
assert.strictEqual(t.h(formMit(false)).einwilligung_marketing, true, 'ohne Haekchen + Banner erlaubt -> true');
const E = t.ctx.vfEinwilligungFuerAnfrage;
assert.deepStrictEqual([E(true, undefined), E(true, false), E(false, true), E(false, false), E(false, undefined)],
  [true, true, true, false, undefined], 'Regel vfEinwilligungFuerAnfrage');
assert.strictEqual(t.h({ querySelector: () => { throw new Error('x'); } }).einwilligung_marketing, true, 'kaputtes Formular wirft nie');
// 8b. Einwilligungsnachweis: einwilligung_quelle formular/banner/formular,banner; Text + Fassung nur bei formular
const TXT = t.ctx.vfEinwilligungText;
assert.strictEqual(TXT.version, '2026-10');
assert.ok(TXT.text.length <= 1000 && !/[<>]/.test(TXT.text), 'Text ohne HTML, max. 1000');
assert.ok(/^Freiwillig: Meine Anfrage darf .* Widerruf jederzeit per E-Mail\. Mehr in der Datenschutzerklärung$/.test(TXT.text), 'sichtbarer Wortlaut');
const Q = t.ctx.vfEinwilligungQuelle;
assert.deepStrictEqual([Q(true, undefined), Q(false, true), Q(true, true), Q(false, false), Q(false, undefined)],
  ['formular', 'banner', 'formular,banner', undefined, undefined], 'Regel vfEinwilligungQuelle');
let n8 = lauf({ consent: 'accepted' }).h(formMit(true));
assert.deepStrictEqual([n8.einwilligung_quelle, n8.einwilligung_marketing_text, n8.einwilligung_marketing_version], ['formular,banner', TXT.text, '2026-10'], 'beides');
n8 = lauf({ consent: 'accepted' }).h(formMit(false));
assert.strictEqual(n8.einwilligung_quelle, 'banner');
assert.ok(!('einwilligung_marketing_text' in n8) && !('einwilligung_marketing_version' in n8), 'nur Banner -> kein Text');
n8 = lauf({ consent: 'necessary' }).h(formMit(true));
assert.deepStrictEqual([n8.einwilligung_quelle, n8.einwilligung_marketing_version], ['formular', '2026-10'], 'nur Haekchen');
n8 = lauf({ consent: 'necessary' }).h(formMit(false));
assert.ok(!('einwilligung_quelle' in n8) && !('einwilligung_marketing_text' in n8), 'false -> keine Nachweis-Felder');
n8 = lauf({}).h(formMit(false));
assert.ok(!('einwilligung_quelle' in n8) && !('einwilligung_marketing_version' in n8), 'keine Wahl -> keine Nachweis-Felder');
// 9. Einbau: Platzhalter wird zum Haekchen - nie Pflicht, nie vorausgewaehlt, echtes label, Fokus-Stil, Link zum Absatz
const platz = { attr: { 'data-vf-werbung': 'ca-werbung"><x' }, className: '', innerHTML: '',
  getAttribute(k) { return this.attr[k] ?? null; }, setAttribute(k, v) { this.attr[k] = v; } };
const stile = [];
const dok = { readyState: 'complete', querySelectorAll: () => [platz], getElementById: (id) => stile.find((x) => x.id === id) || null,
  createElement: () => ({}), head: { appendChild: (x) => stile.push(x) }, addEventListener: () => {} };
t = lauf({ document: dok });
assert.ok(/<input type="checkbox" id="ca-werbungx" name="einwilligung_werbung" value="ja">/.test(platz.innerHTML), 'Checkbox, Id bereinigt');
assert.ok(!/checked|required/.test(platz.innerHTML), 'nie vorausgewaehlt, nie Pflicht');
assert.ok(/<label for="ca-werbungx">/.test(platz.innerHTML) && /href="\/datenschutz#google-ads-anfragen"/.test(platz.innerHTML), 'label + Link');
assert.ok(/Freiwillig:<\/strong> Meine Anfrage darf zur Erfolgsmessung unserer Google-Werbung genutzt werden\./.test(platz.innerHTML), 'Text');
assert.ok(stile.length === 1 && /focus-visible\{outline:2px solid/.test(stile[0].textContent), 'sichtbarer Fokus');
// angezeigter Text (ohne HTML) == gesendeter Nachweis-Text
assert.strictEqual(platz.innerHTML.replace(/<input[^>]*>/, '').replace(/<[^>]+>/g, ''), t.ctx.vfEinwilligungText.text, 'Anzeige = Nachweis-Text');
const quellcode = fs.readFileSync(path.join(wurzel, 'assets', 'js', 'vf-herkunft.js'), 'utf8');
assert.strictEqual((quellcode.match(/Erfolgsmessung unserer Google-Werbung/g) || []).length, 1, 'Wortlaut nur einmal im Code');
t.ctx.vfWerbungEinbauen(); assert.strictEqual(stile.length, 1, 'zweiter Lauf baut nichts doppelt');
const ds = fs.readFileSync(path.join(wurzel, 'datenschutz.html'), 'utf8');
assert.ok(/<h3 id="google-ads-anfragen">/.test(ds) && /SHA-256-Hashwert/.test(ds), 'Datenschutz-Absatz vorhanden');
// Einbindung: jede Seite mit /api/lead laedt das Skript und legt vfHerkunft() in extra
const seiten = ['check-anfrage/index.html', 'altersvorsorgedepot/index.html', 'pkv-check/index.html',
  'riester-check/result/index.html', 'versicherungs-check/ergebnis/index.html', 'versicherungs-check/voranfrage/index.html'];
for (const seite of seiten) {
  const h = fs.readFileSync(path.join(wurzel, seite), 'utf8');
  assert.ok(/<script defer src="\/assets\/js\/vf-herkunft\.js\?v=[^"]+"><\/script>/.test(h), seite + ': Skript eingebunden');
  const posts = (h.match(/fetch\([^)]*\/api\/lead'/g) || []).length, mit = (h.match(/window\.vfHerkunft\s*\?\s*window\.vfHerkunft\(/g) || []).length;
  assert.ok(posts >= 1 && mit === posts, seite + ': vfHerkunft() in jedem /api/lead-Aufruf (' + mit + '/' + posts + ')');
  // Werbe-Haekchen (11.10.2026): ein Platzhalter direkt vor dem Absende-Knopf, und der Lead-Aufruf liest dieses Formular
  const ph = h.match(/<div data-vf-werbung="[\w-]+"><\/div>/g) || [];
  assert.strictEqual(ph.length, 1, seite + ': genau ein Haekchen-Platzhalter');
  const nach = h.slice(h.indexOf(ph[0]) + ph[0].length, h.indexOf(ph[0]) + ph[0].length + 160);
  assert.ok(/^['\s+]*<button[^>]*type="submit"|^['\s+]*<button type="submit"/.test(nach), seite + ': Platzhalter direkt ueber dem Absende-Knopf');
  assert.ok(/window\.vfHerkunft\s*\?\s*window\.vfHerkunft\([^)\s]/.test(h), seite + ': Lead-Aufruf uebergibt das Formular');
}
// alle Seiten mit Cookie-Hinweis laden es (Ads-Klick kann auf jeder Seite landen)
const alle = [];
(function such(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  if (e.name.startsWith('.')) continue; const p = path.join(d, e.name);
  if (e.isDirectory()) such(p); else if (e.name.endsWith('.html')) alle.push(p); } })(wurzel);
for (const p of alle) {
  const h = fs.readFileSync(p, 'utf8');
  if (h.includes('cookie-notice.js')) assert.ok(h.includes('/assets/js/vf-herkunft.js?v='), path.relative(wurzel, p) + ': Skript fehlt');
}
console.log('OK vf-herkunft (10 Faelle inkl. Werbe-Haekchen und Einwilligungsnachweis + Einbindung in ' + seiten.length + ' Lead-Seiten)');
