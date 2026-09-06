import test from 'node:test';
import assert from 'node:assert/strict';
import { erzeugeLernEngine, LERN_KONSTANTEN, LEERE_EINGRENZUNG, istEingegrenzt } from '../app/js/lernengine.js';
import { arbeitsspeicher, leseLernstand } from '../app/js/lernstand.js';

// Die Tests treiben die Engine ueber ihre Schnittstelle. Ausnahme sind drei
// Zusicherungen, die sich ueber sie nicht ausdruecken lassen: dass je
// Fragenkennung statt als Gesamtzahl gespeichert wird, und wie die Engine auf
// einen vorgefundenen Bestand mit unbekannter Formatversion oder unbekannter
// Fragenkennung reagiert. Sie greifen bewusst auf die Speicherdarstellung zu.

const TAG = 24 * 60 * 60 * 1000;

/**
 * Ein Katalog mit `anzahl` Fragen, verteilt auf zwei Lektionen.
 * Jede Frage hat genau eine korrekte Option: `a`.
 * @param {number} anzahl
 */
function katalogMit(anzahl) {
  return {
    formatVersion: 1,
    metadaten: {
      titel: 'Testkatalog',
      herkunft: 'Test',
      regelstand: '2025-06-16',
      regelnGueltigAb: '2025-07-01',
      wissensstufen: [{ id: 'basiswissen', name: 'Basiswissen', reihenfolge: 1 }],
      lektionen: [
        { id: 'basiswissen-1', wissensstufe: 'basiswissen', nummer: 1, titel: 'Erste' },
        { id: 'basiswissen-2', wissensstufe: 'basiswissen', nummer: 2, titel: 'Zweite' },
      ],
    },
    fragen: Array.from({ length: anzahl }, (_, i) => ({
      id: `basiswissen-${i + 1}`,
      wissensstufe: 'basiswissen',
      lektion: i < Math.ceil(anzahl / 2) ? 'basiswissen-1' : 'basiswissen-2',
      nummer: i + 1,
      text: `Frage ${i + 1}?`,
      optionen: [
        { buchstabe: 'a', text: 'richtig', korrekt: true },
        { buchstabe: 'b', text: 'falsch', korrekt: false },
      ],
    })),
  };
}

/** Eine feste Zufallsfolge, damit Haeufigkeiten reproduzierbar sind. */
function festerZufall(saat = 1) {
  let zustand = saat;
  return () => {
    zustand = (zustand * 1103515245 + 12345) % 2147483648;
    return zustand / 2147483648;
  };
}

/**
 * @param {object} [vorgaben]
 * @param {number} [vorgaben.fragen]
 * @param {() => number} [vorgaben.uhr]
 * @param {() => number} [vorgaben.zufall]
 * @param {import('../app/js/lernstand.js').Speicher} [vorgaben.speicher]
 */
function engineMit({ fragen = 4, uhr = () => 0, zufall = festerZufall(), speicher = arbeitsspeicher() } = {}) {
  const katalog = katalogMit(fragen);
  return { katalog, speicher, engine: erzeugeLernEngine({ katalog, speicher, uhr, zufall }) };
}

/**
 * Zaehlt, wie oft jede Frage in `laeufe` Ziehungen gewaehlt wird. Es wird dabei
 * nicht geantwortet, der Lernstand bleibt also unveraendert.
 * @param {ReturnType<typeof erzeugeLernEngine>} engine
 * @param {number} laeufe
 * @returns {Record<string, number>}
 */
function haeufigkeiten(engine, laeufe) {
  /** @type {Record<string, number>} */
  const zaehler = {};
  for (let i = 0; i < laeufe; i += 1) {
    const frage = engine.naechsteFrage();
    assert.ok(frage, 'es sollte eine Frage gezogen werden');
    zaehler[frage.id] = (zaehler[frage.id] ?? 0) + 1;
  }
  return zaehler;
}

test('eine nie gestellte Frage wird gegenueber einer beantworteten bevorzugt', () => {
  const { katalog, engine } = engineMit({ fragen: 4 });
  engine.beantworte(katalog.fragen[0], ['a']);
  engine.beantworte(katalog.fragen[1], ['b']);
  const zaehler = haeufigkeiten(engine, 4000);
  assert.ok(
    (zaehler['basiswissen-3'] ?? 0) > (zaehler['basiswissen-2'] ?? 0),
    `nie gestellt sollte haeufiger sein: ${JSON.stringify(zaehler)}`,
  );
});

