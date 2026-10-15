# ECLIPSE — NPC, Monster & Boss Sprite Design Brief (for ChatGPT)

> Attach `chars.png` (the 20 approved player characters) to the conversation before sending this prompt.
> Recommended: run it in separate turns — **Part A (NPCs)**, then **Part B (monsters, one chapter at a time)**, then **Part C (bosses)**. Quality drops when too many sprites are drawn in one image.

---

You are the lead pixel artist for **ECLIPSE — The Forgotten Rift**, a 2D top-down browser action RPG (Phaser 3). The player characters are already finished and attached as `chars.png`. Your job is to design and produce **NPC, monster and boss sprites** that live in the same world, follow exact technical specs, and can be dropped straight into the game engine.

Work in two phases for every part:
1. **Concept phase** — show me a lineup of your designs. Wait for my approval or revisions before continuing.
2. **Production phase** — produce the final sprite sheet PNG with Python (PIL) to the exact pixel spec below, run the validation script, and give me the raw file as a download.

## 1. Art direction

### The feel
Think **MapleStory-era cute 2D MMORPG charm**: chibi proportions, big readable heads, round friendly shapes, saturated colors, crisp dark outlines, soft cel shading with 2–3 tone steps, expressive faces, and monsters that are more *lovable-menacing* than scary.

### But make it ours — originality rules (very important)
- **Do not copy or closely imitate any existing game's characters or monsters** (no MapleStory Orange Mushroom, Slime, Pig, Stump, Balrog, Pink Bean, Pepe, etc.; nothing from Pokémon, Ragnarok, Dragon Quest, Zelda, etc.). Use the *mood* only, never specific designs, logos, outfits or color schemes that identify another IP.
- **World motif:** this world is inhabited by **personified produce, plants and storybook creatures** (see the player sheet: apple, tomato, pumpkin, lemon, carrot, grape, mushroom, red hood, white cat, goldfish…). NPCs belong to that same "produce-folk & fairy-tale" society.
- **Enemy motif:** monsters are **produce, plants, animals and objects of this world that were corrupted by the Eclipse rift**. Every enemy carries the same signature: a small **black-sun sigil or glowing violet crack** somewhere on its body (eye, chest, forehead, shield). This ties all 40 enemies together and makes them unmistakably ECLIPSE.
- **Silhouette first:** every sprite must be identifiable by silhouette alone, in black. No two sprites in the same chapter may share a silhouette.
- **One hook per design:** each design needs one memorable idea (a pun, a twist, a prop, a quirk) that you state in one line in the concept phase.

### Chapter palettes (enemies follow their chapter; NPCs may mix)
| Ch | Region | Mood | Key colors |
|---|---|---|---|
| I | Haunted Forest | mossy, damp, spooky-cute | moss green, bark brown, toxic purple accents |
| II | Fallen Royal Castle | rusted chivalry, ash | rusted iron, faded royal blue, tarnished gold |
| III | Frozen Abyss | crystalline, quiet | ice cyan, snow white, deep navy |
| IV | Burning Wasteland | embers, brass, heat | ember orange, magma red, ash grey, brass |
| V | Heart of the Rift | cosmic, glitchy | void violet, magenta, black with star specks |

### Rendering rules (all sprites)
- True pixel art on an exact pixel grid. **No anti-aliasing, no blur, no gradients, no semi-transparent pixels, no glow halos.**
- **1px dark outline** around the whole silhouette (preferred `#3f2631`; a darker shade of the local color is OK for interior lines).
- Light comes from the **top-left**.
- **Front view, slightly turned to the right (3/4).** The engine mirrors sprites to face left, so always draw facing right. Keep important asymmetric details readable when mirrored.
- **One idle pose per sprite.** No animation frames — the engine animates by squashing, tilting and bobbing a single image.
- **Do not draw:** ground shadows (the engine adds one), backgrounds, floor tiles, text, frames, VFX particles, or speech bubbles.
- Colors are final as drawn — the engine does **not** recolor these sprites.

## 2. Technical spec

