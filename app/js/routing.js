// Hash-Routing. Die Ansicht steht in der Adresse, damit die Zurueck-Geste
// zwischen den Ansichten navigiert, statt die Anwendung zu verlassen, und ein
// Neuladen wieder auf derselben Ansicht landet (Issue #5).

/** @typedef {'ueben' | 'lernfortschritt' | 'pruefung'} Ansicht */

/** Die Einstiegsansicht; sie faengt auch jede unbekannte Adresse auf. */
export const START_ANSICHT = /** @type {Ansicht} */ ('ueben');

/** @type {Record<string, Ansicht>} */
const NACH_PFAD = {
  '/ueben': 'ueben',
  '/lernfortschritt': 'lernfortschritt',
  '/pruefung': 'pruefung',
};

/**
 * Die Ansicht zu einem Adressfragment. Unbekannte Adressen fuehren zur
 * Einstiegsansicht, statt eine leere Seite zu hinterlassen.
 * @param {string} hash
 * @returns {Ansicht}
 */
export function ansichtAus(hash) {
  const pfad = hash.replace(/^#/, '');
  return NACH_PFAD[pfad] ?? START_ANSICHT;
}

/**
 * Das Adressfragment zu einer Ansicht.
 * @param {Ansicht} ansicht
 * @returns {string}
 */
export function adresseFuer(ansicht) {
  const pfad = Object.keys(NACH_PFAD).find((kandidat) => NACH_PFAD[kandidat] === ansicht);
  return `#${pfad ?? '/ueben'}`;
}

/**
 * Ruft `zeige` mit der aktuellen Ansicht auf und danach bei jedem Wechsel.
 * Traegt eine Adresse ohne passendes Fragment (etwa ein leerer Aufruf) einmalig
 * per `replaceState` auf `#/ueben` nach, statt bloss intern auf die
 * Einstiegsansicht auszuweichen — ohne zusaetzlichen Verlaufseintrag, damit die
 * Zurueck-Geste unveraendert funktioniert.
 * @param {Window} fenster
 * @param {(ansicht: Ansicht) => void} zeige
 */
export function starteRouting(fenster, zeige) {
  const anzeigen = () => zeige(ansichtAus(fenster.location.hash));
  fenster.addEventListener('hashchange', anzeigen);

  const pfad = fenster.location.hash.replace(/^#/, '');
  if (!(pfad in NACH_PFAD)) {
    fenster.history.replaceState(null, '', adresseFuer(START_ANSICHT));
  }
  anzeigen();
}
