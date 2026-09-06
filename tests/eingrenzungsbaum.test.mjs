import test from 'node:test';
import assert from 'node:assert/strict';
import { baueStufenMitLektionen, stufenZustand, verdichteAuswahl, alleLektionIds } from '../app/js/eingrenzungsbaum.js';

/** Katalog mit zwei Wissensstufen, je zwei Lektionen (der reale Katalog kennt bislang nur eine). */
function katalogMitZweiStufen() {
  return {
    formatVersion: 1,
    metadaten: {
      titel: 'Testkatalog',
      herkunft: 'Test',
      regelstand: '2025-06-16',
      regelnGueltigAb: '2025-07-01',
      wissensstufen: [
        { id: 'aufbauwissen', name: 'Aufbauwissen', reihenfolge: 2 },
        { id: 'basiswissen', name: 'Basiswissen', reihenfolge: 1 },
      ],
      lektionen: [
        { id: 'basiswissen-1', wissensstufe: 'basiswissen', nummer: 1, titel: 'Erste' },
        { id: 'basiswissen-2', wissensstufe: 'basiswissen', nummer: 2, titel: 'Zweite' },
        { id: 'aufbauwissen-1', wissensstufe: 'aufbauwissen', nummer: 1, titel: 'Dritte' },
        { id: 'aufbauwissen-2', wissensstufe: 'aufbauwissen', nummer: 2, titel: 'Vierte' },
      ],
    },
    fragen: [],
  };
}

test('baueStufenMitLektionen sortiert nach fachlicher Reihenfolge, nicht alphabetisch', () => {
  const katalog = katalogMitZweiStufen();
  const stufen = baueStufenMitLektionen(katalog);
  assert.deepEqual(
    stufen.map((s) => s.id),
    ['basiswissen', 'aufbauwissen'],
  );
  assert.deepEqual(
    stufen[0].lektionen.map((l) => l.id),
    ['basiswissen-1', 'basiswissen-2'],
  );
});

test('stufenZustand ist unchecked ohne jede Auswahl', () => {
  const lektionen = [{ id: 'basiswissen-1' }, { id: 'basiswissen-2' }];
  assert.equal(stufenZustand(lektionen, new Set()), 'unchecked');
});

test('stufenZustand ist checked, wenn alle Lektionen der Stufe gewaehlt sind', () => {
  const lektionen = [{ id: 'basiswissen-1' }, { id: 'basiswissen-2' }];
  assert.equal(stufenZustand(lektionen, new Set(['basiswissen-1', 'basiswissen-2'])), 'checked');
});

test('stufenZustand ist indeterminate bei einer Teilauswahl', () => {
  const lektionen = [{ id: 'basiswissen-1' }, { id: 'basiswissen-2' }];
  assert.equal(stufenZustand(lektionen, new Set(['basiswissen-1'])), 'indeterminate');
});

test('verdichteAuswahl uebernimmt eine Teilauswahl woertlich als Lektionen-Liste', () => {
  const katalog = katalogMitZweiStufen();
  const auswahl = verdichteAuswahl(katalog, new Set(['basiswissen-1', 'basiswissen-2']));
  assert.deepEqual(auswahl, { lektionen: ['basiswissen-1', 'basiswissen-2'] });
});

test('verdichteAuswahl uebernimmt eine einzelne Lektion woertlich', () => {
  const katalog = katalogMitZweiStufen();
  const auswahl = verdichteAuswahl(katalog, new Set(['basiswissen-1']));
  assert.deepEqual(auswahl, { lektionen: ['basiswissen-1'] });
});

test('verdichteAuswahl kombiniert Lektionen ueber mehrere Stufen hinweg woertlich', () => {
  const katalog = katalogMitZweiStufen();
  const auswahl = verdichteAuswahl(katalog, new Set(['basiswissen-1', 'basiswissen-2', 'aufbauwissen-1']));
  assert.deepEqual(auswahl, { lektionen: ['basiswissen-1', 'basiswissen-2', 'aufbauwissen-1'] });
});

test('verdichteAuswahl ohne jede Auswahl liefert eine leere Liste, nicht keine Einschraenkung', () => {
  // Das ist der Kern der Unterscheidung: "nichts angehakt" ist woertlich eine
  // leere Lektionsliste (laesst keine Frage zu), nicht gleichbedeutend mit
  // "keine Einschraenkung" (dafuer steht ausschliesslich `lektionen: null`,
  // siehe den naechsten Test).
  const katalog = katalogMitZweiStufen();
  assert.deepEqual(verdichteAuswahl(katalog, new Set()), { lektionen: [] });
});

test('alleLektionIds enthaelt jede Lektion-Id des Katalogs', () => {
  const katalog = katalogMitZweiStufen();
  assert.deepEqual(
    alleLektionIds(katalog),
    new Set(['basiswissen-1', 'basiswissen-2', 'aufbauwissen-1', 'aufbauwissen-2']),
  );
});

test('verdichteAuswahl liefert keine Einschraenkung, wenn wirklich jede Lektion angehakt ist', () => {
  // Der Ausgangszustand des Baums: alle Kaestchen angehakt bedeutet keine
  // Einschraenkung (`lektionen: null`), nicht eine woertliche Liste aller Ids.
  const katalog = katalogMitZweiStufen();
  assert.deepEqual(verdichteAuswahl(katalog, alleLektionIds(katalog)), { lektionen: null });
});
