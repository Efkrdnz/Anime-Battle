// Tiny IndexedDB key-value store (localStorage is too small for uploaded pictures).
import type { CharacterGroup, CustomPack } from '../types';

const DB_NAME = 'anime-battles';
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function kvSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const loadOverrides = async () => (await kvGet<Record<string, string>>('overrides')) ?? {};
export const saveOverrides = (o: Record<string, string>) => kvSet('overrides', o);
export const loadPacks = async () => (await kvGet<CustomPack[]>('packs')) ?? [];
export const savePacks = (p: CustomPack[]) => kvSet('packs', p);
export const loadGroups = async () => (await kvGet<CharacterGroup[]>('groups')) ?? [];
export const saveGroups = (g: CharacterGroup[]) => kvSet('groups', g);

const MAX_IMAGE_SIDE = 384;

/** Downscales an uploaded picture to a compact data URL so it fits storage and network messages. */
export async function fileToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/webp', 0.85);
}
