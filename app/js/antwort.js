/** @import { Frage } from './typen.js' */

/**
 * @typedef {object} Bewertung
 * @property {boolean} richtig Nur bei exakter Uebereinstimmung mit der Menge der korrekten Optionen.
 * @property {string[]} korrekt Buchstaben aller korrekten Optionen.
 * @property {string[]} zuUnrecht Gewaehlte Buchstaben, die nicht korrekt sind.
 * @property {string[]} uebersehen Korrekte Buchstaben, die nicht gewaehlt wurden.
 */

/**
 * Bewertet eine Antwort. Teilpunkte gibt es nicht: Eine Antwort ist nur dann
 * richtig, wenn sie genau der Menge der korrekten Optionen entspricht.
 * @param {Frage} frage
 * @param {Iterable<string>} gewaehlteBuchstaben
 * @returns {Bewertung}
 */
export function bewerteAntwort(frage, gewaehlteBuchstaben) {
  const gewaehlt = new Set(gewaehlteBuchstaben);
  const korrekt = frage.optionen.filter((option) => option.korrekt).map((option) => option.buchstabe);
  const korrektMenge = new Set(korrekt);

  const zuUnrecht = [...gewaehlt].filter((buchstabe) => !korrektMenge.has(buchstabe)).sort();
  const uebersehen = korrekt.filter((buchstabe) => !gewaehlt.has(buchstabe));

  return {
    richtig: zuUnrecht.length === 0 && uebersehen.length === 0,
    korrekt,
    zuUnrecht,
    uebersehen,
  };
}

/**
 * Ob eine Antwort mit der aktuellen Auswahl abgegeben werden darf: nur wenn
 * mindestens eine Option angekreuzt ist. Eine leere Auswahl gaebe es sonst
 * als falsch beantwortet durch (Issue #27).
 * @param {Iterable<string>} gewaehlteBuchstaben
 * @returns {boolean}
 */
export function istAbgabeMoeglich(gewaehlteBuchstaben) {
  return [...gewaehlteBuchstaben].length > 0;
}
