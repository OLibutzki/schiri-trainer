/** @import { Frage } from './typen.js' */
/** @import { Ansicht } from './routing.js' */
/** @import { Bewertung } from './antwort.js' */
/** @import { Katalog } from './typen.js' */
/** @import { LernfortschrittTeil } from './lernengine.js' */
/** @import { Pruefungsstand } from './pruefung.js' */
import { ladeKatalog, bezeichneFrage } from './katalog.js';
import { mische } from './mischen.js';
import { erzeugeLernEngine } from './lernengine.js';
import { browserSpeicher } from './lernstand.js';
import { starteRouting } from './routing.js';
import {
  erzeugePruefung,
  offenerIndex,
  istAbgeschlossen,
  beantworte as beantwortePruefung,
  ergebnis as auswertePruefung,
} from './pruefung.js';

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function element(id) {
  const gefunden = document.getElementById(id);
  if (!gefunden) throw new Error(`Element #${id} fehlt im Markup`);
  return gefunden;
}

const anzeige = {
  navigation: element('navigation'),
  herkunft: element('herkunft'),
  ladefehler: element('ladefehler'),
  lernstandhinweis: element('lernstandhinweis'),

  ansichten: {
    start: element('ansicht-start'),
    ueben: element('ansicht-ueben'),
    pruefung: element('ansicht-pruefung'),
    lernfortschritt: element('ansicht-lernfortschritt'),
  },

  startAnteil: element('start-anteil'),
  startBalken: /** @type {HTMLProgressElement} */ (element('start-balken')),
  startErlaeuterung: element('start-erlaeuterung'),

  frageKennung: element('frage-kennung'),
  frageText: element('frage-text'),
  formular: /** @type {HTMLFormElement} */ (element('antwort-formular')),
  optionen: element('optionen'),
  abgeben: /** @type {HTMLButtonElement} */ (element('abgeben')),
  rueckmeldung: element('rueckmeldung'),
  urteil: element('rueckmeldung-urteil'),
  erlaeuterung: element('rueckmeldung-erlaeuterung'),
  weiter: element('weiter'),
  keineFrage: element('keine-frage'),

  pruefungEinrichtung: element('pruefung-einrichtung'),
  pruefungFragenzahl: /** @type {HTMLSelectElement} */ (element('pruefung-fragenzahl')),
  pruefungWissensstufeFeld: element('pruefung-wissensstufe-feld'),
  pruefungWissensstufe: /** @type {HTMLSelectElement} */ (element('pruefung-wissensstufe')),
  pruefungStarten: /** @type {HTMLButtonElement} */ (element('pruefung-starten')),

  pruefungLaufend: element('pruefung-laufend'),
  pruefungFortschritt: element('pruefung-fortschritt'),
  pruefungFrageText: element('pruefung-frage-text'),
  pruefungFormular: /** @type {HTMLFormElement} */ (element('pruefung-formular')),
  pruefungOptionen: element('pruefung-optionen'),
  pruefungAbgeben: /** @type {HTMLButtonElement} */ (element('pruefung-abgeben')),
  pruefungAbbrechen: /** @type {HTMLButtonElement} */ (element('pruefung-abbrechen')),

  pruefungErgebnis: element('pruefung-ergebnis'),
  pruefungPunktzahl: element('pruefung-punktzahl'),
  pruefungAlleRichtig: element('pruefung-alle-richtig'),
  pruefungFalsche: element('pruefung-falsche'),
  pruefungNeu: /** @type {HTMLButtonElement} */ (element('pruefung-neu')),

  lernfortschrittGesamt: element('lernfortschritt-gesamt'),
  lernfortschrittWissensstufen: element('lernfortschritt-wissensstufen'),
  lernfortschrittLektionen: element('lernfortschritt-lektionen'),
  problemfragen: element('problemfragen'),
  problemfragenLeer: element('problemfragen-leer'),
  zuruecksetzen: /** @type {HTMLButtonElement} */ (element('zuruecksetzen')),
};

