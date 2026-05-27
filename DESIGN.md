# Sweet Escape — Game Design Document

## 1. Game Overview

**Sweet Escape** is a 2D side-scrolling platformer. The player controls a small character who must traverse a single large level filled with platforms, hazards, collectibles, and puzzles to reach the finish flag. The game features a donut-pushing puzzle accessible through a key-locked door, toggleable cracker platforms, moving platforms, and a checkpoint/respawn system.

- **Genre:** 2D platformer
- **Perspective:** Side view, camera follows player
- **Win condition:** Reach the final flag (flag3 or pole object)
- **Lose condition:** Health drops to zero
- **Scoring:** Coins (1 pt each) + Diamonds (100 pts each) + Health bonus at end (health × 100)
- **Starting health:** 3 (maximum 6)
- **Default spawn point:** (17, 528) in world coordinates

---

## 2. Player Movement System

The player uses acceleration-based physics (not velocity-based). This means the player accelerates up to a max speed rather than instantly moving at max speed. Drag decelerates the player when no input is given.

### Physics Constants

| Constant | Value | Notes |
|----------|-------|-------|
| ACCELERATION | 600 | Horizontal acceleration when moving |
| DRAG | 1000 | Deceleration when no horizontal input |
| JUMP_VELOCITY | -500 | Upward velocity on jump (negative = up) |
| MAX_SPEED | 200 | Maximum horizontal speed |
| GRAVITY | 1300 | World gravity (pixels/sec²) |
| Player scale | 2.0 | Camera zoom factor |

### Controls

| Action | Input |
|--------|-------|
| Move left | Arrow Left or A |
| Move right | Arrow Right or D |
| Jump | Arrow Up or W or Space |

### Movement Rules

- The player can only jump when grounded (body touching a platform layer below).
- Horizontal movement sets acceleration in the appropriate direction. When no key is held, acceleration is zero and drag decelerates the player to a stop.
- The player sprite flips horizontally to face the direction of movement.

### Animations

| State | Animation | Details |
|-------|-----------|---------|
| Walking | `walk` | Frames: tile_0000 → tile_0001, 15 fps, loop |
| Idle | `idle` | Single frame: tile_0000 |
| Jumping | `jump` | Single frame: tile_0001 |

---

## 3. Platform and Collision System

### Tilemap Specifications

- **Map size:** 201 tiles wide × 34 tiles tall
- **Tile size:** 18 × 18 pixels
- **Total pixel dimensions:** 3618 × 612

### Tilesets

| Tileset Name | First GID | GID Range | Columns | Notes |
|-------------|-----------|-----------|----------|-------|
| kenny_tilemap_packed | 1 | 1–112 | 16 | Primary tileset |
| kenny_tilemap_packed2 | 113 | 113–292 | 20 | Secondary tileset |
| kenny_tilemap_packed3 | 293 | 293–352 | 10 | Tertiary tileset |

### Tile Layers (render/collision order, back to front)

| Layer Name | Collision | Notes |
|------------|-----------|-------|
| Back-Back-Background | None | Decorative only |
| Back-Background | None | Decorative only |
| Background | None | Decorative only |
| Ground-n-Platforms2 | **Full collision** (all four sides) | Solid terrain |
| Ground-n-Platforms | **Top-only collision** | Player can jump up through from below |
| Moving-Platforms | **Full collision** | Sine-wave horizontal movement, player rides platform |
| Foreground | None | Decorative overlay, rendered in front of everything |

### Top-Only Collision Detail

The "Ground-n-Platforms" layer uses one-way collision: only the top face of tiles is solid. The player can jump upward through these platforms from below and land on top. This is implemented by setting collision on only the top edge: `setCollision(false, false, true, false)`.

### Moving Platforms

- The Moving-Platforms layer is offset horizontally using a tween:
  - **X offset:** +150 pixels from starting position
  - **Duration:** 1500 ms
  - **Easing:** Sine.easeInOut
  - **Yoyo:** true (bounces back and forth)
  - **Repeat:** -1 (infinite)
