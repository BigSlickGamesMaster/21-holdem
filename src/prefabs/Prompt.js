import Phaser from 'phaser';
import assets from '../scripts/assets';
import config from '../scripts/config';

export default class Prompt extends Phaser.GameObjects.Container {
    constructor(scene, x, y, message = '') {
        super(scene, x, y);
        scene.add.existing(this);
        this.scene = scene;
        this.setScale(0);

        const prompt_bg = scene.add.image(0, 0, assets.prompt_bg);
        this.add(prompt_bg);

        this.txt_message = scene.add.text(0, 0, message, {
            fontSize: '38px', fontFamily: config.CommonFont, color: '#342e00', align: 'center'
        }).setOrigin(0.5);
        this.add(this.txt_message);

        this.show(message);
    }
    show(message) {
        this.txt_message.setText(message);
        this.setVisible(true);
        this.scene.tweens.add({
            targets: this,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Elastic.easeOut',
            easeParams: [1.1, 0.9],
        })
    }
    hide() {
        this.setVisible(false);
    }
    showForSeconds(message, time = 2000) {
        this.show(message);
        setTimeout(() => {
            this.hide();
        }, time);
    }
}