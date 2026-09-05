#!/usr/bin/env node
// Abgleich der Katalogdatei gegen den Markdown-Bestand, aus dem sie einmalig
// konvertiert wurde (ADR-0001). Kein Teil der Pruefstrecke: Das Markdown ist
// entfallen, das Skript belegt nur, dass die Konvertierung verlustfrei war, und
// macht diesen Beleg wiederholbar.
//
//   git show 68bd394 --stat            # der Commit mit dem Markdown-Bestand
//   git worktree add ../altbestand 68bd394
//   node skripte/einmalig/abgleich-markdown.mjs ../altbestand/fragenkatalog/markdown
//
// Bewusst unabhaengig vom Konvertierungsskript geschrieben: blockweise Zerlegung
// statt zeilenweisem Zustandsautomaten, damit ein Parserfehler nicht beidseitig
// gleich ausfaellt und sich damit selbst bestaetigt.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const markdownVerzeichnis = process.argv[2] ?? 'fragenkatalog/markdown';
const katalogPfad = fileURLToPath(new URL('../../app/data/fragen.json', import.meta.url));
const katalog = JSON.parse(readFileSync(katalogPfad, 'utf8'));

/** @type {string[]} */
const verstoesse = [];
const melde = (/** @type {string} */ text) => verstoesse.push(text);

const ausMarkdown = new Map();
for (const datei of readdirSync(markdownVerzeichnis).filter((n) => /lektion-\d\d\.md$/.test(n)).sort()) {
  const lektionsnummer = Number(/(\d\d)\.md$/.exec(datei)[1]);
  const text = readFileSync(join(markdownVerzeichnis, datei), 'utf8').replace(/\r\n/g, '\n');
  for (const block of text.split(/^### /m).slice(1)) {
    const [, nummer, fragetext] = /^(\d+)\. (.*)$/.exec(block.split('\n', 1)[0]);
    ausMarkdown.set(Number(nummer), {
      lektionsnummer,
      fragetext,
      optionen: [...block.matchAll(/^- ([a-z])\) (.*)$/gm)].map((m) => [m[1], m[2]]),
      loesungen: [...block.matchAll(/^\*\*Lösung: ([a-z])\)\*\*$/gm)].map((m) => m[1]),
    });
  }
}

const optionenImMarkdown = [...ausMarkdown.values()].reduce((summe, f) => summe + f.optionen.length, 0);
const optionenImJson = katalog.fragen.reduce((summe, f) => summe + f.optionen.length, 0);
console.log(`Markdown: ${ausMarkdown.size} Fragen, ${optionenImMarkdown} Optionen`);
console.log(`JSON:     ${katalog.fragen.length} Fragen, ${optionenImJson} Optionen`);

if (ausMarkdown.size !== katalog.fragen.length) melde('Anzahl der Fragen weicht ab');

for (const [nummer, md] of ausMarkdown) {
  const frage = katalog.fragen.find((f) => f.nummer === nummer && f.wissensstufe === 'basiswissen');
  if (!frage) {
    melde(`Frage ${nummer} fehlt in der Katalogdatei`);
    continue;
  }
  if (frage.text !== md.fragetext) melde(`Frage ${nummer}: Fragetext weicht ab`);
  if (frage.lektion !== `basiswissen-${md.lektionsnummer}`) melde(`Frage ${nummer}: Lektion weicht ab`);
  if (frage.optionen.length !== md.optionen.length) {
    melde(`Frage ${nummer}: ${frage.optionen.length} statt ${md.optionen.length} Optionen`);
    continue;
  }
  md.optionen.forEach(([buchstabe, optionstext], i) => {
    if (frage.optionen[i].buchstabe !== buchstabe) melde(`Frage ${nummer}, Option ${i + 1}: Buchstabe weicht ab`);
    if (frage.optionen[i].text !== optionstext) melde(`Frage ${nummer}, Option ${buchstabe}: Text weicht ab`);
  });
  const korrektJson = frage.optionen.filter((o) => o.korrekt).map((o) => o.buchstabe).sort().join(',');
  const korrektMd = [...md.loesungen].sort().join(',');
  if (korrektJson !== korrektMd) {
    melde(`Frage ${nummer}: korrekte Optionen [${korrektJson}] statt [${korrektMd}]`);
  }
}
for (const frage of katalog.fragen) {
  if (!ausMarkdown.has(frage.nummer)) melde(`Frage ${frage.nummer} steht nicht im Markdown`);
}

const korrekteGesamt = katalog.fragen.reduce((s, f) => s + f.optionen.filter((o) => o.korrekt).length, 0);
console.log(`Korrekte Optionen: ${korrekteGesamt} (erwartet: eine je Frage)`);

if (verstoesse.length > 0) {
  console.error(`\nAbgleich fehlgeschlagen, ${verstoesse.length} Abweichung(en):`);
  for (const verstoss of verstoesse) console.error(`  - ${verstoss}`);
  process.exit(1);
}
console.log('\nAbgleich fehlerfrei: Fragen, Optionen, Texte und korrekte Optionen sind deckungsgleich.');
