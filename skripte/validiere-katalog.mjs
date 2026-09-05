#!/usr/bin/env node
// Duenne Huelle um `pruefeKatalog`: laedt die Katalogdatei, gibt die gefundenen
// Verstoesse aus und bricht die Pruefstrecke ab, sobald einer darunter ist.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pruefeKatalog } from '../app/js/validierung.js';

const pfad = fileURLToPath(new URL('../app/data/fragen.json', import.meta.url));

let daten;
try {
  daten = JSON.parse(readFileSync(pfad, 'utf8'));
} catch (fehler) {
  console.error(`Katalogdatei nicht lesbar: ${fehler instanceof Error ? fehler.message : fehler}`);
  process.exit(1);
}

const verstoesse = pruefeKatalog(daten);

if (verstoesse.length > 0) {
  console.error(`Katalog fehlerhaft, ${verstoesse.length} Verstoß/Verstöße:`);
  for (const verstoss of verstoesse) {
    console.error(`  [${verstoss.code}] ${verstoss.fundstelle}: ${verstoss.meldung}`);
  }
  process.exit(1);
}

console.log(`Katalog fehlerfrei: ${daten.fragen.length} Fragen, ${daten.metadaten.lektionen.length} Lektionen.`);
