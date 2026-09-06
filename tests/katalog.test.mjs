import test from 'node:test';
import assert from 'node:assert/strict';
import { bezeichneFrage } from '../app/js/katalog.js';

function katalog({ wissensstufen }) {
  return {
    formatVersion: 1,
    metadaten: {
      titel: 'Testkatalog',
      herkunft: 'Test',
      regelstand: '2025-06-16',
      regelnGueltigAb: '2025-07-01',
      wissensstufen,
      lektionen: [
        { id: 'basiswissen-1', wissensstufe: 'basiswissen', nummer: 1, titel: 'Spielfläche, Tore, Spielzeit, Ball' },
      ],
    },
    fragen: [],
  };
}

function frage() {
  return {
    id: 'basiswissen-7',
    wissensstufe: 'basiswissen',
    lektion: 'basiswissen-1',
    nummer: 7,
    text: 'Wie viele Farben darf der Spielball haben?',
    optionen: [],
  };
}

test('laesst die Wissensstufe weg, wenn der Katalog nur eine kennt', () => {
  const einzigeStufe = katalog({ wissensstufen: [{ id: 'basiswissen', name: 'Basiswissen', reihenfolge: 1 }] });
  assert.equal(bezeichneFrage(einzigeStufe, frage()), 'Lektion 1 · Frage 7');
});

test('nennt die Wissensstufe, wenn der Katalog mehrere kennt', () => {
  const mehrereStufen = katalog({
    wissensstufen: [
      { id: 'basiswissen', name: 'Basiswissen', reihenfolge: 1 },
      { id: 'aufbauwissen', name: 'Aufbauwissen', reihenfolge: 2 },
    ],
  });
  assert.equal(bezeichneFrage(mehrereStufen, frage()), 'Basiswissen · Lektion 1 · Frage 7');
});
