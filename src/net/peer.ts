// PeerJS rooms. The host's peer id is derived from the room code, so friends join by code alone.
import Peer, { type DataConnection } from 'peerjs';
import type { MatchAction, MatchState, Player } from '../engine/match';
import type { CustomPack } from '../types';
import type { LobbyConfig } from '../lobby';

export const MAX_PLAYERS = 4;
const PREFIX = 'animebattles-v1-';
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export type HostMsg =
  | { t: 'lobby'; players: Player[]; config: LobbyConfig; you: string }
  | { t: 'pack'; pack: CustomPack | null; overrides: Record<string, string> }
  | { t: 'match'; match: MatchState | null }
  | { t: 'bye'; reason: string };

export type ClientMsg = { t: 'hello'; name: string } | { t: 'action'; action: MatchAction };

function makeCode(): string {
  return Array.from({ length: 5 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
}

function openPeer(id?: string): Promise<Peer> {
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id) : new Peer();
    peer.once('open', () => resolve(peer));
    peer.once('error', (err) => {
      peer.destroy();
      reject(err);
    });
  });
}

export interface HostHandlers {
  onHello(id: string, name: string): void;
  onAction(id: string, action: MatchAction): void;
  onLeave(id: string): void;
}

export class HostSession {
  private conns = new Map<string, DataConnection>();

  private constructor(
    private peer: Peer,
    readonly code: string,
    handlers: HostHandlers,
  ) {
    peer.on('connection', (conn) => {
      conn.on('open', () => this.conns.set(conn.peer, conn));
      conn.on('data', (raw) => {
        const msg = raw as ClientMsg;
        if (msg?.t === 'hello' && typeof msg.name === 'string') handlers.onHello(conn.peer, msg.name.slice(0, 20));
        if (msg?.t === 'action' && msg.action) handlers.onAction(conn.peer, msg.action);
      });
      conn.on('close', () => {
        this.conns.delete(conn.peer);
        handlers.onLeave(conn.peer);
      });
      conn.on('error', () => conn.close());
    });
  }

  static async create(handlers: HostHandlers): Promise<HostSession> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeCode();
      try {
        return new HostSession(await openPeer(PREFIX + code), code, handlers);
      } catch (err) {
        if ((err as { type?: string }).type !== 'unavailable-id') throw err;
      }
    }
    throw new Error('Could not create a room, please try again.');
  }

  send(id: string, msg: HostMsg): void {
    this.conns.get(id)?.send(msg);
  }

  broadcast(msg: HostMsg): void {
    for (const conn of this.conns.values()) conn.send(msg);
  }

  kick(id: string, reason: string): void {
    const conn = this.conns.get(id);
    if (!conn) return;
    conn.send({ t: 'bye', reason } satisfies HostMsg);
    setTimeout(() => conn.close(), 300);
  }

  close(): void {
    this.peer.destroy();
  }
}

export class ClientSession {
  private constructor(
    private peer: Peer,
    private conn: DataConnection,
  ) {}

  static async join(code: string, name: string, onMsg: (msg: HostMsg) => void, onClose: () => void): Promise<ClientSession> {
    const peer = await openPeer();
    const conn = peer.connect(PREFIX + code.trim().toUpperCase(), { reliable: true });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Room not found, or the connection was blocked.')), 10000);
      conn.once('open', () => {
        clearTimeout(timer);
        resolve();
      });
      peer.once('error', (err) => {
        clearTimeout(timer);
        reject(err.type === 'peer-unavailable' ? new Error('No room with that code.') : err);
      });
    }).catch((err) => {
      peer.destroy();
      throw err;
    });
    conn.on('data', (raw) => onMsg(raw as HostMsg));
    conn.on('close', onClose);
    conn.send({ t: 'hello', name } satisfies ClientMsg);
    return new ClientSession(peer, conn);
  }

  send(msg: ClientMsg): void {
    this.conn.send(msg);
  }

  close(): void {
    this.peer.destroy();
  }
}
