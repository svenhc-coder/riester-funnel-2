# -*- coding: utf-8 -*-
"""VersicherungsFuchs — schmale Bildschirme (320/375 px) ohne horizontalen Ueberlauf (08.10.2026).

Quelle der Wahrheit fuer die Stilbloecke "vf-nav-schmal" und "vf-h1-umbruch". VF hat keinen Seiten-Build: die HTML-
Dateien sind die Quelle; die Rechtsseiten wurden einmalig von tools/port_standard_2026-09-16.py aus der
Impressum-Huelle (huelle()) plus Texten aus regionalmarken-websites/rechtliches.py erzeugt. Der Block steht deshalb
(a) hier, (b) per Import in port_standard (neu erzeugte Rechtsseiten erben ihn ueber die Impressum-Huelle und den
Seiten-Lauf), (c) in den Seiten selbst. Ein Lauf dieses Skripts stellt ihn auf jedem Stand wieder her.

Ursachen (Playwright, breitestes Element): eigene Inline-Navigation ohne main.css war 378-400 px breit (Impressum,
Datenschutz, Erstinformation, Widerruf, Bildnachweis, Renten-Check); H1-Woerter "Datenschutzerklaerung",
"Widerrufsbelehrung", "Altersvorsorgedepot" ohne Umbruch. (bu-check: Regel .check-hero-h1 in assets/css/main.css.)
Pruefung: alle Seiten bei 320/375 px scrollX = 0 nach scrollTo(600,0).

Idempotent. Aufruf: python3 tools/schmale_bildschirme_2026-10-08.py   — Rollback: git checkout -- <seiten>
"""
import io
import os

HIER = os.path.dirname(os.path.abspath(__file__))
VF = os.path.dirname(HIER)

NAV_SCHMAL = ('<style id="vf-nav-schmal">/* 08.10.2026: eigene Inline-Nav war bei 320/375 px zu breit (horizontaler Ueberlauf). '
              'Unter 400 px entfaellt "Checks" (gleiches Ziel wie der CTA). */\n'
              '@media (max-width:400px){.nav-inner{padding:0 14px}.nav-logo img{height:40px;width:auto}.nav-links{gap:12px}'
              '.nav-links a[href="/versicherungs-check/"]:not(.nav-cta){display:none}}\n'
              '.page-wrap h1{-webkit-hyphens:auto;hyphens:auto;overflow-wrap:break-word}</style>\n')
NAV_SCHMAL_SEITEN = ["impressum.html", "datenschutz.html", "erstinformation.html", "widerrufsbelehrung.html",
                     "bildnachweis.html", "renten-check.html"]
H1_UMBRUCH = {"altersvorsorgedepot/index.html": ('<style id="vf-h1-umbruch">/* 08.10.2026: "Altersvorsorgedepot" passte bei 320 px '
                                                 'nicht in die Zeile. */\n.avd-hero h1{-webkit-hyphens:auto;hyphens:auto;'
                                                 'overflow-wrap:break-word}</style>\n')}


def schmal(rel, t):
    """Fuegt die Bloecke vor </head> ein, falls sie fehlen. Fuer jeden Seitentext aufrufbar (port_standard nutzt das)."""
    if rel in NAV_SCHMAL_SEITEN and "vf-nav-schmal" not in t:
        t = t.replace("</head>", NAV_SCHMAL + "</head>", 1)
    if rel in H1_UMBRUCH and "vf-h1-umbruch" not in t:
        t = t.replace("</head>", H1_UMBRUCH[rel] + "</head>", 1)
    return t


if __name__ == "__main__":
    geaendert = []
    for rel in NAV_SCHMAL_SEITEN + list(H1_UMBRUCH):
        p = os.path.join(VF, rel)
        if not os.path.exists(p):
            continue
        alt = io.open(p, encoding="utf-8", newline="").read()
        neu = schmal(rel, alt)
        if neu != alt:
            io.open(p + ".neu", "w", encoding="utf-8", newline="").write(neu)
            os.replace(p + ".neu", p)
            geaendert.append(rel)
    print("geaendert (%d):" % len(geaendert))
    for g in geaendert:
        print("  ", g)
