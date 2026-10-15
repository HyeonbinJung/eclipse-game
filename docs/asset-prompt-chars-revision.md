# ECLIPSE — Player Character Sheet Revision (for ChatGPT)

> Attach two images before sending: **(1)** the original 20-character design lineup and **(2)** the current `chars.png` (320×96).
> If ChatGPT still has the earlier conversation, run this there.

---

You produced `chars.png` for my game (20 player characters, 32×48 cells, 10×2 grid, 320×96). I tested it in-engine. The layout and spec are correct, but the **pixel quality is not production-ready**, and one character needs a full rework. Please revise the sheet as described below.

**Keep unchanged:** sheet size, cell size, cell order, character identities, feet on row 46, empty row 47, horizontal centering, and transparency rules. The engine depends on these.

## 1. Global problem: speckle noise (fix in every cell)

I measured the share of "isolated" pixels — opaque pixels whose four neighbors all differ in color. Clean hand-made pixel art at this size usually sits around 5–12%. The current sheet is at **25–45% in 17 of 20 cells**. In-game this looks like grainy, dirty texture instead of clean pixel art.

| Cell | Character | Isolated pixels |
|---|---|---|
| 0 | Red Hood | 42.9% |
| 1 | Apple | 39.5% |
| 2 | Strawberry Bride | 34.2% |
| 3 | Pumpkin King | 38.8% |
| 4 | Tomato | 34.7% |
| 5 | Broccoli | 36.7% |
| 6 | Durian | 35.1% |
| 7 | Goldfish | 29.1% |
| 8 | Frost Princess | 37.8% |
| 9 | Red-haired Swordswoman | 41.7% |
| 10 | Pink Hair | 44.5% |
| 11 | White Cat | 32.7% |
| 12 | Lemon Knight | 33.7% |
| 13 | Strawberry Mage | 34.6% |
| 14 | Purple Witch | 30.2% |
| 15 | Tangerine Warrior | 25.2% |
| 16 | Pepper Knight | 16.1% |
| 17 | (see below) | 25.3% |
| 18 | Mushroom | 38.2% |
| 19 | Carrot Archer | 9.5% (clean, but badly drawn) |

**How to fix it — redraw each cell by hand on the pixel grid; do not just re-run a downscale or quantize:**
- Paint large areas (cloaks, dresses, robes, hair, skin, fruit heads) as **flat color regions with 2–3 tone steps** (base, shadow, optional highlight). Light comes from the top-left.
- **No dithering, no texture noise, no random dark pixels inside clothing.**
- Patterns (embroidery, polka dots, plaid, armor plates) must be **deliberate and regular**, not blotches.
- Keep the **1px dark outline** (`#3f2631`) continuous around the silhouette. Use darker shades of the local color for interior lines.
- **Faces must read at 1×:** two clear eyes (usually 1×2 or 2×2 dark pixels with a 1px highlight), optional 1px mouth, clean skin or fruit color around them. No smudges across the face.
- Keep each character's palette at ≤ 24 colors, ideally 12–18.

## 2. Per-character notes

| Cell | Character | What to fix |
|---|---|---|
| 0 | Red Hood | Face is muddy inside the hood. Clean face, solid red hood with one shadow tone, clear basket or cape edge. |
| 1 | Apple | Body is muddy. Make a glossy apple head with one clean highlight, simple outfit, clear leaf and stem. |
| 2 | Strawberry Bride | Dress speckled. Make a clean white dress with 2 grey-lavender shadow tones, a readable bouquet, strawberry seeds as regular dots. |
| 3 | Pumpkin King | Good silhouette. Clean the robe, make pumpkin ribs as 2–3 clear vertical lines, crisp crown. |
| 4 | Tomato | Red splotches on the white robe look like blood. Turn them into a deliberate pattern (polka dots or embroidered trim) or remove them. |
| 5 | Broccoli | Good. Clean the body. Florets as 3–4 rounded clusters with a highlight each. |
| 6 | Durian | Face gets lost in the spikes. Make spikes a regular pattern, leave a clean face area with clear eyes, armor in flat plates. |
| 7 | Goldfish | Best of the set. Just clean the fins and scales (scales as a regular pattern). |
| 8 | Frost Princess | Too low-contrast; the face almost disappears. Add stronger outline and darker lavender shadows, clearer eyes and crown. |
| 9 | Red-haired Swordswoman | Hair is noise. Draw hair as 3–4 large locks with one highlight each. Sword must be crisp and clearly held. |
| 10 | Pink Hair | Noisiest cell. Same hair treatment as cell 9, and a clean dress. |
| 11 | White Cat | Brown blotches on the dress look dirty. Clean white fur with soft grey shadows, clear ears, eyes and crown. |
| 12 | Lemon Knight | Clean the armor. Greatsword crisp and held in hand. |
| 13 | Strawberry Mage | Good. Clean the robe. Keep the blue orb bright and round. |
| 14 | Purple Witch | Face too dark and low-contrast. Lighten the skin, separate the hat brim from the hair, clean purple tones. |
| 15 | Tangerine Warrior | Good. Light cleanup. |
| 16 | Pepper Knight | Good. Light cleanup only. Use it as the quality reference for the others. |
| 17 | **Grape — wrong character** | The design lineup's 18th character (cell 17) is a **green grape-bunch-headed girl**. The current cell shows a purple-hooded girl instead. Redraw it from the design: rounded green grape cluster for hair/head, leaf, light green dress. |
| 18 | Mushroom | Clean the red cap with regular white spots, and clean the dress. |
| 19 | **Carrot Archer** | **Full rework — see section 3.** |

