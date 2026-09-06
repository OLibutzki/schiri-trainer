import test from 'node:test';
import assert from 'node:assert/strict';
import { adresseFuer, ansichtAus, START_ANSICHT } from '../app/js/routing.js';

test('jede Ansicht hat eine Adresse, die wieder zu ihr fuehrt', () => {
  for (const ansicht of /** @type {const} */ (['start', 'ueben', 'lernfortschritt', 'pruefung'])) {
    assert.equal(ansichtAus(adresseFuer(ansicht)), ansicht);
  }
});

test('eine leere Adresse fuehrt zur Startansicht', () => {
  assert.equal(ansichtAus(''), START_ANSICHT);
  assert.equal(ansichtAus('#'), START_ANSICHT);
  assert.equal(ansichtAus('#/'), START_ANSICHT);
});

test('eine unbekannte Adresse fuehrt zur Startansicht statt ins Leere', () => {
  assert.equal(ansichtAus('#/gibtesnicht'), START_ANSICHT);
});
