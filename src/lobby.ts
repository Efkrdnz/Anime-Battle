// Lobby settings -> slots, character pool and match settings.
import { ANIME_BY_ID, BUILTIN_ENTRIES } from './data';
import type { MatchSettings } from './engine/match';
import { animeSlots, customSlots, entriesFromCustom, universalSlots } from './engine/pool';
import type { CustomPack, Entry, Slot } from './types';

export interface LobbyConfig {
  mode: 'create' | 'custom';
  animeIds: string[];
  /** Selected slot ids (character creation mode only; custom games use every category). */
  slotIds: string[];
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

export function buildPool(config: LobbyConfig, pack: CustomPack | null): Entry[] {
  const animeIds = config.mode === 'custom' ? (pack?.animeIds ?? []) : config.animeIds;
  const key = `${config.mode}|${animeIds.join(',')}|${pack?.id ?? ''}|${pack?.updatedAt ?? ''}`;
  if (poolCache?.key === key) return poolCache.pool;
  const builtin = BUILTIN_ENTRIES.filter((e) => animeIds.includes(e.animeId));
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
export function startProblem(config: LobbyConfig, pack: CustomPack | null): string | null {
  if (config.mode === 'custom' && !pack) return 'Pick a custom game.';
  if (config.mode === 'create' && config.animeIds.length === 0) return 'Pick at least one anime.';
  if (selectedSlots(config, pack).length === 0) return 'Pick at least one attribute.';
  if (buildPool(config, pack).length === 0) return 'There are no characters to roll.';
  return null;
}
