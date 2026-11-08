import { describe, expect, it } from 'vitest';
import type { Player } from './match';
import {
  agreement,
  consensusList,
  createTierMatch,
  emptyList,
  hotTakes,
  isCompleteList,
  pairScores,
  reduceTier,
  sampleKeys,
  verdicts,
  type TierList,
  type TierTopic,
} from './tier';

const topic: TierTopic = { id: 't', name: 'Test', emoji: '🧪', prompt: 'Rank them', color: '#fff' };
const keys = ['a', 'b', 'c', 'd'];
const players: Player[] = [
  { id: 'p1', name: 'One', color: '#f00' },
  { id: 'p2', name: 'Two', color: '#0f0' },
];

function list(parts: Partial<TierList>): TierList {
  return { ...emptyList(), ...parts };
}

describe('tier list dealing', () => {
  it('samples the same keys for the same seed', () => {
    const pool = Array.from({ length: 30 }, (_, i) => `k${i}`);
    expect(sampleKeys(pool, 10, 42)).toEqual(sampleKeys(pool, 10, 42));
    expect(sampleKeys(pool, 10, 42)).toHaveLength(10);
    expect(new Set(sampleKeys(pool, 10, 42)).size).toBe(10);
    expect(sampleKeys(pool, 10, 42)).not.toEqual(sampleKeys(pool, 10, 43));
  });

  it('caps the deal at the pool size', () => {
    expect(sampleKeys(['x', 'y', 'x'], 16, 1).sort()).toEqual(['x', 'y']);
  });
});

describe('tier list match', () => {
  const start = () => createTierMatch(topic, keys, players, 7);
  const full = list({ S: ['a'], A: ['b', 'c'], F: ['d'] });

  it('only accepts complete lists', () => {
    expect(isCompleteList(full, keys)).toBe(true);
    expect(isCompleteList(list({ S: ['a', 'b', 'c'] }), keys)).toBe(false);
    expect(isCompleteList(list({ S: ['a', 'a', 'b', 'c'] }), keys)).toBe(false);
    expect(isCompleteList(list({ S: ['a', 'b', 'c', 'zzz'] }), keys)).toBe(false);
    const s = reduceTier(start(), { type: 'submit', playerId: 'p1', list: list({ S: ['a'] }) });
    expect(s.lists.p1).toBeUndefined();
  });

  it('reveals once everyone has locked in', () => {
    let s = reduceTier(start(), { type: 'submit', playerId: 'p1', list: full });
    expect(s.phase).toBe('ranking');
    expect(s.progress.p1).toBe(4);
    s = reduceTier(s, { type: 'submit', playerId: 'p2', list: full });
    expect(s.phase).toBe('reveal');
  });

  it('lets a player unlock before the reveal', () => {
    let s = reduceTier(start(), { type: 'submit', playerId: 'p1', list: full });
    s = reduceTier(s, { type: 'unlock', playerId: 'p1' });
    expect(s.lists.p1).toBeUndefined();
    s = reduceTier(s, { type: 'submit', playerId: 'p2', list: full });
    expect(s.phase).toBe('ranking');
  });

  it('reveals when the last unfinished player leaves', () => {
    let s = reduceTier(start(), { type: 'submit', playerId: 'p1', list: full });
    s = reduceTier(s, { type: 'leave', playerId: 'p2' });
    expect(s.phase).toBe('reveal');
    expect(s.players.map((p) => p.id)).toEqual(['p1']);
  });

  it('ignores unknown players and clamps progress', () => {
    const s = start();
    expect(reduceTier(s, { type: 'submit', playerId: 'ghost', list: full })).toBe(s);
    expect(reduceTier(s, { type: 'progress', playerId: 'p1', count: 99 }).progress.p1).toBe(4);
  });

  it('host reveal needs at least one list', () => {
    const s = start();
    expect(reduceTier(s, { type: 'reveal', playerId: 'p1' }).phase).toBe('ranking');
    const one = reduceTier(s, { type: 'submit', playerId: 'p1', list: full });
    expect(reduceTier(one, { type: 'reveal', playerId: 'p1' }).phase).toBe('reveal');
  });
});

describe('comparing lists', () => {
  const a = list({ S: ['a'], A: ['b'], C: ['c'], F: ['d'] });
  const b = list({ S: ['d'], A: ['b'], B: ['c'], F: ['a'] });

  it('scores identical lists 100 and opposite lists low', () => {
    expect(agreement(a, a, keys)).toBe(100);
    // b: same (1), c: off by one (0.5), a and d: off by five (0) -> 1.5 / 4
    expect(agreement(a, b, keys)).toBe(38);
  });

  it('finds the most disputed character and builds a consensus', () => {
    let s = createTierMatch(topic, keys, players, 1);
    s = reduceTier(s, { type: 'submit', playerId: 'p1', list: a });
    s = reduceTier(s, { type: 'submit', playerId: 'p2', list: b });
    const rows = verdicts(s);
    expect(rows[0].spread).toBe(5);
    expect(rows.find((r) => r.key === 'b')?.spread).toBe(0);
    const consensus = consensusList(s);
    expect(consensus.A).toEqual(['b']);
    expect(Object.values(consensus).flat().sort()).toEqual([...keys].sort());
    expect(pairScores(s)).toEqual([{ a: 'p1', b: 'p2', score: 38 }]);
    expect(hotTakes(s).p1?.key).toMatch(/[ad]/);
  });
});