All sheets: **PNG, RGBA, fully transparent background, alpha values only 0 or 255.** Cells are filled left-to-right, top-to-bottom, starting at index 0. Unused cells stay fully transparent. Nothing may cross into a neighboring cell.

| Sheet | File | Cell size | Grid | Sheet size | Shown in game at | Max colors / cell |
|---|---|---|---|---|---|---|
| NPCs | `npcs.png` | 32×48 | 10 × 2 | **320×96** | 1.5× (48×72) | 24 |
| Monsters | `monsters.png` | 64×64 | 10 × 3 | **640×192** | 1.5× (96×96) | 32 |
| Bosses | `bosses.png` | 96×96 | 5 × 2 | **480×192** | 1.5× (144×144) | 40 |

### Placement inside a cell (rows/columns counted from 0)
- **Grounded sprites:** the lowest opaque row is **the second-to-last row** (NPC row 46, monster row 62, boss row 94). The last row stays empty. The engine uses that edge as the feet anchor, so anything higher will look like it is floating.
- **Hovering sprites** (ghosts, spirits, flying insects, floating orbs): leave a gap — the lowest opaque row must be **6–10 px above** the grounded line (monster rows 52–56). The engine draws the ground shadow at the anchor, which sells the hover.
- **Horizontal center:** the body's center of mass sits on the cell's center column (±2 px).
- **Top margin:** at least 1 empty row at the top. Horns, hats, leaves and crowns must fit.

### Scale reference (keep relative sizes consistent)
- Player and NPC: 32×48 cell, body about 28–30 px wide and 44–46 px tall.
- Monster size classes inside the 64×64 cell:
  - **S (small):** 18–28 px tall
  - **M (medium):** 30–44 px tall
  - **L (large):** 50–62 px tall (should feel bigger than the player)
- Bosses: fill the 96×96 cell. Body 80–94 px tall, clearly 2× the player's presence.

## 3. Part A — NPCs (`npcs.png`, 32×48, 15 sprites)

NPCs must match the attached player sprites exactly in proportions, outline weight, shading style and pixel density. They should look friendly and approachable, and each one's job should be readable at a glance.

| Cell | id | Name / role | Chapter | Design notes |
|---|---|---|---|---|
| 0 | arin | Arin, the Tracker (main quest giver) | I | forest scout, hooded cloak, keen eyes |
| 1 | ria | Ria, the Herbalist (shop) | I | herb satchel, flower or leaf motif |
| 2 | leon | Leon, the Exiled Knight (main quest) | II | dented armor, torn royal tabard, loyal |
| 3 | isa | Isa, the Archivist (shop) | II | scrolls, spectacles, ink-stained |
| 4 | sera | Sera, the Glacier Scholar (main quest) | III | warm parka, notebook, frosty breath |
| 5 | kahn | Kahn, the Miner (shop) | III | helmet lamp, pickaxe on back, sturdy |
| 6 | luke | Luke, the Volcano Artisan (main quest) | IV | brass goggles, heat-proof apron |
| 7 | maya | Maya, the Sealer (shop) | IV | talismans, seal glyphs, serene |
| 8 | orr | Orr, the Chronicler (main quest) | V | star-map robe, floating quill feel |
| 9 | ether | Ether, the Traitor (shop) | V | sly, half-mask, rift-violet accents — trustworthy-looking at first glance |
| 10 | smith | Blacksmith (upgrade/craft) | all | big arms, hammer, leather apron |
| 11 | arena | Arena Keeper (PvP) | all | referee or announcer vibe, banner or whistle |
| 12 | villager_a | Villager A | all | simple, cheerful townsfolk |
| 13 | villager_b | Villager B | all | different silhouette from A |
| 14 | elder | Village Elder | all | cane, wise, old |

Cells 15–19 stay empty (reserved). Main-quest NPCs (0, 2, 4, 6, 8) should be slightly more distinctive than shop NPCs.

## 4. Part B — Monsters (`monsters.png`, 64×64, 30 sprites)

The engine identifies each monster by cell index — **keep this exact order.** "Behavior" is how it fights. The design must **telegraph that behavior visually** (shield monsters show a big shield on their front, ranged monsters hold a ranged weapon, and so on).

