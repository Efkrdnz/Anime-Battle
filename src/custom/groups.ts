// Character groups: named sets of built-in character forms that narrow what the reel can roll.
import type { CharacterGroup, Entry, Gender } from '../types';

const PRESETS: { id: string; name: string; gender: Gender }[] = [
  { id: 'preset:female', name: 'Females', gender: 'female' },
  { id: 'preset:male', name: 'Males', gender: 'male' },
];

export function isPreset(id: string): boolean {
  return id.startsWith('preset:');
}

/** Built-in groups, computed from character data so they always cover the whole roster. */
export function presetGroups(entries: Entry[]): CharacterGroup[] {
  return PRESETS.map((p) => ({
    id: p.id,
    name: p.name,
    keys: entries.filter((e) => e.gender === p.gender).map((e) => e.key),
    updatedAt: 0,
  }));
}

/** Every group by id: presets first, then saved groups (later lists win on id clashes). */
export function allGroups(entries: Entry[], ...lists: CharacterGroup[][]): Map<string, CharacterGroup> {
  return new Map([...presetGroups(entries), ...lists.flat()].map((g) => [g.id, g]));
}

/** Union of the chosen groups' entry keys, or null when no group is chosen (no filtering). */
export function groupKeySet(groupIds: string[], groups: Map<string, CharacterGroup>): Set<string> | null {
  if (groupIds.length === 0) return null;
  return new Set(groupIds.flatMap((id) => groups.get(id)?.keys ?? []));
}

/** Saved (non-preset) groups referenced by ids; these are what peers and exports need. */
export function usedGroups(groupIds: string[], groups: CharacterGroup[]): CharacterGroup[] {
  return groups.filter((g) => groupIds.includes(g.id) && !isPreset(g.id));
}

export function newGroup(id: string, name = 'New group', keys: string[] = []): CharacterGroup {
  return { id, name, keys, updatedAt: Date.now() };
}
