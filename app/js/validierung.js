/**
 * Die einzige Formatversion, die diese Anwendung lesen kann. Eine Aenderung am
 * Aufbau der Katalogdatei erhoeht sie, damit ein alter Bestand erkannt und nicht
 * still fehlinterpretiert wird.
 */
export const FORMATVERSION = 1;

/**
 * Was der Metadatenblock an bekannten Kennungen hergibt: die Wissensstufen und
 * die Zuordnung Lektion → Wissensstufe. Gegen dieses Verzeichnis werden die
 * Verweise der Fragen geprueft.
 * @typedef {object} Metadatenverzeichnis
 * @property {Set<string>} wissensstufen
 * @property {Map<string, string>} lektionen
 */

/**
 * @typedef {object} Verstoss
 * @property {string} code Maschinenlesbare Art des Verstosses, z. B. `"doppelte-kennung"`.
 * @property {string} fundstelle Fragenkennung oder Abschnitt, in dem der Verstoss steckt.
 * @property {string} meldung Lesbare Beschreibung.
 */

const BUCHSTABEN = 'abcdefghijklmnopqrstuvwxyz';

/** @param {unknown} wert */
const istText = (wert) => typeof wert === 'string' && wert.trim() !== '';

/**
 * Prueft Katalogdaten und liefert alle gefundenen Verstoesse. Sie ist der einzige
 * Schutz davor, dass ein Tippfehler unbemerkt in die Anwendung gelangt und der
 * Anwender falsche Antworten einuebt. Deshalb bricht sie nicht beim ersten Fund
 * ab und wirft auch bei voellig unbrauchbaren Daten keine Ausnahme.
 * @param {unknown} daten Ungeprueft, typischerweise frisch geparstes JSON.
 * @returns {Verstoss[]}
 */
export function pruefeKatalog(daten) {
  /** @type {Verstoss[]} */
  const verstoesse = [];
  /**
   * @param {string} code
   * @param {string} fundstelle
   * @param {string} meldung
   */
  const melde = (code, fundstelle, meldung) => verstoesse.push({ code, fundstelle, meldung });

  if (typeof daten !== 'object' || daten === null || Array.isArray(daten)) {
    melde('unbrauchbarer-bestand', 'katalog', 'Der Katalog ist kein Objekt.');
    return verstoesse;
  }
  const katalog = /** @type {Record<string, any>} */ (daten);

  if (katalog.formatVersion !== FORMATVERSION) {
    melde(
      'unbekannte-formatversion',
      'katalog',
      `Formatversion ${JSON.stringify(katalog.formatVersion)} statt ${FORMATVERSION}.`,
    );
  }

  const metadaten = pruefeMetadaten(katalog.metadaten, melde);

  if (!Array.isArray(katalog.fragen)) {
    melde('unbrauchbarer-bestand', 'fragen', 'Der Katalog enthält keine Liste von Fragen.');
    return verstoesse;
  }
  if (katalog.fragen.length === 0) {
    melde('unbrauchbarer-bestand', 'fragen', 'Der Katalog enthält keine Frage.');
  }

  /** @type {Set<string>} */
  const gesehene = new Set();
  katalog.fragen.forEach((frage, index) => {
    pruefeFrage(frage, index, gesehene, metadaten, melde);
  });

  return verstoesse;
}

/**
 * @param {unknown} rohdaten
 * @param {(code: string, fundstelle: string, meldung: string) => void} melde
 * @returns {Metadatenverzeichnis}
 */
function pruefeMetadaten(rohdaten, melde) {
  /** @type {Set<string>} */
  const wissensstufen = new Set();
  /** @type {Map<string, string>} */
  const lektionen = new Map();

  if (typeof rohdaten !== 'object' || rohdaten === null) {
    melde('fehlende-metadaten', 'metadaten', 'Der Metadatenblock fehlt.');
    return { wissensstufen, lektionen };
  }
  const metadaten = /** @type {Record<string, any>} */ (rohdaten);

  for (const feld of ['titel', 'herkunft', 'regelstand', 'regelnGueltigAb']) {
    if (!istText(metadaten[feld])) {
      melde('fehlende-metadaten', 'metadaten', `Das Metadatenfeld „${feld}“ fehlt oder ist leer.`);
    }
  }

  if (!Array.isArray(metadaten.wissensstufen) || metadaten.wissensstufen.length === 0) {
    melde('fehlende-metadaten', 'metadaten', 'Es ist keine Wissensstufe verzeichnet.');
  } else {
    for (const stufe of metadaten.wissensstufen) {
      if (!istText(stufe?.id) || !istText(stufe?.name) || typeof stufe?.reihenfolge !== 'number') {
        melde(
          'fehlende-metadaten',
          'metadaten',
          `Die Wissensstufe ${JSON.stringify(stufe?.id)} braucht Id, Anzeigename und Reihenfolge.`,
        );
        continue;
      }
      if (wissensstufen.has(stufe.id)) {
        melde('doppelte-kennung', 'metadaten', `Die Wissensstufe „${stufe.id}“ kommt mehrfach vor.`);
      }
      wissensstufen.add(stufe.id);
    }
  }

  if (!Array.isArray(metadaten.lektionen) || metadaten.lektionen.length === 0) {
    melde('fehlende-metadaten', 'metadaten', 'Es ist keine Lektion verzeichnet.');
  } else {
    for (const lektion of metadaten.lektionen) {
      if (!istText(lektion?.id) || !istText(lektion?.titel) || typeof lektion?.nummer !== 'number') {
        melde(
          'fehlende-metadaten',
          'metadaten',
          `Die Lektion ${JSON.stringify(lektion?.id)} braucht Id, Nummer und Titel.`,
        );
        continue;
      }
      if (lektionen.has(lektion.id)) {
        melde('doppelte-kennung', 'metadaten', `Die Lektion „${lektion.id}“ kommt mehrfach vor.`);
      }
      if (!wissensstufen.has(lektion.wissensstufe)) {
        melde(
          'unbekannte-wissensstufe',
          `metadaten/${lektion.id}`,
          `Die Lektion „${lektion.id}“ verweist auf die unbekannte Wissensstufe ` +
            `${JSON.stringify(lektion.wissensstufe)}.`,
        );
      }
      lektionen.set(lektion.id, lektion.wissensstufe);
    }
  }

  return { wissensstufen, lektionen };
}

