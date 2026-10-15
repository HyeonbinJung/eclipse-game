# ECLIPSE — Sprite Production Brief: Player Revision + NPCs + Monsters + Bosses (for ChatGPT)

> **Attach before sending:** (1) the original 20-character design lineup, and (2) the current `chars.png` (320×96).
> **Run in separate turns, in this order:** Part 0 (player revision) → Part A (NPCs) → Part B (monsters, one chapter at a time) → Part C (bosses). Start each turn with "Do Part X of the brief." Quality drops when too many sprites are drawn in one image.

---

You are the lead pixel artist for **ECLIPSE — The Forgotten Rift**, a 2D top-down browser action RPG (Phaser 3). You already produced `chars.png` (20 player characters). It works in the engine, but it needs a quality pass. After that, you will design and produce **NPC, monster and boss sprites** for the same world. Every sheet must follow exact technical specs so it can be dropped straight into the engine.

Work in two phases for every part:
1. **Concept phase:** show me the designs as a lineup, then **stop and wait** for my approval or revisions.
2. **Production phase:** build the final sheet PNG with Python (PIL) to the exact pixel spec, run the validation script, and give me the **raw file** as a download.

## 1. Art direction (all parts)

### The feel
Think **MapleStory-era cute 2D MMORPG charm**:
- chibi proportions with big, readable heads
- round, friendly shapes and saturated colors
- crisp dark outlines and soft cel shading with 2–3 tone steps
- expressive faces
- monsters that are more *lovable-menacing* than scary

### But make it ours (originality rules, very important)
- **Do not copy or closely imitate any existing game's characters or monsters.** That means no MapleStory Orange Mushroom, Slime, Pig, Stump, Balrog, Pink Bean or Pepe, and nothing from Pokémon, Ragnarok, Dragon Quest, Zelda and so on. Borrow the *mood* only — never specific designs, logos, outfits or color schemes that identify another IP.
- **World motif:** the world is inhabited by **personified produce, plants and storybook creatures**, as in the player sheet (apple, tomato, pumpkin, lemon, carrot, grape, mushroom, red hood, white cat, goldfish…). NPCs belong to that same "produce-folk and fairy-tale" society.
- **Enemy motif:** monsters are **produce, plants, animals and objects of this world, corrupted by the Eclipse rift.** Every enemy carries the same signature: a small **black-sun sigil or glowing violet crack** somewhere on its body (eye, chest, forehead or shield). This ties all 40 enemies together.
- **Silhouette first:** every sprite must be identifiable by its solid-black silhouette alone. No two sprites in the same sheet or chapter may share a silhouette.
- **One hook per design:** each design needs one memorable idea (a pun, a twist, a prop or a quirk), stated in one line during the concept phase.

### Chapter palettes (enemies follow their chapter; NPCs may mix)
| Ch | Region | Mood | Key colors |
|---|---|---|---|
| I | Haunted Forest | mossy, damp, spooky-cute | moss green, bark brown, toxic purple accents |
| II | Fallen Royal Castle | rusted chivalry, ash | rusted iron, faded royal blue, tarnished gold |
| III | Frozen Abyss | crystalline, quiet | ice cyan, snow white, deep navy |
| IV | Burning Wasteland | embers, brass, heat | ember orange, magma red, ash grey, brass |
| V | Heart of the Rift | cosmic, glitchy | void violet, magenta, black with star specks |

## 2. Pixel quality rules (all parts)

These rules exist because the first `chars.png` failed them. Every cell in every sheet must meet them.

- **Draw true pixel art by hand on an exact pixel grid.** Do not just downscale and quantize a generated image. If you start from one, treat it as a sketch and redraw each cell.
- **No anti-aliasing, blur, gradients, semi-transparent pixels, glow halos, dithering or texture noise.** No random dark pixels inside clothing.
- Paint large areas (cloaks, dresses, robes, hair, skin, fruit bodies, fur) as **flat color regions with 2–3 tone steps**: a base, a shadow, and an optional highlight. Light comes from the **top-left**.
- Patterns (embroidery, polka dots, plaid, armor plates, scales, spikes) must be **deliberate and regular**, never blotches.
- Keep a **continuous 1px dark outline** around the silhouette (preferred `#3f2631`). Use darker shades of the local color for interior lines.
- **Faces must read at 1×:**
  - two clear eyes, usually 1×2 or 2×2 dark pixels with a 1px highlight
  - an optional 1px mouth
  - clean skin or fruit color around them, with no smudges across the face
