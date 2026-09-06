/** @import { Speicher } from './lernstand.js' */
/** @import { Pruefungsstand } from './pruefung.js' */
/** @import { Katalog } from './typen.js' */
// Persistenz einer offenen Pruefung, getrennt vom Lernfortschritt (Issue #8):
// Ein eigener Speicherschluessel und eine eigene Formatversion, damit ein
// Wechsel am einen Format den anderen nicht beruehrt.

/** Erhoehen, sobald sich die Bedeutung der gespeicherten Felder aendert. */
export const PRUEFUNGSSTAND_FORMAT_VERSION = 1;

/** Schluessel im Browser-Speicher. */
export const PRUEFUNGSSTAND_SCHLUESSEL = 'schiri-trainer.pruefungsstand';

/**
 * @param {unknown} wert
 * @param {Katalog} katalog
 * @returns {wert is Pruefungsstand}
 */
function istGueltigerStand(wert, katalog) {
  if (typeof wert !== 'object' || wert === null) return false;
  const roh = /** @type {Record<string, unknown>} */ (wert);

  if (!Array.isArray(roh.frageIds) || !roh.frageIds.every((id) => typeof id === 'string')) return false;
  if (!Array.isArray(roh.antworten) || roh.antworten.length !== roh.frageIds.length) return false;
  if (
    !roh.antworten.every(
      (antwort) => antwort === null || (Array.isArray(antwort) && antwort.every((b) => typeof b === 'string')),
    )
  ) {
    return false;
  }
  if (roh.wissensstufe !== null && typeof roh.wissensstufe !== 'string') return false;

  // Der Katalog kann sich zwischen zwei Sitzungen geaendert haben; ein Stand,
  // der auf eine inzwischen verschwundene Frage verweist, gilt als unbrauchbar
  // statt spaeter beim Nachschlagen abzustuerzen.
  const bekannt = new Set(katalog.fragen.map((frage) => frage.id));
  return roh.frageIds.every((id) => bekannt.has(id));
}

/**
 * Liest eine offene Pruefung. Ein Bestand, der sich nicht zweifelsfrei deuten
 * laesst — unlesbar, mit unbekannter Formatversion, unbrauchbarer Form oder
 * mit Fragen, die es im aktuellen Katalog nicht mehr gibt —, gilt als „keine
 * offene Prüfung“ statt teilweise fehlgedeutet zu werden.
 * @param {Speicher} speicher
 * @param {Katalog} katalog
 * @returns {Pruefungsstand | null}
 */
export function liesOffenePruefung(speicher, katalog) {
  /** @type {string | null} */
  let inhalt = null;
  try {
    inhalt = speicher.lies();
  } catch (fehler) {
    console.warn('Der Stand einer offenen Prüfung konnte nicht gelesen werden.', fehler);
    return null;
  }
  if (inhalt === null) return null;

  /** @type {unknown} */
  let gelesen;
  try {
    gelesen = JSON.parse(inhalt);
  } catch {
    return null;
  }
  if (typeof gelesen !== 'object' || gelesen === null) return null;

  const bestand = /** @type {Record<string, unknown>} */ (gelesen);
  if (bestand.formatVersion !== PRUEFUNGSSTAND_FORMAT_VERSION) return null;
  if (bestand.stand === null) return null;
  return istGueltigerStand(bestand.stand, katalog) ? bestand.stand : null;
}

/**
 * Schreibt eine Pruefung fest — unabhaengig davon, ob sie noch laeuft oder
 * bereits abgeschlossen ist: Auch ein Ergebnis soll ein Neuladen ueberleben
 * (Issue #30). Ein scheiternder Schreibvorgang — voller oder gesperrter
 * Speicher — darf die Prüfung nicht abbrechen.
 * @param {Speicher} speicher
 * @param {Pruefungsstand} stand
 */
export function schreibeOffenePruefung(speicher, stand) {
  try {
    speicher.schreibe(JSON.stringify({ formatVersion: PRUEFUNGSSTAND_FORMAT_VERSION, stand }));
  } catch (fehler) {
    console.warn('Der Stand einer offenen Prüfung konnte nicht gespeichert werden.', fehler);
  }
}

/**
 * Verwirft eine gespeicherte Pruefung — laufend oder bereits abgeschlossen —,
 * weil sie ausdruecklich abgebrochen wurde oder einer neuen weicht.
 * @param {Speicher} speicher
 */
export function verwirfOffenePruefung(speicher) {
  try {
    speicher.schreibe(JSON.stringify({ formatVersion: PRUEFUNGSSTAND_FORMAT_VERSION, stand: null }));
  } catch (fehler) {
    console.warn('Der Stand einer offenen Prüfung konnte nicht verworfen werden.', fehler);
  }
}
