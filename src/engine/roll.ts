// Weighted character rolls. Rarer forms land less often.
import { RARITIES, type Entry, type Rarity, type Slot } from '../types';
import { canFill } from './pool';

/** Chance of each tier per roll, independent of how many characters are in it. */
export const RARITY_WEIGHT: Record<Rarity, number> = { C: 40, B: 28, A: 18, S: 10, SS: 4 };

/** Entries not excluded that can fill at least one open slot. */
export function eligiblePool(pool: Entry[], openSlots: Slot[], exclude: ReadonlySet<string>): Entry[] {
  return pool.filter((e) => !exclude.has(e.key) && openSlots.some((s) => canFill(e, s)));
}

/**
 * Picks a rarity tier first (among tiers present), then a character uniformly within it,
 * so big rosters full of niche characters don't drown out legendary pulls.
 */
export function weightedPick(entries: Entry[], rand: () => number): Entry | undefined {
  if (entries.length === 0) return undefined;
  const tiers = RARITIES.filter((r) => entries.some((e) => e.rarity === r));
  const total = tiers.reduce((sum, r) => sum + RARITY_WEIGHT[r], 0);
  let ticket = rand() * total;
  const tier = tiers.find((r) => (ticket -= RARITY_WEIGHT[r]) < 0) ?? tiers[tiers.length - 1];
  const inTier = entries.filter((e) => e.rarity === tier);
  return inTier[Math.min(inTier.length - 1, Math.floor(rand() * inTier.length))];
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
