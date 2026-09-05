// Typen des Katalogformats, als JSDoc notiert und in der Pruefstrecke mit
// `tsc --noEmit` geprueft (ADR-0003). Zur Laufzeit traegt diese Datei nichts bei.

/**
 * @typedef {object} Option
 * @property {string} buchstabe Original-Buchstabe aus dem Quellkatalog, z. B. `"a"`.
 * @property {string} text
 * @property {boolean} korrekt
 */

/**
 * @typedef {object} Frage
 * @property {string} id Ueber alle Wissensstufen hinweg eindeutig, z. B. `"basiswissen-12"`.
 * @property {string} wissensstufe Id einer Wissensstufe des Metadatenblocks.
 * @property {string} lektion Id einer Lektion des Metadatenblocks.
 * @property {number} nummer Nummer innerhalb der Wissensstufe.
 * @property {string} text
 * @property {Option[]} optionen Zwei bis sechs; mehrere korrekte sind zulaessig.
 */

/**
 * @typedef {object} Wissensstufe
 * @property {string} id
 * @property {string} name Anzeigename.
 * @property {number} reihenfolge Fachliche Reihenfolge, nicht alphabetisch.
 */

/**
 * @typedef {object} Lektion
 * @property {string} id
 * @property {string} wissensstufe
 * @property {number} nummer
 * @property {string} titel
 */

/**
 * @typedef {object} Metadaten
 * @property {string} titel
 * @property {string} herkunft
 * @property {string} regelstand ISO-Datum.
 * @property {string} regelnGueltigAb ISO-Datum.
 * @property {Wissensstufe[]} wissensstufen
 * @property {Lektion[]} lektionen
 */

/**
 * @typedef {object} Katalog
 * @property {number} formatVersion
 * @property {Metadaten} metadaten
 * @property {Frage[]} fragen
 */

export {};
