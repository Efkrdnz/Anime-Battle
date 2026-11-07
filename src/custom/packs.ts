// Custom game packs: validation and file import/export.
import { RARITIES, type CustomPack } from '../types';

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
  if (pack.characters.length === 0 && pack.animeIds.length === 0) {
    problems.push('Add characters or include at least one anime.');
  }
  return problems;
}

/** Parses an imported file, rejecting anything that is not a pack. */
export function parsePack(text: string): CustomPack {
  const raw = JSON.parse(text) as Partial<CustomPack>;
  if (typeof raw.name !== 'string' || !Array.isArray(raw.attributes) || !Array.isArray(raw.characters)) {
    throw new Error('This file is not an Anime Battles custom game.');
  }
  return {
    id: newId(),
    name: raw.name.slice(0, 60),
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
}

export function downloadPack(pack: CustomPack): void {
  const blob = new Blob([JSON.stringify(pack)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${pack.name.replace(/[^\w-]+/g, '_') || 'custom-game'}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