- **Riding behavior:** Each frame, the player's x position is adjusted by the delta-x of the moving layer. This makes the player "ride" the platform rather than sliding off.

---

## 4. Collectibles

### Coins

- **Count in level:** 34
- **Point value:** 1 each
- **Object layer:** "Coins"
- **Animation:** `coinAnim` — alternates between coin1 and coin2 frames at 2 fps, looping
- **Effect on collect:** +1 score, play coinSound (volume 0.8), spawn collect VFX, destroy coin

### Hearts

- **Count in level:** 3
- **Effect on collect:** +1 player health (up to max 6), play heartSound (volume 1.0), spawn collect VFX, destroy heart
- **No point value** — only restores health

### Diamonds

- **Count in level:** 3
- **Point value:** 100 each
- **Object layer:** "Diamonds"
- **Special:** There is a hidden 4th diamond (`donutDiamond`) that is only revealed by solving the donut puzzle (see Section 10)
- **Effect on collect:** +100 score, play diamondSound (volume 1.0), spawn collect VFX, destroy diamond

### Key

- **Count in level:** 1
- **Position:** (2232, 522)
- **Effect on collect:** Key is stored in game state, HUD key indicator becomes visible, play clickSound (volume 1.0)
- **Purpose:** Required to use door1 (see Section 9)

---

## 5. Hazards and Damage

### Spikes

- **Object layer:** "Hazards" (59 spike objects)
- **Collision type:** Overlap (not physics collider) — spikes do not physically block the player
- **Damage:** -1 health per spike contact
- **Hurt cooldown:** 1500 ms — the player cannot be damaged again for 1.5 seconds after a hit
- **On hit:**
  1. Subtract 1 health
  2. Play hurtSound (volume 0.2)
  3. Teleport player to last checkpoint (or spawn point if no checkpoint reached)
  4. Flash/tint the player sprite briefly to indicate damage
- **Death:** If health reaches 0, the game ends with a lose screen

---

## 6. Checkpoint System

### Flag Objects

| Object | Position | Is Checkpoint? | Behavior |
|--------|----------|----------------|----------|
| flag1 | (1044, 432) | Yes | Saves respawn position, plays flagSound on first activation |
| flag2 | (1602, 342) | Yes | Saves respawn position, plays flagSound on first activation |
| flag3 | (2358, 306) | **No — this is the win flag** | Triggers win condition |
| flag4 | (2898, 540) | Yes | Saves respawn position, plays flagSound on first activation |
| pole | (2358, 324–342) | No — part of win condition | Overlap with this also triggers win |

### Checkpoint Behavior

- When the player overlaps a checkpoint flag, their current position is saved as the respawn point.
- The flagSound (volume 0.5) plays only the **first time** a checkpoint is activated (not on subsequent visits).
- A flag VFX burst (star particles) plays on first activation.
- On spike damage, the player teleports to the last saved checkpoint position, or to the default spawn point (17, 528) if no checkpoint has been reached.
- Checkpoint flags play a looping animation: `flagAnim` — alternates between flag1 and flag2 frames at 4 fps.

### Win Condition

The player wins by overlapping with either the `flag3` object or the `pole` object. Both are in the same area at the end of the level. This triggers the win end screen.

---

## 7. Cracker Toggle System

### Overview

Crackers are platform blocks that can be toggled between solid and passthrough states. An "exclaim" (exclamation) block acts as a switch — hitting it from below toggles all cracker blocks.

### Cracker Blocks

- **Object layer:** "Crackers" (49 objects)
- **Two states:**
  - **Active (solid):** `crackerBlock = true`, alpha = 1.0, physics body enabled
  - **Inactive (passthrough):** `crackerBlock = false`, alpha = 0.3, physics body disabled
- **Initial state:** Active (solid)
- **Toggle:** All crackers switch state simultaneously when any exclaim block is hit

