// Tier List mode: everyone gets the same random category and characters, ranks them S to F, then compares.
import confetti from 'canvas-confetti';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { TIER_CATEGORIES, categoryKeys, tierEntry } from '../data/tierlists';
import type { Player } from '../engine/match';
import {
  TIERS,
  agreement,
  agreementLabel,
  consensusList,
  emptyList,
  hotTakes,
  pairScores,
  verdicts,
  type TierId,
  type TierList,
  type TierMatch,
  type TierTopic,
} from '../engine/tier';
import type { LobbyConfig } from '../lobby';
import { useEntryImage, useGame, type TierDraft } from '../store';
import type { Entry } from '../types';
import { sfx } from './sfx';

type Zone = TierId | 'pool';

const TIER_COLORS: Record<TierId, string> = {
  S: '#ff3d5a',
  A: '#ff9f1c',
  B: '#ffd60a',
  C: '#80ed99',
  D: '#4cc9f0',
  F: '#b15cff',
};

const TIER_NAMES: Record<TierId, string> = {
  S: 'Peak',
  A: 'Great',
  B: 'Good',
  C: 'Mid',
  D: 'Weak',
  F: 'Trash',
};

const COUNTS = [10, 12, 16, 20, 24];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// ---------- Shared pieces ----------

export function TierCard({ entry, size = 'md', className = '' }: { entry: Entry; size?: 'xs' | 'sm' | 'md'; className?: string }) {
  const image = useEntryImage(entry);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);
  return (
    <div
      className={`tier-card ${size} ${className}`}
      style={{ '--anime': entry.color } as CSSProperties}
      title={`${entry.name}${entry.label ? ` (${entry.label})` : ''} · ${entry.animeName}`}
    >
      {image && !failed ? (
        <img src={image} alt={entry.name} draggable={false} referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <div className="tier-initials">{initials(entry.name)}</div>
      )}
      {size !== 'xs' && <div className="tier-name">{entry.name}</div>}
    </div>
  );
}

function TierLabel({ tier, small }: { tier: TierId; small?: boolean }) {
  return (
    <div className={`tier-label ${small ? 'small' : ''}`} style={{ '--tier': TIER_COLORS[tier] } as CSSProperties}>
      <span>{tier}</span>
      {!small && <em>{TIER_NAMES[tier]}</em>}
    </div>
  );
}

function TierBadge({ index }: { index: number | undefined }) {
  if (index === undefined) return <span className="tier-badge none">–</span>;
  const tier = TIERS[index];
  return (
    <span className="tier-badge" style={{ background: TIER_COLORS[tier] }}>
      {tier}
    </span>
  );
}

/** Entries for a deal; characters dealt in two forms get the form in their name, e.g. "Zetsu (White)". */
function entriesFor(keys: string[]): Entry[] {
  const entries = keys.map((k) => tierEntry(k)).filter((e): e is Entry => !!e);
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.name, (counts.get(e.name) ?? 0) + 1);
  return entries.map((e) => ((counts.get(e.name) ?? 0) > 1 && e.label ? { ...e, name: `${e.name} (${e.label})` } : e));
}

// ---------- Lobby ----------

export function TierSettings({ config, readOnly }: { config: LobbyConfig; readOnly: boolean }) {
  const updateConfig = useGame((s) => s.updateConfig);
  const chosen = config.tierCategory ?? 'random';
  const count = config.tierCount ?? 16;

  return (
    <>
      <div className="section-title">Category</div>
      <div className="cat-grid">
        <button className={`cat-tile random ${chosen === 'random' ? 'on' : ''}`} disabled={readOnly} onClick={() => updateConfig({ tierCategory: 'random' })}>
          <span className="cat-emoji">🎲</span>
          <strong>Surprise me</strong>
          <small>The game picks a random category every round.</small>
        </button>
        {TIER_CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`cat-tile ${chosen === c.id ? 'on' : ''}`}
            style={{ '--cat': c.color } as CSSProperties}
            disabled={readOnly}
            onClick={() => updateConfig({ tierCategory: c.id })}
          >
            <span className="cat-emoji">{c.emoji}</span>
            <strong>{c.name}</strong>
            <small>{c.blurb}</small>
            <span className="cat-count">{categoryKeys(c).length}</span>
          </button>
        ))}
      </div>
      <div className="section">
        <div className="section-title">Characters to rank</div>
        <div className="chips">
          {COUNTS.map((n) => (
            <button key={n} className={`chip ${count === n ? 'on' : ''}`} disabled={readOnly} onClick={() => updateConfig({ tierCount: n })}>
              {n}
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12 }}>
          Everyone in the room gets the same category and the same characters. Small categories deal all they have.
        </p>
      </div>
    </>
  );
}

