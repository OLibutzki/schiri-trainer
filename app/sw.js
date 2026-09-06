// Service Worker: macht die Anwendung installierbar und offlinefaehig (Issue #10).
// Die Registrierung in app.js erfolgt relativ zum Dokument, der
// Geltungsbereich ist deshalb automatisch der Ordner, unter dem "app/"
// ausgeliefert wird — unabhaengig vom Projektpfad auf GitHub Pages.

// Bei jeder Aenderung an einer ausgelieferten Datei diese Version erhoehen:
// Erst ein neuer Name legt einen neuen Zwischenspeicher an und raeumt den
// alten beim Aktivieren auf, sodass eine neue Fassung die alte zuverlaessig
// verdraengt.
const CACHE_VERSION = 'schiri-trainer-v1';

// Nur tatsaechlich zur Laufzeit geladene Dateien: typen.js und validierung.js
// sind reine Typdefinitionen bzw. ein Skript fuer die Katalogpruefung, die
// Anwendung selbst laedt sie nicht.
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './js/app.js',
  './js/antwort.js',
  './js/katalog.js',
  './js/lernengine.js',
  './js/lernstand.js',
  './js/mischen.js',
  './js/pruefung.js',
  './js/pruefungsstand.js',
  './js/routing.js',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
];

self.addEventListener('install', (ereignis) => {
  ereignis.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      // Sofort aktiv werden statt auf das Schliessen aller Tabs zu warten:
      // Sonst braeuchte eine neue Fassung zwei Neuladevorgaenge.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (ereignis) => {
  ereignis.waitUntil(
    caches
      .keys()
      .then((schluessel) => Promise.all(schluessel.filter((name) => name !== CACHE_VERSION).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

/**
 * Netz bevorzugt, Zwischenspeicher nur ersatzweise: Fuer die Katalogdatei, damit
 * ein aktualisierter Katalog nicht hinter einer veralteten Kopie verschwindet.
 * @param {Request} anfrage
 * @returns {Promise<Response>}
 */
async function netzZuerstMitZwischenspeicher(anfrage) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const antwort = await fetch(anfrage);
    if (antwort.ok) cache.put(anfrage, antwort.clone());
    return antwort;
  } catch (fehler) {
    const zwischengespeichert = await cache.match(anfrage);
    if (zwischengespeichert) return zwischengespeichert;
    throw fehler;
  }
}

/**
 * Zwischenspeicher bevorzugt: Fuer den App-Rumpf, der sich nur mit einer neuen,
 * beim Aktivieren ausgetauschten Version aendert.
 * @param {Request} anfrage
 * @returns {Promise<Response>}
 */
async function zwischenspeicherZuerstMitNetz(anfrage) {
  const cache = await caches.open(CACHE_VERSION);
  const zwischengespeichert = await cache.match(anfrage);
  if (zwischengespeichert) return zwischengespeichert;
  const antwort = await fetch(anfrage);
  if (antwort.ok) cache.put(anfrage, antwort.clone());
  return antwort;
}

self.addEventListener('fetch', (ereignis) => {
  const anfrage = ereignis.request;
  // Nur GET ist zwischenspeicherbar; alles andere unveraendert ans Netz.
  if (anfrage.method !== 'GET') return;

  const pfad = new URL(anfrage.url).pathname;
  if (pfad.endsWith('/data/fragen.json')) {
    ereignis.respondWith(netzZuerstMitZwischenspeicher(anfrage));
    return;
  }

  ereignis.respondWith(zwischenspeicherZuerstMitNetz(anfrage));
});
