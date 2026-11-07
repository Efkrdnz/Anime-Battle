import { describe, expect, it } from 'vitest';
import { RANKS, RARITIES } from '../types';
import { ANIME, BUILTIN_ENTRIES } from '.';
import images from './images.json';

describe('built-in anime data', () => {
  it('has unique entry keys', () => {
    const keys = BUILTIN_ENTRIES.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(ANIME.map((a) => [a.name, a] as const))('%s is well formed', (_, anime) => {
    const attrIds = anime.attributes.map((a) => a.id);
    expect(anime.characters.length).toBeGreaterThan(5);
    for (const c of anime.characters) {
      expect(c.variants.length, c.id).toBeGreaterThan(0);
      for (const v of c.variants) {
        expect(RARITIES, `${c.id}/${v.id}`).toContain(v.rarity);
        const ranks = v.stats.trim().split(/\s+/);
        expect(ranks, `${c.id}/${v.id}`).toHaveLength(6);
        ranks.forEach((r) => expect(RANKS, `${c.id}/${v.id}`).toContain(r));
        Object.keys(v.traits).forEach((t) => expect(attrIds, `${c.id}/${v.id} trait ${t}`).toContain(t));
      }
    }
  });

  it('gives every character a gender for the Females/Males groups', () => {
    for (const anime of ANIME) {
      for (const c of anime.characters) expect(['female', 'male', 'other'], `${anime.id}/${c.id}`).toContain(c.gender);
    }
  });

  it('has every rarity tier so rare pulls exist', () => {
    for (const r of RARITIES) expect(BUILTIN_ENTRIES.some((e) => e.rarity === r)).toBe(true);
  });

  it.each(ANIME.filter((a) => a.wiki).map((a) => [a.name, a] as const))('%s resolves most per-form wiki pictures', (_, anime) => {
    const forms = anime.characters.flatMap((c) => c.variants.filter((v) => v.wikiImage).map((v) => `${anime.id}/${c.id}/${v.id}`));
    const resolved = forms.filter((key) => key in (images as Record<string, string>));
    expect(resolved.length / Math.max(1, forms.length)).toBeGreaterThan(0.8);
  });

  it('has a picture for nearly every character', () => {
    const withImage = BUILTIN_ENTRIES.filter((e) => e.image).length;
    expect(withImage / BUILTIN_ENTRIES.length).toBeGreaterThan(0.95);
  });
});