Visual cues by behavior:
- **hopper:** springy, bouncy body
- **charger:** low, forward-leaning, usually four-legged
- **ranged:** visible bow, sling or launcher
- **turret:** rooted to the ground, no legs
- **blinker:** wispy or cloaked, partly translucent-looking (use solid pixels, not alpha)
- **brute:** huge, heavy fists or club
- **shield:** large shield facing right
- **caster:** staff or orb, robe
- **duelist:** sword, poised stance
- **swarm:** tiny, one of many
- **exploder:** bloated, glowing belly
- **lobber:** carries flasks or bombs
- **healer:** halo, censer or holy light motif
- **lancer:** very long spear
- **barrage:** several floating orbs around it

| Cell | id | Name | Ch | Behavior | Size | Concept hook (suggestion — improve it) |
|---|---|---|---|---|---|---|
| 0 | shroom | Blighted Shroom | I | hopper | S | corrupted mushroom-folk, purple spots, bouncy stem |
| 1 | wolf | Venomfang Wolf | I | charger | M | wolf woven from thorny brambles, poison drip |
| 2 | ghost_archer | Wraith Archer | I | ranged · hover | M | little ghost holding a twig bow |
| 3 | root | Root Tendril | I | turret | M | snarling root knot bursting from soil |
| 4 | ghost_thief | Phantom Thief | I | blinker · hover | M | masked wisp with a loot sack |
| 5 | giant | Forest Giant | I | brute | L | mossy stump-golem with mushroom shoulders |
| 6 | rusty | Rusted Soldier | II | shield | M | creaky tin soldier, big rusty shield |
| 7 | wall_archer | Rampart Archer | II | ranged | M | crossbowman peeking over a battlement plate |
| 8 | hound | Black Hound | II | charger | M | soot-black castle hound with an iron collar |
| 9 | curse_mage | Hex Mage | II | caster | M | hooded mage with a cursed candle staff |
| 10 | phantom | Armored Phantom | II | duelist | M | empty suit of armor, ghost flame in the visor |
| 11 | guard | Citadel Warden | II | brute | L | walking gatehouse or tower-shield giant |
| 12 | frostbug | Frost Bug | III | swarm | S | ice-crystal beetle, tiny and sparkly |
| 13 | snow_spirit | Snowflake Spirit | III | ranged · hover | S | snowflake-shaped sprite with a frosty face |
| 14 | ice_knight | Icewall Knight | III | shield | M | knight with a glacier-slab shield |
| 15 | panther | Glacier Panther | III | charger | M | sleek white panther with icicle spine |
| 16 | frost_mage | Frost Weaver | III | caster | M | knits ice with crystal needles |
| 17 | ice_golem | Ice Golem | III | brute | L | stacked ice blocks, cracked core glowing |
| 18 | ash_dead | Ashen Dead | IV | melee | M | crumbling ash figure with ember eyes |
| 19 | locust | Flame Locust | IV | exploder · hover | S | chubby fire bug with a glowing belly |
| 20 | lava_hound | Lava Hound | IV | charger | M | magma-cracked hound, smoking paws |
| 21 | thrower | Scorch Thrower | IV | lobber | M | goblin-ish bomber with lava bottles |
| 22 | beetle | Volcanic Beetle | IV | shield | M | armored beetle, obsidian shell as shield |
| 23 | colossus | Fire Colossus | IV | brute | L | brass-and-magma giant, furnace chest |
| 24 | shard | Rift Shardling | V | blinker · hover | S | floating crystal shard with one eye |
| 25 | stalker | Void Stalker | V | blinker | M | shadow cat or assassin with star-speckled body |
| 26 | priest | Abyss Priest | V | healer | M | robed priest with a black-sun halo |
| 27 | lancer | Dimension Lancer | V | lancer | M | knight with a spear longer than its body |
| 28 | void_mage | Void Mage | V | barrage · hover | M | mage orbited by three void orbs |
| 29 | rift_giant | Rift Behemoth | V | brute | L | giant with a rift tear in its chest — the biggest regular enemy |

