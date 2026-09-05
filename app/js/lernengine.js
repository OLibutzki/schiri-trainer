/** @import { Katalog, Frage, Lektion, Wissensstufe } from './typen.js' */
/** @import { Speicher, Lerneintrag, Lerneintraege } from './lernstand.js' */
/** @import { Bewertung } from './antwort.js' */
import { bewerteAntwort } from './antwort.js';
import { leseLernstand, schreibeLernstand } from './lernstand.js';

/**
 * Die Stellschrauben der Fragenauswahl, bewusst an einer Stelle gebuendelt:
 * Sie sollen nach Praxiserfahrung nachjustiert werden koennen, ohne die Logik
 * anzufassen (ADR-0002).
 *
 * Die Werte sind so gewaehlt, dass die Rangfolge unabhaengig vom Zeitfaktor
 * gilt: nie gestellt vor nicht gemeistert vor gemeistert. Deshalb wirkt der
 * Zeitfaktor ausschliesslich auf gemeisterte Fragen, und seine Obergrenze
 * haelt deren Gewicht unter dem einer nicht gemeisterten Frage.
 */
export const LERN_KONSTANTEN = Object.freeze({
  /** So oft muss eine Frage ununterbrochen richtig beantwortet sein. */
  MEISTER_SCHWELLE: 2,
  GEWICHT_NIE_GESTELLT: 100,
  GEWICHT_NICHT_GEMEISTERT: 40,
  GEWICHT_GEMEISTERT: 4,
  /** Zuwachs des Zeitfaktors je Tag seit der letzten Antwort. */
  ZEITFAKTOR_PRO_TAG: 0.5,
  /** Obergrenze des Zeitfaktors; muss unter GEWICHT_NICHT_GEMEISTERT / GEWICHT_GEMEISTERT liegen. */
  ZEITFAKTOR_OBERGRENZE: 6,
});

const MILLISEKUNDEN_JE_TAG = 24 * 60 * 60 * 1000;

/** @type {Lerneintrag} */
const UNBERUEHRT = Object.freeze({ folge: 0, falsch: 0, zuletzt: null });

/**
 * @typedef {object} Lernfortschritt
 * @property {number} gesamt
 * @property {number} gemeistert
 * @property {number} anteil Zwischen 0 und 1; bei leerem Bestand 0.
 */

/**
 * @typedef {Lernfortschritt & { id: string, name: string }} LernfortschrittTeil
 */

/**
 * @param {number} gemeistert
 * @param {number} gesamt
 * @returns {Lernfortschritt}
 */
function lernfortschrittAus(gemeistert, gesamt) {
  return { gesamt, gemeistert, anteil: gesamt === 0 ? 0 : gemeistert / gesamt };
}

/**
 * Die Lern-Engine: Sie besitzt Katalog und Lernfortschritt und ist die einzige
 * Stelle, an der die fachliche Logik des Uebens liegt. Uhr, Zufallsquelle und
 * Speicher werden hineingereicht, damit sie ohne Browser pruefbar ist.
 * @param {object} bausteine
 * @param {Katalog} bausteine.katalog
 * @param {Speicher} bausteine.speicher
 * @param {() => number} [bausteine.uhr] Liefert die aktuelle Zeit in Millisekunden.
 * @param {() => number} [bausteine.zufall] Liefert eine Zahl in [0, 1).
 */