test('eine nicht gemeisterte Frage wird gegenueber einer gemeisterten bevorzugt', () => {
  const { katalog, engine } = engineMit({ fragen: 3 });
  for (let i = 0; i < LERN_KONSTANTEN.MEISTER_SCHWELLE; i += 1) engine.beantworte(katalog.fragen[0], ['a']);
  engine.beantworte(katalog.fragen[1], ['b']);
  engine.beantworte(katalog.fragen[2], ['a']);
  const zaehler = haeufigkeiten(engine, 4000);
  assert.ok(
    (zaehler['basiswissen-2'] ?? 0) > (zaehler['basiswissen-1'] ?? 0),
    `nicht gemeistert sollte haeufiger sein: ${JSON.stringify(zaehler)}`,
  );
});

test('eine gemeisterte Frage steigt mit der Zeit wieder in der Auswahl', () => {
  let jetzt = 0;
  const speicher = arbeitsspeicher();
  const katalog = katalogMit(3);
  const bauen = () => erzeugeLernEngine({ katalog, speicher, uhr: () => jetzt, zufall: festerZufall(7) });

  const vorbereiten = bauen();
  for (const frage of katalog.fragen) {
    for (let i = 0; i < LERN_KONSTANTEN.MEISTER_SCHWELLE; i += 1) vorbereiten.beantworte(frage, ['a']);
  }
  // Frage 1 liegt anschliessend zehn Tage laenger zurueck als die uebrigen.
  jetzt = 10 * TAG;
  vorbereiten.beantworte(katalog.fragen[1], ['a']);
  vorbereiten.beantworte(katalog.fragen[2], ['a']);

  const zaehler = haeufigkeiten(bauen(), 4000);
  assert.ok(
    (zaehler['basiswissen-1'] ?? 0) > (zaehler['basiswissen-2'] ?? 0),
    `die aeltere Frage sollte haeufiger sein: ${JSON.stringify(zaehler)}`,
  );
});

test('der Zeitfaktor haelt eine gemeisterte Frage unter einer nicht gemeisterten', () => {
  let jetzt = 0;
  const speicher = arbeitsspeicher();
  const katalog = katalogMit(3);
  const bauen = () => erzeugeLernEngine({ katalog, speicher, uhr: () => jetzt, zufall: festerZufall(3) });

  const vorbereiten = bauen();
  for (let i = 0; i < LERN_KONSTANTEN.MEISTER_SCHWELLE; i += 1) vorbereiten.beantworte(katalog.fragen[0], ['a']);
  vorbereiten.beantworte(katalog.fragen[1], ['b']);
  vorbereiten.beantworte(katalog.fragen[2], ['b']);

  // Selbst nach Jahren bleibt die gemeisterte Frage hinter den ungemeisterten.
  jetzt = 3650 * TAG;
  const zaehler = haeufigkeiten(bauen(), 4000);
  assert.ok(
    (zaehler['basiswissen-2'] ?? 0) > (zaehler['basiswissen-1'] ?? 0),
    `die Obergrenze sollte greifen: ${JSON.stringify(zaehler)}`,
  );
});

test('die zuletzt gestellte Frage wird nicht unmittelbar erneut gewaehlt', () => {
  const { engine } = engineMit({ fragen: 5 });
  let vorige = engine.naechsteFrage();
  for (let i = 0; i < 200; i += 1) {
    const naechste = engine.naechsteFrage();
    assert.ok(naechste);
    assert.notEqual(naechste.id, vorige?.id);
    vorige = naechste;
  }
});

test('bei nur einer Frage im Katalog wird eben diese erneut gestellt', () => {
  const { engine } = engineMit({ fragen: 1 });
  assert.equal(engine.naechsteFrage()?.id, 'basiswissen-1');
  assert.equal(engine.naechsteFrage()?.id, 'basiswissen-1');
});

test('ein leerer Katalog liefert keine Frage statt eines Fehlers', () => {
  const { engine } = engineMit({ fragen: 0 });
  assert.equal(engine.naechsteFrage(), null);
  assert.equal(engine.lernfortschritt().anteil, 0);
});

