# Schiri-Trainer

Übungs- und Prüfungstrainer für den DHB-Regelfragenkatalog: eine Webanwendung,
mit der sich ein Anwärter auf die theoretische Schiedsrichterprüfung vorbereitet.

**Anwendung:** <https://olibutzki.github.io/schiri-trainer/>

Der Katalog liegt als `app/data/fragen.json` vor und ist die alleinige Quelle
der Wahrheit ([ADR-0001](docs/adr/0001-json-als-alleinige-datenquelle.md)); das
Format beschreibt [docs/katalogformat.md](docs/katalogformat.md). Die Anwendung
kommt ohne Bundler aus ([ADR-0003](docs/adr/0003-kein-build-tool.md)), `app/`
wird unverändert veröffentlicht.

```
npm install
npm run pruefe   # Katalogvalidierung, Tests, Typprüfung
```

Begriffe der Domäne stehen in [CONTEXT.md](CONTEXT.md), Vorgaben für die Arbeit
am Projekt in [CLAUDE.md](CLAUDE.md).