/** @type {Katalog} */
let katalog;
/** @type {ReturnType<typeof erzeugeLernEngine>} */
let engine;
/** @type {Frage | null} */
let aktuelleFrage = null;
/** Ob die angezeigte Frage bereits ausgewertet wurde. */
let beantwortet = false;
/** @type {Pruefungsstand | null} Keine laufende oder abgeschlossene Pruefung, solange `null`. */
let pruefungsstand = null;
/**
 * Die Fragenkennung der zuletzt gezeichneten Pruefungsfrage. Verhindert, dass
 * ein Ansichtswechsel eine bereits angezeigte, noch unbeantwortete Frage neu
 * mischt und eine angekreuzte, aber nicht abgegebene Auswahl verwirft.
 * @type {string | null}
 */
let pruefungAngezeigteFrage = null;

/** @param {number} anteil @returns {string} */
function alsProzent(anteil) {
  return `${Math.round(anteil * 100)} %`;
}

/**
 * @param {HTMLElement} liste
 * @returns {HTMLInputElement[]} Die Kaestchen einer Optionenliste.
 */
function kaestchenIn(liste) {
  return [.../** @type {NodeListOf<HTMLInputElement>} */ (liste.querySelectorAll('input[type="checkbox"]'))];
}

/** @returns {HTMLInputElement[]} Die Kaestchen der angezeigten Uebungsoptionen. */
function kaestchen() {
  return kaestchenIn(anzeige.optionen);
}

/**
 * Baut die Optionenliste einer Frage. Die Reihenfolge wechselt bei jeder
 * Anzeige, damit sich der Anwender den Inhalt merkt und nicht die Position;
 * der Original-Buchstabe bleibt sichtbar.
 * @param {Frage} frage
 * @returns {HTMLLIElement[]}
 */
function baueOptionenListe(frage) {
  return mische(frage.optionen).map((option, index) => {
    const eintrag = document.createElement('li');
    const feld = document.createElement('label');
    feld.className = 'option';

    const optionskaestchen = document.createElement('input');
    // Bewusst immer Mehrfachauswahl: Ein an die Frage angepasstes Bedienelement
    // wuerde verraten, wie viele Optionen korrekt sind.
    optionskaestchen.type = 'checkbox';
    optionskaestchen.name = 'option';
    optionskaestchen.value = option.buchstabe;

    // Die Zifferntaste zeigt die Position, nicht den Original-Buchstaben: Nur
    // die Position ist am Bildschirm sichtbar mit einer Taste verknuepft.
    const taste = document.createElement('span');
    taste.className = 'option-taste';
    taste.textContent = String(index + 1);
    taste.setAttribute('aria-hidden', 'true');

    const buchstabe = document.createElement('span');
    buchstabe.className = 'option-buchstabe';
    buchstabe.textContent = `${option.buchstabe})`;

    const text = document.createElement('span');
    text.textContent = option.text;

    feld.append(optionskaestchen, taste, buchstabe, text);
    eintrag.append(feld);
    return eintrag;
  });
}

/** @param {Frage} frage */
function zeigeFrage(frage) {
  aktuelleFrage = frage;
  beantwortet = false;
  anzeige.frageKennung.textContent = bezeichneFrage(katalog, frage);
  anzeige.frageText.textContent = frage.text;
  anzeige.optionen.replaceChildren(...baueOptionenListe(frage));

  anzeige.formular.hidden = false;
  anzeige.abgeben.disabled = false;
  anzeige.keineFrage.hidden = true;
  anzeige.rueckmeldung.hidden = true;
  anzeige.rueckmeldung.classList.remove('rueckmeldung--richtig', 'rueckmeldung--falsch');
}

/** Zieht die naechste Frage; ohne Kandidat bleibt eine Meldung stehen. */
function zeigeNaechsteFrage() {
  const frage = engine.naechsteFrage();
  if (!frage) {
    aktuelleFrage = null;
    anzeige.formular.hidden = true;
    anzeige.rueckmeldung.hidden = true;
    anzeige.frageKennung.textContent = '';
    anzeige.frageText.textContent = '';
    anzeige.keineFrage.hidden = false;
    return;
  }
  zeigeFrage(frage);
}

