# Handball-Schiedsrichter – Fragenkatalog Basiswissen

Regelfragenkatalog zur Durchführung der theoretischen Prüfung in der
Schiedsrichtergrundausbildung im DHB.

Fragen zu den ab 01.07.2025 geltenden IHF-Spielregeln einschließlich der
gültigen DHB-Zusatzbestimmungen. Stand: 16.06.2025.

Quelle: `Theoriefragen_Basiswissen.pdf` und `Lösungen Prüfungsfragen Basiswissen.pdf`
(übertragen nach Markdown; der PDF-Auszug enthält den Teil **Basiswissen**, Fragen 1–68).

## Inhalt

| Datei | Fragen |
|---|---|
| [Lektion 1](basiswissen-lektion-01.md) – Spielfläche, Tore, Spielzeit, Ball | 1–9 |
| [Lektion 2](basiswissen-lektion-02.md) – Mannschaft, Auswechslung, Spielkleidung | 10–15 |
| [Lektion 3](basiswissen-lektion-03.md) – Spielzeitunterbrechung, Time-out, Team-Time-out | 16–21 |
| [Lektion 4](basiswissen-lektion-04.md) – Tor, Anwurf, Einwurf | 22–33 |
| [Lektion 5](basiswissen-lektion-05.md) – Spielen des Balles, Freiwurf | 34–40 |
| [Lektion 6](basiswissen-lektion-06.md) – Torraum, Abwurf | 41–51 |
| [Lektion 7](basiswissen-lektion-07.md) – Ausführung von Würfen | 52–56 |
| [Lektion 8](basiswissen-lektion-08.md) – Zeitnehmer und Sekretär | 57–61 |
| [Lektion 9](basiswissen-lektion-09.md) – Schiedsrichter, Zusammenarbeit | 62–68 |

## Datenformat

Die Lektionsdateien sind die Datengrundlage für eine noch zu bauende
Übungsanwendung, kein Lernmaterial zum direkten Durchlesen. Sie folgen einem
einheitlichen, maschinell parsbaren Aufbau:

```markdown
### <Nr>. <Fragetext>

- a) <Option>
- b) <Option>

**Lösung: <Buchstabe>)**
```

Regeln, auf die sich ein Parser verlassen kann:

- Die Fragen sind über alle Dateien hinweg fortlaufend von 1 bis 68 nummeriert;
  jede Nummer kommt genau einmal vor.
- Auf jede Frage folgt genau eine `**Lösung: …**`-Zeile mit genau einem
  Antwortbuchstaben.
- Die Zahl der Optionen schwankt stark und reicht von zwei bis sechs: 5 Fragen
  haben 2 Optionen, 30 haben 3, 31 haben 4, Frage 32 hat 5 und Frage 9 hat 6
  (a–f). Ein Parser darf also keine feste Optionszahl annehmen; die Buchstaben
  laufen immer lückenlos ab `a)`.
- Frage- und Optionstexte können im Quell-PDF über mehrere Zeilen umbrochen
  sein; in den Markdown-Dateien steht jede Frage und jede Option auf einer Zeile.
