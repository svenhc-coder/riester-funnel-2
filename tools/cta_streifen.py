# -*- coding: utf-8 -*-
"""VersicherungsFuchs: CTA-Streifen nach jeder Section (bzw. nach jedem H2-Block), Hero-Messung, mobile Leiste (Sven 17.11.2026). Idempotent (Marker).
Aufruf im Repo-Wurzelverzeichnis:  py tools/cta_streifen.py [--liste=<Pfad>]    (schreibt die HTML-Seiten)
Hauptaktion 'Anfrage senden' -> /check-anfrage/ (Formularseite). Termin-Streifen gibt es NICHT: VF hat keinen Buchungslink (Stand 18.11.2026);
sobald einer existiert, in TERMIN_URL eintragen und Termin-Streifen in einem Folgeschritt ergaenzen.
Nie 'Anrufen' als Haupt-CTA."""
import glob, io, os, re, sys

ROOT = "."
CSS_V, JS_V = "20261118", "20261118"
ANFRAGE = "/check-anfrage/"
LETZTER = ""   # Ergebnistext des letzten bearbeiten()-Aufrufs (fuer die Pruefung)
OHNE = {
    "bildnachweis.html": "Rechtsseite (Bildnachweis)",
    "datenschutz.html": "Rechtsseite",
    "erstinformation.html": "Rechtsseite (Erstinformation)",
    "impressum.html": "Rechtsseite",
    "widerrufsbelehrung.html": "Rechtsseite",
    "cookie-richtlinie/index.html": "Rechtsseite (Cookies)",
    "check-anfrage/index.html": "Ist selbst die Anfrage-Formularseite (Ziel aller Streifen), noindex",
    "news/article/index.html": "Platzhalter-Vorlage fuer Artikel (noindex), keine redaktionelle Seite",
    "riester-check/q/index.html": "Check-Ablauf (Fragen), noindex: Streifen wuerden den Ablauf unterbrechen",
    "riester-check/start/index.html": "Check-Einstieg/Weiterleitung, noindex",
    "riester-check/result/index.html": "Ergebnis mit Upsell/Zahlung (Stripe), eigene Aktionen, nicht stoeren",
    "versicherungs-check/q/index.html": "Check-Ablauf (Fragen), noindex",
    "versicherungs-check/ergebnis/index.html": "Check-Ergebnis, noindex, eigene Aktionen",
    "versicherungs-check/voranfrage/index.html": "Anonyme Risiko-Voranfrage mit Gesundheitsbezug (Art. 9): keine Messung, keine Zusatz-Aufforderungen",
}
TEXTE = [
    "Ihre Situation ist anders? Schreiben Sie uns, wir ordnen sie persönlich ein.",
    "Fragen zu Ihrem Fall? Eine kurze Anfrage genügt, unverbindlich.",
    "Möchten Sie Ihre Zahlen einordnen lassen? Senden Sie uns eine Anfrage.",
]
SKIP_KLASSE = r"\b(hero|check-hero|avd-hero|pkv-hero|page-hero|trust-bar|trust-break|vf-auszeichnungen|vf-fox3d-band|cta-section|app-section|antwort-kurz)\b"
HERO_KLASSE = r'<section[^>]*class="[^"]*\b(hero|check-hero|avd-hero|pkv-hero|page-hero)\b[^"]*"[^>]*>'
M_STRIP = re.compile(r"\n?<!-- cta:strip -->.*?<!-- /cta:strip -->\n?", re.S)
M_HERO = re.compile(r"\n?<!-- cta:hero -->.*?<!-- /cta:hero -->", re.S)
M_HEAD = re.compile(r"<!-- cta:head -->.*?<!-- /cta:head -->\n?", re.S)
M_JS = re.compile(r"<!-- cta:js -->.*?<!-- /cta:js -->\n?", re.S)
OLD_STICKY = re.compile(r'<script defer src="/assets/js/sticky-cta\.js[^>]*></script>\n?')
TAGS = re.compile(r"<(/?)(div|section|article|aside|ul|ol|table|details|nav|figure|blockquote|form|header|footer)\b[^>]*>|<h2\b")


def lesen(p):
    return io.open(p, encoding="utf-8", newline="").read()


def schreiben(p, t):
    io.open(p, "w", encoding="utf-8", newline="").write(t)


def strip_html(n, text):
    return ('\n<!-- cta:strip -->\n<div class="cta-strip"><div class="cta-strip__inner"><p class="cta-strip__text">%s</p>'
            '<a class="btn-primary" href="%s" data-cta-ort="strip-%d" data-cta-ziel="anfrage">Anfrage senden</a></div></div>\n<!-- /cta:strip -->\n' % (text, ANFRAGE, n))


def sections(main):
    out, depth, start = [], 0, None
    for m in re.finditer(r"<section\b[^>]*>|</section>", main):
        if m.group(0).startswith("</"):
            depth -= 1
            if depth == 0:
                out.append((start, m.end(), main[start:m.end()]))
        else:
            if depth == 0:
                start = m.start()
            depth += 1
    return out


def h2_punkte(html, mit_ende):
    """Einfuegepositionen vor H2 Nr. 2..n (gleiche Verschachtelungstiefe wie das erste H2), optional vor dem Ende des Containers."""
    depth, d0, cand, ende = 0, None, [], None
    for m in TAGS.finditer(html):
        if m.group(0).startswith("<h2"):
            if d0 is None:
                d0 = depth
            if depth == d0 and ende is None:
                cand.append(m.start())
        elif m.group(1):
            depth -= 1
            if d0 is not None and depth < d0 and ende is None and cand:
                ende = m.start()
        else:
            depth += 1
    pts = cand[1:]
    if mit_ende and ende is not None:
        pts.append(ende)
    return pts