/** @returns {string[]} */
function gewaehlteBuchstaben() {
  return kaestchen()
    .filter((feld) => feld.checked)
    .map((feld) => feld.value);
}

/**
 * Fuellt die Wissensstufen-Auswahl der Pruefungseinrichtung. Gibt es nur eine
 * Wissensstufe, entfaellt die Auswahl: Sie waere ohne Wirkung, da "Alle" und
 * "die eine Wissensstufe" dieselbe Kandidatenmenge waeren.
 */
function fuellePruefungsWissensstufen() {
  if (katalog.metadaten.wissensstufen.length <= 1) {
    anzeige.pruefungWissensstufeFeld.hidden = true;
    return;
  }
  anzeige.pruefungWissensstufe.append(
    ...[...katalog.metadaten.wissensstufen]
      .sort((a, b) => a.reihenfolge - b.reihenfolge)
      .map((stufe) => {
        const option = document.createElement('option');
        option.value = stufe.id;
        option.textContent = stufe.name;
        return option;
      }),
  );
}

/**
 * Zeichnet die aktuell offene Frage der laufenden Pruefung neu. Nur wenn sie
 * sich gegenueber der zuletzt gezeichneten unterscheidet: Sonst wuerde ein
 * Ansichtswechsel eine angekreuzte, aber nicht abgegebene Auswahl verwerfen
 * und die Optionen neu mischen, obwohl dieselbe Frage weiter offen ist.
 */
function zeigePruefungsfrage() {
  if (!pruefungsstand) return;
  const index = offenerIndex(pruefungsstand);
  const frageId = pruefungsstand.frageIds[index];
  anzeige.pruefungFortschritt.textContent = `Frage ${index + 1} von ${pruefungsstand.frageIds.length}`;
  if (frageId === pruefungAngezeigteFrage) return;

  const frage = /** @type {Frage} */ (katalog.fragen.find((kandidat) => kandidat.id === frageId));
  anzeige.pruefungFrageText.textContent = frage.text;
  anzeige.pruefungOptionen.replaceChildren(...baueOptionenListe(frage));
  pruefungAngezeigteFrage = frageId;
}

/** Zeichnet die Pruefungsansicht: Einrichtung, laufende Pruefung oder Ergebnis. */
function zeichnePruefung() {
  if (!pruefungsstand) {
    anzeige.pruefungEinrichtung.hidden = false;
    anzeige.pruefungLaufend.hidden = true;
    anzeige.pruefungAbbrechen.hidden = true;
    anzeige.pruefungErgebnis.hidden = true;
    return;
  }

  anzeige.pruefungEinrichtung.hidden = true;

  if (!istAbgeschlossen(pruefungsstand)) {
    anzeige.pruefungLaufend.hidden = false;
    anzeige.pruefungAbbrechen.hidden = false;
    anzeige.pruefungErgebnis.hidden = true;
    zeigePruefungsfrage();
    return;
  }

  anzeige.pruefungLaufend.hidden = true;
  anzeige.pruefungAbbrechen.hidden = true;
  anzeige.pruefungErgebnis.hidden = false;

  const auswertung = auswertePruefung(katalog, pruefungsstand);
  anzeige.pruefungPunktzahl.textContent = `${auswertung.punktzahl} von ${auswertung.gesamt} Fragen richtig beantwortet.`;
  anzeige.pruefungAlleRichtig.hidden = auswertung.falsche.length > 0;
  anzeige.pruefungFalsche.replaceChildren(
    ...auswertung.falsche.map(({ frage, gewaehlt, bewertung }) => {
      const zeile = document.createElement('li');

      const kennung = document.createElement('span');
      kennung.className = 'problemfrage-kennung';
      kennung.textContent = bezeichneFrage(katalog, frage);

      const text = document.createElement('span');
      text.className = 'problemfrage-text';
      text.textContent = frage.text;

      zeile.append(kennung, text, baueOptionenRueckblick(frage, gewaehlt, bewertung));
      return zeile;
    }),
  );
}

