// App state. In solo and host sessions the match reducer runs here; clients mirror the host's snapshots.
import { create } from 'zustand';
import { usedGroups } from './custom/groups';
import { loadGroups, loadOverrides, loadPacks, saveGroups, saveOverrides, savePacks } from './custom/storage';
import { createMatch, reduceMatch, type MatchAction, type MatchState, type Player, type PlayerAction } from './engine/match';
import { randomSeed } from './engine/rng';
import { buildPool, defaultConfig, matchSettings, startProblem, type LobbyConfig } from './lobby';
import { ClientSession, HostSession, MAX_PLAYERS, type HostMsg } from './net/peer';
import type { CharacterGroup, CustomPack, Entry } from './types';

export type Screen = 'home' | 'lobby' | 'game' | 'custom' | 'gallery';

export interface Session {
  kind: 'solo' | 'host' | 'client';
  code: string | null;
  myId: string;
}

const PLAYER_COLORS = ['#ff4d6d', '#4cc9f0', '#ffd60a', '#80ed99'];
const HOST_ID = 'host';

interface State {
  screen: Screen;
  name: string;
  session: Session;
  players: Player[];
  config: LobbyConfig;
  /** Pack used by the current custom lobby (own pack on the host, received pack on clients). */
  pack: CustomPack | null;
  match: MatchState | null;
  packs: CustomPack[];
  overrides: Record<string, string>;
  remoteOverrides: Record<string, string>;
  /** My saved character groups. */
  groups: CharacterGroup[];
  /** Groups the host sent for the current lobby. */
  remoteGroups: CharacterGroup[];
  notice: string | null;
  busy: boolean;

  init(): Promise<void>;
  go(screen: Screen): void;
  setName(name: string): void;
  setNotice(notice: string | null): void;
  openLobby(mode: LobbyConfig['mode'], packId?: string): void;
  updateConfig(patch: Partial<LobbyConfig>): void;
  hostRoom(): Promise<void>;
  joinRoom(code: string): Promise<void>;
  leaveSession(): void;
  startMatch(): void;
  dispatch(action: PlayerAction): void;
  backToLobby(): void;
  savePack(pack: CustomPack): void;
  deletePack(id: string): void;
  setOverride(key: string, image: string | null): void;
  saveGroup(group: CharacterGroup): void;
  deleteGroup(id: string): void;
}

let host: HostSession | null = null;
let client: ClientSession | null = null;

const soloSession = (): Session => ({ kind: 'solo', code: null, myId: HOST_ID });

function me(name: string, index: number, id: string): Player {
  return { id, name: name || 'Player', color: PLAYER_COLORS[index % PLAYER_COLORS.length] };
}

/** Groups the pool can reference: mine plus any the host sent. */
export const poolGroups = (s: Pick<State, 'groups' | 'remoteGroups'>): CharacterGroup[] => [...s.remoteGroups, ...s.groups];

export const usePool = (): Entry[] => useGame((s) => buildPool(s.config, s.pack, poolGroups(s)));

