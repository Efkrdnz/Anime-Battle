import { useEffect, useRef, useState } from 'react';
import { placeableSlots, tallyVotes, type MatchState } from '../engine/match';
import { useGame, usePool } from '../store';
import type { Entry } from '../types';
import { Board, CharacterCard, ImageEditor, rarityName } from './components';
import { Reel, RevealFlash, celebrate } from './Reel';
import { sfx } from './sfx';

export function GameScreen() {
  const match = useGame((s) => s.match);
  const session = useGame((s) => s.session);
  const leaveSession = useGame((s) => s.leaveSession);
  if (!match) return null;
  const total = match.settings.slots.length;

  return (
    <div>
      <div className="topbar">
        <h2>{match.settings.title}</h2>
        {match.phase === 'playing' && (
          <span className="round-pill">
            Round {Math.min(match.round + 1, total)} / {total}
          </span>
        )}
        <span className="spacer" />
        {session.code && <span className="code-pill">{session.code}</span>}
        <button className="btn small secondary" onClick={leaveSession}>
          Leave
        </button>
      </div>
      {match.phase === 'playing' && <PlayingView match={match} myId={session.myId} />}
      {match.phase === 'voting' && <VoteView match={match} myId={session.myId} />}
      {match.phase === 'results' && <ResultsView match={match} myId={session.myId} />}
    </div>
  );
}

