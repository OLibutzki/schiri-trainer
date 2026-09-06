/** @import { Katalog, Frage } from './typen.js' */
/** @import { Bewertung } from './antwort.js' */
// Der Pruefungsmodus zieht Fragen proportional zur Groesse der Lektionen und
// ohne die Gewichtung des Uebungsmodus (ADR-0002): Er soll das Wissen in der
// Breite abfragen, nicht die eigenen Schwaechen spiegeln. Der Stand ist ein
// reiner Datensatz statt einer gekapselten Engine, damit er sich unveraendert
// speichern und wiederherstellen laesst (Issue #8).
import { bewerteAntwort } from './antwort.js';
import { mische } from './mischen.js';

/**
 * @typedef {object} Pruefungsstand
 * @property {string[]} frageIds Die gezogenen Fragen in Pruefungsreihenfolge.
 * @property {(string[] | null)[]} antworten Parallel zu `frageIds`; `null` heisst noch unbeantwortet.
 * @property {string | null} wissensstufe Die Eingrenzung der Prüfung, falls gewählt.
 */

/**
 * Verteilt `ziel` Elemente auf die uebergebenen Groessen, proportional und in
 * Summe exakt `ziel`. Restwerte gehen an die Lektionen mit dem groessten
 * Bruchteil (Hare-Niemeyer-Verfahren), damit keine Rundung Fragen verschenkt
 * oder erfindet.
 * @param {number} ziel
 * @param {number[]} groessen
 * @returns {number[]}
 */
function verteileProportional(ziel, groessen) {
  const gesamt = groessen.reduce((a, b) => a + b, 0);
  if (gesamt === 0) return groessen.map(() => 0);

  const anteile = groessen.map((groesse) => (ziel * groesse) / gesamt);
  const quoten = anteile.map(Math.floor);
  let rest = ziel - quoten.reduce((a, b) => a + b, 0);

  const reihenfolge = anteile
    .map((anteil, index) => ({ index, bruchteil: anteil - Math.floor(anteil) }))
    .sort((a, b) => b.bruchteil - a.bruchteil);

  for (const { index } of reihenfolge) {
    if (rest <= 0) break;
    if (quoten[index] >= groessen[index]) continue;
    quoten[index] += 1;
    rest -= 1;
  }
  return quoten;
}

/**
 * Stellt eine Prüfung zusammen: `fragenzahl` Fragen, proportional über die
 * Lektionen der (optionalen) Wissensstufe verteilt, ohne Gewichtung. Reicht
 * die Kandidatenmenge nicht aus, liefert die Prüfung eben deren gesamten
 * Bestand statt eine Frage doppelt zu stellen.
 * @param {object} bausteine
 * @param {Katalog} bausteine.katalog
 * @param {number} bausteine.fragenzahl
 * @param {string | null} [bausteine.wissensstufe]
 * @param {() => number} [bausteine.zufall]
 * @returns {Pruefungsstand}
 */
export function erzeugePruefung({ katalog, fragenzahl, wissensstufe = null, zufall = Math.random }) {
  const kandidaten =
    wissensstufe === null ? katalog.fragen : katalog.fragen.filter((frage) => frage.wissensstufe === wissensstufe);

  const lektionen = katalog.metadaten.lektionen
    .filter((lektion) => wissensstufe === null || lektion.wissensstufe === wissensstufe)
    .map((lektion) => ({
      id: lektion.id,
      fragen: kandidaten.filter((frage) => frage.lektion === lektion.id),
    }))
    .filter((lektion) => lektion.fragen.length > 0);

  const ziel = Math.min(fragenzahl, kandidaten.length);
  const quoten = verteileProportional(
    ziel,
    lektionen.map((lektion) => lektion.fragen.length),
  );

  const ausgewaehlt = lektionen.flatMap((lektion, index) => mische(lektion.fragen, zufall).slice(0, quoten[index]));
  const gemischt = mische(ausgewaehlt, zufall);

  return {
    frageIds: gemischt.map((frage) => frage.id),
    antworten: gemischt.map(() => null),
    wissensstufe,
  };
}

/**
 * Der Index der ersten noch unbeantworteten Frage, oder -1, wenn die Prüfung
 * vollständig beantwortet ist.
 * @param {Pruefungsstand} stand
 * @returns {number}
 */
export function offenerIndex(stand) {
  return stand.antworten.findIndex((antwort) => antwort === null);
}

/**
 * @param {Pruefungsstand} stand
 * @returns {boolean}
 */
export function istAbgeschlossen(stand) {
  return offenerIndex(stand) === -1;
}

/**
 * Traegt eine Antwort auf die aktuell offene Frage ein. Eine bereits
 * vollständig beantwortete Prüfung bleibt unverändert.
 * @param {Pruefungsstand} stand
 * @param {string[]} gewaehlteBuchstaben
 * @returns {Pruefungsstand}
 */
export function beantworte(stand, gewaehlteBuchstaben) {
  const index = offenerIndex(stand);
  if (index === -1) return stand;
  const antworten = [...stand.antworten];
  antworten[index] = [...gewaehlteBuchstaben];
  return { ...stand, antworten };
}

/**
 * @typedef {object} PruefungsErgebnis
 * @property {number} punktzahl Zahl der richtig beantworteten Fragen.
 * @property {number} gesamt
 * @property {{ frage: Frage, gewaehlt: string[], bewertung: Bewertung }[]} falsche
 */

/**
 * Wertet eine abgeschlossene Prüfung aus. Es wird bewusst kein
 * Bestanden-Urteil gefällt (siehe Issue #7).
 * @param {Katalog} katalog
 * @param {Pruefungsstand} stand
 * @returns {PruefungsErgebnis}
 */
export function ergebnis(katalog, stand) {
  const bewertungen = stand.frageIds.map((frageId, index) => {
    const frage = /** @type {Frage} */ (katalog.fragen.find((kandidat) => kandidat.id === frageId));
    const gewaehlt = stand.antworten[index] ?? [];
    return { frage, gewaehlt, bewertung: bewerteAntwort(frage, gewaehlt) };
  });
  return {
    punktzahl: bewertungen.filter((eintrag) => eintrag.bewertung.richtig).length,
    gesamt: bewertungen.length,
    falsche: bewertungen.filter((eintrag) => !eintrag.bewertung.richtig),
  };
}
