<div align="center">

<img src="docs/title.png" alt="ECLIPSE title screen" width="720">

# ECLIPSE — The Forgotten Rift

**A 50-level pixel action RPG that runs right in your browser. No install required.**

5 classes · 10 bosses · 50 main quests · real-time 1v1 PvP · offline play (PWA)

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Phaser 3](https://img.shields.io/badge/Phaser-3.90-8B5CF6?style=flat-square)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22.5%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-node%3Asqlite-003B57?style=flat-square&logo=sqlite&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-offline-5A0FC8?style=flat-square&logo=pwa&logoColor=white)

</div>

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Getting Started](#getting-started)
- [Controls](#controls)
- [World & Bosses](#world--bosses)
- [Accounts, Saves & PvP](#accounts-saves--pvp)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Known Limitations](#known-limitations)
- [Credits & Licenses](#credits--licenses)

## About

A black sun hangs in the sky, and a rift is eating the world.
**ECLIPSE** is a 2D browser game built by turning a full 50-level action RPG design document into code, from the first page to the last.

- **Real-time action combat** tuned for feel: parries, dash i-frames, input buffering and combo ranks
- A level 1–50 progression curve across **5 chapters**, from a haunted forest to the heart of the rift
- **10 bosses** that change phases, plus 10 dungeons
- Create an account to **continue on any device**, then fight other players in **real-time 1v1 PvP**
- Open it once and **install it like an app**; after that it runs **without an internet connection**

> The in-game text is in Korean.

## Features

| Area | Details |
|---|---|
| ⚔️ Combat | Light/heavy combos (L-L-L, L-L-H, L-H-H, D-L-H, F-L-H), 70–190 ms dash invincibility, 120 ms parry with counterattack, 130 ms input buffer, D–S combo ranks, status effects (poison, burn, freeze, bleed, guard break, stagger) |
| 🧙 Classes | Swordsman, Brawler, Mage, Archer, Lancer, each with their own skill scaling and a 4-tier talent tree |
| 🎨 Characters | Custom names, 12 outfits × 8 colors, 3 character slots per account |
| 🗺️ World | Terrain such as rivers, swamps, moats, glacier lakes, lava rivers and void cliffs; a different town and field layout per chapter; room-and-corridor dungeons that lock behind you |
| 👹 Enemies | 30 regular monsters with 16 AI types, elites, and 10 bosses driven by state machines with phases, weighted pattern choice and fairness rules |
| 📜 Quests | 50 main quests, 20 side quests, branching ending |
| 🎒 Gear | 8 slots, 6 rarities, random affixes, upgrades up to +8, rerolling, crafting and salvaging, 10 relics, legendary pity system |
| 🌐 Online | Sign-up and login, cloud saves, ELO-ranked PvP arena |
| 📱 PWA | Installable app, offline play, automatic updates, gamepad support |
| ♿ Accessibility | Photosensitivity mode, screen-shake toggle, boss pattern name callouts |

## Getting Started

**Requirements**: Node.js 22.5 or later (the server uses Node's built-in SQLite, so there is no database to install)

```bash
git clone https://github.com/HyeonbinJung/eclipse-game.git
cd eclipse-game
npm install
npm run serve        # build + start the game server → http://localhost:4173
```

On Windows, double-click `ECLIPSE 실행.bat` to build, start the server and open the browser in one step.

### Development mode

```bash
npm start            # terminal 1: game server (API + WebSocket)
npm run dev          # terminal 2: Vite dev server → http://localhost:5173
```

The dev server proxies API and socket requests to the game server.

### Play with friends over the internet

```bash
npm run serve
ngrok http 4173      # share the https URL ngrok gives you
```

Because the URL is https, anyone who opens it can sign up, play PvP and install the app.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build (`dist/`) |
| `npm start` | Game server only |
| `npm run serve` | Build, then start the game server |
| `npm run preview` | Preview the build with Vite |

## Controls

| Key | Action |
|---|---|
| `W` `A` `S` `D` | Move |
| Mouse | Aim |
| Left click / Right click | Light attack / Heavy attack (hold left click to chain) |
| `Space` / `Shift` | Dash (with invincibility frames) |
| `F` | Parry; land a light attack within 0.45 s to counter |
| `Q` / `E` / `R` | Skills (Lv 4 / Lv 8) / Ultimate (Lv 20) |
| `1` | HP potion |
| `G` | Interact |
| `I` / `J` / `K` | Inventory / Quests / Talents |
| `ESC` / `F1` | Menu (arena, rankings) / Help |

Gamepads with an Xbox layout are supported.

## World & Bosses

| Chapter | Region | Levels | Bosses |
|---|---|---|---|
| 1 | Haunted Forest | 1–10 | Forest Predator, Root Guardian |
| 2 | Fallen Royal Castle | 11–20 | Black Guard Captain, Corrupted Knight King |
| 3 | Frozen Abyss | 21–30 | Frost Hunter, Frost Queen |
| 4 | Burning Wasteland | 31–40 | Lava Predator, Immortal Avatar |
| 5 | Heart of the Rift | 41–50 | Void Executor, Rift Lord |

At the end, you decide whether to **seal the rift or rebuild it**.

## Accounts, Saves & PvP

- **Sign-up / login**: Passwords are stored as scrypt hashes and sessions last 30 days. Each account can hold 3 characters.
- **Cloud saves**: Progress is uploaded whenever it changes (batched every 2 seconds) and again when you close the window, so you can pick up on another device.
- **Guest play**: You can play without an account. Progress is then saved only in that browser, and PvP is unavailable.
- **PvP arena**: Enter through the arena keeper in town or the `ESC` menu, using quick match or a room code. Matches are real-time 1v1 for 2 minutes with 2× HP, 0.7× damage and no potions, ranked by ELO rating.

## Tech Stack

| Layer | Technology |
|---|---|
| Client | TypeScript, Phaser 3, Vite |
| Server | Node.js (`http` + `ws`), built-in `node:sqlite` |
| Real-time | WebSocket (PvP matchmaking and sync) |
| App | Web App Manifest + Service Worker (offline cache) |
| Audio | Kenney sound effects + procedurally generated WebAudio music |
| Testing | Playwright-based smoke and end-to-end scripts (`tools/`) |

## Project Structure

```
eclipse-game/
├─ index.html
├─ public/                 # icons, manifest, sprites, effects, sounds
├─ server/
│  └─ index.mjs            # static files + account/save API + PvP WebSocket
├─ src/
│  ├─ main.ts              # game bootstrap
│  ├─ pwa.ts               # service worker registration, install button
│  ├─ scenes/              # Boot, Title, World, Hud
│  ├─ game/                # player, enemies, bosses, combat, terrain, map generation
│  ├─ data/                # classes, monsters, bosses, items, world, formulas
│  ├─ core/                # game state, stat calculation
│  ├─ net/                 # API client, PvP socket
│  ├─ ui/                  # menus, account screens, styles
│  └─ audio/               # sound effects, music
└─ tools/                  # smoke tests, icon generation and other dev scripts
```

## Known Limitations

- PvP hits are judged on the defender's screen. The server checks stat caps and message rates, but it is not fully server-authoritative, so serious anti-cheat would need more work.
- Game data (`server/data/`) is not in the repository; the server creates it on first run.

## Credits & Licenses

| Asset | Source | License |
|---|---|---|
| Characters, monsters, tiles, items | Kenney *Tiny Dungeon*, *Tiny Town* | CC0 |
| Effects | Kenney *Particle Pack* | CC0 |
| Sound effects and jingles | Kenney *Impact Sounds*, *RPG Audio*, *Interface Sounds*, *Music Jingles* | CC0 |
| Font | Galmuri (quiple) | SIL OFL 1.1 |
| Background music | Procedural WebAudio (original code) | — |

Full license texts are in [`public/assets/LICENSE-kenney.txt`](public/assets/LICENSE-kenney.txt) and [`public/assets/LICENSE-galmuri-OFL.txt`](public/assets/LICENSE-galmuri-OFL.txt).
