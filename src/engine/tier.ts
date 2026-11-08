// Pure tier list match: everyone ranks the same characters, then the lists are compared.
import type { Player } from './match';
import { seededRandom } from './rng';

export const TIERS = ['S', 'A', 'B', 'C', 'D', 'F'] as const;
export type TierId = (typeof TIERS)[number];

/** Tier -> ordered entry keys. */
export type TierList = Record<TierId, string[]>;

/** What everyone ranks. Sent whole so peers need nothing but the built-in data. */
export interface TierTopic {
  id: string;
  name: string;
  emoji: string;
  /** The question players answer, e.g. "Who is the best wife?" */
  prompt: string;
  color: string;
}

export interface TierMatch {
  seed: number;
  topic: TierTopic;
  /** Entry keys everyone ranks, in the order they are dealt. */
  keys: string[];
  players: Player[];
  phase: 'ranking' | 'reveal';
  /** Locked-in lists by player id. */
  lists: Record<string, TierList>;
  /** How many characters each player has placed so far. */
  progress: Record<string, number>;
}

export type TierAction =
  | { type: 'progress'; playerId: string; count: number }
  | { type: 'submit'; playerId: string; list: TierList }
  | { type: 'unlock'; playerId: string }
  /** Host only: reveal with whoever has locked in. */
  | { type: 'reveal'; playerId: string }
  | { type: 'leave'; playerId: string };

export type TierPlayerAction = TierAction extends infer A ? (A extends TierAction ? Omit<A, 'playerId'> : never) : never;

export function emptyList(): TierList {
  return { S: [], A: [], B: [], C: [], D: [], F: [] };
}

/** Seeded Fisher-Yates shuffle, then the first `count` keys. */
export function sampleKeys(keys: string[], count: number, seed: number): string[] {
  const rand = seededRandom(seed, 'tier-deal');
  const out = [...new Set(keys)];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, Math.max(1, count));
}

export function createTierMatch(topic: TierTopic, keys: string[], players: Player[], seed: number): TierMatch {
  return {
    seed,
    topic,
    keys,
    players,
    phase: 'ranking',
    lists: {},
    progress: Object.fromEntries(players.map((p) => [p.id, 0])),
  };
}

/** A list is valid when it ranks every key exactly once. */
export function isCompleteList(list: TierList, keys: string[]): boolean {
  if (!list || typeof list !== 'object') return false;
  const placed = TIERS.flatMap((t) => (Array.isArray(list[t]) ? list[t] : [null]));
  return placed.length === keys.length && new Set(placed).size === keys.length && placed.every((k) => keys.includes(k as string));
}

function revealIfDone(state: TierMatch): TierMatch {
  if (state.phase !== 'ranking' || state.players.length === 0) return state;
  return state.players.every((p) => p.id in state.lists) ? { ...state, phase: 'reveal' } : state;
}

export function reduceTier(state: TierMatch, action: TierAction): TierMatch {
  const known = state.players.some((p) => p.id === action.playerId);
  if (!known) return state;
  switch (action.type) {
    case 'progress': {
      if (state.phase !== 'ranking') return state;
      const count = Math.max(0, Math.min(state.keys.length, Math.floor(Number(action.count) || 0)));
      if (state.progress[action.playerId] === count) return state;
      return { ...state, progress: { ...state.progress, [action.playerId]: count } };
    }
    case 'submit': {
      if (state.phase !== 'ranking' || !isCompleteList(action.list, state.keys)) return state;
      const list = Object.fromEntries(TIERS.map((t) => [t, [...action.list[t]]])) as TierList;
      return revealIfDone({
        ...state,
        lists: { ...state.lists, [action.playerId]: list },
        progress: { ...state.progress, [action.playerId]: state.keys.length },
      });
    }
    case 'unlock': {
      if (state.phase !== 'ranking' || !(action.playerId in state.lists)) return state;
      const lists = { ...state.lists };
      delete lists[action.playerId];
      return { ...state, lists };
    }
    case 'reveal': {
      if (state.phase !== 'ranking' || Object.keys(state.lists).length === 0) return state;
      return { ...state, phase: 'reveal' };
    }
    case 'leave': {
      const players = state.players.filter((p) => p.id !== action.playerId);
      const lists = { ...state.lists };
      const progress = { ...state.progress };
      delete lists[action.playerId];
      delete progress[action.playerId];
      return revealIfDone({ ...state, players, lists, progress });
    }
  }
}

