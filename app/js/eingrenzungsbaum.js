/** @import { Katalog, Lektion, Wissensstufe } from './typen.js' */
/** @import { Eingrenzung } from './lernengine.js' */

/**
 * Die reine Logik hinter der Lektionen-Auswahl der Eingrenzung, losgeloest
 * vom DOM: Baumaufbau, Tri-State der Stufen-Kopfzeile und die Verdichtung der
 * angehakten Lektionen zurueck ins Eingrenzungsformat. `app.js` haelt nur den
 * DOM-Zustand (welche Kaestchen sind angehakt) und ruft diese Funktionen auf.
 *
 * @typedef {object} StufeMitLektionen
 * @property {string} id
 * @property {string} name
 * @property {{ id: string, titel: string }[]} lektionen
 */

/**
 * @param {Katalog} katalog
 * @returns {StufeMitLektionen[]} Nach fachlicher Reihenfolge sortiert.
 */
export function baueStufenMitLektionen(katalog) {
  return [...katalog.metadaten.wissensstufen]
    .sort((a, b) => a.reihenfolge - b.reihenfolge)
    .map((/** @type {Wissensstufe} */ stufe) => ({
      id: stufe.id,
      name: stufe.name,
      lektionen: katalog.metadaten.lektionen
        .filter((/** @type {Lektion} */ lektion) => lektion.wissensstufe === stufe.id)
        .map((lektion) => ({ id: lektion.id, titel: `Lektion ${lektion.nummer}: ${lektion.titel}` })),
    }));
}

/**
 * Alle Lektion-Ids des Katalogs. Der Standardzustand des Baums: jedes
 * Kaestchen startet angehakt, sodass "keine Einschraenkung" sichtbar als
 * "alles angehakt" erscheint statt sich aus einer leeren Auswahl abzuleiten.
 * @param {Katalog} katalog
 * @returns {Set<string>}
 */
export function alleLektionIds(katalog) {
  return new Set(katalog.metadaten.lektionen.map((lektion) => lektion.id));
}

/**
 * Der Tri-State-Zustand der Kopfzeile einer Stufe, abgeleitet aus den
 * angehakten Lektionen darunter.
 * @param {{ id: string }[]} lektionenDerStufe
 * @param {ReadonlySet<string>} gewaehlteLektionIds
 * @returns {'checked' | 'unchecked' | 'indeterminate'}
 */
export function stufenZustand(lektionenDerStufe, gewaehlteLektionIds) {
  if (lektionenDerStufe.length === 0) return 'unchecked';
  const gewaehlt = lektionenDerStufe.filter((lektion) => gewaehlteLektionIds.has(lektion.id)).length;
  if (gewaehlt === 0) return 'unchecked';
  if (gewaehlt === lektionenDerStufe.length) return 'checked';
  return 'indeterminate';
}

/**
 * Verdichtet die angehakten Lektionen zurueck ins Eingrenzungsformat: Ist eine
 * Stufe vollstaendig angehakt, wandert ihre Id in `wissensstufen` statt all
 * ihrer Lektionen einzeln in `lektionen` — sowohl kompakter als auch robust
 * gegenueber spaeter hinzukommenden Lektionen der Stufe. Ist wirklich jede
 * Lektion des Katalogs angehakt (der Ausgangszustand des Baums), gilt das
 * unmittelbar als keine Einschraenkung statt als eine Liste aller Stufen.
 * @param {Katalog} katalog
 * @param {ReadonlySet<string>} gewaehlteLektionIds
 * @returns {Pick<Eingrenzung, 'wissensstufen' | 'lektionen'>}
 */
export function verdichteAuswahl(katalog, gewaehlteLektionIds) {
  const alle = alleLektionIds(katalog);
  if (alle.size > 0 && [...alle].every((id) => gewaehlteLektionIds.has(id))) {
    return { wissensstufen: [], lektionen: [] };
  }

  /** @type {string[]} */
  const wissensstufen = [];
  /** @type {string[]} */
  const lektionen = [];

  for (const stufe of baueStufenMitLektionen(katalog)) {
    switch (stufenZustand(stufe.lektionen, gewaehlteLektionIds)) {
      case 'checked':
        wissensstufen.push(stufe.id);
        break;
      case 'indeterminate':
        for (const lektion of stufe.lektionen) {
          if (gewaehlteLektionIds.has(lektion.id)) lektionen.push(lektion.id);
        }
        break;
      default:
        break;
    }
  }

  return { wissensstufen, lektionen };
}