test('eine Frage gilt erst nach mehrfach ununterbrochen richtiger Antwort als gemeistert', () => {
  const { katalog, engine } = engineMit();
  const frage = katalog.fragen[0];
  for (let i = 1; i < LERN_KONSTANTEN.MEISTER_SCHWELLE; i += 1) {
    engine.beantworte(frage, ['a']);
    assert.equal(engine.istGemeistert(frage.id), false);
  }
  engine.beantworte(frage, ['a']);
  assert.equal(engine.istGemeistert(frage.id), true);
});

test('eine falsche Antwort setzt die Folge zurueck und macht die Frage zur Problemfrage', () => {
  const { katalog, engine } = engineMit();
  const frage = katalog.fragen[0];
  for (let i = 0; i < LERN_KONSTANTEN.MEISTER_SCHWELLE; i += 1) engine.beantworte(frage, ['a']);
  assert.equal(engine.istGemeistert(frage.id), true);

  engine.beantworte(frage, ['b']);
  assert.equal(engine.istGemeistert(frage.id), false);
  assert.deepEqual(
    engine.problemfragen().map((problem) => problem.id),
    [frage.id],
  );
});

test('eine gemeisterte Problemfrage zaehlt nicht mehr als Problemfrage', () => {
  const { katalog, engine } = engineMit();
  const frage = katalog.fragen[0];
  engine.beantworte(frage, ['b']);
  assert.equal(engine.problemfragen().length, 1);
  for (let i = 0; i < LERN_KONSTANTEN.MEISTER_SCHWELLE; i += 1) engine.beantworte(frage, ['a']);
  assert.equal(engine.problemfragen().length, 0);
});

test('eine Teilmenge der korrekten Optionen gilt als falsche Antwort', () => {
  const katalog = katalogMit(2);
  katalog.fragen[0].optionen[1].korrekt = true;
  const engine = erzeugeLernEngine({
    katalog,
    speicher: arbeitsspeicher(),
    uhr: () => 0,
    zufall: festerZufall(),
  });
  assert.equal(engine.beantworte(katalog.fragen[0], ['a']).richtig, false);
  assert.equal(engine.beantworte(katalog.fragen[0], ['a', 'b']).richtig, true);
});

test('alle korrekten Optionen plus eine falsche gelten als falsche Antwort', () => {
  const katalog = katalogMit(2);
  katalog.fragen[0].optionen.push({ buchstabe: 'c', text: 'auch falsch', korrekt: false });
  const engine = erzeugeLernEngine({
    katalog,
    speicher: arbeitsspeicher(),
    uhr: () => 0,
    zufall: festerZufall(),
  });
  assert.equal(engine.beantworte(katalog.fragen[0], ['a', 'c']).richtig, false);
  assert.deepEqual(engine.problemfragen().map((frage) => frage.id), ['basiswissen-1']);
});

test('beantworte liefert die Bewertung der Antwort', () => {
  const { katalog, engine } = engineMit();
  const bewertung = engine.beantworte(katalog.fragen[0], ['b']);
  assert.equal(bewertung.richtig, false);
  assert.deepEqual(bewertung.korrekt, ['a']);
  assert.deepEqual(bewertung.zuUnrecht, ['b']);
});

test('der Lernfortschritt wird je Fragenkennung gespeichert und ueberlebt einen Neustart', () => {
  const speicher = arbeitsspeicher();
  const { katalog, engine } = engineMit({ speicher });
  for (let i = 0; i < LERN_KONSTANTEN.MEISTER_SCHWELLE; i += 1) engine.beantworte(katalog.fragen[0], ['a']);

  const eintraege = leseLernstand(speicher).eintraege;
  assert.deepEqual(Object.keys(eintraege), ['basiswissen-1']);

  const neu = erzeugeLernEngine({ katalog, speicher, uhr: () => 0, zufall: festerZufall() });
  assert.equal(neu.istGemeistert('basiswissen-1'), true);
  assert.equal(neu.lernfortschritt().gemeistert, 1);
});

test('ein Bestand mit unbekannter Formatversion fuehrt zu einem leeren Lernfortschritt', () => {
  const katalog = katalogMit(4);
  const speicher = arbeitsspeicher(JSON.stringify({ formatVersion: 999, eintraege: {} }));
  const engine = erzeugeLernEngine({ katalog, speicher, uhr: () => 0, zufall: festerZufall() });
  assert.equal(engine.lernstandVerworfen, true);
  assert.equal(engine.lernfortschritt().gemeistert, 0);
});