/**
 * @param {unknown} rohdaten
 * @param {number} index
 * @param {Set<string>} gesehene
 * @param {Metadatenverzeichnis} metadaten
 * @param {(code: string, fundstelle: string, meldung: string) => void} melde
 */
function pruefeFrage(rohdaten, index, gesehene, metadaten, melde) {
  if (typeof rohdaten !== 'object' || rohdaten === null) {
    melde('unbrauchbarer-bestand', `fragen[${index}]`, 'Die Frage ist kein Objekt.');
    return;
  }
  const frage = /** @type {Record<string, any>} */ (rohdaten);
  const fundstelle = istText(frage.id) ? frage.id : `fragen[${index}]`;

  if (!istText(frage.id)) {
    melde('fehlende-kennung', fundstelle, 'Die Frage hat keine Kennung.');
  } else if (gesehene.has(frage.id)) {
    melde('doppelte-kennung', fundstelle, `Die Fragenkennung „${frage.id}“ kommt mehrfach vor.`);
  } else {
    gesehene.add(frage.id);
  }

  if (typeof frage.nummer !== 'number') {
    melde('fehlende-kennung', fundstelle, 'Die Frage hat keine Nummer.');
  }
  if (!istText(frage.text)) {
    melde('leerer-text', fundstelle, 'Der Fragetext ist leer.');
  }

  if (!metadaten.wissensstufen.has(frage.wissensstufe)) {
    melde(
      'unbekannte-wissensstufe',
      fundstelle,
      `Die Wissensstufe ${JSON.stringify(frage.wissensstufe)} steht nicht in den Metadaten.`,
    );
  }
  if (!metadaten.lektionen.has(frage.lektion)) {
    melde(
      'unbekannte-lektion',
      fundstelle,
      `Die Lektion ${JSON.stringify(frage.lektion)} steht nicht in den Metadaten.`,
    );
  } else if (metadaten.lektionen.get(frage.lektion) !== frage.wissensstufe) {
    melde(
      'lektion-fremder-wissensstufe',
      fundstelle,
      `Die Lektion „${frage.lektion}“ gehört zu einer anderen Wissensstufe als die Frage.`,
    );
  }

  if (!Array.isArray(frage.optionen)) {
    melde('zu-wenige-optionen', fundstelle, 'Die Frage hat keine Liste von Optionen.');
    return;
  }
  if (frage.optionen.length < 2) {
    melde(
      'zu-wenige-optionen',
      fundstelle,
      `Die Frage hat ${frage.optionen.length} statt mindestens zwei Optionen.`,
    );
  }

  frage.optionen.forEach((option, optionsindex) => {
    if (typeof option !== 'object' || option === null) {
      melde('unbrauchbarer-bestand', fundstelle, `Option ${optionsindex + 1} ist kein Objekt.`);
      return;
    }
    if (!istText(option.text)) {
      melde('leerer-text', fundstelle, `Der Text der Option ${optionsindex + 1} ist leer.`);
    }
    if (typeof option.korrekt !== 'boolean') {
      melde(
        'fehlendes-kennzeichen',
        fundstelle,
        `Option ${optionsindex + 1} ist weder als korrekt noch als nicht korrekt gekennzeichnet.`,
      );
    }
    if (option.buchstabe !== BUCHSTABEN[optionsindex]) {
      melde(
        'luecke-in-buchstabenfolge',
        fundstelle,
        `Option ${optionsindex + 1} trägt den Buchstaben ${JSON.stringify(option.buchstabe)} ` +
          `statt „${BUCHSTABEN[optionsindex]}“; die Folge läuft lückenlos ab „a“.`,
      );
    }
  });

  if (!frage.optionen.some((option) => option?.korrekt === true)) {
    melde('keine-korrekte-option', fundstelle, 'Keine Option ist als korrekt gekennzeichnet.');
  }
}
