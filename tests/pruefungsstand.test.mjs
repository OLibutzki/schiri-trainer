import test from 'node:test';
import assert from 'node:assert/strict';
import { arbeitsspeicher } from '../app/js/lernstand.js';
import {
  liesOffenePruefung,
  schreibeOffenePruefung,
  verwirfOffenePruefung,
  PRUEFUNGSSTAND_FORMAT_VERSION,
} from '../app/js/pruefungsstand.js';

function katalog() {
  return {
    formatVersion: 1,
    metadaten: {
      titel: 'Testkatalog',
      herkunft: 'Test',
      regelstand: '2025-06-16',
      regelnGueltigAb: '2025-07-01',
      wissensstufen: [{ id: 'basiswissen', name: 'Basiswissen', reihenfolge: 1 }],
      lektionen: [{ id: 'basiswissen-1', wissensstufe: 'basiswissen', nummer: 1, titel: 'Erste' }],
    },
    fragen: [
      { id: 'basiswissen-1', wissensstufe: 'basiswissen', lektion: 'basiswissen-1', nummer: 1, text: 'Frage 1?', optionen: [] },
      { id: 'basiswissen-2', wissensstufe: 'basiswissen', lektion: 'basiswissen-1', nummer: 2, text: 'Frage 2?', optionen: [] },
    ],
  };
}

/** @returns {import('../app/js/pruefung.js').Pruefungsstand} */
function stand() {
  return {
    frageIds: ['basiswissen-1', 'basiswissen-2'],
    antworten: [['a'], null],
    wissensstufe: 'basiswissen',
  };
}

test('ein leerer Speicher liefert keine offene Pruefung', () => {
  assert.equal(liesOffenePruefung(arbeitsspeicher(), katalog()), null);
});

test('Geschriebenes wird unveraendert wieder gelesen', () => {
  const speicher = arbeitsspeicher();
  schreibeOffenePruefung(speicher, stand());
  assert.deepEqual(liesOffenePruefung(speicher, katalog()), stand());
});

test('ein abgeschlossener Stand (alle Antworten gesetzt) wird ebenso persistiert wie ein offener (Issue #30)', () => {
  const speicher = arbeitsspeicher();
  const abgeschlossenerStand = { ...stand(), antworten: [['a'], ['b']] };
  schreibeOffenePruefung(speicher, abgeschlossenerStand);
  assert.deepEqual(liesOffenePruefung(speicher, katalog()), abgeschlossenerStand);
});

test('der geschriebene Bestand traegt die Formatversion', () => {
  const speicher = arbeitsspeicher();
  schreibeOffenePruefung(speicher, stand());
  const geschrieben = JSON.parse(/** @type {string} */ (speicher.lies()));
  assert.equal(geschrieben.formatVersion, PRUEFUNGSSTAND_FORMAT_VERSION);
});

test('Verwerfen loescht die offene Pruefung dauerhaft', () => {
  const speicher = arbeitsspeicher();
  schreibeOffenePruefung(speicher, stand());
  verwirfOffenePruefung(speicher);
  assert.equal(liesOffenePruefung(speicher, katalog()), null);
});

test('ein Bestand mit unbekannter Formatversion wird verworfen statt fehlgedeutet', () => {
  const speicher = arbeitsspeicher(JSON.stringify({ formatVersion: 999, stand: stand() }));
  assert.equal(liesOffenePruefung(speicher, katalog()), null);
});

test('unlesbarer Inhalt wird verworfen statt zu einem Fehler', () => {
  const speicher = arbeitsspeicher('{ das ist kein JSON');
  assert.equal(liesOffenePruefung(speicher, katalog()), null);
});

test('ein unbrauchbar geformter Stand wird verworfen', () => {
  const speicher = arbeitsspeicher(
    JSON.stringify({ formatVersion: PRUEFUNGSSTAND_FORMAT_VERSION, stand: { frageIds: 'keine Liste' } }),
  );
  assert.equal(liesOffenePruefung(speicher, katalog()), null);
});

test('ein Stand mit einer im Katalog nicht mehr vorhandenen Frage wird verworfen', () => {
  const speicher = arbeitsspeicher();
  schreibeOffenePruefung(speicher, stand());
  const veraenderterKatalog = katalog();
  veraenderterKatalog.fragen = veraenderterKatalog.fragen.filter((frage) => frage.id !== 'basiswissen-2');
  assert.equal(liesOffenePruefung(speicher, veraenderterKatalog), null);
});

test('ein Speicher, der nicht schreiben kann, laesst den Aufrufer weiterarbeiten', () => {
  const speicher = {
    lies: () => null,
    schreibe: () => {
      throw new Error('Speicher voll');
    },
  };
  assert.doesNotThrow(() => schreibeOffenePruefung(speicher, stand()));
  assert.doesNotThrow(() => verwirfOffenePruefung(speicher));
});
