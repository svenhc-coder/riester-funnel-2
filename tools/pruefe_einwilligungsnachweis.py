#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Art.-7-Nachweis (08.11.2026): Der Lead traegt einwilligung_quelle, einwilligung_marketing_text und einwilligung_marketing_version.

Prueft:
  1. window.VF_EINWILLIGUNG.text in assets/js/cookie-notice.js ist der Wortlaut des Banners (Absatz im Banner-HTML).
  2. Version ist gesetzt.
  3. assets/js/vf-herkunft.js schickt die drei Felder nur bei getroffener Wahl mit.
Aufruf: python3 tools/pruefe_einwilligungsnachweis.py   (Exit 1 bei Verstoss)
"""
import html
import io
import os
import re
import sys

WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def lies(rel):
    return io.open(os.path.join(WURZEL, rel), encoding="utf-8").read()


def main():
    fehler = []
    cn = lies("assets/js/cookie-notice.js")
    lb = lies("assets/js/vf-herkunft.js")
    m = re.search(r"window\.VF_EINWILLIGUNG\s*=\s*\{\s*version:\s*'([^']+)'\s*,\s*text:\s*'([^']+)'\s*\}", cn)
    if not m:
        fehler.append("cookie-notice.js: window.VF_EINWILLIGUNG fehlt")
    else:
        version, text = m.group(1), m.group(2)
        # Banner-Absatz: Zeichenketten zusammenziehen, Tags entfernen
        p = re.search(r'<p id="vf-cn-desc"[^>]*>(.*?)</p>', cn.replace("'\n      + '", ""), re.S)
        if not p:
            fehler.append("cookie-notice.js: Banner-Absatz vf-cn-desc nicht gefunden")
        else:
            roh = re.sub(r"'\s*\+\s*'", "", p.group(1))
            banner = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", roh))).strip()
            if re.sub(r"\s+", " ", text).strip() != banner:
                fehler.append("VF_EINWILLIGUNG.text weicht vom Banner ab (Text UND Version anpassen):\n   Konstante: %s\n   Banner:    %s" % (text, banner))
        if not re.match(r"^vf-cookie-v\d+$", version):
            fehler.append("Version %r hat nicht die Form vf-cookie-vN" % version)
    for f in ("einwilligung_quelle", "einwilligung_marketing_text", "einwilligung_marketing_version"):
        if "r.%s" % f not in lb:
            fehler.append("vf-herkunft.js sendet %s nicht" % f)
    if "typeof m === 'boolean'" not in lb:
        fehler.append("vf-herkunft.js: Nachweis nur bei getroffener Wahl (typeof m === 'boolean') fehlt")
    print("Einwilligungs-Nachweis: %d Abweichungen" % len(fehler))
    for f in fehler:
        print(" -", f)
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