/** Liest die Einrichtung und startet eine neue Pruefung. */
function startePruefung() {
  const fragenzahl = Number(anzeige.pruefungFragenzahl.value);
  const wissensstufe = anzeige.pruefungWissensstufe.value || null;
  pruefungsstand = erzeugePruefung({ katalog, fragenzahl, wissensstufe });
  pruefungAngezeigteFrage = null;
  zeichnePruefung();
  window.scrollTo({ top: 0 });
}

function werteAusPruefung() {
  if (!pruefungsstand) return;
  const gewaehlt = kaestchenIn(anzeige.pruefungOptionen)
    .filter((feld) => feld.checked)
    .map((feld) => feld.value);
  pruefungsstand = beantwortePruefung(pruefungsstand, gewaehlt);
  zeichnePruefung();
  window.scrollTo({ top: 0 });
}

/**
 * Markiert Kaestchen als korrekt, zu Unrecht angekreuzt oder uebersehen —
 * die gemeinsame Darstellung fuer die Rueckmeldung im Uebungsmodus und den
 * Rueckblick auf falsch beantwortete Pruefungsfragen.
 * @param {HTMLInputElement[]} kaestchenListe
 * @param {string[]} gewaehlt
 * @param {Bewertung} bewertung
 */
function markiereBewertung(kaestchenListe, gewaehlt, bewertung) {
  const gewaehltMenge = new Set(gewaehlt);
  const korrektMenge = new Set(bewertung.korrekt);

  for (const optionskaestchen of kaestchenListe) {
    optionskaestchen.checked = gewaehltMenge.has(optionskaestchen.value);
    optionskaestchen.disabled = true;
    const feld = /** @type {HTMLElement} */ (optionskaestchen.closest('.option'));
    const buchstabe = optionskaestchen.value;
    const vermerk = document.createElement('span');
    vermerk.className = 'option-vermerk';

    if (korrektMenge.has(buchstabe)) {
      feld.classList.add('option--korrekt');
      vermerk.textContent = gewaehltMenge.has(buchstabe) ? 'korrekt, angekreuzt' : 'korrekt, übersehen';
      feld.append(vermerk);
    } else if (gewaehltMenge.has(buchstabe)) {
      feld.classList.add('option--falsch-gewaehlt');
      vermerk.textContent = 'zu Unrecht angekreuzt';
      feld.append(vermerk);
    }
  }
}

/**
 * Baut die Optionenliste einer bereits ausgewerteten Pruefungsfrage im
 * Rueckblick: gleiche Darstellung wie die Rueckmeldung im Uebungsmodus,
 * aber unveraenderlich. Anders als beim aktiven Ueben gibt es hier nichts
 * zu merken, das eine gemischte Reihenfolge verhindern muesste — und da der
 * Rueckblick bei jedem Ansichtswechsel neu gezeichnet wird, wuerde eine
 * Mischung sonst bei jedem Wechsel die Reihenfolge aendern.
 * @param {Frage} frage
 * @param {string[]} gewaehlt
 * @param {Bewertung} bewertung
 * @returns {HTMLUListElement}
 */
function baueOptionenRueckblick(frage, gewaehlt, bewertung) {
  const liste = document.createElement('ul');
  liste.className = 'optionen';
  liste.append(
    ...frage.optionen.map((option) => {
      const eintrag = document.createElement('li');
      const feld = document.createElement('label');
      feld.className = 'option';

      const optionskaestchen = document.createElement('input');
      optionskaestchen.type = 'checkbox';
      optionskaestchen.value = option.buchstabe;

      const buchstabe = document.createElement('span');
      buchstabe.className = 'option-buchstabe';
      buchstabe.textContent = `${option.buchstabe})`;

      const text = document.createElement('span');
      text.textContent = option.text;

      feld.append(optionskaestchen, buchstabe, text);
      eintrag.append(feld);
      return eintrag;
    }),
  );
  markiereBewertung(kaestchenIn(liste), gewaehlt, bewertung);
  return liste;
}

