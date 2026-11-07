import { describe, expect, it } from 'vitest';
import { BUILTIN_ENTRIES } from '../data';
import { buildPool, defaultConfig, startProblem, type LobbyConfig } from '../lobby';
import type { CharacterGroup, CustomPack } from '../types';
import { allGroups, groupKeySet, presetGroups, usedGroups } from './groups';
import { emptyPack, parsePack } from './packs';

const narutoKeys = BUILTIN_ENTRIES.filter((e) => e.animeId === 'naruto').map((e) => e.key);
const kages: CharacterGroup = {
  id: 'kages',
  name: 'Kages',
  keys: BUILTIN_ENTRIES.filter((e) => /kage/i.test(e.label ?? '')).map((e) => e.key),
  updatedAt: 1,
};
const config = (patch: Partial<LobbyConfig>): LobbyConfig => ({ ...defaultConfig(), ...patch });

describe('character groups', () => {
  it('builds Females and Males presets from character data', () => {
    const [females, males] = presetGroups(BUILTIN_ENTRIES);
    expect(females.keys.length).toBeGreaterThan(100);
    expect(males.keys.length).toBeGreaterThan(females.keys.length);
    const female = new Set(females.keys);
    expect(males.keys.some((k) => female.has(k))).toBe(false);
  });

  it('unions the chosen groups and returns null when none are chosen', () => {
    const map = allGroups(BUILTIN_ENTRIES, [kages]);
    expect(groupKeySet([], map)).toBeNull();
    const union = groupKeySet(['kages', 'preset:female'], map)!;
    expect(union.size).toBeGreaterThanOrEqual(map.get('preset:female')!.keys.length);
    kages.keys.forEach((k) => expect(union.has(k)).toBe(true));
  });

  it('only sends and exports saved groups, never presets', () => {
    expect(usedGroups(['kages', 'preset:male'], [kages])).toEqual([kages]);
  });
});

describe('pool with groups', () => {
  it('a group alone rolls from every anime', () => {
    const pool = buildPool(config({ animeIds: [], groupIds: ['kages'], slotIds: ['strength'] }), null, [kages]);
    expect(pool.map((e) => e.key).sort()).toEqual([...kages.keys].sort());
  });

  it('anime and groups intersect (Naruto + Females)', () => {
    const pool = buildPool(config({ animeIds: ['naruto'], groupIds: ['preset:female'] }), null, []);
    expect(pool.length).toBeGreaterThan(10);
    expect(pool.every((e) => e.animeId === 'naruto' && e.gender === 'female')).toBe(true);
    expect(pool.length).toBeLessThan(narutoKeys.length);
  });

  it('custom packs keep their own characters and add group members', () => {
    const pack: CustomPack = {
      ...emptyPack(),
      characters: [{ id: 'oc', name: 'My OC', group: 'OCs', rarity: 'B' }],
      groupIds: ['kages'],
    };
    const pool = buildPool(config({ mode: 'custom', packId: pack.id }), pack, [kages]);
    expect(pool.some((e) => e.name === 'My OC')).toBe(true);
    expect(pool.length).toBe(kages.keys.length + 1);
  });

  it('flags an anime-specific slot that the filtered pool cannot fill', () => {
    const onlyNaruto: CharacterGroup = { id: 'n', name: 'N', keys: narutoKeys.slice(0, 5), updatedAt: 1 };
    const problem = startProblem(
      config({ animeIds: ['onepiece', 'naruto'], groupIds: ['n'], slotIds: ['strength', 'onepiece.devilFruit'] }),
      null,
      [onlyNaruto],
    );
    expect(problem).toMatch(/Devil Fruit/);
  });
});

describe('pack files with groups', () => {
  it('round-trips embedded groups under fresh ids', () => {
    const pack: CustomPack = { ...emptyPack(), groupIds: ['kages', 'preset:female'], characters: [] };
    const file = JSON.stringify({ ...pack, groups: [kages] });
    const { pack: imported, groups } = parsePack(file);
    expect(groups).toHaveLength(1);
    expect(groups[0].keys).toEqual(kages.keys);
    expect(groups[0].id).not.toBe('kages');
    expect(imported.groupIds).toEqual([groups[0].id, 'preset:female']);
  });

  it('drops malformed group keys', () => {
    const file = JSON.stringify({ ...emptyPack(), groupIds: ['g'], groups: [{ id: 'g', name: 'G', keys: ['naruto/x/y', '<script>', 5] }] });
    expect(parsePack(file).groups[0].keys).toEqual(['naruto/x/y']);
  });
});
