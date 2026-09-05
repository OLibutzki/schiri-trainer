import test from 'node:test';
import assert from 'node:assert/strict';
import { mische } from '../app/js/mischen.js';

/** Eine festgelegte Zufallsquelle, damit die Mischung im Test beobachtbar ist. */
function zufallsquelleMit(werte) {
  let i = 0;
  return () => werte[i++ % werte.length];
}

test('die Mischung enthaelt genau dieselben Elemente', () => {
  const eingabe = ['a', 'b', 'c', 'd', 'e', 'f'];
  const gemischt = mische(eingabe, zufallsquelleMit([0.7, 0.1, 0.9, 0.3, 0.5]));
  assert.deepEqual([...gemischt].sort(), [...eingabe].sort());
});

test('die Eingabe bleibt unveraendert', () => {
  const eingabe = ['a', 'b', 'c'];
  mische(eingabe, zufallsquelleMit([0.9, 0.1]));
  assert.deepEqual(eingabe, ['a', 'b', 'c']);
});

test('die Reihenfolge haengt an der hineingereichten Zufallsquelle', () => {
  const eingabe = ['a', 'b', 'c', 'd'];
  const zufallswerte = [0.42, 0.17, 0.83];
  assert.deepEqual(
    mische(eingabe, zufallsquelleMit(zufallswerte)),
    mische(eingabe, zufallsquelleMit(zufallswerte)),
  );
  assert.notDeepEqual(
    mische(eingabe, zufallsquelleMit([0, 0, 0])),
    mische(eingabe, zufallsquelleMit([0.99, 0.99, 0.99])),
  );
});