function werteAus() {
  if (!aktuelleFrage || beantwortet) return;
  const gewaehlt = gewaehlteBuchstaben();
  const bewertung = engine.beantworte(aktuelleFrage, gewaehlt);
  beantwortet = true;
  markiereBewertung(kaestchen(), gewaehlt, bewertung);

  anzeige.abgeben.disabled = true;
  anzeige.urteil.textContent = bewertung.richtig ? 'Richtig' : 'Falsch';
  anzeige.rueckmeldung.classList.add(bewertung.richtig ? 'rueckmeldung--richtig' : 'rueckmeldung--falsch');
  anzeige.erlaeuterung.textContent = erlaeutere(bewertung);
  anzeige.rueckmeldung.hidden = false;
  anzeige.weiter.focus();
}

/**
 * @param {Bewertung} bewertung
 * @returns {string}
 */
function erlaeutere(bewertung) {
  const alsListe = (/** @type {string[]} */ buchstaben) =>
    buchstaben.map((buchstabe) => `${buchstabe})`).join(', ');
  const teile = [`Korrekt ${bewertung.korrekt.length === 1 ? 'ist' : 'sind'}: ${alsListe(bewertung.korrekt)}.`];
  if (bewertung.zuUnrecht.length > 0) {
    teile.push(`Zu Unrecht angekreuzt: ${alsListe(bewertung.zuUnrecht)}.`);
  }
  if (bewertung.uebersehen.length > 0) {
    teile.push(`Übersehen: ${alsListe(bewertung.uebersehen)}.`);
  }
  return teile.join(' ');
}

/**
 * @param {HTMLElement} liste
 * @param {LernfortschrittTeil[]} eintraege
 */
function fuelleAufschluesselung(liste, eintraege) {
  liste.replaceChildren(
    ...eintraege.map((eintrag) => {
      const zeile = document.createElement('li');

      const name = document.createElement('span');
      name.className = 'aufschluesselung-name';
      name.textContent = eintrag.name;

      const balken = document.createElement('progress');
      balken.className = 'lernfortschritt-balken';
      balken.max = 1;
      balken.value = eintrag.anteil;

      const zahl = document.createElement('span');
      zahl.className = 'aufschluesselung-zahl';
      zahl.textContent = `${alsProzent(eintrag.anteil)} (${eintrag.gemeistert}/${eintrag.gesamt})`;

      zeile.append(name, balken, zahl);
      return zeile;
    }),
  );
}

function zeichneStart() {
  const { gemeistert, gesamt, anteil } = engine.lernfortschritt();
  anzeige.startAnteil.textContent = alsProzent(anteil);
  anzeige.startBalken.value = anteil;
  anzeige.startErlaeuterung.textContent = `${gemeistert} von ${gesamt} Fragen gemeistert.`;
}

function zeichneLernfortschritt() {
  const { gemeistert, gesamt, anteil } = engine.lernfortschritt();
  anzeige.lernfortschrittGesamt.textContent =
    `${gemeistert} von ${gesamt} Fragen gemeistert (${alsProzent(anteil)}).`;

  fuelleAufschluesselung(anzeige.lernfortschrittWissensstufen, engine.lernfortschrittJeWissensstufe());
  fuelleAufschluesselung(anzeige.lernfortschrittLektionen, engine.lernfortschrittJeLektion());

  const problemfragen = engine.problemfragen();
  anzeige.problemfragenLeer.hidden = problemfragen.length > 0;
  anzeige.problemfragen.replaceChildren(
    ...problemfragen.map((frage) => {
      const zeile = document.createElement('li');

      const kennung = document.createElement('span');
      kennung.className = 'problemfrage-kennung';
      kennung.textContent = bezeichneFrage(katalog, frage);

      const text = document.createElement('span');
      text.className = 'problemfrage-text';
      text.textContent = frage.text;

      zeile.append(kennung, text);
      return zeile;
    }),
  );
}

