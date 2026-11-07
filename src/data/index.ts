// Built-in anime catalogue. Add a new anime by dropping a JSON file in ./anime and listing it here.
import type { Entry, RawAnime } from '../types';
import { entriesFromAnime } from '../engine/pool';
import images from './images.json';
import onepiece from './anime/onepiece.json';
import naruto from './anime/naruto.json';
import bleach from './anime/bleach.json';
import jojo from './anime/jojo.json';
import hxh from './anime/hxh.json';
import dandadan from './anime/dandadan.json';
import jjk from './anime/jjk.json';
import csm from './anime/csm.json';
import dxd from './anime/dxd.json';

export const ANIME: RawAnime[] = [onepiece, naruto, bleach, jojo, hxh, dandadan, jjk, csm, dxd] as RawAnime[];

export const ANIME_BY_ID: Record<string, RawAnime> = Object.fromEntries(ANIME.map((a) => [a.id, a]));

const IMAGES = images as Record<string, string>;

export const BUILTIN_ENTRIES: Entry[] = ANIME.flatMap((a) => entriesFromAnime(a, IMAGES));
