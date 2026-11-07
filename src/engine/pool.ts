// Turns raw anime data and custom packs into rollable entries and board slots.
import { UNIVERSAL_STATS, UNIVERSAL_STAT_IDS } from '../data/attributes';
import { RANKS, type CustomPack, type Entry, type Rank, type RawAnime, type Slot } from '../types';

const CUSTOM_COLOR = '#9d4edd';

function parseStats(stats: string): Record<string, Rank> {
  const parts = stats.trim().split(/\s+/);
  const result: Record<string, Rank> = {};
  UNIVERSAL_STAT_IDS.forEach((id, i) => {
    const rank = parts[i] as Rank;
    result[id] = RANKS.includes(rank) ? rank : 'C';
  });
  return result;
}

/** images: "animeId/characterId[/variantId]" -> URL, produced by scripts/fetch-images.mjs. */
export function entriesFromAnime(anime: RawAnime, images: Record<string, string> = {}): Entry[] {
  return anime.characters.flatMap((c) =>
    c.variants.map((v) => ({
      key: `${anime.id}/${c.id}/${v.id}`,
      animeId: anime.id,
      animeName: anime.name,
      color: anime.color,
      name: c.name,
      label: v.label,
      rarity: v.rarity,
      image: v.image ?? images[`${anime.id}/${c.id}/${v.id}`] ?? c.image ?? images[`${anime.id}/${c.id}`],
      stats: parseStats(v.stats),
      traits: v.traits,
    })),
  );
}

export function entriesFromCustom(pack: CustomPack): Entry[] {
  return pack.characters.map((c) => ({
    key: `custom:${pack.id}/${c.id}`,
    animeId: `custom:${pack.id}`,
    animeName: c.group || pack.name,
    color: CUSTOM_COLOR,
    name: c.name,
    rarity: c.rarity,
    image: c.image,
    stats: {},
    traits: {},
  }));
}

export function universalSlots(): Slot[] {
  return UNIVERSAL_STATS.map((s) => ({ id: s.id, label: s.label, kind: 'stat', key: s.id }));
}

export function animeSlots(anime: RawAnime): Slot[] {
  return anime.attributes.map((a) => ({
    id: `${anime.id}.${a.id}`,
    label: a.label,
    animeId: anime.id,
    kind: 'trait',
    key: a.id,
  }));
}

export function customSlots(pack: CustomPack): Slot[] {
  return pack.attributes.map((a) => ({ id: `custom.${a.id}`, label: a.label, kind: 'free', key: a.id }));
}

export function canFill(entry: Entry, slot: Slot): boolean {
  return !slot.animeId || slot.animeId === entry.animeId;
}

/** Text shown for an entry placed in a slot, or null for free-form slots. */
export function slotValue(entry: Entry, slot: Slot): string | null {
  if (slot.kind === 'stat') return entry.stats[slot.key] ?? null;
  if (slot.kind === 'trait') return entry.traits[slot.key] ?? 'None';
  return null;
}
