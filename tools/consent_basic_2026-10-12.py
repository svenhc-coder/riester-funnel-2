# -*- coding: utf-8 -*-
"""VF: Consent Mode ADVANCED -> BASIC (Sven 11.10.2026, Task a0d3d60a: BASIC auf allen Marken-Websites).
Gegenstueck zu tools/consent_advanced_2026-10-05.py; Referenz regionalmarken-websites/messung.py (12.10.2026).

Die Logik steckt in drei gemeinsamen Dateien (direkt im Repo geaendert, nicht von diesem Skript geschrieben):
- assets/js/vf-messung.js   Google-Tag erst nach "Alle akzeptieren"; Ereignis-Waechter; Widerruf (ga-disable, Cookies
                            loeschen); vfAdsConversion nur mit Einwilligung, einmal je Lead.
- assets/js/cookie-notice.js Bannertext passend zu BASIC; Widerruf ohne Neuladen; 12-Monats-Ablauf der Wahl.
- assets/js/vf-siegel.js    ProvenExpert-Skript wird nicht mehr geladen, nur noch der statische Profil-Link.
Dieses Skript zieht das HTML nach:
1. alle Seiten: Kommentar am consent default (ADVANCED -> BASIC); Cache-Busting ?v= fuer die drei Dateien
   (/assets/* wird laut _headers 1 Jahr "immutable" gecacht - ohne neue ?v= saehen Wiederkehrer den alten Stand);
   leeren ProvenExpert-Container <div id="proSealWidget"></div> entfernen.
1b. Funnel-Seiten ohne Fusszeile (Fragen, Ergebnis, Voranfrage, Riester-Fragen): kleine Fusszeile mit Datenschutz,
    Impressum und "Cookie-Einstellungen" (Widerruf).
2. datenschutz.html: Stand, Abschnitt 3 / 3.1 / 3.3 und der ProvenExpert-Absatz an BASIC angeglichen
   (Wortlaut: Entwurf, Anwalt prueft).
3. _headers: CSP ohne ProvenExpert-Hosts (es wird nichts mehr von dort geladen).
Idempotent (zweiter Lauf: 0 Aenderungen). Aufruf: python tools/consent_basic_2026-10-12.py
"""
import io, os, re
HIER = os.path.dirname(os.path.abspath(__file__)); VF = os.path.dirname(HIER)
V = "20261012"
GEAENDERT = []


def lese(rel): return io.open(os.path.join(VF, rel), encoding="utf-8", newline="").read()


def schreibe(rel, t):
    p = os.path.join(VF, rel)
    io.open(p + ".neu", "w", encoding="utf-8", newline="").write(t); os.replace(p + ".neu", p); GEAENDERT.append(rel)


def ersetze(t, alt, neu, rel):
    """genau einmal ersetzen; schon ersetzt -> unveraendert (idempotent); weder noch -> Abbruch"""
    if neu in t:
        return t
    if t.count(alt) != 1:
        raise SystemExit("ABBRUCH %s: Stelle %dx gefunden: %r" % (rel, t.count(alt), alt[:70]))
    return t.replace(alt, neu)


def ersetze_re(t, muster, neu, marker, rel):
    """Regex-Ersatz genau einer Stelle; Marker schon da -> unveraendert"""
    if marker in t:
        return t
    treffer = re.findall(muster, t, flags=re.S)
    if len(treffer) != 1:
        raise SystemExit("ABBRUCH %s: Muster %dx gefunden: %r" % (rel, len(treffer), muster[:70]))
    return re.sub(muster, lambda m: neu, t, count=1, flags=re.S)


# 1. alle Seiten ------------------------------------------------------------------------------------------------
KOMM_ALT = ("<!-- Consent ADVANCED (05.10.2026, Sven): Google Ads + GA4 laden sofort (assets/js/vf-messung.js); ohne Einwilligung"
            "{nl}     bleibt alles \"denied\" - keine Cookies, nur cookielose Pings. ads_data_redaction entfernt Klick-Kennungen. -->")
KOMM_NEU = ("<!-- Consent BASIC (12.10.2026, Sven, Task a0d3d60a): hier nur dataLayer-Stub + consent default - kein Request an Google."
            "{nl}     Google Ads + GA4 laedt assets/js/vf-messung.js erst nach \"Alle akzeptieren\"; Ereignisse vorher werden verworfen. -->")
