// Load Scene — Preloads all game assets (tilemaps, sprites, audio, particles)
// and displays a progress bar before transitioning to the Platformer scene.

class Load extends Phaser.Scene {
    constructor() {
        super("loadScene");
    }

    preload() {
        this.createProgressBar();
        this.loadTilemapAssets();
        this.loadCharacterAtlas();
        this.loadParticleAtlas();
        this.loadIndividualPNGs();
        this.loadBackgrounds();
        this.loadAudio();
    }

    create() {
        // All assets loaded — switch to the main game scene
        this.scene.start("platformerScene");
    }

    // Draw a simple loading bar in the center of the screen
    createProgressBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const barWidth = 400;
        const barHeight = 32;

        // Background bar outline
        const bgBar = this.add.rectangle(
            width / 2, height / 2, barWidth, barHeight, 0x444444
        );

        // Filled portion that grows with progress
        const progressBar = this.add.rectangle(
            width / 2 - barWidth / 2 + 2, height / 2, 0, barHeight - 4, 0xFFFFFF
        ).setOrigin(0, 0.5);

        // Loading text
        const loadingText = this.add.text(width / 2, height / 2 - 40, "Loading...", {
            fontSize: "20px",
            fill: "#FFFFFF",
            fontFamily: "Arial"
        }).setOrigin(0.5);

        // Update the bar width as files load
        this.load.on("progress", (value) => {
            progressBar.width = (barWidth - 4) * value;
        });
    }

    // Load the Tiled tilemap and its three tileset images
    loadTilemapAssets() {
        this.load.tilemapTiledJSON("platformer-level-1", "assets/platformer-level-1.tmj");
        this.load.image("kenny_tilemap_packed", "assets/tilemap_packed.png");
        this.load.image("kenny_tilemap_packed2", "assets/tilemap_packed2.png");
        this.load.image("kenny_tilemap_packed3", "assets/tilemap_packed3.png");
    }

    // Load the character/atlas spritesheet (player, coins, flags, etc.)
    loadCharacterAtlas() {
        this.load.atlas(
            "kenny_characters",
            "assets/tilemap-characters-packed.png",
            "assets/tilemap-characters-packed.json"
        );
    }

    // Load the multi-atlas particle spritesheet (dirt, star particles, etc.)
    loadParticleAtlas() {
        this.load.multiatlas(
            "kenny-particles",
            "assets/particles/kenny-particles.json",
            "assets/particles/"
        );
    }

    // Load individual PNGs for objects that have them (candles, key, crackers, etc.)
    loadIndividualPNGs() {
        const pngs = [
            "blueCandle1", "blueCandle2",
            "redCandle1", "redCandle2",
            "box_big", "box_small",
            "cracker1", "cracker2", "cracker3",
            "exclaim", "key",
            "plat1", "plat2", "plat3"
        ];
        for (const name of pngs) {
            this.load.image(name, `assets/pngs/${name}.png`);
        }
    }

    // Load parallax background images (sky is missing — handled in Platformer scene)
    loadBackgrounds() {
        this.load.image("mountains", "assets/pngs/mountains.png");
        this.load.image("clouds", "assets/pngs/clouds.png");
    }

    // Load all sound effects (mixed .mp3 and .ogg formats)
    loadAudio() {
        // .mp3 sounds
        const mp3Sounds = ["coin", "diamond", "flag", "heart", "hurt"];
        for (const name of mp3Sounds) {
            this.load.audio(`${name}Sound`, `assets/sound/${name}.mp3`);
        }

        // .ogg sounds
        const oggSounds = ["click", "door", "hmm", "lose", "win"];
        for (const name of oggSounds) {
            this.load.audio(`${name}Sound`, `assets/sound/${name}.ogg`);
        }
    }
}
