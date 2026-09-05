# Katalogformat

`app/data/fragen.json` ist die alleinige Quelle der Wahrheit des Fragenkatalogs
(ADR-0001). Die Datei liegt innerhalb des ausgelieferten Verzeichnisses, damit die
Veröffentlichung kein Kopieren von Daten erfordert — genau die Stelle, an der Daten
und Anwendung sonst stillschweigend auseinanderlaufen.

Neue Fragen werden direkt hier erfasst. Abgesichert ist das durch `npm run validiere`,
eine dünne Hülle um `pruefeKatalog` aus [`app/js/validierung.js`](../app/js/validierung.js);
die Prüfstrecke lässt eine fehlerhafte Katalogdatei nicht durch.

## Aufbau

```json
{
  "formatVersion": 1,
  "metadaten": {
    "titel": "Regelfragenkatalog Schiedsrichtergrundausbildung",
    "herkunft": "Regelfragenkatalog zur Durchführung der theoretischen Prüfung …",
    "regelstand": "2025-06-16",
    "regelnGueltigAb": "2025-07-01",
    "wissensstufen": [{ "id": "basiswissen", "name": "Basiswissen", "reihenfolge": 1 }],
    "lektionen": [
      {
        "id": "basiswissen-1",
        "wissensstufe": "basiswissen",
        "nummer": 1,
        "titel": "Spielfläche, Tore, Spielzeit, Ball"
      }
    ]
  },
  "fragen": [
    {
      "id": "basiswissen-1",
      "wissensstufe": "basiswissen",
      "lektion": "basiswissen-1",
      "nummer": 1,
      "text": "Welche Abmessungen sehen die Spielregeln für die Spielfläche vor?",
      "optionen": [
        { "buchstabe": "a", "text": "40 x 20 Meter", "korrekt": true },
        { "buchstabe": "b", "text": "42 x 20 Meter", "korrekt": false }
      ]
    }
  ]
}
```

Die Typen sind als JSDoc in [`app/js/typen.js`](../app/js/typen.js) notiert und werden
mit `npm run typen` geprüft.

## Zusicherungen

Was die Validierung erzwingt — und worauf sich die Anwendung deshalb verlassen darf:

- `formatVersion` ist `1`. Eine Änderung am Aufbau erhöht sie, damit ein alter Bestand
  erkannt und nicht still fehlinterpretiert wird.
- Der Metadatenblock ist vollständig: Titel, Herkunft, Regelstand, Geltungsbeginn der
  Regeln, mindestens eine Wissensstufe mit Anzeigename und fachlicher Reihenfolge sowie
  mindestens eine Lektion mit Nummer und Titel. Ohne die hinterlegte Reihenfolge wäre
  die Abfolge der Wissensstufen entweder alphabetisch falsch oder im Code verdrahtet.
- Die Fragenkennung `id` ist über alle Wissensstufen hinweg eindeutig und aus
  Wissensstufe und Nummer gebildet. Die Nummer allein genügt nicht: Künftige
  Wissensstufen beginnen wieder bei 1, und der Lernfortschritt liegt je Kennung.
- `wissensstufe` und `lektion` verweisen auf Einträge des Metadatenblocks, und die
  Lektion gehört zur selben Wissensstufe wie die Frage.
- Jede Frage hat mindestens zwei Optionen. Die Buchstabenfolge läuft lückenlos ab `a`.
- Mindestens eine Option ist als `korrekt` gekennzeichnet. Mehrere korrekte Optionen je
  Frage sind zulässig; eine Antwort gilt nur bei exakter Übereinstimmung als richtig.
- Frage- und Optionstexte sind nicht leer.

## Fallstricke

- **Die Zahl der Optionen ist nicht konstant.** Im heutigen Bestand reicht sie von zwei
  bis sechs (5 Fragen mit 2, 30 mit 3, 31 mit 4, Frage 32 mit 5, Frage 9 mit 6). Weder
  Datenformat noch Oberfläche dürfen eine feste Zahl annehmen — ein auf a–d verdrahteter
  Zugriff liegt bei über der Hälfte der Fragen falsch.
- **Die Zahl der korrekten Optionen ist nicht auf eins festgelegt.** Der heutige Bestand
  hat je Frage genau eine korrekte Option, das Format lässt aber mehrere zu. Die
  Oberfläche bietet deshalb ausnahmslos Mehrfachauswahl an; ein an die Frage angepasstes
  Bedienelement würde verraten, wie viele Optionen korrekt sind.
- **Der Original-Buchstabe ist Inhalt, keine Position.** Die Optionen werden bei jeder
  Anzeige gemischt; der Buchstabe bleibt sichtbar, damit eine Frage im Quellkatalog
  wiederauffindbar ist.

## Herkunft

Der Bestand wurde einmalig aus dem zuvor gepflegten Markdown-Katalog konvertiert und
dabei maschinell dagegen abgeglichen (68 Fragen, 235 Optionen, 68 korrekte Optionen,
deckungsgleiche Texte). Das Markdown ist danach entfallen und bleibt über Commit
`68bd394` wiederherstellbar. Die Quell-PDFs unter `fragenkatalog/quellmaterial/` bleiben
als Herkunftsbeleg erhalten; sie sind passwortgeschützt und nur über
`pdftotext -layout -enc UTF-8` lesbar.