export const useGame = create<State>((set, get) => {
  const poolNow = () => buildPool(get().config, get().pack, poolGroups(get()));

  function broadcastLobby() {
    const { players, config } = get();
    for (const p of players) if (p.id !== HOST_ID) host?.send(p.id, { t: 'lobby', players, config, you: p.id });
  }

  function broadcastPack(targetId?: string) {
    const { pack, config, overrides, groups } = get();
    const ids = [...(config.groupIds ?? []), ...(pack?.groupIds ?? [])];
    const msg: HostMsg = { t: 'pack', pack, overrides, groups: usedGroups(ids, groups) };
    if (targetId) host?.send(targetId, msg);
    else host?.broadcast(msg);
  }

  function setMatch(match: MatchState | null) {
    set({ match });
    host?.broadcast({ t: 'match', match });
  }

  function applyAction(action: MatchAction) {
    const { match } = get();
    if (!match) return;
    const next = reduceMatch(match, action, poolNow());
    if (next !== match) setMatch(next);
  }

  function onHostMsg(msg: HostMsg) {
    switch (msg.t) {
      case 'lobby':
        set({ players: msg.players, config: msg.config, session: { ...get().session, myId: msg.you } });
        break;
      case 'pack':
        set({ pack: msg.pack, remoteOverrides: msg.overrides, remoteGroups: msg.groups ?? [] });
        break;
      case 'match':
        set({ match: msg.match, screen: msg.match ? 'game' : 'lobby' });
        break;
      case 'bye':
        get().leaveSession();
        set({ notice: msg.reason });
        break;
    }
  }

  function resolvePack(config: LobbyConfig): CustomPack | null {
    return config.mode === 'custom' ? (get().packs.find((p) => p.id === config.packId) ?? null) : null;
  }

  return {
    screen: 'home',
    name: localStorage.getItem('ab-name') ?? '',
    session: soloSession(),
    players: [],
    config: defaultConfig(),
    pack: null,
    match: null,
    packs: [],
    overrides: {},
    remoteOverrides: {},
    groups: [],
    remoteGroups: [],
    notice: null,
    busy: false,

    async init() {
      try {
        const [packs, overrides, groups] = await Promise.all([loadPacks(), loadOverrides(), loadGroups()]);
        set({ packs, overrides, groups });
      } catch {
        set({ notice: 'Saved games could not be loaded (browser storage is blocked).' });
      }
    },

    go: (screen) => set({ screen }),
    setNotice: (notice) => set({ notice }),

    setName(name) {
      localStorage.setItem('ab-name', name);
      set({ name });
    },

    openLobby(mode, packId) {
      const base = get().session.kind === 'client' ? get().config : defaultConfig();
      const config: LobbyConfig = { ...base, mode, packId: packId ?? null };
      set({
        config,
        pack: resolvePack(config),
        match: null,
        screen: 'lobby',
        players: get().players.length ? get().players : [me(get().name, 0, HOST_ID)],
      });
      broadcastLobby();
      broadcastPack();
    },

    updateConfig(patch) {
      if (get().session.kind === 'client') return;
      const config = { ...get().config, ...patch };
      const pack = resolvePack(config);
      const packChanged = pack !== get().pack || patch.groupIds !== undefined;
      set({ config, pack });
      broadcastLobby();
      if (packChanged) broadcastPack();
    },

    async hostRoom() {
      set({ busy: true });
      try {
        host = await HostSession.create({
          onHello(id, name) {
            const { players, match } = get();
            if (match) return host?.kick(id, 'That match already started.');
            if (players.length >= MAX_PLAYERS) return host?.kick(id, 'That room is full.');
            set({ players: [...players.filter((p) => p.id !== id), me(name, players.length, id)] });
            broadcastLobby();
            broadcastPack(id);
          },
          onAction(id, action) {
            applyAction({ ...action, playerId: id } as MatchAction);
          },
          onLeave(id) {
            set({ players: get().players.filter((p) => p.id !== id) });
            broadcastLobby();
            applyAction({ type: 'leave', playerId: id });
          },
        });
        set({ session: { kind: 'host', code: host.code, myId: HOST_ID }, players: [me(get().name, 0, HOST_ID)] });
      } catch (err) {
        set({ notice: `Could not create a room: ${(err as Error).message}` });
      } finally {
        set({ busy: false });
      }
    },

    async joinRoom(code) {
      set({ busy: true });
      try {
        client = await ClientSession.join(code, get().name || 'Player', onHostMsg, () => {
          if (get().session.kind !== 'client') return;
          get().leaveSession();
          set({ notice: 'Disconnected from the room.' });
        });
        set({ session: { kind: 'client', code: code.toUpperCase(), myId: '' }, screen: 'lobby', match: null });
      } catch (err) {
        set({ notice: `${(err as Error).message} Check the code, or try another network if this keeps happening.` });
      } finally {
        set({ busy: false });
      }
    },

    leaveSession() {
      const c = client;
      const h = host;
      client = null;
      host = null;
      set({ session: soloSession(), players: [], match: null, pack: null, remoteOverrides: {}, remoteGroups: [], screen: 'home' });
      c?.close();
      h?.close();
    },

    startMatch() {
      const { config, pack, session, players } = get();
      if (session.kind === 'client' || startProblem(config, pack, poolGroups(get()))) return;
      const roster = players.length ? players : [me(get().name, 0, HOST_ID)];
      setMatch(createMatch(matchSettings(config, pack), roster, randomSeed(), poolNow()));
      set({ players: roster, screen: 'game' });
    },

    dispatch(partial) {
      const action = { ...partial, playerId: get().session.myId } as MatchAction;
      if (get().session.kind === 'client') client?.send({ t: 'action', action });
      else applyAction(action);
    },

    backToLobby() {
      if (get().session.kind === 'client') return;
      setMatch(null);
      set({ screen: 'lobby' });
    },

    savePack(pack) {
      const stamped = { ...pack, updatedAt: Date.now() };
      const packs = [...get().packs.filter((p) => p.id !== pack.id), stamped];
      set({ packs });
      savePacks(packs).catch(() => set({ notice: 'Could not save. The browser storage may be full.' }));
    },

    deletePack(id) {
      const packs = get().packs.filter((p) => p.id !== id);
      set({ packs });
      savePacks(packs).catch(() => set({ notice: 'Could not save the change.' }));
    },

    setOverride(key, image) {
      const overrides = { ...get().overrides };
      if (image) overrides[key] = image;
      else delete overrides[key];
      set({ overrides });
      saveOverrides(overrides).catch(() => set({ notice: 'Could not save the picture.' }));
      if (host) broadcastPack();
    },

    saveGroup(group) {
      const stamped = { ...group, updatedAt: Date.now() };
      const groups = [...get().groups.filter((g) => g.id !== group.id), stamped];
      set({ groups });
      saveGroups(groups).catch(() => set({ notice: 'Could not save the group.' }));
      if (host) broadcastPack();
    },

    deleteGroup(id) {
      const groups = get().groups.filter((g) => g.id !== id);
      set({ groups });
      saveGroups(groups).catch(() => set({ notice: 'Could not save the change.' }));
    },
  };
});

/** Picture for an entry: my change, then the host's change, then the built-in art. */
export function useEntryImage(entry: Entry | undefined): string | undefined {
  const own = useGame((s) => (entry ? s.overrides[entry.key] : undefined));
  const remote = useGame((s) => (entry ? s.remoteOverrides[entry.key] : undefined));
  return own ?? remote ?? entry?.image;
}
