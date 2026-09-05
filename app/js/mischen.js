/**
 * Liefert eine gemischte Kopie (Fisher-Yates). Die Zufallsquelle wird
 * hineingereicht, damit sie in Tests festgelegt werden kann.
 * @template T
 * @param {readonly T[]} liste
 * @param {() => number} [zufall]
 * @returns {T[]}
 */
export function mische(liste, zufall = Math.random) {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i -= 1) {
    const j = Math.floor(zufall() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}
