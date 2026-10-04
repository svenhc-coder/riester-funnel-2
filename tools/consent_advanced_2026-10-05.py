# -*- coding: utf-8 -*-
"""VF: Consent Mode BASIC -> ADVANCED (Sven im Chat 05.10.2026, ausdruecklich fuer alle Marken, nach dem Ads-Audit:
Smart Bidding ohne Signal). Gegenstueck zu tools/consent_basic_2026-09-16.py, Referenz regionalmarken-websites/messung.py.
- assets/js/vf-messung.js laedt den Google-Tag (AW-820163824 + G-VYF5P956SP) SOFORT. Ohne Einwilligung bleibt der
  Consent-Status "denied": keine Cookies, keine Werbe-Kennungen, nur cookielose Pings fuer die Modellierung.
  Mit Einwilligung (localStorage vf_cookie_consent = 'accepted') wie bisher voll.
- gtag('set','ads_data_redaction',true) direkt nach consent default im <head> jeder Seite.
- KEIN url_passthrough (nichts an Ziel-URLs anhaengen).
- Bannertext und Datenschutz (Abschnitt 3, Wortlaut wie rechtliches.py der Regionalmarken) sagen das offen.
Idempotent. Aufruf: python tools/consent_advanced_2026-10-05.py
"""
import io, os
HIER = os.path.dirname(os.path.abspath(__file__)); VF = os.path.dirname(HIER)
V_ALT, V = "20260916b", "20261005"
GEAENDERT = []


def lese(rel): return io.open(os.path.join(VF, rel), encoding="utf-8").read()


def schreibe(rel, t):
    p = os.path.join(VF, rel)
    io.open(p + ".neu", "w", encoding="utf-8", newline="\r\n").write(t); os.replace(p + ".neu", p); GEAENDERT.append(rel)


def ersetze(t, alt, neu, rel):
    """genau einmal ersetzen; schon ersetzt -> unveraendert (idempotent); weder noch -> Abbruch"""
    if neu in t:
        return t
    if t.count(alt) != 1:
        raise SystemExit("ABBRUCH %s: Stelle %dx gefunden: %r" % (rel, t.count(alt), alt[:70]))
    return t.replace(alt, neu)


MESSUNG_JS = r"""/* VersicherungsFuchs — Messung, Consent Mode ADVANCED (05.10.2026, Sven: fuer alle Marken; vorher BASIC seit 16.09.).
   Google Ads (AW-820163824) + Google Analytics 4 (G-VYF5P956SP) laden SOFORT. Ohne Einwilligung bleibt der
   Consent-Status "denied" (consent default im <head>): Google setzt keine Cookies und bekommt nur cookielose Pings
   fuer die Conversion-Modellierung; ads_data_redaction entfernt Klick-Kennungen. Mit Einwilligung
   (localStorage vf_cookie_consent = 'accepted') consent update -> volle Messung. Kein url_passthrough.
   EIN page_view (GA4-config; AW-config mit send_page_view:false — Memory page-view-doppelt-messung-py).
   Schluesselereignisse (in GA4 als Key Events markieren): check_start, submit_lead_form, purchase. */
(function () {
  var AW = 'AW-820163824', GA = 'G-VYF5P956SP', geladen = false;
  function einwilligung() {
    try { return localStorage.getItem('vf_cookie_consent') === 'accepted'; } catch (e) { return false; }
  }
  function lade() {
    if (geladen) return;
    geladen = true;
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') { window.gtag = function () { window.dataLayer.push(arguments); }; }
    /* Sicherung: fehlt der consent default im <head>, hier "denied" setzen, bevor irgendetwas geladen wird */
    var hatDefault = false;
    for (var i = 0; i < window.dataLayer.length; i++) {
      var x = window.dataLayer[i];
      if (x && x[0] === 'consent' && x[1] === 'default') { hatDefault = true; break; }
    }
    if (!hatDefault) {
      window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });
    }
    window.gtag('set', 'ads_data_redaction', true);
    if (einwilligung()) {
      window.gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' });
    }
    window.gtag('js', new Date());
    window.gtag('config', AW, { send_page_view: false });
    window.gtag('config', GA);
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + AW;
    document.head.appendChild(s);
  }
  /* Ereignisse gehen auch ohne Einwilligung raus - dann als cookieloser Ping (Consent Mode advanced) */
  window.vfEvent = function (name, params) {
    lade();
    try { window.gtag('event', name, params || {}); } catch (e) {}
  };
  window.addEventListener('vf-consent', lade);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lade); else lade();
})();
"""

# 1. vf-messung.js
if lese("assets/js/vf-messung.js") != MESSUNG_JS:
    schreibe("assets/js/vf-messung.js", MESSUNG_JS)

