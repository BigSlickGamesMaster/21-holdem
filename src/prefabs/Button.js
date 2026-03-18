import Phaser from 'phaser';
import assets from '../scripts/assets';
import config from '../scripts/config';

export default class Button extends Phaser.GameObjects.Container {
    constructor(scene, x, y,
        {
            texture = assets.btn_orange,
            scaleX = 1,
            scaleY = 1,
            text = '',
            textX = 0,
            textY = 0,
            fontFamily = config.CommonFont,
            fontSize = '34px',
            color = '#ffffff',
            align = 'center',
            stroke = '#000000',
            strokeThickness = 2,
            shadow = {
                offsetY: 2,
                color: '#000000',
                blur: 2,
                stroke: true,
            },
            iconTexture = '',
            iconX = 0,
            iconY = 0,
            sound = scene.oSoundManager.click_sound,
        } = {}, onPointerDown) {
        super(scene, x, y);
        scene.add.existing(this);
        this.scene = scene;

        this.btn_image = scene.add.image(0, 0, texture).setScale(scaleX, scaleY);
        this.add(this.btn_image);
        this.btn_image.setInteractive(scene.input.makePixelPerfect())
        this.btn_image.on('pointerover', () => {
            scene.input.setDefaultCursor('pointer');
        })
        this.btn_image.on('pointerout', () => {
            scene.input.setDefaultCursor('default');
        })
        this.btn_image.on('pointerdown', () => {
            scene.input.setDefaultCursor('default');
            this.btn_image.disableInteractive();
            // scene.oSoundManager.playSound(scene.oSoundManager.btn_sound, false);
            scene.add.tween({
                targets: this,
                scale: 0.9,
                duration: 100,
                ease: 'Linear',
                yoyo: true,
                onComplete: () => {
                    onPointerDown();
                    scene.oSoundManager.playSound(sound, false);
                    // scene.oSoundManager.playSound(scene.oSoundManager.click_sound, false);
                }
            });
        });

        this.btn_text = scene.add.text(
            textX,
            textY,
            text,
            {
                fontFamily: fontFamily,
                fontSize: fontSize,
                align: align,
                color: color,
                stroke: stroke,
                strokeThickness: strokeThickness,
                shadow: shadow,
            }
        ).setOrigin(0.5);
        this.add(this.btn_text);

        if (iconTexture) {
            const icon = scene.add.image(iconX, iconY, iconTexture);
            icon.setX(this.btn_text.x - this.btn_text.displayWidth / 2);
            this.btn_text.setX(icon.x + icon.displayWidth / 2 + this.btn_text.displayWidth / 2 + 10);
            this.add(icon);
        }
    }
}
