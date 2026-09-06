// Gemeinsame Umgebung der UI-Tests: ein statischer Server ueber `app/` und ein
// Browser, beide je Testdatei einmal hochgezogen. Bewusst ohne Playwrights
// eigenen Testrunner — im Repo laeuft alles unter `node --test` (ADR-0005),
// deshalb gibt es hier weder eine playwright.config noch Fixtures, sondern
// nur diese beiden Hilfen.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'app');

const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

/**
 * Die Masse der Mobilansicht, an denen die Abnahmekriterien haengen: ein
 * schmales Geraet mit Beruehrbedienung, damit `@media (hover: hover)` greift
 * wie auf einem echten Handy.
 */
export const MOBIL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

/** Eine Desktopbreite, auf der die Zifferntasten sichtbar sein muessen. */
export const DESKTOP = { viewport: { width: 1280, height: 900 } };

/**
 * Liefert `app/` ueber HTTP aus. Ueber `file://` ginge es nicht: Der Katalog
 * wird per `fetch` geladen und der Service Worker braucht einen Ursprung.
 * Port 0 laesst das Betriebssystem einen freien waehlen, damit parallel
 * laufende Testdateien sich nicht in die Quere kommen.
 * @returns {Promise<{ adresse: string, schliesse: () => Promise<void> }>}
 */
export async function starteServer() {
  const server = http.createServer((anfrage, antwort) => {
    const pfad = decodeURIComponent((anfrage.url ?? '/').split('?')[0].split('#')[0]);
    const datei = path.join(WURZEL, pfad === '/' ? 'index.html' : pfad);
    if (!datei.startsWith(WURZEL) || !fs.existsSync(datei) || fs.statSync(datei).isDirectory()) {
      antwort.writeHead(404);
      antwort.end('nicht gefunden');
      return;
    }
    antwort.writeHead(200, { 'content-type': TYPEN[path.extname(datei)] ?? 'application/octet-stream' });
    antwort.end(fs.readFileSync(datei));
  });

  await new Promise((fertig) => server.listen(0, '127.0.0.1', fertig));
  const port = /** @type {import('node:net').AddressInfo} */ (server.address()).port;

  return {
    adresse: `http://127.0.0.1:${port}`,
    schliesse: () => new Promise((fertig) => server.close(() => fertig())),
  };
}

/**
 * Server und Browser fuer eine Testdatei. Der Rueckgabewert eignet sich fuer
 * `test.before` / `test.after`.
 * @returns {Promise<{ adresse: string, browser: import('playwright').Browser, schliesse: () => Promise<void> }>}
 */
export async function starteUmgebung() {
  const { adresse, schliesse: serverSchliessen } = await starteServer();
  const browser = await chromium.launch();
  return {
    adresse,
    browser,
    schliesse: async () => {
      await browser.close();
      await serverSchliessen();
    },
  };
}

/**
 * Oeffnet eine Seite auf der gewuenschten Ansicht und wartet, bis die
 * Anwendung sie gezeichnet hat.
 * @param {import('playwright').Browser} browser
 * @param {string} adresse
 * @param {object} optionen
 * @param {string} [optionen.ansicht] Adressfragment ohne `#`, z. B. `/pruefung`.
 * @param {Record<string, unknown>} [optionen.geraet] `MOBIL` oder `DESKTOP`.
 * @returns {Promise<import('playwright').Page>}
 */
export async function oeffne(browser, adresse, { ansicht = '/ueben', geraet = MOBIL } = {}) {
  const kontext = await browser.newContext(geraet);
  const seite = await kontext.newPage();
  await seite.goto(`${adresse}/#${ansicht}`);
  await seite.waitForFunction(() => document.querySelectorAll('.ansicht:not([hidden])').length === 1);
  return seite;
}

/**
 * Die Masse eines Elements in CSS-Pixeln, oder `null`, wenn es fehlt.
 * @param {import('playwright').Page} seite
 * @param {string} selektor
 * @returns {Promise<{ oben: number, unten: number, hoehe: number, breite: number } | null>}
 */
export function masse(seite, selektor) {
  return seite.evaluate((s) => {
    const element = document.querySelector(s);
    if (!element) return null;
    const rechteck = element.getBoundingClientRect();
    return {
      oben: Math.round(rechteck.top),
      unten: Math.round(rechteck.bottom),
      hoehe: Math.round(rechteck.height),
      breite: Math.round(rechteck.width),
    };
  }, selektor);
}
