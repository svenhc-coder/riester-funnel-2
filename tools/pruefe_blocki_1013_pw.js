/* VersicherungsFuchs — Pruefung Nachtaudit Block I (13.10.2026). Playwright, lokal, nichts geht live raus.
   Aufruf: NODE_PATH=".../_tools/site-crawl/node_modules" node tools/pruefe_blocki_1013_pw.js
   (A) Voranfrage (Art. 9): erst auf der Startseite "Alle akzeptieren" (Google laedt nachweislich), dann
       /versicherungs-check/voranfrage/?type=bu&gclid=TESTGCLID: 0 Requests an Google, auch nach Absenden von Schritt 1;
       /api/lead-Body ohne gclid/einwilligung_marketing; Folgeseite sieht die Voranfrage nicht als document.referrer.
   (B) Riester-Ergebnis: /api/lead antwortet 2x 500 -> ehrlicher Fehlerhinweis mit Mail/Telefon, kein Lead gespeichert,
       "Erneut senden" mit 200 -> Bestaetigung. Erfolgsfall: kein Fehlerhinweis.
   Exit-Code 0 = alles gruen. */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const RE_HOST = /(^|\.)(google\.[a-z.]+|doubleclick\.net|googletagmanager\.com|google-analytics\.com|analytics\.google\.com|googlesyndication\.com|googleadservices\.com)$/;
let fehler = 0;
function pruefe(bed, text) { console.log((bed ? '  OK    ' : '  FEHLER ') + text); if (!bed) fehler++; }

function server() {
  const RW = {};
  for (const z of fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8').split(/\r?\n/)) {
    const m = z.match(/^(\/\S+)\s+(\/\S+)\s+200\s*$/); if (m) RW[m[1]] = m[2];
  }
  const T = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2' };
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (RW[p]) p = RW[p];
      let f = path.join(ROOT, p);
      if (!f.startsWith(ROOT)) { rsp.writeHead(403); return rsp.end(); }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
      if (!fs.existsSync(f)) { rsp.writeHead(404); return rsp.end('404'); }
      rsp.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(rsp);
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}

async function kontext(b, api) {
  const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const log = { google: [], api: [] };
  await c.route('**/*', async route => {
    const r = route.request(); let u; try { u = new URL(r.url()); } catch (e) { return route.continue(); }
    if (u.hostname === 'api.versicherungs-fuchs.online') {
      log.api.push({ pfad: u.pathname, body: r.postData() || '' });
      const st = api(u.pathname, log.api.length);
      return route.fulfill({ status: st, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: st < 300 ? '{"ok":true,"lead_id":"test-blocki"}' : '{"detail":"x"}' });
    }
    if (RE_HOST.test(u.hostname)) {
      log.google.push({ url: r.url(), post: r.postData() || '', zeit: Date.now() });
      if (/\/gtag\/js/.test(u.pathname)) return route.continue();
      return route.fulfill({ status: 204, body: '' });
    }
    return route.continue();
  });
  return { c, log };
}

