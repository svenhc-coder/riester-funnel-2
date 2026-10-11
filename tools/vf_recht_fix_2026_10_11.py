# -*- coding: utf-8 -*-
"""VersicherungsFuchs 11.10.2026: rechtlich heikle und faktisch falsche Aussagen korrigieren (Fund VF-Agent via Koordination).
Idempotent: jede Ersetzung nur, wenn der alte Text noch da ist. Ausgabe: Treffer je Datei."""
import os, re, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
ERS = [
    # 1) Irrefuehrung: "Wir verdienen kein Geld" vs. Courtage
    ("riester-check/index.html", [
        ('<h3 class="tb-title">Kein Verkauf</h3>', '<h3 class="tb-title">Transparente Verg&uuml;tung</h3>'),
        ('Wir verdienen kein Geld, wenn Sie einen neuen Vertrag abschließen. Das ist kein Zufall – es ist Prinzip.',
         'Der Check ist für Sie kostenlos. Schließen Sie später freiwillig über uns ab, erhalten wir als Versicherungsmakler eine Courtage vom Versicherer – für Sie ohne Mehrkosten.'),
        # 4) Altersvorsorgedepot ist beschlossen, nicht geplant
        ('Das Altersvorsorgedepot ist ein ab 2027 geplantes staatlich gefördertes Wertpapierdepot als Alternative zu Riester.',
         'Das Altersvorsorgedepot ist ein gesetzlich beschlossenes, ab 2027 staatlich gefördertes Wertpapierdepot als Alternative zu Riester.'),
        ('Ein ab 2027 geplantes staatlich gefördertes Wertpapierdepot (ETF-basiert) als Alternative zu Riester.',
         'Ein gesetzlich beschlossenes, ab 2027 staatlich gefördertes Wertpapierdepot (ETF-basiert) als Alternative zu Riester.'),
        ('VersicherungsFuchs verkauft Ihnen keinen neuen Vertrag', 'VersicherungsFuchs drängt Ihnen keinen neuen Vertrag auf'),
    ]),
    ("riester-check.html", [
        ('Wir verdienen kein Geld, wenn Sie einen neuen Vertrag abschließen. Das ist kein Zufall – es ist Prinzip.',
         'Der Check ist für Sie kostenlos. Schließen Sie später freiwillig über uns ab, erhalten wir als Versicherungsmakler eine Courtage vom Versicherer – für Sie ohne Mehrkosten.'),
        ('Ein ab 2027 geplantes staatlich gefördertes Wertpapierdepot', 'Ein gesetzlich beschlossenes, ab 2027 staatlich gefördertes Wertpapierdepot'),
    ]),
    ("index.html", [
        ('<h2 class="section-title">Neun Checks. Keine Provision. Sie entscheiden.</h2>',
         '<h2 class="section-title">Zwölf Checks. Kostenlos für Sie. Sie entscheiden.</h2>'),
        ('Dauert ca. 5 Minuten.</p>', 'Dauert ca. 3 Minuten.</p>'),
        ('<p>Kostenloser Quick-Check in 5 Minuten. Keine Anmeldung erforderlich.</p>',
         '<p>Kostenloser Quick-Check in ca. 3 Minuten. Keine Anmeldung erforderlich.</p>'),
    ]),
    ("news/article/index.html", [
        ('Kostenloser Riester-Check in 5 Minuten.', 'Kostenloser Riester-Check in ca. 3 Minuten.'),
    ]),
    ("llms.txt", [
        ('klare Sprache, Du-Form', 'klare Sprache, Sie-Form'),
    ]),
]
# 2) Werbeaussage 300 EUR + 3) §204 SGB V -> § 204 VVG (beide PKV-Dateien)
PKV = [
    ('<span class="pkv-pill orange">Bis zu 300 € Ersparnis/Monat</span>', '<span class="pkv-pill orange">Ohne neue Gesundheitsprüfung</span>'),
    ('In der Praxis sind Einsparungen von 50 bis über 300 Euro monatlich möglich – ohne Leistungseinbußen.',
     'Je nach Ausgangstarif sind spürbare Einsparungen möglich; ob ein Wechsel ohne Leistungseinbußen gelingt, zeigt erst der Tarifvergleich im Einzelfall.'),
    ('Einsparungen von 50 bis über 300 Euro monatlich sind möglich – ohne Leistungseinbußen.',
     'Je nach Ausgangstarif sind spürbare Einsparungen möglich; ob ein Wechsel ohne Leistungseinbußen gelingt, zeigt erst der Tarifvergleich im Einzelfall.'),
]
for f in ("pkv-check.html", "pkv-check/index.html"):
    ERS.append((f, PKV))

SLOGAN_ALT = "Schlau ist, wer nur das Beste nimmt."
SLOGAN_NEU = "Klare Entscheidungen statt Finanzchaos."

gesamt = 0
for rel, paare in ERS:
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        print("FEHLT", rel); continue
    t = open(p, encoding="utf-8").read(); n0 = t
    for a, b in paare:
        if a in t:
            t = t.replace(a, b); gesamt += 1; print("  ok ", rel, "|", a[:60])
    if rel.startswith("pkv-check"):
        k = len(re.findall(r"§ ?204 SGB V", t))
        t = re.sub(r"§ ?204 SGB V", "§ 204 VVG", t); gesamt += k
        if k: print("  ok ", rel, "| §204 SGB V -> § 204 VVG x", k)
    if t != n0:
        open(p, "w", encoding="utf-8").write(t)

# Footer-Slogan (Spitzenstellungswerbung) auf allen Seiten ersetzen
for dp, dn, fn in os.walk(ROOT):
    if "/.git" in dp or "node_modules" in dp or os.path.basename(dp) == "tools":
        continue
    for name in fn:
        if not name.endswith((".html", ".js", ".py")):
            continue
        p = os.path.join(dp, name)
        try:
            t = open(p, encoding="utf-8").read()
        except Exception:
            continue
        if SLOGAN_ALT in t:
            open(p, "w", encoding="utf-8").write(t.replace(SLOGAN_ALT, SLOGAN_NEU))
            gesamt += 1; print("  ok  Slogan", os.path.relpath(p, ROOT))
print("Ersetzungen gesamt:", gesamt)
