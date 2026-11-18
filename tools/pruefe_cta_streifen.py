# -*- coding: utf-8 -*-
"""Pruefung CTA-Streifen (VersicherungsFuchs). Aufruf im Repo-Wurzelverzeichnis: py tools/pruefe_cta_streifen.py
Prueft: (1) idempotent, (2) Wortlaut der Streifen/Hero-Anker, (3) jede Seite hat Streifen oder steht in OHNE, (4) nur Anfrage-Streifen
mit data-cta-ort (kein Termin ohne Buchungslink), (5) CSS/JS je Seite genau einmal, kein altes sticky-cta, (6) Streifen-HTML balanciert."""
import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
import cta_streifen as c

VERBOTEN = [r"unabh[aä]ngig", r"trainiert", r"anruf", r"telefon", r"tel:", r"vor ort", r"gkv", r"wechsel", r"\b(sofort|binnen|innerhalb)\b",
            r"\b\d+\s*(stunden|minuten|tage|std)\b", r"garantie", r"termin"]
fehler, n_streifen = [], 0


def f(m):
    fehler.append(m)


for rel, p in c.alle():
    t = c.lesen(p)
    if rel in c.OHNE:
        if re.search(r"cta-strip|cta-leiste|<!-- cta:", t):
            f("%s: ausgeschlossene Seite enthaelt CTA-Reste" % rel)
        continue
    if "<main" not in t:
        continue
    streifen = re.findall(r"<!-- cta:strip -->(.*?)<!-- /cta:strip -->", t, re.S)
    n_streifen += len(streifen)
    if not streifen:
        f("%s: kein Streifen" % rel)
    for s in streifen:
        if "data-cta-ort=" not in s or 'data-cta-ziel="anfrage"' not in s:
            f("%s: Streifen ohne data-cta-ort/ziel" % rel)
        if s.count("<div") != s.count("</div>"):
            f("%s: Streifen-HTML nicht balanciert" % rel)
    hero = re.findall(r"<!-- cta:hero -->(.*?)<!-- /cta:hero -->", t, re.S)
    text = re.sub(r"<[^>]+>", " ", " ".join(streifen + hero)).lower()
    for rx in VERBOTEN:
        if re.search(rx, text):
            f("%s: verbotener Wortlaut /%s/" % (rel, rx))
    if 'data-cta-ort="hero"' not in t:
        f("%s: kein messbarer Hero-Knopf/Anker" % rel)
    if t.count("/assets/css/cta.css") != 1 or t.count("/assets/js/cta-leiste.js") != 1:
        f("%s: cta.css/cta-leiste.js nicht genau einmal" % rel)
    if "sticky-cta.js" in t:
        f("%s: altes sticky-cta.js noch eingebunden" % rel)
    kopie = c.lesen(p)
    c.bearbeiten(rel, p, nur_pruefen=True)
    if c.LETZTER != kopie:
        f("%s: nicht idempotent" % rel)

js = c.lesen(os.path.join("assets", "js", "cta-leiste.js"))
code = re.sub(r"/\*.*?\*/", "", js, flags=re.S)
if re.search(r"tel:|anruf", code, re.I):
    f("cta-leiste.js: Telefon-Bezug")
print("Streifen geprueft:", n_streifen)
if fehler:
    print("FEHLER (%d):" % len(fehler))
    for x in fehler[:40]:
        print(" -", x)
    sys.exit(1)
print("OK")
