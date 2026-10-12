/* VersicherungsFuchs — Pruefung Consent Mode BASIC (12.10.2026, Task a0d3d60a). Playwright, lokal, nichts geht live raus.
   Aufruf (Windows/Git-Bash):
     NODE_PATH="/c/Users/Sven Cramer/Desktop/Claude Projects/_tools/site-crawl/node_modules" node tools/pruefe_consent_basic_pw.js
   Optional: node tools/pruefe_consent_basic_pw.js --live https://versicherungs-fuchs.online/   (nur Zaehlung vor Einwilligung)

   - Startet einen kleinen Static-Server auf dem Repo (Pretty-URLs aus _redirects, Header des "/*"-Blocks aus _headers
     inkl. CSP), damit die CSP genauso greift wie auf Cloudflare Pages.
   - Google-Loader (gtag/js) kommen echt aus dem Netz, damit das Verhalten echt ist. Alle Mess-Pings (collect,
     conversion ...) werden abgefangen und mit 204 beantwortet - es landen KEINE Testdaten in GA4/Google Ads.
   - api.versicherungs-fuchs.online wird komplett abgefangen (kein echter Lead).
   Faelle: (1) ohne Klick 0 Requests an Google/ProvenExpert (Startseite, Check-Fragenseite, Datenschutz; 1440 + 390 px)
           (2) "Alle akzeptieren" -> Tags laden, genau 1 page_view, keine CSP-Verletzung
           (3) "Nur notwendige" -> 0 Google-Requests, auch nach Neuladen
           (4) Widerruf ueber "Cookie-Einstellungen" -> Banner, "Nur notwendige" -> keine neuen Google-Requests, _ga/_gcl weg
           (5) Lead-Conversion: ohne Einwilligung keine, mit Einwilligung genau 1 (auch bei zwei /api/lead-Antworten)
           (6) statisch: jede Inhaltsseite hat "Cookie-Einstellungen" in der Fusszeile
   Exit-Code 0 = alles gruen. */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const RE_HOST = /(^|\.)(google\.[a-z.]+|doubleclick\.net|googletagmanager\.com|google-analytics\.com|analytics\.google\.com|googlesyndication\.com|googleadservices\.com|provenexpert\.(net|com))$/;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 isurance-audit';
const LABEL = 'B3c6CLqJ_NgcEPDpiocD';
let fehler = 0;
const FAELLE = (process.env.FAELLE || '123456').split('');   // z. B. FAELLE=4: nur der Widerruf
const lauf = n => FAELLE.includes(n);
function pruefe(bed, text) { console.log((bed ? '  OK    ' : '  FEHLER ') + text); if (!bed) fehler++; }

/* ---------- Static-Server ---------- */
function headerAusHeaders() {
  const t = fs.readFileSync(path.join(ROOT, '_headers'), 'utf8').split(/\r?\n/);
  const h = {}; let imBlock = false;
  for (const z of t) {
    if (/^\S/.test(z)) { imBlock = z.trim() === '/*'; continue; }
    const m = imBlock && z.match(/^\s+([A-Za-z-]+):\s*(.+)$/);
    if (m && m[1] !== 'Cache-Control') h[m[1]] = m[2];
  }
  return h;
}
function rewrites() {
  const r = {};
  for (const z of fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8').split(/\r?\n/)) {
    const m = z.match(/^(\/\S+)\s+(\/\S+)\s+200\s*$/); if (m) r[m[1]] = m[2];
  }
  return r;
}
const TYPEN = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function server() {
  const H = headerAusHeaders(), RW = rewrites();
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (RW[p]) p = RW[p];
      let f = path.join(ROOT, p);
      if (!f.startsWith(ROOT)) { rsp.writeHead(403); return rsp.end(); }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!fs.existsSync(f)) { rsp.writeHead(404, { 'Content-Type': 'text/plain' }); return rsp.end('404'); }
      const kopf = Object.assign({ 'Content-Type': TYPEN[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }, H);
      delete kopf['Strict-Transport-Security'];
      rsp.writeHead(200, kopf); fs.createReadStream(f).pipe(rsp);
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}

