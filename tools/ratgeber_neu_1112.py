# -*- coding: utf-8 -*-
"""VF-Ratgeber 12.11.2026: fuegt drei Artikel in die Vorlage news/article/index.html (ARTICLES), data/articles.json und die STATISCH-Liste
des Hubs ein, ersetzt die toten Seitenleisten-Links, ergaenzt FAQPage-Schema im Generator und die Weiterlesen-Zeilen der Checks.
Danach: python tools/news_statisch.py <repo-wurzel> (baut Seiten + Sitemap). Idempotent.
Aufruf: python tools/ratgeber_neu_1112.py <repo-wurzel> <pfad zu ratgeber_inhalte.py>"""
import importlib.util
import io
import json
import os
import re
import sys

W = sys.argv[1]
spec = importlib.util.spec_from_file_location("inhalte", sys.argv[2])
inh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inh)


def lies(p):
    return io.open(os.path.join(W, p), encoding="utf-8", newline="").read()


def schreibe(p, s):
    io.open(os.path.join(W, p), "w", encoding="utf-8", newline="").write(s)


# 1) Vorlage: ARTICLES
vp = "news/article/index.html"
t = lies(vp)
nl = "\r\n" if "\r\n" in t else "\n"
t = t.replace("\r\n", "\n")
for a in inh.ARTIKEL:
    assert "`" not in a["body"] and "${" not in a["body"], a["id"]
    eintrag = ("  '%s': {\n    tag: '%s',\n    category: '%s',\n    title: '%s',\n    date: '%s',\n    readtime: '%s',\n    body: `%s`\n  }"
               % (a["id"], a["tag"], a["category"], a["title"].replace("'", "\\'"), a["date"], a["readtime"], a["body"]))
    if ("\n  '%s': {" % a["id"]) in t:
        m = re.search(r"\n  '%s': \{.*?\n  \}(?=,\n  '|\n\};)" % re.escape(a["id"]), t, re.S)
        assert m, a["id"]
        t = t[:m.start()] + "\n" + eintrag + t[m.end():]
    else:
        i = t.index("const ARTICLES = {")
        j = t.index("\n};", i)
        t = t[:j] + ",\n" + eintrag + t[j:]

# 2) tote Seitenleisten-Links durch lebende ersetzen
alt = re.search(r'(<h5>Weitere Artikel</h5>)(.*?)(</div>)', t, re.S)
assert alt
links = [("riester-kostenstruktur", "Kostenstruktur in Riester-Verträgen", "Vertragsanalyse · 7 min"),
         ("riester-kuendigung", "Riester kündigen, ruhen lassen oder behalten", "Vertragsanalyse · 6 min"),
         ("pkv-oder-gkv-entscheidung", "PKV oder GKV: Woran Sie entscheiden", "Krankenversicherung · 6 min"),
         ("bu-beitrag-einflussfaktoren", "Berufsunfähigkeit: Was den Beitrag bestimmt", "Arbeitskraft · 6 min")]
neu = "".join('\n      <a href="/news/%s/" class="sidebar-link">\n        %s\n        <span class="stag">%s</span>\n      </a>' % l for l in links) + "\n    "
t = t[:alt.start(2)] + neu + t[alt.end(2):]
schreibe(vp, t.replace("\n", nl))

# 3) articles.json
jp = "data/articles.json"
d = json.loads(lies(jp))
for a in inh.ARTIKEL:
    z = {"id": a["id"], "tag": a["tag"], "category": a["category"], "title": a["title"], "excerpt": a["excerpt"], "date": a["date"], "readtime": a["readtime"], "featured": False}
    for k, x in enumerate(d["articles"]):
        if x["id"] == a["id"]:
            z["featured"] = x.get("featured", False)
            d["articles"][k] = z
            break
    else:
        d["articles"].append(z)
schreibe(jp, json.dumps(d, ensure_ascii=False, indent=2) + "\n")

# 4) Hub: STATISCH
hp = "news/index.html"
h = lies(hp)
m = re.search(r"const STATISCH = new Set\(\[([^\]]*)\]\);", h)
ids = re.findall(r"'([a-z0-9-]+)'", m.group(1))
for a in inh.ARTIKEL:
    if a["id"] not in ids:
        ids.append(a["id"])
ids.sort()
h = h[:m.start()] + "const STATISCH = new Set([%s]);" % ", ".join("'%s'" % i for i in ids) + h[m.end():]
schreibe(hp, h)

# 5) Generator: FAQPage-Schema aus <details class="faq-item"> (max. 7)
gp = "tools/news_statisch.py"
g = lies(gp)
if "FAQPage" not in g:
    gnl = "\r\n" if "\r\n" in g else "\n"
    zeilen = g.replace("\r\n", "\n").split("\n")
    idx = [i for i, z in enumerate(zeilen) if "json.dumps(schema, ensure_ascii=False), 1)" in z]
    assert len(idx) == 1, idx
    zusatz = [
        '    fq = re.findall(r\'<details class="faq-item"><summary>(.*?)</summary><p>(.*?)</p></details>\', a["body"], re.S)[:7]',
        "    if fq:",
        '        faqs = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [',
        '            {"@type": "Question", "name": H.unescape(q), "acceptedAnswer": {"@type": "Answer", "text": H.unescape(re.sub(r"<[^>]+>", "", an))}} for q, an in fq]}',
        "        g = g.replace(\"</head>\", '<script type=\"application/ld+json\">%s</script>\\n</head>' % json.dumps(faqs, ensure_ascii=False), 1)",
    ]
    zeilen[idx[0] + 1:idx[0] + 1] = zusatz
    schreibe(gp, gnl.join(zeilen))

# 6) Weiterlesen-Zeilen der Checks
ZUSATZ = {
    "riester-check": ("riester-kuendigung", "Riester kündigen, ruhen lassen oder behalten"),
    "altersvorsorgedepot": ("riester-kuendigung", "Riester kündigen, ruhen lassen oder behalten"),
    "pkv-check": ("pkv-oder-gkv-entscheidung", "PKV oder GKV: Woran Sie entscheiden"),
    "pkv-eignung-check": ("pkv-oder-gkv-entscheidung", "PKV oder GKV: Woran Sie entscheiden"),
    "bu-check": ("bu-beitrag-einflussfaktoren", "Berufsunfähigkeit: Was den Beitrag bestimmt"),
}
for d_, (slug, titel) in ZUSATZ.items():
    p = d_ + "/index.html"
    s = lies(p)
    if ('/news/%s/' % slug) in s:
        continue
    a_ = '</aside>\n<footer'
    b_ = '</aside>\r\n<footer'
    link = ' · <a href="/news/%s/">%s</a>' % (slug, titel)
    i = s.find('class="vf-weiterlesen"')
    assert i > 0, d_
    k = s.index("</aside>", i)
    s = s[:k] + link + s[k:]
    schreibe(p, s)
print("fertig")