- **Pose and view:** front view, turned slightly to the right (3/4). The engine mirrors sprites to face left, so always draw facing right. **One idle pose per sprite** — the engine animates by squashing, tilting and bobbing a single image.
- **Do not draw** ground shadows (the engine adds one), backgrounds, floor tiles, text, frames, VFX particles or speech bubbles.
- Colors are final as drawn; the engine does **not** recolor these sprites.

## 3. Technical spec (all sheets)

All sheets are **PNG, RGBA, with a fully transparent background and alpha values of only 0 or 255.**
- Cells are filled left-to-right, top-to-bottom, starting at index 0.
- Unused cells stay fully transparent.
- Nothing may cross into a neighboring cell.

| Sheet | File | Cell size | Grid | Sheet size | Shown in game at | Max colors / cell |
|---|---|---|---|---|---|---|
| Players | `chars.png` | 32×48 | 10 × 2 | **320×96** | 1.5× (48×72) | 24 |
| NPCs | `npcs.png` | 32×48 | 10 × 2 | **320×96** | 1.5× (48×72) | 24 |
| Monsters | `monsters.png` | 64×64 | 10 × 3 | **640×192** | 1.5× (96×96) | 32 |
| Bosses | `bosses.png` | 96×96 | 5 × 2 | **480×192** | 1.5× (144×144) | 40 |

### Placement inside a cell (rows and columns counted from 0)
- **Grounded sprites:** the lowest opaque row is **the second-to-last row** (players and NPCs: row 46; monsters: row 62; bosses: row 94). The last row stays empty. The engine uses that edge as the feet anchor, so anything higher looks like it is floating.
- **Hovering sprites** (ghosts, spirits, flying insects, floating orbs): the lowest opaque row must sit **6–10 px above** the grounded line (monsters: rows 52–56). The engine draws the ground shadow at the anchor, which sells the hover.
- **Horizontal center:** the body's center of mass sits on the cell's center column, within ±2 px.
- **Top margin:** at least 1 empty row at the top. Horns, hats, leaves and crowns must fit inside the cell.
- **Held weapons (players and NPCs):** the engine draws the class weapon at the right hand, around cell pixel **(23, 30)**. Characters without a drawn weapon must leave that hand free.

### Scale reference (keep relative sizes consistent)
- Players and NPCs: body about 28–30 px wide and 44–46 px tall.
- Monster size classes inside the 64×64 cell:
  - **S (small):** 18–28 px tall
  - **M (medium):** 30–44 px tall
  - **L (large):** 50–62 px tall, so they feel bigger than the player
- Bosses fill the 96×96 cell, with a body 80–94 px tall — clearly twice the player's presence.

---

## Part 0 — Player character revision (`chars.png`)

**Keep unchanged:** sheet size, cell size, cell order, each character's identity, feet on row 46, empty row 47, centering and transparency. The engine depends on all of these.

### 0.1 Global problem: speckle noise
I measured the share of "isolated" pixels: opaque pixels whose four neighbors all differ from them by an RGB distance greater than 30. Clean hand-made pixel art at this size sits around 5–12%. The current sheet is at **25–45% in 17 of 20 cells**, so it looks grainy and dirty in-game. Redraw every cell following section 2.

