# Handball-Schiedsrichter Fragenkatalog

## Zweck des Projekts

`fragenkatalog/markdown/` enthält den DHB-Regelfragenkatalog Basiswissen
(Fragen 1–68) als Markdown. Diese Dateien sind **Datengrundlage für eine noch
zu bauende Übungs-Anwendung**, kein Lernmaterial zum direkten Durchlesen. Die
Anwendung existiert bisher nicht.

Daraus folgt: Änderungen am Katalog an maschineller Parsbarkeit und
Formatkonsistenz ausrichten, nicht an menschlicher Lesbarkeit. Eine separate
Lösungsdatei zum „Abdecken" der Antworten wurde ausdrücklich abgelehnt — die
Lösung steht bewusst direkt bei der Frage.

## Aufbau

```
fragenkatalog/
  markdown/        basiswissen-lektion-01..09.md + README.md (Datenformat-Vertrag)
  quellmaterial/   Theoriefragen_Basiswissen.pdf, Lösungen Prüfungsfragen Basiswissen.pdf
```

Die PDFs sind passwortgeschützt und lassen sich **nicht** mit dem Read-Tool
öffnen. Textextraktion funktioniert über `pdftotext -layout -enc UTF-8`
(in Git Bash verfügbar).

Lektionsaufteilung: 1–9, 10–15, 16–21, 22–33, 34–40, 41–51, 52–56, 57–61, 62–68.

## Datenformat (Vertrag für die App)

```markdown
### <Nr>. <Fragetext>

- a) <Option>
- b) <Option>

**Lösung: <Buchstabe>)**
```

Zusicherungen, die durch Prüfskripte bestätigt sind:

- Fragen dateiübergreifend fortlaufend 1–68, jede Nummer genau einmal.
- Genau eine `**Lösung: …**`-Zeile je Frage, mit genau einem Buchstaben.
- Optionsbuchstaben laufen lückenlos ab `a)`; der Lösungsbuchstabe liegt immer
  im tatsächlichen Optionsbereich.
- Frage und Option stehen je auf einer Zeile (im PDF sind sie umbrochen).

**Wichtigste Fallstricke:** Die Optionszahl ist nicht konstant, sie reicht von
2 bis 6 (5 Fragen mit 2, 30 mit 3, 31 mit 4, Frage 32 mit 5, Frage 9 mit 6).
Ein auf a–d verdrahteter Parser liegt bei über der Hälfte der Fragen falsch.

## Verhältnis zum Quell-PDF

Der Katalog wurde vollständig gegen beide PDFs verifiziert: alle 68 Lösungen
stimmen mit dem Lösungs-PDF überein, die Struktur (68 Fragen + 235 Optionen)
ist deckungsgleich mit dem Fragen-PDF.

Bewusste Abweichungen vom PDF-Wortlaut, die **nicht** zurückgesetzt werden
sollen: Tippfehler des Originals sind korrigiert (u.a. „Aufmerksamt",
„Auswechselline", „Spielfeldfeld" in Frage 12; „Mannschaftkapitän" in 18;
„Entscheidung??" in 25) und die Typografie ist vereinheitlicht
(Gedankenstriche, „Team-Time-out"). Keine dieser Änderungen berührt die
Bedeutung einer Antwortoption.

## Sprache

Git-Commit-Nachrichten und alle sonstigen Artefakte (Dokumentation, PR-
Beschreibungen, Kommentare etc.) werden auf Deutsch verfasst.

## Memory

Für dieses Projekt wird kein persistentes Claude-Memory genutzt. Kontext und
Vorgaben stehen ausschließlich in dieser Datei.
