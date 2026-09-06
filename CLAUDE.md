# Schiri-Trainer

## Zweck des Projekts

`app/data/fragen.json` enthält den DHB-Regelfragenkatalog Basiswissen
(Fragen 1–68) und ist die **alleinige Quelle der Wahrheit** (ADR-0001). Darauf
setzt der **Schiri-Trainer** auf, eine Webanwendung, mit der sich ein Anwärter
auf die theoretische Prüfung vorbereitet. Der Katalog ist der Inhalt, der
Schiri-Trainer die Anwendung; beide Begriffe sind nicht austauschbar. Der
zuvor gepflegte Markdown-Katalog ist nach einer maschinell abgeglichenen
Konvertierung entfallen; er bleibt über Commit
`68bd394` wiederherstellbar.

Daraus folgt: Änderungen am Katalog an maschineller Verarbeitbarkeit und
Formatkonsistenz ausrichten, nicht an menschlicher Lesbarkeit. Der Katalog wird
nicht gelesen, sondern abgefragt.

## Aufbau

```
app/                 Die ausgelieferte Anwendung; genau dieses Verzeichnis geht nach GitHub Pages
  index.html, styles.css
  data/fragen.json   Der Katalog
  js/                Native ES-Module ohne Bundler (ADR-0003)
skripte/             Ausführbare Hüllen um Anwendungsmodule (Katalogvalidierung, UI-Bilder)
tests/               node:test; unter tests/ui/ zusätzlich Browser-Tests (ADR-0005)
docs/                katalogformat.md, adr/, agents/
fragenkatalog/
  quellmaterial/     Theoriefragen_Basiswissen.pdf, Lösungen Prüfungsfragen Basiswissen.pdf
```

Die PDFs sind passwortgeschützt und lassen sich **nicht** mit dem Read-Tool
öffnen. Textextraktion funktioniert über `pdftotext -layout -enc UTF-8`
(in Git Bash verfügbar). Sie sind Herkunftsbeleg, nicht Datenquelle: Der Katalog
wird nicht erneut aus ihnen erzeugt.

Lektionsaufteilung Basiswissen: 1–9, 10–15, 16–21, 22–33, 34–40, 41–51, 52–56,
57–61, 62–68.

## Datenformat

Beschrieben in `docs/katalogformat.md`, als JSDoc-Typen in `app/js/typen.js`
notiert und von `pruefeKatalog` (`app/js/validierung.js`) erzwungen. Das Skript
`skripte/validiere-katalog.mjs` ist nur eine dünne Hülle darum.

**Wichtigste Fallstricke:** Die Optionszahl ist nicht konstant, sie reicht von
2 bis 6 (5 Fragen mit 2, 30 mit 3, 31 mit 4, Frage 32 mit 5, Frage 9 mit 6).
Ein auf a–d verdrahteter Zugriff liegt bei über der Hälfte der Fragen falsch.
Ebenso wenig ist die Zahl der korrekten Optionen auf eins festgelegt: Das Format
lässt mehrere zu, auch wenn der heutige Bestand keinen Gebrauch davon macht.

## Prüfstrecke

`npm run pruefe` führt Katalogvalidierung, Tests und Typprüfung zusammen.
TypeScript dient ausschließlich der Prüfung der JSDoc-Typen, nie dem Bauen
(ADR-0003). Geprüft werden die Anwendungsmodule unter `app/js/`; Tests und
Skripte bleiben außen vor, weil ihre Node-Importe mit `@types/node` eine
weitere devDependency verlangt hätten.

`npm run pruefe-ui` prüft die Oberfläche im Browser (`tests/ui/`, Playwright
als Bibliothek unter `node --test`, ADR-0005). Es ist bewusst **nicht** Teil
von `npm run pruefe`: Die schnelle Schleife bleibt browserfrei. Ein
Abnahmekriterium eines noch offenen Issues steht dort als Test mit
`{ todo: 'Issue #n' }` — er läuft mit, schlägt fehl, zählt nicht als Fehler und
wird grün, sobald die Behebung greift.

devDependencies sind damit TypeScript und Playwright; beide laufen nur in der
Prüfstrecke und fassen das Auslieferungsartefakt `app/` nicht an.

Bei jeder Änderung an der Hauptlinie laufen beide Strecken in GitHub Actions
als getrennte Jobs; nur wenn beide fehlerfrei durchlaufen, wird `app/` nach
GitHub Pages veröffentlicht.

Nicht automatisiert bleibt der Service Worker; er wird weiterhin manuell im
Browser abgenommen. `npm run ui-bilder` legt für Durchsichten Bildschirmfotos
und Elementmaße in `.ui-bilder/` ab.

**Einmaliger Schritt des Repository-Inhabers:** Die Pages-Quelle muss in den
Repository-Einstellungen auf „GitHub Actions" stehen. Ohne ihn schlägt der
Veröffentlichungsschritt fehl; ein Agent kann ihn nicht ausführen.

## Verhältnis zum Quell-PDF

Der Katalog wurde vollständig gegen beide PDFs verifiziert: alle 68 Lösungen
stimmen mit dem Lösungs-PDF überein, die Struktur (68 Fragen + 235 Optionen)
ist deckungsgleich mit dem Fragen-PDF. Diese Verifikation steckte im Markdown
und ist mit dem Abgleich der Konvertierung in die Katalogdatei übergegangen.

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

## Agent skills

### Issue tracker

Issues leben in GitHub Issues von OLibutzki/schiri-trainer, verwaltet über die `gh`-CLI. Siehe `docs/agents/issue-tracker.md`.

### Triage labels

Standard-Label-Vokabular (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix), unverändert übernommen. Siehe `docs/agents/triage-labels.md`.

### Domain docs

Single-Context-Layout: `CONTEXT.md` (Glossar) und `docs/adr/` im Repo-Root. Siehe `docs/agents/domain.md`.
