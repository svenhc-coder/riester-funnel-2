/* Beratungsbedarfs-Ampel: Regelwerk (deterministisch, ohne KI, ohne Server).
   Sparten-IDs identisch mit dashboard web/lib/luecken.ts (KATEGORIE_LABEL):
   haftpflicht, hausrat, unfall, bu, leben, rechtsschutz, kranken, altersvorsorge, wohngebaeude, kfz.
   Browser: window.BeratungsbedarfRegelwerk · Node: require(). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BeratungsbedarfRegelwerk = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LABEL = {
    haftpflicht: 'Privathaftpflicht',
    bu: 'Arbeitskraft / Berufsunfähigkeit',
    leben: 'Todesfallschutz (Risikoleben)',
    kfz: 'Kfz-Haftpflicht',
    wohngebaeude: 'Wohngebäude',
    altersvorsorge: 'Altersvorsorge',
    rechtsschutz: 'Rechtsschutz',
    unfall: 'Unfallversicherung',
    hausrat: 'Hausrat',
    kranken: 'Kranken-Zusatz'
  };
  // Reihenfolge = Priorität der Empfehlungen (Existenzrisiken zuerst)
  var PRIO = ['haftpflicht', 'bu', 'leben', 'kfz', 'wohngebaeude', 'altersvorsorge', 'rechtsschutz', 'unfall', 'hausrat', 'kranken'];
  var PERSONENBEZOGEN = { bu: 1, leben: 1, unfall: 1, altersvorsorge: 1, kranken: 1 };

  var Q = {
    vz: 'Verbraucherzentrale: Wichtige Versicherungen',
    gdv: 'GDV: Versicherungen im Überblick',
    drv: 'Deutsche Rentenversicherung: Erwerbsminderungsrente (§ 43 SGB VI)',
    pflvg: '§ 1 PflVG (Kfz-Haftpflichtpflicht)',
    bgb833: '§ 833 BGB (Tierhalterhaftung)',
    bgb823: '§ 823 BGB (Schadensersatz)',
    beamt: 'BeamtVG / Dienstunfähigkeit (je nach Dienstherr)'
  };

  function istErwachsen(e) { return e.alter && e.alter !== 'u18'; }

  /* Bedarf je Sparte: 'muss' | 'soll' | 'kann' | 'nein', mit Regel-ID und Hinweistext */
  function bedarf(e) {
    var b = {};
    var haus = e.wohnen === 'haus' || e.wohnen === 'etw';
    var abhaengige = !!e.partner || (e.kinder || 0) > 0;
    var erwerb = e.status === 'angestellt' || e.status === 'selbststaendig' || e.status === 'ausbildung';

    b.haftpflicht = istErwachsen(e)
      ? { s: 'muss', r: 'HP-01', q: Q.bgb823, t: 'Wer anderen einen Schaden zufügt, haftet dafür in der Regel unbegrenzt mit dem eigenen Vermögen.' }
      : { s: 'soll', r: 'HP-03', q: Q.vz, t: 'Minderjährige sind häufig über die Eltern mitversichert; bitte den Vertrag der Eltern prüfen.' };

    if (e.bu !== false) {
      if (e.status === 'rente' || e.alter === 'u18' || e.alter === '60+') b.bu = { s: 'nein', r: 'BU-00', q: Q.drv, t: 'Für Ihre Lebenssituation in der Regel nicht vorrangig.' };
      else if (e.status === 'beamte') b.bu = { s: 'soll', r: 'BU-02', q: Q.beamt, t: 'Bei Dienstunfähigkeit hängt die Versorgung von Dienstzeit und Dienstherr ab; eine Dienstunfähigkeitsklausel schließt Lücken.' };
      else if (erwerb) b.bu = { s: 'muss', r: 'BU-01', q: Q.drv, t: 'Die gesetzliche Erwerbsminderungsrente ist in der Regel deutlich niedriger als das bisherige Einkommen.' };
    }
    if (!b.bu) b.bu = { s: 'nein', r: 'BU-00', q: Q.drv, t: 'Für Ihre Lebenssituation in der Regel nicht vorrangig.' };

    var finanziert = !!e.kredit || haus;
    if (abhaengige && finanziert) b.leben = { s: 'muss', r: 'LE-01', q: Q.vz, t: 'Mit Familie oder Partner und laufender Finanzierung entsteht bei einem Todesfall schnell eine Versorgungslücke.' };
    else if (abhaengige) b.leben = { s: 'soll', r: 'LE-02', q: Q.vz, t: 'Wenn andere von Ihrem Einkommen abhängen, sichert ein Todesfallschutz die Versorgung ab.' };
    else if (e.kredit) b.leben = { s: 'kann', r: 'LE-03', q: Q.vz, t: 'Ein Kredit kann im Todesfall Angehörige belasten; ein Schutz ist je nach Situation sinnvoll.' };
    else b.leben = { s: 'nein', r: 'LE-00', q: Q.vz, t: 'Ohne Abhängige und ohne Kredit in der Regel nicht vorrangig.' };

    b.kfz = e.fahrzeug
      ? { s: 'muss', r: 'KF-01', q: Q.pflvg, t: 'Für ein zugelassenes Fahrzeug ist die Kfz-Haftpflicht gesetzlich vorgeschrieben.' }
      : { s: 'nein', r: 'KF-00', q: Q.pflvg, t: 'Ohne eigenes Fahrzeug nicht relevant.' };

    if (e.vermietet) b.wohngebaeude = { s: 'muss', r: 'WG-02', q: Q.gdv, t: 'Für vermietete Immobilien sind Gebäudeschutz und je nach Fall eine Haus- und Grundbesitzerhaftpflicht üblich; Elementarschäden bitte gesondert prüfen.' };
    else if (e.wohnen === 'haus') b.wohngebaeude = { s: 'muss', r: 'WG-01', q: Q.gdv, t: 'Als Eigentümer eines Hauses tragen Sie das Risiko für Schäden am Gebäude; Elementarschäden bitte gesondert prüfen.' };
    else if (e.wohnen === 'etw') b.wohngebaeude = { s: 'soll', r: 'WG-03', q: Q.gdv, t: 'Bei Eigentumswohnungen besteht meist eine Gebäudeversicherung der Gemeinschaft; bitte Umfang und Selbstbeteiligung prüfen.' };
    else b.wohngebaeude = { s: 'nein', r: 'WG-00', q: Q.gdv, t: 'Als Mieter oder bei den Eltern wohnend in der Regel nicht Ihre Aufgabe.' };

    if (e.status === 'rente' || e.alter === 'u18') b.altersvorsorge = { s: 'nein', r: 'AV-00', q: Q.vz, t: 'Für Ihre Lebenssituation in der Regel nicht vorrangig.' };
    else if (e.status === 'selbststaendig') b.altersvorsorge = { s: 'muss', r: 'AV-01', q: Q.vz, t: 'Viele Selbstständige haben keine Pflichtvorsorge; die Rente im Alter muss selbst aufgebaut werden.' };
    else b.altersvorsorge = { s: 'soll', r: 'AV-02', q: Q.vz, t: 'Die gesetzliche Rente deckt den Lebensstandard im Alter in der Regel nicht vollständig.' };

    if (e.status === 'angestellt' || e.status === 'selbststaendig' || e.wohnen === 'miete') b.rechtsschutz = { s: 'soll', r: 'RS-01', q: Q.vz, t: 'Bei Streit um Arbeit, Miete oder Verträge können Verfahrenskosten schnell hoch werden; in der Regel gibt es Wartezeiten.' };
    else b.rechtsschutz = { s: 'kann', r: 'RS-02', q: Q.vz, t: 'Je nach Lebenssituation sinnvoll; nicht jeder Bereich ist für jeden relevant.' };

    if ((e.kinder || 0) > 0 || e.status === 'selbststaendig') b.unfall = { s: 'soll', r: 'UN-01', q: Q.gdv, t: 'Die gesetzliche Unfallversicherung gilt nur bei Arbeit, Schule und Wegen dazu, nicht in der Freizeit.' };
    else b.unfall = { s: 'kann', r: 'UN-02', q: Q.gdv, t: 'Eine private Unfallversicherung ergänzt die gesetzliche, die nur Arbeit und Schule abdeckt.' };

    if (e.wohnen === 'eltern') b.hausrat = { s: 'kann', r: 'HR-02', q: Q.vz, t: 'Wer bei den Eltern wohnt, ist häufig über deren Hausrat mitversichert; bitte Bedingungen prüfen.' };
    else b.hausrat = { s: 'soll', r: 'HR-01', q: Q.vz, t: 'Bei Brand, Leitungswasser oder Einbruch ersetzt die Hausratversicherung den Inhalt der Wohnung.' };

    if (e.status === 'beamte') b.kranken = { s: 'soll', r: 'KR-01', q: Q.beamt, t: 'Die Beihilfe übernimmt nur einen Teil der Kosten; eine Ergänzung schließt die Lücke.' };
    else b.kranken = { s: 'kann', r: 'KR-02', q: Q.vz, t: 'Eine Zusatzversicherung kann Leistungen der gesetzlichen Krankenversicherung ergänzen, etwa bei Zahnersatz oder Brille.' };

    return b;
  }

  /* Ampel aus Bedarf + Angabe des Nutzers */
  function ampel(sparte, bed, ang, e) {
    ang = ang || {};
    var v = ang.vorhanden || 'weiss';
    var ueber = ang.ueber || 'weiss';
    if (bed.s === 'nein') return { a: 'grau', r: bed.r, t: bed.t, q: bed.q };

    // Sonderregel Hund: Tierhalterhaftung gilt für Privathaftpflicht in der Regel nicht
    if (sparte === 'haftpflicht' && e.hund) {
      var hh = e.hundHaftpflicht || 'weiss';
      if (hh === 'nein') return { a: 'rot', r: 'HP-02', t: 'Hunde sind in der Privathaftpflicht häufig nicht eingeschlossen; Tierhalter haften gesetzlich auch ohne eigenes Verschulden.', q: Q.bgb833 };
      if (hh === 'weiss') return { a: 'gelb', r: 'HP-02', t: 'Bitte prüfen, ob Ihr Hund in der Haftpflicht mitversichert ist; Tierhalter haften gesetzlich auch ohne eigenes Verschulden.', q: Q.bgb833 };
    }

    if (v === 'weiss') return { a: 'gelb', r: bed.r, t: 'Bitte prüfen, ob Sie hier abgesichert sind. ' + bed.t, q: bed.q };
    if (v === 'nein') {
      if (bed.s === 'muss') return { a: 'rot', r: bed.r, t: 'Lücke: ' + bed.t, q: bed.q };
      if (bed.s === 'soll') return { a: 'gelb', r: bed.r, t: 'Empfohlen, aber noch nicht vorhanden: ' + bed.t, q: bed.q };
      return { a: 'grau', r: bed.r, t: 'Optional: ' + bed.t, q: bed.q };
    }
    // vorhanden = ja
    if (ueber === 'partner' || ueber === 'eltern') {
      var wer = ueber === 'partner' ? 'den Partner' : 'die Eltern';
      if (PERSONENBEZOGEN[sparte]) return { a: 'gelb', r: bed.r, t: 'Läuft über ' + wer + ': Solche Verträge gelten in der Regel für die versicherte Person, nicht automatisch für Sie. Bitte Bedingungen prüfen.', q: bed.q };
      return { a: 'gelb', r: bed.r, t: 'Läuft über ' + wer + ': Bitte Bedingungen prüfen (nicht jeder Vertrag schließt Lebensgefährten oder volljährige Kinder ein).', q: bed.q };
    }
    if (ueber === 'weiss') return { a: 'gelb', r: bed.r, t: 'Bitte prüfen, über wen der Vertrag läuft und wen er einschließt.', q: bed.q };
    if (ang.alt) return { a: 'gelb', r: bed.r, t: 'Vorhanden, aber älter als 5 Jahre: Bedingungen und Summen sind häufig nicht mehr zeitgemäß. Prüfen lohnt sich.', q: bed.q };
    return { a: 'gruen', r: bed.r, t: 'Vorhanden. ' + bed.t, q: bed.q };
  }

  function auswerten(e) {
    e = e || {};
    var bed = bedarf(e);
    var absich = e.absicherung || {};
    var sparten = PRIO.map(function (id) {
      var x = ampel(id, bed[id], absich[id], e);
      return { id: id, label: LABEL[id], bedarf: bed[id].s, ampel: x.a, regel: x.r, satz: x.t, quelle: x.q };
    });
    var rang = { rot: 0, gelb: 1, gruen: 2, grau: 3 };
    var gesamt = 'grau';
    sparten.forEach(function (s) { if (s.ampel !== 'grau' && (gesamt === 'grau' || rang[s.ampel] < rang[gesamt])) gesamt = s.ampel; });
    var empf = sparten.filter(function (s) { return s.ampel === 'rot' || s.ampel === 'gelb'; })
      .sort(function (a, b) { return rang[a.ampel] - rang[b.ampel] || PRIO.indexOf(a.id) - PRIO.indexOf(b.id); })
      .slice(0, 3)
      .map(function (s) { return { sparte: s.id, label: s.label, ampel: s.ampel, regel: s.regel, satz: s.satz, quelle: s.quelle }; });
    return { sparten: sparten, gesamt: gesamt, empfehlungen: empf };
  }

  return { auswerten: auswerten, bedarf: bedarf, LABEL: LABEL, PRIO: PRIO };
});