VERSIONEN = [
    (re.compile(r'(/assets/js/vf-messung\.js)\?v=[0-9a-z]+"'), r'\1?v=%s"' % V),
    (re.compile(r'(/assets/js/cookie-notice\.js)\?v=[0-9a-z]+"'), r'\1?v=%s"' % V),
    (re.compile(r'(/assets/js/vf-siegel\.js)\?v=[0-9a-z]+"'), r'\1?v=%s"' % V),
]
n = 0
for d, dirs, fs in os.walk(VF):
    dirs[:] = [x for x in dirs if x not in (".git", "tools", "node_modules")]
    for f in fs:
        if not f.endswith(".html"):
            continue
        rel = os.path.relpath(os.path.join(d, f), VF).replace("\\", "/")
        t = lese(rel); alt = t
        nl = "\r\n" if "\r\n" in t else "\n"
        t = t.replace(KOMM_ALT.format(nl=nl), KOMM_NEU.format(nl=nl))
        for rx, ziel in VERSIONEN:
            t = rx.sub(ziel, t)
        t = t.replace('<div id="proSealWidget"></div>', "")
        if "consent','default'" in t and KOMM_NEU.format(nl=nl) not in t:
            raise SystemExit("ABBRUCH %s: consent default ohne BASIC-Kommentar" % rel)
        if t != alt:
            schreibe(rel, t); n += 1
print("Seiten geaendert:", n)

# 1b. Widerruf-Link (Art. 7 Abs. 3 DSGVO) auf den Funnel-Seiten ohne Fusszeile: Fragen, Ergebnis, Voranfrage.
#     Bisher stand dort nur die CSS-Regel fuer a.vf-cn-trigger, aber kein Link. Kleine Fusszeile vor vf-messung.js.
FUSS_SEITEN = ["versicherungs-check/q/index.html", "versicherungs-check/ergebnis/index.html",
               "versicherungs-check/voranfrage/index.html", "riester-check/q/index.html"]
FUSS = ('<footer class="vf-fuss-mini"><style>.vf-fuss-mini{max-width:720px;margin:2.5rem auto 1.5rem;padding:0 1rem;'
        'text-align:center;font-size:.8rem;color:#8888a0}.vf-fuss-mini a{color:#a8a8bc;display:inline-flex;align-items:center;'
        'min-height:24px}</style><nav aria-label="Rechtliches"><a href="/datenschutz">Datenschutz</a> · '
        '<a href="/impressum">Impressum</a> · <a href="#" class="vf-cn-trigger">Cookie-Einstellungen</a></nav></footer>')
for rel in FUSS_SEITEN:
    t = lese(rel)
    if 'class="vf-fuss-mini"' in t:
        continue
    nl = "\r\n" if "\r\n" in t else "\n"
    anker = '<script defer src="/assets/js/vf-messung.js?v=%s"></script>' % V
    t = ersetze(t, anker, FUSS + nl + anker, rel)
    schreibe(rel, t)

# 2. datenschutz.html (Wortlaut-Entwurf, Anwalt prueft) ---------------------------------------------------------
rel = "datenschutz.html"; t = lese(rel); alt = t
t = re.sub(r'<p class="last-updated">Stand: [^<]*</p>', '<p class="last-updated">Stand: 12. Oktober 2026</p>', t, count=1)
t = ersetze_re(t, r"<p>Diese Website verwendet technisch notwendige Cookies sowie Session-Storage.*?</p>",
    "<p>Diese Website verwendet technisch notwendige Cookies sowie Session-Storage für die Funktionalität der Checks "
    "(Speicherung Ihrer Antworten während der Nutzung). Ihre Entscheidung im Cookie-Hinweis speichern wir im Browser "
    "(Schlüssel <code>vf_cookie_consent</code>, 12 Monate; danach fragen wir erneut). Google-Dienste laden wir nur, wenn Sie "
    "„Alle akzeptieren“ wählen. Ohne Ihre Einwilligung wird keine Verbindung zu Google hergestellt, und es werden keine "
    "Analyse- oder Werbe-Cookies gesetzt (Abschnitt 3.1).</p>",
    "danach fragen wir erneut", rel)
t = ersetze(t, "<h3>3.1 Google Analytics 4 und Google Ads (Consent Mode)</h3>",
            "<h3>3.1 Google Analytics 4 und Google Ads (nur mit Einwilligung)</h3>", rel)
