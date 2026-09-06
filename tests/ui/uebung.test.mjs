// Uebungsansicht im Browser.
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

test('zeigt eine Frage mit mindestens zwei Optionen', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse);

  assert.ok((await seite.textContent('#frage-text'))?.trim().length, 'Fragetext ist leer');
  assert.ok((await seite.textContent('#frage-kennung'))?.trim().length, 'Fragekennung ist leer');
  assert.ok(await seite.isVisible('#abgeben'), '„Antwort abgeben" fehlt');

  const optionen = await seite.locator('#optionen .option').count();
  assert.ok(optionen >= 2, `nur ${optionen} Option(en) angezeigt`);
});

test('wertet eine abgegebene Antwort aus und bietet die naechste Frage an', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse);

  await seite.locator('#optionen .option').first().click();
  await seite.click('#abgeben');
  await seite.waitForSelector('#rueckmeldung:not([hidden])');

  const urteil = (await seite.textContent('#rueckmeldung-urteil'))?.trim();
  assert.ok(urteil === 'Richtig' || urteil === 'Falsch', `unerwartetes Urteil: ${urteil}`);
  assert.ok(await seite.isVisible('#weiter'), '„Nächste Frage" fehlt');
  assert.ok(!(await seite.isVisible('#abgeben')), '„Antwort abgeben" bleibt als tote Flaeche stehen');

  // Jede Option traegt nach der Auswertung eine Markierung und laesst sich
  // nicht mehr veraendern.
  const veraenderbar = await seite.locator('#optionen input:not([disabled])').count();
  assert.equal(veraenderbar, 0, 'Optionen sind nach der Auswertung noch veraenderbar');
});

test('zeigt die Zifferntasten am Desktop', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse, { geraet: DESKTOP });
  assert.ok(await seite.isVisible('#optionen .option-taste'), 'Zifferntaste fehlt am Desktop');
});

test('verbirgt die Zifferntasten auf Beruehrgeraeten', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse, { geraet: MOBIL });
  assert.ok(!(await seite.isVisible('#optionen .option-taste')), 'Zifferntaste erscheint auf dem Handy');
});

test('gibt keine Antwort ohne Auswahl ab', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse);

  assert.ok(
    await seite.locator('#abgeben').isDisabled(),
    '„Antwort abgeben" ist aktiv, obwohl nichts angekreuzt ist',
  );

  await seite.locator('#optionen .option').first().click();
  assert.ok(await seite.locator('#abgeben').isEnabled(), 'Knopf bleibt nach der Auswahl inaktiv');

  await seite.locator('#optionen .option').first().click();
  assert.ok(await seite.locator('#abgeben').isDisabled(), 'Knopf bleibt nach dem Abwaehlen aktiv');
});

test('nennt den Tastaturhinweis nur, wo er zutrifft', async () => {
  const handy = await oeffne(umgebung.browser, umgebung.adresse, { geraet: MOBIL });
  const aufDemHandy = (await handy.textContent('#antwort-formular .hinweis')) ?? '';
  assert.ok(aufDemHandy.includes('Mehrfachauswahl'), 'Mehrfachauswahl-Hinweis fehlt');
  assert.ok(!aufDemHandy.includes('Zifferntasten'), 'Desktop-Hinweis steht auf dem Handy');

  const rechner = await oeffne(umgebung.browser, umgebung.adresse, { geraet: DESKTOP });
  const amDesktop = (await rechner.textContent('#antwort-formular .hinweis')) ?? '';
  assert.ok(amDesktop.includes('Zifferntasten'), 'Desktop-Hinweis fehlt am Desktop');
});

/**
 * Beantwortet die aktuell angezeigte Frage falsch, damit sie zur
 * Problemfrage wird, und liefert ihren Text zur spaeteren Wiedererkennung.
 * @param {import('playwright').Page} seite
 * @returns {Promise<string>}
 */
async function beantworteFalsch(seite) {
  const text = (await seite.textContent('#frage-text'))?.trim() ?? '';
  const katalog = await seite.evaluate(async () => (await fetch('data/fragen.json')).json());
  const frage = katalog.fragen.find((/** @type {{ text: string }} */ kandidat) => kandidat.text.trim() === text);
  const falscheBuchstaben = new Set(
    frage.optionen.filter((/** @type {{ korrekt: boolean }} */ option) => !option.korrekt).map((/** @type {{ buchstabe: string }} */ option) => option.buchstabe),
  );
  const werte = await seite.locator('#optionen input[type="checkbox"]').evaluateAll((eingaben) =>
    eingaben.map((eingabe) => /** @type {HTMLInputElement} */ (eingabe).value),
  );
  const index = werte.findIndex((wert) => falscheBuchstaben.has(wert));
  await seite.locator('#optionen .option').nth(index).click();
  await seite.click('#abgeben');
  await seite.waitForSelector('#rueckmeldung:not([hidden])');
  return text;
}

test('fuehrt aus der Problemfragen-Liste gezielt zu genau dieser Frage', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse);
  const frageText = await beantworteFalsch(seite);

  await seite.evaluate(() => {
    window.location.hash = '#/lernfortschritt';
  });
  await seite.waitForSelector('.problemfrage-eintrag');

  const eintrag = seite.locator('.problemfrage-eintrag').filter({ hasText: frageText });
  assert.equal(await eintrag.count(), 1, 'Problemfrage erscheint nicht genau einmal in der Liste');
  await eintrag.click();

  await seite.waitForSelector('#ansicht-ueben:not([hidden])');
  assert.equal((await seite.textContent('#frage-text'))?.trim(), frageText, 'landet nicht auf derselben Frage');
});

test('nennt bis zu drei gewaehlte Lektionen namentlich in der Eingrenzung', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse);

  await seite.click('#eingrenzung-auswahl summary');
  await seite.locator('#eingrenzung-alle-lektionen').uncheck();
  await seite.locator('input[name="eingrenzung-lektion"][value="basiswissen-4"]').check();
  await seite.locator('input[name="eingrenzung-lektion"][value="basiswissen-1"]').check();
  await seite.locator('input[name="eingrenzung-lektion"][value="basiswissen-7"]').check();

  assert.equal(
    (await seite.textContent('#eingrenzung-zusammenfassung'))?.trim(),
    'Lektionen 1, 4, 7',
  );
});

test('faellt oberhalb von drei gewaehlten Lektionen auf die Anzahl zurueck', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse);

  await seite.click('#eingrenzung-auswahl summary');
  await seite.locator('#eingrenzung-alle-lektionen').uncheck();
  for (const nummer of [1, 2, 3, 4]) {
    await seite.locator(`input[name="eingrenzung-lektion"][value="basiswissen-${nummer}"]`).check();
  }

  assert.equal((await seite.textContent('#eingrenzung-zusammenfassung'))?.trim(), '4 Lektionen');
});

test('laesst die Frage im oberen Bildschirmdrittel beginnen', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse, { geraet: MOBIL });
  const kennung = await masse(seite, '#frage-kennung');
  assert.ok(kennung, 'Fragekennung fehlt');
  assert.ok(kennung.oben < 200, `Frage beginnt erst bei ${kennung.oben} px statt unter 200 px`);
});
