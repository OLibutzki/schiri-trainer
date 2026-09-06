#!/usr/bin/env node
// Duenne Huelle um die Testumgebung: legt Bildschirmfotos aller Ansichten in
// Mobil- und Desktopbreite ab und gibt die Masse der Elemente aus, an denen
// Anordnungsfragen haengen. Kein Test — ein Werkzeug fuer Durchsichten, bei
// denen man sehen statt zusichern will.
//
//   npm run ui-bilder [-- <zielverzeichnis>]
//
// Ohne Angabe landen die Bilder in `.ui-bilder/` im Projektverzeichnis; der
// Ordner ist in .gitignore und gehoert nicht ins Repo.
import fs from 'node:fs';
import path from 'node:path';
import { starteUmgebung, oeffne, masse, MOBIL, DESKTOP } from '../tests/ui/umgebung.mjs';

const ZIEL = path.resolve(process.argv[2] ?? '.ui-bilder');
fs.mkdirSync(ZIEL, { recursive: true });

const umgebung = await starteUmgebung();

/**
 * @param {import('playwright').Page} seite
 * @param {string} name
 * @param {boolean} [ganzeSeite]
 */
async function foto(seite, name, ganzeSeite = false) {
  const datei = path.join(ZIEL, `${name}.png`);
  await seite.screenshot({ path: datei, fullPage: ganzeSeite });
  return datei;
}

/**
 * @param {import('playwright').Page} seite
 * @param {Record<string, string>} selektoren
 */
async function vermesse(seite, selektoren) {
  /** @type {Record<string, unknown>} */
  const werte = {};
  for (const [name, selektor] of Object.entries(selektoren)) {
    werte[name] = await masse(seite, selektor);
  }
  return werte;
}

/** @type {Record<string, unknown>} */
const bericht = {};

// --- Uebungsansicht, Handy: die Fluchtlinie vor der Frage ---
const ueben = await oeffne(umgebung.browser, umgebung.adresse, { geraet: MOBIL });
await foto(ueben, '01-ueben-mobil');
bericht.uebenMobil = {
  ...(await vermesse(ueben, {
    ueberschrift: '.kopf h1',
    kopfLernfortschritt: '.kopf-lernfortschritt',
    navigation: '.navigation',
    eingrenzung: '#eingrenzung-auswahl',
    frageKennung: '#frage-kennung',
    abgeben: '#abgeben',
  })),
  hinweis: (await ueben.textContent('#antwort-formular .hinweis'))?.trim(),
  zifferntasteSichtbar: await ueben.isVisible('#optionen .option-taste'),
};

// --- Uebungsansicht nach der Auswertung: wohin die Hauptaktion wandert ---
await ueben.locator('#optionen .option').first().click();
await ueben.click('#abgeben');
await ueben.waitForSelector('#rueckmeldung:not([hidden])');
await foto(ueben, '02-ueben-rueckmeldung-mobil', true);
bericht.nachAbgabe = await vermesse(ueben, {
  abgeben: '#abgeben',
  urteil: '#rueckmeldung-urteil',
  weiter: '#weiter',
});

// --- Eingrenzung aufgeklappt ---
await ueben.click('#weiter');
await ueben.click('#eingrenzung-auswahl summary');
await foto(ueben, '03-eingrenzung-offen-mobil', true);

// --- Pruefung: Einrichtung und laufender Durchgang ---
const pruefung = await oeffne(umgebung.browser, umgebung.adresse, { ansicht: '/pruefung', geraet: MOBIL });
await foto(pruefung, '04-pruefung-einrichtung-mobil');
bericht.pruefungEinrichtung = await vermesse(pruefung, {
  umfang: '#pruefung-fragenzahl',
  starten: '#pruefung-starten',
});

await pruefung.click('#pruefung-starten');
await pruefung.waitForSelector('#pruefung-laufend:not([hidden])');
await foto(pruefung, '05-pruefung-laufend-mobil', true);
const abgeben = await masse(pruefung, '#pruefung-abgeben');
const abbrechen = await masse(pruefung, '#pruefung-abbrechen');
bericht.pruefungLaufend = {
  abgeben,
  abbrechen,
  abstand: abgeben && abbrechen ? abbrechen.oben - abgeben.unten : null,
  fortschritt: (await pruefung.textContent('#pruefung-fortschritt'))?.trim(),
};

// --- Lernfortschritt ---
const lernfortschritt = await oeffne(umgebung.browser, umgebung.adresse, {
  ansicht: '/lernfortschritt',
  geraet: MOBIL,
});
await foto(lernfortschritt, '06-lernfortschritt-mobil', true);

// --- Desktopbreite ---
const desktop = await oeffne(umgebung.browser, umgebung.adresse, { geraet: DESKTOP });
await foto(desktop, '07-ueben-desktop');
bericht.uebenDesktop = {
  ...(await vermesse(desktop, { frageKennung: '#frage-kennung' })),
  zifferntasteSichtbar: await desktop.isVisible('#optionen .option-taste'),
};

await umgebung.schliesse();

console.log(JSON.stringify(bericht, null, 2));
console.log(`\nBilder in ${ZIEL}`);
