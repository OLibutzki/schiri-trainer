// Pruefungsansicht im Browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { starteUmgebung, oeffne, masse, MOBIL, DESKTOP } from './umgebung.mjs';

/** @type {Awaited<ReturnType<typeof starteUmgebung>>} */
let umgebung;

test.before(async () => {
  umgebung = await starteUmgebung();
});

test.after(async () => {
  await umgebung.schliesse();
});

/**
 * Startet eine Pruefung ueber die Einrichtung und wartet, bis die erste Frage
 * steht.
 * @param {import('playwright').Page} seite
 * @param {string} umfang
 */
async function starte(seite, umfang = '10') {
  await seite.selectOption('#pruefung-fragenzahl', umfang);
  await seite.click('#pruefung-starten');
  await seite.waitForSelector('#pruefung-laufend:not([hidden])');
}

/**
 * Beantwortet die laufende Pruefung bis zum Ende, immer mit der ersten Option.
 * @param {import('playwright').Page} seite
 */
async function beantworteAlles(seite) {
  while (await seite.isVisible('#pruefung-laufend')) {
    // Der Fortschrittstext ist das Einzige, was sich nach jeder Antwort
    // zuverlaessig aendert: Die Ansicht bleibt bis zur letzten Frage dieselbe.
    const vorher = await seite.textContent('#pruefung-fortschritt');
    await seite.locator('#pruefung-optionen .option').first().click();
    await seite.click('#pruefung-abgeben');
    await seite.waitForFunction(
      (stand) =>
        document.getElementById('pruefung-ergebnis')?.hidden === false ||
        document.getElementById('pruefung-fortschritt')?.textContent !== stand,
      vorher,
    );
  }
  await seite.waitForSelector('#pruefung-ergebnis:not([hidden])');
}

test('startet eine Pruefung und zaehlt die Fragen mit', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse, { ansicht: '/pruefung' });
  assert.ok(await seite.isVisible('#pruefung-einrichtung'), 'Einrichtung fehlt');

  await starte(seite);
  assert.equal((await seite.textContent('#pruefung-fortschritt'))?.trim(), 'Frage 1 von 10');
  assert.ok(await seite.isVisible('#pruefung-abbrechen'), '„Prüfung abbrechen" fehlt');

  await seite.locator('#pruefung-optionen .option').first().click();
  await seite.click('#pruefung-abgeben');
  await seite.waitForFunction(
    () => document.getElementById('pruefung-fortschritt')?.textContent?.trim() === 'Frage 2 von 10',
  );
});

test('wertet eine vollstaendig beantwortete Pruefung aus', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse, { ansicht: '/pruefung' });
  await starte(seite);
  await beantworteAlles(seite);

  const punktzahl = (await seite.textContent('#pruefung-punktzahl')) ?? '';
  assert.match(punktzahl, /von 10 Fragen richtig beantwortet/);
  assert.ok(await seite.isVisible('#pruefung-neu'), '„Neue Prüfung" fehlt');
});

test('zeigt im Kopfbalken den Pruefungsfortschritt statt des Lernfortschritts', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse, { ansicht: '/pruefung' });

  await starte(seite);
  assert.equal((await seite.textContent('#kopf-anteil'))?.trim(), 'Frage 1 von 10');

  await seite.locator('#pruefung-optionen .option').first().click();
  await seite.click('#pruefung-abgeben');
  await seite.waitForFunction(
    () => document.getElementById('kopf-anteil')?.textContent?.trim() === 'Frage 2 von 10',
  );

  await beantworteAlles(seite);
  assert.match((await seite.textContent('#kopf-anteil')) ?? '', /%$/, 'zeigt nach Abschluss nicht wieder den Lernfortschritt');
});

test('laesst den Lernfortschritt von einer Pruefung unberuehrt', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse, { ansicht: '/pruefung' });
  const vorher = await seite.textContent('#kopf-anteil');

  await starte(seite);
  await beantworteAlles(seite);

  assert.equal(await seite.textContent('#kopf-anteil'), vorher, 'Lernfortschritt hat sich veraendert');
});

