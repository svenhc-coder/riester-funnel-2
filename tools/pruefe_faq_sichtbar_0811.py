#!/usr/bin/env python3
"""VF: FAQPage-Schema muss zum sichtbaren Inhalt passen (Google-Richtlinie), 4-7 Fragen, Antworten 2-5 Saetze.
Aufruf: python3 tools/pruefe_faq_sichtbar_0811.py   (aus dem Repo-Wurzelordner)
Ausnahme: /antworten/ ist die Hub-Seite mit ausfuehrlichen Antworten; dort nur Schema=sichtbar geprueft."""
import glob, html, json, re, sys
t = lambda s: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()
def saetze(a): return len([s for s in re.split(r"(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9„\"])", a) if len(s) > 3])
AUSNAHME = {"antworten/index.html"}
fehler, n = [], 0
for f in sorted(glob.glob("*/index.html") + ["index.html"]):
    h = open(f, encoding="utf-8").read()
    fq = []
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', h, flags=re.S):
        try: j = json.loads(m.group(1))
        except Exception: continue
        if j.get("@type") == "FAQPage": fq.append(j)
    if not fq: continue
    if len(fq) > 1: fehler.append(f"{f}: mehr als ein FAQPage"); continue
    body = t(re.sub(r"<script.*?</script>", "", h, flags=re.S))
    qa = [(t(q["name"]), t(q["acceptedAnswer"]["text"])) for q in fq[0]["mainEntity"]]
    n += 1
    if f not in AUSNAHME and not 4 <= len(qa) <= 7: fehler.append(f"{f}: {len(qa)} Fragen (Soll 4-7)")
    for q, a in qa:
        if q not in body: fehler.append(f"{f}: Frage nicht sichtbar: {q[:60]}")
        if a[:50] not in body: fehler.append(f"{f}: Antwort nicht sichtbar: {q[:60]}")
        if f not in AUSNAHME and not 2 <= saetze(a) <= 5: fehler.append(f"{f}: {saetze(a)} Saetze: {q[:60]}")
print(f"{n} Seiten mit FAQPage geprueft, {len(fehler)} Abweichungen")
for x in fehler: print(" -", x)
sys.exit(1 if fehler else 0)
