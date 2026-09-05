# Lernstand mit Formatversion im Browser-Speicher

Der Lernfortschritt wird je Fragenkennung in `localStorage` abgelegt, unter dem
Schlüssel `schiri-trainer.lernstand` und mit einer eigenen `formatVersion`.
Gespeichert wird je Frage die Folge zuletzt ununterbrochen richtiger Antworten,
die Zahl der falschen Antworten und der Zeitpunkt der letzten Antwort. Ein
Bestand, dessen Version die Anwendung nicht kennt, gilt als leer und wird beim
nächsten Schreibvorgang überschrieben; der Anwender wird darauf hingewiesen.

Der Zugriff läuft über eine hineingereichte Speicher-Schnittstelle
(`lies`/`schreibe`), nicht direkt über `localStorage`.

## Considered Options

- **Ohne Formatversion**: verworfen. Ein Bestand aus einer früheren Fassung
  ließe sich nicht von einem heutigen unterscheiden und würde stillschweigend
  fehlgedeutet — mit einem Lernfortschritt als Folge, der weder falsch noch
  erkennbar falsch ist.
- **Abgeleitete Kennzahl speichern** (Prozentwert, Zahl gemeisterter Fragen):
  verworfen. Sie ließe sich nach einer Katalogänderung nicht mehr auf Fragen
  zurückführen, und die Gewichtung der Auswahl braucht ohnehin den Stand je
  Frage.
- **IndexedDB**: verworfen. Der Bestand ist klein und wird als Ganzes gelesen
  und geschrieben; der asynchrone Mehraufwand hätte keinen Gegenwert.

## Consequences

- Eine Bedeutungsänderung der gespeicherten Felder erzwingt eine Erhöhung von
  `LERNSTAND_FORMAT_VERSION`. Der Preis ist ein verlorener Lernfortschritt, der
  Gegenwert eine Fehldeutung, die nicht eintritt.
- Der Lernstand bleibt an Gerät und Browser gebunden; ein Abgleich zwischen
  Geräten ist ausdrücklich nicht vorgesehen.
- Da der Speicher hineingereicht wird, ist die Lern-Engine ohne Browser
  prüfbar: Die Tests setzen einen Speicher im Arbeitsspeicher ein.
- Blockiert der Browser den Webspeicher, weicht die Anwendung auf den
  Arbeitsspeicher aus. Üben bleibt möglich, der Stand überdauert dann aber die
  Sitzung nicht.