// ---------- Game screen ----------

export function TierGameScreen() {
  const tier = useGame((s) => s.tier);
  const session = useGame((s) => s.session);
  const leaveSession = useGame((s) => s.leaveSession);
  const backToLobby = useGame((s) => s.backToLobby);
  const [introSeed, setIntroSeed] = useState<number | null>(null);
  if (!tier) return null;
  const showIntro = tier.phase === 'ranking' && introSeed !== tier.seed;

  return (
    <div>
      <div className="topbar">
        <h2>
          <span style={{ marginRight: 8 }}>{tier.topic.emoji}</span>
          {tier.topic.name}
        </h2>
        <span className="round-pill">{tier.topic.prompt}</span>
        <span className="spacer" />
        {session.code && <span className="code-pill">{session.code}</span>}
        <button className="btn small secondary" onClick={session.kind === 'solo' ? backToLobby : leaveSession}>
          {session.kind === 'solo' ? 'Quit' : 'Leave'}
        </button>
      </div>
      <AnimatePresence>{showIntro && <TierIntro key={tier.seed} topic={tier.topic} onDone={() => setIntroSeed(tier.seed)} />}</AnimatePresence>
      {tier.phase === 'ranking' && !showIntro && <RankingView key={tier.seed} tier={tier} myId={session.myId} />}
      {tier.phase === 'reveal' && <RevealView key={tier.seed} tier={tier} myId={session.myId} />}
    </div>
  );
}

// ---------- Intro: category roulette ----------

const ROW_H = 84;
const ROULETTE_LEN = 26;

