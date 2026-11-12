# -*- coding: utf-8 -*-
"""VF News statisch (SEO/AEO-Audit 09.11.2026): erzeugt aus dem ARTICLES-Objekt der Vorlage news/article/index.html je Artikel
eine eigene, serverseitig fertige Seite /news/<id>/ (Titel, Beschreibung, Canonical, og, Article-Schema, Inhalt im HTML),
traegt sie in sitemap.xml ein und zeigt die Vorlage /news/article/ auf noindex. Idempotent. Aufruf: python tools/news_statisch.py <repo-wurzel>"""
import html as H
import io
import json
import os
import re
import sys

W = sys.argv[1]
BASIS = "https://versicherungs-fuchs.online"
vorlage = os.path.join(W, "news", "article", "index.html")
t = io.open(vorlage, encoding="utf-8", newline="").read()
nl = "\r\n" if "\r\n" in t else "\n"
t = t.replace("\r\n", "\n")

# 1) Artikel aus der Vorlage
i = t.index("const ARTICLES = {")
j = t.index("\n};", i)
block = t[i:j]
ART = re.compile(r"\n  '([a-z0-9-]+)': \{\n    tag: '([^']*)',\n    category: '([^']*)',\n    title: '((?:[^'\\]|\\.)*)',\n    date: '([^']*)',\n    readtime: '([^']*)',\n    body: `(.*?)`\n  \}", re.S)
artikel = []
for m in ART.finditer(block + "\n  }"):
    artikel.append({"id": m.group(1), "tag": m.group(2), "category": m.group(3), "title": m.group(4).replace("\\'", "'"),
                    "date": m.group(5), "readtime": m.group(6), "body": m.group(7)})
print("Artikel in der Vorlage:", len(artikel))
exc = {}
try:
    d = json.load(io.open(os.path.join(W, "data", "articles.json"), encoding="utf-8"))
    for a in d.get("articles", []):
        exc[a["id"]] = a.get("excerpt", "")
except Exception:
    pass

def monat(d):
    if not d:
        return ""
    y, m, dd = d.split("-")
    mn = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"][int(m) - 1]
    return "%d. %s %s" % (int(dd), mn, y)

def beschreibung(a):
    e = exc.get(a["id"]) or re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", a["body"]))).strip()
    return (e[:157].rsplit(" ", 1)[0] + "…") if len(e) > 160 else e

# 2) Vorlage ohne den Render-Skript-Block als Gerüst
skript = re.search(r"<script>\s*// Article database.*?</script>|<script>\s*const ARTICLES.*?</script>", t, re.S)
if not skript:
    # Skript-Element suchen, das ARTICLES enthaelt
    k = t.index("const ARTICLES = {")
    s0 = t.rfind("<script", 0, k)
    s1 = t.index("</script>", k) + len("</script>")
else:
    s0, s1 = skript.start(), skript.end()
geruest = t[:s0] + t[s1:]

FIRMA = {"@type": "Organization", "name": "iSurance Finanz- und Versicherungsvermittlungs UG (haftungsbeschränkt)", "url": BASIS + "/impressum/"}
# 12.11.2026 (Sven E-04: nur Geschaeftsfuehrer als Autoren): Angaben exakt aus dem Impressum, keine persoenlichen Nummern
AUTORENBOX = (
    '<aside class="article-autor" aria-label="Verantwortlich für den Inhalt" style="margin:1.6rem 0 0;padding:1rem 1.2rem;border:1px solid rgba(255,255,255,.14);border-radius:12px;font-size:.88rem;line-height:1.55">'
    '<strong>Verantwortlich für den Inhalt:</strong> Christian Schonauer und Sven Cramer, Geschäftsführer der iSurance Finanz- und '
    'Versicherungsvermittlungs UG (haftungsbeschränkt). Versicherungsmakler mit Erlaubnis nach § 34d Abs. 1 GewO, '
    'Vermittlerregister-Nr. D-FRY2-GTB6R-98 (Registerstelle: DIHK e.V.). <a href="/impressum/">Impressum</a></aside>'
)