| Cell | Character | Isolated | What to fix |
|---|---|---|---|
| 0 | Red Hood | 42.9% | Face is muddy inside the hood. Give her a clean face, a solid red hood with one shadow tone, and a clear basket or cape edge. |
| 1 | Apple | 39.5% | Body is muddy. Make a glossy apple head with one clean highlight, a simple outfit, and a clear leaf and stem. |
| 2 | Strawberry Bride | 34.2% | Dress is speckled. Make a clean white dress with 2 grey-lavender shadow tones, a readable bouquet, and strawberry seeds as regular dots. |
| 3 | Pumpkin King | 38.8% | Good silhouette. Clean the robe; draw the pumpkin ribs as 2–3 clear vertical lines and make the crown crisp. |
| 4 | Tomato | 34.7% | Red splotches on the white robe look like blood. Turn them into a deliberate pattern (polka dots or embroidered trim), or remove them. |
| 5 | Broccoli | 36.7% | Good. Clean the body; draw the florets as 3–4 rounded clusters with one highlight each. |
| 6 | Durian | 35.1% | Face gets lost in the spikes. Make the spikes a regular pattern, keep a clean face area with clear eyes, and draw the armor as flat plates. |
| 7 | Goldfish | 29.1% | Best of the set. Clean the fins, and draw the scales as a regular pattern. |
| 8 | Frost Princess | 37.8% | Too low-contrast; the face almost disappears. Strengthen the outline, darken the lavender shadows, and make the eyes and crown clearer. |
| 9 | Red-haired Swordswoman | 41.7% | Hair is noise. Draw it as 3–4 large locks with one highlight each. The sword must be crisp and clearly held. |
| 10 | Pink Hair | 44.5% | The noisiest cell. Give her the same hair treatment as cell 9 and a clean dress. |
| 11 | White Cat | 32.7% | Brown blotches on the dress look dirty. Use clean white fur with soft grey shadows, and clear ears, eyes and crown. |
| 12 | Lemon Knight | 33.7% | Clean the armor. The greatsword must be crisp and held in the hand. |
| 13 | Strawberry Mage | 34.6% | Good. Clean the robe, and keep the blue orb bright and round. |
| 14 | Purple Witch | 30.2% | Face is too dark and low-contrast. Lighten the skin, separate the hat brim from the hair, and clean up the purple tones. |
| 15 | Tangerine Warrior | 25.2% | Good. Light cleanup only. |
| 16 | Pepper Knight | 16.1% | Good. Light cleanup only. **Use it as the quality reference for the others.** |
| 17 | **Grape — wrong character** | 25.3% | In the design lineup, the 18th character (cell 17) is a **green grape-bunch-headed girl**, but the current cell shows a purple-hooded girl. Redraw it from the design: a rounded green grape cluster as hair and head, a leaf, and a light green dress. |
| 18 | Mushroom | 38.2% | Clean the red cap with regular white spots, and clean the dress. |
| 19 | **Carrot Archer** | 9.5% | **Full rework — see 0.2.** |

### 0.2 Full rework: Carrot Archer (cell 19)

**What's wrong now:**
- The head is a round orange ball, not a carrot, and the green top reads as broccoli or hair.
- The face is a dark smudge, and one eye is missing.
- The body, arms and legs are flat rectangles with no shading or inner lines, so it looks like a placeholder next to the other 19.
- The bow floats beside the body instead of being held, and its line is too thin to read.

**Rework brief:**
- **Concept:** a nimble forest-ranger carrot, the archer of the carrot-folk — confident and a little mischievous.
- **Head and body:** a recognizable carrot, with a tapered orange root shape, 2–3 horizontal ridge lines, and a lush **leafy green top** (3–5 distinct leaf blades fanning upward, in two greens plus a highlight). The face sits on the upper, wider part.
- **Face:** two clear eyes and a small confident smile or smirk.
- **Outfit:** a short green ranger hood or capelet, a leather strap across the chest, a quiver over the back shoulder showing 2–3 arrow fletchings, and brown boots.
- **Bow:** a wooden recurve bow **held in the right hand** (around cell pixel x 22–27, y 22–42), lowered at the side in an idle pose. Draw it with a 2px-thick limb and a 1px string, kept inside the cell.
- **Pose:** standing idle, 3/4 facing right, feet on row 46.
- **Style:** match the proportions, outline weight, 2–3 tone shading and color richness of the Pepper Knight (cell 16) and the Goldfish (cell 7).
- **Concept phase:** show **3 variations** of the Carrot Archer at 8× so I can pick one before you finalize.

### 0.3 Part 0 concept deliverable
Show the revised sheet at 6× on a dark background, with a **before/after** row pair for every cell, plus the 3 Carrot Archer variations. Then stop and wait.

---

## Part A — NPCs (`npcs.png`, 32×48, 15 sprites)

NPCs must match the revised player sprites exactly: same proportions, outline weight, shading style and pixel density. They should look friendly and approachable, and each one's job should be readable at a glance.

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
| 8 | orr | Orr, the Chronicler (main quest) | V | star-map robe, floating-quill feel |
| 9 | ether | Ether, the Traitor (shop) | V | sly, half-mask, rift-violet accents; looks trustworthy at first glance |
| 10 | smith | Blacksmith (upgrade and crafting) | all | big arms, hammer, leather apron |
| 11 | arena | Arena Keeper (PvP) | all | referee or announcer vibe, banner or whistle |
| 12 | villager_a | Villager A | all | simple, cheerful townsfolk |
| 13 | villager_b | Villager B | all | a different silhouette from A |
| 14 | elder | Village Elder | all | cane, wise, old |

