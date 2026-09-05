import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pruefeKatalog } from '../app/js/validierung.js';

/** Ein gueltiger Mindestkatalog; die Tests veraendern jeweils genau eine Stelle. */
function gueltigerKatalog() {
  return {
    formatVersion: 1,
    metadaten: {
      titel: 'Testkatalog',
      herkunft: 'Test',
      regelstand: '2025-06-16',
      regelnGueltigAb: '2025-07-01',
      wissensstufen: [{ id: 'basiswissen', name: 'Basiswissen', reihenfolge: 1 }],
      lektionen: [{ id: 'basiswissen-1', wissensstufe: 'basiswissen', nummer: 1, titel: 'Lektion' }],
    },
    fragen: [
      {
        id: 'basiswissen-1',
        wissensstufe: 'basiswissen',
        lektion: 'basiswissen-1',
        nummer: 1,
        text: 'Eine Frage?',
        optionen: [
          { buchstabe: 'a', text: 'Erste', korrekt: true },
          { buchstabe: 'b', text: 'Zweite', korrekt: false },
        ],
      },
      {
        id: 'basiswissen-2',
        wissensstufe: 'basiswissen',
        lektion: 'basiswissen-1',
        nummer: 2,
        text: 'Noch eine Frage?',
        optionen: [
          { buchstabe: 'a', text: 'Erste', korrekt: false },
          { buchstabe: 'b', text: 'Zweite', korrekt: true },
          { buchstabe: 'c', text: 'Dritte', korrekt: true },
        ],
      },
    ],
  };
}

/** @param {ReturnType<typeof pruefeKatalog>} verstoesse */
const codes = (verstoesse) => verstoesse.map((verstoss) => verstoss.code);

test('ein gueltiger Katalog liefert keine Verstoesse', () => {
  assert.deepEqual(pruefeKatalog(gueltigerKatalog()), []);
});

test('der ausgelieferte Katalog durchlaeuft die Validierung fehlerfrei', () => {
  const katalog = JSON.parse(readFileSync(new URL('../app/data/fragen.json', import.meta.url), 'utf8'));
  assert.deepEqual(pruefeKatalog(katalog), []);
});

test('doppelte Fragenkennungen werden erkannt', () => {
  const katalog = gueltigerKatalog();
  katalog.fragen[1].id = katalog.fragen[0].id;
  assert.ok(codes(pruefeKatalog(katalog)).includes('doppelte-kennung'));
});

test('weniger als zwei Optionen werden erkannt', () => {
  const katalog = gueltigerKatalog();
  katalog.fragen[0].optionen = [{ buchstabe: 'a', text: 'Einzig', korrekt: true }];
  assert.ok(codes(pruefeKatalog(katalog)).includes('zu-wenige-optionen'));
});

test('eine lueckenhafte Buchstabenfolge wird erkannt', () => {
  const katalog = gueltigerKatalog();
  katalog.fragen[0].optionen[1].buchstabe = 'c';
  assert.ok(codes(pruefeKatalog(katalog)).includes('luecke-in-buchstabenfolge'));
});

test('eine Buchstabenfolge, die nicht bei a beginnt, wird erkannt', () => {
  const katalog = gueltigerKatalog();
  katalog.fragen[0].optionen[0].buchstabe = 'b';
  katalog.fragen[0].optionen[1].buchstabe = 'c';
  assert.ok(codes(pruefeKatalog(katalog)).includes('luecke-in-buchstabenfolge'));
});

test('eine Frage ohne korrekte Option wird erkannt', () => {
  const katalog = gueltigerKatalog();
  katalog.fragen[0].optionen[0].korrekt = false;
  assert.ok(codes(pruefeKatalog(katalog)).includes('keine-korrekte-option'));
});

test('mehrere korrekte Optionen sind zulaessig', () => {
  const katalog = gueltigerKatalog();
  katalog.fragen[0].optionen[1].korrekt = true;
  assert.deepEqual(pruefeKatalog(katalog), []);
});

test('leere Texte werden erkannt', () => {
  const leererFragetext = gueltigerKatalog();
  leererFragetext.fragen[0].text = '   ';
  assert.ok(codes(pruefeKatalog(leererFragetext)).includes('leerer-text'));

  const leererOptionstext = gueltigerKatalog();
  leererOptionstext.fragen[0].optionen[0].text = '';
  assert.ok(codes(pruefeKatalog(leererOptionstext)).includes('leerer-text'));
});

test('eine unbekannte Wissensstufe wird erkannt', () => {
  const katalog = gueltigerKatalog();
  katalog.fragen[0].wissensstufe = 'aufbauwissen';
  assert.ok(codes(pruefeKatalog(katalog)).includes('unbekannte-wissensstufe'));
});

test('eine fehlende Lektion wird erkannt', () => {
  const katalog = gueltigerKatalog();
  katalog.fragen[0].lektion = 'basiswissen-7';
  assert.ok(codes(pruefeKatalog(katalog)).includes('unbekannte-lektion'));
});

test('eine Lektion einer anderen Wissensstufe wird erkannt', () => {
  const katalog = gueltigerKatalog();
  katalog.metadaten.wissensstufen.push({ id: 'aufbauwissen', name: 'Aufbauwissen', reihenfolge: 2 });
  katalog.fragen[0].wissensstufe = 'aufbauwissen';
  assert.ok(codes(pruefeKatalog(katalog)).includes('lektion-fremder-wissensstufe'));
});

test('fehlende Metadaten werden erkannt', () => {
  const ohneBlock = gueltigerKatalog();
  delete ohneBlock.metadaten;
  assert.ok(codes(pruefeKatalog(ohneBlock)).includes('fehlende-metadaten'));

  const ohneRegelstand = gueltigerKatalog();
  delete ohneRegelstand.metadaten.regelstand;
  assert.ok(codes(pruefeKatalog(ohneRegelstand)).includes('fehlende-metadaten'));

  const ohneWissensstufen = gueltigerKatalog();
  ohneWissensstufen.metadaten.wissensstufen = [];
  assert.ok(codes(pruefeKatalog(ohneWissensstufen)).includes('fehlende-metadaten'));

  const ohneLektionstitel = gueltigerKatalog();
  ohneLektionstitel.metadaten.lektionen[0].titel = '';
  assert.ok(codes(pruefeKatalog(ohneLektionstitel)).includes('fehlende-metadaten'));
});

test('eine fehlende oder unbekannte Formatversion wird erkannt', () => {
  const katalog = gueltigerKatalog();
  katalog.formatVersion = 2;
  assert.ok(codes(pruefeKatalog(katalog)).includes('unbekannte-formatversion'));
});

test('ein voellig unbrauchbarer Bestand fuehrt zu einem Verstoss statt zu einem Absturz', () => {
  assert.ok(pruefeKatalog(null).length > 0);
  assert.ok(pruefeKatalog({}).length > 0);
  assert.ok(pruefeKatalog({ formatVersion: 1, metadaten: {}, fragen: 'keine Liste' }).length > 0);
});

test('jeder Verstoss benennt Code, Fundstelle und eine lesbare Meldung', () => {
  const katalog = gueltigerKatalog();
  katalog.fragen[0].optionen[0].korrekt = false;
  const [verstoss] = pruefeKatalog(katalog);
  assert.equal(verstoss.code, 'keine-korrekte-option');
  assert.equal(verstoss.fundstelle, 'basiswissen-1');
  assert.match(verstoss.meldung, /\S/);
});
