// TextBox — A custom container sprite for displaying text in decorative box frames.
// Different "key" values produce different box sizes and text layouts.
// key=1: Small box (single line), key=2: Big box (three lines),
// key=3: Win score box, key=4: Lose score box.

class TextBox extends Phaser.GameObjects.Container {
    /**
     * @param {Phaser.Scene} scene - The scene this text box belongs to
     * @param {number} x - World x position
     * @param {number} y - World y position
     * @param {number} key - Box type: 1=small, 2=big, 3=win, 4=lose
     * @param {string|string[]} text - Text content (string for small, array of 3 for big)
     */
    constructor(scene, x, y, key, text) {
        super(scene, x, y);

        this.boxKey = key;

        if (key === 1) {
            this.createSmallBox(scene, text);
        } else if (key === 2) {
            this.createBigBox(scene, text);
        } else if (key === 3) {
            this.createWinBox(scene);
        } else if (key === 4) {
            this.createLoseBox(scene);
        }

        scene.add.existing(this);
    }

    // Small box: single line of text inside box_small.png
    createSmallBox(scene, text) {
        const boxImage = scene.add.image(0, 0, "box_small")
            .setScale(0.4)
            .setOrigin(0.5);
        this.add(boxImage);

        const textObj = scene.add.text(0, 0, text, {
            fontSize: "15px",
            fill: "#534200",
            fontFamily: "Arial"
        }).setOrigin(0.5);
        this.add(textObj);
    }

    // Big box: three lines of text inside box_big.png
    createBigBox(scene, textLines) {
        const boxImage = scene.add.image(0, 0, "box_big")
            .setScale(0.3)
            .setOrigin(0.5);
        this.add(boxImage);

        // Stack three lines vertically with 15px spacing
        for (let i = 0; i < textLines.length; i++) {
            const line = scene.add.text(0, -15 + i * 15, textLines[i], {
                fontSize: "12px",
                fill: "#534200",
                fontFamily: "Arial"
            }).setOrigin(0.5);
            this.add(line);
        }
    }

    // Win score box: shows diamond count, heart bonus, and total score
    createWinBox(scene) {
        const boxImage = scene.add.image(0, 0, "box_big")
            .setScale(1.5)
            .setOrigin(0.5);
        this.add(boxImage);

        const title = scene.add.text(0, -60, "Great Job!", {
            fontSize: "36px",
            fill: "#534200",
            fontFamily: "Arial",
            fontStyle: "bold"
        }).setOrigin(0.5);
        this.add(title);

        this.winDiamonds = scene.add.text(0, -15, "", {
            fontSize: "18px",
            fill: "#534200",
            fontFamily: "Arial"
        }).setOrigin(0.5);
        this.add(this.winDiamonds);

        this.winHearts = scene.add.text(0, 15, "", {
            fontSize: "18px",
            fill: "#534200",
            fontFamily: "Arial"
        }).setOrigin(0.5);
        this.add(this.winHearts);

        this.winTotal = scene.add.text(0, 45, "", {
            fontSize: "22px",
            fill: "#534200",
            fontFamily: "Arial",
            fontStyle: "bold"
        }).setOrigin(0.5);
        this.add(this.winTotal);

        const prompt = scene.add.text(0, 80, "Press SPACE to play again", {
            fontSize: "14px",
            fill: "#534200",
            fontFamily: "Arial"
        }).setOrigin(0.5);
        this.add(prompt);
    }

    // Lose score box: shows same score breakdown with different title
    createLoseBox(scene) {
        const boxImage = scene.add.image(0, 0, "box_big")
            .setScale(1.5)
            .setOrigin(0.5);
        this.add(boxImage);

        const title = scene.add.text(0, -60, "You can do it!", {
            fontSize: "36px",
            fill: "#FFFFFF",
            fontFamily: "Arial",
            fontStyle: "bold"
        }).setOrigin(0.5);
        this.add(title);

        this.loseDiamonds = scene.add.text(0, -15, "", {
            fontSize: "18px",
            fill: "#FFFFFF",
            fontFamily: "Arial"
        }).setOrigin(0.5);
        this.add(this.loseDiamonds);

        this.loseHearts = scene.add.text(0, 15, "", {
            fontSize: "18px",
            fill: "#FFFFFF",
            fontFamily: "Arial"
        }).setOrigin(0.5);
        this.add(this.loseHearts);

        this.loseTotal = scene.add.text(0, 45, "", {
            fontSize: "22px",
            fill: "#FFFFFF",
            fontFamily: "Arial",
            fontStyle: "bold"
        }).setOrigin(0.5);
        this.add(this.loseTotal);

        const prompt = scene.add.text(0, 80, "Press SPACE to try again", {
            fontSize: "14px",
            fill: "#FFFFFF",
            fontFamily: "Arial"
        }).setOrigin(0.5);
        this.add(prompt);
    }

    // Update the score text on win/lose boxes
    updateScoreText(diamonds, maxDiamonds, health, totalScore) {
        const diamondStr = `Diamonds: ${diamonds} / ${maxDiamonds}`;
        const heartStr = `Heart bonus: ${health} x 100 = ${health * 100}`;
        const totalStr = `Total: ${totalScore}`;

        if (this.boxKey === 3) {
            this.winDiamonds.setText(diamondStr);
            this.winHearts.setText(heartStr);
            this.winTotal.setText(totalStr);
        } else if (this.boxKey === 4) {
            this.loseDiamonds.setText(diamondStr);
            this.loseHearts.setText(heartStr);
            this.loseTotal.setText(totalStr);
        }
    }

    // Hide the text box (make invisible but keep in scene)
    hideBox() {
        this.setVisible(false);
        this.setActive(false);
    }

    // Show the text box
    showBox() {
        this.setVisible(true);
        this.setActive(true);
    }

    // Remove the text box from the scene entirely
    destroyBox() {
        this.destroy();
    }
}
