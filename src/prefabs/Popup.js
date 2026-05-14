import Phaser from 'phaser';
import config from '../scripts/config';
import Button from './Button';
import assets from '../scripts/assets';

const POPUP_W = 680;
const POPUP_H = 440;
const TITLE_BG_H = 72;
const CORNER_R = 22;
const BORDER_COLOR = 0x3a9abf;
const BG_TOP = 0x04192e;
const BG_BOT = 0x020d1a;
const TITLE_BG = 0x052035;
const OVERLAY_ALPHA = 0.72;

export default class Popup extends Phaser.GameObjects.Container {
    constructor(scene, x = 0, y = 0, configuration = { title: '', message: '' }, callback = null) {
        super(scene, x, y);
        scene.add.existing(this);
        this.scene = scene;
        this.setScale(0);
        this.setVisible(false);
        this.callback = callback;

        // dim overlay
        this.bg = scene.add.rectangle(0, 0, config.width * 1.5, config.height * 1.5, 0x000000, OVERLAY_ALPHA).setVisible(false);
        this.bg.setInteractive().on('pointerdown', () => {});
        this.add(this.bg);

        // panel body
        const gfx = scene.add.graphics();
        // shadow
        gfx.fillStyle(0x000000, 0.45);
        gfx.fillRoundedRect(-POPUP_W / 2 + 6, -POPUP_H / 2 + 8, POPUP_W, POPUP_H, CORNER_R);
        // body gradient (approximated with two rects blended)
        gfx.fillStyle(BG_TOP, 1);
        gfx.fillRoundedRect(-POPUP_W / 2, -POPUP_H / 2, POPUP_W, POPUP_H, CORNER_R);
        gfx.fillStyle(BG_BOT, 0.55);
        gfx.fillRoundedRect(-POPUP_W / 2, 0, POPUP_W, POPUP_H / 2, { bl: CORNER_R, br: CORNER_R, tl: 0, tr: 0 });
        // border
        gfx.lineStyle(1.5, BORDER_COLOR, 0.45);
        gfx.strokeRoundedRect(-POPUP_W / 2, -POPUP_H / 2, POPUP_W, POPUP_H, CORNER_R);
        // title bar
        gfx.fillStyle(TITLE_BG, 1);
        gfx.fillRoundedRect(-POPUP_W / 2, -POPUP_H / 2, POPUP_W, TITLE_BG_H, { tl: CORNER_R, tr: CORNER_R, bl: 0, br: 0 });
        // accent line under title
        gfx.lineStyle(1, BORDER_COLOR, 0.5);
        gfx.beginPath();
        gfx.moveTo(-POPUP_W / 2 + 20, -POPUP_H / 2 + TITLE_BG_H);
        gfx.lineTo(POPUP_W / 2 - 20, -POPUP_H / 2 + TITLE_BG_H);
        gfx.strokePath();
        gfx.setInteractive(new Phaser.Geom.Rectangle(-POPUP_W / 2, -POPUP_H / 2, POPUP_W, POPUP_H), Phaser.Geom.Rectangle.Contains);
        gfx.on('pointerdown', () => {});
        this.add(gfx);

        // title
        this.title = scene.add.text(0, -POPUP_H / 2 + TITLE_BG_H / 2, configuration.title || '', {
            fontFamily: config.CommonFont,
            fontSize: '42px',
            fontStyle: 'bold',
            color: '#8ed4ff',
            align: 'center',
            stroke: '#001122',
            strokeThickness: 2,
        }).setOrigin(0.5, 0.5);
        this.add(this.title);

        // message
        this.message = scene.add.text(0, -20, configuration.message || '', {
            fontFamily: config.playerFont,
            fontSize: '32px',
            color: '#cde8f7',
            align: 'center',
            lineSpacing: 8,
            wordWrap: { width: POPUP_W - 80 },
        }).setOrigin(0.5, 0.5);
        this.add(this.message);

        // buttons
        this.container_confirm = scene.add.container(0, 0);
        this.add(this.container_confirm);
        this.container_prpmpt = scene.add.container(0, 0);
        this.add(this.container_prpmpt);

        const BTN_Y = POPUP_H / 2 - 68;

        const btn_yes = new Button(scene, -190, BTN_Y, {
            texture: assets.btn_yellow, scaleX: 0.75, scaleY: 0.75,
            text: 'Yes', fontFamily: config.ButtonFont, fontSize: '50px', color: '#ffffcf', stroke: '#ffffcf', shadow: false, strokeThickness: 2,
        }, () => { this.callback?.(); this.close(); });
        this.btn_yes = btn_yes;
        this.container_confirm.add(btn_yes);

        const btn_no = new Button(scene, 190, BTN_Y, {
            texture: assets.btn_green, scaleX: 0.75, scaleY: 0.75,
            text: 'No', fontFamily: config.ButtonFont, fontSize: '50px', color: '#ffffcf', stroke: '#ffffcf', shadow: false, strokeThickness: 2,
        }, () => { this.close(); });
        this.btn_no = btn_no;
        this.container_confirm.add(btn_no);

        const btn_okay = new Button(scene, 0, BTN_Y, {
            texture: assets.btn_yellow, scaleX: 0.75, scaleY: 0.75,
            text: 'Okay', fontFamily: config.ButtonFont, fontSize: '50px', color: '#ffffcf', stroke: '#ffffcf', shadow: false, strokeThickness: 2,
        }, () => { this.callback?.(); this.close(); });
        this.container_prpmpt.add(btn_okay);
    }

    open({ confirm = true, title = '', message = '', callback, confirmText = 'Yes', cancelText = 'No' }) {
        this.callback = callback;
        this.btn_yes?.btn_text?.setText(confirmText);
        this.btn_no?.btn_text?.setText(cancelText);
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
            scaleX: 0.85, scaleY: 0.85,
            duration: 280,
            ease: 'Back.easeOut',
            onComplete: () => { this.bg.setVisible(true); }
        });
    }

    close() {
        this.setVisible(false);
        this.setScale(0);
        this.bg.setVisible(false);
        this.scene.oHeader?.btn_exit?.btn_image?.setInteractive?.();
        this.container_confirm.list.forEach(btn => btn.btn_image?.setInteractive?.());
        this.container_prpmpt.list.forEach(btn => btn.btn_image?.setInteractive?.());
    }
}
