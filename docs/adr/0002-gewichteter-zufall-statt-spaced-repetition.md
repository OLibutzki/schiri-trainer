# Gewichteter Zufall statt Spaced-Repetition-System

Der Übungsmodus muss sicherstellen, dass mit der Zeit alle Fragen drankommen und
unsichere Fragen häufiger. Statt eines Leitner-Systems mit Boxen und festen
Intervallen wählt die Anwendung Fragen über einen gewichteten Zufall: nie gestellte
Fragen erhalten das höchste Gewicht, nicht gemeisterte ein hohes, gemeisterte ein
niedriges, das mit der Zeit seit der letzten Abfrage wieder ansteigt.

## Considered Options

- **Reine Rotation** (alle Fragen einmal durch, dann von vorn): verworfen, weil sie
  Problemfragen nicht häufiger stellt.
- **Leitner-System**: verworfen, weil der Mehraufwand an Zustand und Logik dem
  Nutzen für einen einzelnen Anwender und einen Katalog dieser Größe nicht
  entspricht. Der Zeitfaktor bildet den wesentlichen Teil des Nutzens ab.

## Consequences

- Eine Frage gilt als gemeistert, wenn sie zweimal hintereinander richtig
  beantwortet wurde. Dieser Schwellenwert, der Zeitfaktor und die Gewichte sind
  bewusst als benannte Konstanten an einer Stelle gebündelt, weil sie nach
  Praxiserfahrung nachjustiert werden sollen.
- Die Auswahl ist zufällig und damit von außen schwer zu beurteilen: Ein Fehler
  in der Gewichtung würde sich erst in der Prüfung zeigen. Deshalb ist die Logik
  als eigenständiges Modul mit Unit-Tests ausgeführt.
- Der Prüfungsmodus nutzt diese Gewichtung ausdrücklich **nicht**; er verteilt
  Fragen proportional über die Lektionen, um ein breites Wissensspektrum abzufragen.
