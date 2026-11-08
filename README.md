# Anime Battles

Roll anime characters, slot them into traits, and build the ultimate fighter. Play solo or online with up to 3 friends. No accounts, nothing to install.

**Play:** https://efkrdnz.github.io/Anime-Battle/

## Modes
- **Character Creation**: a reel spins and lands on a character. Put them into one open trait (Strength, Speed, Devil Fruit, Domain Expansion…), and that slot is locked. Everyone rolls at the same time, and the next round starts once everyone has chosen. At the end, everyone votes for the best build.
  - Pick one anime or mix several. Anime-specific traits can only be filled by characters from that anime.
  - Characters come in different forms (Garp Prime / Old, Luffy Gear 5, Gojo Prime…), each with its own rarity. Rare pulls get special effects.
- **Tier List**: the game picks a random category (Waifu Material, The Kage, Akatsuki, Espada, Kings of the Sea, Zombie Apocalypse… 26 in all) and deals the same characters to everyone. Drag them into S to F tiers (or tap a card and press S A B C D F), lock in, then compare: an agreement score, the most disputed character, the group's favourite and least favourite, everyone's hot takes, character-by-character verdicts and a combined group tier list. The host can also pick a specific category and how many characters to deal. Categories live in `src/data/tierlists.ts`.
- **Custom Games**: make your own categories (e.g. Loyalty, Hair, Eyes, Charm) and add your own characters with uploaded pictures, optionally mixed with the built-in anime. Games are saved in your browser, can be exported and imported as files, and are shared with friends automatically when you host. Results have a Restart button, and a winner vote is optional.
- **Gallery**: browse every character form and change any picture (by link or upload).
- **Card Battle**: coming soon.

## Anime
Naruto, One Piece, Bleach, JoJo, Hunter x Hunter, Dandadan, Jujutsu Kaisen, Chainsaw Man, High School DxD.

## Multiplayer
The host clicks **Create online room** and shares the 5-letter code or the invite link. Friends connect directly to the host's browser through WebRTC (PeerJS). If joining fails on a strict school or work network, try another network.

## Development
```bash
npm install
npm run dev            # local dev server
npm test               # engine + data tests
npm run build          # production build into dist/
npm run fetch-images   # refresh character art from AniList into src/data/images.json
```
To add an anime:
1. Create `src/data/anime/<id>.json`, following an existing file.
2. Add it to the list in `src/data/index.ts`.
3. Run `npm run fetch-images`.

A form's picture can be pinned with an `"image"` field on the variant.

Pushes to `main` deploy to GitHub Pages through `.github/workflows/deploy.yml`.
