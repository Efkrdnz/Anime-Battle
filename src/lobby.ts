// Lobby settings -> slots, character pool and match settings.
import { ANIME_BY_ID, BUILTIN_ENTRIES } from './data';
import type { MatchSettings } from './engine/match';
import { allGroups, groupKeySet } from './custom/groups';
import { animeSlots, canFill, customSlots, entriesFromCustom, universalSlots } from './engine/pool';
import type { CharacterGroup, CustomPack, Entry, Slot } from './types';

export interface LobbyConfig {
  mode: 'create' | 'custom';
  animeIds: string[];
  /** Selected slot ids (character creation mode only; custom games use every category). */
  slotIds: string[];
  /** Character groups narrowing the built-in characters (character creation mode). */
  groupIds?: string[];
  rerolls: number;
  voting: boolean;
  packId: string | null;
}

export function defaultSlotIds(animeIds: string[]): string[] {
  const universal = universalSlots().map((s) => s.id);
  if (animeIds.length !== 1 || !ANIME_BY_ID[animeIds[0]]) return universal;
  return [...universal, ...animeSlots(ANIME_BY_ID[animeIds[0]]).map((s) => s.id)];
}

export function defaultConfig(): LobbyConfig {
  return { mode: 'create', animeIds: ['onepiece'], slotIds: defaultSlotIds(['onepiece']), rerolls: 1, voting: true, packId: null };
}

export function availableSlots(config: LobbyConfig, pack: CustomPack | null): Slot[] {
  if (config.mode === 'custom') return pack ? customSlots(pack).filter((s) => s.label.trim()) : [];
  const fromAnime = config.animeIds.flatMap((id) => (ANIME_BY_ID[id] ? animeSlots(ANIME_BY_ID[id]) : []));
  return [...universalSlots(), ...fromAnime];
}

export function selectedSlots(config: LobbyConfig, pack: CustomPack | null): Slot[] {
  const slots = availableSlots(config, pack);
  return config.mode === 'custom' ? slots : slots.filter((s) => config.slotIds.includes(s.id));
}

let poolCache: { key: string; pool: Entry[] } | null = null;

function poolFilters(config: LobbyConfig, pack: CustomPack | null): { animeIds: string[]; groupIds: string[] } {
  if (config.mode === 'custom') return { animeIds: pack?.animeIds ?? [], groupIds: pack?.groupIds ?? [] };
  return { animeIds: config.animeIds, groupIds: config.groupIds ?? [] };
}

/**
 * Rollable characters. Built-in characters are narrowed by the ticked anime (if any) AND the
 * ticked groups (if any); custom pack characters are always in.
 */
export function buildPool(config: LobbyConfig, pack: CustomPack | null, groups: CharacterGroup[] = []): Entry[] {
  const { animeIds, groupIds } = poolFilters(config, pack);
  const groupStamp = groups.filter((g) => groupIds.includes(g.id)).map((g) => `${g.id}@${g.updatedAt}`);
  const key = `${config.mode}|${animeIds.join(',')}|${groupIds.join(',')}|${groupStamp.join(',')}|${pack?.id ?? ''}|${pack?.updatedAt ?? ''}`;
  if (poolCache?.key === key) return poolCache.pool;

  const inGroups = groupKeySet(groupIds, allGroups(BUILTIN_ENTRIES, groups));
  const useBuiltin = animeIds.length > 0 || inGroups !== null;
  const builtin = useBuiltin
    ? BUILTIN_ENTRIES.filter((e) => (animeIds.length === 0 || animeIds.includes(e.animeId)) && (!inGroups || inGroups.has(e.key)))
    : [];
  const custom = config.mode === 'custom' && pack ? entriesFromCustom(pack) : [];
  poolCache = { key, pool: [...custom, ...builtin] };
  return poolCache.pool;
}

export function matchSettings(config: LobbyConfig, pack: CustomPack | null): MatchSettings {
  const title =
    config.mode === 'custom'
      ? (pack?.name ?? 'Custom Game')
      : config.animeIds.length === 1
        ? `${ANIME_BY_ID[config.animeIds[0]]?.name ?? ''} Character Creation`
        : 'Multiverse Character Creation';
  return { title, slots: selectedSlots(config, pack), rerolls: config.rerolls, voting: config.voting };
}

/** Why the match cannot start yet, or null. */
export function startProblem(config: LobbyConfig, pack: CustomPack | null, groups: CharacterGroup[] = []): string | null {
  if (config.mode === 'custom' && !pack) return 'Pick a custom game.';
  if (config.mode === 'create' && config.animeIds.length === 0 && (config.groupIds ?? []).length === 0) {
    return 'Pick at least one anime or character group.';
  }
  const slots = selectedSlots(config, pack);
  if (slots.length === 0) return 'Pick at least one attribute.';
  const pool = buildPool(config, pack, groups);
  if (pool.length === 0) return 'There are no characters to roll. Check the anime and groups you picked.';
  const empty = slots.find((s) => !pool.some((e) => canFill(e, s)));
  if (empty) return `No character in the pool can fill "${empty.label}". Remove it or widen the pool.`;
  return null;
}
