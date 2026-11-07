// Shared domain types. Raw data (src/data/anime/*.json) is normalised into Entry objects.

export type Rarity = 'C' | 'B' | 'A' | 'S' | 'SS';
export const RARITIES: Rarity[] = ['C', 'B', 'A', 'S', 'SS'];

/** Rank used for universal stats (strength, speed…). */
export type Rank = 'D' | 'C' | 'B' | 'A' | 'S' | 'SS';
export const RANKS: Rank[] = ['D', 'C', 'B', 'A', 'S', 'SS'];

export interface RawVariant {
  id: string;
  /** Shown as a badge, e.g. "Prime", "Old", "Gear 5". Omitted when the character has a single form. */
  label?: string;
  rarity: Rarity;
  /** Space separated ranks in UNIVERSAL_STAT_IDS order. */
  stats: string;
  /** Anime-specific attribute id -> description. Missing means "None". */
  traits: Record<string, string>;
  /** Overrides the character image for this form. */
  image?: string;
}

export interface RawCharacter {
  id: string;
  name: string;
  /** AniList search override when the plain name is ambiguous. */
  search?: string;
  image?: string;
  variants: RawVariant[];
}

export interface RawAnime {
  id: string;
  name: string;
  color: string;
  /** Title fragment used to disambiguate AniList character search results. */
  search: string;
  attributes: { id: string; label: string }[];
  characters: RawCharacter[];
}

/** A slot on a player's board. Anime-specific slots only accept characters from that anime. */
export interface Slot {
  id: string;
  label: string;
  animeId?: string;
  /** 'stat' -> value is a rank, 'trait' -> value is text, 'free' -> no value (custom games). */
  kind: 'stat' | 'trait' | 'free';
  /** Key into Entry.stats / Entry.traits. */
  key: string;
}

/** One rollable character form. */
export interface Entry {
  key: string;
  animeId: string;
  animeName: string;
  color: string;
  name: string;
  label?: string;
  rarity: Rarity;
  image?: string;
  stats: Record<string, Rank>;
  traits: Record<string, string>;
}

export interface CustomCharacter {
  id: string;
  name: string;
  /** Group shown like an anime name, e.g. "My OCs". */
  group: string;
  rarity: Rarity;
  /** Data URL (uploaded) or http(s) URL. */
  image?: string;
}

export interface CustomPack {
  id: string;
  name: string;
  attributes: { id: string; label: string }[];
  /** Built-in anime whose characters are also in the pool. */
  animeIds: string[];
  characters: CustomCharacter[];
  updatedAt: number;
}