def seite(a):
    titel = a["title"]
    desc = beschreibung(a)
    url = "%s/news/%s/" % (BASIS, a["id"])
    g = geruest
    # 12.11.2026: Marken-Anhang nur, wenn der Titel dadurch nicht ueber 65 Zeichen waechst (Google schneidet sonst ab)
    anhang = " – Versicherungsfuchs" if len(titel) + len(" – Versicherungsfuchs") <= 65 else ""
    g = re.sub(r'<title id="page-title">.*?</title>', lambda m: '<title>%s%s</title>' % (H.escape(titel), anhang), g, 1, flags=re.S)
    g = re.sub(r'<meta name="description" id="page-desc" content="[^"]*">', '<meta name="description" content="%s">' % H.escape(desc, quote=True), g, 1)
    g = re.sub(r'<meta name="robots" content="[^"]*">', '<meta name="robots" content="index,follow,max-image-preview:large">', g, 1)
    g = re.sub(r'<link rel="canonical" id="page-canonical" href="[^"]*">', '<link rel="canonical" href="%s">' % url, g, 1)
    g = re.sub(r'<meta property="og:title" id="og-title" content="[^"]*">', '<meta property="og:title" content="%s%s">' % (H.escape(titel, quote=True), anhang), g, 1)
    g = re.sub(r'<meta property="og:description" id="og-desc" content="[^"]*">', '<meta property="og:description" content="%s">' % H.escape(desc, quote=True), g, 1)
    schema = {"@context": "https://schema.org", "@type": "Article", "headline": titel, "description": desc, "datePublished": a["date"],
              "dateModified": a["date"], "inLanguage": "de", "mainEntityOfPage": url, "url": url,
              "author": [{"@type": "Person", "name": n, "jobTitle": "Geschäftsführer", "worksFor": FIRMA} for n in ("Christian Schonauer", "Sven Cramer")],
              "publisher": {"@type": "Organization", "name": "Versicherungsfuchs", "url": BASIS + "/"}}
    g = g.replace("</head>", '<script type="application/ld+json">%s</script>\n</head>' % json.dumps(schema, ensure_ascii=False), 1)
    # 12.11.2026: BreadcrumbList passend zur sichtbaren Brotkrumen-Zeile (Start > Wissen > Artikel)
    krumen = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Start", "item": BASIS + "/"},
        {"@type": "ListItem", "position": 2, "name": "Wissen", "item": BASIS + "/news/"},
        {"@type": "ListItem", "position": 3, "name": a["tag"], "item": url}]}
    g = g.replace("</head>", '<script type="application/ld+json">%s</script>\n</head>' % json.dumps(krumen, ensure_ascii=False), 1)
    fq = re.findall(r'<details class="faq-item"><summary>(.*?)</summary><p>(.*?)</p></details>', a["body"], re.S)[:7]
    if fq:
        faqs = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": H.unescape(q), "acceptedAnswer": {"@type": "Answer", "text": H.unescape(re.sub(r"<[^>]+>", "", an))}} for q, an in fq]}
        g = g.replace("</head>", '<script type="application/ld+json">%s</script>\n</head>' % json.dumps(faqs, ensure_ascii=False), 1)
    inhalt = (
        '<div class="article-breadcrumb"><a href="/">Start</a> <span>›</span> <a href="/news/">Wissen</a> <span>›</span> '
        '<span style="color:var(--txt,#f2f2f2)">%s</span></div>'
        '<span class="article-tag">%s</span><h1 class="article-title">%s</h1>'
        '<div class="article-meta"><span class="meta-pill">%s Lesezeit</span><span class="meta-pill">Stand: %s</span>'
        '<span style="margin-left:auto;font-size:0.75rem;color:var(--txt2,#8888a0);">Kein Beratungsersatz</span></div>'
        '<div class="article-body">%s</div>' + AUTORENBOX +
        '<div class="article-disclaimer"><strong>Hinweis:</strong> Dieser Artikel dient der allgemeinen Information und stellt keine Anlage-, Rechts- oder '
        'Steuerberatung dar. Alle Angaben ohne Gewähr. Für individuelle Beratung wenden Sie sich an einen zugelassenen Finanzberater.</div>'
    ) % (H.escape(a["tag"]), H.escape(a["tag"]), H.escape(titel), H.escape(a["readtime"]), monat(a["date"]), a["body"])
    g, n = re.subn(r'(<main[^>]*id="article-main"[^>]*>).*?(</main>)', lambda m: m.group(1) + inhalt + m.group(2), g, 1, flags=re.S)
    if n != 1:
        raise SystemExit("article-main nicht gefunden")
    return g

neu = 0
for a in artikel:
    p = os.path.join(W, "news", a["id"])
    os.makedirs(p, exist_ok=True)
    io.open(os.path.join(p, "index.html"), "w", encoding="utf-8", newline="").write(seite(a).replace("\n", nl))
    neu += 1
print("Seiten geschrieben:", neu)

# 3) Vorlage /news/article/ auf noindex + Canonical auf die statische Seite
v = t
v = re.sub(r'<meta name="robots" content="[^"]*">', '<meta name="robots" content="noindex,follow">', v, 1)
v = v.replace("const canon = 'https://versicherungs-fuchs.online/news/article/?id=' + id;", "const canon = 'https://versicherungs-fuchs.online/news/' + id + '/';")
io.open(vorlage, "w", encoding="utf-8", newline="").write(v.replace("\n", nl))

# 4) Hub-Links und Sitemap
hub = os.path.join(W, "news", "index.html")
h = io.open(hub, encoding="utf-8", newline="").read()
h2 = h.replace('href="/news/article/?id=${featured.id}"', 'href="/news/${featured.id}/"').replace('href="/news/article/?id=${a.id}"', 'href="/news/${a.id}/"')
io.open(hub, "w", encoding="utf-8", newline="").write(h2)
print("Hub-Links geaendert:", h != h2)
sm = os.path.join(W, "sitemap.xml")
s = io.open(sm, encoding="utf-8", newline="").read()
add = ""
for a in artikel:
    u = "%s/news/%s/" % (BASIS, a["id"])
    if u not in s:
        add += "  <url><loc>%s</loc><lastmod>%s</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n" % (u, a["date"])
if add:
    io.open(sm, "w", encoding="utf-8", newline="").write(s.replace("</urlset>", add + "</urlset>", 1))
print("Sitemap +", add.count("<url>"))
