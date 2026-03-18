import Phaser from 'phaser';
import assets from '../scripts/assets';
import config from '../scripts/config';
import Button from '../prefabs/Button';

export default class Settings extends Phaser.GameObjects.Container {
    constructor(scene, x = 0, y = 0) {
        super(scene, x, y);
        scene.add.existing(this);
        this.scene = scene;
        this.setVisible(false);
        // this.setX(x + 489);

        this.bg = scene.add.rectangle(-340, -250, config.width, config.height, 0x000000, 0.5).setOrigin(0, 0).setVisible(false);
        this.bg.setInteractive().on('pointerdown', () => this.close());
        this.add(this.bg);

        this.btn_close = new Button(scene, -260, -170, { texture: assets.btn_close, scaleX: 0.8, scaleY: 0.8 }, () => {
            this.close();
        })
        this.add(this.btn_close);

        const settings_bg = scene.add.image(0, 0, assets.settings_bg);
        settings_bg.setInteractive();
        this.add(settings_bg);

        const style = { fontFamily: config.playerFont, fontSize: '24px', align: 'center' };

        const text_settings = scene.add.text(0, -165, 'SETTINGS', { ...style, fontFamily: config.CommonFont, fontSize: '42px', fontStyle: 'bold' });
        text_settings.setOrigin(0.5, 0.5);
        text_settings.setTint(0x006D80, 0x006D80, 0x000000, 0x000000);
        this.add(text_settings);

        const audioSetting_base = scene.add.image(0, 15, assets.setting_base);
        this.add(audioSetting_base);
        const text_sound = scene.add.text(text_settings.x - 60, audioSetting_base.y - 35, 'Sound', { ...style, fontStyle: 'bold' }).setOrigin(0.5);
        this.add(text_sound);
        // switch_base_sound
        const soundSwitch_base = scene.add.image(text_settings.x + 60, audioSetting_base.y - 35, assets.switch_base);
        this.add(soundSwitch_base);

        this.txt_sound_switch = scene.add.text(40, soundSwitch_base.y, 'On', { ...style, fontSize: '18px', fontStyle: 'bold' }).setOrigin(0.5);
        this.add(this.txt_sound_switch);

        this.switch_sound = scene.add.image(90, soundSwitch_base.y, assets.switch_on);
        this.add(this.switch_sound);
        soundSwitch_base.setInteractive().on('pointerdown', () => this.soundToggler(this.scene.oSoundManager.isSoundOn));

        const text_music = scene.add.text(text_settings.x - 60, audioSetting_base.y + 35, 'Music', { ...style, fontStyle: 'bold' }).setOrigin(0.5);
        this.add(text_music);
        // switch_base_music
        const musicSwitch_base = scene.add.image(text_settings.x + 60, audioSetting_base.y + 35, assets.switch_base);
        this.add(musicSwitch_base);

        this.txt_music_switch = scene.add.text(40, musicSwitch_base.y, 'On', { ...style, fontSize: '18px', fontStyle: 'bold' }).setOrigin(0.5);
        this.add(this.txt_music_switch);

        this.switch_music = scene.add.image(90, musicSwitch_base.y, assets.switch_on);
        this.add(this.switch_music);
        musicSwitch_base.setInteractive().on('pointerdown', () => this.musicToggler(this.scene.oSoundManager.isMusicOn));

        this.btn_gameInfo = new Button(scene, 0, audioSetting_base.y + 130, { texture: assets.btn_blue, scaleX: 0.55, scaleY: 0.55, text: 'Game Info', textX: 0, textY: 0, fontSize: '36px', color: '#ffffcf', stroke: '#ffffcf', strokeThickness: 2 }, () => {
            scene.gameInfo.open(scene.oGameManager.oGameInfo, () => {

            });
        });
        this.add(this.btn_gameInfo);

        const version = scene.add.text(0, this.btn_gameInfo.y + 50, `Version ${config.version}`, { ...style, fontSize: '14px' }).setOrigin(0.5);
        this.add(version);
    }
    switchAnimation = (switcher, x, texture) => {
        this.scene.tweens.add({
            targets: switcher,
            x: x,
            duration: 200,
            onComplete: () => {
                switcher.setTexture(texture);
            }
        })
    }
    soundToggler = (isSoundOn) => {
        this.scene.oSoundManager.setSoundEnabled(!isSoundOn);
        window.FXOverlay?.setSoundEnabled?.(this.scene.oSoundManager.isSoundOn);
        this.updateSoundSwitcher(this.scene.oSoundManager.isSoundOn);
        this.updateSetting();
    }
    musicToggler = (isMusicOn) => {
        this.scene.oSoundManager.setMusicEnabled(!isMusicOn);
        window.FXOverlay?.setMusicEnabled?.(this.scene.oSoundManager.isMusicOn);
        this.updateMusicSwitcher(this.scene.oSoundManager.isMusicOn);
        if (this.scene.oSoundManager.isMusicOn) {
            this.scene.oSoundManager.playMusic(this.scene.oSoundManager.bg_music, true);
        } else {
            this.scene.oSoundManager.stopSound(this.scene.oSoundManager.bg_music);
        }
        this.updateSetting();
    }
    updateSoundSwitcher(isSoundOn) {
        if (isSoundOn) {
            this.switchAnimation(this.switch_sound, 90, assets.switch_on);
            this.txt_sound_switch.setText('On').setX(40);
        } else {
            this.switchAnimation(this.switch_sound, 30, assets.switch_off);
            this.txt_sound_switch.setText('Off').setX(80);
        }
    }
    updateMusicSwitcher(isMusicOn) {
        if (isMusicOn) {
            this.switchAnimation(this.switch_music, 90, assets.switch_on);
            this.txt_music_switch.setText('On').setX(40);
        } else {
            this.switchAnimation(this.switch_music, 30, assets.switch_off);
            this.txt_music_switch.setText('Off').setX(80);
        }
    }
    updateSetting() {
        const payload = {
            bSoundEnabled: this.scene.oSoundManager.isSoundOn,
            bMusicEnabled: this.scene.oSoundManager.isMusicOn
        }
        this.scene.oServices.setting(payload).then(res => {
            console.log('res', res);
        }).catch(err => {
            console.log('err', err);
        });
    }
    close() {
        this.bg.setVisible(false);
        this.btn_close.setVisible(false);
        this.scene.tweens.add({
            targets: this,
            x: -200,
            duration: 250,
            ease: 'Sine.easeIn',
            onComplete: () => {
                this.setVisible(false);
                this.scene.oHeader.btn_setting.setVisible(true);
                this.scene.oHeader.btn_setting.btn_image.setInteractive();
            }
        })
    }
    open() {
        this.setVisible(true);
        this.scene.tweens.add({
            targets: this,
            x: 340,
            duration: 250,
            ease: 'Sine.easeIn',
            onComplete: () => {
                this.bg.setVisible(true);
                this.btn_close.setVisible(true);
                this.btn_close.btn_image.setInteractive();
            }
        })
    }
}
