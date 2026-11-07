// Weighted character rolls. Rarer forms land less often.
import type { Entry, Rarity, Slot } from '../types';
import { canFill } from './pool';

export const RARITY_WEIGHT: Record<Rarity, number> = { C: 34, B: 30, A: 20, S: 11, SS: 5 };

/** Entries not excluded that can fill at least one open slot. */
export function eligiblePool(pool: Entry[], openSlots: Slot[], exclude: ReadonlySet<string>): Entry[] {
  return pool.filter((e) => !exclude.has(e.key) && openSlots.some((s) => canFill(e, s)));
}

export function weightedPick(entries: Entry[], rand: () => number): Entry | undefined {
  const total = entries.reduce((sum, e) => sum + RARITY_WEIGHT[e.rarity], 0);
  let ticket = rand() * total;
  for (const e of entries) {
    ticket -= RARITY_WEIGHT[e.rarity];
    if (ticket < 0) return e;
  }
  return entries[entries.length - 1];
}

/** Rolls a fresh entry; falls back to allowing repeats when every unique option is used up. */
export function rollEntry(
  pool: Entry[],
  openSlots: Slot[],
  exclude: ReadonlySet<string>,
  rand: () => number,
): Entry | undefined {
  const fresh = eligiblePool(pool, openSlots, exclude);
  return weightedPick(fresh.length > 0 ? fresh : eligiblePool(pool, openSlots, new Set()), rand);
}
