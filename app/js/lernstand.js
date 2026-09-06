// Persistenz des Lernfortschritts. Der Speicher wird hineingereicht, damit die
// Lern-Engine ohne Browser pruefbar ist (Issue #4).

/**
 * @typedef {object} Speicher
 * @property {() => string | null} lies
 * @property {(inhalt: string) => void} schreibe
 */

/**
 * Der festgehaltene Stand einer einzelnen Frage.
 * @typedef {object} Lerneintrag
 * @property {number} folge Zahl der zuletzt ununterbrochen richtigen Antworten.
 * @property {number} falsch Zahl der falschen Antworten insgesamt.
 * @property {number | null} zuletzt Zeitpunkt der letzten Antwort in Millisekunden.
 */

/**
 * @typedef {Record<string, Lerneintrag>} Lerneintraege
 */

/** Erhoehen, sobald sich die Bedeutung der gespeicherten Felder aendert. */
export const LERNSTAND_FORMAT_VERSION = 1;

/** Schluessel im Browser-Speicher. */
export const LERNSTAND_SCHLUESSEL = 'schiri-trainer.lernstand';

/**
 * Ein Speicher im Arbeitsspeicher. Fuer Tests und als Rueckfallebene, wenn der
 * Browser keinen dauerhaften Speicher zur Verfuegung stellt.
 * @param {string | null} [anfangswert]
 * @returns {Speicher}
 */
export function arbeitsspeicher(anfangswert = null) {
  let inhalt = anfangswert;
  return {
    lies: () => inhalt,
    schreibe: (neu) => {
      inhalt = neu;
    },
  };
}

/**
 * Ein Speicher auf Basis von `localStorage`, unter dem uebergebenen Schluessel.
 * Scheitert der Zugriff — etwa weil der Browser Webspeicher blockiert —, wird
 * auf den Arbeitsspeicher ausgewichen: Ueben bleibt moeglich, nur ueberdauert
 * der Stand die Sitzung nicht.
 * @param {string} [schluessel]
 * @returns {Speicher}
 */
export function browserSpeicher(schluessel = LERNSTAND_SCHLUESSEL) {
  try {
    const probe = `${schluessel}.probe`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
  } catch (fehler) {
    console.warn('Kein dauerhafter Speicher verfügbar; der Stand gilt nur für diese Sitzung.', fehler);
    return arbeitsspeicher();
  }
  return {
    lies: () => window.localStorage.getItem(schluessel),
    schreibe: (inhalt) => window.localStorage.setItem(schluessel, inhalt),
  };
}

/**
 * @param {unknown} wert
 * @returns {Lerneintrag | null}
 */
function alsEintrag(wert) {
  if (typeof wert !== 'object' || wert === null) return null;
  const roh = /** @type {Record<string, unknown>} */ (wert);
  const folge = roh.folge;
  const falsch = roh.falsch;
  const zuletzt = roh.zuletzt;
  if (typeof folge !== 'number' || !Number.isFinite(folge) || folge < 0) return null;
  if (typeof falsch !== 'number' || !Number.isFinite(falsch) || falsch < 0) return null;
  if (zuletzt !== null && (typeof zuletzt !== 'number' || !Number.isFinite(zuletzt))) return null;
  return { folge, falsch, zuletzt };
}

/**
 * Liest den Lernstand. Ein Bestand, der sich nicht zweifelsfrei deuten laesst —
 * unlesbar oder mit unbekannter Formatversion —, gilt als leer und wird als
 * verworfen gemeldet, statt teilweise fehlgedeutet zu werden.
 * @param {Speicher} speicher
 * @returns {{ eintraege: Lerneintraege, verworfen: boolean }}
 */
export function leseLernstand(speicher) {
  /** @type {string | null} */
  let inhalt = null;
  try {
    inhalt = speicher.lies();
  } catch (fehler) {
    console.warn('Der Lernfortschritt konnte nicht gelesen werden.', fehler);
    return { eintraege: {}, verworfen: true };
  }
  if (inhalt === null) return { eintraege: {}, verworfen: false };

  /** @type {unknown} */
  let gelesen;
  try {
    gelesen = JSON.parse(inhalt);
  } catch {
    return { eintraege: {}, verworfen: true };
  }
  if (typeof gelesen !== 'object' || gelesen === null) return { eintraege: {}, verworfen: true };

  const bestand = /** @type {Record<string, unknown>} */ (gelesen);
  if (bestand.formatVersion !== LERNSTAND_FORMAT_VERSION) return { eintraege: {}, verworfen: true };
  if (typeof bestand.eintraege !== 'object' || bestand.eintraege === null) {
    return { eintraege: {}, verworfen: true };
  }

  /** @type {Lerneintraege} */
  const eintraege = {};
  for (const [id, wert] of Object.entries(/** @type {Record<string, unknown>} */ (bestand.eintraege))) {
    const eintrag = alsEintrag(wert);
    if (eintrag) eintraege[id] = eintrag;
  }
  return { eintraege, verworfen: false };
}

/**
 * Schreibt den Lernstand. Ein scheiternder Schreibvorgang — voller oder
 * gesperrter Speicher — darf das Ueben nicht abbrechen.
 * @param {Speicher} speicher
 * @param {Lerneintraege} eintraege
 */
export function schreibeLernstand(speicher, eintraege) {
  try {
    speicher.schreibe(JSON.stringify({ formatVersion: LERNSTAND_FORMAT_VERSION, eintraege }));
  } catch (fehler) {
    console.warn('Der Lernfortschritt konnte nicht gespeichert werden.', fehler);
  }
}