## 3. Full rework: Carrot Archer (cell 19)

**What's wrong now:**
- The head is a round orange ball, not a carrot. The green top reads as broccoli or hair.
- The face is a dark smudge — one eye is missing.
- Body, arms and legs are flat rectangles with no shading and no inner lines. It looks like a placeholder next to the other 19.
- The bow floats beside the body instead of being held, and its line is too thin to read.
- It does not share the rendering style of the rest of the sheet.

**Rework brief:**
- **Concept:** a nimble forest-ranger carrot, the archer of the carrot-folk. Confident, a little mischievous.
- **Head and body:** a recognizable carrot. Tapered orange root shape with 2–3 horizontal ridge lines, and a lush **leafy green top** (3–5 distinct leaf blades fanning upward, two greens plus a highlight). The face sits on the upper, wider part of the carrot.
- **Face:** two clear eyes, a small confident smile or smirk.
- **Outfit:** short green ranger hood or capelet, leather strap across the chest, quiver with 2–3 visible arrow fletchings over the back shoulder, brown boots.
- **Bow:** a wooden recurve bow **held in the right hand** (around cell pixel x 22–27, y 22–42), drawn with a 2px-thick limb and a 1px string, and lowered at the side in an idle pose. It must stay within the cell.
- **Pose:** standing idle, 3/4 facing right, feet on row 46.
- **Style:** same proportions, outline weight, 2–3 tone shading and color richness as the Pepper Knight (cell 16) and Goldfish (cell 7).
- In the concept phase, show **3 variations** of the Carrot Archer at 8× so I can pick one before you finalize.

## 4. Workflow

1. **Concept check:** show the revised sheet at **6× nearest-neighbor** on a dark background, with a **before/after** row pair for every cell, plus the 3 Carrot Archer variations. Then **stop and wait for my approval**.
2. **Final:** after approval, build the final `chars.png` with Python (PIL) on the exact pixel grid, run the validation below, and print the output.
3. **Deliver:**
   - the **raw `chars.png` file, exactly 320×96, RGBA** as a download — not a preview or screenshot
   - `preview.png` (6×, grid lines and cell numbers, dark background)
   - `compare.png` (before/after per cell, 6×)

## 5. Validation (must all pass; fix and re-run if not)

- [ ] sheet is exactly 320×96, mode RGBA; alpha values ⊆ {0, 255}
- [ ] all 20 cells have opaque pixels; nothing crosses a cell boundary or touches a cell's left, right or top edge
- [ ] each cell: lowest opaque row = 46, row 47 fully transparent
- [ ] each cell: horizontal center of opaque pixels between 14 and 18
- [ ] each cell: ≤ 24 unique colors
- [ ] each cell: **isolated-pixel ratio ≤ 12%** (an opaque pixel whose four neighbors all differ from it by RGB distance > 30), and print the ratio for every cell
- [ ] each cell: a continuous dark outline (luminance < 60) on at least 90% of silhouette border pixels
- [ ] cell 17 is green-dominant (grape), and cell 19 has an orange carrot body plus a green leafy top
