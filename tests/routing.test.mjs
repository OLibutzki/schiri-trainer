import test from 'node:test';
import assert from 'node:assert/strict';
import { adresseFuer, ansichtAus, starteRouting, START_ANSICHT } from '../app/js/routing.js';

test('jede Ansicht hat eine Adresse, die wieder zu ihr fuehrt', () => {
  for (const ansicht of /** @type {const} */ (['ueben', 'lernfortschritt', 'pruefung'])) {
    assert.equal(ansichtAus(adresseFuer(ansicht)), ansicht);
  }
});

test('eine leere Adresse fuehrt zur Einstiegsansicht', () => {
  assert.equal(ansichtAus(''), START_ANSICHT);
  assert.equal(ansichtAus('#'), START_ANSICHT);
  assert.equal(ansichtAus('#/'), START_ANSICHT);
});

test('eine unbekannte Adresse fuehrt zur Einstiegsansicht statt ins Leere', () => {
  assert.equal(ansichtAus('#/gibtesnicht'), START_ANSICHT);
});

/**
 * Ein minimales Test-Double von `Window`: haelt nur, was `starteRouting`
 * tatsaechlich anfasst.
 * @param {string} hash
 */
function fensterMitHash(hash) {
  /** @type {string[]} */
  const ersetzteAdressen = [];
  const fenster = {
    location: { hash },
    addEventListener() {},
    history: {
      replaceState(/** @type {unknown} */ _daten, /** @type {string} */ _titel, /** @type {string} */ adresse) {
        ersetzteAdressen.push(adresse);
        fenster.location.hash = adresse;
      },
    },
  };
  return { fenster, ersetzteAdressen };
}

test('starteRouting traegt eine Adresse ohne passendes Fragment einmalig auf #/ueben nach, ohne Verlaufseintrag', () => {
  const { fenster, ersetzteAdressen } = fensterMitHash('');
  /** @type {string[]} */
  const gezeigt = [];

  starteRouting(fenster, (ansicht) => gezeigt.push(ansicht));

  assert.deepEqual(ersetzteAdressen, ['#/ueben']);
  assert.deepEqual(gezeigt, ['ueben']);
});

test('starteRouting laesst eine passende Adresse unangetastet', () => {
  const { fenster, ersetzteAdressen } = fensterMitHash('#/pruefung');
  /** @type {string[]} */
  const gezeigt = [];

  starteRouting(fenster, (ansicht) => gezeigt.push(ansicht));

  assert.deepEqual(ersetzteAdressen, []);
  assert.deepEqual(gezeigt, ['pruefung']);
});
