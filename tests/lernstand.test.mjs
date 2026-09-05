import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LERNSTAND_FORMAT_VERSION,
  arbeitsspeicher,
  leseLernstand,
  schreibeLernstand,
} from '../app/js/lernstand.js';

test('ein leerer Speicher liefert einen leeren Lernstand', () => {
  const gelesen = leseLernstand(arbeitsspeicher());
  assert.deepEqual(gelesen.eintraege, {});
  assert.equal(gelesen.verworfen, false);
});

test('Geschriebenes wird unveraendert wieder gelesen', () => {
  const speicher = arbeitsspeicher();
  const eintraege = { 'basiswissen-1': { folge: 2, falsch: 1, zuletzt: 1000 } };
  schreibeLernstand(speicher, eintraege);
  assert.deepEqual(leseLernstand(speicher).eintraege, eintraege);
});

test('der geschriebene Bestand traegt die Formatversion', () => {
  const speicher = arbeitsspeicher();
  schreibeLernstand(speicher, {});
  assert.equal(JSON.parse(/** @type {string} */ (speicher.lies())).formatVersion, LERNSTAND_FORMAT_VERSION);
});

test('ein Bestand mit unbekannter Formatversion wird verworfen statt fehlgedeutet', () => {
  const speicher = arbeitsspeicher(
    JSON.stringify({ formatVersion: 999, eintraege: { 'basiswissen-1': { folge: 7 } } }),
  );
  const gelesen = leseLernstand(speicher);
  assert.deepEqual(gelesen.eintraege, {});
  assert.equal(gelesen.verworfen, true);
});

test('unlesbarer Inhalt wird verworfen statt zu einem Fehler', () => {
  const gelesen = leseLernstand(arbeitsspeicher('kein JSON'));
  assert.deepEqual(gelesen.eintraege, {});
  assert.equal(gelesen.verworfen, true);
});

test('unbrauchbare Eintraege einzelner Fragen werden uebergangen', () => {
  const speicher = arbeitsspeicher(
    JSON.stringify({
      formatVersion: LERNSTAND_FORMAT_VERSION,
      eintraege: { 'basiswissen-1': { folge: 1, falsch: 0, zuletzt: 5 }, 'basiswissen-2': 'Unsinn' },
    }),
  );
  const gelesen = leseLernstand(speicher);
  assert.deepEqual(Object.keys(gelesen.eintraege), ['basiswissen-1']);
  assert.equal(gelesen.verworfen, false);
});

test('ein Speicher, der nicht schreiben kann, laesst den Aufrufer weiterarbeiten', () => {
  const speicher = {
    lies: () => null,
    schreibe: () => {
      throw new Error('Speicher voll');
    },
  };
  assert.doesNotThrow(() => schreibeLernstand(speicher, {}));
});