def uebergehen(sec):
    tag = re.match(r"<section\b[^>]*>", sec).group(0)
    if re.search(r'class="[^"]*' + SKIP_KLASSE, tag) or 'aria-hidden="true"' in tag:
        return True
    return "<form" in sec


def einsetzen(t):
    i0, i1 = t.index("<main"), t.index("</main>")
    main = t[i0:i1]
    punkte = []
    secs = sections(main)
    if secs:
        for s, e, h in secs:
            if uebergehen(h):
                continue
            inner = h2_punkte(h, False)
            punkte += [s + p for p in inner]
            punkte.append(e)
    else:
        punkte = h2_punkte(main, True)
    punkte = sorted(set(punkte))
    for n, pos in reversed(list(enumerate(punkte))):
        main = main[:pos] + strip_html(n + 1, TEXTE[n % len(TEXTE)]) + main[pos:]
    return t[:i0] + main + t[i1:], len(punkte)


def hero_markieren(t):
    """Vorhandenen Hero-Hauptknopf (Check starten) messbar machen; sonst Anfrage-Anker unter der Ueberschrift. Rueckgabe: (Text, Art)."""
    if 'data-cta-ort="hero"' in t:
        return t, "hero-knopf"
    m = re.search(HERO_KLASSE, t)
    if m:
        a = re.search(r'<a\b([^>]*class="[^"]*btn-primary[^"]*"[^>]*)>', t[m.end():])
        if a:
            s = m.end() + a.start()
            neu = '<a' + a.group(1) + ' data-cta-ort="hero" data-cta-ziel="check">'
            return t[:s] + neu + t[s + len(a.group(0)):], "hero-knopf"
    h = re.search(r"</h1>", t)
    if not h:
        return t, "keiner"
    pos = h.end()
    nxt = re.match(r'\s*(<div class="article-meta">.*?</div>|<p\b[^>]*>.*?</p>)', t[pos:], re.S)
    if nxt:
        pos += nxt.end()
    html = ('\n<!-- cta:hero -->\n<p class="cta-hero"><a class="btn-primary" href="%s" data-cta-ort="hero" data-cta-ziel="anfrage">Anfrage senden</a></p>\n<!-- /cta:hero -->' % ANFRAGE)
    return t[:pos] + html + t[pos:], "anker"


def alle():
    out = []
    for p in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(p, ROOT).replace("\\", "/")
        if rel.startswith((".well-known/", "node_modules/", "tools/", "assets/")):
            continue
        out.append((rel, p))
    return out


def roh(t):
    for rx in (M_STRIP, M_HERO, M_HEAD, M_JS):
        t = rx.sub("", t)
    return OLD_STICKY.sub("", t)


def bearbeiten(rel, p, nur_pruefen=False):
    t = roh(lesen(p))
    if "<main" not in t:
        return None
    t, art = hero_markieren(t)
    t, n = einsetzen(t)
    css = '<!-- cta:head --><link rel="stylesheet" href="/assets/css/cta.css?v=%s"><!-- /cta:head -->\n' % CSS_V
    js = '<!-- cta:js --><script defer src="/assets/js/cta-leiste.js?v=%s" data-anfrage="%s"></script><!-- /cta:js -->\n' % (JS_V, ANFRAGE)
    t = t.replace("</head>", css + "</head>", 1)
    t = t.replace("</body>", js + "</body>", 1)
    global LETZTER
    LETZTER = t
    if not nur_pruefen:
        schreiben(p, t)
    return art, n


def liste(erg, aus):
    z = ["# SEITENLISTE CTA-Durchgang VersicherungsFuchs (18.11.2026)\n", "## Mit CTA-Streifen / Hero-Messung / mobiler Leiste\n",
         "| Seite | Streifen | Hero |", "|---|---|---|"]
    for rel, (art, n) in erg:
        z.append("| %s | %d | %s |" % (rel, n, "bestehender Check-Knopf messbar" if art == "hero-knopf" else ("Anfrage-Anker unter der H1" if art == "anker" else "kein H1")))
    z += ["", "## Bewusst ohne CTA (Grund)\n", "| Seite | Grund |", "|---|---|"]
    z += ["| %s | %s |" % (r, g) for r, g in aus]
    z += ["", "Streifen: nur 'Anfrage senden' -> %s. Es gibt keinen Termin-Streifen (kein Buchungslink bei VF). Streifen stehen nach jeder Section ausser Hero/Trust-/App-/Schluss-CTA-Sections und Sections mit Formular; in langen Textsections vor jedem weiteren H2." % ANFRAGE]
    return "\n".join(z) + "\n"


def main():
    erg, aus = [], []
    for rel, p in alle():
        if rel in OHNE:
            t = lesen(p); t2 = roh(t)
            if t2 != t:
                schreiben(p, t2)
            aus.append((rel, OHNE[rel]))
            continue
        r = bearbeiten(rel, p)
        if r is None:
            aus.append((rel, "kein <main>"))
        else:
            erg.append((rel, r))
    ziel = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--liste=")), "")
    if ziel:
        io.open(ziel, "w", encoding="utf-8").write(liste(erg, aus))
    print("Seiten mit CTA:", len(erg), "| ohne:", len(aus), "| Streifen gesamt:", sum(r[1][1] for r in erg))


if __name__ == "__main__":
    main()
