#!/usr/bin/env bun
// Sample sizes for the pre-registered comparisons. Normal approximation, two-sided alpha 0.05, power 0.8.
// Paired task means: N = ((z_a + z_b) * sd_d / delta)^2, sd_d = SD across tasks of (harness mean - baseline mean).
// Catch rate of a layer on a bug set: n = z_a^2 p (1 - p) / h^2 for a CI half-width h.
const ZA = 1.959964, ZB = 0.841621

export const pairedTasks = (sdD, delta) => Math.ceil(((ZA + ZB) * sdD / delta) ** 2)
export const bugsForHalfWidth = (p, h) => Math.ceil(ZA ** 2 * p * (1 - p) / h ** 2)

if (import.meta.main) {
  console.log('Paired tasks N (rows sd_d, columns delta)')
  const deltas = [0.10, 0.15, 0.20]
  console.log('sd_d\t' + deltas.join('\t'))
  for (const sd of [0.15, 0.20, 0.25, 0.30]) console.log(sd + '\t' + deltas.map((d) => pairedTasks(sd, d)).join('\t'))
  console.log('\nBugs n for a catch-rate CI half-width h (rows p, columns h)')
  const hs = [0.10, 0.15]
  console.log('p\t' + hs.join('\t'))
  for (const p of [0.1, 0.3, 0.5]) console.log(p + '\t' + hs.map((h) => bugsForHalfWidth(p, h)).join('\t'))
}
