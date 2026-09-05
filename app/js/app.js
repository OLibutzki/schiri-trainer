/** @import { Katalog, Frage } from './typen.js' */
import { ladeKatalog, bezeichneFrage } from './katalog.js';
import { bewerteAntwort } from './antwort.js';
import { mische } from './mischen.js';

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
  herkunft: element('herkunft'),
  ladefehler: element('ladefehler'),
  uebung: element('uebung'),
  frageKennung: element('frage-kennung'),
  frageText: element('frage-text'),
  formular: /** @type {HTMLFormElement} */ (element('antwort-formular')),
  optionen: element('optionen'),
  abgeben: /** @type {HTMLButtonElement} */ (element('abgeben')),
  rueckmeldung: element('rueckmeldung'),
  urteil: element('rueckmeldung-urteil'),
  erlaeuterung: element('rueckmeldung-erlaeuterung'),
  weiter: element('weiter'),
};

/** @type {Katalog} */
let katalog;
/** @type {Frage | null} */
let aktuelleFrage = null;

/**
 * Waehlt eine zufaellige Frage; die unmittelbar zuvor gestellte wird
 * uebersprungen, solange es eine Alternative gibt.
 * @returns {Frage}
 */
function naechsteFrage() {
  const kandidaten = katalog.fragen.filter((frage) => frage !== aktuelleFrage);
  const menge = kandidaten.length > 0 ? kandidaten : katalog.fragen;
  return menge[Math.floor(Math.random() * menge.length)];
}

/** @param {Frage} frage */
function zeigeFrage(frage) {
  aktuelleFrage = frage;
  anzeige.frageKennung.textContent = bezeichneFrage(katalog, frage);
  anzeige.frageText.textContent = frage.text;

  anzeige.optionen.replaceChildren(
    // Die Reihenfolge wechselt bei jeder Anzeige, damit sich der Anwender den
    // Inhalt merkt und nicht die Position. Der Original-Buchstabe bleibt sichtbar.
    ...mische(frage.optionen).map((option) => {
      const eintrag = document.createElement('li');
      const feld = document.createElement('label');
      feld.className = 'option';

      const kaestchen = document.createElement('input');
      // Bewusst immer Mehrfachauswahl: Ein an die Frage angepasstes Bedienelement
      // wuerde verraten, wie viele Optionen korrekt sind.
      kaestchen.type = 'checkbox';
      kaestchen.name = 'option';
      kaestchen.value = option.buchstabe;

      const buchstabe = document.createElement('span');
      buchstabe.className = 'option-buchstabe';
      buchstabe.textContent = `${option.buchstabe})`;

      const text = document.createElement('span');
      text.textContent = option.text;

      feld.append(kaestchen, buchstabe, text);
      eintrag.append(feld);
      return eintrag;
    }),
  );

  anzeige.formular.hidden = false;
  anzeige.abgeben.disabled = false;
  anzeige.rueckmeldung.hidden = true;
  anzeige.rueckmeldung.classList.remove('rueckmeldung--richtig', 'rueckmeldung--falsch');
  anzeige.uebung.hidden = false;
}

/** @returns {string[]} */
function gewaehlteBuchstaben() {
  const kaestchen = /** @type {NodeListOf<HTMLInputElement>} */ (
    anzeige.optionen.querySelectorAll('input[type="checkbox"]')
  );
  return [...kaestchen].filter((k) => k.checked).map((k) => k.value);
}

function werteAus() {
  if (!aktuelleFrage) return;
  const gewaehlt = gewaehlteBuchstaben();
  const bewertung = bewerteAntwort(aktuelleFrage, gewaehlt);
  const gewaehltMenge = new Set(gewaehlt);
  const korrektMenge = new Set(bewertung.korrekt);

  const kaestchen = /** @type {NodeListOf<HTMLInputElement>} */ (
    anzeige.optionen.querySelectorAll('input[type="checkbox"]')
  );
  for (const kaestchenEintrag of kaestchen) {
    kaestchenEintrag.disabled = true;
    const feld = /** @type {HTMLElement} */ (kaestchenEintrag.closest('.option'));
    const buchstabe = kaestchenEintrag.value;
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
 * @param {import('./antwort.js').Bewertung} bewertung
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
  zeigeFrage(naechsteFrage());
  window.scrollTo({ top: 0 });
});

try {
  katalog = await ladeKatalog();
  zeigeHerkunft();
  zeigeFrage(naechsteFrage());
} catch (fehler) {
  anzeige.ladefehler.textContent =
    'Der Fragenkatalog konnte nicht geladen werden. ' +
    'Bitte die Verbindung prüfen und die Seite neu laden.';
  anzeige.ladefehler.hidden = false;
  console.error(fehler);
}
