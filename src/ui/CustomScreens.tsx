import { useState } from 'react';
import { downloadPack, emptyPack, newId, packProblems, parsePack } from '../custom/packs';
import { fileToDataUrl } from '../custom/storage';
import { ANIME, BUILTIN_ENTRIES } from '../data';
import { entriesFromCustom } from '../engine/pool';
import { useGame } from '../store';
import { RARITIES, type CustomCharacter, type CustomPack, type Entry, type Rarity } from '../types';
import { CharacterCard, ImageEditor } from './components';

export function CustomScreen() {
  const packs = useGame((s) => s.packs);
  const { go, openLobby, deletePack, savePack, setNotice } = useGame.getState();
  const [draft, setDraft] = useState<CustomPack | null>(null);

  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      savePack(parsePack(await file.text()));
    } catch (err) {
      setNotice((err as Error).message);
    }
  }

  if (draft) return <PackEditor initial={draft} onClose={() => setDraft(null)} />;

  return (
    <div>
      <div className="topbar">
        <button className="btn small secondary" onClick={() => go('home')}>
          ← Back
        </button>
        <h2>Custom Games</h2>
        <span className="spacer" />
        <label className="btn small secondary">
          Import
          <input type="file" accept=".json,application/json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
        </label>
        <button className="btn small gold" onClick={() => setDraft(emptyPack())}>
          + New game
        </button>
      </div>
      {packs.length === 0 && (
        <div className="panel" style={{ textAlign: 'center' }}>
          <h3>No custom games yet</h3>
          <p className="muted">
            Make a "waifu builder", a "build your OC" game, or anything else. Pick the categories, add characters with your own
            pictures, and roll!
          </p>
          <button className="btn gold" onClick={() => setDraft(emptyPack())}>
            Create your first game
          </button>
        </div>
      )}
      <div className="pack-list">
        {packs.map((p) => (
          <div key={p.id} className="panel">
            <h3>{p.name}</h3>
            <p className="muted" style={{ fontSize: 13 }}>
              {p.attributes.map((a) => a.label).join(' · ')}
            </p>
            <p className="muted" style={{ fontSize: 13 }}>
              {p.characters.length} custom characters{p.animeIds.length > 0 && ` + ${p.animeIds.length} anime`}
            </p>
            <div className="row">
              <button className="btn small gold" disabled={packProblems(p).length > 0} onClick={() => openLobby('custom', p.id)}>
                Play
              </button>
              <button className="btn small secondary" onClick={() => setDraft(p)}>
                Edit
              </button>
              <button className="btn small secondary" onClick={() => downloadPack(p)}>
                Export
              </button>
              <button className="btn small secondary" onClick={() => confirm(`Delete "${p.name}"?`) && deletePack(p.id)}>
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const BLANK_CHARACTER = (): CustomCharacter => ({ id: newId(), name: '', group: '', rarity: 'B' });

function PackEditor({ initial, onClose }: { initial: CustomPack; onClose: () => void }) {
  const savePack = useGame((s) => s.savePack);
  const [pack, setPack] = useState<CustomPack>(initial);
  const [form, setForm] = useState<CustomCharacter>(BLANK_CHARACTER);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const problems = packProblems(pack);
  const editingExisting = pack.characters.some((c) => c.id === form.id);

  const patch = (p: Partial<CustomPack>) => setPack({ ...pack, ...p });
  const setAttr = (id: string, label: string) => patch({ attributes: pack.attributes.map((a) => (a.id === id ? { ...a, label } : a)) });

  async function upload(file: File | undefined) {
    if (!file) return;
    try {
      setForm({ ...form, image: await fileToDataUrl(file) });
      setError(null);
    } catch {
      setError('That file could not be read as a picture.');
    }
  }

  function submitCharacter() {
    if (!form.name.trim()) return setError('Give the character a name.');
    const url = imageUrl.trim();
    if (url && !/^https?:\/\/\S+$/.test(url)) return setError('Picture links must start with http.');
    const character = { ...form, name: form.name.trim(), group: form.group.trim(), image: url || form.image };
    const characters = editingExisting
      ? pack.characters.map((c) => (c.id === character.id ? character : c))
      : [...pack.characters, character];
    patch({ characters });
    setForm({ ...BLANK_CHARACTER(), group: character.group });
    setImageUrl('');
    setError(null);
  }

  function save() {
    savePack({ ...pack, attributes: pack.attributes.filter((a) => a.label.trim()) });
    onClose();
  }

  const preview: Entry[] = entriesFromCustom(pack);

  return (
    <div>
      <div className="topbar">
        <button className="btn small secondary" onClick={onClose}>
          ← Cancel
        </button>
        <h2>Edit custom game</h2>
        <span className="spacer" />
        <button className="btn gold" disabled={problems.length > 0} onClick={save}>
          Save
        </button>
      </div>
      {problems.length > 0 && <p style={{ color: 'var(--accent)' }}>{problems.join(' ')}</p>}
      <div className="editor-grid">
        <div className="panel">
          <div className="section-title">Game name</div>
          <input style={{ width: '100%' }} maxLength={60} value={pack.name} onChange={(e) => patch({ name: e.target.value })} />

          <div className="section">
            <div className="section-title">Categories players fill</div>
            {pack.attributes.map((a) => (
              <div key={a.id} className="list-row">
                <input className="grow" maxLength={40} value={a.label} onChange={(e) => setAttr(a.id, e.target.value)} />
                <button className="icon-btn" onClick={() => patch({ attributes: pack.attributes.filter((x) => x.id !== a.id) })}>
                  ✕
                </button>
              </div>
            ))}
            <button className="btn small secondary" onClick={() => patch({ attributes: [...pack.attributes, { id: newId(), label: '' }] })}>
              + Add category
            </button>
          </div>

          <div className="section">
            <div className="section-title">Also roll characters from</div>
            <div className="chips">
              {ANIME.map((a) => {
                const on = pack.animeIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    className={`chip ${on ? 'on' : ''}`}
                    onClick={() => patch({ animeIds: on ? pack.animeIds.filter((x) => x !== a.id) : [...pack.animeIds, a.id] })}
                  >
                    {a.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="section-title">{editingExisting ? 'Edit character' : 'Add your own character'}</div>
          <div className="list-row">
            <input className="grow" placeholder="Name" maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value as Rarity })}>
              {RARITIES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="list-row">
            <input
              className="grow"
              placeholder="Group / anime name (optional)"
              maxLength={40}
              value={form.group}
              onChange={(e) => setForm({ ...form, group: e.target.value })}
            />
          </div>
          <div className="list-row">
            <input className="grow" placeholder="Picture link (optional)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            <label className="btn small secondary">
              {form.image ? 'Picture ✓' : 'Upload'}
              <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
            </label>
          </div>
          <div className="row">
            <button className="btn small" onClick={submitCharacter}>
              {editingExisting ? 'Save character' : '+ Add character'}
            </button>
            {editingExisting && (
              <button className="btn small secondary" onClick={() => setForm(BLANK_CHARACTER())}>
                Cancel edit
              </button>
            )}
          </div>
          {error && <p style={{ color: 'var(--accent)' }}>{error}</p>}

          <div className="section">
            <div className="section-title">Characters ({pack.characters.length}) · tap one to edit</div>
            <div className="char-grid">
              {preview.map((entry, i) => {
                const character = pack.characters[i];
                return (
                  <div key={entry.key} style={{ position: 'relative' }}>
                    <button
                      className="remove"
                      onClick={() => patch({ characters: pack.characters.filter((c) => c.id !== character.id) })}
                    >
                      ✕
                    </button>
                    <CharacterCard
                      entry={entry}
                      onClick={() => {
                        setForm(character);
                        setImageUrl('');
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GalleryScreen() {
  const go = useGame((s) => s.go);
  const changed = useGame((s) => Object.keys(s.overrides).length);
  const [animeId, setAnimeId] = useState(ANIME[0].id);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const entries = BUILTIN_ENTRIES.filter(
    (e) => e.animeId === animeId && (!q || `${e.name} ${e.label ?? ''}`.toLowerCase().includes(q)),
  );

  return (
    <div>
      <div className="topbar">
        <button className="btn small secondary" onClick={() => go('home')}>
          ← Back
        </button>
        <h2>Gallery</h2>
        <span className="muted">
          {BUILTIN_ENTRIES.length} character forms · {changed} picture{changed === 1 ? '' : 's'} changed · tap a card to change its picture
        </span>
      </div>
      <div className="tabs">
        {ANIME.map((a) => (
          <button key={a.id} className={`chip ${a.id === animeId ? 'on' : ''}`} onClick={() => setAnimeId(a.id)}>
            {a.name}
          </button>
        ))}
        <input placeholder="Search characters…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <span className="muted" style={{ alignSelf: 'center' }}>
          {entries.length} shown
        </span>
      </div>
      <div className="char-grid">
        {entries.map((e) => (
          <CharacterCard key={e.key} entry={e} onClick={() => setEditing(e)} />
        ))}
      </div>
      {editing && <ImageEditor entry={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
