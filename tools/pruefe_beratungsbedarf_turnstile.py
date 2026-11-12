"""Turnstile-Pfad der Beratungsbedarfs-Ampel (lokal, Cloudflare-Skript und Lead-API gemockt).
Aufruf: py -3 tools/pruefe_beratungsbedarf_turnstile.py  (Chrome-Pfad ggf. anpassen)"""
import json, subprocess, sys, time, os
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8766", "--directory", ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)
H = {"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST,OPTIONS"}
STUB = "window.turnstile={render:function(b,o){setTimeout(function(){o.callback('stub-token')},50);return 'w1'},reset:function(){}};"


def bis_formular(pg):
    pg.goto("http://localhost:8766/beratungsbedarf-ampel/")
    pg.evaluate("localStorage.clear(); document.getElementById('ampel-app').setAttribute('data-turnstile-sitekey','1x00000000000000000000AA')")
    pg.reload() if False else None
    pg.evaluate("location.reload()")
    pg.wait_for_selector("#ampel-app fieldset")
    pg.evaluate("document.getElementById('ampel-app').setAttribute('data-turnstile-sitekey','1x00000000000000000000AA')")
    if pg.locator(".vf-cn button", has_text="otwendig").count():
        pg.locator(".vf-cn button", has_text="otwendig").first.click()
    pg.check("input[name=alter][value='30-44']"); pg.check("input[name=status][value=angestellt]"); pg.check("input[name=wohnen][value=miete]")
    pg.click("#am-weiter")
    pg.check("input[name=partner][value=nein]"); pg.click("#am-weiter")
    for sid in ["haftpflicht", "bu", "leben", "altersvorsorge", "rechtsschutz", "unfall", "hausrat", "kranken"]:
        if pg.locator("input[name=v-%s]" % sid).count():
            pg.check("input[name=v-%s][value=nein]" % sid)
    pg.click("#am-weiter"); pg.wait_for_selector(".am-lead")


res = {}
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME)
        for fall in ("ok", "ausfall", "http503"):
            pg = b.new_context().new_page()
            posted = []
            if fall == "ausfall":
                pg.route("https://challenges.cloudflare.com/**", lambda r: r.abort())
            else:
                pg.route("https://challenges.cloudflare.com/**", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB))

            def api(route, request, fall=fall):
                if request.method == "OPTIONS":
                    return route.fulfill(status=204, headers=H)
                posted.append(json.loads(request.post_data))
                if fall == "http503":
                    return route.fulfill(status=503, headers=H, content_type="application/json", body='{"detail":"turnstile_ausfall"}')
                route.fulfill(status=200, headers=H, content_type="application/json", body='{"ok":true}')
            pg.route("**/api.versicherungs-fuchs.online/api/lead", api)
            # sitekey wird gesetzt, bevor der Ergebnisschritt rendert
            bis_formular(pg)
            pg.fill("#am-name", "Test"); pg.fill("#am-email", "t@beispiel.de"); pg.check("#am-consent")
            time.sleep(0.4)
            pg.click(".am-lead button[type=submit]")
            time.sleep(0.8)
            if fall == "ok":
                pg.wait_for_selector(".am-ok", timeout=5000)
                assert posted and posted[0]["extra"]["cf_turnstile"] == "stub-token", posted
                res[fall] = "ok Token im Payload"
            elif fall == "ausfall":
                assert not posted, "kein POST ohne Token"
                t = pg.inner_text(".am-fehler")
                assert "0221 16829452" in t and "info@isurance-group.de" in t, t
                res[fall] = "Meldung mit Telefon/Mail, kein POST"
            else:
                t = pg.inner_text(".am-fehler")
                assert "0221 16829452" in t and pg.is_enabled(".am-lead button[type=submit]"), t
                res[fall] = "503 -> Meldung mit Telefon/Mail, Formular bleibt nutzbar"
        b.close()
finally:
    srv.terminate()
print(json.dumps(res, ensure_ascii=False, indent=1))