test('verschweigt die Eingrenzung nicht, zeigt aber keine ungefragte Zeile ohne Wissensstufen-Auswahl', async () => {
  // Der ausgelieferte Katalog kennt nur eine Wissensstufe: Die Pruefung laeuft
  // damit immer ohne Eingrenzung, und die Zusatzzeile bleibt entsprechend
  // verborgen (siehe beschreibePruefungsEingrenzung fuer den Fall mit
  // Eingrenzung, unit-getestet in tests/pruefung.test.mjs).
  const seite = await oeffne(umgebung.browser, umgebung.adresse, { ansicht: '/pruefung' });
  await starte(seite);
  assert.ok(!(await seite.isVisible('#pruefung-eingrenzung')), 'Eingrenzungszeile erscheint ohne Eingrenzung');
});

test('gibt keine Pruefungsantwort ohne Auswahl ab', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse, { ansicht: '/pruefung' });
  await starte(seite);
  assert.ok(
    await seite.locator('#pruefung-abgeben').isDisabled(),
    '„Antwort abgeben" ist aktiv, obwohl nichts angekreuzt ist',
  );
});

test('trennt „Pruefung abbrechen" von „Antwort abgeben"', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse, { ansicht: '/pruefung', geraet: MOBIL });
  await starte(seite);

  const abgeben = await masse(seite, '#pruefung-abgeben');
  const abbrechen = await masse(seite, '#pruefung-abbrechen');
  assert.ok(abgeben && abbrechen, 'eine der beiden Schaltflaechen fehlt');

  const abstand = abbrechen.oben - abgeben.unten;
  assert.ok(abstand >= 16, `nur ${abstand} px zwischen Abgeben und Abbrechen`);
});

test('haelt die Beruehrziel-Groesse in der Pruefungseinrichtung ein', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse, { ansicht: '/pruefung', geraet: MOBIL });

  const umfang = await masse(seite, '#pruefung-fragenzahl');
  assert.ok(umfang, 'Auswahlfeld fuer den Umfang fehlt');
  assert.ok(umfang.hoehe >= 44, `Auswahlfeld ist nur ${umfang.hoehe} px hoch`);

  const starten = await masse(seite, '#pruefung-starten');
  assert.ok(starten, '„Prüfung starten" fehlt');
  assert.ok(
    umfang.breite >= starten.breite * 0.9,
    `Auswahlfeld ist nur ${umfang.breite} px breit, der Knopf darunter ${starten.breite} px`,
  );
});

test('nennt den Tastaturhinweis auch in der Pruefung nur, wo er zutrifft', async () => {
  const handy = await oeffne(umgebung.browser, umgebung.adresse, { ansicht: '/pruefung', geraet: MOBIL });
  await starte(handy);
  const aufDemHandy = (await handy.textContent('#pruefung-formular .hinweis')) ?? '';
  assert.ok(aufDemHandy.includes('Mehrfachauswahl'), 'Mehrfachauswahl-Hinweis fehlt');
  assert.ok(!aufDemHandy.includes('Zifferntasten'), 'Desktop-Hinweis steht auf dem Handy');

  const rechner = await oeffne(umgebung.browser, umgebung.adresse, { ansicht: '/pruefung', geraet: DESKTOP });
  await starte(rechner);
  const amDesktop = (await rechner.textContent('#pruefung-formular .hinweis')) ?? '';
  assert.ok(amDesktop.includes('Zifferntasten'), 'Desktop-Hinweis fehlt am Desktop');
});

test('zeigt das Pruefungsergebnis auch nach einem Neuladen', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse, { ansicht: '/pruefung' });
  await starte(seite);
  await beantworteAlles(seite);
  const punktzahl = await seite.textContent('#pruefung-punktzahl');

  await seite.reload();
  await seite.waitForFunction(() => document.querySelectorAll('.ansicht:not([hidden])').length === 1);

  assert.ok(await seite.isVisible('#pruefung-ergebnis'), 'Ergebnis ist nach dem Neuladen verschwunden');
  assert.equal(await seite.textContent('#pruefung-punktzahl'), punktzahl, 'Punktzahl weicht ab');
});
