import Phaser from 'phaser';
import config from '../scripts/config';
import _ from '../scripts/helper';

export default class PotDisplay extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        this.scene = scene;
        this.nWidth = 220;
        this.nHeight = 88;

        this.background = scene.add.graphics();
        this.add(this.background);

        this.labelText = scene.add.text(0, -16, 'POT', {
            fontFamily: config.CommonFont,
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#bfe8ff',
            letterSpacing: 2,
        }).setOrigin(0.5);
        this.add(this.labelText);

        this.valueText = scene.add.text(0, 16, '$0', {
            fontFamily: config.CommonFont,
            fontSize: '34px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#06253b',
            strokeThickness: 5,
        }).setOrigin(0.5);
        this.add(this.valueText);

        scene.add.existing(this);
        this.redraw();
    }

    formatAmount(amount = 0) {
        const nAmount = Math.max(0, Math.round(Number(amount) || 0));
        return `$${_.formatCurrencyWithComa(nAmount)}`;
    }

    redraw() {
        const paddingX = 28;
        const paddingY = 18;
        const minWidth = 184;
        const minHeight = 78;
        this.nWidth = Math.max(minWidth, this.valueText.displayWidth + (paddingX * 2));
        this.nHeight = Math.max(minHeight, this.labelText.displayHeight + this.valueText.displayHeight + (paddingY * 2));

        this.background.clear();
        this.background.fillStyle(0x071a2c, 0.88);
        this.background.fillRoundedRect(-this.nWidth / 2, -this.nHeight / 2, this.nWidth, this.nHeight, 18);
        this.background.fillStyle(0x1b5e8d, 0.28);
        this.background.fillRoundedRect(-this.nWidth / 2 + 4, -this.nHeight / 2 + 4, this.nWidth - 8, Math.round(this.nHeight * 0.44), 14);
        this.background.lineStyle(2, 0xbde8ff, 0.92);
        this.background.strokeRoundedRect(-this.nWidth / 2, -this.nHeight / 2, this.nWidth, this.nHeight, 18);
        this.background.lineStyle(1, 0x65d8ff, 0.35);
        this.background.strokeRoundedRect(-this.nWidth / 2 + 6, -this.nHeight / 2 + 6, this.nWidth - 12, this.nHeight - 12, 14);
    }

    setAmount(amount = 0) {
        this.valueText.setText(this.formatAmount(amount));
        this.redraw();
        return this;
    }

    moveTo(x, y, { animate = true, duration = 320 } = {}) {
        if (!animate) {
            this.setPosition(x, y);
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            this.scene.tweens.killTweensOf(this);
            this.scene.tweens.add({
                targets: this,
                x,
                y,
                duration,
                ease: 'Cubic.easeOut',
                onComplete: () => resolve(),
            });
        });
    }

    getAnchorBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.nWidth,
            height: this.nHeight,
        };
    }
}