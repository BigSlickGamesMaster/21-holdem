/**
 * ======================================================================
 * Preload.js — BEGINNER GUIDE (ASSET LOADING)
 * ======================================================================
 *
 * Phaser loads images/audio/fonts BEFORE the game scene starts.
 * If an image key is missing here, Phaser will later throw:
 *   “Texture with key 'X' not found”
 *
 * How to edit safely:
 * ✅ Add new assets:
 *   1) Put the file in your public/assets (or wherever your loader points).
 *   2) Add a loader line here (this.load.image / audio / atlas)
 *   3) Add the key into scripts/assets.js (if your project centralizes keys)
 *   4) Use that key in Level.js (this.add.image(..., assets.my_key))
 *
 * Expected outcome:
 * - New images/sounds become usable in scenes.
 * ======================================================================
 */

import Phaser from 'phaser';
import config from '../scripts/config';
import background from '../assets/images/bg/background.png'
// gameplay
import portrait_table from '../assets/images/gameplay/portrate_table.png'
import prompt_bg from '../assets/images/gameplay/prompt_bg.png'
import chip_icon from '../assets/images/gameplay/chip_icon.png';
import pot_amount_base from '../assets/images/gameplay/pot_amount_base.png';
import footer from '../assets/images/gameplay/footer.png';
import black_base from '../assets/images/gameplay/black_base.png';
// buttons
import btn_blue from '../assets/images/buttons/btn_blue.png'
import btn_red from '../assets/images/buttons/btn_red.png'
import btn_green from '../assets/images/buttons/btn_green.png'
import btn_pink from '../assets/images/buttons/btn_pink.png'
import btn_yellow from '../assets/images/buttons/btn_yellow.png'
import btn_smallYellow from '../assets/images/buttons/btn_smallYellow.png'
import btn_smallOrange from '../assets/images/buttons/btn_smallOrange.png'
import btn_close from '../assets/images/buttons/btn_close.png'
import btn_exit from '../assets/images/buttons/btn_exit.png'
import btn_setting from '../assets/images/buttons/btn_setting.png'
import console_art from '../assets/images/buttons/console.png'
import console_button_base from '../assets/images/buttons/button_base.png'
import call_button from '../assets/images/buttons/call_button.png'
import check_button from '../assets/images/buttons/check_button.png'
import raise_button from '../assets/images/buttons/raise_button.png'
import double_down_button from '../assets/images/buttons/d-down_button.png'
import stand_button from '../assets/images/buttons/stand_button.png'
import fold_button from '../assets/images/buttons/fold_button.png'
import blank_button from '../assets/images/buttons/blank_button.png'
import call_stand_button from '../assets/images/buttons/call_stand_button_ tutorial.png'
// wifi
import ping_bg from '../assets/images/wifi/ping_bg.png'
import wifi_icon from '../assets/images/wifi/wifi_icon.png'
// player-profile
import timer from '../assets/images/player-profile/timer.png'
import player_profile from '../assets/images/player-profile/player_profile.png';
import profile_picture from '../assets/images/player-profile/profile_picture.png';
import player_name_bar from '../assets/images/player-profile/player_name_bar.png';
import other_player_name_bar from '../assets/images/player-profile/other_player_name_bar.png';
import avatar_2 from '../assets/images/player-profile/avatar_2.png';
import blind_bg from '../assets/images/player-profile/blind_bg.png';
import empty_spot from '../assets/images/player-profile/empty_spot.png';
import score_bg from '../assets/images/player-profile/score_bg.png';
import dd_highlighter from '../assets/images/player-profile/dd_highlighter.png';
import bettingLabel_base from '../assets/images/player-profile/bettingLabel_base.png';
import bust_glow from '../assets/images/player-profile/bust_glow.png';
import bustPrompt_bg from '../assets/images/player-profile/bustPrompt_bg.png';
// card
import card_back from '../assets/images/card/card_back.png';
import card_front from '../assets/images/card/card_front.png';
import card_glow from '../assets/images/card/card_glow.png';
import card_deck from '../assets/images/card/card_deck.png';
import club from '../assets/images/card/club.png';
import diamond from '../assets/images/card/diamond.png';
import heart from '../assets/images/card/heart.png';
import spades from '../assets/images/card/spades.png';
// settings
import settings_bg from '../assets/images/settings/settings_bg.png'
import setting_base from '../assets/images/settings/setting_base.png'
import seperation_line from '../assets/images/settings/seperation_line.png'
import setting_header from '../assets/images/settings/setting_header.png'
import switch_base from '../assets/images/settings/switch_base.png'
import switch_off from '../assets/images/settings/switch_off.png'
import switch_on from '../assets/images/settings/switch_on.png'
// popup
import popup_base from '../assets/images/popup/login_popup.png';
import message_base from '../assets/images/popup/message_base.png';
import tableId_base from '../assets/images/popup/tableId_base.png';
// winner
import winner_glow from '../assets/images/winner/winner_glow.png'
import winnerPrompt_bg from '../assets/images/winner/winnerPrompt_bg.png'
// icon 
import copy_icon from '../assets/images/icons/copy_icon.png'
import fold_icon from '../assets/images/icons/fold_icon.png'
import raise_icon from '../assets/images/icons/raise_icon.png'
import doubleDown_icon from '../assets/images/icons/doubleDown_icon.png'
import allIn_icon from '../assets/images/icons/allIn_icon.png'
import stand_icon from '../assets/images/icons/stand_icon.png'
import check_icon from '../assets/images/icons/check_icon.png'
import bg_music from '../assets/sounds/bg_music.mp3'
import winAnimation_sound from '../assets/sounds/winAnimation_sound.mp3'
import winCoin_sound from '../assets/sounds/winCoin_sound.mp3'
import coin_sound from '../assets/sounds/coin_sound.mp3'
import chipsIn_sound from '../assets/sounds/chipsIn.mp3'
import card_sound from '../assets/sounds/card_sound.mp3'
import click_sound from '../assets/sounds/click_sound.mp3'
import fold_sound from '../assets/sounds/fold_sound.mp3'
import timer_sound from '../assets/sounds/timer_sound.mp3'
import raise_sound from '../assets/sounds/raise_sound.mp3'
import check_sound from '../assets/sounds/check_sound.mp3'
import NeuePlakCondensed from '../assets/fonts/game/NeuePlak-CondRegular.ttf'
import TTCommons from '../assets/fonts/game/TTCommons-Regular.ttf'
import playerFont from '../assets/fonts/game/player_font.ttf'
import playerFontBold from '../assets/fonts/game/player_font_bold.ttf'
import CardFont from '../assets/fonts/game/card_font.TTF'
import { BUILT_IN_AVATARS } from '../shared/constants/builtInAvatars';