t = ersetze_re(t, r"<p>Technisch ist der sogenannte Consent Mode aktiv\..*?</ul>",
    "<p>Technisch ist der sogenannte Consent Mode von Google in der Basis-Variante aktiv. <strong>Standardmäßig ist alles auf "
    "„abgelehnt“ gesetzt, und das Google-Tag wird erst nach Ihrer Zustimmung geladen.</strong></p>\n"
    "  <ul>\n"
    "    <li><strong>Mit Ihrer Zustimmung</strong> („Alle akzeptieren“) laden wir das Google-Tag. Google setzt dann Cookies "
    "(Google Analytics: <code>_ga</code>, <code>_ga_…</code>; Google Ads: <code>_gcl_au</code>, bis 90 Tage) und erhält "
    "Angaben zu Ihrem Besuch: aufgerufene Seiten, gestartete Checks, abgeschickte Anfragen und bestätigte Zahlungen, dazu "
    "technische Angaben zu Browser und Gerät sowie Ihre IP-Adresse. Rechtsgrundlage ist Ihre Einwilligung nach "
    "Art. 6 Abs. 1 lit. a DSGVO in Verbindung mit § 25 Abs. 1 TDDDG.</li>\n"
    "    <li><strong>Ohne Ihre Zustimmung</strong> („Nur notwendige“ oder solange Sie nichts auswählen) wird das Google-Tag "
    "nicht geladen. Es werden keine Daten an Google übermittelt, auch keine cookielosen Signale, und es werden keine "
    "Google-Cookies gesetzt. Was vor Ihrer Zustimmung auf der Seite geschieht, wird nicht gespeichert und nicht "
    "nachträglich an Google gesendet.</li>\n"
    "  </ul>",
    "in der Basis-Variante aktiv", rel)
t = ersetze_re(t, r"<p>Sie können Ihre Entscheidung jederzeit über den Link „Cookie-Einstellungen“ im Fußbereich ändern; die Seite lädt dann neu.*?</p>",
    "<p>Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen, über den Link „Cookie-Einstellungen“ "
    "im Fußbereich jeder Seite. Dabei löschen wir Ihre gespeicherte Wahl, beenden die Messung sofort, löschen die von Google "
    "auf dieser Website gesetzten Cookies (<code>_ga</code>, <code>_ga_…</code>, <code>_gcl_…</code>) und zeigen den "
    "Cookie-Hinweis erneut an. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt unberührt.</p>",
    "auf dieser Website gesetzten Cookies", rel)
t = ersetze(t, "<!-- 19.09.2026 Gegencheck: das ProvenExpert-Siegel (vf-siegel.js, ab 900 px) lädt von s.provenexpert.net — fehlte hier, auf allen anderen Marken steht der Absatz -->",
            "<!-- 12.10.2026 Consent BASIC: vf-siegel.js laedt das ProvenExpert-Skript nicht mehr, es bleibt ein statischer Profil-Link -->", rel)
t = ersetze_re(t, r"<p><strong>Bewertungssiegel \(ProvenExpert\):</strong> Auf unseren Seiten zeigen wir.*?</p>",
    "<p><strong>Bewertungssiegel (ProvenExpert):</strong> Ab Desktop-Breite blenden wir unten rechts einen Hinweis auf "
    "unsere Kundenbewertungen bei der Expert Systems AG, Quedlinburger Str. 1, 10589 Berlin („ProvenExpert“) ein. Das ist "
    "ein einfacher Link auf unser Profil: Beim Aufruf unserer Seiten werden keine Inhalte von ProvenExpert geladen und keine "
    "Daten an ProvenExpert übertragen. Erst wenn Sie den Link anklicken, öffnet sich die Website von ProvenExpert; dort "
    "gelten deren Datenschutzhinweise: <a href=\"https://www.provenexpert.com/de-de/datenschutzbestimmungen/\" "
    "target=\"_blank\" rel=\"noopener\">provenexpert.com/de-de/datenschutzbestimmungen</a>.</p>",
    "Das ist ein einfacher Link auf unser Profil", rel)
if t != alt:
    schreibe(rel, t)

# 3. _headers: CSP ohne ProvenExpert ----------------------------------------------------------------------------
rel = "_headers"; t = lese(rel); alt = t
for host in (" https://s.provenexpert.net", " https://*.provenexpert.com", " https://*.provenexpert.net",
             " https://www.provenexpert.com"):
    t = t.replace(host, "")
if "provenexpert" in t.split("Content-Security-Policy:", 1)[1].split("\n", 1)[0]:
    raise SystemExit("ABBRUCH _headers: ProvenExpert noch in der CSP")
if t != alt:
    schreibe(rel, t)

print("geaendert:", len(GEAENDERT))
for g in GEAENDERT:
    print("  " + g)
