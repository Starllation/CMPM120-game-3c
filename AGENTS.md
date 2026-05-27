# AGENTS.md — Sweet Escape (Game3 AI Reimplement)

## Project Status

**No source code exists yet.** `src/Scenes/` is empty, and there is no `index.html` or any JavaScript game code. The project currently contains only:
- A bundled Phaser 3.70.0 library (`lib/phaser.js`, ~7.1MB unminified)
- A complete asset pipeline (tilemaps, spritesheets, sounds, particles)
- A comprehensive game design spec (`DESIGN.md`)

An agent's primary task in this repo is **implementing the game from the DESIGN.md spec**.

## Architecture

This is a **browser-only, no-build-step** Phaser 3 project. There is no `package.json`, no bundler, no npm. The Phaser library is loaded via a `<script>` tag from `lib/phaser.js`. All game source files should be loadable the same way or via ES module imports from the same origin.

### Expected File Structure

```
index.html                  ← Entry point (needs to be created)
lib/phaser.js              ← Phaser 3.70.0 (bundled locally)
src/Scenes/                ← Phaser scene classes (Platformer, etc.)
assets/
  platformer-level-1.tmj   ← Tiled tilemap (JSON format) — THE level
  platformer-level-1.tmx   ← Tiled source (XML, for Tiled editor only)
  tilemap_packed.png       ← Tileset 1 (16 columns, GIDs 1–112)
  tilemap_packed2.png      ← Tileset 2 (20 columns, GIDs 113–292)
  tilemap_packed3.png      ← Tileset 3 (10 columns, GIDs 293–352)
  tilemap-characters-packed.png/.json  ← Character/atlas spritesheet
  particles/kenny-particles-*.png/.json ← Multi-atlas particle sprites
  pngs/                    ← Individual sprite PNGs (candles, coins, etc.)
  sound/                   ← Audio files (mixed .mp3 and .ogg)
```

## DESIGN.md is the Source of Truth

`DESIGN.md` is a ~600-line specification covering every system: physics constants, collision layers, object positions, animations, VFX, sound volumes, camera settings, puzzle logic, and score calculation. **Read it fully before implementing anything.** It is extremely precise — positions, frame names, volume levels, and tween parameters are all specified.

## Key Implementation Gotchas

### Tilemap Collision (Critical)
- Two separate collision layers exist with **different collision types**:
  - `Ground-n-Platforms2` — **full collision** (all four sides), standard `setCollisionByProperty` or `setCollision` call
  - `Ground-n-Platforms` — **top-only collision**: `setCollision(false, false, true, false)` — player can jump through from below
- Getting these backwards will break platforming completely

### Moving Platform Riding
- The Moving-Platforms layer tween offsets the **entire tilemap layer**, not individual sprites
- The player must be manually translated by the layer's delta-x each frame to "ride" the platform — Phaser does not do this automatically when a layer moves

### Spikes Use Overlap, Not Collider
- Spikes are checked via `physics.add.overlap()` (passthrough), NOT `physics.add.collider()` (solid). Spikes do not block movement.

### One-Way Collision API
- `setCollision(left, right, top, bottom)` — the order matters. Top-only = `setCollision(false, false, true, false)`.

### Player Physics
- Uses **acceleration-based** movement, NOT velocity-based. Set `acceleration`, `drag`, and `maxSpeed` on the body. Do not set `velocity` directly for horizontal movement.

### Sound Files Are Mixed Format
- Some sounds are `.mp3` (coin, diamond, flag, heart, hurt), others are `.ogg` (click, door, hmm, lose, win)
- Use Phaser's multi-format loading or check actual file extensions when adding to loader

### Missing Assets
- `sky.png` is referenced in DESIGN.md but **not present** in the assets directory. The sky background layer will need an alternative approach (solid color rect, or the asset needs to be added)
- `spike.png` is referenced in DESIGN.md for individual loading but may not exist as a standalone file in `pngs/` — spike objects come from the tilemap

### Tileset GID Ranges (for `addTilesetImage`)
| Tileset | First GID | Image | Columns |
|---------|-----------|-------|---------|
| kenny_tilemap_packed | 1 | tilemap_packed.png | 16 |
| kenny_tilemap_packed2 | 113 | tilemap_packed2.png | 20 |
| kenny_tilemap_packed3 | 293 | tilemap_packed3.png | 10 |

When calling `map.addTilesetImage()`, the key string must match what's in the `.tmj` file's `tilesets` array.

### Atlas Loading
- Character atlas: `this.load.atlas("kenny_characters", "assets/tilemap-characters-packed.png", "assets/tilemap-characters-packed.json")`
- Particle atlas: `this.load.multiatlas("kenny-particles", "assets/particles/kenny-particles.json", "assets/particles/")` — note the `multiatlas` method and the path prefix

### Global State Management
- Score, health, and key possession should be stored as globals (e.g., on `this.registry` or a shared object), since the game restarts the Platformer scene on replay and needs to reset these
- The DESIGN.md specifies default spawn at (17, 528) and starting health of 3

### Cracker Toggle System
- All 49 cracker blocks toggle **simultaneously** when ANY exclaim block is hit from below
- This is a single boolean (`crackerBlock`) that controls all crackers — not per-cracker state
- Door activation also resets crackers to solid (`crackerBlock = true`)

### Donut Puzzle (Bonus Room)
- A special donut is spawned dynamically when door1 is used, not placed in the tilemap
- If the donut falls into spikes, it's destroyed and a hint text box appears
- The player resets the puzzle by using door2 to return, then door1 to re-enter (which respawns the donut)
- The `donutDiamond` at (3537, 504) starts invisible with physics disabled and is revealed when the donut reaches `donutTrigger`

### Camera Zoom Implications
- Camera zoom is 2.0, meaning the visible area is 500×300 world pixels
- Game canvas should be 1000×600 to match the camera size spec
- `scrollFactor(0)` is used for HUD elements to keep them screen-fixed

## Running the Game

Since there's no build system, serve the project directory with any static file server and open `index.html` in a browser:

```bash
# Python
python3 -m http.server 8000

# Node (if npx available)
npx serve .
```

Phaser must be loaded before game code. A typical `index.html` loads `lib/phaser.js` first, then the scene scripts, then boots the `Phaser.Game` config.

## CMPM 120 Context

This is a UC Santa Cruz CMPM 120 (Game Development) assignment. The project is a "Game 3 AI Reimplement" — meaning the game was originally designed and the task is to re-implement it from the design doc. Conventions to follow:
- Single-scene architecture (Platformer scene handles all gameplay; win/lose are likely overlays within the same scene or simple scene switches)
- No backend, no server, no persistence
- Focus on matching the DESIGN.md spec precisely
