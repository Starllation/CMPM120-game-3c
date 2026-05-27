// Platformer Scene — Main gameplay scene for Sweet Escape.
// Handles tilemap, player, collisions, collectibles, hazards, checkpoints,
// doors, crackers, donuts, HUD, camera, parallax, VFX, and end screens.
// This scene is loaded after the Load scene and receives the key "platformerScene".

class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    // ── Physics & gameplay constants ──────────────────────────────────────
    static ACCELERATION = 600;
    static DRAG = 1000;
    static JUMP_VELOCITY = -500;
    static MAX_SPEED = 200;
    static SPAWN_X = 17;
    static SPAWN_Y = 528;
    static STARTING_HEALTH = 3;
    static MAX_HEALTH = 6;
    static HURT_COOLDOWN = 1500; // ms between damage events

    // Mapping of semantic names → atlas frame keys in kenny_characters.
    // The atlas uses "tile_XXXX.png" naming; we assign them by size / purpose.
    static F = {
        PLAYER_IDLE:  "tile_0000.png",
        PLAYER_WALK2: "tile_0001.png",
        COIN1:        "tile_0011.png",
        COIN2:        "tile_0012.png",
        DIAMOND:      "tile_0013.png",
        HEART:        "tile_0014.png",
        FLAG1:        "tile_0015.png",
        FLAG2:        "tile_0016.png",
        KEY:          "tile_0017.png",
        RED_CANDLE1:  "tile_0018.png",
        RED_CANDLE2:  "tile_0019.png",
        BLUE_CANDLE1: "tile_0020.png",
        SPIKE:        "tile_0021.png",
        DONUT:        "tile_0022.png",
    };

    // ── Create ────────────────────────────────────────────────────────────
    // Orchestrates all setup by calling focused helper methods.
    create() {
        this.initState();
        this.createAnimations();
        this.createParallax();
        this.createTilemap();
        this.createPlayer();
        this.createCollectibles();
        this.createHazards();
        this.createCheckpoints();
        this.createCrackers();
        this.createDoors();
        this.createDonuts();
        this.createCandles();
        this.setupColliders();
        this.createVFX();
        this.createCamera();
        this.createHUD();
        this.createTextBoxes();
    }

    // ── Update ────────────────────────────────────────────────────────────
    // Runs every frame — delegates to focused helpers.
    update() {
        if (this.gameOver) return;
        this.handleInput();
        this.handleAnimations();
        this.handleMovingPlatform();
        this.handleDonutSpin();
        this.updateParallax();
        this.updateWalkVFX();
        this.checkDonutPuzzle();
    }

    // ====================================================================
    //  INITIALIZATION
    // ====================================================================

    // Reset all gameplay state for a fresh run.
    initState() {
        this.score = 0;
        this.health = Platformer.STARTING_HEALTH;
        this.hasKey = false;
        this.checkpointX = Platformer.SPAWN_X;
        this.checkpointY = Platformer.SPAWN_Y;
        this.crackerBlock = true; // crackers start solid
        this.gameOver = false;
        this.lastHurtTime = 0;
        this.diamondsCollected = 0;
        this.maxDiamonds = 4; // 3 regular + 1 hidden donutDiamond
        this.donutPuzzleSolved = false;
        this.bonusDonut = null;
        this.movingPlatformPrevX = 0;
        this.activatedCheckpoints = new Set(); // track which flags were activated
    }

    // ====================================================================
    //  ANIMATIONS
    // ====================================================================

    // Define all Phaser animations from the character atlas and individual PNGs.
    createAnimations() {
        const F = Platformer.F;
        const atlas = "kenny_characters";

        // Player walk — alternates between idle and walk frames
        this.anims.create({
            key: "walk",
            frames: [
                { key: atlas, frame: F.PLAYER_IDLE },
                { key: atlas, frame: F.PLAYER_WALK2 }
            ],
            frameRate: 15,
            repeat: -1
        });

        // Player idle — single frame
        this.anims.create({
            key: "idle",
            frames: [{ key: atlas, frame: F.PLAYER_IDLE }],
        });

        // Player jump — single frame (walk2 re-used as jump pose)
        this.anims.create({
            key: "jump",
            frames: [{ key: atlas, frame: F.PLAYER_WALK2 }],
        });

        // Coin spinning animation — alternates between two coin frames at 2 fps
        this.anims.create({
            key: "coinAnim",
            frames: [
                { key: atlas, frame: F.COIN1 },
                { key: atlas, frame: F.COIN2 }
            ],
            frameRate: 2,
            repeat: -1
        });

        // Checkpoint flag waving — alternates between two flag frames at 4 fps
        this.anims.create({
            key: "flagAnim",
            frames: [
                { key: atlas, frame: F.FLAG1 },
                { key: atlas, frame: F.FLAG2 }
            ],
            frameRate: 4,
            repeat: -1
        });

        // Red candle flickering — uses individual PNGs already loaded
        this.anims.create({
            key: "redCandleAnim",
            frames: [
                { key: "redCandle1" },
                { key: "redCandle2" }
            ],
            frameRate: 4,
            repeat: -1
        });

        // Blue candle flickering
        this.anims.create({
            key: "blueCandleAnim",
            frames: [
                { key: "blueCandle1" },
                { key: "blueCandle2" }
            ],
            frameRate: 4,
            repeat: -1
        });
    }

    // ====================================================================
    //  PARALLAX BACKGROUND
    // ====================================================================

    // Three background layers at different scroll factors + a sky placeholder.
    // sky.png is missing from assets, so we use a solid color rectangle.
    createParallax() {
        const W = this.scale.width;
        const H = this.scale.height;

        // Sky — fixed color rectangle (sky.png asset not available)
        this.add.rectangle(W / 2, H / 2, W, H, 0x87CEEB)
            .setScrollFactor(0)
            .setDepth(-10);

        // Mountains — parallax at 20% of camera speed
        this.mountainsTile = this.add.tileSprite(W / 2, H / 2, W, H, "mountains")
            .setScale(0.2)
            .setScrollFactor(0)
            .setDepth(-9);

        // Clouds — parallax at 50% of camera speed, slightly transparent
        this.cloudsTile = this.add.tileSprite(W / 2, H / 2, W, H, "clouds")
            .setScale(0.2)
            .setAlpha(0.8)
            .setScrollFactor(0)
            .setDepth(-8);

        // Background color rectangle that scrolls with the world
        this.add.rectangle(720, 450, 3618, 612, 0xFFE6DA)
            .setScrollFactor(1.0)
            .setDepth(-7);
    }

    // Update TileSprite tile positions to create parallax scrolling
    updateParallax() {
        const cam = this.cameras.main;
        this.mountainsTile.tilePositionX = cam.scrollX * 0.2;
        this.cloudsTile.tilePositionX = cam.scrollX * 0.5;
    }

    // ====================================================================
    //  TILEMAP
    // ====================================================================

    // Parse the Tiled tilemap, create tile layers, set collision, and
    // start the moving-platform tween.
    createTilemap() {
        const map = this.make.tilemap({ key: "platformer-level-1" });
        this.map = map;

        // Register the three tileset images with the tilemap
        const ts1 = map.addTilesetImage("kenny_tilemap_packed",  "kenny_tilemap_packed");
        const ts2 = map.addTilesetImage("kenny_tilemap_packed2", "kenny_tilemap_packed2");
        const ts3 = map.addTilesetImage("kenny_tilemap_packed3", "kenny_tilemap_packed3");
        const tilesets = [ts1, ts2, ts3];

        // Decorative background layers (no collision)
        map.createLayer("Back-Back-Background", tilesets, 0, 0).setDepth(0);
        map.createLayer("Back-Background",       tilesets, 0, 0).setDepth(0);
        map.createLayer("Background",            tilesets, 0, 0).setDepth(0);

        // Solid collision layer — all four sides block the player
        this.groundPlatforms2 = map.createLayer("Ground-n-Platforms2", tilesets, 0, 0).setDepth(1);
        this.groundPlatforms2.setCollisionByExclusion([-1]);

        // One-way platforms — only the top face is solid
        this.groundPlatforms = map.createLayer("Ground-n-Platforms", tilesets, 0, 0).setDepth(1);
        this.groundPlatforms.setCollision(false, false, true, false);

        // Moving platforms — full collision, tweened horizontally
        this.movingPlatforms = map.createLayer("Moving-Platforms", tilesets, 0, 0).setDepth(1);
        this.movingPlatforms.setCollisionByExclusion([-1]);

        // Foreground overlay — decorative, renders in front of everything
        this.foreground = map.createLayer("Foreground", tilesets, 0, 0).setDepth(10);

        // Record initial x for moving-platform delta tracking
        this.movingPlatformPrevX = this.movingPlatforms.x;

        // Tween the Moving-Platforms layer back and forth horizontally
        this.tweens.add({
            targets: this.movingPlatforms,
            x: "+=150",         // shift 150 px right from starting position
            duration: 1500,
            ease: "Sine.easeInOut",
            yoyo: true,
            repeat: -1
        });

        // Set world bounds so the player can't leave the map
        this.physics.world.bounds.setTo(0, 0, map.widthInPixels, map.heightInPixels);

        // Record the moving platform layer's initial x for delta tracking
        this.movingPlatformPrevX = this.movingPlatforms.x;
    }

    // ====================================================================
    //  PLAYER
    // ====================================================================

    // Create the player sprite, configure physics, and set up keyboard input.
    createPlayer() {
        const F = Platformer.FRAMES || Platformer.F;

        this.player = this.physics.add.sprite(
            this.checkpointX, this.checkpointY,
            "kenny_characters", F.PLAYER_IDLE
        );
        this.player.setDepth(5);

        // Acceleration-based movement (not velocity-based)
        this.player.setDragX(Platformer.DRAG);
        this.player.setMaxVelocity(Platformer.MAX_SPEED, 1000);
        this.player.setCollideWorldBounds(true);

        // Tighten the hitbox for more forgiving platforming
        this.player.setSize(12, 20);
        this.player.setOffset(6, 4);

        // Start with idle animation
        this.player.play("idle");

        // Track whether the player is currently on a moving platform
        this.onMovingPlatform = false;

        // Keyboard cursors (arrow keys) + WASD + Space
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyW = this.input.keyboard.addKey("W");
        this.keyA = this.input.keyboard.addKey("A");
        this.keyD = this.input.keyboard.addKey("D");
        this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    // Read keyboard input each frame and set player acceleration / jump.
    handleInput() {
        const player = this.player;
        const onGround = player.body.blocked.down || player.body.touching.down;

        // Horizontal movement — set acceleration left / right / zero
        const left  = this.cursors.left.isDown  || this.keyA.isDown;
        const right = this.cursors.right.isDown || this.keyD.isDown;

        if (left) {
            player.setAccelerationX(-Platformer.ACCELERATION);
            player.setFlip(true, false);
        } else if (right) {
            player.setAccelerationX(Platformer.ACCELERATION);
            player.setFlip(false, false);
        } else {
            // No input → zero acceleration, drag decelerates to stop
            player.setAccelerationX(0);
        }

        // Jump — only when grounded
        const jumpPressed = this.cursors.up.isDown || this.keyW.isDown || this.keySpace.isDown;
        if (jumpPressed && onGround) {
            player.setVelocityY(Platformer.JUMP_VELOCITY);
            this.emitJumpVFX();
        }
    }

    // Switch the player's animation based on movement state.
    handleAnimations() {
        const player = this.player;
        const onGround = player.body.blocked.down || player.body.touching.down;

        if (onGround) {
            if (Math.abs(player.body.velocity.x) > 10) {
                player.play("walk", true); // true = don't restart if already playing
            } else {
                player.play("idle", true);
            }
        } else {
            player.play("jump");
        }
    }

    // ====================================================================
    //  COLLECTIBLES
    // ====================================================================

    // Create coins, hearts, diamonds, and the key from tilemap object layers.
    createCollectibles() {
        const F = Platformer.F;
        const map = this.map;

        // ── Coins ──────────────────────────────────────────────────────
        this.coins = this.physics.add.group({ allowGravity: false });
        const coinsData = map.getObjectLayer("Coins").objects;
        coinsData.forEach(obj => {
            const coin = this.coins.create(obj.x, obj.y - 9, "kenny_characters", F.COIN1);
            coin.setImmovable(true);
            coin.play("coinAnim");
        });

        // ── Hearts ─────────────────────────────────────────────────────
        this.hearts = this.physics.add.group({ allowGravity: false });
        const heartsData = map.getObjectLayer("Hearts").objects;
        heartsData.forEach(obj => {
            const heart = this.hearts.create(obj.x, obj.y - 9, "kenny_characters", F.HEART);
            heart.setImmovable(true);
        });

        // ── Diamonds ──────────────────────────────────────────────────
        this.diamonds = this.physics.add.group({ allowGravity: false });
        const diamondsData = map.getObjectLayer("Diamonds").objects;
        diamondsData.forEach(obj => {
            const diamond = this.diamonds.create(obj.x, obj.y - 9, "kenny_characters", F.DIAMOND);
            diamond.setImmovable(true);
            // The special donutDiamond starts invisible and disabled
            if (obj.name === "donutDiamond") {
                diamond.setVisible(false);
                diamond.body.enable = false;
                this.donutDiamond = diamond;
            }
        });

        // ── Key ───────────────────────────────────────────────────────
        this.keySprite = this.physics.add.sprite(2232, 513, "kenny_characters", F.KEY);
        this.keySprite.setImmovable(true);
        this.keySprite.body.setAllowGravity(false);
    }

    // ====================================================================
    //  HAZARDS (SPIKES)
    // ====================================================================

    // Create spike sprites from the Hazards object layer.
    // Spikes use overlap (passthrough), NOT collider (solid).
    createHazards() {
        const F = Platformer.F;
        const hazardsData = this.map.getObjectLayer("Hazards").objects;

        this.spikes = this.physics.add.group({ allowGravity: false });
        hazardsData.forEach(obj => {
            const spike = this.spikes.create(obj.x, obj.y - 9, "kenny_characters", F.SPIKE);
            spike.setImmovable(true);
        });
    }

    // ====================================================================
    //  CHECKPOINTS & WIN CONDITION
    // ====================================================================

    // Create flag sprites from the Flags object layer.
    // flag1, flag2, flag4 are checkpoints. flag3 + pole objects = win condition.
    createCheckpoints() {
        const F = Platformer.F;
        const flagsData = this.map.getObjectLayer("Flags").objects;

        this.flags = this.physics.add.group({ allowGravity: false });
        this.winTriggers = this.physics.add.group({ allowGravity: false });

        flagsData.forEach(obj => {
            if (obj.name === "pole") {
                // Pole objects form the win zone alongside flag3
                const pole = this.winTriggers.create(obj.x, obj.y - 9, "kenny_characters", F.FLAG1);
                pole.setImmovable(true);
                pole.setVisible(false); // pole is invisible, just a trigger
            } else {
                // Visible flag with animation
                const flag = this.flags.create(obj.x, obj.y - 9, "kenny_characters", F.FLAG1);
                flag.setImmovable(true);
                flag.flagName = obj.name; // store the flag name for later reference
                flag.play("flagAnim");

                // flag3 is the win flag — also add it to win triggers
                if (obj.name === "flag3") {
                    const winFlag = this.winTriggers.create(obj.x, obj.y - 9, "kenny_characters", F.FLAG1);
                    winFlag.setImmovable(true);
                    winFlag.setVisible(false);
                }
            }
        });
    }

    // Called when the player overlaps a checkpoint flag.
    onCheckpoint(player, flag) {
        // flag3 is handled in onWin, not here
        if (flag.flagName === "flag3") return;

        // Save the player's current position as the respawn point
        this.checkpointX = player.x;
        this.checkpointY = player.y;

        // Play sound and VFX only on FIRST activation
        if (!this.activatedCheckpoints.has(flag.flagName)) {
            this.activatedCheckpoints.add(flag.flagName);
            this.sound.play("flagSound", { volume: 0.5 });
            this.emitFlagVFX(flag.x, flag.y);
        }
    }

    // ====================================================================
    //  CRACKER TOGGLE SYSTEM
    // ====================================================================

    // Create cracker blocks and exclaim switches from object layers.
    createCrackers() {
        const crackersData = this.map.getObjectLayer("Crackers").objects;
        const blocksData  = this.map.getObjectLayer("Blocks").objects;

        // Cracker blocks — use individual PNGs keyed by object name
        this.crackers = this.physics.add.group({ allowGravity: false });
        crackersData.forEach(obj => {
            const cracker = this.crackers.create(obj.x, obj.y - 9, obj.name);
            cracker.setImmovable(true);
            cracker.gid = obj.gid; // store GID for reference
        });

        // Exclaim blocks — switches that toggle crackers when hit from below
        this.exclaimBlocks = this.physics.add.group({ allowGravity: false });
        blocksData.forEach(obj => {
            const block = this.exclaimBlocks.create(obj.x, obj.y - 9, "exclaim");
            block.setImmovable(true);
            block.setOrigin(0.5, 0.5);
            block.originalY = block.y; // remember position for bounce tween
        });
    }

    // Called when the player overlaps an exclaim block.
    // Only triggers if the player is below the block and moving upward (jumping into it).
    onExclaimHit(player, block) {
        if (player.y > block.y && player.body.velocity.y < 0) {
            this.toggleCrackers();

            // Brief bounce animation on the exclaim block
            this.tweens.add({
                targets: block,
                y: block.originalY - 5,
                duration: 100,
                yoyo: true,
                ease: "Sine.easeInOut"
            });

            this.sound.play("clickSound", { volume: 1.0 });
        }
    }

    // Toggle all cracker blocks between solid and passthrough states.
    toggleCrackers() {
        this.crackerBlock = !this.crackerBlock;
        this.crackers.getChildren().forEach(cracker => {
            if (this.crackerBlock) {
                cracker.setAlpha(1.0);
                cracker.body.enable = true;
            } else {
                cracker.setAlpha(0.3);
                cracker.body.enable = false;
            }
        });
    }

    // ====================================================================
    //  DOORS
    // ====================================================================

    // Create door trigger zones from the Triggers object layer.
    createDoors() {
        const triggersData = this.map.getObjectLayer("Triggers").objects;

        // Create invisible trigger sprites for each door
        triggersData.forEach(obj => {
            if (obj.name === "door1") {
                this.door1Trigger = this.physics.add.sprite(obj.x, obj.y - 9, "kenny_characters", Platformer.F.PLAYER_IDLE);
                this.door1Trigger.setVisible(false);
                this.door1Trigger.body.setAllowGravity(false);
                this.door1Trigger.setImmovable(true);
                this.door1Trigger.body.setSize(18, 18);
            } else if (obj.name === "door2") {
                this.door2Trigger = this.physics.add.sprite(obj.x, obj.y - 9, "kenny_characters", Platformer.F.PLAYER_IDLE);
                this.door2Trigger.setVisible(false);
                this.door2Trigger.body.setAllowGravity(false);
                this.door2Trigger.setImmovable(true);
                this.door2Trigger.body.setSize(18, 18);
            }
            // donutTrigger objects are handled in createDonuts()
        });

        // Create donut trigger zones (invisible sensors)
        this.donutTriggers = this.physics.add.group({ allowGravity: false });
        triggersData.forEach(obj => {
            if (obj.name === "donutTrigger") {
                const trigger = this.donutTriggers.create(obj.x, obj.y - 9, "kenny_characters", Platformer.F.PLAYER_IDLE);
                trigger.setVisible(false);
                trigger.setImmovable(true);
                trigger.body.setSize(18, 18);
            }
        });
    }

    // Door1 — requires key, grounded + jump press to activate.
    // Teleports player to bonus room, spawns bonus donut.
    onDoor1Enter(player, door) {
        if (!this.hasKey) {
            this.needKeyBox.showBox();
            return;
        }

        // Check grounded + jump press
        const onGround = player.body.blocked.down || player.body.touching.down;
        const jumpPressed = this.cursors.up.isDown || this.keyW.isDown || this.keySpace.isDown;
        if (!onGround || !jumpPressed) return;

        // Activate door1
        player.x = 2763;
        player.y = 530;
        this.crackerBlock = true;
        this.applyCrackerState();
        this.spawnBonusDonut();
        this.donutBox.hideBox();
        this.sound.play("doorSound", { volume: 0.5 });

        // Remove key from HUD
        this.hasKey = false;
        this.keyIndicator.setVisible(false);
    }

    // Door2 — return door from bonus room. No key required.
    onDoor2Enter(player, door) {
        const onGround = player.body.blocked.down || player.body.touching.down;
        const jumpPressed = this.cursors.up.isDown || this.keyW.isDown || this.keySpace.isDown;
        if (!onGround || !jumpPressed) return;

        // Teleport back
        player.x = 1665;
        player.y = 530;
        this.crackerBlock = true;
        this.applyCrackerState();
        this.sound.play("doorSound", { volume: 0.5 });
    }

    // Force all cracker blocks to match the current crackerBlock state
    // (without toggling — used by door activation).
    applyCrackerState() {
        this.crackers.getChildren().forEach(cracker => {
            if (this.crackerBlock) {
                cracker.setAlpha(1.0);
                cracker.body.enable = true;
            } else {
                cracker.setAlpha(0.3);
                cracker.body.enable = false;
            }
        });
    }

    // ====================================================================
    //  DONUTS
    // ====================================================================

    // Create regular donuts at hardcoded positions (from DESIGN.md Section 8)
    // and set up the donut puzzle logic.
    createDonuts() {
        this.donuts = this.physics.add.group();

        // Four regular donuts placed at specified positions
        const donutPositions = [
            { x: 88,  y: 402 },
            { x: 900, y: 528 },
            { x: 1563, y: 330 },
            { x: 1106, y: 420 }
        ];

        donutPositions.forEach(pos => {
            const donut = this.donuts.create(pos.x, pos.y, "kenny_characters", Platformer.F.DONUT);
            donut.setCircle(9);
            donut.setBounce(0.7, 0.7);
            donut.body.setDragX(300);
            donut.body.setMaxVelocity(500, 350);
            donut.setDepth(5);
        });
    }

    // Spawn the special bonus donut when door1 is used.
    spawnBonusDonut() {
        // Destroy previous bonus donut if it exists
        if (this.bonusDonut) {
            this.bonusDonut.destroy();
            this.bonusDonut = null;
        }

        this.bonusDonut = this.donuts.create(3015, 350, "kenny_characters", Platformer.F.DONUT);
        this.bonusDonut.setCircle(9);
        this.bonusDonut.setBounce(0.7, 0.7);
        this.bonusDonut.body.setDragX(300);
        this.bonusDonut.body.setMaxVelocity(500, 350);
        this.bonusDonut.setDepth(5);
        this.bonusDonut.isBonusDonut = true;
    }

    // Spin donuts based on their horizontal velocity (angular vel = vel.x * 5).
    handleDonutSpin() {
        this.donuts.getChildren().forEach(donut => {
            donut.setAngularVelocity(donut.body.velocity.x * 5);
        });
    }

    // Check if the bonus donut hit spikes or reached the donut trigger zone.
    // Uses Phaser's overlap with callbacks instead of checking return values.
    checkDonutPuzzle() {
        if (!this.bonusDonut || !this.bonusDonut.active) return;

        // Check if bonus donut overlaps any spike
        this.physics.overlap(this.bonusDonut, this.spikes, (donut) => {
            donut.destroy();
            this.bonusDonut = null;
            this.donutBox.showBox();
        });

        // Check if bonus donut overlaps any donutTrigger
        if (!this.donutPuzzleSolved) {
            this.physics.overlap(this.bonusDonut, this.donutTriggers, () => {
                if (!this.donutPuzzleSolved) {
                    this.donutPuzzleSolved = true;
                    // Reveal the hidden donutDiamond
                    if (this.donutDiamond) {
                        this.donutDiamond.setVisible(true);
                        this.donutDiamond.body.enable = true;
                    }
                    this.sound.play("hmmSound", { volume: 0.2 });
                }
            });
        }
    }

    // ====================================================================
    //  CANDLES (DECORATIVE)
    // ====================================================================

    // Create animated candle sprites from the Candle object layer.
    // Candles are purely visual — no collision, no interaction.
    createCandles() {
        const candleData = this.map.getObjectLayer("Candle").objects;
        candleData.forEach(obj => {
            const isRed = obj.gid === 82;
            const candle = this.add.sprite(obj.x, obj.y - 9, isRed ? "redCandle1" : "blueCandle1");
            candle.play(isRed ? "redCandleAnim" : "blueCandleAnim");
            candle.setDepth(2);
        });
    }

    // ====================================================================
    //  COLLIDER SETUP
    // ====================================================================

    // Wire up all physics colliders and overlaps AFTER all groups are created.
    setupColliders() {
        // Player vs. terrain layers
        this.physics.add.collider(this.player, this.groundPlatforms2);
        this.physics.add.collider(this.player, this.groundPlatforms);

        // Moving platform collider — callback tracks whether player is riding it
        this.physics.add.collider(this.player, this.movingPlatforms, () => {
            // Player landed on the moving platform this frame
            this.onMovingPlatform = true;
        });

        // Donuts vs. terrain
        this.physics.add.collider(this.donuts, this.groundPlatforms2);
        this.physics.add.collider(this.donuts, this.groundPlatforms);
        this.physics.add.collider(this.donuts, this.movingPlatforms);

        // Player pushes donuts
        this.physics.add.collider(this.player, this.donuts);

        // Player vs. crackers (only active when crackerBlock is true)
        this.physics.add.collider(this.player, this.crackers);

        // Spikes — overlap (passthrough), NOT solid collider
        this.physics.add.overlap(this.player, this.spikes, this.onSpikeHit, null, this);

        // Collectibles — overlap
        this.physics.add.overlap(this.player, this.coins,    this.onCoinCollect,    null, this);
        this.physics.add.overlap(this.player, this.hearts,   this.onHeartCollect,   null, this);
        this.physics.add.overlap(this.player, this.diamonds, this.onDiamondCollect, null, this);
        this.physics.add.overlap(this.player, this.keySprite, this.onKeyCollect,    null, this);

        // Checkpoint flags — overlap
        this.physics.add.overlap(this.player, this.flags, this.onCheckpoint, null, this);

        // Win triggers — overlap with flag3 + pole objects
        this.physics.add.overlap(this.player, this.winTriggers, this.onWin, null, this);

        // Exclaim blocks — overlap (check below-hit in callback)
        this.physics.add.overlap(this.player, this.exclaimBlocks, this.onExclaimHit, null, this);

        // Doors — overlap
        if (this.door1Trigger) {
            this.physics.add.overlap(this.player, this.door1Trigger, this.onDoor1Enter, null, this);
        }
        if (this.door2Trigger) {
            this.physics.add.overlap(this.player, this.door2Trigger, this.onDoor2Enter, null, this);
        }
    }

    // ====================================================================
    //  MOVING PLATFORM RIDING
    // ====================================================================

    // Each frame, calculate the Moving-Platforms layer's delta-x.
    // If the player is standing on a moving platform, translate them with it.
    handleMovingPlatform() {
        const layer = this.movingPlatforms;
        const currentX = layer.x;
        const deltaX = currentX - this.movingPlatformPrevX;
        this.movingPlatformPrevX = currentX;

        // If the player was on the moving platform last frame, translate them.
        // The collider callback sets onMovingPlatform during the physics step
        // (which runs before update). We save it for next-frame application.
        if (deltaX !== 0 && this.onMovingPlatform) {
            this.player.x += deltaX;
        }
    }

    // ====================================================================
    //  VFX (PARTICLE EFFECTS)
    // ====================================================================

    // Create particle emitter managers (one-shot emitters are triggered on events).
    createVFX() {
        // Walking particle emitter — continuous while grounded and moving
        this.walkEmitter = this.add.particles(0, 0, "kenny-particles", {
            frame: ["dirt_01.png", "dirt_02.png"],
            scale: { start: 0.03, end: 0.06 },
            lifespan: 300,
            gravityY: -80,
            emitting: false, // triggered manually each frame
            depth: 4
        });

        // Jump particle emitter — one-shot explode on jump
        this.jumpEmitter = this.add.particles(0, 0, "kenny-particles", {
            frame: ["dirt_01.png", "dirt_02.png"],
            scale: { start: 0.02, end: 0.1 },
            lifespan: 200,
            gravityY: 900,
            angle: { min: 80, max: 100 },
            blendMode: "ADD",
            emitting: false,
            depth: 4
        });

        // Collect particle emitter — one-shot on coin/heart/diamond pickup
        this.collectEmitter = this.add.particles(0, 0, "kenny-particles", {
            frame: "star_07.png",
            speed: { min: 80, max: 100 },
            lifespan: 300,
            scale: { start: 0.05, end: 0 },
            blendMode: "ADD",
            emitting: false,
            quantity: 3,
            depth: 4
        });

        // Flag particle emitter — one-shot on checkpoint activation
        this.flagEmitter = this.add.particles(0, 0, "kenny-particles", {
            frame: "star_07.png",
            speed: { min: 200, max: 300 },
            lifespan: 1000,
            scale: { start: 0.05, end: 0 },
            gravityY: 800,
            angle: { min: -105, max: -75 },
            blendMode: "ADD",
            emitting: false,
            quantity: 15,
            depth: 4
        });
    }

    // Emit walking particles at the player's feet while grounded and moving
    updateWalkVFX() {
        const player = this.player;
        const onGround = player.body.blocked.down || player.body.touching.down;
        const moving = Math.abs(player.body.velocity.x) > 10;

        if (onGround && moving) {
            this.walkEmitter.setPosition(player.x, player.y + player.displayHeight / 2);
            this.walkEmitter.emitParticle(1);
        }
    }

    // One-shot burst of particles on jump
    emitJumpVFX() {
        this.jumpEmitter.setPosition(this.player.x, this.player.y + this.player.displayHeight / 2);
        this.jumpEmitter.explode(5);
    }

    // One-shot burst on coin/heart/diamond collect
    emitCollectVFX(x, y) {
        this.collectEmitter.setPosition(x, y);
        this.collectEmitter.explode(3);
    }

    // One-shot burst on checkpoint flag activation
    emitFlagVFX(x, y) {
        this.flagEmitter.setPosition(x, y);
        this.flagEmitter.explode(15);
    }

    // ====================================================================
    //  CAMERA
    // ====================================================================

    // Set camera bounds, deadzone, zoom, follow offset, and lerp.
    createCamera() {
        const cam = this.cameras.main;
        cam.setBounds(0, 0, this.map.widthInPixels + 100, this.map.heightInPixels);
        cam.setZoom(2.0);
        cam.setDeadzone(50, 50);
        cam.setLerp(0.25, 0.25);
        cam.startFollow(this.player, false, 0.25, 0.25, -90, 10);
    }

    // ====================================================================
    //  HUD (HEADS-UP DISPLAY)
    // ====================================================================

    // Create score text, heart indicators, and key indicator.
    // All HUD elements use scrollFactor(0) to stay fixed on screen.
    createHUD() {
        // Score display
        this.scoreText = this.add.text(252, 150, "Score: 0", {
            fontSize: "18px",
            fill: "#444A5F",
            fontFamily: "Arial"
        }).setScrollFactor(0).setDepth(100);

        // Heart indicators — right-most first, spacing -15px
        this.hudHearts = [];
        for (let i = 0; i < Platformer.MAX_HEALTH; i++) {
            const heart = this.add.image(642 - i * 15, 158, "kenny_characters", Platformer.F.HEART)
                .setScrollFactor(0)
                .setDepth(100);
            this.hudHearts.push(heart);
        }
        this.updateHUDHearts();

        // Key indicator — hidden until the key is collected
        this.keyIndicator = this.add.image(639, 170, "kenny_characters", Platformer.F.KEY)
            .setScrollFactor(0)
            .setDepth(100)
            .setVisible(false);
    }

    // Show/hide heart sprites based on current health
    updateHUDHearts() {
        this.hudHearts.forEach((heart, index) => {
            heart.setVisible(index < this.health);
        });
    }

    // ====================================================================
    //  TEXT BOXES
    // ====================================================================

    // Create in-game text boxes for the "need key" hint and donut puzzle hint.
    createTextBoxes() {
        // "You need a key!" — small box near door1
        this.needKeyBox = new TextBox(this, 1665, 450, 1, "You need a key!");
        this.needKeyBox.setDepth(15);

        // Donut puzzle hint — big box in bonus room, starts hidden
        this.donutBox = new TextBox(this, 2871, 420, 2, [
            "Don't give up!",
            "Use door to",
            "reset donut!"
        ]);
        this.donutBox.setDepth(15);
        this.donutBox.hideBox();
    }

    // ====================================================================
    //  EVENT HANDLERS (COLLECTIBLES)
    // ====================================================================

    onCoinCollect(player, coin) {
        this.score += 1;
        this.sound.play("coinSound", { volume: 0.8 });
        this.emitCollectVFX(coin.x, coin.y);
        coin.destroy();
        this.updateScoreText();
    }

    onHeartCollect(player, heart) {
        if (this.health < Platformer.MAX_HEALTH) {
            this.health += 1;
        }
        this.sound.play("heartSound", { volume: 1.0 });
        this.emitCollectVFX(heart.x, heart.y);
        heart.destroy();
        this.updateHUDHearts();
    }

    onDiamondCollect(player, diamond) {
        this.score += 100;
        this.diamondsCollected += 1;
        this.sound.play("diamondSound", { volume: 1.0 });
        this.emitCollectVFX(diamond.x, diamond.y);
        diamond.destroy();
        this.updateScoreText();

        // If this was the donutDiamond, clear the reference
        if (diamond === this.donutDiamond) {
            this.donutDiamond = null;
        }
    }

    onKeyCollect(player, key) {
        this.hasKey = true;
        this.sound.play("clickSound", { volume: 1.0 });
        this.keyIndicator.setVisible(true);
        this.needKeyBox.hideBox();
        key.destroy();
    }

    // ====================================================================
    //  EVENT HANDLERS (HAZARDS)
    // ====================================================================

    // Spike hit — damage the player if the hurt cooldown has elapsed.
    onSpikeHit(player, spike) {
        const now = this.time.now;
        if (now - this.lastHurtTime < Platformer.HURT_COOLDOWN) return;

        this.lastHurtTime = now;
        this.health -= 1;
        this.sound.play("hurtSound", { volume: 0.2 });
        this.updateHUDHearts();

        if (this.health <= 0) {
            this.onLose();
            return;
        }

        // Teleport to last checkpoint
        player.x = this.checkpointX;
        player.y = this.checkpointY;
        player.setVelocity(0, 0);

        // Flash the player sprite to indicate damage
        player.setTint(0xff0000);
        this.time.delayedCall(500, () => {
            player.clearTint();
        });
    }

    // ====================================================================
    //  END SCREENS
    // ====================================================================

    // Win — triggered by overlapping flag3 or pole objects.
    onWin() {
        if (this.gameOver) return;
        this.gameOver = true;

        this.physics.pause();
        this.player.play("idle");

        // Pink overlay
        const W = this.scale.width;
        const H = this.scale.height;
        this.add.rectangle(W / 2, H / 2, W, H, 0xFFC4CA, 0.85)
            .setScrollFactor(0).setDepth(200);

        // Win score box
        const totalScore = this.score + this.health * 100;
        const winBox = new TextBox(this, W / 2, H / 2, 3);
        winBox.setScrollFactor(0).setDepth(201);
        winBox.updateScoreText(this.diamondsCollected, this.maxDiamonds, this.health, totalScore);

        this.sound.play("winSound", { volume: 0.15 });

        // Wait for SPACE to restart
        this.input.keyboard.once("keydown-SPACE", () => {
            this.scene.restart();
        });
    }

    // Lose — triggered when health reaches 0.
    onLose() {
        if (this.gameOver) return;
        this.gameOver = true;

        this.physics.pause();
        this.player.play("idle");

        // Dark overlay
        const W = this.scale.width;
        const H = this.scale.height;
        this.add.rectangle(W / 2, H / 2, W, H, 0x9B5850, 0.85)
            .setScrollFactor(0).setDepth(200);

        // Lose score box
        const totalScore = this.score + this.health * 100;
        const loseBox = new TextBox(this, W / 2, H / 2, 4);
        loseBox.setScrollFactor(0).setDepth(201);
        loseBox.updateScoreText(this.diamondsCollected, this.maxDiamonds, this.health, totalScore);

        this.sound.play("loseSound", { volume: 0.2 });

        // Wait for SPACE to restart
        this.input.keyboard.once("keydown-SPACE", () => {
            this.scene.restart();
        });
    }

    // ====================================================================
    //  SCORE TEXT UPDATE
    // ====================================================================

    updateScoreText() {
        this.scoreText.setText("Score: " + this.score);
    }
}
