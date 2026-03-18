import Phaser from 'phaser';
import assets from '../scripts/assets';
import config from '../scripts/config';
import Button from './Button';

export default class Popup extends Phaser.GameObjects.Container {
    constructor(scene, x = 0, y = 0, configuration = { title: '', message: '' }, callback = null) {
        super(scene, x, y);
        scene.add.existing(this);
        this.scene = scene;
        this.setScale(0);
        this.setVisible(false);
        this.callback = callback;

        this.bg = scene.add.rectangle(0, 0, config.width * 1.5, config.height * 1.5, 0x000000, 0.5).setVisible(false);
        this.bg.setInteractive().on('pointerdown', () => { });
        this.add(this.bg);

        const popup = scene.add.image(0, 0, assets.popup_base);
        popup.setInteractive().on('pointerdown', () => { });
        popup.setInteractive().on('pointerup', () => { });
        this.add(popup);

        this.title = scene.add.text(0, -260, configuration.title, {
            align: 'center', fontFamily: config.CommonFont, fontSize: '64px', color: '#ffffff', fontStyle: 'bold', "stroke": "#000000a9", "strokeThickness": 2, "shadow.offsetY": 3, "shadow.color": "#000000a9", "shadow.blur": 3, "shadow.stroke": true,
        });
        this.title.setWordWrapWidth(popup.displayWidth - 100);
        this.title.setOrigin(0.5, 0.5);
        this.title.setTint(0x006D80, 0x006D80, 0x000000, 0x000000);
        this.add(this.title);

        const message_base = scene.add.image(0, -10, assets.message_base);
        this.add(message_base);

        this.message = scene.add.text(0, -10, configuration.message, {
            fontSize: '34px', fontFamily: config.playerFont, color: '#ffffff', align: 'center', fontStyle: 'bold',
        }).setLineSpacing(10);
        this.message.setOrigin(0.5, 0.5);
        this.message.setWordWrapWidth(popup.displayWidth - 100);
        this.add(this.message);

        this.container_confirm = scene.add.container(0, 0);
        this.add(this.container_confirm);
        this.container_prpmpt = scene.add.container(0, 0);
        this.add(this.container_prpmpt);


        const btn_yes = new Button(scene, -200, 200, { texture: assets.btn_yellow, scaleX: 0.8, scaleY: 0.8, text: 'Yes', fontFamily: config.ButtonFont, fontSize: '54px', color: '#ffffcf', stroke: '#ffffcf', shadow: false, strokeThickness: 2 }, () => {
            this.callback();
            this.close();
        });
        this.container_confirm.add(btn_yes);

        const btn_no = new Button(scene, 200, 200, { texture: assets.btn_green, scaleX: 0.8, scaleY: 0.8, text: 'No', fontFamily: config.ButtonFont, fontSize: '54px', color: '#ffffcf', stroke: '#ffffcf', shadow: false, strokeThickness: 2 }, () => {
            this.close();
        });
        this.container_confirm.add(btn_no);

        const btn_okay = new Button(scene, 0, 200, { texture: assets.btn_yellow, scaleX: 0.8, scaleY: 0.8, text: 'Okay', fontFamily: config.ButtonFont, fontSize: '54px', color: '#ffffcf', stroke: '#ffffcf', shadow: false, strokeThickness: 2 }, () => {
            this.callback();
            this.close();
        });
        this.container_prpmpt.add(btn_okay);
    }
    open({ confirm = true, title = '', message = '', callback }) {
        this.callback = callback;
        if (confirm) {
            this.container_confirm.setVisible(true);
            this.container_prpmpt.setVisible(false);
        } else {
            this.container_confirm.setVisible(false);
            this.container_prpmpt.setVisible(true);
        }
        this.title.setText(title);
        this.message.setText(message);

        this.setVisible(true);
        this.scene.tweens.add({
            targets: this,
            scaleX: 0.8,
            scaleY: 0.8,
            duration: 300,
            ease: 'Elastic.easeOut',
            easeParams: [1.1, 0.9],
            onComplete: () => {
                this.bg.setVisible(true);
            }
        })
    }
    close() {
        this.setVisible(false);
        this.setScale(0);
        this.bg.setVisible(false);
        this.scene.oHeader.btn_exit.btn_image.setInteractive();
        this.container_confirm.list.forEach(btn => btn.btn_image.setInteractive());
        this.container_prpmpt.list.forEach(btn => btn.btn_image.setInteractive());
    }
}
