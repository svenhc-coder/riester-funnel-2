"""Schaltet die Beratungsbedarfs-Ampel live (E4). Vorher: Christians OK zur Regeltabelle + Turnstile-Widget + Lead-Test.
Aufruf: py -3 tools/ampel_live_schalten.py [Wurzelordner]   (ohne Argument: das Repo selbst)
Macht: noindex -> index, Karte im Hub /versicherungs-check/ + ItemList, sitemap.xml, llms.txt, llms-full.txt. Idempotent."""
import io, os, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE = "https://versicherungs-fuchs.online/beratungsbedarf-ampel/"


def rw(f, fn):
    p = os.path.join(ROOT, f)
    s = io.open(p, encoding="utf-8", newline="").read()
    n = fn(s)
    if n == s:
        print("unveraendert:", f)
        return
    io.open(p, "w", encoding="utf-8", newline="").write(n)
    print("geaendert:", f)


def seite(s):
    return s.replace('<meta name="robots" content="noindex,follow">', '<meta name="robots" content="index,follow">')


def hub(s):
    if "/beratungsbedarf-ampel/" in s:
        return s
    karte = ('      <a id="ampel" class="vc-card" href="/beratungsbedarf-ampel/">\n'
             '        <div class="vc-ico">🚦</div><h3>Beratungsbedarfs-Ampel</h3>\n'
             '        <p>Welche Absicherung fehlt Ihnen? Drei Minuten, eine Ampel je Bereich: gedeckt, bitte prüfen oder Lücke.</p><span class="vc-go">Zur Ampel →</span></a>\n')
    marke = '      <a id="riester" class="vc-card" href="/riester-check/">'
    assert s.count(marke) == 1
    s = s.replace(marke, karte + marke)
    erst = '{"@type":"ListItem","position":1,"name":"Berufsunfähigkeits-Check"'
    assert s.count(erst) == 1
    return s.replace(erst, '{"@type":"ListItem","position":0,"name":"Beratungsbedarfs-Ampel","url":"' + BASE + '"},\n    ' + erst)


def sitemap(s):
    if BASE in s:
        return s
    marke = '  <url><loc>https://versicherungs-fuchs.online/cyber-ampel/</loc>'
    assert s.count(marke) == 1
    return s.replace(marke, '  <url><loc>' + BASE + '</loc><lastmod>2026-11-12</lastmod></url>\n' + marke)


def llms(s):
    if BASE in s:
        return s
    marke = "### Cyber-Ampel (für Betriebe mit Cyber-Police"
    assert s.count(marke) == 1
    block = ("### Beratungsbedarfs-Ampel (für Privatpersonen, NEU November 2026)\n"
             "- URL: [" + BASE + "](" + BASE + ")\n"
             "- Frage: Welche Absicherung fehlt mir? Fragen zu Lebenssituation, Haushalt und vorhandenen Versicherungen ergeben je Bereich eine Ampel (gedeckt, bitte prüfen, Lücke) und drei Empfehlungen mit Regel und Quelle. Kostenlos, ohne Anmeldung, regelbasiert ohne KI, keine Gesundheitsdaten.\n\n")
    s = s.replace(marke, block + marke)
    zeile = '- "Ist meine Cyber-Versicherung noch aktuell?" -> https://versicherungs-fuchs.online/cyber-ampel/'
    if s.count(zeile) == 1:
        s = s.replace(zeile, '- "Welche Versicherungen brauche ich?" -> ' + BASE + "\n" + zeile)
    return s


def llms_full(s):
    if BASE in s:
        return s
    marke = "## Cyber-Ampel: Ist Ihre Cyber-Police noch aktuell? | VersicherungsFuchs"
    assert s.count(marke) == 1
    block = ("## Beratungsbedarfs-Ampel: Welche Absicherung fehlt Ihnen? | VersicherungsFuchs\n" + BASE + "\n"
             "In drei Minuten zur Ampel: Welche Versicherungen sind für Ihre Situation wichtig, wo ist eine Lücke, was sollten Sie prüfen? Kostenlos, ohne Anmeldung, regelbasiert ohne KI.\n"
             "Themen: So funktioniert die Ampel; Häufige Fragen\n\n")
    return s.replace(marke, block + marke)


rw("beratungsbedarf-ampel/index.html", seite)
rw("versicherungs-check/index.html", hub)
rw("sitemap.xml", sitemap)
rw("llms.txt", llms)
rw("llms-full.txt", llms_full)
