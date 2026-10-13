// Test assets/js/vf-herkunft.js (11.10.2026, P0-2 Herkunft im Lead) ohne Browser:   node tools/pruefe_herkunft.js
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const wurzel = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(wurzel, 'assets', 'js', 'vf-herkunft.js'), 'utf8');
function lauf({ search = '', pathname = '/pkv-check/', sitzung = {}, consent = null } = {}) {
  const lokal = { vf_cookie_consent: consent }, hoerer = {};
  const ctx = {
    location: { search, pathname, origin: 'https://versicherungs-fuchs.online' },
    sessionStorage: { getItem: (k) => (k in sitzung ? sitzung[k] : null), setItem: (k, v) => { sitzung[k] = String(v); },
      removeItem: (k) => { delete sitzung[k]; } },
    localStorage: { getItem: (k) => lokal[k] ?? null },
    addEventListener: (n, f) => { hoerer[n] = f; },
    URLSearchParams, JSON, String, Object,
  };
  ctx.window = ctx;
  vm.runInNewContext(code, ctx);
  return { h: () => JSON.parse(JSON.stringify(ctx.vfHerkunft())), sitzung, lokal, hoerer };
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
  landing_page: 'https://versicherungs-fuchs.online/pkv-check/', einwilligung_marketing: true });
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
assert.deepStrictEqual(t.h(), { landing_page: 'https://versicherungs-fuchs.online/pkv-check/', einwilligung_marketing: true });
// Einbindung: jede Seite mit /api/lead laedt das Skript und legt vfHerkunft() in extra
const seiten = ['check-anfrage/index.html', 'altersvorsorgedepot/index.html', 'pkv-check/index.html',
  'riester-check/result/index.html', 'versicherungs-check/ergebnis/index.html'];
// 13.10.2026 Nachtaudit B (Art. 9): die Voranfrage gibt KEINE Klick-ID/Werbe-Einwilligung weiter (kein Ads-Upload aus dem Gesundheitsweg)
assert.ok(!/window\.vfHerkunft\s*\?\s*window\.vfHerkunft\(\)/.test(fs.readFileSync(path.join(wurzel, 'versicherungs-check/voranfrage/index.html'), 'utf8')), 'Voranfrage: kein vfHerkunft()');
for (const seite of seiten) {
  const h = fs.readFileSync(path.join(wurzel, seite), 'utf8');
  assert.ok(/<script defer src="\/assets\/js\/vf-herkunft\.js\?v=[^"]+"><\/script>/.test(h), seite + ': Skript eingebunden');
  const posts = (h.match(/fetch\([^)]*\/api\/lead'/g) || []).length, mit = (h.match(/window\.vfHerkunft\s*\?\s*window\.vfHerkunft\(\)/g) || []).length;
  assert.ok(posts >= 1 && mit === posts, seite + ': vfHerkunft() in jedem /api/lead-Aufruf (' + mit + '/' + posts + ')');
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
console.log('OK vf-herkunft (7 Faelle + Einbindung in ' + seiten.length + ' Lead-Seiten)');
