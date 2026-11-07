// Custom game packs: validation and file import/export.
import { RARITIES, type CharacterGroup, type CustomPack } from '../types';
import { isPreset, usedGroups } from './groups';

const MAX_GROUP_KEYS = 5000;
const ENTRY_KEY = /^[\w-]+\/[\w-]+\/[\w-]+$/;

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function emptyPack(): CustomPack {
  return {
    id: newId(),
    name: 'My Custom Game',
    attributes: [
      { id: newId(), label: 'Loyalty' },
      { id: newId(), label: 'Hair' },
      { id: newId(), label: 'Eyes' },
      { id: newId(), label: 'Charm' },
    ],
    animeIds: [],
    characters: [],
    updatedAt: Date.now(),
  };
}

/** Problems that stop the pack from being playable; empty when it is fine. */
export function packProblems(pack: CustomPack): string[] {
  const problems: string[] = [];
  if (!pack.name.trim()) problems.push('Give the game a name.');
  if (pack.attributes.filter((a) => a.label.trim()).length === 0) problems.push('Add at least one category.');
  if (pack.characters.length === 0 && pack.animeIds.length === 0 && (pack.groupIds ?? []).length === 0) {
    problems.push('Add characters, or include an anime or a character group.');
  }
  return problems;
}

function parseGroups(raw: unknown): CharacterGroup[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((g) => typeof g?.id === 'string' && typeof g?.name === 'string' && Array.isArray(g?.keys) && !isPreset(g.id))
    .map((g) => ({
      id: g.id as string,
      name: (g.name as string).slice(0, 40),
      keys: (g.keys as unknown[]).filter((k): k is string => typeof k === 'string' && ENTRY_KEY.test(k)).slice(0, MAX_GROUP_KEYS),
      updatedAt: Date.now(),
    }));
}

/**
 * Parses an imported file, rejecting anything that is not a pack. Embedded groups get fresh ids
 * so they never overwrite the importer's own groups.
 */
export function parsePack(text: string): { pack: CustomPack; groups: CharacterGroup[] } {
  const raw = JSON.parse(text) as Partial<CustomPack> & { groups?: unknown };
  if (typeof raw.name !== 'string' || !Array.isArray(raw.attributes) || !Array.isArray(raw.characters)) {
    throw new Error('This file is not an Anime Battles custom game.');
  }
  const renamed = new Map<string, string>();
  const groups = parseGroups(raw.groups).map((g) => {
    const id = newId();
    renamed.set(g.id, id);
    return { ...g, id };
  });
  const groupIds = (Array.isArray(raw.groupIds) ? raw.groupIds : [])
    .filter((id): id is string => typeof id === 'string')
    .map((id) => (isPreset(id) ? id : renamed.get(id)))
    .filter((id): id is string => !!id);
  const pack: CustomPack = {
    id: newId(),
    name: raw.name.slice(0, 60),
    groupIds,
    attributes: raw.attributes
      .filter((a) => typeof a?.label === 'string')
      .map((a) => ({ id: typeof a.id === 'string' ? a.id : newId(), label: a.label.slice(0, 40) })),
    animeIds: Array.isArray(raw.animeIds) ? raw.animeIds.filter((a) => typeof a === 'string') : [],
    characters: raw.characters
      .filter((c) => typeof c?.name === 'string')
      .map((c) => ({
        id: typeof c.id === 'string' ? c.id : newId(),
        name: c.name.slice(0, 60),
        group: typeof c.group === 'string' ? c.group.slice(0, 40) : '',
        rarity: RARITIES.includes(c.rarity) ? c.rarity : 'B',
        image: typeof c.image === 'string' && /^(https?:|data:image\/)/.test(c.image) ? c.image : undefined,
      })),
    updatedAt: Date.now(),
  };
  return { pack, groups };
}

/** Saves the pack as a file, embedding the saved groups it uses so it works anywhere. */
export function downloadPack(pack: CustomPack, groups: CharacterGroup[]): void {
  const file = { ...pack, groups: usedGroups(pack.groupIds ?? [], groups) };
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${pack.name.replace(/[^\w-]+/g, '_') || 'custom-game'}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