/* ---------- Browser-Helfer ---------- */
async function kontext(b, vp) {
  const c = await b.newContext({ userAgent: UA, viewport: vp || { width: 1440, height: 900 } });
  const log = { req: [], csp: [], konsole: [] };
  await c.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));
  });
  await c.route('**/*', async route => {
    const r = route.request(); let u; try { u = new URL(r.url()); } catch (e) { return route.continue(); }
    if (u.hostname === 'api.versicherungs-fuchs.online') {
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"ok":true,"lead_id":"test-consent-basic"}' });
    }
    if (RE_HOST.test(u.hostname)) {
      log.req.push({ url: r.url(), post: r.postData() || '' });
      if (/\/gtag\/js/.test(u.pathname)) return route.continue();          // Loader echt
      return route.fulfill({ status: 204, body: '' });                      // Mess-Pings nie an Google
    }
    return route.continue();
  });
  c.on('console', m => { if (m.type() === 'error' || /Content Security Policy/i.test(m.text())) log.konsole.push(m.text()); });
  return { c, log };
}
function pageViews(log) {
  let n = 0;
  for (const r of log.req) {
    if (!/\/g\/collect/.test(r.url)) continue;
    const teile = [r.url].concat(r.post.split(/\r?\n/));
    for (const t of teile) if (/(^|[?&])en=page_view(&|$)/.test(t)) n++;
  }
  return n;
}
const kurz = r => { const u = new URL(r.url); return u.hostname + u.pathname; };
async function cspVerletzungen(p, log) {
  const im = await p.evaluate(() => window.__csp || []).catch(() => []);
  return im.concat(log.konsole.filter(t => /Content Security Policy/i.test(t)));
}
async function scrollen(p) { await p.mouse.wheel(0, 1600); await p.waitForTimeout(600); await p.mouse.wheel(0, -1600); }
async function bannerKnopf(p, text) {
  const k = p.locator('.vf-cn button', { hasText: text });
  await k.waitFor({ state: 'visible', timeout: 5000 }); await k.click();
}
async function warteGoogle(p, log, min) {
  /* bis der GA4-Treffer (g/collect) da ist, hoechstens 15 s; danach 2 s Nachlauf fuer verspaetete Doppel-Treffer */
  for (let i = 0; i < 60 && (log.req.length < min || !log.req.some(r => /\/g\/collect/.test(r.url))); i++) await p.waitForTimeout(250);
  await p.waitForTimeout(2000);
}

