import { describe, expect, it } from 'vitest';
import type { Entry, RawAnime, Slot } from '../types';
import { createMatch, placeableSlots, reduceMatch, tallyVotes, type MatchSettings, type Player } from './match';
import { animeSlots, canFill, entriesFromAnime, slotValue, universalSlots } from './pool';
import { mulberry32, seededRandom } from './rng';
import { RARITY_WEIGHT, eligiblePool, rollEntry, weightedPick } from './roll';

const anime: RawAnime = {
  id: 'op',
  name: 'One Piece',
  color: '#f00',
  search: 'one piece',
  attributes: [{ id: 'devilFruit', label: 'Devil Fruit' }],
  characters: [
    {
      id: 'garp',
      name: 'Monkey D. Garp',
      variants: [
        { id: 'prime', label: 'Prime', rarity: 'SS', stats: 'SS S A SS S SS', traits: {} },
        { id: 'old', label: 'Old', rarity: 'S', stats: 'S A A S A A', traits: {} },
      ],
    },
    { id: 'luffy', name: 'Luffy', variants: [{ id: 'g5', rarity: 'SS', stats: 'SS SS A SS S SS', traits: { devilFruit: 'Nika' } }] },
  ],
};
const other: RawAnime = {
  id: 'nar',
  name: 'Naruto',
  color: '#fa0',
  search: 'naruto',
  attributes: [],
  characters: [{ id: 'naruto', name: 'Naruto', variants: [{ id: 'p1', rarity: 'C', stats: 'B B C B C S', traits: {} }] }],
};
const pool: Entry[] = [...entriesFromAnime(anime, { 'op/garp': 'garp.png' }), ...entriesFromAnime(other)];
const players: Player[] = [
  { id: 'a', name: 'A', color: '#fff' },
  { id: 'b', name: 'B', color: '#000' },
];

function settings(slots: Slot[], extra: Partial<MatchSettings> = {}): MatchSettings {
  return { title: 't', slots, rerolls: 1, voting: true, ...extra };
}

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(seededRandom(1, 'x', 0)()).not.toEqual(seededRandom(1, 'y', 0)());
  });
});

describe('pool', () => {
  it('normalises variants with images and parsed stats', () => {
    const garp = pool.find((e) => e.key === 'op/garp/prime')!;
    expect(garp.image).toBe('garp.png');
    expect(garp.stats.strength).toBe('SS');
    expect(garp.label).toBe('Prime');
  });

  it('limits anime-specific slots to that anime and shows None for missing traits', () => {
    const [fruit] = animeSlots(anime);
    const naruto = pool.find((e) => e.animeId === 'nar')!;
    const garp = pool.find((e) => e.key === 'op/garp/old')!;
    expect(canFill(naruto, fruit)).toBe(false);
    expect(canFill(garp, fruit)).toBe(true);
    expect(slotValue(garp, fruit)).toBe('None');
    expect(slotValue(pool.find((e) => e.key === 'op/luffy/g5')!, fruit)).toBe('Nika');
  });
});

describe('roll', () => {
  it('only offers entries that fit an open slot', () => {
    const eligible = eligiblePool(pool, animeSlots(anime), new Set());
    expect(eligible.every((e) => e.animeId === 'op')).toBe(true);
  });

  it('weights common forms above rare ones', () => {
    const rand = mulberry32(7);
    const pair = [pool.find((e) => e.rarity === 'C')!, pool.find((e) => e.rarity === 'SS')!];
    let common = 0;
    for (let i = 0; i < 4000; i++) if (weightedPick(pair, rand)!.rarity === 'C') common++;
    const expected = RARITY_WEIGHT.C / (RARITY_WEIGHT.C + RARITY_WEIGHT.SS);
    expect(common / 4000).toBeGreaterThan(expected - 0.05);
    expect(common / 4000).toBeLessThan(expected + 0.05);
  });

  it('falls back to repeats when all unique entries are used', () => {
    const all = new Set(pool.map((e) => e.key));
    expect(rollEntry(pool, universalSlots(), all, mulberry32(1))).toBeDefined();
  });
});

describe('match', () => {
  const slots = [universalSlots()[0], ...animeSlots(anime)];

  it('rolls the same characters for the same seed', () => {
    const m1 = createMatch(settings(slots), players, 99, pool);
    const m2 = createMatch(settings(slots), players, 99, pool);
    expect(m1.ps.a.current).toBe(m2.ps.a.current);
    expect(m1.ps.a.current).not.toBeNull();
  });

  it('waits for every player before the next round, then goes to voting', () => {
    let m = createMatch(settings(slots), players, 5, pool);
    const place = (id: string) => {
      const target = placeableSlots(m, id, pool)[0];
      m = reduceMatch(m, { type: 'assign', playerId: id, slotId: target.id }, pool);
    };
    place('a');
    expect(m.round).toBe(0);
    expect(m.ps.a.ready).toBe(true);
    place('b');
    expect(m.round).toBe(1);
    expect(m.ps.a.ready).toBe(false);
    place('a');
    place('b');
    expect(m.phase).toBe('voting');
    expect(Object.keys(m.ps.a.board)).toHaveLength(2);
  });

  it('rejects placing into a filled or incompatible slot', () => {
    const m = createMatch(settings(slots), players, 5, pool);
    const bad = reduceMatch(m, { type: 'assign', playerId: 'a', slotId: 'missing' }, pool);
    expect(bad).toBe(m);
  });

  it('spends rerolls and refuses once they run out', () => {
    let m = createMatch(settings(slots), players, 5, pool);
    m = reduceMatch(m, { type: 'reroll', playerId: 'a' }, pool);
    expect(m.ps.a.rerollsLeft).toBe(0);
    const again = reduceMatch(m, { type: 'reroll', playerId: 'a' }, pool);
    expect(again).toBe(m);
  });

  it('solo matches skip voting', () => {
    let m = createMatch(settings([slots[0]]), [players[0]], 3, pool);
    m = reduceMatch(m, { type: 'assign', playerId: 'a', slotId: slots[0].id }, pool);
    expect(m.phase).toBe('results');
  });

  it('tallies votes and reports ties', () => {
    let m = createMatch(settings([slots[0]]), players, 3, pool);
    m = reduceMatch(m, { type: 'assign', playerId: 'a', slotId: slots[0].id }, pool);
    m = reduceMatch(m, { type: 'assign', playerId: 'b', slotId: slots[0].id }, pool);
    m = reduceMatch(m, { type: 'vote', playerId: 'a', targetId: 'b' }, pool);
    expect(m.phase).toBe('voting');
    m = reduceMatch(m, { type: 'vote', playerId: 'b', targetId: 'a' }, pool);
    expect(m.phase).toBe('results');
    expect(tallyVotes(m).winners.sort()).toEqual(['a', 'b']);
  });

  it('a leaving player no longer blocks the round', () => {
    let m = createMatch(settings(slots), players, 5, pool);
    m = reduceMatch(m, { type: 'assign', playerId: 'a', slotId: placeableSlots(m, 'a', pool)[0].id }, pool);
    m = reduceMatch(m, { type: 'leave', playerId: 'b' }, pool);
    expect(m.round).toBe(1);
    expect(m.players).toHaveLength(1);
  });
});