/**
 * Was beim Betreten einer Ansicht zu zeichnen ist. Als Abbildung statt als
 * if-Kaskade, damit eine weitere Ansicht nur hier und im Routing auftaucht.
 * @type {Record<Ansicht, () => void>}
 */
const ZEICHNER = {
  start: zeichneStart,
  lernfortschritt: zeichneLernfortschritt,
  // Eine angefangene, noch nicht ausgewertete Frage ueberdauert einen
  // Ansichtswechsel; sonst wuerde ein Blick auf den Lernfortschritt sie verwerfen.
  ueben: () => {
    if (aktuelleFrage === null || beantwortet) zeigeNaechsteFrage();
  },
  // Eine laufende oder abgeschlossene Pruefung ueberdauert ebenfalls einen
  // Ansichtswechsel; erst „Neue Prüfung" oder „Abbrechen" setzen sie zurueck.
  pruefung: zeichnePruefung,
};

/** @param {Ansicht} ansicht */
function zeigeAnsicht(ansicht) {
  for (const [name, abschnitt] of Object.entries(anzeige.ansichten)) {
    abschnitt.hidden = name !== ansicht;
  }
  for (const verweis of /** @type {NodeListOf<HTMLAnchorElement>} */ (
    anzeige.navigation.querySelectorAll('a[data-ansicht]')
  )) {
    const aktiv = verweis.dataset.ansicht === ansicht;
    verweis.classList.toggle('navigation-verweis--aktiv', aktiv);
    if (aktiv) verweis.setAttribute('aria-current', 'page');
    else verweis.removeAttribute('aria-current');
  }

  ZEICHNER[ansicht]();
  window.scrollTo({ top: 0 });
}

function zeigeHerkunft() {
  const { herkunft, regelstand, regelnGueltigAb } = katalog.metadaten;
  const datum = (/** @type {string} */ iso) => new Date(iso).toLocaleDateString('de-DE');
  anzeige.herkunft.textContent =
    `${herkunft}. Regelstand: ${datum(regelstand)}, ` +
    `Regeln gültig ab ${datum(regelnGueltigAb)}.`;
}

/**
 * @typedef {object} TastaturKontext
 * @property {HTMLElement} liste Die Optionenliste der aktiven Frage.
 * @property {HTMLFormElement} formular Sein umschliessendes Formular.
 * @property {HTMLElement | null} weiter Sichtbar, wenn Enter stattdessen weiterblaettern soll.
 */

/**
 * Der Tastatur-Kontext der gerade aktiven Ansicht, oder `null`, wenn keine
 * Optionenliste bedienbar ist. Uebungs- und Pruefungsmodus haben je eine
 * eigene Optionenliste; ausserhalb einer laufenden Frage gibt es keinen
 * Kontext, und Zifferntasten/Eingabetaste bleiben wirkungslos.
 * @returns {TastaturKontext | null}
 */
function tastaturKontext() {
  if (!anzeige.ansichten.ueben.hidden && aktuelleFrage !== null) {
    return { liste: anzeige.optionen, formular: anzeige.formular, weiter: beantwortet ? anzeige.weiter : null };
  }
  if (!anzeige.ansichten.pruefung.hidden && pruefungsstand !== null && !istAbgeschlossen(pruefungsstand)) {
    return { liste: anzeige.pruefungOptionen, formular: anzeige.pruefungFormular, weiter: null };
  }
  return null;
}

/**
 * Zifferntasten waehlen die zugehoerige Option an und wieder ab, die
 * Eingabetaste bestaetigt die Antwort und blaettert anschliessend weiter.
 * Wirkt in Uebungs- und Pruefungsmodus gleichermassen (Issue #9). Eine offene
 * Bestaetigungsabfrage des Browsers (window.confirm) blockiert den
 * Haupt-Thread ohnehin, so dass in dieser Zeit kein Tastendruck ankommt.
 * @param {KeyboardEvent} ereignis
 */