### Exclaim Blocks

- **Object layer:** "Blocks" (3 objects)
- **Positions:** (2254, 504), (1602, 216), (2862, 486)
- **Collision:** Only solid from below — the player must be below the block (player.y > block.y) and jumping into it
- **On hit:**
  1. Toggle `crackerBlock` boolean
  2. Update all cracker alpha and physics (1.0/enabled or 0.3/disabled)
  3. Play clickSound (volume 1.0)
  4. Tween the exclaim block upward briefly (bounce effect), then back to original position

---

## 8. Donuts

### Overview

Donuts are physics-enabled objects the player can push around the level. They have circular physics bodies and spin based on their horizontal velocity.

### Donut Physics Properties

| Property | Value |
|----------|-------|
| Body type | Circle (radius 9) |
| Bounce Y | 0.7 |
| Bounce X | 0.7 |
| Drag X | 300 |
| Max velocity Y | 350 |
| Angular velocity | velocity.x × 5 (spins based on horizontal speed) |

### Donut Initial Positions

| Donut | Position |
|-------|----------|
| donut1 | (88, 402) |
| donut1 | (900, 528) |
| donut2 | (1563, 330) |
| donut3 | (1106, 420) |

### Interaction

- The player collides with donuts and can push them by walking into them.
- Donuts collide with the Ground-n-Platforms2 and Ground-n-Platforms layers.
- Donuts are affected by gravity and bounce when they land.

---

## 9. Door and Teleport System

### Door1 (Key-Required Door)

- **Position:** (1656, 540)
- **Trigger object:** "door1" in Triggers layer
- **Requires key:** Yes — if the player does not have the key, a text box displays "You need a key!" at (1665, 450)
- **Activation:** Player must be grounded AND pressing jump while overlapping the door trigger
- **On activation:**
  1. Teleport player to (2763, 530)
  2. Spawn a bonus donut at (3015, 350)
  3. Set `crackerBlock = true` (crackers become solid)
  4. Hide the donutBox text box (see Section 13)
  5. Play door sound (volume 0.5)
  6. Remove the key indicator from HUD

### Door2 (Return Door)

- **Position:** (2754, 540)
- **Trigger object:** "door2" in Triggers layer
- **Requires key:** No
- **Activation:** Player must be grounded AND pressing jump while overlapping the door trigger
- **On activation:**
  1. Teleport player to (1665, 530)
  2. Set `crackerBlock = true` (crackers become solid)
  3. Play door sound (volume 0.5)

---

## 10. Donut Puzzle (Bonus Room)

This is a puzzle in the bonus room (accessible through door1). The player must push a donut to a trigger zone.

### Setup

- When door1 is used, a special donut is spawned at (3015, 350).
- A text box (`donutBox`) at (2871, 420) displays:
  - Line 1: "Don't give up!"
  - Line 2: "Use door to"
  - Line 3: "reset donut!"
  - This box starts hidden and becomes visible when the donut falls into spikes.

### Puzzle Logic

1. **Donut falls into spikes:** If the special donut overlaps any spike hazard:
   - The donut is destroyed
   - The `donutBox` text box becomes visible (hinting the player to use door2 to return and door1 to respawn the donut)
   
2. **Donut reaches trigger zone:** If the donut overlaps the `donutTrigger` object (name="donutTrigger", in the Triggers layer around position 3438–3474, y 576–594):
   - A hidden diamond (`donutDiamond`) at position (3537, 504) becomes visible and its physics body is enabled
   - The `hmm` sound plays (volume 0.2) — only once
   - This diamond is worth 100 points

### Reset

- If the donut is destroyed (fell into spikes), the player can return through door2 and re-enter through door1 to spawn a fresh donut and try again.
- The donutBox text box is hidden again when door1 is re-used.

---

## 11. Camera System

