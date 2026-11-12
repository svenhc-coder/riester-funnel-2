# -*- coding: utf-8 -*-
# Inhalte der drei neuen VF-Ratgeber (Faktencheck durch Koordination 12.11.2026: Werte stimmen, BU ohne Faustprozente, Riester mit Reform-Hinweis).
def faq(paare):
    return "<h2>Häufige Fragen</h2>" + "".join(
        '<details class="faq-item"><summary>%s</summary><p>%s</p></details>' % (q, a) for q, a in paare)


ARTIKEL = [
    {
        "id": "riester-kuendigung",
        "tag": "Vertragsanalyse",
        "category": "riester",
        "title": "Riester kündigen, ruhen lassen oder behalten",
        "date": "2026-11-12",
        "readtime": "6 min",
        "excerpt": "Kündigen, beitragsfrei stellen oder behalten? Was mit Zulagen und Steuervorteilen passiert und woran Sie die Entscheidung festmachen.",
        "body": (
            "<p>Eine pauschale Antwort gibt es nicht. Entscheidend ist, was Sie bereits an Zulagen und Steuervorteilen erhalten haben, wie hoch die Kosten Ihres Vertrags sind und wie lange er noch läuft. Eine Kündigung ist selten der erste Schritt, weil sie Geld kosten kann.</p>"
            "<h2>Drei Wege im Überblick</h2>"
            "<ul>"
            "<li><strong>Behalten:</strong> Sie zahlen weiter ein und bekommen weiter Zulagen. Das ist sinnvoll, wenn die Kosten im Rahmen liegen und Sie die Zulage voll nutzen.</li>"
            "<li><strong>Beitragsfrei stellen (ruhen lassen):</strong> Sie zahlen nichts mehr ein, der Vertrag bleibt bestehen. Für diese Zeit entfallen die Zulagen, und laufende Kosten können das Guthaben weiter schmälern.</li>"
            "<li><strong>Kündigen:</strong> Ein Riester-Vertrag lässt sich nicht einfach auszahlen. Bei einer Kündigung müssen die Zulagen und Steuervorteile in der Regel zurückgezahlt werden (schädliche Verwendung nach § 93 EStG). Ausgezahlt wird nur der Rest.</li>"
            "</ul>"
            '<div class="warn-box"><strong>Vor einer Kündigung die Rückzahlung klären</strong><p>Fragen Sie beim Anbieter schriftlich nach, welcher Betrag nach Rückzahlung der Zulagen und Steuervorteile übrig bliebe. Erst dann lässt sich die Kündigung mit dem Behalten vergleichen.</p></div>'
            "<h2>Woran Sie die Entscheidung festmachen</h2>"
            "<ol>"
            "<li><strong>Zulage nutzen:</strong> Die Grundzulage beträgt 175 € im Jahr. Hinzu kommen Kinderzulagen: 185 € je Kind, bei Geburt ab 2008 300 € je Kind (Stand 2026). Die volle Zulage gibt es, wenn Sie den Mindesteigenbeitrag zahlen: 4 % des Vorjahreseinkommens abzüglich der Zulagen, mindestens 60 € im Jahr.</li>"
            "<li><strong>Kosten kennen:</strong> Abschluss-, Verwaltungs- und Fondskosten bestimmen, wie viel von Ihren Beiträgen arbeitet. Mehr dazu im Artikel <a href=\"/news/riester-kostenstruktur/\">Kostenstruktur in Riester-Verträgen verstehen</a>.</li>"
            "<li><strong>Restlaufzeit:</strong> Je kürzer die Restlaufzeit, desto weniger lässt sich bei einem teuren Vertrag noch verbessern.</li>"
            "<li><strong>Anbieterwechsel prüfen:</strong> Ein Wechsel des Anbieters ist unter bestimmten Voraussetzungen ohne schädliche Verwendung möglich, die bisherigen Förderungen bleiben dann erhalten.</li>"
            "</ol>"
            '<div class="info-box"><strong>Reform im Blick</strong><p>Für Neuverträge ist ab 2027 eine Reform geplant. Was bisher feststeht und was offen ist, steht im Artikel <a href="/news/depot2027-reform/">Depot 2027: Was sich für Riester-Sparer tatsächlich ändert</a>.</p></div>'
            "<h2>Was der Riester-Check leistet</h2>"
            "<p>Der <a href=\"/riester-check/\">Riester-Check</a> ordnet Ihren Vertrag nach Ihren Angaben ein, ohne Tarifempfehlung. Für eine Entscheidung brauchen Sie Ihre Unterlagen: Standmitteilung, Kosteninformation und Zulagenbescheid.</p>"
            + faq([
                ("Kann ich meinen Riester-Vertrag einfach kündigen?", "Ja, aber Zulagen und Steuervorteile müssen in der Regel zurückgezahlt werden. Die Auszahlung fällt deshalb oft niedriger aus als erwartet."),
                ("Was heißt beitragsfrei stellen?", "Sie zahlen nicht mehr ein, der Vertrag läuft weiter. Zulagen gibt es für diese Zeit nicht mehr."),
                ("Lohnt sich Riester noch?", "Das hängt von Zulagen, Kosten und Restlaufzeit ab und lässt sich nicht pauschal beantworten. Der Riester-Check hilft bei der Einordnung."),
                ("Wo finde ich die Kosten meines Vertrags?", "In der jährlichen Standmitteilung und in der Kosteninformation Ihres Anbieters."),
                ("Was ändert sich mit dem Altersvorsorgedepot?", "Für Neuverträge ist ab 2027 eine Reform geplant. Den Stand zeigt der Artikel zu Depot 2027."),
            ])
        ),
    },
    {
        "id": "pkv-oder-gkv-entscheidung",
        "tag": "Krankenversicherung",
        "category": "pkv",
        "title": "PKV oder GKV: Woran Sie entscheiden",
        "date": "2026-11-12",
        "readtime": "6 min",
        "excerpt": "Gesetzlich oder privat? Die Frage stellt sich nur, wenn Sie die Wahl haben. Fünf Punkte, die die Entscheidung tragen.",
        "body": (
            "<p>Die Frage stellt sich nur, wenn Sie die Wahl haben: als Selbstständige, Beamte oder Angestellte über der Versicherungspflichtgrenze. Dann zählen Familie, Einkommensentwicklung und Ihr Wunsch nach Planbarkeit im Alter mehr als der Beitrag heute.</p>"
            "<h2>Wer überhaupt wechseln kann</h2>"
            "<p>Angestellte können nur wechseln, wenn ihr regelmäßiges Jahresentgelt über der Versicherungspflichtgrenze liegt. Sie beträgt 77.400 € im Jahr (6.450 € im Monat, Stand 2026) und wird jährlich angepasst. Selbstständige und Beamte haben grundsätzlich die Wahl. Die Einzelheiten stehen im Artikel <a href=\"/news/pkv-zugang/\">Wann der Wechsel in die PKV überhaupt möglich ist</a>.</p>"
            "<h2>Fünf Punkte, die die Entscheidung tragen</h2>"
            "<ol>"
            "<li><strong>Familie:</strong> In der GKV sind Ehepartner ohne eigenes Einkommen und Kinder unter bestimmten Voraussetzungen beitragsfrei mitversichert. In der PKV zahlt jede Person einen eigenen Beitrag.</li>"
            "<li><strong>Beitrag im Alter:</strong> In der GKV richtet er sich nach dem Einkommen, in der PKV nach Eintrittsalter, Leistungen und der Beitragsentwicklung des Tarifs. Beiträge in der PKV können im Alter deutlich steigen.</li>"
            "<li><strong>Rückweg:</strong> Ein Wechsel zurück in die GKV ist ab 55 stark eingeschränkt.</li>"
            "<li><strong>Beamte:</strong> Die Beihilfe trägt einen Teil der Kosten, die PKV deckt den Rest. Die GKV ohne Arbeitgeberanteil ist für Beamte meist teuer.</li>"
            "<li><strong>Leistungen und Gesundheit:</strong> Bei der PKV prüft der Versicherer Ihren Gesundheitszustand. In unseren Checks fragen wir bewusst keine Gesundheitsdaten ab.</li>"
            "</ol>"
            '<div class="info-box"><strong>Der Beitrag heute ist nicht die ganze Rechnung</strong><p>Planen Sie Beiträge im Ruhestand und die Absicherung Ihrer Familie mit ein, bevor Sie sich festlegen. Der Rückweg in die GKV ist später kaum noch möglich.</p></div>'
            "<h2>Was die Checks leisten</h2>"
            "<p>Der <a href=\"/pkv-check/\">PKV-Check</a> ordnet ein, ob die PKV für Ihre Lage infrage kommt und worauf Sie achten sollten. Der <a href=\"/pkv-eignung-check/\">Eignungs-Check</a> zeigt, ob Sie die Voraussetzungen erfüllen. Beide kommen ohne Tarifempfehlung aus.</p>"
            + faq([
                ("Ab wann kann ich als Angestellter in die PKV?", "Wenn Ihr regelmäßiges Jahresentgelt über der Versicherungspflichtgrenze liegt: 77.400 € im Jahr (Stand 2026)."),
                ("Sind Kinder in der PKV mitversichert?", "Nicht beitragsfrei. Für jedes Kind fällt ein eigener Beitrag an."),
                ("Kann ich aus der PKV zurück in die GKV?", "Nur unter engen Voraussetzungen, ab 55 sehr eingeschränkt."),
                ("Was bedeutet Beitragsentwicklung in der PKV?", "Beiträge können mit steigenden Gesundheitskosten und im Alter steigen. Planen Sie Spielraum ein."),
                ("Lohnt sich die PKV für Selbstständige?", "Das hängt von Einkommen, Familie und Gesundheit ab. Eine Prüfung der eigenen Situation ist nötig."),
            ])
        ),
    },
    {
        "id": "bu-beitrag-einflussfaktoren",
        "tag": "Arbeitskraft",
        "category": "bu",
        "title": "Berufsunfähigkeit: Was den Beitrag bestimmt",
        "date": "2026-11-12",
        "readtime": "6 min",
        "excerpt": "Eintrittsalter, Beruf, Gesundheit, Rentenhöhe und Laufzeit: was den Beitrag der BU bestimmt und warum der günstigste nicht der beste ist.",
        "body": (
            "<p>Der Beitrag hängt vor allem von Eintrittsalter, Beruf, Gesundheit, Rentenhöhe und Laufzeit ab. Nicht nur der Preis zählt: Die Bedingungen entscheiden, ob im Leistungsfall gezahlt wird.</p>"
            "<h2>Was den Beitrag bestimmt</h2>"
            "<ul>"
            "<li><strong>Eintrittsalter:</strong> Je jünger beim Abschluss, desto niedriger der Beitrag, auch weil die Gesundheitsprüfung leichter fällt.</li>"
            "<li><strong>Beruf:</strong> Tätigkeiten mit höherem Risiko werden teurer eingestuft. Viele Versicherer unterscheiden nach Berufsgruppen.</li>"
            "<li><strong>Gesundheit und Hobbys:</strong> Vorerkrankungen und riskante Hobbys können zu Zuschlägen oder Ausschlüssen führen. Die Annahme-Logik erklärt der Artikel <a href=\"/news/bu-annahme/\">Berufsunfähigkeit: Wovon die Annahme wirklich abhängt</a>.</li>"
            "<li><strong>Rentenhöhe und Laufzeit:</strong> Je höher die versicherte Rente und je länger die Laufzeit, desto höher der Beitrag. Orientieren Sie sich beim Rentenbetrag am Nettoeinkommen und wählen Sie die Laufzeit möglichst bis zum Rentenbeginn.</li>"
            "<li><strong>Nichtraucher:</strong> Nichtraucher erhalten in der Regel günstigere Beiträge.</li>"
            "<li><strong>Beitragsdynamik und Überschüsse:</strong> Der Zahlbeitrag ist oft niedriger als der Bruttobeitrag, weil Überschüsse verrechnet werden. Vergleichen Sie Brutto- und Zahlbeitrag und achten Sie darauf, wie sicher die Überschüsse sind.</li>"
            "</ul>"
            '<div class="warn-box"><strong>Der günstigste Beitrag ist selten der beste Schutz</strong><p>Entscheidend sind Bedingungen wie der Verzicht auf die abstrakte Verweisung, die Nachversicherungsgarantie und die Definition der Berufsunfähigkeit.</p></div>'
            "<h2>Was der BU-Check leistet</h2>"
            "<p>Der <a href=\"/bu-check/\">BU-Check</a> ordnet Ihre Situation ein (Status, Tätigkeit, Alter) und zeigt, worauf Sie achten sollten. Er stellt keine Gesundheitsfragen und spricht keine Tarifempfehlung aus.</p>"
            + faq([
                ("Was kostet eine Berufsunfähigkeitsversicherung?", "Der Beitrag hängt von Alter, Beruf, Gesundheit, Rente und Laufzeit ab. Eine pauschale Zahl wäre irreführend."),
                ("Warum sind Berufe unterschiedlich teuer?", "Versicherer ordnen Berufe nach dem Risiko einer Berufsunfähigkeit ein."),
                ("Wie hoch sollte die BU-Rente sein?", "Orientieren Sie sich am Nettoeinkommen und an Ihren laufenden Kosten. Eine Faustzahl für alle gibt es nicht."),
                ("Was ist der Unterschied zwischen Brutto- und Zahlbeitrag?", "Der Zahlbeitrag berücksichtigt verrechnete Überschüsse und kann später steigen, wenn diese sinken."),
                ("Lohnt sich ein früher Abschluss?", "Meist ja: Der Beitrag ist niedriger und die Annahme leichter."),
            ])
        ),
    },
]
