// Hash-Routing und Ansichtswechsel im Browser — bis hierher nur manuell
// abgenommen (siehe CLAUDE.md vor ADR-0005).
import test from 'node:test';
import assert from 'node:assert/strict';
import { starteUmgebung, oeffne } from './umgebung.mjs';

/** @type {Awaited<ReturnType<typeof starteUmgebung>>} */
let umgebung;

test.before(async () => {
  umgebung = await starteUmgebung();
});

test.after(async () => {
  await umgebung.schliesse();
});

/**
 * @param {import('playwright').Page} seite
 * @returns {Promise<string | null>} Die Id der einzigen sichtbaren Ansicht.
 */
function sichtbareAnsicht(seite) {
  return seite.evaluate(() => document.querySelector('.ansicht:not([hidden])')?.id ?? null);
}

for (const [fragment, ansicht] of [
  ['/ueben', 'ansicht-ueben'],
  ['/pruefung', 'ansicht-pruefung'],
  ['/lernfortschritt', 'ansicht-lernfortschritt'],
]) {
  test(`zeigt zu ${fragment} die passende Ansicht`, async () => {
    const seite = await oeffne(umgebung.browser, umgebung.adresse, { ansicht: fragment });
    assert.equal(await sichtbareAnsicht(seite), ansicht);
  });
}

test('faengt eine unbekannte Adresse mit der Einstiegsansicht auf', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse, { ansicht: '/gibtesnicht' });
  assert.equal(await sichtbareAnsicht(seite), 'ansicht-ueben');
  assert.equal(await seite.evaluate(() => window.location.hash), '#/ueben', 'Adresse wurde nicht nachgetragen');
});

test('wechselt die Ansicht ueber die Navigation und traegt sie in die Adresse ein', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse);

  await seite.click('.navigation a[data-ansicht="pruefung"]');
  await seite.waitForSelector('#ansicht-pruefung:not([hidden])');
  assert.equal(await seite.evaluate(() => window.location.hash), '#/pruefung');
  assert.equal(await sichtbareAnsicht(seite), 'ansicht-pruefung');

  await seite.click('#kopf-lernfortschritt');
  await seite.waitForSelector('#ansicht-lernfortschritt:not([hidden])');
  assert.equal(await seite.evaluate(() => window.location.hash), '#/lernfortschritt');
  assert.equal(await sichtbareAnsicht(seite), 'ansicht-lernfortschritt');
});

test('bringt die Zurueck-Geste zur vorigen Ansicht statt aus der Anwendung', async () => {
  const seite = await oeffne(umgebung.browser, umgebung.adresse);

  await seite.click('.navigation a[data-ansicht="pruefung"]');
  await seite.waitForSelector('#ansicht-pruefung:not([hidden])');

  await seite.goBack();
  await seite.waitForSelector('#ansicht-ueben:not([hidden])');
  assert.equal(await seite.evaluate(() => window.location.hash), '#/ueben');
  assert.equal(await sichtbareAnsicht(seite), 'ansicht-ueben');
});
