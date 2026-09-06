/** @import { Frage } from './typen.js' */
/** @import { Ansicht } from './routing.js' */
/** @import { Bewertung } from './antwort.js' */
/** @import { Katalog } from './typen.js' */
/** @import { LernfortschrittTeil, Eingrenzung } from './lernengine.js' */
import { ladeKatalog, bezeichneFrage, findeLektion, findeWissensstufe } from './katalog.js';
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

  eingrenzungAktiv: element('eingrenzung-aktiv'),
  eingrenzungBeschreibung: element('eingrenzung-beschreibung'),
  eingrenzungAufheben: /** @type {HTMLButtonElement} */ (element('eingrenzung-aufheben')),
  eingrenzungAuswahl: /** @type {HTMLDetailsElement} */ (element('eingrenzung-auswahl')),
  eingrenzungWissensstufe: /** @type {HTMLSelectElement} */ (element('eingrenzung-wissensstufe')),
  eingrenzungLektionen: element('eingrenzung-lektionen'),
  eingrenzungUebernehmen: /** @type {HTMLButtonElement} */ (element('eingrenzung-uebernehmen')),

  lernfortschrittGesamt: element('lernfortschritt-gesamt'),
  lernfortschrittWissensstufen: element('lernfortschritt-wissensstufen'),
  lernfortschrittLektionen: element('lernfortschritt-lektionen'),
  problemfragen: element('problemfragen'),
  problemfragenLeer: element('problemfragen-leer'),
  problemfragenUeben: /** @type {HTMLButtonElement} */ (element('problemfragen-ueben')),
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
    anzeige.keineFrage.textContent = engine.eingrenzung()
      ? 'Für diese Eingrenzung gibt es keine Frage. Eingrenzung oben aufheben, um weiterzuüben.'
      : 'Der Katalog enthält keine Frage zum Üben.';
    anzeige.keineFrage.hidden = false;
    return;
  }
  zeigeFrage(frage);
}

/**
 * Beschreibt eine Eingrenzung fuer die Anzeige.
 * @param {Eingrenzung} eingrenzung
 * @returns {string}
 */
function beschreibeEingrenzung(eingrenzung) {
  switch (eingrenzung.typ) {
    case 'wissensstufe': {
      const stufe = findeWissensstufe(katalog, eingrenzung.id);
      return `Eingegrenzt auf Wissensstufe „${stufe ? stufe.name : eingrenzung.id}".`;
    }
    case 'lektion': {
      const titel = eingrenzung.ids.map((/** @type {string} */ id) => {
        const lektion = findeLektion(katalog, id);
        return lektion ? `Lektion ${lektion.nummer}: ${lektion.titel}` : id;
      });
      return `Eingegrenzt auf ${titel.join(', ')}.`;
    }
    case 'problemfragen':
      return 'Eingegrenzt auf Problemfragen.';
    default:
      return '';
  }
}

/** Zeichnet die Anzeige der aktiven Eingrenzung (oder deren Fehlen). */
function zeichneEingrenzung() {
  const eingrenzung = engine.eingrenzung();
  anzeige.eingrenzungAktiv.hidden = eingrenzung === null;
  if (eingrenzung) anzeige.eingrenzungBeschreibung.textContent = beschreibeEingrenzung(eingrenzung);
}

/** Fuellt Wissensstufen-Auswahl und Lektionen-Liste der Eingrenzung. */
function fuelleEingrenzungsAuswahl() {
  anzeige.eingrenzungWissensstufe.append(
    ...[...katalog.metadaten.wissensstufen]
      .sort((a, b) => a.reihenfolge - b.reihenfolge)
      .map((stufe) => {
        const option = document.createElement('option');
        option.value = stufe.id;
        option.textContent = stufe.name;
        return option;
      }),
  );

  anzeige.eingrenzungLektionen.replaceChildren(
    ...katalog.metadaten.lektionen.map((lektion) => {
      const zeile = document.createElement('li');
      const feld = document.createElement('label');
      const kaestchen = document.createElement('input');
      kaestchen.type = 'checkbox';
      kaestchen.name = 'eingrenzung-lektion';
      kaestchen.value = lektion.id;
      const text = document.createElement('span');
      text.textContent = `Lektion ${lektion.nummer}: ${lektion.titel}`;
      feld.append(kaestchen, text);
      zeile.append(feld);
      return zeile;
    }),
  );
}

/** @returns {string[]} Die Kennungen der in der Eingrenzung angehakten Lektionen. */
function gewaehlteLektionen() {
  return [
    .../** @type {NodeListOf<HTMLInputElement>} */ (
      anzeige.eingrenzungLektionen.querySelectorAll('input[type="checkbox"]:checked')
    ),
  ].map((kaestchen) => kaestchen.value);
}

/** Uebernimmt die in der Auswahl getroffene Eingrenzung und startet neu. */
function uebernehmeEingrenzung() {
  const lektionen = gewaehlteLektionen();
  const wissensstufe = anzeige.eingrenzungWissensstufe.value;
  /** @type {Eingrenzung | null} */
  let neu = null;
  // Wissensstufe und Lektionen schliessen sich gegenseitig aus (siehe die
  // Ereignis-Handler unten, die bei Auswahl der einen die andere zuruecksetzen);
  // Lektionen haben Vorrang, falls dennoch beides gesetzt ist.
  if (lektionen.length > 0) neu = { typ: 'lektion', ids: lektionen };
  else if (wissensstufe !== '') neu = { typ: 'wissensstufe', id: wissensstufe };

  engine.setzeEingrenzung(neu);
  anzeige.eingrenzungAuswahl.open = false;
  zeichneEingrenzung();
  zeigeNaechsteFrage();
}

/** Hebt eine aktive Eingrenzung auf und startet den Uebungslauf neu. */
function hebeEingrenzungAuf() {
  engine.setzeEingrenzung(null);
  anzeige.eingrenzungWissensstufe.value = '';
  for (const kaestchen of /** @type {NodeListOf<HTMLInputElement>} */ (
    anzeige.eingrenzungLektionen.querySelectorAll('input[type="checkbox"]')
  )) {
    kaestchen.checked = false;
  }
  zeichneEingrenzung();
  zeigeNaechsteFrage();
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
  anzeige.problemfragenUeben.hidden = problemfragen.length === 0;
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
    zeichneEingrenzung();
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

anzeige.eingrenzungUebernehmen.addEventListener('click', uebernehmeEingrenzung);
anzeige.eingrenzungAufheben.addEventListener('click', hebeEingrenzungAuf);

// Wissensstufe und Lektionen schliessen sich gegenseitig aus: Die Auswahl der
// einen setzt die andere zurueck, damit die Anzeige nie beide gleichzeitig
// gewaehlt zeigt, obwohl nur eine davon uebernommen wuerde.
anzeige.eingrenzungWissensstufe.addEventListener('change', () => {
  if (anzeige.eingrenzungWissensstufe.value === '') return;
  for (const kaestchen of /** @type {NodeListOf<HTMLInputElement>} */ (
    anzeige.eingrenzungLektionen.querySelectorAll('input[type="checkbox"]')
  )) {
    kaestchen.checked = false;
  }
});

anzeige.eingrenzungLektionen.addEventListener('change', (ereignis) => {
  if (!(/** @type {HTMLInputElement} */ (ereignis.target).checked)) return;
  anzeige.eingrenzungWissensstufe.value = '';
});

anzeige.problemfragenUeben.addEventListener('click', () => {
  engine.setzeEingrenzung({ typ: 'problemfragen' });
  window.location.hash = '#/ueben';
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
  fuelleEingrenzungsAuswahl();
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