test('Lernfortschritt zu einer unbekannten Fragenkennung stoert die Auswertung nicht', () => {
  const katalog = katalogMit(4);
  const speicher = arbeitsspeicher(
    JSON.stringify({
      formatVersion: 1,
      eintraege: {
        'basiswissen-1': { folge: LERN_KONSTANTEN.MEISTER_SCHWELLE, falsch: 0, zuletzt: 0 },
        'aufbauwissen-99': { folge: 0, falsch: 3, zuletzt: 0 },
      },
    }),
  );
  const engine = erzeugeLernEngine({ katalog, speicher, uhr: () => 0, zufall: festerZufall() });
  assert.deepEqual(engine.lernfortschritt(), { gesamt: 4, gemeistert: 1, anteil: 0.25 });
  assert.deepEqual(engine.problemfragen(), []);
});

test('der Lernfortschritt wird je Wissensstufe und je Lektion aufgeschluesselt', () => {
  const { katalog, engine } = engineMit({ fragen: 4 });
  for (let i = 0; i < LERN_KONSTANTEN.MEISTER_SCHWELLE; i += 1) engine.beantworte(katalog.fragen[0], ['a']);

  assert.deepEqual(engine.lernfortschrittJeWissensstufe(), [
    { id: 'basiswissen', name: 'Basiswissen', gesamt: 4, gemeistert: 1, anteil: 0.25 },
  ]);
  assert.deepEqual(engine.lernfortschrittJeLektion(), [
    { id: 'basiswissen-1', name: 'Lektion 1: Erste', gesamt: 2, gemeistert: 1, anteil: 0.5 },
    { id: 'basiswissen-2', name: 'Lektion 2: Zweite', gesamt: 2, gemeistert: 0, anteil: 0 },
  ]);
});

test('eine Eingrenzung auf eine Lektion laesst nur deren Fragen zu', () => {
  const { engine } = engineMit({ fragen: 4 });
  engine.setzeEingrenzung({ wissensstufen: [], lektionen: ['basiswissen-1'], nurProblemfragen: false });
  for (let i = 0; i < 200; i += 1) {
    const frage = engine.naechsteFrage();
    assert.ok(frage);
    assert.equal(frage.lektion, 'basiswissen-1');
  }
});

test('eine Eingrenzung auf eine Wissensstufe laesst nur deren Fragen zu', () => {
  const { katalog, engine } = engineMit({ fragen: 4 });
  katalog.metadaten.wissensstufen.push({ id: 'aufbauwissen', name: 'Aufbauwissen', reihenfolge: 2 });
  katalog.fragen[3].wissensstufe = 'aufbauwissen';
  engine.setzeEingrenzung({ wissensstufen: ['basiswissen'], lektionen: [], nurProblemfragen: false });
  for (let i = 0; i < 200; i += 1) {
    assert.notEqual(engine.naechsteFrage()?.id, 'basiswissen-4');
  }
});

test('eine Eingrenzung auf Problemfragen laesst nur diese zu', () => {
  const { katalog, engine } = engineMit({ fragen: 4 });
  engine.beantworte(katalog.fragen[0], ['b']);
  engine.setzeEingrenzung({ wissensstufen: [], lektionen: [], nurProblemfragen: true });
  for (let i = 0; i < 50; i += 1) {
    assert.equal(engine.naechsteFrage()?.id, 'basiswissen-1');
  }
});

test('Wissensstufe und Lektion kombiniert wirken als Schnittmenge', () => {
  const { katalog, engine } = engineMit({ fragen: 4 });
  katalog.metadaten.wissensstufen.push({ id: 'aufbauwissen', name: 'Aufbauwissen', reihenfolge: 2 });
  katalog.metadaten.lektionen.push({ id: 'aufbauwissen-1', wissensstufe: 'aufbauwissen', nummer: 1, titel: 'Dritte' });
  katalog.fragen[3].wissensstufe = 'aufbauwissen';
  katalog.fragen[3].lektion = 'aufbauwissen-1';
  // Wissensstufe "basiswissen" liesse ohne weitere Einschraenkung die Fragen
  // 1-3 zu; die zusaetzliche Lektionseingrenzung auf "basiswissen-1" (Fragen 1
  // und 2) schliesst Frage 3 aus der Schnittmenge aus.
  engine.setzeEingrenzung({
    wissensstufen: ['basiswissen'],
    lektionen: ['basiswissen-1'],
    nurProblemfragen: false,
  });
  const gesehen = new Set();
  for (let i = 0; i < 200; i += 1) gesehen.add(engine.naechsteFrage()?.id);
  assert.deepEqual(gesehen, new Set(['basiswissen-1', 'basiswissen-2']));
});

