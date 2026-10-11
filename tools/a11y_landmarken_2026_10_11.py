# -*- coding: utf-8 -*-
"""VersicherungsFuchs — Landmarken, Skip-Link und Navigationsnamen auf allen Seiten (Audit 10.10.2026, WCAG 2.4.1/1.3.1).

Befund (axe `region` x60 auf der Startseite, `landmark-unique` auf Rechtsseiten/Wissen): Startseite, Rechtsseiten,
Wissen, PKV- und AVD-Seite hatten kein <main>, keine Seite hatte <header> oder einen Skip-Link; Kopf- und Fussnavigation
waren beide namenlose <nav>. Das ProvenExpert-Siegel war ein <div> mit aria-label (axe aria-prohibited-attr).

Was dieses Skript je Seite tut (idempotent, jede Regel nur, wenn sie fehlt):
  1. <style id="vf-a11y"> vor </head>: Skip-Link-Optik, Kopf-Landmarke klebt wie zuvor die Navigation.
  2. Erste <nav> nach <body> (nicht im Footer) -> <header class="vf-kopf"><nav aria-label="Hauptnavigation">.
  3. Kein <main>: Inhalt zwischen Kopf und <footer> wird <main id="main">. Vorhandenes <main> ohne id bekommt id="main".
  4. Skip-Link als erstes Element im <body> ("Zum Inhalt springen" -> id des <main>).
  5. Unbenannte <nav> im Footer -> aria-label="Rechtliches".
  6. ProvenExpert-Siegel: <div class="vf-siegel" aria-label=...> -> <aside ...> (ergaenzende Landmarke).
  7. target="_blank" ohne rel -> rel="noopener noreferrer".
  8. E-Mail-Adressen im Klartext: Cloudflare ersetzt sie sonst durch "[email protected]" + JS (Art. 13 DSGVO / § 5 DDG
     verlangen direkte Erreichbarkeit). <!--email_off--> ... <!--/email_off--> um den Body-Inhalt schaltet das je Seite ab.

Quelle der Wahrheit: dieses Skript. tools/port_standard_2026-09-16.py importiert landmarken() (neu erzeugte
Rechtsseiten erben es ueber den Seiten-Lauf), die Seiten selbst tragen das Ergebnis. Die Fragenseiten
(versicherungs-check/q, riester-check/q) haben einen eigenen Kopf (<header class="funnel-header">) und <main id="funnel-body">.

Aufruf: python3 tools/a11y_landmarken_2026_10_11.py   — Rollback: git checkout -- <seiten>
"""
import io
import os
import re

HIER = os.path.dirname(os.path.abspath(__file__))
VF = os.path.dirname(HIER)

AUSNAHMEN = {"riester-check/start/index.html"}  # reine Weiterleitung ohne sichtbaren Inhalt

A11Y_CSS = ('<style id="vf-a11y">/* 11.10.2026 Audit WCAG 2.4.1: Skip-Link, Kopf-Landmarke klebt wie zuvor die Navigation */\n'
            '.vf-skip{position:absolute;left:12px;top:-200px;z-index:10001;padding:12px 18px;border-radius:10px;background:#f97316;'
            'color:#0a0a0f;font:700 15px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;text-decoration:none}'
            '.vf-skip:focus{top:12px;outline:3px solid #f2f2f2;outline-offset:2px}\n'
            'header.vf-kopf{position:sticky;top:0;z-index:100}\n'
            '.funnel-question:focus{outline:none}\n'
            '/* Zielgroesse mind. 24 px (WCAG 2.5.8): Fussnavigation, Cookie-Einstellungen, Uebersicht im Fragen-Kopf */\n'
            '.footer-bottom-simple nav a,a.vf-cn-trigger,.funnel-exit{display:inline-flex;align-items:center;min-height:24px}</style>\n')
SKIP = '<a class="vf-skip" href="#%s">Zum Inhalt springen</a>\n'


def _body_start(t):
    m = re.search(r"<body[^>]*>", t)
    return m.end() if m else -1


