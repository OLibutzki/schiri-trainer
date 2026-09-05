/** @import { Katalog, Frage, Lektion, Wissensstufe } from './typen.js' */

/** Pfad der Katalogdatei, relativ zu diesem Modul und damit unabhaengig davon,
 * unter welchem Projektpfad die Anwendung ausgeliefert wird. */
const KATALOG_URL = new URL('../data/fragen.json', import.meta.url);

/**
 * Laedt die Katalogdatei.
 * @returns {Promise<Katalog>}
 */
export async function ladeKatalog() {
  // Nicht `antwort` benannt: Im Glossar ist die Antwort die vom Anwender
  // gewaehlte Menge von Optionen (CONTEXT.md).
  const httpAntwort = await fetch(KATALOG_URL);
  if (!httpAntwort.ok) {
    throw new Error(`Katalog nicht ladbar (HTTP ${httpAntwort.status})`);
  }
  return /** @type {Katalog} */ (await httpAntwort.json());
}

/**
 * @param {Katalog} katalog
 * @param {string} id
 * @returns {Lektion | undefined}
 */
export function findeLektion(katalog, id) {
  return katalog.metadaten.lektionen.find((lektion) => lektion.id === id);
}

/**
 * @param {Katalog} katalog
 * @param {string} id
 * @returns {Wissensstufe | undefined}
 */
export function findeWissensstufe(katalog, id) {
  return katalog.metadaten.wissensstufen.find((stufe) => stufe.id === id);
}

/**
 * Bezeichnung einer Frage fuer die Anzeige, z. B. „Basiswissen · Lektion 3 · Frage 18".
 * @param {Katalog} katalog
 * @param {Frage} frage
 * @returns {string}
 */
export function bezeichneFrage(katalog, frage) {
  const stufe = findeWissensstufe(katalog, frage.wissensstufe);
  const lektion = findeLektion(katalog, frage.lektion);
  const teile = [stufe ? stufe.name : frage.wissensstufe];
  if (lektion) teile.push(`Lektion ${lektion.nummer}: ${lektion.titel}`);
  teile.push(`Frage ${frage.nummer}`);
  return teile.join(' · ');
}