async function main() {
  const b = await chromium.launch();
  const srv = await server(); const BASE = 'http://localhost:' + srv.address().port;

  console.log('\n(A) Voranfrage: nach "Alle akzeptieren" 0 Google-Requests');
  {
    const { c, log } = await kontext(b, () => 200); const p = await c.newPage();
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    const k = p.locator('.vf-cn button', { hasText: 'Alle akzeptieren' });
    await k.waitFor({ state: 'visible', timeout: 5000 }); await k.click();
    for (let i = 0; i < 60 && !log.google.length; i++) await p.waitForTimeout(250);
    pruefe(log.google.length > 0, 'Startseite: nach "Alle akzeptieren" laedt Google (' + log.google.length + ' Requests) - Einwilligung greift');
    const vorher = log.google.length;
    await p.evaluate(() => sessionStorage.setItem('vf_ans_bu', JSON.stringify({ gesundheit: 'mehrere' })));
    await p.goto(BASE + '/versicherungs-check/voranfrage/?type=bu&gclid=TESTGCLID', { waitUntil: 'networkidle' });
    await p.waitForTimeout(3000);
    pruefe(await p.evaluate(() => localStorage.getItem('vf_cookie_consent')) === 'accepted', 'Einwilligung steht auf "accepted"');
    pruefe(log.google.length === vorher, 'Voranfrage geladen: ' + (log.google.length - vorher) + ' Google-Requests (erwartet 0)');
    pruefe(await p.evaluate(() => !document.querySelector('script[src*="vf-messung"]') && !document.querySelector('script[src*="googletagmanager"]')), 'kein vf-messung.js / gtag.js im DOM');
    await p.fill('#c-name', 'Martina Beispielfrau'); await p.fill('#c-tel', '0151 23456789'); await p.fill('#c-email', 'martina.beispielfrau@gmail.com');
    await p.$eval('#c1', e => { e.checked = true; }); await p.click('#cbtn'); await p.waitForTimeout(2500);
    const lead = log.api.find(a => a.pfad === '/api/lead');
    pruefe(!!lead, 'Schritt 1 sendet /api/lead (gemockt)');
    pruefe(lead && !/TESTGCLID|gclid|einwilligung_marketing/.test(lead.body), '/api/lead-Body ohne gclid/einwilligung_marketing');
    pruefe(log.google.length === vorher, 'nach Absenden Schritt 1: ' + (log.google.length - vorher) + ' Google-Requests (erwartet 0)');
    pruefe(await p.locator('#step2').isVisible(), 'Schritt 2 (Gesundheitsbogen) erscheint');
    await p.click('a[href="/datenschutz"]'); await p.waitForLoadState('networkidle'); await p.waitForTimeout(3000);
    const ref = await p.evaluate(() => document.referrer);
    pruefe(!/voranfrage/.test(ref), 'Folgeseite: document.referrer ohne Voranfrage ("' + ref + '")');
    const leck = log.google.filter(r => /voranfrage/.test(decodeURIComponent(r.url + ' ' + r.post)));
    pruefe(leck.length === 0, 'kein Google-Request enthaelt "voranfrage" (' + leck.length + ')');
    await c.close();
  }

  const ANTW = { vertragstyp: 'klassisch', abschlussjahr: 'vor2005', vertrag_status: 'aktiv', beitrag: 'unter50', kinder: '0', zulagen: 'automatisch', anlage_av: 'jaehrlich', einkommen: 'unter25k', beschaeftigung: 'angestellt', transparenz: 'klar', risikoprofil: 'sicherheit', zielbild: 'behalten' };
  async function riester(api) {
    const { c, log } = await kontext(b, api); const p = await c.newPage();
    await p.goto(BASE + '/datenschutz', { waitUntil: 'domcontentloaded' });
    await p.evaluate(a => { sessionStorage.setItem('vf_answers', JSON.stringify(a)); sessionStorage.removeItem('vf_lead'); }, ANTW);
    await p.goto(BASE + '/riester-check/result/', { waitUntil: 'networkidle' });
    const nn = p.locator('.vf-cn button', { hasText: 'Nur notwendige' });
    if (await nn.isVisible().catch(() => false)) await nn.click();
    await p.fill('#inp-name', 'Martina Beispielfrau'); await p.fill('#inp-email', 'martina.beispielfrau@gmail.com'); await p.fill('#inp-tel', '0151 23456789');
    await p.$eval('#inp-consent', e => { e.checked = true; }); await p.click('#btn-submit');
    await p.waitForSelector('#result-section', { state: 'visible', timeout: 10000 });
    return { c, log, p };
  }
  console.log('\n(B) Riester: Backend-Fehler wird ehrlich gemeldet');
  {
    let fail = true;
    const { c, log, p } = await riester(() => (fail ? 500 : 200));
    pruefe(log.api.filter(a => a.pfad === '/api/lead').length === 2, 'zwei Versuche an /api/lead');
    pruefe(await p.locator('#lead-fehler').isVisible(), 'Fehlerhinweis sichtbar');
    const t = await p.locator('#lead-fehler').innerText();
    pruefe(/info@isurance-group\.de/.test(t) && /0221 3791692/.test(t), 'Hinweis nennt Mail und Telefon');
    pruefe(await p.evaluate(() => !sessionStorage.getItem('vf_lead')), 'kein Lead als "gesendet" gespeichert');
    fail = false; await p.click('#lead-fehler-btn'); await p.waitForTimeout(1500);
    pruefe(await p.locator('.lead-ok-hinweis').isVisible(), '"Erneut senden" mit 200 -> Bestaetigung');
    pruefe(await p.evaluate(() => !!sessionStorage.getItem('vf_lead')), 'danach Lead gespeichert');
    await c.close();
  }
  {
    const { c, p } = await riester(() => 200);
    pruefe(!(await p.locator('#lead-fehler').count()), 'Erfolgsfall: kein Fehlerhinweis');
    pruefe(!/Eine Weitergabe an Dritte erfolgt nicht/.test(fs.readFileSync(path.join(ROOT, 'riester-check/result/index.html'), 'utf8')), 'Einwilligung ohne "Eine Weitergabe an Dritte erfolgt nicht"');
    await c.close();
  }
  srv.close(); await b.close();
  console.log(fehler ? '\n' + fehler + ' FEHLER' : '\nALLES GRUEN'); process.exit(fehler ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
