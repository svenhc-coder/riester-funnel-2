import json, subprocess, time, sys
from playwright.sync_api import sync_playwright

ROOT = "C:/Users/Sven Cramer/Desktop/Claude Projects/_wt/vf-cta-0711"
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8765", "--directory", ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)
res = {}
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="C:/Program Files/Google/Chrome/Application/chrome.exe")
        for name, vp in (("desktop", {"width": 1280, "height": 900}), ("375", {"width": 375, "height": 800}), ("320", {"width": 320, "height": 700})):
            ctx = b.new_context(viewport=vp)
            pg = ctx.new_page()
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "favicon" not in m.text else None)
            posted = []
            def handler(route, request):
                h = {"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST,OPTIONS"}
                if request.method == "OPTIONS":
                    return route.fulfill(status=204, headers=h)
                posted.append(json.loads(request.post_data))
                route.fulfill(status=200, headers=h, content_type="application/json", body="{\"ok\":true}")
            pg.route("**/api.versicherungs-fuchs.online/api/lead", handler)
            pg.goto("http://localhost:8765/beratungsbedarf-ampel/")
            pg.wait_for_selector("#ampel-app fieldset")
            bt = pg.locator(".vf-cn button")
            print(name, [bt.nth(i).inner_text() for i in range(bt.count())])
            if bt.count(): pg.locator(".vf-cn button", has_text="otwendig").first.click()
            # Schritt 1
            assert pg.is_disabled("#am-weiter")
            pg.check("input[name=alter][value='30-44']"); pg.check("input[name=status][value=angestellt]"); pg.check("input[name=wohnen][value=haus]")
            pg.click("#am-weiter")
            # Schritt 2
            pg.check("input[name=partner][value=ja]"); pg.check("input[name=kinder][value='2']")
            pg.get_by_label("Ich habe einen Hund").check()
            pg.get_by_label("Ich besitze ein Auto oder Motorrad").check()
            pg.get_by_label("Ich habe einen laufenden Kredit").check()
            pg.check("input[name=hh][value=nein]")
            pg.click("#am-weiter")
            # Schritt 3: alles Nein ausser Haftpflicht ueber Partner
            for sid in ["haftpflicht", "bu", "leben", "kfz", "wohngebaeude", "altersvorsorge", "rechtsschutz", "unfall", "hausrat", "kranken"]:
                sel = "input[name=v-%s]" % sid
                if pg.locator(sel).count():
                    pg.check("input[name=v-%s][value=%s]" % (sid, "ja" if sid == "haftpflicht" else "nein"))
                    if sid == "haftpflicht":
                        pg.check("input[name=u-haftpflicht][value=partner]")
            assert not pg.is_disabled("#am-weiter")
            pg.click("#am-weiter")
            pg.wait_for_selector(".am-gesamt")
            txt = pg.inner_text("#ampel-app")
            assert "Gesamt: Lücke" in txt, txt[:300]
            assert "Hunde" in txt
            res[name + "_overflow"] = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            # Lead absenden
            pg.fill("#am-name", "Test Person"); pg.fill("#am-tel", "0151123456")
            pg.click(".am-lead button[type=submit]"); assert "bestätigen" in pg.inner_text(".am-fehler"); assert not posted
            pg.check("#am-consent")
            pg.click(".am-lead button[type=submit]")
            try:
                pg.wait_for_selector(".am-ok", timeout=5000)
            except Exception:
                print("FEHLER:", pg.inner_text(".am-fehler"), "| posted", len(posted), "| errs", errs); raise
            assert "Danke! Ihre Anfrage ist bei uns angekommen." in pg.inner_text(".am-ok")
            pl = posted[0]
            assert pl["source"] == "beratungsbedarf-ampel" and pl["answers"]["ampel_gesamt"] == "rot"
            assert pl["answers"]["ampel_je_sparte"]["haftpflicht"] == "rot"  # Hund ohne Tierhalter
            assert "email" not in pl or pl["email"] is None
            res[name + "_payload_keys"] = sorted(pl["answers"].keys())
            res[name + "_errs"] = errs
            ctx.close()
        # Resume: localStorage
        ctx = b.new_context(viewport={"width": 1280, "height": 900}); pg = ctx.new_page()
        pg.goto("http://localhost:8765/beratungsbedarf-ampel/"); pg.wait_for_selector("#ampel-app fieldset")
        pg.check("input[name=alter][value='18-29']"); pg.reload(); pg.wait_for_selector("#ampel-app fieldset")
        res["resume_alter_checked"] = pg.is_checked("input[name=alter][value='18-29']")
        b.close()
finally:
    srv.terminate()
print(json.dumps(res, indent=1, ensure_ascii=False))
