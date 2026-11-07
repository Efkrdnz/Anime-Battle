// Pure match state machine. The host (or the solo client) owns it; peers receive snapshots.
import type { Entry, Slot } from '../types';
import { canFill } from './pool';
import { seededRandom } from './rng';
import { rollEntry } from './roll';

export interface Player {
  id: string;
  name: string;
  color: string;
}

export interface MatchSettings {
  title: string;
  slots: Slot[];
  rerolls: number;
  /** Multiplayer matches end with a vote; solo or vote-less matches go straight to results. */
  voting: boolean;
}

export interface PlayerState {
  /** slotId -> entry key */
  board: Record<string, string>;
  /** Entry key currently rolled and waiting to be placed. */
  current: string | null;
  rerollsLeft: number;
  /** Rolls made this round, part of the roll seed so rerolls differ. */
  rollCount: number;
  /** Placed this round, waiting for the others. */
  ready: boolean;
}

export type Phase = 'playing' | 'voting' | 'results';

export interface MatchState {
  seed: number;
  round: number;
  phase: Phase;
  players: Player[];
  ps: Record<string, PlayerState>;
  votes: Record<string, string>;
  settings: MatchSettings;
}

export type MatchAction =
  | { type: 'assign'; playerId: string; slotId: string }
  | { type: 'reroll'; playerId: string }
  | { type: 'vote'; playerId: string; targetId: string }
  | { type: 'leave'; playerId: string };

/** An action as sent by a player; the host stamps the sender's id. */
export type PlayerAction = MatchAction extends infer A ? (A extends MatchAction ? Omit<A, 'playerId'> : never) : never;

function openSlots(settings: MatchSettings, board: Record<string, string>): Slot[] {
  return settings.slots.filter((s) => !(s.id in board));
}

function roll(state: Pick<MatchState, 'seed' | 'round' | 'settings'>, playerId: string, p: PlayerState, pool: Entry[]): string | null {
  const rand = seededRandom(state.seed, playerId, state.round, p.rollCount);
  const exclude = new Set(Object.values(p.board));
  return rollEntry(pool, openSlots(state.settings, p.board), exclude, rand)?.key ?? null;
}

export function createMatch(settings: MatchSettings, players: Player[], seed: number, pool: Entry[]): MatchState {
  const base = { seed, round: 0, settings };
  const ps: Record<string, PlayerState> = {};
  for (const pl of players) {
    const fresh: PlayerState = { board: {}, current: null, rerollsLeft: settings.rerolls, rollCount: 0, ready: false };
    ps[pl.id] = { ...fresh, current: roll(base, pl.id, fresh, pool) };
  }
  return { ...base, phase: 'playing', players, ps, votes: {} };
}

/** Moves to the next round (or to voting/results) once every player has placed. */
function advanceIfReady(state: MatchState, pool: Entry[]): MatchState {
  if (state.phase !== 'playing' || state.players.length === 0) return state;
  if (!state.players.every((pl) => state.ps[pl.id]?.ready)) return state;

  const round = state.round + 1;
  if (round >= state.settings.slots.length) {
    const phase: Phase = state.settings.voting && state.players.length > 1 ? 'voting' : 'results';
    return { ...state, round, phase };
  }
  const next = { ...state, round };
  const ps: Record<string, PlayerState> = {};
  for (const pl of state.players) {
    const reset: PlayerState = { ...state.ps[pl.id], ready: false, rollCount: 0 };
    ps[pl.id] = { ...reset, current: roll(next, pl.id, reset, pool) };
  }
  return { ...next, ps };
}

function finishVoteIfDone(state: MatchState): MatchState {
  if (state.phase !== 'voting') return state;
  const done = state.players.length > 0 && state.players.every((pl) => pl.id in state.votes);
  return done ? { ...state, phase: 'results' } : state;
}

export function reduceMatch(state: MatchState, action: MatchAction, pool: Entry[]): MatchState {
  const p = state.ps[action.playerId];
  switch (action.type) {
    case 'assign': {
      if (state.phase !== 'playing' || !p || p.ready || !p.current) return state;
      const slot = state.settings.slots.find((s) => s.id === action.slotId);
      const entry = pool.find((e) => e.key === p.current);
      if (!slot || slot.id in p.board || !entry || !canFill(entry, slot)) return state;
      const placed: PlayerState = { ...p, board: { ...p.board, [slot.id]: entry.key }, current: null, ready: true };
      return advanceIfReady({ ...state, ps: { ...state.ps, [action.playerId]: placed } }, pool);
    }
    case 'reroll': {
      if (state.phase !== 'playing' || !p || p.ready || p.rerollsLeft <= 0) return state;
      const bumped: PlayerState = { ...p, rerollsLeft: p.rerollsLeft - 1, rollCount: p.rollCount + 1 };
      const rerolled = { ...bumped, current: roll(state, action.playerId, bumped, pool) };
      return { ...state, ps: { ...state.ps, [action.playerId]: rerolled } };
    }
    case 'vote': {
      if (state.phase !== 'voting' || !p || !state.players.some((pl) => pl.id === action.targetId)) return state;
      return finishVoteIfDone({ ...state, votes: { ...state.votes, [action.playerId]: action.targetId } });
    }
    case 'leave': {
      if (!p) return state;
      const players = state.players.filter((pl) => pl.id !== action.playerId);
      const ps = { ...state.ps };
      delete ps[action.playerId];
      const votes = Object.fromEntries(
        Object.entries(state.votes).filter(([voter, target]) => voter !== action.playerId && target !== action.playerId),
      );
      return finishVoteIfDone(advanceIfReady({ ...state, players, ps, votes }, pool));
    }
  }
}

export function tallyVotes(state: MatchState): { counts: Record<string, number>; winners: string[] } {
  const counts: Record<string, number> = Object.fromEntries(state.players.map((pl) => [pl.id, 0]));
  for (const target of Object.values(state.votes)) if (target in counts) counts[target] += 1;
  const best = Math.max(0, ...Object.values(counts));
  const winners = best > 0 ? Object.keys(counts).filter((id) => counts[id] === best) : [];
  return { counts, winners };
}

/** Slots this player could put their current roll into. */
export function placeableSlots(state: MatchState, playerId: string, pool: Entry[]): Slot[] {
  const p = state.ps[playerId];
  const entry = p?.current ? pool.find((e) => e.key === p.current) : undefined;
  if (!p || !entry) return [];
  return openSlots(state.settings, p.board).filter((s) => canFill(entry, s));
}
