// Hash-Routing. Die Ansicht steht in der Adresse, damit die Zurueck-Geste
// zwischen den Ansichten navigiert, statt die Anwendung zu verlassen, und ein
// Neuladen wieder auf derselben Ansicht landet (Issue #5).

/** @typedef {'start' | 'ueben' | 'lernfortschritt' | 'pruefung'} Ansicht */

/** Die Startansicht; sie faengt auch jede unbekannte Adresse auf. */
export const START_ANSICHT = /** @type {Ansicht} */ ('start');

/** @type {Record<string, Ansicht>} */
const NACH_PFAD = {
  '/': START_ANSICHT,
  '/ueben': 'ueben',
  '/lernfortschritt': 'lernfortschritt',
  '/pruefung': 'pruefung',
};

/**
 * Die Ansicht zu einem Adressfragment. Unbekannte Adressen fuehren zur
 * Startansicht, statt eine leere Seite zu hinterlassen.
 * @param {string} hash
 * @returns {Ansicht}
 */
export function ansichtAus(hash) {
  const pfad = hash.replace(/^#/, '');
  return NACH_PFAD[pfad === '' ? '/' : pfad] ?? START_ANSICHT;
}

/**
 * Das Adressfragment zu einer Ansicht.
 * @param {Ansicht} ansicht
 * @returns {string}
 */
export function adresseFuer(ansicht) {
  const pfad = Object.keys(NACH_PFAD).find((kandidat) => NACH_PFAD[kandidat] === ansicht);
  return `#${pfad ?? '/'}`;
}

/**
 * Ruft `zeige` mit der aktuellen Ansicht auf und danach bei jedem Wechsel.
 * @param {Window} fenster
 * @param {(ansicht: Ansicht) => void} zeige
 */
export function starteRouting(fenster, zeige) {
  const anzeigen = () => zeige(ansichtAus(fenster.location.hash));
  fenster.addEventListener('hashchange', anzeigen);
  anzeigen();
}