| Setting | Value |
|---------|-------|
| Bounds | (0, 0, map.widthInPixels + 100, map.heightInPixels) |
| Deadzone | 50 × 50 pixels |
| Camera size | 1000 × 600 |
| Zoom | 2.0 |
| Follow offset | (-90, 10) relative to player |
| Lerp | 0.25, 0.25 (smooth follow in both axes) |

The camera follows the player with a small deadzone, creating smooth scrolling. The zoom factor of 2.0 means the camera is zoomed in, showing a 500×300 pixel window of the world (1000/2 × 600/2) at any time.

---

## 12. Parallax Backgrounds

Three background layers create depth via different scroll factors:

| Layer | Asset | Scroll Factor | Scale | Alpha | Notes |
|-------|-------|---------------|-------|-------|-------|
| Sky | TileSprite (full width) | 0 (fixed) | Default | 1.0 | 3618×600, stays in place |
| Mountains | TileSprite | 0.2 | 0.2 | 1.0 | Parallax — moves slower than camera |
| Clouds | TileSprite | 0.5 | 0.2 | 0.8 | Faster parallax, slightly transparent |
| Background rect | Solid color rectangle | 1.0 (scrolls with world) | Default | 1.0 | Color 0xFFE6DA, positioned at (720, 450) |

---

## 13. Text Boxes and Dialog

Text boxes are custom sprite objects that display text in decorative box frames. Different "key" values produce different box sizes and text layouts.

| Key | Box Type | Scale | Text Layout | Font Size | Fill Color |
|-----|----------|-------|-------------|-----------|------------|
| 1 | Small | 0.4 | Single line | 15px | #534200 |
| 2 | Big | 0.3 | Three lines | 12px | #534200 |
| 3 | Win score box | 1.5 | Five text elements, mixed sizes | varies | varies |
| 4 | Lose score box | 1.5 | Five text elements, mixed sizes | varies | varies |

### In-Game Text Boxes

| Box | Position | Type | Text | Initial Visibility |
|-----|----------|------|------|-------------------|
| needKeyBox | (1665, 450) | Small (key=1) | "You need a key!" | Visible |
| donutBox | (2871, 420) | Big (key=2) | "Don't give up!" / "Use door to" / "reset donut!" | Hidden |

Text boxes have `hideBox()`, `showBox()`, and `destroyBox()` methods.

---

## 14. HUD (Heads-Up Display)

All HUD elements use `scrollFactor(0)` so they stay fixed on screen regardless of camera position.

| Element | Position | Details |
|---------|----------|---------|
| Score text | (252, 150) | Font size 18px, fill color #444A5F |
| Heart 1 | (642, 158) | Right-most heart, scrollFactor 0 |
| Heart 2 | (627, 158) | Spacing: -15px between hearts |
| Heart 3 | (612, 158) | |
| Heart 4 | (597, 158) | |
| Heart 5 | (582, 158) | |
| Heart 6 | (567, 158) | Left-most heart |
| Key indicator | (639, 170) | Hidden until key is collected |

### Heart Display Logic

- Hearts are shown/hidden based on current player health.
- With 3 health (starting), hearts 1–3 are visible, 4–6 are hidden.
- Collecting a heart adds one visible heart.
- Damage removes one visible heart.

---

## 15. End Screens

### Win Screen

- **Background color:** 0xFFC4CA (light pink)
- **Title text:** "Great Job!"
- **Display:**
  - Number of diamonds collected (out of 3, or 4 if donutDiamond was collected)
  - Heart bonus: playerHealth × 100
  - Total score
- **Prompt:** "Press SPACE to play again"
- **Sound:** winSound (volume 0.15)
- **Box type:** Win score box (key=3)

### Lose Screen

- **Background color:** 0x9B5850 (dark brown-red)
- **Title text:** "You can do it!"
- **Display:** Same score breakdown as win screen
- **Prompt:** "Press SPACE to try again"
- **Sound:** loseSound (volume 0.2)
- **Box type:** Lose score box (key=4)

### Score Calculation