## 5. Part C — Bosses (`bosses.png`, 96×96, 10 sprites)

Bosses are the showpieces. Each needs a strong silhouette, a clear weak-point or focal detail, and the Eclipse sigil prominently placed. Keep them cute-styled but clearly dangerous.

| Cell | id | Name | Ch | Role | Fighting style (show it in the design) |
|---|---|---|---|---|---|
| 0 | forest_predator | Forest Predator | I | mid-boss | huge beast; claw combos, leaping pounce, poison cloud |
| 1 | root_guardian | Root Guardian | I | final | ancient tree guardian; root spears, thorn rings, spore summons |
| 2 | black_captain | Black Captain | II | mid-boss | captain of the guard; tower shield rush and shield bash |
| 3 | fallen_king | Fallen Knight-King | II | final | corrupted king who sealed himself away; greatsword, crown, dark cavalry |
| 4 | frost_hunter | Frost Hunter | III | mid-boss | hunter; ice spears, leaping dash, ice traps |
| 5 | frost_queen | Frost Queen | III | final | queen slowing time to stop the rift; blizzards, crystals, falling glaciers |
| 6 | lava_predator | Lava Predator | IV | mid-boss | magma crustacean or salamander; lava spit, tail swipe, quake |
| 7 | immortal_avatar | Immortal Avatar | IV | final | artificial fire guardian built by the king; flame sword, rekindles itself |
| 8 | void_executor | Void Executor | V | mid-boss | hooded executioner; dimension stab, hologram clones, void snare |
| 9 | rift_lord | Rift Lord | V | final | the first researcher who opened the rift; time-cutting, cosmic, tragic |

Bosses are grounded: lowest opaque row 94, row 95 empty. The Rift Lord may hover (rows 84–88) if that suits the design.

## 6. Concept phase deliverable (each part)

- One lineup image on a neutral mid-grey background, with every design shown at **6× nearest-neighbor scale**, labeled with cell number and name.
- Under the image, a table with one line per sprite: cell, name, **hook**, main colors.
- **Silhouette check:** the same lineup filled solid black, to prove each one is distinct.
- Then **stop and wait for my approval.**

## 7. Production phase (each part, after approval)

1. Build the final sheet in Python (PIL) on an exact pixel grid. If you start from a generated image, downscale with nearest-neighbor, quantize the palette, binarize the alpha, and **hand-clean** each cell: re-draw the outline, fix the eyes, and remove stray or noisy pixels. Large flat areas should use 2–3 clean tone steps, never speckled dithering noise.
2. Run the validation script below and print its full output.
3. Deliver:
   - the **raw sheet PNG at exact size** as a download (e.g. `monsters.png`, 640×192) — **not a preview or screenshot**
   - `preview.png`: 6× nearest-neighbor, with cell grid lines and indices, on a dark background
   - `manifest.json`: `{ "<id>": { "cell": n, "name": "...", "hover": true|false, "bbox": [x0, y0, x1, y1], "colors": n } }`

## 8. Validation script requirements (must all pass; fix and re-run if not)

For the sheet:
- [ ] exact sheet size (`npcs` 320×96, `monsters` 640×192, `bosses` 480×192), mode RGBA
- [ ] alpha values ⊆ {0, 255}
- [ ] every listed cell has opaque pixels; every unlisted cell is fully transparent

For each listed cell:
- [ ] no opaque pixel touches the cell's left, right or top edge
- [ ] grounded: lowest opaque row = cell height − 2, and the last row is fully transparent
- [ ] hovering: lowest opaque row is between cell height − 12 and cell height − 8
- [ ] horizontal center of opaque pixels within ±2 px of the cell center
- [ ] unique color count ≤ the sheet's limit
- [ ] monster height matches its size class (S 18–28, M 30–44, L 50–62)
- [ ] at least one outline-dark pixel (luminance < 60) on the silhouette border
- [ ] no "noise": isolated-pixel ratio ≤ 12% (an opaque pixel whose 4 neighbors all differ from it by RGB distance > 30); print it per cell
