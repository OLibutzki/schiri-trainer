# Kein Build-Tool für die Webanwendung

Die Anwendung ist in nativen ES-Modulen ohne Bundler geschrieben und wird
unverändert nach GitHub Pages ausgeliefert. Sie hat keine
Laufzeitabhängigkeiten, und die Datenmenge ist klein genug, dass Bundling und
Minifizierung nichts Messbares beitragen würden — ein Build-Schritt hätte vor
allem eine weitere Fehlerquelle zwischen Quelltext und Deploy eingezogen.

## Consequences

- Die Module müssen sowohl im Browser als auch in Node direkt importierbar sein,
  damit die Auswahllogik mit `node --test` ohne Werkzeugkette getestet werden kann.
- Ohne Compiler gibt es keine Typprüfung. Ersatzweise werden Typen als
  JSDoc-Kommentare notiert und in CI mit `tsc --noEmit` geprüft; TypeScript ist
  dadurch die einzige devDependency und wird nie zum Bauen verwendet.
- Alle Pfade sind relativ, damit die Anwendung sowohl lokal als auch unter dem
  Projektpfad von GitHub Pages ohne Konfiguration läuft.