Cells 15–19 stay empty (reserved). Main-quest NPCs (cells 0, 2, 4, 6 and 8) should be slightly more distinctive than the shop NPCs.

---

## Part B — Monsters (`monsters.png`, 64×64, 30 sprites)

The engine identifies each monster by its cell index, so **keep this exact order.** "Behavior" is how the monster fights, and the design must **telegraph it visually**.

| Behavior | Visual cue |
|---|---|
| hopper | springy, bouncy body |
| charger | low, forward-leaning, usually four-legged |
| ranged | visible bow, sling or launcher |
| turret | rooted to the ground, no legs |
| blinker | wispy or cloaked, translucent-looking (use solid pixels, not alpha) |
| brute | huge, with heavy fists or a club |
| shield | large shield facing right |
| caster | staff or orb, robe |
| duelist | sword, poised stance |
| swarm | tiny, one of many |
| exploder | bloated, glowing belly |
| lobber | carries flasks or bombs |
| healer | halo, censer or holy-light motif |
| lancer | very long spear |
| barrage | several floating orbs around it |

The concept hooks below are suggestions; improve on them.

| Cell | id | Name | Ch | Behavior | Size | Concept hook |
|---|---|---|---|---|---|---|
| 0 | shroom | Blighted Shroom | I | hopper | S | corrupted mushroom-folk, purple spots, bouncy stem |
| 1 | wolf | Venomfang Wolf | I | charger | M | wolf woven from thorny brambles, poison drip |
| 2 | ghost_archer | Wraith Archer | I | ranged · hover | M | little ghost holding a twig bow |
| 3 | root | Root Tendril | I | turret | M | snarling root knot bursting from the soil |
| 4 | ghost_thief | Phantom Thief | I | blinker · hover | M | masked wisp with a loot sack |
| 5 | giant | Forest Giant | I | brute | L | mossy stump-golem with mushroom shoulders |
| 6 | rusty | Rusted Soldier | II | shield | M | creaky tin soldier with a big rusty shield |
| 7 | wall_archer | Rampart Archer | II | ranged | M | crossbowman peeking over a battlement plate |
| 8 | hound | Black Hound | II | charger | M | soot-black castle hound with an iron collar |
| 9 | curse_mage | Hex Mage | II | caster | M | hooded mage with a cursed candle staff |
| 10 | phantom | Armored Phantom | II | duelist | M | empty suit of armor, ghost flame in the visor |
| 11 | guard | Citadel Warden | II | brute | L | walking gatehouse or tower-shield giant |
| 12 | frostbug | Frost Bug | III | swarm | S | tiny, sparkly ice-crystal beetle |
| 13 | snow_spirit | Snowflake Spirit | III | ranged · hover | S | snowflake-shaped sprite with a frosty face |
| 14 | ice_knight | Icewall Knight | III | shield | M | knight with a glacier-slab shield |
| 15 | panther | Glacier Panther | III | charger | M | sleek white panther with an icicle spine |
| 16 | frost_mage | Frost Weaver | III | caster | M | knits ice with crystal needles |
| 17 | ice_golem | Ice Golem | III | brute | L | stacked ice blocks with a cracked, glowing core |
| 18 | ash_dead | Ashen Dead | IV | melee | M | crumbling ash figure with ember eyes |
| 19 | locust | Flame Locust | IV | exploder · hover | S | chubby fire bug with a glowing belly |
| 20 | lava_hound | Lava Hound | IV | charger | M | magma-cracked hound with smoking paws |
| 21 | thrower | Scorch Thrower | IV | lobber | M | goblin-ish bomber carrying lava bottles |
| 22 | beetle | Volcanic Beetle | IV | shield | M | armored beetle using its obsidian shell as a shield |
| 23 | colossus | Fire Colossus | IV | brute | L | brass-and-magma giant with a furnace chest |
| 24 | shard | Rift Shardling | V | blinker · hover | S | floating one-eyed crystal shard |
| 25 | stalker | Void Stalker | V | blinker | M | shadow cat or assassin with a star-speckled body |
| 26 | priest | Abyss Priest | V | healer | M | robed priest with a black-sun halo |
| 27 | lancer | Dimension Lancer | V | lancer | M | knight with a spear longer than its body |
| 28 | void_mage | Void Mage | V | barrage · hover | M | mage orbited by three void orbs |
| 29 | rift_giant | Rift Behemoth | V | brute | L | giant with a rift tear in its chest; the biggest regular enemy |

