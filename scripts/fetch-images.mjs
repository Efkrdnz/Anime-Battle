// Fetches character art URLs from the AniList GraphQL API into src/data/images.json.
// Usage: node scripts/fetch-images.mjs [--force]   (already-resolved characters are skipped unless --force)
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ANIME_DIR = join(ROOT, 'src/data/anime');
const OUT = join(ROOT, 'src/data/images.json');
const DELAY_MS = 2200; // AniList allows ~30 requests/min while degraded
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

async function search(term) {
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

function pick(results, animeSearch) {
  const fromAnime = results.find((c) =>
    c.media.nodes.some((m) => [m.title.romaji, m.title.english].some((t) => t?.toLowerCase().includes(animeSearch))),
  );
  return fromAnime ?? null;
}

async function main() {
  let images = {};
  try {
    images = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    images = {};
  }
  const files = (await readdir(ANIME_DIR)).filter((f) => f.endsWith('.json'));
  const missing = [];
  for (const file of files) {
    const anime = JSON.parse(await readFile(join(ANIME_DIR, file), 'utf8'));
    console.log(`== ${anime.name}`);
    for (const c of anime.characters) {
      const key = `${anime.id}/${c.id}`;
      if (images[key] && !FORCE) continue;
      try {
        let hit = pick(await search(c.search ?? c.name), anime.search);
        if (!hit && c.search) hit = pick(await search(c.name), anime.search);
        if (hit?.image?.large && !hit.image.large.includes('default.jpg')) {
          images[key] = hit.image.large;
          console.log(`  ok   ${c.name} -> ${hit.name.full}`);
        } else {
          missing.push(key);
          console.log(`  MISS ${c.name}`);
        }
      } catch (err) {
        missing.push(key);
        console.log(`  ERR  ${c.name}: ${err.message}`);
      }
      await sleep(DELAY_MS);
    }
    await writeFile(OUT, JSON.stringify(images, null, 2) + '\n');
  }
  console.log(`\nDone. ${Object.keys(images).length} images, ${missing.length} missing:`);
  for (const m of missing) console.log(`  ${m}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