export function erzeugeLernEngine({ katalog, speicher, uhr = Date.now, zufall = Math.random }) {
  const gelesen = leseLernstand(speicher);
  /** @type {Lerneintraege} */
  let eintraege = gelesen.eintraege;
  /** @type {string | null} */
  let zuletztGestellt = null;

  /**
   * @param {string} frageId
   * @returns {Lerneintrag}
   */
  function eintrag(frageId) {
    return eintraege[frageId] ?? UNBERUEHRT;
  }

  /**
   * @param {string} frageId
   * @returns {boolean}
   */
  function istGemeistert(frageId) {
    return eintrag(frageId).folge >= LERN_KONSTANTEN.MEISTER_SCHWELLE;
  }

  /**
   * Das Gewicht, mit dem eine Frage zur Auswahl kommt.
   * @param {Frage} frage
   * @returns {number}
   */
  function gewicht(frage) {
    const stand = eintrag(frage.id);
    if (stand.zuletzt === null) return LERN_KONSTANTEN.GEWICHT_NIE_GESTELLT;
    if (!istGemeistert(frage.id)) return LERN_KONSTANTEN.GEWICHT_NICHT_GEMEISTERT;

    const tage = Math.max(0, (uhr() - stand.zuletzt) / MILLISEKUNDEN_JE_TAG);
    const zeitfaktor = Math.min(
      LERN_KONSTANTEN.ZEITFAKTOR_OBERGRENZE,
      1 + tage * LERN_KONSTANTEN.ZEITFAKTOR_PRO_TAG,
    );
    return LERN_KONSTANTEN.GEWICHT_GEMEISTERT * zeitfaktor;
  }

  /**
   * Zieht eine Frage gewichtet zufaellig. Die zuletzt gestellte Frage bleibt
   * aussen vor, solange es eine Alternative gibt.
   * @returns {Frage | null}
   */
  function naechsteFrage() {
    const kandidaten =
      katalog.fragen.length > 1
        ? katalog.fragen.filter((frage) => frage.id !== zuletztGestellt)
        : katalog.fragen;
    if (kandidaten.length === 0) return null;

    const gewichte = kandidaten.map(gewicht);
    const summe = gewichte.reduce((a, b) => a + b, 0);
    let schwelle = zufall() * summe;
    let gewaehlt = kandidaten[kandidaten.length - 1];
    for (let i = 0; i < kandidaten.length; i += 1) {
      schwelle -= gewichte[i];
      if (schwelle < 0) {
        gewaehlt = kandidaten[i];
        break;
      }
    }

    zuletztGestellt = gewaehlt.id;
    return gewaehlt;
  }

  /**
   * Wertet eine Antwort aus und schreibt den Lernfortschritt fort.
   * @param {Frage} frage
   * @param {Iterable<string>} gewaehlteBuchstaben
   * @returns {Bewertung}
   */
  function beantworte(frage, gewaehlteBuchstaben) {
    const bewertung = bewerteAntwort(frage, gewaehlteBuchstaben);
    const bisher = eintrag(frage.id);
    eintraege = {
      ...eintraege,
      [frage.id]: {
        folge: bewertung.richtig ? bisher.folge + 1 : 0,
        falsch: bisher.falsch + (bewertung.richtig ? 0 : 1),
        zuletzt: uhr(),
      },
    };
    schreibeLernstand(speicher, eintraege);
    return bewertung;
  }

  /**
   * Fasst den Lernfortschritt ueber die uebergebenen Fragen zusammen.
   * @param {readonly Frage[]} fragen
   * @returns {Lernfortschritt}
   */
  function lernfortschrittUeber(fragen) {
    return lernfortschrittAus(fragen.filter((frage) => istGemeistert(frage.id)).length, fragen.length);
  }

  return {
    katalog,

    /** Ob ein vorgefundener Bestand nicht gedeutet werden konnte und verworfen wurde. */
    lernstandVerworfen: gelesen.verworfen,

    naechsteFrage,
    beantworte,
    istGemeistert,

    /** @returns {Lernfortschritt} */
    lernfortschritt: () => lernfortschrittUeber(katalog.fragen),

    /** @returns {LernfortschrittTeil[]} */
    lernfortschrittJeWissensstufe: () =>
      [...katalog.metadaten.wissensstufen]
        .sort((a, b) => a.reihenfolge - b.reihenfolge)
        .map((/** @type {Wissensstufe} */ stufe) => ({
          id: stufe.id,
          name: stufe.name,
          ...lernfortschrittUeber(katalog.fragen.filter((frage) => frage.wissensstufe === stufe.id)),
        })),

    /** @returns {LernfortschrittTeil[]} */
    lernfortschrittJeLektion: () =>
      katalog.metadaten.lektionen.map((/** @type {Lektion} */ lektion) => ({
        id: lektion.id,
        name: `Lektion ${lektion.nummer}: ${lektion.titel}`,
        ...lernfortschrittUeber(katalog.fragen.filter((frage) => frage.lektion === lektion.id)),
      })),

    /**
     * Fragen, die mindestens einmal falsch beantwortet und noch nicht
     * gemeistert sind. Ein Stand zu einer Kennung, die es im Katalog nicht
     * gibt, bleibt hier folgenlos: Gezaehlt wird ueber den Katalog.
     * @returns {Frage[]}
     */
    problemfragen: () =>
      katalog.fragen.filter((frage) => eintrag(frage.id).falsch > 0 && !istGemeistert(frage.id)),

    /** Verwirft den gesamten Lernfortschritt, auch im Speicher. */
    setzeZurueck: () => {
      eintraege = {};
      // Auch die Sperre der zuletzt gestellten Frage faellt: Nach dem
      // Zuruecksetzen gibt es keinen Verlauf mehr, an den sie anknuepfen koennte.
      zuletztGestellt = null;
      schreibeLernstand(speicher, eintraege);
    },
  };
}