---

## Part C — Bosses (`bosses.png`, 96×96, 10 sprites)

Bosses are the showpieces. Each needs a strong silhouette, a clear weak point or focal detail, and the Eclipse sigil placed prominently. Keep them in the cute style, but clearly dangerous.

| Cell | id | Name | Ch | Role | Fighting style (show it in the design) |
|---|---|---|---|---|---|
| 0 | forest_predator | Forest Predator | I | mid-boss | huge beast; claw combos, leaping pounce, poison cloud |
| 1 | root_guardian | Root Guardian | I | final | ancient tree guardian; root spears, thorn rings, spore summons |
| 2 | black_captain | Black Captain | II | mid-boss | captain of the guard; tower-shield rush and shield bash |
| 3 | fallen_king | Fallen Knight-King | II | final | corrupted king who sealed himself away; greatsword, crown, dark cavalry |
| 4 | frost_hunter | Frost Hunter | III | mid-boss | hunter; ice spears, leaping dash, ice traps |
| 5 | frost_queen | Frost Queen | III | final | queen slowing time to hold back the rift; blizzards, crystals, falling glaciers |
| 6 | lava_predator | Lava Predator | IV | mid-boss | magma crustacean or salamander; lava spit, tail swipe, quake |
| 7 | immortal_avatar | Immortal Avatar | IV | final | artificial fire guardian built by the king; flame sword, rekindles itself |
| 8 | void_executor | Void Executor | V | mid-boss | hooded executioner; dimension stab, hologram clones, void snare |
| 9 | rift_lord | Rift Lord | V | final | the first researcher, who opened the rift; time-cutting, cosmic, tragic |

Bosses are grounded: lowest opaque row 94, row 95 empty. The Rift Lord may hover (lowest opaque row 84–88) if that suits the design.

---

## 4. Concept phase deliverable (Parts A, B and C; Part 0 is described in 0.3)

- One lineup image on a neutral mid-grey background, with every design shown at **6× nearest-neighbor scale** and labeled with its cell number and name.
- Under the image, a table with one line per sprite: cell, name, **hook** and main colors.
- **Silhouette check:** the same lineup filled solid black, proving each sprite is distinct.
- Then **stop and wait for my approval.**

## 5. Production phase (every part, after approval)

1. Build the final sheet in Python (PIL) on an exact pixel grid, following section 2.
2. Run the validation script (section 6) and print its full output.
3. Deliver:
   - the **raw sheet PNG at its exact size** as a download (for example, `monsters.png` at 640×192). **Not a preview or screenshot.**
   - `preview.png`: 6× nearest-neighbor, with cell grid lines and indices, on a dark background
   - for Part 0 only: `compare.png`, a before/after view of every cell at 6×
   - for Parts A–C: `manifest.json` in the form `{ "<id>": { "cell": n, "name": "...", "hover": true|false, "bbox": [x0, y0, x1, y1], "colors": n } }`

## 6. Validation script (all checks must pass; fix and re-run if not)

For the sheet:
- [ ] exact sheet size (`chars` and `npcs` 320×96, `monsters` 640×192, `bosses` 480×192), mode RGBA
- [ ] alpha values ⊆ {0, 255}
- [ ] every listed cell has opaque pixels, and every unlisted cell is fully transparent

For each listed cell:
- [ ] no opaque pixel touches the cell's left, right or top edge
- [ ] grounded: lowest opaque row = cell height − 2, and the last row is fully transparent
- [ ] hovering: lowest opaque row is between cell height − 12 and cell height − 8
- [ ] horizontal center of the opaque pixels within ±2 px of the cell center
- [ ] unique color count ≤ the sheet's limit
- [ ] **isolated-pixel ratio ≤ 12%** (an opaque pixel whose four neighbors all differ from it by RGB distance > 30); print the ratio for every cell
- [ ] a dark outline (luminance < 60) on at least 90% of silhouette border pixels
- [ ] monsters: height matches the size class (S 18–28, M 30–44, L 50–62)
- [ ] Part 0: cell 17 is green-dominant (grape), and cell 19 has an orange carrot body with a green leafy top