function TierIntro({ topic, onDone }: { topic: TierTopic; onDone: () => void }) {
  const y = useMotionValue(0);
  const [landed, setLanded] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const strip = useMemo(() => {
    const others = TIER_CATEGORIES.filter((c) => c.id !== topic.id);
    const items: TierTopic[] = Array.from({ length: ROULETTE_LEN - 1 }, (_, i) => others[(i * 7 + topic.id.length) % others.length]);
    return [...items, topic];
  }, [topic]);

  useEffect(() => {
    let last = -1;
    const final = -(ROULETTE_LEN - 1) * ROW_H;
    const controls = animate(y, final, {
      duration: 2.1,
      ease: [0.12, 0.75, 0.15, 1],
      onUpdate(v) {
        const i = Math.round(-v / ROW_H);
        if (i !== last) {
          last = i;
          sfx.tick();
        }
      },
      onComplete() {
        setLanded(true);
        sfx.slam();
      },
    });
    return () => controls.stop();
  }, [y]);

  useEffect(() => {
    if (!landed) return;
    const t = setTimeout(() => doneRef.current(), 1700);
    return () => clearTimeout(t);
  }, [landed]);

  function skip() {
    if (landed) return doneRef.current();
    y.stop();
    y.set(-(ROULETTE_LEN - 1) * ROW_H);
    setLanded(true);
    sfx.slam();
  }

  return (
    <motion.div className="tier-intro" onClick={skip} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05 }}>
      <div className="intro-kicker">Tonight's tier list</div>
      <AnimatePresence mode="wait">
        {!landed ? (
          <motion.div key="spin" className="roulette" exit={{ opacity: 0, scale: 0.8 }}>
            <div className="roulette-window">
              <motion.div className="roulette-strip" style={{ y }}>
                {strip.map((c, i) => (
                  <div key={i} className="roulette-item" style={{ color: c.color }}>
                    <span>{c.emoji}</span> {c.name}
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="slam" className="intro-slam" initial={{ scale: 2.6, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: -2 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
            <div className="intro-emoji">{topic.emoji}</div>
            <h1 style={{ color: topic.color }}>{topic.name}</h1>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              {topic.prompt}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="intro-hint muted">Tap to {landed ? 'start ranking' : 'skip'}</div>
    </motion.div>
  );
}

// ---------- Ranking ----------

function freshDraft(keys: string[]): TierDraft {
  return { ...emptyList(), pool: [...keys] };
}

function zoneOf(draft: TierDraft, key: string): Zone | null {
  if (draft.pool.includes(key)) return 'pool';
  return TIERS.find((t) => draft[t].includes(key)) ?? null;
}

/** Moves a key to `zone` at `index` (index counted without the key itself). */
function moveKey(draft: TierDraft, key: string, zone: Zone, index?: number): TierDraft {
  const next: TierDraft = { ...draft, pool: draft.pool.filter((k) => k !== key) };
  for (const t of TIERS) next[t] = draft[t].filter((k) => k !== key);
  const target = [...next[zone]];
  target.splice(index ?? target.length, 0, key);
  next[zone] = target;
  return next;
}

function sameSpot(draft: TierDraft, key: string, zone: Zone, index: number): boolean {
  return zoneOf(draft, key) === zone && draft[zone].indexOf(key) === index;
}

function hitTest(x: number, y: number, key: string): { zone: Zone; index: number } | null {
  const zoneEl = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-zone]');
  if (!zoneEl) return null;
  const cards = [...zoneEl.querySelectorAll<HTMLElement>('[data-key]')].filter((c) => c.dataset.key !== key);
  let index = cards.length;
  for (let i = 0; i < cards.length; i++) {
    const r = cards[i].getBoundingClientRect();
    if (y < r.top || (y <= r.bottom && x < r.left + r.width / 2)) {
      index = i;
      break;
    }
  }
  return { zone: zoneEl.dataset.zone as Zone, index };
}

interface DragState {
  key: string;
  x: number;
  y: number;
  ox: number;
  oy: number;
  w: number;
  over: Zone | null;
}

const KEY_TO_ZONE: Record<string, Zone> = {
  s: 'S', a: 'A', b: 'B', c: 'C', d: 'D', f: 'F',
  '1': 'S', '2': 'A', '3': 'B', '4': 'C', '5': 'D', '6': 'F',
  '0': 'pool', backspace: 'pool', delete: 'pool',
};

function RankingView({ tier, myId }: { tier: TierMatch; myId: string }) {
  const stored = useGame((s) => (s.tierDraft?.seed === tier.seed ? s.tierDraft.draft : null));
  const setTierDraft = useGame((s) => s.setTierDraft);
  const tierDispatch = useGame((s) => s.tierDispatch);
  const isHost = useGame((s) => s.session.kind !== 'client');
  const [draft, setDraft] = useState<TierDraft>(() => stored ?? freshDraft(tier.keys));
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [flash, setFlash] = useState<{ zone: Zone; n: number } | null>(null);
  const [dealing, setDealing] = useState(!stored);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const locked = myId in tier.lists;
  const ranked = tier.keys.length - draft.pool.length;
  const byKey = useMemo(() => new Map(entriesFor(tier.keys).map((e) => [e.key, e])), [tier.keys]);
  const others = tier.players.filter((p) => p.id !== myId);
  const waiting = tier.players.filter((p) => !(p.id in tier.lists));

  useEffect(() => setTierDraft(tier.seed, draft), [draft, tier.seed, setTierDraft]);

  useEffect(() => {
    const t = setTimeout(() => tierDispatch({ type: 'progress', count: ranked }), 250);
    return () => clearTimeout(t);
  }, [ranked, tierDispatch]);

  useEffect(() => {
    if (!dealing) return;
    const t = setTimeout(() => setDealing(false), 400 + tier.keys.length * 45);
    return () => clearTimeout(t);
  }, [dealing, tier.keys.length]);

  function place(key: string, zone: Zone, index?: number) {
    setDraft((d) => moveKey(d, key, zone, index));
    setFlash({ zone, n: Date.now() });
    if (zone !== 'pool') sfx.drop(TIERS.indexOf(zone));
  }

  useEffect(() => {
    if (!selected || locked) return;
    function onKey(e: KeyboardEvent) {
      const zone = KEY_TO_ZONE[e.key.toLowerCase()];
      if (e.key === 'Escape') return setSelected(null);
      if (!zone || !selected) return;
      e.preventDefault();
      place(selected, zone);
      setSelected(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, locked]);

  function onPointerDown(e: React.PointerEvent, key: string) {
    if (locked || e.button !== 0) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY };
    let dragging = false;

    const move = (ev: PointerEvent) => {
      if (!dragging) {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 6) return;
        dragging = true;
        sfx.pick();
        setSelected(null);
      }
      ev.preventDefault();
      // Scroll the page when dragging near the top or bottom edge.
      if (ev.clientY < 70) window.scrollBy(0, -14);
      else if (ev.clientY > window.innerHeight - 70) window.scrollBy(0, 14);
      const hit = hitTest(ev.clientX, ev.clientY, key);
      setDrag({ key, x: ev.clientX, y: ev.clientY, ox: start.x - rect.left, oy: start.y - rect.top, w: rect.width, over: hit?.zone ?? null });
      if (hit && !sameSpot(draftRef.current, key, hit.zone, hit.index)) setDraft((d) => moveKey(d, key, hit.zone, hit.index));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!dragging) {
        setSelected((s) => (s === key ? null : key));
        sfx.pick();
        return;
      }
      setDrag(null);
      const zone = zoneOf(draftRef.current, key);
      if (zone) {
        setFlash({ zone, n: Date.now() });
        if (zone !== 'pool') sfx.drop(TIERS.indexOf(zone));
      }
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  function onZoneClick(zone: Zone) {
    if (!selected || locked) return;
    place(selected, zone);
    setSelected(null);
  }

  function lockIn() {
    const list = Object.fromEntries(TIERS.map((t) => [t, draft[t]])) as TierList;
    sfx.slam();
    tierDispatch({ type: 'submit', list });
  }

  function renderCards(zone: Zone) {
    return draft[zone].map((key, i) => {
      const entry = byKey.get(key);
      if (!entry) return null;
      const isDragged = drag?.key === key;
      return (
        <motion.div
          key={key}
          layoutId={`tier-${key}`}
          layout
          data-key={key}
          className={`tier-slot ${isDragged ? 'dragging' : ''} ${selected === key ? 'selected' : ''} ${locked ? 'locked' : ''}`}
          onPointerDown={(e) => onPointerDown(e, key)}
          onClick={(e) => e.stopPropagation()}
          initial={dealing && zone === 'pool' ? { opacity: 0, y: -60, rotate: (i % 2 ? 1 : -1) * 20, scale: 0.6 } : false}
          animate={{ opacity: isDragged ? 0.25 : 1, y: 0, rotate: 0, scale: 1 }}
          transition={{
            layout: { type: 'spring', stiffness: 600, damping: 40 },
            default: dealing ? { delay: 0.05 + i * 0.045, type: 'spring', stiffness: 300, damping: 20 } : { duration: 0.15 },
          }}
        >
          <TierCard entry={entry} />
        </motion.div>
      );
    });
  }

  const dragEntry = drag ? byKey.get(drag.key) : undefined;

  return (
    <div className="tier-grid">
      <div>
        <div className={`tier-board ${locked ? 'is-locked' : ''} ${selected ? 'has-selection' : ''}`}>
          {TIERS.map((t) => (
            <div
              key={t}
              className={`tier-row ${drag?.over === t ? 'over' : ''}`}
              style={{ '--tier': TIER_COLORS[t] } as CSSProperties}
              onClick={() => onZoneClick(t)}
            >
              <TierLabel tier={t} />
              <div className="tier-drop" data-zone={t}>
                {renderCards(t)}
                {draft[t].length === 0 && <span className="tier-empty">{selected ? `Tap to put it in ${t}` : 'Drop here'}</span>}
              </div>
              {flash?.zone === t && <motion.div key={flash.n} className="row-flash" initial={{ opacity: 0.7 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} />}
            </div>
          ))}
        </div>

        {!locked && (
          <div className={`panel tier-pool ${drag?.over === 'pool' ? 'over' : ''} ${draft.pool.length === 0 ? 'empty' : ''}`} onClick={() => onZoneClick('pool')}>
            <div className="section-title">
              {draft.pool.length > 0 ? `Unranked · ${draft.pool.length} left` : 'Everyone is ranked!'}
              {ranked > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDraft(freshDraft(tier.keys));
                  }}
                >
                  Reset
                </button>
              )}
              {draft.pool.length === 0 && (
                <button
                  className="btn small gold tray-lock"
                  onClick={(e) => {
                    e.stopPropagation();
                    lockIn();
                  }}
                >
                  {tier.players.length > 1 ? 'Lock in 🔒' : 'Finish 🔒'}
                </button>
              )}
            </div>
            <div className="tier-drop pool" data-zone="pool">
              {renderCards('pool')}
              {draft.pool.length === 0 && <span className="tier-empty">Drag a character back here to unrank it</span>}
            </div>
            {ranked === 0 && <p className="muted tier-help">Drag characters into a tier. Or tap one, then tap a row (or press S A B C D F).</p>}
          </div>
        )}
      </div>

      <div className="panel tier-side">
        <h3>{tier.topic.prompt}</h3>
        <div className="progress-bar big">
          <motion.div className="fill" animate={{ width: `${(ranked / Math.max(1, tier.keys.length)) * 100}%` }} />
          <span>
            {ranked} / {tier.keys.length} ranked
          </span>
        </div>
        {locked ? (
          <>
            <div className="locked-box">
              <div className="display" style={{ fontSize: 34 }}>Locked in! 🔒</div>
              <p className="muted">
                {waiting.length ? `Waiting for ${waiting.map((p) => p.name).join(', ')}…` : 'Revealing…'}
              </p>
            </div>
            <button className="btn small secondary" style={{ width: '100%' }} onClick={() => tierDispatch({ type: 'unlock' })}>
              ✏️ Change my list
            </button>
          </>
        ) : (
          <button className="btn gold" style={{ width: '100%' }} disabled={draft.pool.length > 0} onClick={lockIn}>
            {draft.pool.length > 0 ? `Rank ${draft.pool.length} more` : tier.players.length > 1 ? 'Lock in 🔒' : 'Finish 🔒'}
          </button>
        )}

        {others.length > 0 && (
          <div className="section">
            <div className="section-title">Friends</div>
            <div className="players">
              {others.map((p) => (
                <FriendProgress key={p.id} player={p} done={p.id in tier.lists} count={tier.progress[p.id] ?? 0} total={tier.keys.length} />
              ))}
            </div>
            <p className="muted" style={{ fontSize: 12 }}>
              Lists stay secret until everyone locks in.
            </p>
            {isHost && Object.keys(tier.lists).length > 0 && waiting.length > 0 && (
              <button className="btn small secondary" style={{ width: '100%' }} onClick={() => tierDispatch({ type: 'reveal' })}>
                Reveal now (skip unfinished)
              </button>
            )}
          </div>
        )}
      </div>

      {drag && dragEntry && (
        <div className="drag-ghost" style={{ left: drag.x - drag.ox, top: drag.y - drag.oy, width: drag.w }}>
          <TierCard entry={dragEntry} />
        </div>
      )}
    </div>
  );
}

function FriendProgress({ player, done, count, total }: { player: Player; done: boolean; count: number; total: number }) {
  return (
    <div className="player-chip" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
      <div className="row" style={{ gap: 8 }}>
        <span className="dot" style={{ background: player.color }} />
        <strong>{player.name}</strong>
        <span className={`status ${done ? 'ready' : 'wait'}`}>{done ? 'LOCKED IN' : 'ranking…'}</span>
      </div>
      <div className="progress-bar">
        <motion.div className="fill" style={{ background: player.color }} animate={{ width: `${(count / Math.max(1, total)) * 100}%` }} />
      </div>
    </div>
  );
}

// ---------- Reveal ----------

function ReadonlyTierList({ list, byKey, delayBase = 0, highlight }: { list: TierList; byKey: Map<string, Entry>; delayBase?: number; highlight?: string | null }) {
  return (
    <div className="tier-board compact">
      {TIERS.map((t, i) => (
        <motion.div
          key={t}
          className="tier-row"
          style={{ '--tier': TIER_COLORS[t] } as CSSProperties}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delayBase + (TIERS.length - 1 - i) * 0.18 }}
        >
          <TierLabel tier={t} small />
          <div className="tier-drop">
            {list[t].map((k) => {
              const e = byKey.get(k);
              return e ? <TierCard key={k} entry={e} size="sm" className={highlight === k ? 'glow' : ''} /> : null;
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const value = useMotionValue(0);
  const text = useTransform(value, (v) => `${Math.round(v)}%`);
  const dash = useTransform(value, (v) => `${(v / 100) * 302} 302`);
  const label = agreementLabel(score);

  useEffect(() => {
    const controls = animate(value, score, { duration: 1.8, ease: 'easeOut', delay: 0.4 });
    return () => controls.stop();
  }, [score, value]);

  const color = score >= 75 ? '#80ed99' : score >= 55 ? '#ffd60a' : score >= 35 ? '#ff9f1c' : '#ff3d5a';
  return (
    <div className="gauge">
      <svg viewBox="0 0 110 110" width="170" height="170">
        <circle cx="55" cy="55" r="48" fill="none" stroke="var(--line)" strokeWidth="10" />
        <motion.circle cx="55" cy="55" r="48" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" style={{ strokeDasharray: dash }} transform="rotate(-90 55 55)" />
      </svg>
      <motion.div className="gauge-value" style={{ color }}>
        {text}
      </motion.div>
      <motion.div className="gauge-label" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2.1, type: 'spring' }}>
        {label.emoji} {label.title}
      </motion.div>
    </div>
  );
}

function listAsText(topic: TierTopic, name: string, list: TierList, byKey: Map<string, Entry>): string {
  const rows = TIERS.map((t) => `${t}: ${list[t].map((k) => byKey.get(k)?.name ?? k).join(', ') || '—'}`);
  return `${topic.emoji} ${topic.name} — ${name}'s tier list\n${rows.join('\n')}`;
}

type RevealTab = 'lists' | 'characters' | 'group';

function RevealView({ tier, myId }: { tier: TierMatch; myId: string }) {
  const session = useGame((s) => s.session);
  const startMatch = useGame((s) => s.startMatch);
  const backToLobby = useGame((s) => s.backToLobby);
  const byKey = useMemo(() => new Map(entriesFor(tier.keys).map((e) => [e.key, e])), [tier.keys]);
  const finished = tier.players.filter((p) => p.id in tier.lists);
  const unfinished = tier.players.filter((p) => !(p.id in tier.lists));
  const multi = finished.length > 1;
  const [tab, setTab] = useState<RevealTab>('lists');
  const [copied, setCopied] = useState(false);
  const canControl = session.kind !== 'client';

  const rows = useMemo(() => verdicts(tier), [tier]);
  const pairs = useMemo(() => pairScores(tier), [tier]);
  const takes = useMemo(() => hotTakes(tier), [tier]);
  const consensus = useMemo(() => consensusList(tier), [tier]);
  const overall = pairs.length ? Math.round(pairs.reduce((s, p) => s + p.score, 0) / pairs.length) : 100;
  const agreed = rows.filter((r) => r.spread === 0);
  const disputed = rows[0] && rows[0].spread >= 2 ? rows[0] : null;
  const byAvg = [...rows].sort((a, b) => a.average - b.average);
  const nameOf = (id: string) => tier.players.find((p) => p.id === id)?.name ?? '?';

  // My list first, then the others.
  const ordered = [...finished].sort((a, b) => (a.id === myId ? -1 : b.id === myId ? 1 : 0));
  const myList = tier.lists[myId];

  useEffect(() => {
    sfx.win();
    if (!multi) return;
    const t = setTimeout(() => {
      if (overall >= 75) confetti({ particleCount: 160, spread: 100, origin: { y: 0.35 }, colors: ['#80ed99', '#ffd60a', '#4cc9f0'] });
      else if (overall < 35) confetti({ particleCount: 60, spread: 60, origin: { y: 0.35 }, colors: ['#ff3d5a', '#000'], scalar: 1.3 });
    }, 2200);
    return () => clearTimeout(t);
  }, [multi, overall]);

  function copy() {
    const text = myList
      ? listAsText(tier.topic, nameOf(myId), myList, byKey)
      : listAsText(tier.topic, 'Group', consensus, byKey);
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div>
      <div className="winner-banner">
        <motion.h1 initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
          {multi ? 'The Verdict' : 'Your Tier List'}
        </motion.h1>
        <p className="muted">
          {tier.topic.emoji} {tier.topic.prompt}
        </p>
      </div>

      {multi && (
        <div className="verdict-top">
          <div className="panel gauge-panel">
            <div className="section-title" style={{ justifyContent: 'center' }}>
              {finished.length === 2 ? `${nameOf(finished[0].id)} vs ${nameOf(finished[1].id)}` : 'Group harmony'}
            </div>
            <ScoreGauge score={overall} />
            {pairs.length > 1 && (
              <div className="pairs">
                {[...pairs].sort((a, b) => b.score - a.score).map((p) => (
                  <div key={`${p.a}-${p.b}`} className="pair">
                    <span>
                      {nameOf(p.a)} ↔ {nameOf(p.b)}
                    </span>
                    <strong>{p.score}%</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="highlights">
            {disputed && byKey.get(disputed.key) && (
              <Highlight delay={0.6} icon="🔥" title="Most disputed" entry={byKey.get(disputed.key)!}>
                {Object.entries(disputed.tiers).map(([pid, t]) => (
                  <span key={pid} className="mini-vote">
                    {nameOf(pid)} <TierBadge index={t} />
                  </span>
                ))}
              </Highlight>
            )}
            {byAvg[0] && byKey.get(byAvg[0].key) && (
              <Highlight delay={0.8} icon="👑" title="Group favourite" entry={byKey.get(byAvg[0].key)!}>
                Average tier <TierBadge index={Math.round(byAvg[0].average)} />
              </Highlight>
            )}
            {byAvg.length > 1 && byKey.get(byAvg[byAvg.length - 1].key) && (
              <Highlight delay={1} icon="🗑️" title="Group least favourite" entry={byKey.get(byAvg[byAvg.length - 1].key)!}>
                Average tier <TierBadge index={Math.round(byAvg[byAvg.length - 1].average)} />
              </Highlight>
            )}
            <motion.div className="panel highlight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
              <div className="hl-icon">🤝</div>
              <div>
                <div className="hl-title">Total agreement</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {agreed.length === 0 ? 'You did not agree on a single character.' : `Same tier for ${agreed.length} of ${tier.keys.length} characters.`}
                </div>
                <div className="agree-row">
                  {agreed.slice(0, 8).map((r) => (byKey.get(r.key) ? <TierCard key={r.key} entry={byKey.get(r.key)!} size="xs" /> : null))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {finished.length > 2 && (
        <div className="hot-takes">
          {finished.map((p, i) => {
            const take = takes[p.id];
            const e = take ? byKey.get(take.key) : undefined;
            if (!take || !e) return null;
            const mine = tier.lists[p.id] ? TIERS.findIndex((t) => tier.lists[p.id][t].includes(take.key)) : undefined;
            return (
              <motion.div key={p.id} className="hot-take" style={{ borderColor: p.color }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.4 + i * 0.15 }}>
                🌶️ <strong>{p.name}</strong>'s hot take: <strong>{e.name}</strong> in <TierBadge index={mine} />
                <span className="muted"> ({take.diff < 0 ? 'way higher' : 'way lower'} than everyone else)</span>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="row" style={{ justifyContent: 'center', margin: '18px 0' }}>
        {multi && (
          <div className="tabs" style={{ marginBottom: 0 }}>
            {(
              [
                ['lists', 'Side by side'],
                ['characters', 'Character by character'],
                ['group', 'Group tier list'],
              ] as [RevealTab, string][]
            ).map(([id, label]) => (
              <button key={id} className={`chip ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'lists' && (
        <div className={`compare-grid n${Math.min(ordered.length, 4)}`}>
          {ordered.map((p, i) => (
            <div key={p.id} className="panel compare-col" style={{ borderTopColor: p.color }}>
              <h3>
                <span className="dot" style={{ background: p.color }} /> {p.name}
                {p.id === myId && <span className="muted" style={{ fontSize: 16 }}> (you)</span>}
                {multi && p.id !== myId && myList && (
                  <span className="match-pill">{agreement(myList, tier.lists[p.id], tier.keys)}% match</span>
                )}
              </h3>
              <ReadonlyTierList list={tier.lists[p.id]} byKey={byKey} delayBase={i * 0.12} highlight={disputed?.key} />
            </div>
          ))}
        </div>
      )}

      {tab === 'characters' && (
        <div className="panel">
          <div className="verdict-table" style={{ '--cols': finished.length } as CSSProperties}>
            <div className="verdict-head">
              <span>Character</span>
              {finished.map((p) => (
                <span key={p.id} style={{ color: p.color }}>
                  {p.name}
                </span>
              ))}
              <span />
            </div>
            {rows.map((r, i) => {
              const e = byKey.get(r.key);
              if (!e) return null;
              return (
                <motion.div key={r.key} className="verdict-row" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                  <span className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                    <TierCard entry={e} size="xs" />
                    <span>
                      <strong>{e.name}</strong>
                      <br />
                      <small className="muted">{e.animeName}</small>
                    </span>
                  </span>
                  {finished.map((p) => (
                    <span key={p.id}>
                      <TierBadge index={r.tiers[p.id]} />
                    </span>
                  ))}
                  <span className="verdict-tag">{r.spread === 0 ? '🤝 Agreed' : r.spread >= 3 ? '🔥 Fight!' : r.spread === 2 ? '😤 Split' : '≈ Close'}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'group' && (
        <div className="panel" style={{ maxWidth: 900, margin: '0 auto' }}>
          <h3>Everyone's average</h3>
          <ReadonlyTierList list={consensus} byKey={byKey} />
        </div>
      )}

      {unfinished.length > 0 && <p className="muted" style={{ textAlign: 'center' }}>Didn't lock in: {unfinished.map((p) => p.name).join(', ')}</p>}

      <div className="row" style={{ justifyContent: 'center', margin: '22px 0' }}>
        {canControl ? (
          <>
            <button className="btn gold" onClick={startMatch}>
              🎲 Next category
            </button>
            <button className="btn secondary" onClick={backToLobby}>
              Change settings
            </button>
          </>
        ) : (
          <p className="muted">Waiting for the host to pick the next category…</p>
        )}
        <button className="btn secondary" onClick={copy}>
          {copied ? 'Copied!' : '📋 Copy as text'}
        </button>
      </div>
      {!multi && session.kind === 'solo' && (
        <p className="muted" style={{ textAlign: 'center', fontSize: 13 }}>
          Tip: create an online room from the lobby so your friends rank the exact same characters, then compare.
        </p>
      )}
    </div>
  );
}

function Highlight({ icon, title, entry, delay, children }: { icon: string; title: string; entry: Entry; delay: number; children: React.ReactNode }) {
  return (
    <motion.div className="panel highlight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <TierCard entry={entry} size="sm" />
      <div>
        <div className="hl-title">
          {icon} {title}
        </div>
        <div className="hl-name">{entry.name}</div>
        <div className="hl-extra">{children}</div>
      </div>
    </motion.div>
  );
}
