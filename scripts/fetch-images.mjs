// Resolves character art into src/data/images.json.
//   1. "anime/char"         base picture: AniList, falling back to the Fandom wiki infobox picture.
//   2. "anime/char/variant" form picture: the variant's wikiImage file title, resolved via the Fandom API.
// Usage: node scripts/fetch-images.mjs [--force]   (already-resolved keys are skipped unless --force)
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ANIME_DIR = join(ROOT, 'src/data/anime');
const OUT = join(ROOT, 'src/data/images.json');
const ANILIST_DELAY_MS = 2200; // AniList allows ~30 requests/min while degraded
const WIKI_DELAY_MS = 500;
const WIKI_BATCH = 50;
const THUMB_WIDTH = 400;
const FORCE = process.argv.includes('--force');

const QUERY = `query ($search: String) {
  Page(perPage: 10) {
    characters(search: $search) {
      id
      name { full }
      image { large }
      media(perPage: 25, sort: POPULARITY_DESC) { nodes { title { romaji english } } }
    }
  }
}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function anilistSearch(term) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { search: term } }),
    });
    if (res.status === 429) {
      const wait = Number(res.headers.get('retry-after') ?? 60) * 1000;
      console.warn(`  rate limited, waiting ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`AniList ${res.status} for "${term}"`);
    const json = await res.json();
    return json.data.Page.characters;
  }
  throw new Error(`AniList kept rate limiting "${term}"`);
}

function pickAnilist(results, animeSearch) {
  return (
    results.find((c) =>
      c.media.nodes.some((m) => [m.title.romaji, m.title.english].some((t) => t?.toLowerCase().includes(animeSearch))),
    ) ?? null
  );
}

/** Calls a Fandom wiki API with up to 50 titles and maps each requested title to its page. */
async function wikiQuery(wiki, titles, params) {
  const url = new URL(`https://${wiki}.fandom.com/api.php`);
  url.search = new URLSearchParams({ action: 'query', format: 'json', redirects: '1', titles: titles.join('|'), ...params });
  const res = await fetch(url, { headers: { 'User-Agent': 'AnimeBattles image fetcher (github.com/Efkrdnz/Anime-Battle)' } });
  if (!res.ok) throw new Error(`${wiki} wiki ${res.status}`);
  const { query = {} } = await res.json();
  const rename = new Map();
  for (const step of [...(query.normalized ?? []), ...(query.redirects ?? [])]) rename.set(step.from, step.to);
  const byTitle = new Map(Object.values(query.pages ?? {}).map((p) => [p.title, p]));
  const result = new Map();
  for (const title of titles) {
    let final = title;
    for (let i = 0; i < 3 && rename.has(final); i++) final = rename.get(final);
    result.set(title, byTitle.get(final));
  }
  return result;
}

function chunks(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function loadAnime() {
  const files = (await readdir(ANIME_DIR)).filter((f) => f.endsWith('.json'));
  const all = [];
  for (const file of files) {
    const anime = JSON.parse(await readFile(join(ANIME_DIR, file), 'utf8'));
    const partsDir = join(ANIME_DIR, anime.id);
    if (existsSync(partsDir)) {
      for (const part of (await readdir(partsDir)).filter((f) => f.endsWith('.json')).sort()) {
        anime.characters.push(...JSON.parse(await readFile(join(partsDir, part), 'utf8')).characters);
      }
    }
    all.push(anime);
  }
  return all;
}

async function resolveBaseImages(anime, images, missing) {
  const needWiki = [];
  for (const c of anime.characters) {
    const key = `${anime.id}/${c.id}`;
    if (images[key] && !FORCE) continue;
    // Every form has its own wiki picture, so no base picture is needed.
    if (anime.wiki && c.variants.every((v) => v.wikiImage)) continue;
    try {
      let hit = pickAnilist(await anilistSearch(c.search ?? c.name), anime.search);
      if (!hit && c.search) hit = pickAnilist(await anilistSearch(c.name), anime.search);
      if (hit?.image?.large && !hit.image.large.includes('default.jpg')) {
        images[key] = hit.image.large;
        console.log(`  ok   ${c.name} -> ${hit.name.full}`);
      } else if (anime.wiki) {
        needWiki.push(c);
      } else {
        missing.push(key);
        console.log(`  MISS ${c.name}`);
      }
    } catch (err) {
      missing.push(key);
      console.log(`  ERR  ${c.name}: ${err.message}`);
    }
    await sleep(ANILIST_DELAY_MS);
  }
  for (const batch of chunks(needWiki, WIKI_BATCH)) {
    const pages = await wikiQuery(anime.wiki, batch.map((c) => c.wikiPage ?? c.name), {
      prop: 'pageimages',
      pithumbsize: String(THUMB_WIDTH),
    });
    for (const c of batch) {
      const src = pages.get(c.wikiPage ?? c.name)?.thumbnail?.source;
      if (src) {
        images[`${anime.id}/${c.id}`] = src;
        console.log(`  wiki ${c.name}`);
      } else {
        missing.push(`${anime.id}/${c.id}`);
        console.log(`  MISS ${c.name}`);
      }
    }
    await sleep(WIKI_DELAY_MS);
  }
}

async function resolveFormImages(anime, images, missing) {
  if (!anime.wiki) return 0;
  const wanted = anime.characters.flatMap((c) =>
    c.variants
      .filter((v) => v.wikiImage && (FORCE || !images[`${anime.id}/${c.id}/${v.id}`]))
      .map((v) => ({ key: `${anime.id}/${c.id}/${v.id}`, title: v.wikiImage.startsWith('File:') ? v.wikiImage : `File:${v.wikiImage}` })),
  );
  let resolved = 0;
  for (const batch of chunks(wanted, WIKI_BATCH)) {
    const titles = [...new Set(batch.map((w) => w.title))];
    const pages = await wikiQuery(anime.wiki, titles, { prop: 'imageinfo', iiprop: 'url', iiurlwidth: String(THUMB_WIDTH) });
    for (const w of batch) {
      const url = pages.get(w.title)?.imageinfo?.[0]?.thumburl;
      if (url) {
        images[w.key] = url;
        resolved++;
      } else {
        missing.push(`${w.key} (${w.title})`);
      }
    }
    await sleep(WIKI_DELAY_MS);
  }
  return resolved;
}

async function main() {
  let images = {};
  try {
    images = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    images = {};
  }
  const missing = [];
  for (const anime of await loadAnime()) {
    console.log(`== ${anime.name} (${anime.characters.length} characters)`);
    await resolveBaseImages(anime, images, missing);
    const forms = await resolveFormImages(anime, images, missing);
    if (anime.wiki) console.log(`  ${forms} form pictures resolved from the ${anime.wiki} wiki`);
    await writeFile(OUT, JSON.stringify(images, null, 2) + '\n');
  }
  console.log(`\nDone. ${Object.keys(images).length} images, ${missing.length} missing:`);
  for (const m of missing) console.log(`  ${m}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
