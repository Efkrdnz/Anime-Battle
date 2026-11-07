import { useMemo, useState } from 'react';
import { ANIME, BUILTIN_ENTRIES } from '../data';
import { availableSlots, startProblem, type LobbyConfig } from '../lobby';
import { MAX_PLAYERS } from '../net/peer';
import { useGame } from '../store';
import { RARITIES } from '../types';

export function HomeScreen({ initialCode }: { initialCode: string }) {
  const name = useGame((s) => s.name);
  const setName = useGame((s) => s.setName);
  const openLobby = useGame((s) => s.openLobby);
  const go = useGame((s) => s.go);
  const joinRoom = useGame((s) => s.joinRoom);
  const busy = useGame((s) => s.busy);
  const [code, setCode] = useState(initialCode);

  return (
    <div>
      <div className="hero">
        <div className="logo">ANIME BATTLES</div>
        <p className="tagline">Roll legendary characters, build the ultimate fighter, battle your friends.</p>
        <div className="row" style={{ justifyContent: 'center', marginBottom: 26 }}>
          <input placeholder="Your name" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <div className="mode-grid">
        <button className="mode-card" onClick={() => openLobby('create')}>
          <h2>Character Creation</h2>
          <p>Spin for characters and slot them into Strength, Speed, Devil Fruit, Domain Expansion… then vote on the best build.</p>
          <span className="emoji">🎰</span>
        </button>
        <button className="mode-card" onClick={() => go('custom')}>
          <h2>Custom Games</h2>
          <p>Make your own categories and characters with your own pictures. Just for fun, then restart.</p>
          <span className="emoji">🛠️</span>
        </button>
        <button className="mode-card" disabled>
          <h2>
            Card Battle <span className="badge-soon">SOON</span>
          </h2>
          <p>Roll a deck, fight 1v1 rounds and steal your opponent's cards.</p>
          <span className="emoji">🃏</span>
        </button>
        <button className="mode-card" onClick={() => go('gallery')}>
          <h2>Gallery</h2>
          <p>Browse every character and form, and change any picture you don't like.</p>
          <span className="emoji">🖼️</span>
        </button>
      </div>
      <div className="panel section">
        <h3>Join a friend</h3>
        <div className="row">
          <input
            placeholder="ROOM CODE"
            maxLength={5}
            value={code}
            style={{ textTransform: 'uppercase', letterSpacing: 4, width: 160 }}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button className="btn" disabled={code.length !== 5 || busy} onClick={() => joinRoom(code)}>
            {busy ? 'Joining…' : 'Join room'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Highest-rarity picture of an anime, used as its tile art. */
function useAnimeCovers(): Record<string, string | undefined> {
  return useMemo(() => {
    const covers: Record<string, string | undefined> = {};
    for (const anime of ANIME) {
      const entries = BUILTIN_ENTRIES.filter((e) => e.animeId === anime.id && e.image);
      entries.sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity));
      covers[anime.id] = entries[0]?.image;
    }
    return covers;
  }, []);
}

function CreateSettings({ config, readOnly }: { config: LobbyConfig; readOnly: boolean }) {
  const updateConfig = useGame((s) => s.updateConfig);
  const pack = useGame((s) => s.pack);
  const covers = useAnimeCovers();
  const slots = availableSlots(config, pack);

  function setAnime(animeIds: string[]) {
    const next = { ...config, animeIds };
    const available = availableSlots(next, null).map((s) => s.id);
    const kept = config.slotIds.filter((id) => available.includes(id));
    const added = animeIds.length === 1 ? available.filter((id) => id.startsWith(`${animeIds[0]}.`)) : [];
    updateConfig({ animeIds, slotIds: [...new Set([...kept, ...added])] });
  }

  const toggleAnime = (id: string) =>
    setAnime(config.animeIds.includes(id) ? config.animeIds.filter((a) => a !== id) : [...config.animeIds, id]);
  const toggleSlot = (id: string) =>
    updateConfig({ slotIds: config.slotIds.includes(id) ? config.slotIds.filter((s) => s !== id) : [...config.slotIds, id] });

  return (
    <>
      <div className="section-title">
        Anime pool
        {!readOnly && (
          <>
            <button onClick={() => setAnime(ANIME.map((a) => a.id))}>All</button>
            <button onClick={() => setAnime([])}>None</button>
          </>
        )}
      </div>
      <div className="anime-grid">
        {ANIME.map((a) => {
          const on = config.animeIds.includes(a.id);
          return (
            <button
              key={a.id}
              className={`anime-tile ${on ? 'on' : ''}`}
              style={{ '--tile': a.color } as React.CSSProperties}
              disabled={readOnly}
              onClick={() => toggleAnime(a.id)}
            >
              {covers[a.id] && <img src={covers[a.id]} alt="" referrerPolicy="no-referrer" />}
              <span>{a.name}</span>
              <div className="check">{on ? '✓' : ''}</div>
            </button>
          );
        })}
      </div>
      <div className="section">
        <div className="section-title">Attributes to fill ({config.slotIds.filter((id) => slots.some((s) => s.id === id)).length})</div>
        <div className="chips">
          {slots.map((s) => (
            <button
              key={s.id}
              className={`chip ${config.slotIds.includes(s.id) ? 'on' : ''}`}
              disabled={readOnly}
              onClick={() => toggleSlot(s.id)}
            >
              {s.label}
              {s.animeId && <span className="muted"> · {ANIME.find((a) => a.id === s.animeId)?.name}</span>}
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12 }}>
          Anime-specific attributes (like Devil Fruit) can only be filled by characters from that anime.
        </p>
      </div>
    </>
  );
}

function CustomSettings({ config, readOnly }: { config: LobbyConfig; readOnly: boolean }) {
  const packs = useGame((s) => s.packs);
  const pack = useGame((s) => s.pack);
  const updateConfig = useGame((s) => s.updateConfig);
  const go = useGame((s) => s.go);

  return (
    <>
      <div className="section-title">Custom game</div>
      {readOnly ? (
        <h3>{pack?.name ?? 'Loading…'}</h3>
      ) : (
        <div className="row">
          <select value={config.packId ?? ''} onChange={(e) => updateConfig({ packId: e.target.value || null })}>
            <option value="">Choose a game…</option>
            {packs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button className="btn small secondary" onClick={() => go('custom')}>
            Edit games
          </button>
        </div>
      )}
      {pack && (
        <div className="section">
          <div className="section-title">Categories</div>
          <div className="chips">
            {pack.attributes.map((a) => (
              <span key={a.id} className="chip on">
                {a.label}
              </span>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            {pack.characters.length} custom characters
            {pack.animeIds.length > 0 && ` + ${pack.animeIds.length} anime`}
          </p>
        </div>
      )}
    </>
  );
}

export function LobbyScreen() {
  const config = useGame((s) => s.config);
  const pack = useGame((s) => s.pack);
  const session = useGame((s) => s.session);
  const players = useGame((s) => s.players);
  const busy = useGame((s) => s.busy);
  const { updateConfig, hostRoom, startMatch, leaveSession, go } = useGame.getState();
  const readOnly = session.kind === 'client';
  const problem = startProblem(config, pack);
  const [copied, setCopied] = useState(false);

  function copyInvite() {
    const url = `${location.origin}${location.pathname}?room=${session.code}`;
    navigator.clipboard?.writeText(url).then(() => setCopied(true));
  }

  return (
    <div>
      <div className="topbar">
        <button className="btn small secondary" onClick={() => (session.kind === 'solo' ? go('home') : leaveSession())}>
          ← {session.kind === 'solo' ? 'Back' : 'Leave room'}
        </button>
        <h2>{config.mode === 'custom' ? 'Custom Game' : 'Character Creation'}</h2>
      </div>
      <div className="lobby-grid">
        <div className="panel">
          {config.mode === 'custom' ? <CustomSettings config={config} readOnly={readOnly} /> : <CreateSettings config={config} readOnly={readOnly} />}
          <div className="section row">
            <div>
              <div className="section-title">Rerolls per player</div>
              <div className="chips">
                {[0, 1, 2, 3].map((n) => (
                  <button key={n} className={`chip ${config.rerolls === n ? 'on' : ''}`} disabled={readOnly} onClick={() => updateConfig({ rerolls: n })}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="section-title">Vote for a winner (multiplayer)</div>
              <div className="chips">
                {[true, false].map((v) => (
                  <button key={String(v)} className={`chip ${config.voting === v ? 'on' : ''}`} disabled={readOnly} onClick={() => updateConfig({ voting: v })}>
                    {v ? 'Yes' : 'No, just for fun'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          {session.kind === 'solo' ? (
            <>
              <h3>Ready?</h3>
              <button className="btn gold" style={{ width: '100%' }} disabled={!!problem} onClick={startMatch}>
                Play solo
              </button>
              <div className="section">
                <div className="section-title">Play with friends</div>
                <button className="btn" style={{ width: '100%' }} disabled={busy} onClick={hostRoom}>
                  {busy ? 'Opening room…' : 'Create online room'}
                </button>
                <p className="muted" style={{ fontSize: 12 }}>
                  Up to {MAX_PLAYERS} players. Friends join with the room code, no account needed.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="section-title">Room code</div>
              <div className="room-code">{session.code}</div>
              {session.kind === 'host' && (
                <button className="btn small secondary" style={{ width: '100%', marginBottom: 14 }} onClick={copyInvite}>
                  {copied ? 'Link copied!' : 'Copy invite link'}
                </button>
              )}
              <div className="section-title">
                Players ({players.length}/{MAX_PLAYERS})
              </div>
              <div className="players">
                {players.map((p) => (
                  <div key={p.id} className="player-chip">
                    <span className="dot" style={{ background: p.color }} />
                    {p.name}
                    {p.id === session.myId && <span className="muted">(you)</span>}
                    {p.id === 'host' && <span className="status ready">HOST</span>}
                  </div>
                ))}
              </div>
              <div className="section">
                {session.kind === 'host' ? (
                  <button className="btn gold" style={{ width: '100%' }} disabled={!!problem} onClick={startMatch}>
                    Start match
                  </button>
                ) : (
                  <p className="muted">Waiting for the host to start…</p>
                )}
              </div>
            </>
          )}
          {problem && !readOnly && <p style={{ color: 'var(--accent)', fontSize: 13 }}>{problem}</p>}
        </div>
      </div>
    </div>
  );
}
