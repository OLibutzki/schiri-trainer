import test from 'node:test';
import assert from 'node:assert/strict';
import { erzeugePruefung, offenerIndex, istAbgeschlossen, beantworte, ergebnis } from '../app/js/pruefung.js';

/** Eine feste Zufallsfolge, damit Ziehungen reproduzierbar sind. */
function festerZufall(saat = 1) {
  let zustand = saat;
  return () => {
    zustand = (zustand * 1103515245 + 12345) % 2147483648;
    return zustand / 2147483648;
  };
}

/**
 * Ein Katalog mit zwei Wissensstufen und mehreren, unterschiedlich grossen
 * Lektionen, um die proportionale Verteilung pruefen zu koennen.
 */
function katalog() {
  /** @param {string} lektion @param {number} anzahl @param {string} praefix */
  function fragenFuer(lektion, wissensstufe, anzahl, praefix) {
    return Array.from({ length: anzahl }, (_, i) => ({
      id: `${praefix}-${i + 1}`,
      wissensstufe,
      lektion,
      nummer: i + 1,
      text: `${praefix} Frage ${i + 1}?`,
      optionen: [
        { buchstabe: 'a', text: 'richtig', korrekt: true },
        { buchstabe: 'b', text: 'falsch', korrekt: false },
      ],
    }));
  }

  return {
    formatVersion: 1,
    metadaten: {
      titel: 'Testkatalog',
      herkunft: 'Test',
      regelstand: '2025-06-16',
      regelnGueltigAb: '2025-07-01',
      wissensstufen: [
        { id: 'basiswissen', name: 'Basiswissen', reihenfolge: 1 },
        { id: 'aufbauwissen', name: 'Aufbauwissen', reihenfolge: 2 },
      ],
      lektionen: [
        { id: 'b1', wissensstufe: 'basiswissen', nummer: 1, titel: 'Groß' },
        { id: 'b2', wissensstufe: 'basiswissen', nummer: 2, titel: 'Klein' },
        { id: 'a1', wissensstufe: 'aufbauwissen', nummer: 1, titel: 'Andere Stufe' },
      ],
    },
    fragen: [
      ...fragenFuer('b1', 'basiswissen', 8, 'b1'),
      ...fragenFuer('b2', 'basiswissen', 2, 'b2'),
      ...fragenFuer('a1', 'aufbauwissen', 5, 'a1'),
    ],
  };
}

test('die gezogenen Fragen verteilen sich proportional zur Groesse der Lektionen', () => {
  const stand = erzeugePruefung({ katalog: katalog(), fragenzahl: 10, wissensstufe: 'basiswissen', zufall: festerZufall() });
  const jeLektion = { b1: 0, b2: 0 };
  for (const id of stand.frageIds) jeLektion[id.startsWith('b1') ? 'b1' : 'b2'] += 1;
  // b1 hat 8 von 10 Fragen der Wissensstufe, b2 die restlichen 2 -> 80 % / 20 %.
  assert.deepEqual(jeLektion, { b1: 8, b2: 2 });
});

test('eine Eingrenzung auf eine Wissensstufe schliesst andere Wissensstufen aus', () => {
  const stand = erzeugePruefung({ katalog: katalog(), fragenzahl: 10, wissensstufe: 'basiswissen', zufall: festerZufall() });
  assert.ok(stand.frageIds.every((id) => id.startsWith('b1') || id.startsWith('b2')));
});

test('ohne Eingrenzung stammen die Fragen aus allen Wissensstufen', () => {
  const stand = erzeugePruefung({ katalog: katalog(), fragenzahl: 15, zufall: festerZufall() });
  assert.equal(stand.frageIds.length, 15);
  assert.ok(stand.frageIds.some((id) => id.startsWith('a1')));
});

test('mehr angeforderte Fragen als die Kandidatenmenge hergibt fuehren zur gesamten Menge statt zu Wiederholungen', () => {
  const stand = erzeugePruefung({ katalog: katalog(), fragenzahl: 50, wissensstufe: 'basiswissen', zufall: festerZufall() });
  assert.equal(stand.frageIds.length, 10);
  assert.equal(new Set(stand.frageIds).size, 10);
});

test('eine neue Pruefung ist zu Beginn vollstaendig unbeantwortet', () => {
  const stand = erzeugePruefung({ katalog: katalog(), fragenzahl: 5, zufall: festerZufall() });
  assert.equal(offenerIndex(stand), 0);
  assert.equal(istAbgeschlossen(stand), false);
});

test('beantworte traegt die Antwort an der offenen Stelle ein und schaltet weiter', () => {
  let stand = erzeugePruefung({ katalog: katalog(), fragenzahl: 3, zufall: festerZufall() });
  stand = beantworte(stand, ['a']);
  assert.deepEqual(stand.antworten[0], ['a']);
  assert.equal(offenerIndex(stand), 1);
});

test('nach der letzten Antwort gilt die Pruefung als abgeschlossen', () => {
  let stand = erzeugePruefung({ katalog: katalog(), fragenzahl: 2, zufall: festerZufall() });
  stand = beantworte(stand, ['a']);
  stand = beantworte(stand, ['b']);
  assert.equal(istAbgeschlossen(stand), true);
  assert.equal(offenerIndex(stand), -1);
});

test('eine abgeschlossene Pruefung nimmt keine weitere Antwort mehr an', () => {
  let stand = erzeugePruefung({ katalog: katalog(), fragenzahl: 1, zufall: festerZufall() });
  stand = beantworte(stand, ['a']);
  const nochmal = beantworte(stand, ['b']);
  assert.deepEqual(nochmal, stand);
});

test('das Ergebnis liefert Punktzahl und alle falsch beantworteten Fragen', () => {
  const k = katalog();
  let stand = erzeugePruefung({ katalog: k, fragenzahl: 3, wissensstufe: 'basiswissen', zufall: festerZufall() });
  stand = beantworte(stand, ['a']);
  stand = beantworte(stand, ['b']);
  stand = beantworte(stand, ['a']);
  const auswertung = ergebnis(k, stand);
  assert.equal(auswertung.gesamt, 3);
  assert.equal(auswertung.punktzahl, auswertung.gesamt - auswertung.falsche.length);
  for (const eintrag of auswertung.falsche) {
    assert.equal(eintrag.bewertung.richtig, false);
  }
});

test('eine unbeantwortet gebliebene Frage gilt als falsch, nicht als Absturz', () => {
  const k = katalog();
  const stand = erzeugePruefung({ katalog: k, fragenzahl: 2, zufall: festerZufall() });
  const auswertung = ergebnis(k, stand);
  assert.equal(auswertung.falsche.length, 2);
});