def landmarken(rel, t):
    """Gibt den Seitentext mit Landmarken zurueck. Fuer jeden Seitentext aufrufbar (port_standard nutzt das)."""
    if rel in AUSNAHMEN or "<body" not in t:
        return t
    if 'id="vf-a11y"' not in t:
        t = t.replace("</head>", A11Y_CSS + "</head>", 1)
    else:  # Block auf den aktuellen Stand dieses Skripts bringen
        t = re.sub(r'<style id="vf-a11y">.*?</style>\n', lambda _m: A11Y_CSS, t, count=1, flags=re.S)
    b = _body_start(t)

    # 2. Kopf-Landmarke um die Hauptnavigation
    fuss = t.find("<footer", b)
    m = re.compile(r"<nav(\s[^>]*)?>").search(t, b)
    hat_kopf = re.search(r"<header[^>]*>", t[b:]) is not None and (
        t.find("<header", b) < (t.find("<main", b) if t.find("<main", b) > -1 else len(t)))
    if m and not hat_kopf and (fuss == -1 or m.start() < fuss):
        ende = t.index("</nav>", m.end()) + len("</nav>")
        nav_tag = m.group(0)
        if "aria-label" not in nav_tag:
            nav_tag = nav_tag[:-1] + ' aria-label="Hauptnavigation">'
        t = t[:m.start()] + '<header class="vf-kopf">\n' + nav_tag + t[m.end():ende] + "\n</header>" + t[ende:]

    # 3. Hauptinhalt
    if "<main" not in t[b:]:
        kopf_ende = t.find("</header>", b)
        start = kopf_ende + len("</header>") if kopf_ende > -1 else b
        fuss = t.find("<footer", start)
        if fuss > -1:
            t = t[:start] + '\n<main id="main">' + t[start:fuss] + "</main>\n\n" + t[fuss:]
    mm = re.compile(r"<main(\s[^>]*)?>").search(t, b)
    ziel = None
    if mm:
        idm = re.search(r'\sid="([^"]+)"', mm.group(0))
        if idm:
            ziel = idm.group(1)
        else:
            ziel = "main"
            t = t[:mm.start()] + mm.group(0)[:-1] + ' id="main">' + t[mm.end():]

    # 4. Skip-Link als erstes fokussierbares Element
    if ziel and 'class="vf-skip"' not in t:
        b = _body_start(t)
        t = t[:b] + "\n" + SKIP % ziel + t[b:]

    # 5. Fussnavigation benennen
    f = t.find("<footer")
    if f > -1:
        t = t[:f] + re.sub(r"<nav>", '<nav aria-label="Rechtliches">', t[f:])

    # 6. Siegel als ergaenzende Landmarke
    t = re.sub(r'<div class="vf-siegel" aria-label="([^"]*)">(.*?</a>)</div>', r'<aside class="vf-siegel" aria-label="\1">\2</aside>', t)

    # 7. Neue Fenster ohne Rueckgriff auf window.opener
    t = re.sub(r'<a\s(?![^>]*\srel=)([^>]*target="_blank"[^>]*)>', r'<a \1 rel="noopener noreferrer">', t)
    return t


def email_klartext(rel, t):
    """Cloudflare-E-Mail-Maskierung je Seite abschalten, wenn die Seite eine Adresse enthaelt."""
    if rel in AUSNAHMEN or "<!--email_off-->" in t or "<body" not in t:
        return t
    b = _body_start(t)
    e = t.rfind("</body>")
    if e < b or not re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}", t[b:e]):
        return t
    return t[:b] + "\n<!--email_off-->" + t[b:e] + "<!--/email_off-->\n" + t[e:]


def seiten():
    for d, dirs, fs in os.walk(VF):
        dirs[:] = [x for x in dirs if x not in (".git", "tools", "node_modules")]
        for f in sorted(fs):
            if f.endswith(".html"):
                yield os.path.relpath(os.path.join(d, f), VF).replace("\\", "/")


if __name__ == "__main__":
    geaendert = []
    for rel in seiten():
        p = os.path.join(VF, rel)
        alt = io.open(p, encoding="utf-8", newline="").read()
        neu = email_klartext(rel, landmarken(rel, alt))
        if neu != alt:
            io.open(p + ".neu", "w", encoding="utf-8", newline="").write(neu)
            os.replace(p + ".neu", p)
            geaendert.append(rel)
    print("geaendert (%d):" % len(geaendert))
    for g in geaendert:
        print("  ", g)
