import { useMemo, useState } from 'react';
import { isPreset, newGroup, presetGroups } from '../custom/groups';
import { newId } from '../custom/packs';
import { ANIME, BUILTIN_ENTRIES } from '../data';
import { useGame } from '../store';
import type { CharacterGroup, Gender } from '../types';
import { CharacterCard } from './components';

/** Cards rendered at once in the editor; filtering narrows the list, "Select all shown" covers every match. */
const RENDER_LIMIT = 240;

const PRESETS = presetGroups(BUILTIN_ENTRIES);

/** Presets plus my saved groups plus groups a host sent, de-duplicated by id. */
export function useKnownGroups(): CharacterGroup[] {
  const groups = useGame((s) => s.groups);
  const remote = useGame((s) => s.remoteGroups);
  return useMemo(() => {
    const byId = new Map([...PRESETS, ...remote, ...groups].map((g) => [g.id, g]));
    return [...byId.values()];
  }, [groups, remote]);
}

interface GroupChipsProps {
  selected: string[];
  onChange: (ids: string[]) => void;
  readOnly?: boolean;
}

/** Toggleable chip row of character groups. */
export function GroupChips({ selected, onChange, readOnly }: GroupChipsProps) {
  const known = useKnownGroups();
  const shown = readOnly ? known.filter((g) => selected.includes(g.id)) : known;
  if (shown.length === 0) return <p className="muted" style={{ fontSize: 13 }}>No groups selected.</p>;
  return (
    <div className="chips">
      {shown.map((g) => {
        const on = selected.includes(g.id);
        return (
          <button
            key={g.id}
            className={`chip ${on ? 'on' : ''}`}
            disabled={readOnly}
            onClick={() => onChange(on ? selected.filter((id) => id !== g.id) : [...selected, g.id])}
          >
            {isPreset(g.id) && '🔒 '}
            {g.name} <span className="muted">· {g.keys.length}</span>
          </button>
        );
      })}
    </div>
  );
}

/** List of presets and saved groups, shown on the Custom Games screen. */
export function GroupsSection({ onEdit }: { onEdit: (group: CharacterGroup) => void }) {
  const groups = useGame((s) => s.groups);
  const deleteGroup = useGame((s) => s.deleteGroup);
  const duplicate = (g: CharacterGroup) => onEdit(newGroup(newId(), `${g.name} (copy)`, g.keys));

  return (
    <div className="section">
      <div className="topbar" style={{ marginBottom: 10 }}>
        <h2>Character groups</h2>
        <span className="muted">Sets of characters a game can roll from, like "Females" or "Kages".</span>
        <span className="spacer" />
        <button className="btn small gold" onClick={() => onEdit(newGroup(newId()))}>
          + New group
        </button>
      </div>
      <div className="pack-list">
        {[...PRESETS, ...groups].map((g) => {
          const preset = isPreset(g.id);
          return (
            <div key={g.id} className="panel">
              <h3>
                {preset && <span className="lock">🔒 BUILT-IN</span>} {g.name}
              </h3>
              <p className="muted" style={{ fontSize: 13 }}>
                {g.keys.length} character forms
              </p>
              <div className="row">
                {!preset && (
                  <button className="btn small secondary" onClick={() => onEdit(g)}>
                    Edit
                  </button>
                )}
                <button className="btn small secondary" onClick={() => duplicate(g)}>
                  Duplicate
                </button>
                {!preset && (
                  <button className="btn small secondary" onClick={() => confirm(`Delete "${g.name}"?`) && deleteGroup(g.id)}>
                    🗑
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type GenderFilter = 'all' | Gender;

/** Pick character forms for a group: filter by anime, name/form text and gender, tap to toggle. */
export function GroupEditor({ initial, onClose }: { initial: CharacterGroup; onClose: () => void }) {
  const saveGroup = useGame((s) => s.saveGroup);
  const [name, setName] = useState(initial.name);
  const [keys, setKeys] = useState<Set<string>>(() => new Set(initial.keys));
  const [animeId, setAnimeId] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [gender, setGender] = useState<GenderFilter>('all');
  const [onlySelected, setOnlySelected] = useState(false);

  const q = query.trim().toLowerCase();
  const matches = BUILTIN_ENTRIES.filter(
    (e) =>
      (animeId === 'all' || e.animeId === animeId) &&
      (gender === 'all' || e.gender === gender) &&
      (!onlySelected || keys.has(e.key)) &&
      (!q || `${e.name} ${e.label ?? ''}`.toLowerCase().includes(q)),
  );

  const toggle = (key: string) => {
    const next = new Set(keys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setKeys(next);
  };
  const selectShown = (on: boolean) => {
    const next = new Set(keys);
    for (const e of matches) {
      if (on) next.add(e.key);
      else next.delete(e.key);
    }
    setKeys(next);
  };
  const canSave = name.trim().length > 0 && keys.size > 0;

  function save() {
    saveGroup({ ...initial, name: name.trim().slice(0, 40), keys: [...keys] });
    onClose();
  }

  return (
    <div>
      <div className="topbar">
        <button className="btn small secondary" onClick={onClose}>
          ← Cancel
        </button>
        <input value={name} maxLength={40} placeholder="Group name (e.g. Kages)" onChange={(e) => setName(e.target.value)} />
        <span className="round-pill">{keys.size} selected</span>
        <span className="spacer" />
        <button className="btn gold" disabled={!canSave} onClick={save}>
          Save group
        </button>
      </div>

      <div className="tabs">
        {[{ id: 'all', name: 'All anime' }, ...ANIME].map((a) => (
          <button key={a.id} className={`chip ${a.id === animeId ? 'on' : ''}`} onClick={() => setAnimeId(a.id)}>
            {a.name}
          </button>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <input placeholder='Search name or form, e.g. "hokage"' value={query} onChange={(e) => setQuery(e.target.value)} />
        {(['all', 'female', 'male', 'other'] as GenderFilter[]).map((g) => (
          <button key={g} className={`chip ${gender === g ? 'on' : ''}`} onClick={() => setGender(g)}>
            {g === 'all' ? 'Any gender' : g[0].toUpperCase() + g.slice(1)}
          </button>
        ))}
        <button className={`chip ${onlySelected ? 'on' : ''}`} onClick={() => setOnlySelected(!onlySelected)}>
          Selected only
        </button>
        <span className="spacer grow" />
        <span className="muted">{matches.length} shown</span>
        <button className="btn small secondary" onClick={() => selectShown(true)}>
          Select all shown
        </button>
        <button className="btn small secondary" onClick={() => selectShown(false)}>
          Clear shown
        </button>
      </div>

      <div className="char-grid">
        {matches.slice(0, RENDER_LIMIT).map((e) => (
          <div key={e.key} className={`pick ${keys.has(e.key) ? 'on' : ''}`}>
            <CharacterCard entry={e} onClick={() => toggle(e.key)} />
            {keys.has(e.key) && <span className="pick-check">✓</span>}
          </div>
        ))}
      </div>
      {matches.length > RENDER_LIMIT && (
        <p className="muted">
          Showing {RENDER_LIMIT} of {matches.length}. Search or pick an anime to narrow it down ("Select all shown" still covers all{' '}
          {matches.length}).
        </p>
      )}
    </div>
  );
}
