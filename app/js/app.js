/** @import { Frage } from './typen.js' */
/** @import { Ansicht } from './routing.js' */
/** @import { Bewertung } from './antwort.js' */
/** @import { Katalog } from './typen.js' */
/** @import { LernfortschrittTeil } from './lernengine.js' */
import { ladeKatalog, bezeichneFrage } from './katalog.js';
import { mische } from './mischen.js';
import { erzeugeLernEngine } from './lernengine.js';
import { browserSpeicher } from './lernstand.js';
import { starteRouting } from './routing.js';

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

/** @param {number} anteil @returns {string} */
function alsProzent(anteil) {
  return `${Math.round(anteil * 100)} %`;
}

/** @returns {HTMLInputElement[]} Die Kaestchen der angezeigten Optionen. */
function kaestchen() {
  return [
    .../** @type {NodeListOf<HTMLInputElement>} */ (
      anzeige.optionen.querySelectorAll('input[type="checkbox"]')
    ),
  ];
}

/** @param {Frage} frage */
function zeigeFrage(frage) {
  aktuelleFrage = frage;
  beantwortet = false;
  anzeige.frageKennung.textContent = bezeichneFrage(katalog, frage);
  anzeige.frageText.textContent = frage.text;

  anzeige.optionen.replaceChildren(
    // Die Reihenfolge wechselt bei jeder Anzeige, damit sich der Anwender den
    // Inhalt merkt und nicht die Position. Der Original-Buchstabe bleibt sichtbar.
    ...mische(frage.optionen).map((option) => {
      const eintrag = document.createElement('li');
      const feld = document.createElement('label');
      feld.className = 'option';

      const optionskaestchen = document.createElement('input');
      // Bewusst immer Mehrfachauswahl: Ein an die Frage angepasstes Bedienelement
      // wuerde verraten, wie viele Optionen korrekt sind.
      optionskaestchen.type = 'checkbox';
      optionskaestchen.name = 'option';
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

function werteAus() {
  if (!aktuelleFrage || beantwortet) return;
  const gewaehlt = gewaehlteBuchstaben();
  const bewertung = engine.beantworte(aktuelleFrage, gewaehlt);
  beantwortet = true;
  const gewaehltMenge = new Set(gewaehlt);
  const korrektMenge = new Set(bewertung.korrekt);

  for (const optionskaestchen of kaestchen()) {
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

anzeige.formular.addEventListener('submit', (ereignis) => {
  ereignis.preventDefault();
  werteAus();
});

anzeige.weiter.addEventListener('click', () => {
  zeigeNaechsteFrage();
  window.scrollTo({ top: 0 });
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
