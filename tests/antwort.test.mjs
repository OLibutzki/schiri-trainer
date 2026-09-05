import test from 'node:test';
import assert from 'node:assert/strict';
import { bewerteAntwort } from '../app/js/antwort.js';

/** @param {string[]} korrekteBuchstaben */
function frageMit(korrekteBuchstaben) {
  return {
    id: 'basiswissen-1',
    wissensstufe: 'basiswissen',
    lektion: 'basiswissen-1',
    nummer: 1,
    text: 'Eine Frage?',
    optionen: ['a', 'b', 'c'].map((buchstabe) => ({
      buchstabe,
      text: `Option ${buchstabe}`,
      korrekt: korrekteBuchstaben.includes(buchstabe),
    })),
  };
}

test('die exakte Menge der korrekten Optionen gilt als richtig', () => {
  assert.equal(bewerteAntwort(frageMit(['b']), ['b']).richtig, true);
  assert.equal(bewerteAntwort(frageMit(['a', 'c']), ['c', 'a']).richtig, true);
});

test('eine Teilmenge der korrekten Optionen gilt als falsch', () => {
  const bewertung = bewerteAntwort(frageMit(['a', 'c']), ['a']);
  assert.equal(bewertung.richtig, false);
  assert.deepEqual(bewertung.uebersehen, ['c']);
});

test('alle korrekten Optionen plus eine falsche gelten als falsch', () => {
  const bewertung = bewerteAntwort(frageMit(['a']), ['a', 'b']);
  assert.equal(bewertung.richtig, false);
  assert.deepEqual(bewertung.zuUnrecht, ['b']);
});

test('eine leere Antwort gilt als falsch', () => {
  assert.equal(bewerteAntwort(frageMit(['a']), []).richtig, false);
});

test('die Rueckmeldung benennt korrekte, zu Unrecht gewaehlte und uebersehene Optionen', () => {
  const bewertung = bewerteAntwort(frageMit(['a', 'b']), ['a', 'c']);
  assert.deepEqual(bewertung.korrekt, ['a', 'b']);
  assert.deepEqual(bewertung.zuUnrecht, ['c']);
  assert.deepEqual(bewertung.uebersehen, ['b']);
});
