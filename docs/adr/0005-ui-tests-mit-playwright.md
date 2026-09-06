# UI-Tests mit Playwright

Die Oberfläche wurde bis hierher ausschließlich manuell im Browser abgenommen.
Eine Usability-Durchsicht förderte vier Defekte zutage, die alle dieselbe Form
haben: Sie sind an gerenderten Maßen ablesbar (ein Abstand von null Pixeln
zwischen bestätigender und abbrechender Schaltfläche, ein Berührziel von 19
statt 44 Pixeln), in der Quelltextlesung aber leicht zu übersehen und beim
nächsten Umbau ebenso leicht wieder einzuschleppen. Genau dafür wird die
Oberfläche jetzt automatisiert geprüft: mit Playwright, gegen einen echten
Chromium.

Damit löst diese Entscheidung eine Konsequenz aus ADR-0003 ab, nach der
TypeScript die einzige devDependency bleiben sollte. Der dortige Kern —
**kein Build-Schritt zwischen Quelltext und Deploy** — gilt unverändert;
Playwright läuft ausschließlich in der Prüfstrecke und fasst das
Auslieferungsartefakt `app/` nicht an.

## Considered Options

- **Weiter rein manuell**: verworfen. Die gefundenen Defekte sind gerade die
  Art, die eine manuelle Abnahme übersieht, weil nichts sichtbar kaputt ist —
  die Anwendung funktioniert, sie ist nur schwer bedienbar.
- **jsdom statt echtem Browser**: verworfen. Kein Layout, keine Media Queries,
  keine berechneten Maße — also genau das nicht, worum es hier geht.
- **Playwrights eigener Testrunner**: verworfen. Er brächte eine zweite
  Testwelt neben `node --test` mit eigener Konfigurationsdatei und eigenem
  Testbegriff. Playwright wird stattdessen als Bibliothek unter `node --test`
  benutzt.

## Consequences

- Die UI-Tests liegen unter `tests/ui/` und laufen über `npm run pruefe-ui`,
  **nicht** über `npm run pruefe`. Die schnelle Schleife bleibt browserfrei und
  unter einer Sekunde; die Veröffentlichung wartet trotzdem auf beide, denn in
  GitHub Actions ist die UI-Prüfung ein eigener Job, der genauso blockiert.
- Der Preis des Verzichts auf den eigenen Testrunner ist real: kein
  Trace-Viewer, keine eingebauten Retries, kein paralleles Ausführen, und der
  statische Server wird in `tests/ui/umgebung.mjs` selbst hochgezogen. Bei
  wenigen Tests ist das der bessere Tausch; wächst die Zahl deutlich, ist diese
  Entscheidung erneut zu prüfen.
- Ein Abnahmekriterium eines noch offenen Issues wird als Test mit
  `{ todo: 'Issue #n' }` festgehalten. Er läuft mit, schlägt fehl, zählt nicht
  als Fehler — und wird grün, sobald die Behebung greift. Damit steht das
  Kriterium ausformuliert im Repo, statt nur in der Issue-Beschreibung.
- Playwright braucht einen Browser-Download (`npx playwright install
  chromium`). In CI kostet das rund eine Minute; lokal einmalig.
- `skripte/ui-bilder.mjs` nutzt dieselbe Umgebung, um Bildschirmfotos und Maße
  für Durchsichten abzulegen. Es ist ein Werkzeug, kein Test, und seine
  Ausgabe (`.ui-bilder/`) gehört nicht ins Repo.
- Nicht automatisiert bleibt der Service Worker: Sein Verhalten in einem
  Kurzlauf zu prüfen, ist eine eigene Baustelle. Er wird weiterhin manuell
  abgenommen.