| Source | Value |
|--------|-------|
| Coins | 1 point each |
| Diamonds | 100 points each |
| Health bonus | playerHealth × 100 |

### Replay

Pressing SPACE on either end screen restarts the Platformer scene. Global score and health are reset.

---

## 16. Animations

### Player Animations

| Name | Frames | FPS | Loop |
|------|--------|-----|------|
| walk | tile_0000 → tile_0001 | 15 | Yes |
| idle | tile_0000 (single frame) | — | No |
| jump | tile_0001 (single frame) | — | No |

### Object Animations

| Name | Frames | FPS | Loop | Object Type |
|------|--------|-----|------|-------------|
| coinAnim | coin1 → coin2 | 2 | Yes | Coins |
| flagAnim | flag1 → flag2 | 4 | Yes | Checkpoint flags |
| redCandleAnim | redCandle1 → redCandle2 | 4 | Yes | Red candles |
| blueCandleAnim | blueCandle1 → blueCandle2 | 4 | Yes | Blue candles |

All animation frame names refer to frames in the `tilemap-characters-packed` atlas.

---

## 17. VFX (Particle Effects)

All particles use frames from the `kenny-particles` multi-atlas. Particle effects are one-shot (emit once then stop) unless noted.

### Walking Particles

| Property | Value |
|----------|-------|
| Frames | dirt_01, dirt_02 |
| Scale | 0.03–0.06 |
| Lifespan | 300 ms |
| Gravity Y | -80 (floats upward slightly) |
| Emission | Continuous while grounded and moving |
| Position | At player's feet |

### Jumping Particles

| Property | Value |
|----------|-------|
| Frames | dirt_01, dirt_02 |
| Scale | 0.02–0.1 |
| Lifespan | 200 ms |
| Gravity Y | 900 |
| Angle | 90 (emits downward) |
| Blend mode | ADD |
| Emission | One-shot explode on jump |
| Quantity | Multiple particles |

### Flag Particles (checkpoint activation)

| Property | Value |
|----------|-------|
| Frame | star_07 |
| Speed | 200–300 |
| Lifespan | 1000 ms |
| Scale | 0.05 → 0 (fades out) |
| Gravity Y | 800 |
| Angle | -105 to -75 (upward arc) |
| Blend mode | ADD |
| Emission | One-shot explode |
| Quantity | 15 particles |

### Collect Particles (coin/heart/diamond pickup)

| Property | Value |
|----------|-------|
| Frame | star_07 |
| Speed | 80–100 |
| Lifespan | 300 ms |
| Scale | 0.05 → 0 (fades out) |
| Blend mode | ADD |
| Emission | One-shot explode |
| Quantity | 3 particles |

---

## 18. Sound Events

| Event | Sound Key | Volume |
|-------|-----------|--------|
| Coin collect | coinSound | 0.8 |
| Heart collect | heartSound | 1.0 |
| Diamond collect | diamondSound | 1.0 |
| Spike damage | hurtSound | 0.2 |
| Door activation | door | 0.5 |
| Checkpoint flag | flagSound | 0.5 |
| Exclaim block / key pickup | clickSound | 1.0 |
| Donut puzzle solved | hmmSound | 0.2 |
| Win screen | winSound | 0.15 |
| Lose screen | loseSound | 0.2 |

---

## 19. Tilemap Object Layers

The Tiled tilemap file `platformer-level-1.tmj` contains the following object layers with their object counts:

| Object Layer | Count | Purpose |
|-------------|-------|---------|
| Triggers | 8 | Door1, door2, donutTrigger, and other trigger zones |
| Key | 1 | Single key collectible |
| Crackers | 49 | Toggleable platform blocks |
| Blocks | 3 | Exclaim blocks (switches for crackers) |
| Candle | 7 | Decorative animated candles |
| Flags | 6 | Checkpoints and win flag |
| Hazards | 59 | Spike hazards |
| Diamonds | 3 | Diamond collectibles (plus 1 hidden donutDiamond) |
| Hearts | 3 | Heart collectibles |
| Coins | 34 | Coin collectibles |

