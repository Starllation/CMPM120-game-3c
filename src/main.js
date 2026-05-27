// Sweet Escape — Phaser 3 game configuration
// This file creates the Phaser.Game instance with physics, scene list, and render settings.

const config = {
    type: Phaser.AUTO,
    width: 1000,
    height: 600,
    physics: {
        default: "arcade",
        arcade: {
            gravity: { x: 0, y: 1300 },
            debug: false
        }
    },
    scene: [Load, Platformer],
    pixelArt: true,
    roundPixels: true,
    backgroundColor: 0xFFE6DA
};

const game = new Phaser.Game(config);
