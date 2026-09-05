/** @import { Katalog, Frage, Lektion, Wissensstufe } from './typen.js' */

/** Pfad der Katalogdatei, relativ zu diesem Modul und damit unabhaengig davon,
 * unter welchem Projektpfad die Anwendung ausgeliefert wird. */
const KATALOG_URL = new URL('../data/fragen.json', import.meta.url);

/**
 * Laedt die Katalogdatei.
 * @param {typeof fetch} [holen] Einspringpunkt fuer Tests.
 * @returns {Promise<Katalog>}
 */
export async function ladeKatalog(holen = fetch) {
  const antwort = await holen(KATALOG_URL);
  if (!antwort.ok) {
    throw new Error(`Katalog nicht ladbar (HTTP ${antwort.status})`);
  }
  return /** @type {Katalog} */ (await antwort.json());
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