# 2. <head> aller Seiten: ads_data_redaction nach consent default, Kommentar, Versionen
DEFAULT_ENDE = "'wait_for_update':500});</script>"
DEFAULT_NEU = "'wait_for_update':500});gtag('set','ads_data_redaction',true);</script>"
KOMM_ALT = ("<!-- Consent BASIC (16.09.2026): Google Ads + GA4 laden erst nach Einwilligung (assets/js/vf-messung.js).\n"
            "     Hier nur dataLayer-Stub + consent default — kein Request an Google. -->")
KOMM_NEU = ("<!-- Consent ADVANCED (05.10.2026, Sven): Google Ads + GA4 laden sofort (assets/js/vf-messung.js); ohne Einwilligung\n"
            "     bleibt alles \"denied\" - keine Cookies, nur cookielose Pings. ads_data_redaction entfernt Klick-Kennungen. -->")
n = 0
for d, dirs, fs in os.walk(VF):
    dirs[:] = [x for x in dirs if x not in (".git", "tools")]
    for f in fs:
        if not f.endswith(".html"): continue
        rel = os.path.relpath(os.path.join(d, f), VF).replace("\\", "/")
        t = lese(rel); alt = t
        if "consent','default'" in t:
            t = ersetze(t, DEFAULT_ENDE, DEFAULT_NEU, rel)
        t = t.replace(KOMM_ALT, KOMM_NEU)
        t = t.replace('vf-messung.js?v=%s"' % V_ALT, 'vf-messung.js?v=%s"' % V)
        t = t.replace('cookie-notice.js?v=%s"' % V_ALT, 'cookie-notice.js?v=%s"' % V)
        if t != alt: schreibe(rel, t); n += 1
print("Seiten:", n)

# 3. cookie-notice.js: Kopfkommentar + Bannertext
rel = "assets/js/cookie-notice.js"; t = lese(rel); alt = t
t = ersetze(t,
            "   - Eine Stufe: Marketing (Google Ads Conversion-Messung + Google Analytics 4) — Consent BASIC: die Tags\n"
            "     laedt assets/js/vf-messung.js erst nach Zustimmung (Ereignis 'vf-consent'); vorher kein Google-Request.",
            "   - Eine Stufe: Marketing (Google Ads Conversion-Messung + Google Analytics 4) — Consent ADVANCED (05.10.2026):\n"
            "     assets/js/vf-messung.js laedt die Tags sofort; ohne Zustimmung bleibt alles \"denied\" (keine Cookies,\n"
            "     nur cookielose Pings). Die Zustimmung hebt per consent update auf \"granted\".", rel)
t = ersetze(t,
            "      + '    Technisch notwendige Cookies brauchen wir, damit die Seite funktioniert.'\n"
            "      + '    Optional messen wir, ueber welche Anzeige Sie zu uns gefunden haben'\n"
            "      + '    (Google Ads) und wie die Seite genutzt wird (Google Analytics 4). Sie entscheiden -'\n"
            "      + '    jederzeit widerrufbar ueber „Cookie-Einstellungen\" im Fussbereich. Details in der'\n"
            "      + '    <a href=\"/datenschutz.html\">Datenschutzerklaerung</a>.'\n",
            "      + '    Mit Ihrer Zustimmung nutzen wir Google Analytics und messen den Erfolg unserer Anzeigen mit Cookies.'\n"
            "      + '    Ohne Zustimmung setzen wir keine Cookies; Google erh\\u00e4lt dann nur anonyme Messsignale ohne Cookies.'\n"
            "      + '    Sie entscheiden - jederzeit widerrufbar \\u00fcber „Cookie-Einstellungen\" im Fu\\u00dfbereich. Details in der'\n"
            "      + '    <a href=\"/datenschutz.html\">Datenschutzerkl\\u00e4rung</a>.'\n", rel)
if t != alt: schreibe(rel, t)

# 4. Datenschutz Abschnitt 3: Consent Mode advanced (Wortlaut rechtliches.py), firmenspezifische Angaben bleiben
rel = "datenschutz.html"; t = lese(rel); alt = t
t = ersetze(t,
            "Nur wenn Sie „Alle akzeptieren“ wählen, setzen wir zusätzlich die beiden folgenden Google-Dienste mit Cookies ein "
            "(Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Ohne Ihre Einwilligung wird kein Google-Skript geladen — es fließen "
            "dann keine Daten an Google.</p>",
            "Google-Cookies setzen wir nur, wenn Sie „Alle akzeptieren“ wählen. Ohne Ihre Einwilligung werden keine Cookies "
            "gesetzt; Google erhält dann nur anonyme Messsignale ohne Cookies (Abschnitt 3.1).</p>", rel)
