# Schiri-Trainer

Übungs- und Prüfungstrainer für den DHB-Regelfragenkatalog: eine Webanwendung,
mit der sich ein Anwärter auf die theoretische Schiedsrichterprüfung vorbereitet.
Der Katalog ist der Inhalt, der Schiri-Trainer die Anwendung darum herum.

## Language

### Katalog

**Katalog**:
Der Datenbestand, gegen den geübt und geprüft wird: sämtliche Fragen des DHB mit
ihren Optionen, gegliedert nach Wissensstufe und Lektion. Der Katalog ist der
Inhalt des Schiri-Trainers, nicht die Anwendung selbst.
_Vermeide_: Fragensammlung, Fragenpool, Datenbank

**Frage**:
Eine Prüfungsaufgabe des DHB-Katalogs mit ihrem Text und ihren Optionen. Über
alle Wissensstufen hinweg eindeutig identifiziert; die Nummer allein ist es nicht.
_Vermeide_: Aufgabe, Item

**Option**:
Eine der zur Auswahl gestellten Antwortmöglichkeiten einer Frage, jeweils als
korrekt oder nicht korrekt gekennzeichnet. Eine Frage hat zwischen zwei und sechs
Optionen und kann mehr als eine korrekte haben.
_Vermeide_: Antwortmöglichkeit, Auswahl, Lösung

**Wissensstufe**:
Die oberste Gliederungsebene des DHB-Katalogs: Basiswissen, Aufbauwissen,
Fachwissen. Innerhalb einer Wissensstufe sind Fragen fortlaufend nummeriert.
_Vermeide_: Level, Kategorie, Schwierigkeitsgrad

**Lektion**:
Ein thematischer Abschnitt innerhalb einer Wissensstufe, der den Kapiteln der
Ausbildung entspricht. Jede Frage gehört zu genau einer Lektion.
_Vermeide_: Kapitel, Thema, Block

**Regelstand**:
Das Datum, zu dem der Katalog die geltenden IHF-Spielregeln und
DHB-Zusatzbestimmungen abbildet. Grenzt eine Katalogfassung von ihren Nachfolgern ab.

### Lernen

**Antwort**:
Die vom Anwender bei einer Frage gewählte Menge von Optionen. Sie gilt nur dann
als richtig, wenn sie genau den korrekten Optionen entspricht.

**Gemeistert**:
Eigenschaft einer Frage, die der Anwender zuletzt mehrfach hintereinander richtig
beantwortet hat. Eine gemeisterte Frage kann diesen Zustand durch eine falsche
Antwort wieder verlieren.
_Vermeide_: gelernt, gekonnt, abgeschlossen

**Problemfrage**:
Eine Frage, die der Anwender mindestens einmal falsch beantwortet hat und die
noch nicht gemeistert ist.
_Vermeide_: Fehlerfrage, schwierige Frage

**Gewicht**:
Der Vorrang, mit dem eine Frage im Übungsmodus zur Auswahl kommt. Es steigt,
je weniger sicher der Anwender bei der Frage ist und je länger sie zurückliegt.
_Vermeide_: Priorität, Score

**Lernfortschritt**:
Der dauerhaft festgehaltene Wissensstand des Anwenders über alle Fragen hinweg,
ausgedrückt als Anteil der gemeisterten Fragen am Gesamtbestand.
_Vermeide_: Fortschritt (mehrdeutig), Abdeckung, Quote

### Modi

**Übungsmodus**:
Ununterbrochenes Üben einzelner Fragen mit sofortiger Rückmeldung. Die
Fragenauswahl folgt dem Gewicht, und jede Antwort verändert den Lernfortschritt.
_Vermeide_: Lernmodus, Training

**Eingrenzung**:
Die Einschränkung der im Übungsmodus infrage kommenden Fragen auf ausgewählte
Wissensstufen und/oder Lektionen, wahlweise zusätzlich auf Problemfragen
beschränkt. Die Bestandteile sind kombinierbar; ohne jede Auswahl ist die
Kandidatenmenge der gesamte Katalog.

**Prüfungsmodus**:
Ein Durchgang mit vorab gewählter Fragenzahl, der die Prüfungssituation nachstellt:
Rückmeldung erst am Ende, Fragen breit über die Lektionen verteilt statt nach
Gewicht, und ohne jede Wirkung auf den Lernfortschritt.
_Vermeide_: Test, Simulation, Klausur

**Prüfung**:
Ein einzelner Durchgang im Prüfungsmodus. Es gibt höchstens eine unabgeschlossene
Prüfung; sie bleibt bis zum Abschluss oder Verwerfen fortsetzbar.