function PlayingView({ match, myId }: { match: MatchState; myId: string }) {
  const pool = usePool();
  const dispatch = useGame((s) => s.dispatch);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const me = match.ps[myId];
  const target = me?.current ? pool.find((e) => e.key === me.current) : undefined;
  const spinKey = `${match.round}-${me?.rollCount}-${me?.current}`;
  const isRevealed = revealed === spinKey;
  const placeable = isRevealed && target ? placeableSlots(match, myId, pool).map((s) => s.id) : [];
  const others = match.players.filter((p) => p.id !== myId);
  const waitingFor = match.players.filter((p) => !match.ps[p.id]?.ready);

  function onSpinDone() {
    setRevealed(spinKey);
    if (target) celebrate(target.rarity, stageRef.current);
  }

  function place(slotId: string) {
    sfx.place();
    dispatch({ type: 'assign', slotId });
  }

  return (
    <div className="game-grid">
      <div>
        <div className="panel stage" ref={stageRef}>
          {!me ? (
            <p className="muted">Joining the match…</p>
          ) : me.ready ? (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 40 }}>Locked in!</h2>
              <p className="muted">Waiting for {waitingFor.map((p) => p.name).join(', ') || 'the next round'}…</p>
            </div>
          ) : !target ? (
            <p className="muted">No characters left to roll for your open slots.</p>
          ) : !isRevealed ? (
            <Reel pool={pool} target={target} spinKey={spinKey} onDone={onSpinDone} />
          ) : (
            <>
              <RevealFlash rarity={target.rarity} />
              <div className="reveal">
                <CharacterCard entry={target} size="lg" onEdit={() => setEditing(target)} />
                <div className="reveal-info">
                  <div className={`rarity-word r-${target.rarity}`}>
                    {target.rarity} · {rarityName(target)}
                  </div>
                  <h2>{target.name}</h2>
                  {target.label && <div className="display" style={{ fontSize: 22, color: target.color }}>{target.label}</div>}
                  <p className="muted">{target.animeName}</p>
                  <p>
                    <strong>Choose a slot</strong> on your board for this character →
                  </p>
                  {me.rerollsLeft > 0 && (
                    <button className="btn small secondary" onClick={() => dispatch({ type: 'reroll' })}>
                      🎲 Reroll ({me.rerollsLeft} left)
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {others.length > 0 && (
          <div className="section">
            <div className="section-title">Opponents</div>
            <div className="builds">
              {others.map((p) => (
                <div className="panel" key={p.id} style={{ padding: 12 }}>
                  <div className="player-chip" style={{ marginBottom: 8 }}>
                    <span className="dot" style={{ background: p.color }} />
                    <strong>{p.name}</strong>
                    <span className={`status ${match.ps[p.id]?.ready ? 'ready' : 'wait'}`}>
                      {match.ps[p.id]?.ready ? 'LOCKED IN' : 'choosing…'}
                    </span>
                  </div>
                  <Board slots={match.settings.slots} board={match.ps[p.id]?.board ?? {}} pool={pool} compact />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Your build</h3>
        <Board slots={match.settings.slots} board={me?.board ?? {}} pool={pool} placeable={placeable} onPlace={place} />
      </div>
      {editing && <ImageEditor entry={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function VoteView({ match, myId }: { match: MatchState; myId: string }) {
  const pool = usePool();
  const dispatch = useGame((s) => s.dispatch);
  const myVote = match.votes[myId];
  const voted = Object.keys(match.votes).length;

  return (
    <div>
      <div className="winner-banner">
        <h1>Who built the best?</h1>
        <p className="muted">
          Vote for the strongest build. {voted} / {match.players.length} voted.
        </p>
      </div>
      <div className="builds">
        {match.players.map((p) => (
          <div key={p.id} className={`panel build ${myVote === p.id ? 'voted' : ''}`}>
            <h3>
              <span className="dot" style={{ background: p.color, width: 14, height: 14, borderRadius: '50%', display: 'inline-block' }} />
              {p.name}
              {p.id === myId && <span className="muted" style={{ fontSize: 16 }}>(you)</span>}
            </h3>
            <Board slots={match.settings.slots} board={match.ps[p.id]?.board ?? {}} pool={pool} />
            <div style={{ marginTop: 12 }}>
              <button className={`btn ${myVote === p.id ? 'gold' : ''}`} onClick={() => dispatch({ type: 'vote', targetId: p.id })}>
                {myVote === p.id ? 'Voted ✓' : `Vote ${p.name}`}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsView({ match, myId }: { match: MatchState; myId: string }) {
  const pool = usePool();
  const session = useGame((s) => s.session);
  const startMatch = useGame((s) => s.startMatch);
  const backToLobby = useGame((s) => s.backToLobby);
  const isCustom = useGame((s) => s.config.mode === 'custom');
  const { counts, winners } = tallyVotes(match);
  const voted = match.settings.voting && match.players.length > 1;
  const canControl = session.kind !== 'client';

  useEffect(() => {
    sfx.win();
  }, []);

  let headline = match.players.length > 1 ? 'Final builds' : 'Your build';
  if (voted && winners.length === 1) headline = `${match.players.find((p) => p.id === winners[0])?.name} wins!`;
  if (voted && winners.length > 1) headline = "It's a tie!";

  return (
    <div>
      <div className="winner-banner">
        <h1>{headline}</h1>
        {!voted && isCustom && <p className="muted">No winner here. Decide among yourselves, then hit restart!</p>}
      </div>
      <div className="row" style={{ justifyContent: 'center', marginBottom: 20 }}>
        {canControl ? (
          <>
            <button className="btn gold" onClick={startMatch}>
              {isCustom ? '↻ Restart' : '↻ Rematch'}
            </button>
            <button className="btn secondary" onClick={backToLobby}>
              Change settings
            </button>
          </>
        ) : (
          <p className="muted">Waiting for the host to restart…</p>
        )}
      </div>
      <div className="builds">
        {match.players.map((p) => {
          const isWinner = voted && winners.includes(p.id);
          return (
            <div key={p.id} className={`panel build ${isWinner ? 'winner' : ''}`}>
              <h3>
                {isWinner && <span className="crown">👑</span>}
                {p.name}
                {p.id === myId && <span className="muted" style={{ fontSize: 16 }}>(you)</span>}
                {voted && (
                  <span className="muted" style={{ marginLeft: 'auto', fontSize: 18 }}>
                    {counts[p.id] ?? 0} vote{counts[p.id] === 1 ? '' : 's'}
                  </span>
                )}
              </h3>
              <Board slots={match.settings.slots} board={match.ps[p.id]?.board ?? {}} pool={pool} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