### Key Object Positions

| Object | Position | Notes |
|--------|----------|-------|
| door1 trigger | (~1656, 540) | Key-locked door to bonus room |
| door2 trigger | (~2754, 540) | Return door from bonus room |
| Key | (2232, 522) | Required for door1 |
| donutTrigger | (~3438–3474, 576–594) | Donut puzzle target zone |
| donutDiamond | (3537, 504) | Hidden diamond revealed by donut puzzle |
| flag1 | (1044, 432) | Checkpoint |
| flag2 | (1602, 342) | Checkpoint |
| flag3 | (2358, 306) | Win flag |
| flag4 | (2898, 540) | Checkpoint |
| pole | (2358, 324–342) | Win trigger (alongside flag3) |
| Exclaim blocks | (2254, 504), (1602, 216), (2862, 486) | Cracker toggles |

---

## 20. Asset References

### Required Asset Files

| File | Type | Usage |
|------|------|-------|
| `platformer-level-1.tmj` | Tiled tilemap (JSON) | Level layout, all object positions |
| `tilemap_packed.png` | Tileset spritesheet | Tiles for kenny_tilemap_packed (16 columns) |
| `tilemap_packed2.png` | Tileset spritesheet | Tiles for kenny_tilemap_packed2 (20 columns) |
| `tilemap_packed3.png` | Tileset spritesheet | Tiles for kenny_tilemap_packed3 (10 columns) |
| `tilemap-characters-packed.png` | Character/atlas spritesheet | Player frames, coins, flags, candles, hearts, diamonds, key |
| `tilemap-characters-packed.json` | Atlas frame data | Frame names for character sprites |
| `kenny-particles.png` | Particle spritesheet | Particle effect images |
| `kenny-particles.json` | Multi-atlas data | Particle frame names |
| `sky.png` | Background image | Parallax sky layer |
| `mountains.png` | Background image | Parallax mountains layer |
| `clouds.png` | Background image | Parallax clouds layer |

### Audio Files

| Key | File | Format |
|-----|------|--------|
| coinSound | coin | .mp3/.ogg |
| heartSound | heart | .mp3/.ogg |
| diamondSound | diamond | .mp3/.ogg |
| hurtSound | hurt | .mp3/.ogg |
| door | door | .mp3/.ogg |
| flagSound | flag | .mp3/.ogg |
| clickSound | click | .mp3/.ogg |
| hmmSound | hmm | .mp3/.ogg |
| winSound | win | .mp3/.ogg |
| loseSound | lose | .mp3/.ogg |

### Asset Loading Keys

When loading assets, the following key names should be used:

- **Tilemap:** `"platformer-level-1"`
- **Tilesets:** `"kenny_tilemap_packed"`, `"kenny_tilemap_packed2"`, `"kenny_tilemap_packed3"`
- **Character atlas:** `"kenny_characters"`, with JSON `"tilemap-characters-packed"`
- **Particle atlas:** `"kenny-particles"` (multi-atlas loading)
- **Backgrounds:** `"sky"`, `"mountains"`, `"clouds"`
- **Individual PNGs (from pngs/ folder):** Used for animated objects — `coin1`, `coin2`, `flag1`, `flag2`, `redCandle1`, `redCandle2`, `blueCandle1`, `blueCandle2`, `heart`, `diamond`, `key`, `spike`

---

## 21. Candle Decorations

Candles are non-interactive decorative objects that play looping animations:

| Type | Animation | Frames | FPS |
|------|-----------|--------|-----|
| Red candle | redCandleAnim | redCandle1 ↔ redCandle2 | 4 |
| Blue candle | blueCandleAnim | blueCandle1 ↔ blueCandle2 | 4 |

- **Object layer:** "Candle" (7 objects)
- No collision, no interaction — purely visual