test('Nur-Problemfragen wirkt zusaetzlich innerhalb der Wissensstufen-/Lektionseingrenzung', () => {
  const { katalog, engine } = engineMit({ fragen: 4 });
  engine.beantworte(katalog.fragen[0], ['b']); // basiswissen-1, Lektion 1, ist Problemfrage
  engine.beantworte(katalog.fragen[2], ['b']); // basiswissen-3, Lektion 2, ist Problemfrage
  engine.setzeEingrenzung({ wissensstufen: [], lektionen: ['basiswissen-1'], nurProblemfragen: true });
  for (let i = 0; i < 50; i += 1) {
    assert.equal(engine.naechsteFrage()?.id, 'basiswissen-1');
  }
});

test('eine leere Kandidatenmenge unter Eingrenzung liefert keine Frage statt eines Fehlers', () => {
  const { engine } = engineMit({ fragen: 4 });
  engine.setzeEingrenzung({ wissensstufen: [], lektionen: [], nurProblemfragen: true });
  assert.equal(engine.naechsteFrage(), null);
});

test('eine einelementige Kandidatenmenge unter Eingrenzung wird wiederholt gestellt', () => {
  // katalogMit(3) legt Frage 3 allein in Lektion 2 (siehe katalogMit).
  const { engine } = engineMit({ fragen: 3 });
  engine.setzeEingrenzung({ wissensstufen: [], lektionen: ['basiswissen-2'], nurProblemfragen: false });
  assert.equal(engine.naechsteFrage()?.id, 'basiswissen-3');
  assert.equal(engine.naechsteFrage()?.id, 'basiswissen-3');
});

test('eine leere Eingrenzung laesst den gesamten Katalog zu', () => {
  const { engine } = engineMit({ fragen: 4 });
  assert.equal(istEingegrenzt(engine.eingrenzung()), false);
  const gesehen = new Set();
  for (let i = 0; i < 200; i += 1) gesehen.add(engine.naechsteFrage()?.id);
  assert.ok(gesehen.has('basiswissen-3') || gesehen.has('basiswissen-4'));
});

test('das Aufheben einer Eingrenzung gibt wieder den gesamten Katalog frei', () => {
  const { engine } = engineMit({ fragen: 4 });
  engine.setzeEingrenzung({ wissensstufen: [], lektionen: ['basiswissen-1'], nurProblemfragen: false });
  engine.naechsteFrage();
  engine.setzeEingrenzung(LEERE_EINGRENZUNG);
  assert.equal(istEingegrenzt(engine.eingrenzung()), false);
  const gesehen = new Set();
  for (let i = 0; i < 200; i += 1) gesehen.add(engine.naechsteFrage()?.id);
  assert.ok(gesehen.has('basiswissen-3') || gesehen.has('basiswissen-4'));
});

test('istZugelassen meldet, ob eine Frage innerhalb der aktuellen Eingrenzung liegt', () => {
  const { engine } = engineMit({ fragen: 4 });
  engine.setzeEingrenzung({ wissensstufen: [], lektionen: ['basiswissen-1'], nurProblemfragen: false });
  assert.equal(engine.istZugelassen('basiswissen-1'), true);
  assert.equal(engine.istZugelassen('basiswissen-2'), true);
  assert.equal(engine.istZugelassen('basiswissen-3'), false);
});

test('istZugelassen folgt einer geaenderten Eingrenzung sofort', () => {
  const { engine } = engineMit({ fragen: 4 });
  assert.equal(engine.istZugelassen('basiswissen-3'), true);
  engine.setzeEingrenzung({ wissensstufen: [], lektionen: ['basiswissen-1'], nurProblemfragen: false });
  assert.equal(engine.istZugelassen('basiswissen-3'), false);
});

test('Zuruecksetzen loescht den Lernfortschritt dauerhaft', () => {
  const speicher = arbeitsspeicher();
  const { katalog, engine } = engineMit({ speicher });
  engine.beantworte(katalog.fragen[0], ['b']);
  engine.setzeZurueck();

  assert.deepEqual(engine.problemfragen(), []);
  assert.equal(engine.lernfortschritt().gemeistert, 0);
  assert.deepEqual(leseLernstand(speicher).eintraege, {});
});
