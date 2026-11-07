import { useEffect, useState, type ReactNode } from 'react';
import { fileToDataUrl } from '../custom/storage';
import { UNIVERSAL_STATS } from '../data/attributes';
import { ANIME_BY_ID } from '../data';
import { slotValue } from '../engine/pool';
import { useEntryImage, useGame } from '../store';
import type { Entry, Slot } from '../types';

const RARITY_NAMES = { C: 'Common', B: 'Rare', A: 'Epic', S: 'Legendary', SS: 'Mythic' } as const;

export function rarityName(entry: Entry): string {
  return RARITY_NAMES[entry.rarity];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

interface CardProps {
  entry: Entry;
  size?: 'sm' | 'md' | 'lg';
  onEdit?: () => void;
  onClick?: () => void;
}

export function CharacterCard({ entry, size = 'md', onEdit, onClick }: CardProps) {
  const image = useEntryImage(entry);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);

  return (
    <div
      className={`card r-${entry.rarity} ${size}`}
      style={{ '--anime': entry.color } as React.CSSProperties}
      onClick={onClick}
      title={`${entry.name}${entry.label ? ` (${entry.label})` : ''}`}
    >
      {image && !failed ? (
        <img className="pic" src={image} alt={entry.name} loading="lazy" referrerPolicy="no-referrer" draggable={false} onError={() => setFailed(true)} />
      ) : (
        <div className="initials">{initials(entry.name)}</div>
      )}
      <div className="rar">{entry.rarity}</div>
      {entry.label && <div className="form">{entry.label}</div>}
      <div className="caption">
        <div className="name">{entry.name}</div>
        <div className="anime">{entry.animeName}</div>
      </div>
      {onEdit && (
        <button
          className="edit"
          title="Change picture"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          🖼️
        </button>
      )}
    </div>
  );
}

const STAT_ICONS: Record<string, string> = Object.fromEntries(UNIVERSAL_STATS.map((s) => [s.id, s.icon]));

interface BoardProps {
  slots: Slot[];
  board: Record<string, string>;
  pool: Entry[];
  /** Slot ids the current roll can go into; enables placing. */
  placeable?: string[];
  onPlace?: (slotId: string) => void;
  compact?: boolean;
}

export function Board({ slots, board, pool, placeable, onPlace, compact }: BoardProps) {
  const byKey = new Map(pool.map((e) => [e.key, e]));
  return (
    <div className={`board ${compact ? 'compact' : ''}`}>
      {slots.map((slot) => {
        const entry = board[slot.id] ? byKey.get(board[slot.id]) : undefined;
        const canPlace = !entry && placeable?.includes(slot.id);
        const blocked = !entry && placeable && !canPlace;
        const value = entry ? slotValue(entry, slot) : null;
        const anime = slot.animeId ? ANIME_BY_ID[slot.animeId] : undefined;
        return (
          <button
            key={slot.id}
            className={`slot ${entry ? 'filled' : ''} ${canPlace ? 'can-place' : ''} ${blocked ? 'blocked' : ''}`}
            disabled={!canPlace}
            onClick={() => canPlace && onPlace?.(slot.id)}
          >
            {entry ? <CharacterCard entry={entry} size="sm" /> : <span className="icon">{STAT_ICONS[slot.id] ?? '✦'}</span>}
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="label">
                {slot.label}
                {anime && !compact && (
                  <span className="anime-tag" style={{ color: anime.color }}>
                    {' '}
                    · {anime.name}
                  </span>
                )}
              </div>
              <div className="value">
                {entry
                  ? `${entry.name}${entry.label ? ` (${entry.label})` : ''}${slot.kind === 'trait' && value ? ` — ${value}` : ''}`
                  : canPlace
                    ? 'Place here'
                    : 'Empty'}
              </div>
            </div>
            {entry && slot.kind === 'stat' && value && <span className={`rank rank-${value}`}>{value}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="panel modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/** Change the picture of a built-in character form (saved in this browser). */
export function ImageEditor({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const setOverride = useGame((s) => s.setOverride);
  const hasOverride = useGame((s) => entry.key in s.overrides);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    try {
      setOverride(entry.key, await fileToDataUrl(file));
      setError(null);
    } catch {
      setError('That file could not be read as a picture.');
    }
  }

  function applyUrl() {
    if (!/^https?:\/\/\S+$/.test(url.trim())) return setError('Paste a full picture link starting with http.');
    setOverride(entry.key, url.trim());
    setUrl('');
    setError(null);
  }

  return (
    <Modal onClose={onClose}>
      <h3>Change picture</h3>
      <div className="preview">
        <CharacterCard entry={entry} size="lg" />
      </div>
      <div className="row" style={{ marginBottom: 10 }}>
        <input className="grow" placeholder="Paste a picture link…" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button className="btn small" onClick={applyUrl}>
          Use link
        </button>
      </div>
      <div className="row">
        <label className="btn small secondary">
          Upload file
          <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        {hasOverride && (
          <button className="btn small secondary" onClick={() => setOverride(entry.key, null)}>
            Reset to default
          </button>
        )}
        <span className="grow" />
        <button className="btn small gold" onClick={onClose}>
          Done
        </button>
      </div>
      {error && <p style={{ color: 'var(--accent)' }}>{error}</p>}
      <p className="muted" style={{ fontSize: 12 }}>
        Changes are saved in this browser. When you host a room, your friends see your pictures too.
      </p>
    </Modal>
  );
}