t = ersetze(t,
            "  <h3>3.1 Google Ads Conversion-Messung</h3>\n"
            "  <p>Wir messen, ob ein Besuch über eine Google-Anzeige zu einer Anfrage geführt hat (Google Ireland Limited, Gordon "
            "House, Barrow Street, Dublin 4, Irland). Dazu setzt Google nach Einwilligung ein Conversion-Cookie (Laufzeit bis 90 "
            "Tage). Wir erhalten nur aggregierte Zahlen, keine Identifizierung einzelner Personen. Google kann Daten in die USA "
            "übermitteln; Google ist nach dem EU-US Data Privacy Framework zertifiziert.</p>\n"
            "\n"
            "  <h3>3.2 Google Analytics 4</h3>\n"
            "  <p>Nach Einwilligung werten wir die Nutzung der Website mit Google Analytics 4 statistisch aus (Seitenaufrufe, Start "
            "des Riester-Checks, abgeschickte Anfragen, bestätigte Zahlungen). Die IP-Adresse wird gekürzt verarbeitet, "
            "Werbefunktionen sind deaktiviert; Berichte enthalten keine Namen oder E-Mail-Adressen. Rechtsgrundlage ist Ihre "
            "Einwilligung.</p>\n",
            "  <h3>3.1 Google Analytics 4 und Google Ads (Consent Mode)</h3>\n"
            "  <p>Wir nutzen Google Analytics 4 (Statistik) und die Conversion-Messung von Google Ads (Anzeigen-Messung) der "
            "Google Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Irland.</p>\n"
            "  <p>Technisch ist der sogenannte Consent Mode aktiv. <strong>Standardmäßig ist alles auf „abgelehnt“ gesetzt.</strong></p>\n"
            "  <ul>\n"
            "    <li><strong>Mit Ihrer Zustimmung</strong> im Banner setzt Google Cookies und misst Seitenaufrufe und Anfragen "
            "vollständig. Rechtsgrundlage ist Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO in Verbindung mit § 25 Abs. 1 "
            "TDDDG.</li>\n"
            "    <li><strong>Ohne Ihre Zustimmung</strong> werden keine Cookies gesetzt und keine Werbe- oder Analyse-Kennungen "
            "gespeichert. Das Google-Tag sendet dann nur cookielose Signale (zum Beispiel, dass eine Seite aufgerufen oder eine "
            "Anfrage abgesendet wurde, mit Zeitpunkt und technischen Browserangaben); Klick-Kennungen aus Anzeigen werden dabei "
            "entfernt. Google nutzt diese Signale, um die Wirkung von Anzeigen statistisch hochzurechnen, ohne Sie zu "
            "identifizieren. Rechtsgrundlage ist unser berechtigtes Interesse an der Messung des Erfolgs unserer Werbung "
            "(Art. 6 Abs. 1 lit. f DSGVO).</li>\n"
            "  </ul>\n"
            "  <p>Google kann Daten auch in den USA verarbeiten; Grundlage ist der Angemessenheitsbeschluss zum EU-US Data "
            "Privacy Framework, unter dem Google zertifiziert ist.</p>\n"
            "\n"
            "  <h3>3.2 Was wir messen</h3>\n"
            "  <p>Mit der Conversion-Messung von Google Ads sehen wir, ob ein Besuch über eine Google-Anzeige zu einer Anfrage "
            "geführt hat; nach Einwilligung setzt Google dafür ein Conversion-Cookie (Laufzeit bis 90 Tage). Mit Google Analytics 4 "
            "werten wir die Nutzung der Website statistisch aus (Seitenaufrufe, Start des Riester-Checks, abgeschickte Anfragen, "
            "bestätigte Zahlungen). Wir erhalten nur aggregierte Zahlen; Berichte enthalten keine Namen oder E-Mail-Adressen.</p>\n",
            rel)
if t != alt: schreibe(rel, t)

# 5. CSP (_headers): Der cookielose Ads-Ping geht an pagead2.googlesyndication.com/ccm/collect - die CSP liess das
#    nicht zu (am 05.10. im Test gemessen: in JEDEM Zustand blockiert, auch nach Einwilligung). Dazu das
#    viewthroughconversion-Skript von googleads.g.doubleclick.net (Regionalmarken-Fund 22.09.).
rel = "_headers"; t = lese(rel); alt = t
t = ersetze(t, "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.googleadservices.com ",
            "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net ", rel)
t = ersetze(t, "https://*.google-analytics.com https://*.provenexpert.com https://*.provenexpert.net; font-src",
            "https://*.google-analytics.com https://*.doubleclick.net https://*.googlesyndication.com https://*.provenexpert.com https://*.provenexpert.net; font-src", rel)
t = ersetze(t, "https://*.analytics.google.com https://api.stripe.com",
            "https://*.analytics.google.com https://*.doubleclick.net https://*.googlesyndication.com https://api.stripe.com", rel)
if t != alt: schreibe(rel, t)

print("geaendert:", len(GEAENDERT))