// ---------- Comparing ----------

/** Entry key -> tier index (0 = S … 5 = F). */
export function tierIndex(list: TierList): Record<string, number> {
  const out: Record<string, number> = {};
  TIERS.forEach((t, i) => list[t].forEach((k) => (out[k] = i)));
  return out;
}

/** Points for two players' tiers of one character: same tier counts fully, near misses partly. */
const CLOSENESS = [1, 0.5, 0.15, 0, 0, 0];

/** 0-100: how alike two lists are. Random lists land around 35. */
export function agreement(a: TierList, b: TierList, keys: string[]): number {
  if (keys.length === 0) return 100;
  const ia = tierIndex(a);
  const ib = tierIndex(b);
  const total = keys.reduce((sum, k) => sum + (k in ia && k in ib ? CLOSENESS[Math.abs(ia[k] - ib[k])] : 0), 0);
  return Math.round((total / keys.length) * 100);
}

export function agreementLabel(score: number): { title: string; emoji: string } {
  if (score >= 90) return { title: 'Soulmates', emoji: '💞' };
  if (score >= 75) return { title: 'Same wavelength', emoji: '🤝' };
  if (score >= 55) return { title: 'Respectful disagreement', emoji: '🧐' };
  if (score >= 35) return { title: 'Questionable friendship', emoji: '😬' };
  return { title: 'Sworn enemies', emoji: '⚔️' };
}

export interface PairScore {
  a: string;
  b: string;
  score: number;
}

export function pairScores(match: TierMatch): PairScore[] {
  const ids = match.players.map((p) => p.id).filter((id) => id in match.lists);
  const pairs: PairScore[] = [];
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++)
      pairs.push({ a: ids[i], b: ids[j], score: agreement(match.lists[ids[i]], match.lists[ids[j]], match.keys) });
  return pairs;
}

export interface CharacterVerdict {
  key: string;
  /** Player id -> tier index. */
  tiers: Record<string, number>;
  average: number;
  /** Highest minus lowest tier index. */
  spread: number;
}

/** Per-character comparison across every locked-in list, most disputed first. */
export function verdicts(match: TierMatch): CharacterVerdict[] {
  const ids = match.players.map((p) => p.id).filter((id) => id in match.lists);
  const indexes = Object.fromEntries(ids.map((id) => [id, tierIndex(match.lists[id])]));
  const rows = match.keys.map((key) => {
    const tiers = Object.fromEntries(ids.map((id) => [id, indexes[id][key]]));
    const values = Object.values(tiers);
    const average = values.reduce((s, v) => s + v, 0) / Math.max(1, values.length);
    const spread = values.length ? Math.max(...values) - Math.min(...values) : 0;
    return { key, tiers, average, spread };
  });
  return rows.sort((x, y) => y.spread - x.spread || x.average - y.average);
}

/** The group's combined list: each character goes to its rounded average tier, best average first. */
export function consensusList(match: TierMatch): TierList {
  const list = emptyList();
  const rows = [...verdicts(match)].sort((x, y) => x.average - y.average || x.spread - y.spread);
  for (const row of rows) list[TIERS[Math.min(TIERS.length - 1, Math.round(row.average))]].push(row.key);
  return list;
}

/** Each player's spiciest pick: the character they rate furthest from everyone else. */
export function hotTakes(match: TierMatch): Record<string, { key: string; diff: number } | null> {
  const rows = verdicts(match);
  const out: Record<string, { key: string; diff: number } | null> = {};
  for (const id of Object.keys(match.lists)) {
    let best: { key: string; diff: number } | null = null;
    for (const row of rows) {
      const others = Object.entries(row.tiers).filter(([pid]) => pid !== id);
      if (others.length === 0) continue;
      const avg = others.reduce((s, [, v]) => s + v, 0) / others.length;
      const diff = row.tiers[id] - avg;
      if (Math.abs(diff) >= 1.5 && (!best || Math.abs(diff) > Math.abs(best.diff))) best = { key: row.key, diff };
    }
    out[id] = best;
  }
  return out;
}
