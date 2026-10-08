// Test assets/js/vf-ki-quelle.js + vfExtra() (08.10.2026, KI-Sichtbarkeit) ohne Browser:   node tools/pruefe_ki_quelle.js
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const wurzel = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(wurzel, 'assets', 'js', 'vf-ki-quelle.js'), 'utf8');
function lauf({ search = '', referrer = '', sitzung = {} } = {}) {
  const ctx = {
    location: { search, hostname: 'versicherungs-fuchs.de', host: 'versicherungs-fuchs.de', pathname: '/check-anfrage/' },
    document: { referrer },
    sessionStorage: { getItem: (k) => (k in sitzung ? sitzung[k] : null), setItem: () => { throw new Error('vf-ki-quelle.js darf nichts speichern'); } },
    URL, URLSearchParams, JSON, String,
  };
  ctx.window = ctx;
  vm.runInNewContext(code, ctx);
  return ctx;
}
const ki = (o) => lauf(o).vfKiQuelle();
assert.deepStrictEqual(['chatgpt.com', 'www.chatgpt.com', 'chat.openai.com', 'perplexity.ai', 'gemini.google.com', 'claude.ai',
  'copilot.microsoft.com', 'www.google.com', 'openai.com', 'evilchatgpt.com', 'chatgpt.com.evil.de', '', null].map(lauf().vfKiQuelleAus),
  ['chatgpt', 'chatgpt', 'chatgpt', 'perplexity', 'gemini', 'claude', 'copilot', '', '', '', '', '', '']);
assert.strictEqual(ki({ search: '?utm_source=chatgpt.com' }), 'chatgpt', 'utm_source der aktuellen Seite');
assert.strictEqual(ki({ referrer: 'https://www.perplexity.ai/search?q=x' }), 'perplexity', 'Referrer der aktuellen Seite');
assert.strictEqual(ki({ referrer: 'https://versicherungs-fuchs.de/', sitzung: { vf_ref: 'https://gemini.google.com/app' } }), 'gemini', 'Erstkontakt aus vf_ref');
assert.strictEqual(ki({ sitzung: { vf_utm: JSON.stringify({ source: 'claude.ai' }) } }), 'claude', 'Erstkontakt aus vf_utm');
assert.strictEqual(ki({ search: '?utm_source=chatgpt.com', sitzung: { vf_ref: 'https://claude.ai/' } }), 'claude', 'Erstkontakt gewinnt');
assert.strictEqual(ki({ referrer: 'https://www.google.com/' }), '', 'Google ist keine KI-Quelle');
assert.strictEqual(ki({ sitzung: { vf_utm: '{kaputt' } }), '', 'kaputter Speicher wirft nicht');
// Einbindung: jede Seite mit /api/lead laedt das Skript und gibt ki_quelle in extra mit
for (const seite of ['check-anfrage/index.html', 'altersvorsorgedepot/index.html', 'pkv-check/index.html', 'pkv-check.html',
  'riester-check/result/index.html', 'versicherungs-check/ergebnis/index.html', 'versicherungs-check/voranfrage/index.html']) {
  const h = fs.readFileSync(path.join(wurzel, seite), 'utf8');
  assert.ok(/<script src="\/assets\/js\/vf-ki-quelle\.js[^"]*"><\/script>/.test(h), seite + ': Skript eingebunden');
  assert.ok(/ki_quelle\s*:\s*\(window\.vfKiQuelle/.test(h) || /window\.vfExtra/.test(h), seite + ': ki_quelle im Lead');
  if (/vf-checks\.js/.test(h)) assert.ok(h.indexOf('vf-ki-quelle.js') < h.indexOf('vf-checks.js'), seite + ': vor vf-checks.js geladen');
}
assert.ok(/ki_quelle: \(window\.vfKiQuelle && window\.vfKiQuelle\(\)\) \|\| undefined/.test(
  fs.readFileSync(path.join(wurzel, 'assets', 'js', 'vf-checks.js'), 'utf8')), 'vfExtra() liefert ki_quelle');
console.log('OK vf-ki-quelle (13 Faelle + Einbindung in 7 Seiten)');
