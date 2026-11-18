# -*- coding: utf-8 -*-
"""Messpruefung CTA-Klick VF (Playwright, py). Voraussetzung: Repo-Wurzel lokal serviert, z. B. py -m http.server 8766 --bind 127.0.0.1
Aufruf: py tools/pruefe_cta_klick_pw.py [http://127.0.0.1:8766]
Prueft: mit Einwilligung landet cta_klick {cta_ort, cta_ziel} (+ hero_anfrage_klick beim Hero-Knopf) im dataLayer, ohne Einwilligung nicht."""
import sys
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8766"
CH = r"C:/Program Files/Google/Chrome/Application/chrome.exe"
JS = "() => (window.dataLayer||[]).map(a => Array.prototype.slice.call(a)).filter(a => a[0]==='event' && /cta_klick|hero_anfrage_klick/.test(a[1])).map(a => [a[1], a[2].cta_ort, a[2].cta_ziel].join('|'))"
fehler = []
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=CH, headless=True)
    for consent, erwartet in (("accepted", True), ("necessary", False)):
        c = b.new_context(viewport={"width": 1280, "height": 800})
        c.add_init_script("try{localStorage.setItem('vf_cookie_consent','%s');localStorage.setItem('vf_cookie_consent_at',String(Date.now()))}catch(e){}" % consent)
        c.route("**/googletagmanager.com/**", lambda r: r.abort())
        pg = c.new_page(); pg.goto(base + "/bu-check/", wait_until="load"); pg.wait_for_timeout(800)
        # Klick ohne echte Navigation: Link-Ziel abfangen
        pg.evaluate("document.addEventListener('click',function(e){var a=e.target.closest('a');if(a)e.preventDefault()},true)")
        pg.click('a[data-cta-ort="hero"]'); pg.wait_for_timeout(200)
        strip = pg.locator('.cta-strip a[data-cta-ziel="anfrage"]').first
        strip.scroll_into_view_if_needed(); strip.click(); pg.wait_for_timeout(200)
        ev = pg.evaluate(JS)
        print(consent, ev)
        if erwartet:
            for w in ("cta_klick|hero|check", "hero_anfrage_klick|hero|check", "cta_klick|strip-1|anfrage"):
                if w not in ev:
                    fehler.append("%s: fehlt %s" % (consent, w))
        elif ev:
            fehler.append("ohne Einwilligung gesendet: %s" % ev)
        c.close()
    b.close()
print("FEHLER: %s" % fehler if fehler else "OK")
sys.exit(1 if fehler else 0)