/* ---------- Faelle ---------- */
async function main() {
  const live = process.argv.indexOf('--live');
  const b = await chromium.launch();
  if (live > -1) {
    const url = process.argv[live + 1] || 'https://versicherungs-fuchs.online/';
    for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const { c, log } = await kontext(b, vp); const p = await c.newPage();
      await p.goto(url, { waitUntil: 'networkidle' }); await scrollen(p); await p.waitForTimeout(4000);
      console.log('LIVE ' + url + ' ' + vp.width + ' px: ' + log.req.length + ' Requests an Google/ProvenExpert vor Einwilligung');
      log.req.forEach(r => console.log('    ' + kurz(r)));
      await c.close();
    }
    await b.close(); return;
  }
  const srv = await server(); const BASE = 'http://localhost:' + srv.address().port;
  console.log('Static-Server ' + BASE + ' (Repo ' + ROOT + ')');

  if (lauf('1')) console.log('\n(1) Ohne Klick: 0 Requests an Google/ProvenExpert');
  if (lauf('1')) for (const seite of ['/', '/versicherungs-check/q/?type=bu&n=0', '/datenschutz']) {
    for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const { c, log } = await kontext(b, vp); const p = await c.newPage();
      await p.goto(BASE + seite, { waitUntil: 'networkidle' }); await scrollen(p); await p.waitForTimeout(3000);
      const banner = await p.locator('.vf-cn').isVisible().catch(() => false);
      const dlEvents = await p.evaluate(() => (window.dataLayer || []).filter(x => x && x[0] === 'event').length);
      pruefe(log.req.length === 0, seite + ' @' + vp.width + 'px: ' + log.req.length + ' Requests' + (log.req.length ? ' ' + log.req.map(kurz).join(', ') : '')
        + ', Banner ' + (banner ? 'sichtbar' : 'FEHLT') + ', Ereignisse im dataLayer ' + dlEvents);
      if (!banner) pruefe(false, seite + ': Banner nicht sichtbar');
      await c.close();
    }
  }

  if (lauf('2')) console.log('\n(2) "Alle akzeptieren": Tags laden, genau 1 page_view, keine CSP-Verletzung');
  if (lauf('2')) {
    const { c, log } = await kontext(b); const p = await c.newPage();
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    pruefe(log.req.length === 0, 'vor dem Klick 0 Requests (' + log.req.length + ')');
    await bannerKnopf(p, 'Alle akzeptieren'); await warteGoogle(p, log, 3); await scrollen(p); await p.waitForTimeout(1500);
    const loader = log.req.filter(r => /\/gtag\/js/.test(r.url)).length;
    const pv = pageViews(log), csp = await cspVerletzungen(p, log);
    const ck = (await c.cookies()).map(k => k.name);
    pruefe(loader >= 1, 'Loader geladen: ' + loader + 'x gtag/js');
    pruefe(pv === 1, 'GA4 page_view: ' + pv);
    pruefe(csp.length === 0, 'CSP-Verletzungen: ' + csp.length + (csp.length ? ' -> ' + csp.join(' | ') : ''));
    pruefe(ck.some(n => /^_ga/.test(n)), 'Google-Cookies nach Zustimmung: ' + ck.filter(n => /^_g/.test(n)).join(', '));
    console.log('        Google-Requests gesamt ' + log.req.length + ': ' + Array.from(new Set(log.req.map(kurz))).join(', '));
    const fremd = log.konsole.filter(t => !/Content Security Policy/i.test(t));
    if (fremd.length) console.log('        Konsole (sonstige Fehler, lokal erwartbar z. B. cdn-cgi 404): ' + fremd.slice(0, 4).join(' | '));
    // Folgeseite mit gespeicherter Zustimmung: wieder genau 1 page_view
    log.req.length = 0; log.konsole.length = 0;
    await p.goto(BASE + '/datenschutz', { waitUntil: 'networkidle' }); await warteGoogle(p, log, 3);
    const pv2 = pageViews(log), csp2 = await cspVerletzungen(p, log);
    pruefe(pv2 === 1 && csp2.length === 0, 'Folgeseite /datenschutz mit gespeicherter Zustimmung: page_view ' + pv2 + ', CSP ' + csp2.length);
    log.req.length = 0;
    await p.goto(BASE + '/versicherungs-check/q/?type=bu&n=0', { waitUntil: 'networkidle' }); await warteGoogle(p, log, 3);
    const csp3 = await cspVerletzungen(p, log);
    pruefe(pageViews(log) === 1 && csp3.length === 0, 'Check-Fragenseite mit Zustimmung: page_view ' + pageViews(log) + ', CSP ' + csp3.length);
    await c.close();
  }

  if (lauf('3')) console.log('\n(3) "Nur notwendige": 0 Google-Requests');
  if (lauf('3')) {
    const { c, log } = await kontext(b); const p = await c.newPage();
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    await bannerKnopf(p, 'Nur notwendige'); await scrollen(p); await p.waitForTimeout(3000);
    pruefe(log.req.length === 0, 'nach "Nur notwendige": ' + log.req.length);
    await p.evaluate(() => { window.vfEvent && window.vfEvent('check_start', { source: 'test' }); window.gtag && window.gtag('event', 'test_ereignis'); });
    await p.goto(BASE + '/bu-check/', { waitUntil: 'networkidle' }); await scrollen(p); await p.waitForTimeout(3000);
    const wahl = await p.evaluate(() => localStorage.getItem('vf_cookie_consent'));
    const banner = await p.locator('.vf-cn').isVisible().catch(() => false);
    pruefe(log.req.length === 0 && wahl === 'necessary' && !banner, 'Folgeseite /bu-check/: ' + log.req.length + ' Requests, Wahl ' + wahl + ', Banner ' + (banner ? 'sichtbar' : 'weg'));
    await c.close();
  }

  if (lauf('4')) console.log('\n(4) Widerruf ueber "Cookie-Einstellungen"');
  if (lauf('4')) {
    const { c, log } = await kontext(b); const p = await c.newPage();
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    await bannerKnopf(p, 'Alle akzeptieren'); await warteGoogle(p, log, 3);
    const vorher = (await c.cookies()).map(k => k.name).filter(n => /^(_ga|_gcl)/.test(n));
    console.log('        Cookies nach Zustimmung: ' + vorher.join(', '));
    const link = p.locator('footer .vf-cn-trigger').first();
    /* Bis zur Fusszeile scrollen loest das GA4-Ereignis "scroll" (90 %) aus - noch MIT Einwilligung. GA4 sendet es
       gebuendelt mit kurzer Verzoegerung; erst abwarten, damit nur Requests NACH dem Widerruf zaehlen. */
    await link.scrollIntoViewIfNeeded(); await p.waitForTimeout(4000);
    const n0 = log.req.length;
    await link.click();
    const banner = await p.locator('.vf-cn').isVisible().catch(() => false);
    const fokus = await p.evaluate(() => !!(document.activeElement && document.activeElement.closest('.vf-cn')));
    pruefe(banner, 'Banner nach Klick auf "Cookie-Einstellungen" sichtbar (Fokus im Banner: ' + fokus + ')');
    await bannerKnopf(p, 'Nur notwendige');
    await p.evaluate(() => { window.vfEvent && window.vfEvent('check_start', { source: 'nach-widerruf' }); window.gtag && window.gtag('event', 'page_view'); });
    await scrollen(p); await p.waitForTimeout(4000);
    const neu = log.req.slice(n0);
    /* Gemessen 12.10.2026: GA4 haelt das "scroll"-Ereignis (ausgeloest VOR dem Widerruf, noch mit Einwilligung) in seiner
       Warteschlange und schickt es beim consent update mit - erkennbar an gcs=G111 (bei Aufzeichnung "granted").
       Das ist kein neues Ereignis nach dem Widerruf. Fehler ist: ein neuer Loader, ein Treffer mit gcs != G111 oder
       ein Ereignis, das erst nach dem Widerruf ausgeloest wurde (check_start/page_view unten, scroll nach dem Widerruf). */
    const info = r => { const u = new URL(r.url); const en = [u.searchParams.get('en')].concat(r.post.split('\n').map(z => (z.match(/(?:^|&)en=([^&]+)/) || [])[1])).filter(Boolean);
      return { r, gcs: u.searchParams.get('gcs'), en, loader: /\/gtag\/js/.test(u.pathname) }; };
    const neuInfo = neu.map(info);
    if (process.env.DBG) neuInfo.forEach(x => console.log('DBG', kurz(x.r), 'en=' + x.en.join('+'), 'gcs=' + x.gcs));
    const nachzuegler = neuInfo.filter(x => !x.loader && x.gcs === 'G111' && x.en.length && x.en.every(e => e === 'scroll' || e === 'user_engagement'));
    const echtNeu = neuInfo.filter(x => nachzuegler.indexOf(x) < 0);
    pruefe(echtNeu.length === 0, 'neue Google-Requests (Loader/Ereignisse) nach Widerruf + "Nur notwendige": ' + echtNeu.length
      + (echtNeu.length ? ' ' + echtNeu.map(x => kurz(x.r) + ' en=' + x.en.join('+') + ' gcs=' + x.gcs).join(', ') : '')
      + (nachzuegler.length ? ' (dazu ' + nachzuegler.length + ' Nachzuegler aus der Zeit VOR dem Widerruf: ' + nachzuegler.map(x => 'en=' + x.en.join('+') + ' gcs=' + x.gcs).join(', ') + ')' : ''));
    const nachher = (await c.cookies()).map(k => k.name).filter(n => /^(_ga|_gcl)/.test(n));
    const ls = await p.evaluate(() => Object.keys(localStorage).filter(k => /^(_ga|_gcl)/.test(k)));
    const dis = await p.evaluate(() => [window['ga-disable-G-VYF5P956SP'], window['ga-disable-AW-820163824']]);
    pruefe(nachher.length === 0 && ls.length === 0, '_ga/_gcl-Cookies nach Widerruf: ' + (nachher.join(', ') || 'keine') + '; localStorage: ' + (ls.join(', ') || 'keine'));
    pruefe(dis[0] === true && dis[1] === true, 'ga-disable gesetzt: ' + JSON.stringify(dis));
    log.req.length = 0;
    await p.reload({ waitUntil: 'networkidle' }); await scrollen(p); await p.waitForTimeout(3000);
    pruefe(log.req.length === 0, 'nach Neuladen weiterhin 0 Google-Requests (' + log.req.length + ')');
    await c.close();
    /* 4b streng: Widerruf ohne vorheriges Scrollen (nichts in GA4s Warteschlange) -> danach exakt 0 Requests */
    const k2 = await kontext(b); const p2 = await k2.c.newPage();
    await p2.goto(BASE + '/impressum', { waitUntil: 'networkidle' });
    await bannerKnopf(p2, 'Alle akzeptieren'); await warteGoogle(p2, k2.log, 3);
    const m0 = k2.log.req.length;
    await p2.evaluate(() => document.querySelector('footer .vf-cn-trigger').click());
    await bannerKnopf(p2, 'Nur notwendige');
    await p2.evaluate(() => { window.vfEvent && window.vfEvent('check_start', { source: 'nach-widerruf' }); });
    await scrollen(p2); await p2.waitForTimeout(4000);
    const neu2 = k2.log.req.slice(m0);
    pruefe(neu2.length === 0, '/impressum Widerruf ohne Scrollen davor: neue Google-Requests ' + neu2.length + (neu2.length ? ' ' + neu2.map(kurz).join(', ') : ''));
    await k2.c.close();
  }

  if (lauf('5')) console.log('\n(5) Lead-Conversion (/api/lead abgefangen, kein echter Lead)');
  if (lauf('5')) for (const seite of ['/check-anfrage/', '/pkv-check/', '/altersvorsorgedepot/', '/versicherungs-check/voranfrage/?type=bu']) {
    const lead = p => p.evaluate(() => fetch('https://api.versicherungs-fuchs.online/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"test":true}' }).then(r => r.status));
    const zaehle = async (p, log) => ({
      dl: await p.evaluate(() => (window.dataLayer || []).filter(x => x && x[0] === 'event' && x[1] === 'conversion').length),
      netz: log.req.filter(r => r.url.indexOf(LABEL) > -1 || r.post.indexOf(LABEL) > -1).length
    });
    { // ohne Einwilligung (Banner offen und nach "Nur notwendige")
      const { c, log } = await kontext(b); const p = await c.newPage();
      await p.goto(BASE + seite, { waitUntil: 'networkidle' });
      const st = await lead(p); await p.waitForTimeout(1500);
      await bannerKnopf(p, 'Nur notwendige'); await lead(p); await p.waitForTimeout(2500);
      const z = await zaehle(p, log);
      pruefe(st === 200 && z.dl === 0 && z.netz === 0 && log.req.length === 0, seite + ' ohne Einwilligung: Conversion dataLayer ' + z.dl + ', Netz ' + z.netz + ', Google-Requests ' + log.req.length);
      await c.close();
    }
    { // Lead vor der Einwilligung, Zustimmung danach -> nichts nachsenden
      const { c, log } = await kontext(b); const p = await c.newPage();
      await p.goto(BASE + seite, { waitUntil: 'networkidle' });
      await lead(p); await p.waitForTimeout(800);
      await bannerKnopf(p, 'Alle akzeptieren'); await warteGoogle(p, log, 3);
      const z = await zaehle(p, log);
      pruefe(z.dl === 0 && z.netz === 0, seite + ' Lead vor Zustimmung, Zustimmung danach: Conversion dataLayer ' + z.dl + ', Netz ' + z.netz + ' (nichts nachgesendet)');
      await c.close();
    }
    { // mit Einwilligung: zwei /api/lead-Antworten -> genau 1 Conversion
      const { c, log } = await kontext(b); const p = await c.newPage();
      await p.goto(BASE + seite, { waitUntil: 'networkidle' });
      await bannerKnopf(p, 'Alle akzeptieren'); await warteGoogle(p, log, 3);
      await lead(p); await lead(p); await p.waitForTimeout(4000);
      const z = await zaehle(p, log);
      pruefe(z.dl === 1 && z.netz >= 1, seite + ' mit Einwilligung, 2x /api/lead: Conversion-Ereignisse ' + z.dl + ' (Netz-Requests mit Conversion-Label: ' + z.netz + ', Seite ' + new URL(p.url()).pathname + ')');
      await c.close();
    }
  }

  if (lauf('6')) console.log('\n(6) Statisch: "Cookie-Einstellungen" in der Fusszeile jeder Inhaltsseite');
  if (lauf('6')) {
    const seiten = [];
    (function lauf(d) {
      for (const f of fs.readdirSync(d)) {
        if (['.git', 'node_modules', 'tools'].includes(f)) continue;
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) lauf(p); else if (f.endsWith('.html')) seiten.push(p);
      }
    })(ROOT);
    let ohne = [], stubs = [];
    for (const f of seiten) {
      const t = fs.readFileSync(f, 'utf8'), rel = path.relative(ROOT, f).replace(/\\/g, '/');
      const stub = !/<footer[\s>]/i.test(t) && /location\.replace|http-equiv="refresh"/i.test(t);
      if (stub) { stubs.push(rel); continue; }
      const fuss = (t.match(/<footer[\s\S]*?<\/footer>/gi) || []).join('');
      if (!/class="[^"]*vf-cn-trigger/.test(fuss)) ohne.push(rel);
    }
    pruefe(ohne.length === 0, (seiten.length - stubs.length) + ' Inhaltsseiten, ohne Fusszeilen-Link: ' + (ohne.join(', ') || 'keine'));
    console.log('        reine Weiterleitungsseiten ohne Fusszeile (kein sichtbarer Inhalt): ' + stubs.join(', '));
  }

  await b.close(); srv.close();
  console.log('\n' + (fehler ? fehler + ' FEHLER' : 'ALLES GRUEN'));
  process.exit(fehler ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