function behandleTastatur(ereignis) {
  // Tastenkombinationen mit Zusatztaste (etwa Strg+1 fuer einen Browser-Tab)
  // bleiben unangetastet.
  if (ereignis.ctrlKey || ereignis.metaKey || ereignis.altKey) return;

  // Fokussierte native Bedienelemente behalten ihre eigene Tastaturbedienung
  // fuer Enter und Ziffern: Ein Verweis oder eine Schaltflaeche (z. B. die
  // Navigation oder "Prüfung abbrechen") soll sich weiterhin ganz normal per
  // Enter aktivieren lassen, statt stattdessen die Antwort abzugeben.
  const ziel = ereignis.target;
  if (ziel instanceof HTMLSelectElement || ziel instanceof HTMLButtonElement || ziel instanceof HTMLAnchorElement) {
    return;
  }

  const kontext = tastaturKontext();
  if (!kontext) return;

  if (ereignis.key === 'Enter') {
    ereignis.preventDefault();
    if (kontext.weiter) kontext.weiter.click();
    else kontext.formular.requestSubmit();
    return;
  }

  const position = Number(ereignis.key);
  if (!Number.isInteger(position) || position < 1) return;
  const feld = kaestchenIn(kontext.liste)[position - 1];
  if (!feld || feld.disabled) return;
  ereignis.preventDefault();
  feld.checked = !feld.checked;
}

window.addEventListener('keydown', behandleTastatur);

anzeige.formular.addEventListener('submit', (ereignis) => {
  ereignis.preventDefault();
  werteAus();
});

anzeige.weiter.addEventListener('click', () => {
  zeigeNaechsteFrage();
  window.scrollTo({ top: 0 });
});

anzeige.pruefungStarten.addEventListener('click', startePruefung);

anzeige.pruefungFormular.addEventListener('submit', (ereignis) => {
  ereignis.preventDefault();
  werteAusPruefung();
});

anzeige.pruefungAbbrechen.addEventListener('click', () => {
  // Bewusst die blockierende Abfrage des Browsers, siehe Lernfortschritt-Reset unten.
  if (!window.confirm('Die laufende Prüfung abbrechen? Der Zwischenstand geht verloren.')) return;
  pruefungsstand = null;
  pruefungAngezeigteFrage = null;
  zeichnePruefung();
});

anzeige.pruefungNeu.addEventListener('click', () => {
  pruefungsstand = null;
  pruefungAngezeigteFrage = null;
  zeichnePruefung();
});

anzeige.zuruecksetzen.addEventListener('click', () => {
  // Bewusst die blockierende Abfrage des Browsers: Sie ist ohne eigenes
  // Bedienelement zugaenglich und haelt waehrenddessen jede Eingabe an.
  if (!window.confirm('Den gesamten Lernfortschritt unwiderruflich löschen?')) return;
  engine.setzeZurueck();
  aktuelleFrage = null;
  beantwortet = false;
  zeichneLernfortschritt();
});

try {
  katalog = await ladeKatalog();
  engine = erzeugeLernEngine({ katalog, speicher: browserSpeicher() });
  zeigeHerkunft();
  fuellePruefungsWissensstufen();
  if (engine.lernstandVerworfen) {
    anzeige.lernstandhinweis.textContent =
      'Ein gespeicherter Lernfortschritt ließ sich nicht deuten und wurde verworfen. ' +
      'Die Anwendung beginnt von vorn.';
    anzeige.lernstandhinweis.hidden = false;
  }
  starteRouting(window, zeigeAnsicht);
} catch (fehler) {
  anzeige.ladefehler.textContent =
    'Der Fragenkatalog konnte nicht geladen werden. ' +
    'Bitte die Verbindung prüfen und die Seite neu laden.';
  anzeige.ladefehler.hidden = false;
  anzeige.navigation.hidden = true;
  console.error(fehler);
}