export default class Preload extends Phaser.Scene {
    constructor() {
        super("Preload");
    }
    editorPreload() {
        this.load.font('NeuePlakCondensed', NeuePlakCondensed);
        this.load.font('TTCommons', TTCommons);
        this.load.font('playerFont', playerFont);
        this.load.font('playerFontBold', playerFontBold);
        this.load.font('CardFont', CardFont);

        this.load.image('background', background);
        // gameplay
        this.load.image('table', portrait_table);
        this.load.image('private_table', portrait_table);
        this.load.image('prompt_bg', prompt_bg);
        this.load.image('chip_icon', chip_icon);
        this.load.image('pot_amount_base', pot_amount_base);
        this.load.image('footer', footer);
        this.load.image('black_base', black_base);
        // buttons
        this.load.image('btn_blue', btn_blue);
        this.load.image('btn_red', btn_red);
        this.load.image('btn_green', btn_green);
        this.load.image('btn_pink', btn_pink);
        this.load.image('btn_yellow', btn_yellow);
        this.load.image('btn_smallYellow', btn_smallYellow);
        this.load.image('btn_smallOrange', btn_smallOrange);
        this.load.image('btn_close', btn_close);
        this.load.image('btn_exit', btn_exit);
        this.load.image('btn_setting', btn_setting);
        this.load.image('console_art', console_art);
        this.load.image('console_button_base', console_button_base);
        this.load.image('call_button', call_button);
        this.load.image('check_button', check_button);
        this.load.image('raise_button', raise_button);
        this.load.image('double_down_button', double_down_button);
        this.load.image('stand_button', stand_button);
        this.load.image('fold_button', fold_button);
        this.load.image('blank_button', blank_button);
        this.load.image('call_stand_button', call_stand_button);
        // wifi
        this.load.image('ping_bg', ping_bg);
        this.load.image('wifi_icon', wifi_icon);
        // player-profile
        this.load.image('timer', timer);
        this.load.image('player_profile', player_profile);
        this.load.image('profile_picture', profile_picture);
        this.load.image('player_name_bar', player_name_bar);
        this.load.image('other_player_name_bar', other_player_name_bar);
        this.load.image('avatar_2', avatar_2);
        this.load.image('blind_bg', blind_bg);
        this.load.image('empty_spot', empty_spot);
        this.load.image('score_bg', score_bg);
        this.load.image('dd_highlighter', dd_highlighter);
        this.load.image('bettingLabel_base', bettingLabel_base);
        this.load.image('bust_glow', bust_glow);
        this.load.image('bustPrompt_bg', bustPrompt_bg);
        BUILT_IN_AVATARS.forEach(({ sTextureKey, sPath }) => {
            if (!sTextureKey || !sPath) return;
            this.load.image(sTextureKey, sPath);
        });
        // card
        this.load.image('card_back', card_back);
        this.load.image('card_front', card_front);
        this.load.image('card_glow', card_glow);
        this.load.image('card_deck', card_deck);
        this.load.image('club', club);
        this.load.image('diamond', diamond);
        this.load.image('heart', heart);
        this.load.image('spades', spades);
        // settings
        this.load.image('settings_bg', settings_bg);
        this.load.image('setting_base', setting_base);
        this.load.image('seperation_line', seperation_line);
        this.load.image('setting_header', setting_header);
        this.load.image('switch_base', switch_base);
        this.load.image('switch_off', switch_off);
        this.load.image('switch_on', switch_on);
        // popup
        this.load.image('popup_base', popup_base);
        this.load.image('message_base', message_base);
        this.load.image('tableId_base', tableId_base);
        // winner
        this.load.image('winner_glow', winner_glow);
        this.load.image('winnerPrompt_bg', winnerPrompt_bg);
        // icon
        this.load.image('copy_icon', copy_icon);
        this.load.image('fold_icon', fold_icon);
        this.load.image('raise_icon', raise_icon);
        this.load.image('doubleDown_icon', doubleDown_icon);
        this.load.image('allIn_icon', allIn_icon);
        this.load.image('stand_icon', stand_icon);
        this.load.image('check_icon', check_icon);
        this.load.audio('bg_music', bg_music);
        this.load.audio('winAnimation_sound', winAnimation_sound);
        this.load.audio('winCoin_sound', winCoin_sound);
        this.load.audio('coin_sound', coin_sound);
        this.load.audio('chipsIn_sound', chipsIn_sound);
        this.load.audio('card_sound', card_sound);
        this.load.audio('click_sound', click_sound);
        this.load.audio('fold_sound', fold_sound);
        this.load.audio('timer_sound', timer_sound);
        this.load.audio('raise_sound', raise_sound);
        this.load.audio('check_sound', check_sound);
        this.load.audio('doubleDown_sound', raise_sound);
    }
    editorCreate() {
        this.cameras.main.setBackgroundColor('#04101a');

        const table = this.add.image(config.centerX, config.centerY, 'preload_table');
        table.setDisplaySize(config.width, config.height);

        this.add.rectangle(config.centerX, 220, config.width, 440, 0x04111d, 0.52);
        this.add.rectangle(config.centerX, config.height - 190, config.width, 380, 0x02070d, 0.68);
        const glow = this.add.circle(config.centerX, config.centerY + 40, 300, 0x67c4ff, 0.09);
        const ring = this.add.circle(config.centerX, config.centerY + 40, 264, 0x9fe1ff, 0.06);
        ring.setStrokeStyle(3, 0xb8e9ff, 0.2);

        this.loading_hint = this.add.text(config.centerX, config.height - 212, 'Get your chips ready!', {
            fontFamily: config.ButtonFont,
            fontSize: '54px',
            color: '#f4fbff',
            fontStyle: 'bold',
            stroke: '#03111d',
            strokeThickness: 3,
            align: 'center',
        }).setOrigin(0.5);
        this.loading_hint.setLetterSpacing(2);

        this.tweens.add({
            targets: [glow, ring],
            alpha: { from: 0.05, to: 0.16 },
            scale: { from: 0.96, to: 1.04 },
            duration: 1800,
            repeat: -1,
            yoyo: true,
            ease: 'Sine.easeInOut',
        });

        this.tweens.add({
            targets: this.loading_hint,
            alpha: { from: 0.84, to: 1 },
            scale: { from: 0.985, to: 1.015 },
            duration: 1200,
            repeat: -1,
            yoyo: true,
            ease: 'Sine.easeInOut',
        });
    }
    init({ sAuthToken, iBoardId, sPrivateCode, fallbackPath, isGuestTutorial = false }) {
        this.sAuthToken = sAuthToken;
        this.iBoardId = iBoardId;
        this.sPrivateCode = sPrivateCode;
        this.fallbackPath = fallbackPath;
        this.isGuestTutorial = Boolean(isGuestTutorial);
    }
    // preload() runs once. Keep it fast; only load what you need.
    preload() {
        this.editorCreate();
        this.editorPreload();
        const data = {
            sAuthToken: this.sAuthToken,
            iBoardId: this.iBoardId,
            sPrivateCode: this.sPrivateCode,
            fallbackPath: this.fallbackPath,
            isGuestTutorial: this.isGuestTutorial,
        };
        this.load.on(Phaser.Loader.Events.COMPLETE, () => {
            this.cameras.main.fadeOut(400);
            setTimeout(() => {
                this.scene.start("Level", data);
            }, 400);
        });
    }

}
