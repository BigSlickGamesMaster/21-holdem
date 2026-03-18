import Phaser from 'phaser';
import assets from '../scripts/assets';
import config from '../scripts/config';
import Button from './Button';

export default class GameInfo extends Phaser.GameObjects.Container {
    constructor(scene, x = 0, y = 0, { nTableEntryFee, nMaxPlayer, nSmallBlindAmount, nBigBlindAmount }, callback = null) {
        super(scene, x, y);
        scene.add.existing(this);
        this.scene = scene;
        this.setScale(0);
        this.setVisible(false);
        this.callback = callback;
        const title_style = { fontFamily: config.playerFontBold, fontSize: 32, color: '#7ef0f7', align: 'left', fontStyle: 'bold' };
        const content_style = { fontFamily: config.playerFont, fontSize: 24, color: '#ffffff', align: 'left', fontStyle: 'bold' };

        this.bg = scene.add.rectangle(0, 0, config.width * 1.5, config.height * 1.5, 0x000000, 0.5).setVisible(false);
        this.bg.setInteractive().on('pointerdown', () => this.close());
        this.add(this.bg);

        const GameInfo_bg = scene.add.image(0, 0, assets.popup_base).setScale(1.5);
        GameInfo_bg.setInteractive().on('pointerdown', () => { });
        GameInfo_bg.setInteractive().on('pointerup', () => { });
        this.add(GameInfo_bg);


        this.title = scene.add.text(0, -400, "Game Information", {
            align: 'center', fontFamily: config.CommonFont, fontSize: '78px', color: '#ffffff', fontStyle: 'bold', "stroke": "#000000a9", "strokeThickness": 2, "shadow.offsetY": 3, "shadow.color": "#000000a9", "shadow.blur": 3, "shadow.stroke": true,
        });
        this.title.setWordWrapWidth(GameInfo_bg.displayWidth - 100);
        this.title.setOrigin(0.5, 0.5);
        this.title.setTint(0x006D80, 0x006D80, 0x000000, 0x000000);
        this.add(this.title);

        this.btn_close = new Button(scene, 590, -400, { texture: assets.btn_close }, () => {
            this.close();
        });
        this.add(this.btn_close);

        const gameInfo_base = scene.add.image(0, 115, assets.setting_base).setScale(4.2, 4.5);
        this.add(gameInfo_base);

        const tableId_base = scene.add.image(0, -185, assets.tableId_base).setAlpha(0.8).setScale(0.85);
        this.add(tableId_base);
        const tableId_text = scene.add.text(-70, -185, `Table ID:`, title_style).setOrigin(1, 0.5);
        this.add(tableId_text);
        const tableId_value = scene.add.text(-40, tableId_text.y, scene.iBoardId, content_style).setOrigin(0, 0.5);
        this.add(tableId_value);

        const txt_tableEntryFee = scene.add.text(-600, -130, "Table Entry Fee", title_style);
        this.add(txt_tableEntryFee);
        const txt_tableEntryFeeValue = scene.add.text(txt_tableEntryFee.x, txt_tableEntryFee.y + 50, nTableEntryFee, content_style).setWordWrapWidth(300);
        this.add(txt_tableEntryFeeValue);

        const txt_minimumChips = scene.add.text(txt_tableEntryFee.x, txt_tableEntryFeeValue.y + 60, "Minimum Chips", title_style);
        this.add(txt_minimumChips);
        const txt_minimumChipsValue = scene.add.text(txt_minimumChips.x, txt_minimumChips.y + 50, nSmallBlindAmount, content_style).setWordWrapWidth(300);
        this.add(txt_minimumChipsValue);

        const txt_minMaxPlayers = scene.add.text(txt_minimumChipsValue.x, txt_minimumChipsValue.y + 60, "Min/Max Players", title_style);
        this.add(txt_minMaxPlayers);
        const txt_minMaxPlayersValue = scene.add.text(txt_minMaxPlayers.x, txt_minMaxPlayers.y + 50, `3/${nMaxPlayer}`, content_style).setWordWrapWidth(350);
        this.add(txt_minMaxPlayersValue);

        const txt_DD = scene.add.text(txt_minMaxPlayersValue.x, txt_minMaxPlayersValue.y + 60, "DD", title_style);
        this.add(txt_DD);
        const txt_DDValue = scene.add.text(txt_DD.x, txt_DD.y + 50, "Raise 2X bet for 2nd Private card. Score Locked.", content_style).setWordWrapWidth(350);
        this.add(txt_DDValue);

        const txt_raise = scene.add.text(txt_DDValue.x, txt_DDValue.y + 90, "Raise", title_style);
        this.add(txt_raise);
        const txt_raiseDescription = scene.add.text(txt_raise.x, txt_raise.y + 50, "1/2 pot, Full pot, Confirm 'call', or All-In.", content_style).setWordWrapWidth(350);
        this.add(txt_raiseDescription);

        const txt_sb = scene.add.text(50, txt_tableEntryFee.y, "SB", title_style);
        this.add(txt_sb);
        const txt_sbValue = scene.add.text(txt_sb.x, txt_sb.y + 50, nSmallBlindAmount, content_style).setWordWrapWidth(350);
        this.add(txt_sbValue);

        const txt_bb = scene.add.text(txt_sb.x, txt_sbValue.y + 60, "BB", title_style);
        this.add(txt_bb);
        const txt_bbValue = scene.add.text(txt_bb.x, txt_bb.y + 50, nBigBlindAmount, content_style).setWordWrapWidth(350);
        this.add(txt_bbValue);

        const txt_fold = scene.add.text(txt_bbValue.x, txt_bbValue.y + 60, "Fold", title_style);
        this.add(txt_fold);
        const txt_foldDescription = scene.add.text(txt_fold.x, txt_fold.y + 50, "Drop hand.", content_style).setWordWrapWidth(350);
        this.add(txt_foldDescription);

        const txt_callOrConfirm = scene.add.text(txt_foldDescription.x, txt_foldDescription.y + 60, "Call/Confirm", title_style);
        this.add(txt_callOrConfirm);
        const txt_callOrConfirmDescription = scene.add.text(txt_callOrConfirm.x, txt_callOrConfirm.y + 50, "Match the current bet.", content_style).setWordWrapWidth(350);
        this.add(txt_callOrConfirmDescription);

        const txt_stand = scene.add.text(txt_callOrConfirmDescription.x, txt_callOrConfirmDescription.y + 60, "Stand", title_style);
        this.add(txt_stand);
        const txt_standDescription = scene.add.text(txt_stand.x, txt_stand.y + 50, "Lock your current score but continue betting.", content_style).setWordWrapWidth(350);
        this.add(txt_standDescription);

        this.oGameInfo = { txt_tableEntryFeeValue, txt_minimumChipsValue, txt_minMaxPlayersValue, txt_sbValue, txt_bbValue, txt_DDValue, txt_foldDescription, txt_raiseDescription, txt_callOrConfirmDescription, txt_standDescription };
    }
    open({ nTableEntryFee, nMaxPlayer, nSmallBlindAmount, nBigBlindAmount }, callback) {
        this.callback = callback;
        this.oGameInfo.txt_tableEntryFeeValue.setText(nTableEntryFee);
        this.oGameInfo.txt_minimumChipsValue.setText(nSmallBlindAmount);
        this.oGameInfo.txt_minMaxPlayersValue.setText(`3/${nMaxPlayer}`);
        this.oGameInfo.txt_sbValue.setText(nSmallBlindAmount);
        this.oGameInfo.txt_bbValue.setText(nBigBlindAmount);
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
                this.btn_close.btn_image.setInteractive();
            }
        })
    }
    close() {
        this.setVisible(false);
        this.setScale(0);
        this.bg.setVisible(false);
        this.scene.settings.btn_gameInfo.btn_image.setInteractive();
    }
}
