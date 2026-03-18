import Phaser from 'phaser';
import config from '../scripts/config';
import assets from '../scripts/assets';
import _ from '../scripts/helper';
import SocketManager from '../scripts/SocketManager';
import GameManager from '../scripts/GameManager';
import emitter from '../scripts/emitter';
import Card from '../prefabs/Card';
import Prompt from '../prefabs/Prompt';
import PlayerProfile from '../prefabs/PlayerProfile';
import Button from '../prefabs/Button';
import Popup from '../prefabs/Popup';
import Settings from '../prefabs/Settings';
import SoundManager from '../scripts/SoundManager';
import Services from '../scripts/Services';
import Animations from '../scripts/Animations';
import GameInfo from 'prefabs/GameInfo';
/**
 * ======================================================================
 * Level.js  (PHASER GAME SCENE) — FULL BEGINNER WALKTHROUGH
 * ======================================================================
 *
 * If you're new: THIS is the “main game screen”.
 * Everything you SEE during a hand mostly originates here:
 * - table UI, header/footer
 * - player seats (profiles)
 * - buttons (check/call/raise/double-down/stand etc)
 * - cards / animations
 *
 * --------------------------------------------------------------
 * How to read this file (recommended order)
 * --------------------------------------------------------------
 * 1) Start at: create()
 *    That’s the “boot sequence” for the scene.
 * 2) Then read: setHeader(), setTable(), setFooter(), setButtons()
 *    Those build the UI pieces.
 * 3) Then read: createPlayerProfiles()
 *    That spawns seats around the table.
 * 4) Then read the request methods (reqX)
 *    Those are “player clicked a button → talk to server”.
 * 5) Then read the response methods (setX / onX)
 *    Those are “server replied → update UI/state”.
 *
 * --------------------------------------------------------------
 * SAFE EDIT RULES (so you don’t brick the game)
 * --------------------------------------------------------------
 * ✅ Safe to change:
 * - numbers (x/y positions, scale, font sizes)
 * - timing values (delays, animation durations) IF clearly labeled
 * - text labels (button text, prompt messages)
 *
 * ⚠️ Be careful:
 * - Anything that looks like a server key: iUserId, iBoardId, nChips, etc.
 * - Socket event names (must match server)
 *
 * ❌ Do NOT do as a beginner:
 * - rename properties inside server payload objects
 * - change array lengths (player seats) without updating all places
 *
 * Tip: change ONE thing → reload → verify. Repeat.
 * ======================================================================
 */

export default class Level extends Phaser.Scene {
    constructor() {
        super("Level");
    }

    clearAllBettingLabels() {
    this.aPlayerProfiles.forEach(playerProfile => {
        if (playerProfile) {
            playerProfile.hideBettingLabel();
        }
    });
}

enableContainerButtons(container) {
    container.list.forEach(btn => {
        if (btn.btn_image) {
            btn.btn_image.setInteractive();
        }
    });
}

// Helper method to disable all buttons in a container  
disableContainerButtons(container) {
    container.list.forEach(btn => {
        if (btn.btn_image) {
            btn.btn_image.disableInteractive();
        }
    });
}

layoutButtonIconText(btn) {
    if (!btn?.btn_text || !btn?.btn_image) return;
    const icon = btn.list?.find(child => child !== btn.btn_image && child !== btn.btn_text);
    btn.btn_text.setScale(1);

    const gap = icon ? 10 : 0;
    const iconWidth = icon ? icon.displayWidth : 0;
    let textWidth = btn.btn_text.displayWidth;
    const maxContentWidth = Math.max(40, btn.btn_image.displayWidth - 24);

    const rawContentWidth = iconWidth + gap + textWidth;
    if (rawContentWidth > maxContentWidth && textWidth > 0) {
        const maxTextWidth = Math.max(20, maxContentWidth - iconWidth - gap);
        const scale = Phaser.Math.Clamp(maxTextWidth / textWidth, 0.62, 1);
        btn.btn_text.setScale(scale);
        textWidth = btn.btn_text.displayWidth;
    }

    const totalWidth = iconWidth + gap + textWidth;
    const left = -totalWidth / 2;

    if (icon) {
        icon.setX(left + iconWidth / 2);
        btn.btn_text.setX(icon.x + iconWidth / 2 + gap + textWidth / 2);
    } else {
        btn.btn_text.setX(0);
    }
}

getFXOverlay() {
    if (typeof window === 'undefined' || !window.FXOverlay) return null;
    return window.FXOverlay;
}

callFXOverlay(effectName, ...args) {
    try {
        const overlay = this.getFXOverlay();
        if (!overlay) return false;
        overlay.enable && overlay.enable();
        this.registerFXOverlayPotAnchor();
        const effect = overlay[effectName];
        if (typeof effect !== 'function') return false;
        return effect.apply(overlay, args);
    } catch (_error) {
        return false;
    }
}

registerFXOverlayPotAnchor() {
    try {
        const overlay = this.getFXOverlay();
        if (!overlay || typeof overlay.setAnchor !== 'function' || !this.table || !this.oPotAmount?.pot_amount_base) return false;

        const potBase = this.oPotAmount.pot_amount_base;

        overlay.setAnchor('table', () => this.getFXOverlayScreenAnchor(this.table, {
            width: this.table.displayWidth * 0.52,
            height: this.table.displayHeight * 0.30,
            offsetY: this.table.displayHeight * 0.02,
        }));
        overlay.setAnchor('pot', () => this.getFXOverlayScreenAnchor(potBase, {
            width: potBase.displayWidth,
            height: potBase.displayHeight,
        }));
        overlay.setAnchor('mySeat', () => {
            const myPlayer = this.players && this.players.get ? this.players.get(this.iUserId) : null;
            return this.getFXOverlayProfileImageAnchor(myPlayer && myPlayer.playerProfile);
        });
        overlay.setAnchor('mySeatDock', () => {
            const myPlayer = this.findPlayerByUserId(this.iUserId);
            return this.getFXOverlayProfileImageAnchor(myPlayer && myPlayer.playerProfile);
        });
        overlay.setAnchor('potPile', () => this.getFXOverlayScreenAnchor(potBase, {
            width: 126,
            height: 96,
            offsetX: potBase.displayWidth * 0.48,
            offsetY: -2,
        }));
        overlay.setPotAmount && overlay.setPotAmount(this.oGameManager?.nPotAmount || 0);

        return true;
    } catch (_error) {
        return false;
    }
}

getFXOverlayScreenAnchor(gameObject, options = {}) {
    try {
        const canvas = this.game?.canvas;
        const sceneWidth = this.scale?.width || config.width;
        const sceneHeight = this.scale?.height || config.height;
        if (!canvas || !gameObject || !sceneWidth || !sceneHeight) return null;

        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;

        const scaleX = rect.width / sceneWidth;
        const scaleY = rect.height / sceneHeight;
        const x = Number(gameObject.x || 0) + Number(options.offsetX || 0);
        const y = Number(gameObject.y || 0) + Number(options.offsetY || 0);
        const width = Number(options.width ?? gameObject.displayWidth ?? 0);
        const height = Number(options.height ?? gameObject.displayHeight ?? 0);

        return {
            x: rect.left + x * scaleX,
            y: rect.top + y * scaleY,
            width: width * scaleX,
            height: height * scaleY,
        };
    } catch (_error) {
        return null;
    }
}

emitTutorialOverlay(detail = {}) {
    if (!this.isGuestTutorial || typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('guest-tutorial:update', { detail }));
}

getTutorialActionFromState() {
    const nHandIndex = Number(this.oTutorialState?.nHandIndex);
    const aTutorialActions = ['call', 'stand', 'doubleDown'];
    return this.oTutorialState?.sExpectedAction || aTutorialActions[nHandIndex] || null;
}

getTutorialButtonTarget(actionKey) {
    const oButtonMap = {
        call: this.oButtons?.btn_call,
        stand: this.oButtons?.btn_stand,
        doubleDown: this.oButtons?.btn_doubleDown,
        check: this.oButtons?.btn_check,
        raise: this.oButtons?.btn_raise,
    };
    const button = oButtonMap[actionKey];
    if (!button?.btn_image) return null;

    return this.getFXOverlayScreenAnchor(button, {
        width: button.btn_image.displayWidth * (button.scaleX || 1),
        height: button.btn_image.displayHeight * (button.scaleY || 1),
    });
}

syncTutorialState(oTutorial = this.oTutorialState, extraDetail = {}) {
    if (!this.isGuestTutorial || !oTutorial) return;
    this.oTutorialState = oTutorial;
    this.emitTutorialOverlay({
        type: 'tutorialState',
        tutorial: oTutorial,
        ...extraDetail,
    });
}

getFXOverlayPlayerAnchor(playerProfile) {
    if (!playerProfile) return null;

    const scale = playerProfile?.container_profile?.scaleX || 1;
    return this.getFXOverlayScreenAnchor(playerProfile, {
        width: 220 * scale,
        height: 200 * scale,
        offsetY: 70 * scale,
    });
}

getFXOverlayProfileImageAnchor(playerProfile) {
    if (!playerProfile || !playerProfile.profile) return this.getFXOverlayPlayerAnchor(playerProfile);

    const canvas = this.game?.canvas;
    const sceneWidth = this.scale?.width || config.width;
    const sceneHeight = this.scale?.height || config.height;
    if (!canvas || !sceneWidth || !sceneHeight) return null;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const scaleX = rect.width / sceneWidth;
    const scaleY = rect.height / sceneHeight;
    const containerScale = playerProfile?.container_profile?.scaleX || 1;
    const image = playerProfile.profile;
    const x = Number(playerProfile.x || 0) + (Number(image.x || 0) * containerScale);
    const y = Number(playerProfile.y || 0) + (Number(image.y || 0) * containerScale);
    const width = Number(image.displayWidth || 0) * containerScale;
    const height = Number(image.displayHeight || 0) * containerScale;

    return {
        x: rect.left + x * scaleX,
        y: rect.top + y * scaleY,
        width: width * scaleX,
        height: height * scaleY,
    };
}

findPlayerByUserId(iUserId) {
    if (this.players.has(iUserId)) return this.players.get(iUserId);

    const sTargetUserId = String(iUserId);
    for (const [sPlayerId, player] of this.players.entries()) {
        if (String(sPlayerId) === sTargetUserId) return player;
        if (String(player?.iUserId) === sTargetUserId) return player;
    }

    return null;
}

playPlayerBetFX(playerProfile, effectName, amount, options = {}) {
    try {
        const overlay = this.getFXOverlay();
        if (!overlay || typeof overlay.setAnchor !== 'function') return false;
        const nPotAmount = Number.isFinite(Number(options.potAmountOverride))
            ? Number(options.potAmountOverride)
            : this.oGameManager.nPotAmount + (Number(amount) || 0);

        overlay.setAnchor('betSource', () => this.getFXOverlayPlayerAnchor(playerProfile));
        const result = this.callFXOverlay(effectName, amount, {
            source: 'betSource',
            target: 'potPile',
            potAmount: nPotAmount,
            audioAction: options.audioAction,
        });
        window.setTimeout(() => {
            try {
                overlay.clearAnchor && overlay.clearAnchor('betSource');
            } catch (_error) {}
        }, 1200);
        return result;
    } catch (_error) {
        return false;
    }
}

playWinPotFX(playerProfile, amount) {
    try {
        const overlay = this.getFXOverlay();
        if (!overlay || typeof overlay.setAnchor !== 'function') return false;

        overlay.setAnchor('payoutTarget', () => this.getFXOverlayPlayerAnchor(playerProfile));
        const result = this.callFXOverlay('winPot', amount, {
            source: 'potPile',
            target: 'payoutTarget',
        });
        window.setTimeout(() => {
            try {
                overlay.clearAnchor && overlay.clearAnchor('payoutTarget');
            } catch (_error) {}
        }, 1400);
        return result;
    } catch (_error) {
        return false;
    }
}

focusFXOverlayPlayer(playerProfile) {
    try {
        const overlay = this.getFXOverlay();
        if (!overlay || typeof overlay.setAnchor !== 'function') return false;

        overlay.setAnchor('activePlayer', () => this.getFXOverlayPlayerAnchor(playerProfile));
        return this.callFXOverlay('focusPlayer');
    } catch (_error) {
        return false;
    }
}

clearFXOverlayFocus() {
    try {
        const overlay = this.getFXOverlay();
        if (!overlay) return false;
        overlay.clearAnchor && overlay.clearAnchor('activePlayer');
        return this.callFXOverlay('clearFocus');
    } catch (_error) {
        return false;
    }
}

clearFXOverlayPotAnchor() {
    try {
        const overlay = this.getFXOverlay();
        if (!overlay || typeof overlay.clearAnchor !== 'function') return false;
        overlay.clearAnchor('pot');
        overlay.clearAnchor('table');
        overlay.clearAnchor('betSource');
        overlay.clearAnchor('activePlayer');
        overlay.clearAnchor('mySeat');
        return true;
    } catch (_error) {
        return false;
    }
}

setStandButtonLabel(label = 'Stand') {
    const btn = this.oButtons?.btn_stand;
    if (!btn?.btn_text) return;
    btn.btn_text.setFontSize('62px');
    btn.btn_text.setText(label);
    this.layoutButtonIconText(btn);
}

setCallButtonLabel(label = 'Call') {
    const btn = this.oButtons?.btn_call;
    if (!btn?.btn_text) return;
    btn.btn_text.setFontSize('62px');
    btn.btn_text.setText(label);
    this.layoutButtonIconText(btn);
}

refreshRaisePresetLabels() {
    const btnFullPot = this.oButtons?.btn_fullPot;
    if (!btnFullPot?.btn_text) return;

    const potAmount = Number(this.oGameManager?.nPotAmount) || 0;
    const myChips = Number(this.oGameManager?.nMyPlayerChips) || 0;
    const bPotExceedsBankroll = potAmount > myChips && myChips > 0;

    btnFullPot.bActsAsAllIn = bPotExceedsBankroll;
    btnFullPot.btn_text.setText(bPotExceedsBankroll ? 'All In' : 'Pot');
    this.layoutButtonIconText(btnFullPot);
}

    // ==============================================================
    // HEADER (top bar) — ping display + settings/exit buttons
    // ==============================================================
    // Edit tips:
    // - To move header items: adjust x/y numbers in this method.
    // - To change text style: change fontSize / color in txt_ping.
    // Expected outcome:
    // - You’ll see changes immediately on reload (pure UI).

    setHeader() {
        const header = this.add.image(config.centerX, 15, assets.header).setScale(2);
        this.container_header.add(header);

        const ping_bg = this.add.image(config.centerX, 20, assets.ping_bg).setScale(1.5);
        this.container_header.add(ping_bg);

        const wifi_icon = this.add.image(ping_bg.x - 24, ping_bg.y, assets.wifi_icon).setScale(1.5);
        this.container_header.add(wifi_icon);

        const txt_ping = this.add.text(wifi_icon.x + wifi_icon.displayWidth + 15, wifi_icon.y, '', {
            fontSize: 32, fontFamily: config.CommonFont, color: '#ffffff'
        }).setOrigin(0.5, 0.5);
        this.container_header.add(txt_ping);

        const btn_setting = new Button(this, 80, 80, { texture: assets.btn_setting, scaleX: 0.8, scaleY: 0.8 }, () => {
            btn_setting.setVisible(false);
            this.settings.open();
        });
        this.container_header.add(btn_setting);

        const btn_exit = new Button(this, config.width - 80, btn_setting.y, { texture: assets.btn_exit, scaleX: 0.8, scaleY: 0.8 }, () => {
            this.popup.open({
                confirm: true, title: 'EXIT', message: this.oGameManager.exitMessage, callback: () => {
                    this.reqLeaveGame();
                }
            });
        });
        this.container_header.add(btn_exit);

        this.oHeader = { btn_setting: btn_setting, btn_exit: btn_exit, txt_ping: txt_ping };
    }

    // ==============================================================
    // TABLE (center) — felt/table image + private table code UI
    // ==============================================================
    // Edit tips:
    // - Change private table message text here.
    // - Change code box size by changing setScale() on code_base.
    // Expected outcome:
    // - Only visuals / copy-to-clipboard UI changes.

    setTable() {
        const container_private_table = this.add.container(0, 0).setVisible(false);
        this.container_table.add(container_private_table);
        const txt_privateTableMessage = this.add.text(config.centerX, config.centerY - 200, 'Share this code with your friends to join this table!', { fontSize: '38px', fontFamily: config.CommonFont, color: '#000000' }).setAlpha(0.9).setOrigin(0.5);
        container_private_table.add(txt_privateTableMessage);
        const code_base = this.add.image(config.centerX, txt_privateTableMessage.y + txt_privateTableMessage.displayHeight + 25, assets.black_base).setScale(0.5);
        container_private_table.add(code_base);
        const txt_privateTableCode = this.add.text(code_base.x, code_base.y, '123456', { fontSize: '38px', fontFamily: config.CommonFont, color: '#ffffff' }).setOrigin(0.5);
        container_private_table.add(txt_privateTableCode);

        const tostMessage = this.add.text(code_base.x, code_base.y + code_base.displayHeight, 'Code copied!', { fontSize: '38px', fontFamily: config.CommonFont, color: '#000000' }).setAlpha(0.9).setOrigin(0.5).setVisible(false);
        container_private_table.add(tostMessage);

        const btn_copy = new Button(this, txt_privateTableCode.x + code_base.displayWidth / 2 - 35, txt_privateTableCode.y, { texture: assets.copy_icon }, () => {
            _.copyToClipboard(txt_privateTableCode.text);
            btn_copy.btn_image.setInteractive();
            this.tostTimeOut && clearTimeout(this.tostTimeOut);
            tostMessage.setVisible(true);
            this.tostTimeOut = setTimeout(() => {
                tostMessage.setVisible(false);
            }, 2000);
        });
        container_private_table.add(btn_copy);
        const close_deck_card = this.add.image(config.centerX - 280, config.centerY - 60, assets.card_deck);
        this.container_table.add(close_deck_card);
        if (this.sPrivateCode) {
            txt_privateTableCode.setText(this.sPrivateCode);
            container_private_table.setVisible(true);
            this.table.setTexture(assets.private_table);
        }
        this.oTable = {
            close_deck_card: close_deck_card,
            container_private_table: container_private_table,
        }
    }

    // ==============================================================
    // FOOTER (bottom bar) — your chips, bet size, action prompts
    // ==============================================================
    // Edit tips:
    // - Move chip icon / text positions: edit setX() offsets.
    // - Change formatting: look for formatCurrency calls.
    // Expected outcome:
    // - Only affects what the player sees, not server bets.

    setFooter() {
        const footer = this.add.image(config.centerX, config.height, assets.footer).setVisible(false);
        footer.setY(config.height - footer.displayHeight / 2);
        this.container_footer.add(footer);

        const player_price_base = this.add.image(footer.x, footer.y, assets.player_name_bar);
        this.container_footer.add(player_price_base);
        const chip_icon = this.add.image(player_price_base.x - player_price_base.displayWidth / 2.5, player_price_base.y, assets.chip_icon);
        this.container_footer.add(chip_icon);
        const txt_player_price = this.add.text(chip_icon.x + chip_icon.displayWidth, chip_icon.y, '0', { fontSize: '42px', fontFamily: config.CommonFont }).setOrigin(0.5);
        chip_icon.setX(txt_player_price.x - chip_icon.displayWidth / 2);
        txt_player_price.setX(chip_icon.x + chip_icon.displayWidth / 2 + txt_player_price.displayWidth / 1.5);
        this.container_footer.add(txt_player_price);
        this.oFooter = { footer: footer, player_price_base: player_price_base, txt_player_price: txt_player_price, chip_icon: chip_icon }
    }
    reqLeaveGame() {
        this.oSocketManager.emit(emitter.reqLeave);
    }
    reqDiscardCard(iCardId) {
        this.oSocketManager.emit(emitter.reqDiscardCard, { iCardId: iCardId });
        this.selectedCards = [];
        this.updateGroupButtons();
    }
    reqFinish(iCardId) {
        this.oSocketManager.emit(emitter.reqFinish, { iCardId: iCardId });
        this.selectedCards = [];
        this.updateGroupButtons();
        this.oButtons.btn_declare.setVisible(true);
        this.isFinishGame = true;
    }
setButtons() {
    const btn_fold = new Button(this, config.centerX - 655, config.height - 70, { 
        texture: assets.btn_blue, scaleX: 0.8, scaleY: 0.8, iconTexture: assets.fold_icon, 
        text: 'Fold', fontSize: '62px', sound: this.oSoundManager.click_sound 
    }, () => {
        this.oSocketManager.emit(emitter.reqFold);
    }).setVisible(false);
    this.container_buttons.add(btn_fold);

    const btn_call = new Button(this, config.centerX - 300, btn_fold.y, { 
        texture: assets.btn_yellow, scaleX: 0.8, scaleY: 0.8, text: 'Call', 
        fontSize: '62px', sound: this.oSoundManager.click_sound 
    }, () => {
        if (this.oButtons?.btn_call?.bAllInMode) {
            this.oSocketManager.emit(emitter.reqRaise, { nRaiseAmount: this.oGameManager.nMyPlayerChips });
        } else {
            this.oSocketManager.emit(emitter.reqCall);
        }
    }).setVisible(false);
    btn_call.bAllInMode = false;
    this.container_buttons.add(btn_call);

    const btn_check = new Button(this, btn_call.x, btn_call.y, { 
        texture: assets.btn_yellow, scaleX: 0.8, scaleY: 0.8, iconTexture: assets.check_icon, 
        text: 'Check', fontSize: '62px', sound: this.oSoundManager.click_sound 
    }, () => {
        this.oSocketManager.emit(emitter.reqCheck);
    }).setVisible(false);
    this.container_buttons.add(btn_check);

    // FIXED: Main raise button
    const btn_raise = new Button(this, config.centerX + 300, btn_fold.y, { 
        texture: assets.btn_red, scaleX: 0.8, scaleY: 0.8, iconTexture: assets.raise_icon, 
        text: 'Raise', fontSize: '62px' 
    }, () => {
        // Properly disable current container and enable raise container
        this.refreshRaisePresetLabels();
        this.disableContainerButtons(this.container_buttons);
        this.container_buttons.setVisible(false);
        this.container_raise_buttons.setVisible(true);
        this.enableContainerButtons(this.container_raise_buttons);
    }).setVisible(false);
    this.container_buttons.add(btn_raise);

    const btn_doubleDown = new Button(this, config.centerX + 655, btn_fold.y, { 
        texture: assets.btn_pink, scaleX: 0.8, scaleY: 0.8, iconTexture: assets.doubleDown_icon, 
        text: 'Double Down', fontSize: '62px' 
    }, () => {
        this.oSocketManager.emit(emitter.reqDoubleDown);
    }).setVisible(false);
    this.container_buttons.add(btn_doubleDown);

    const btn_stand = new Button(this, btn_doubleDown.x, btn_doubleDown.y, { 
        texture: assets.btn_pink, scaleX: 0.8, scaleY: 0.8, iconTexture: assets.stand_icon, 
        text: 'Stand', fontSize: '62px' 
    }, () => {
        if (this.oButtons?.btn_stand?.bCallStandMode) {
            this.oSocketManager.emit(emitter.reqCall, { bTakeCard: false });
        } else {
            this.oSocketManager.emit(emitter.reqStand);
        }
    }).setVisible(false);
    btn_stand.bCallStandMode = false;
    this.container_buttons.add(btn_stand);

    // FIXED: MIN button
    const btn_min = new Button(this, btn_fold.x, btn_fold.y, { 
        texture: assets.btn_green, scaleX: 0.8, scaleY: 0.8, text: 'MIN', 
        fontSize: '62px', sound: this.oSoundManager.click_sound 
    }, () => {
        const minRaise = this.oGameManager.nMinRaiseAmount;
        this.oGameManager.tempRaiseAmount = minRaise;
        
        // Properly transition to confirm container
        this.disableContainerButtons(this.container_raise_buttons);
        this.container_raise_buttons.setVisible(false);
        this.container_confirm_raise.setVisible(true);
        this.enableContainerButtons(this.container_confirm_raise);
    });
    this.container_raise_buttons.add(btn_min);

    // FIXED: Half pot button
    const btn_halfPot = new Button(this, btn_call.x - 10 - btn_call.btn_image.displayWidth / 4, btn_call.y, { 
        texture: assets.btn_smallYellow, scaleX: 0.8, scaleY: 0.8, text: '1/2 Pot', 
        fontSize: '62px', sound: this.oSoundManager.click_sound 
    }, () => {
        const halfPot = this.oGameManager.nPotAmount / 2;
        const minRaise = this.oGameManager.nMinRaiseAmount;
        if (halfPot < minRaise) {
            this.oGameManager.showMessage("Raise must be at least the minimum bet.");
            return;
        }
        this.oGameManager.tempRaiseAmount = halfPot;
        
        // Properly transition to confirm container
        this.disableContainerButtons(this.container_raise_buttons);
        this.container_raise_buttons.setVisible(false);
        this.container_confirm_raise.setVisible(true);
        this.enableContainerButtons(this.container_confirm_raise);
    });
    this.container_raise_buttons.add(btn_halfPot);

    // FIXED: Full pot button
    const btn_fullPot = new Button(this, btn_call.x - 10 + btn_call.btn_image.displayWidth / 4, btn_call.y, { 
        texture: assets.btn_smallOrange, scaleX: 0.8, scaleY: 0.8, text: 'Pot', 
        fontSize: '62px', sound: this.oSoundManager.click_sound 
    }, () => {
        const potAmount = Number(this.oGameManager.nPotAmount) || 0;
        const myChips = Number(this.oGameManager.nMyPlayerChips) || 0;
        this.oGameManager.tempRaiseAmount = btn_fullPot.bActsAsAllIn ? myChips : potAmount;
        
        // Properly transition to confirm container
        this.disableContainerButtons(this.container_raise_buttons);
        this.container_raise_buttons.setVisible(false);
        this.container_confirm_raise.setVisible(true);
        this.enableContainerButtons(this.container_confirm_raise);
    });
    btn_fullPot.bActsAsAllIn = false;
    this.container_raise_buttons.add(btn_fullPot);

    const btn_allIn = new Button(this, btn_raise.x, btn_raise.y, { 
        texture: assets.btn_blue, scaleX: 0.8, scaleY: 0.8, iconTexture: assets.allIn_icon, 
        text: 'All In', fontSize: '62px', sound: this.oSoundManager.click_sound 
    }, () => {
        this.oSocketManager.emit(emitter.reqRaise, { nRaiseAmount: this.oGameManager.nMyPlayerChips });
    }).setVisible(false);
    this.container_raise_buttons.add(btn_allIn);

    const btn_allInCommon = new Button(this, btn_raise.x, btn_raise.y, { 
        texture: assets.btn_blue, scaleX: 0.8, scaleY: 0.8, iconTexture: assets.allIn_icon, 
        text: 'All In', fontSize: '62px', sound: this.oSoundManager.click_sound 
    }, () => {
        this.oSocketManager.emit(emitter.reqRaise, { nRaiseAmount: this.oGameManager.nMyPlayerChips });
    }).setVisible(false);
    this.container_buttons.add(btn_allInCommon);

    // FIXED: Cancel button in raise container
    const btn_cancel = new Button(this, btn_doubleDown.x, btn_doubleDown.y, { 
        texture: assets.btn_red, scaleX: 0.8, scaleY: 0.8, text: 'Cancel', fontSize: '62px' 
    }, () => {
        // Properly transition back to main buttons
        this.disableContainerButtons(this.container_raise_buttons);
        this.container_raise_buttons.setVisible(false);
        this.container_buttons.setVisible(true);
        this.enableContainerButtons(this.container_buttons);
    });
    this.container_raise_buttons.add(btn_cancel);

    // FIXED: Confirm raise button
    const btn_confirmRaise = new Button(this, btn_fold.x, btn_fold.y, { 
        texture: assets.btn_green, scaleX: 0.8, scaleY: 0.8, text: 'Confirm', fontSize: '62px' 
    }, () => {
        this.oSocketManager.emit(emitter.reqRaise, {
            nRaiseAmount: this.oGameManager.tempRaiseAmount,
            bTakeCard: true,
        });
        // Hide all button containers after action
        this.hideAllButtons();
    });
    this.container_confirm_raise.add(btn_confirmRaise);

    // FIXED: Stand after raise button
    const btn_standRaise = new Button(this, config.centerX, btn_fold.y, { 
        texture: assets.btn_pink, scaleX: 0.8, scaleY: 0.8, text: 'Stand', fontSize: '62px' 
    }, () => {
        this.oSocketManager.emit(emitter.reqRaise, {
            nRaiseAmount: this.oGameManager.tempRaiseAmount,
            bTakeCard: false,
        });
        // Hide all button containers after action
        this.hideAllButtons();
    });
    this.container_confirm_raise.add(btn_standRaise);

    // FIXED: Cancel in confirm container
    const btn_cancelRaise = new Button(this, btn_doubleDown.x, btn_doubleDown.y, { 
        texture: assets.btn_red, scaleX: 0.8, scaleY: 0.8, text: 'Cancel', fontSize: '62px' 
    }, () => {
        // Go back to raise buttons
        this.disableContainerButtons(this.container_confirm_raise);
        this.container_confirm_raise.setVisible(false);
        this.container_raise_buttons.setVisible(true);
        this.enableContainerButtons(this.container_raise_buttons);
    });
    this.container_confirm_raise.add(btn_cancelRaise);

    this.oButtons = { 
        btn_fold, btn_call, btn_check, btn_raise, btn_doubleDown, btn_stand, 
        btn_min, btn_halfPot, btn_fullPot, btn_allIn, btn_allInCommon, btn_cancel 
    };
}

    setPotAmount() {
        const pot_amount_base = this.add.image(config.centerX, config.centerY - 295, assets.pot_amount_base);
        this.container_pot_amount.add(pot_amount_base);
        const chip_icon = this.add.image(pot_amount_base.x - pot_amount_base.displayWidth / 3.6, pot_amount_base.y, assets.chip_icon);
        this.container_pot_amount.add(chip_icon);
        const pot_amount_text = this.add.text(chip_icon.x + chip_icon.displayWidth, chip_icon.y, '0', { fontSize: '48px', fontFamily: config.CommonFont, color: '#ffffff' }).setOrigin(0.5);
        chip_icon.setX(pot_amount_text.x - chip_icon.displayWidth / 2);
        pot_amount_text.setX(chip_icon.x + chip_icon.displayWidth / 2 + pot_amount_text.displayWidth / 1.5);
        this.container_pot_amount.add(pot_amount_text);
        this.oPotAmount = { pot_amount_base: pot_amount_base, chip_icon: chip_icon, pot_amount_text: pot_amount_text };
    }
    createPlayerProfiles() {
        for (let i = 0; i < 9; i++) {
            const { x, y } = this.oGameManager.getPlayerProfileSpecs(i);
            const playerProfile = new PlayerProfile(this, x, y, i)
            this.aAllPlayerProfiles.push(playerProfile);
            this.container_player_profiles.add(playerProfile);
        }
    }
    arrangeSeats(mySeat = 0) {
        const aSeats = _.getSeats(mySeat);
        for (let i = 0; i < aSeats.length; i++) {
            this.aPlayerProfiles[aSeats[i]] = this.aAllPlayerProfiles[i];
        }
    }
    editorCreate() {
        this.container_body = this.add.container(0, 0);
        const bg = this.add.image(config.centerX, config.centerY, assets.game_bg);
        this.container_body.add(bg);
        this.table = this.add.image(config.centerX, config.centerY, assets.table);
        this.container_body.add(this.table);
        this.container_header = this.add.container(0, 0);
        this.container_pot_amount = this.add.container(0, 0);
        this.container_community_cards = this.add.container(0, 0);
        this.container_table = this.add.container(0, 0);
        this.container_closed_cards = this.add.container(0, 0);
        this.container_player_cards = this.add.container(0, 0);
        this.container_player_profiles = this.add.container(0, 0);
        this.container_footer = this.add.container(0, 0);
        this.container_buttons = this.add.container(0, 0).setVisible(false);
        this.container_raise_buttons = this.add.container(0, 0).setVisible(false);
        this.container_confirm_raise = this.add.container(0, 0).setVisible(false);
        this.prompt = new Prompt(this, config.centerX, config.centerY, 'Please wait for other players to join');
        this.prompt.hide();
        this.settings = new Settings(this, -200, 250);
        this.setHeader();
        this.gameInfo = new GameInfo(this, config.centerX, config.centerY, this.oGameManager.oGameInfo);
        this.gameInfo.close();
        this.popup = new Popup(this, config.centerX, config.centerY, { title: 'EXIT', message: 'Are you sure you want to leave this table?' }).setScale(0.8);
        this.popup.close();
        this.setPotAmount();
        this.setTable();
        this.setFooter();
        this.setButtons();
        this.createPlayerProfiles();

    }

    // ==============================================================
    // SOCKET CONNECTION — creates SocketManager which wires server events
    // ==============================================================
    // Beginner warning:
    // - sAuthToken / iBoardId must be correct or you won't join the table.
    // Safe edits:
    // - Usually none here. If debugging connection, add console.log payload.

    makeSocketConnection() {
        this.oSocketManager = new SocketManager(this, {
            sAuthToken: this.sAuthToken,
            iBoardId: this.iBoardId,
        });
    }
    init({ sAuthToken, iBoardId, sPrivateCode, isGuestTutorial = false }) {
        this.sAuthToken = sAuthToken;
        this.iBoardId = iBoardId;
        this.sPrivateCode = sPrivateCode;
        this.isGuestTutorial = Boolean(isGuestTutorial);
    }

    // ==============================================================
    // create() — Scene boot sequence (runs once when Level starts)
    // ==============================================================
    // What you can safely edit here:
    // - initial default values (numbers / booleans) for local state
    // - what UI components are created first
    // What you should NOT change as a beginner:
    // - the order of socket connection + service initialization (unless you know why)
    // - IDs coming from server (iUserId, iBoardId, etc.)

    async create() {
        this.nOpponentIndex = 1;
        this.nPingCounter = 0;
        this.aAllPlayerProfiles = [];
        this.aPlayerProfiles = [null, null, null, null, null, null, null, null, null];
        this.players = new Map();
        this.iUserId = '';
        this.iDealerId = '';
        this.iBigBlindId = '';
        this.iSmallBlindId = '';
        this.iLastTurnId = '';
        this.oBoard = {};
        this.iGameId = '';
        this.isMyTurn = false;
        this.isFinishGame = false;
        this.iSelecetdCardId = '';
        this.oTutorialState = null;

        this.cards = [];
        this.selectedCards = [];
        this.cameras.main.fadeIn(400);
        this.oGameManager = new GameManager(this);
        this.oSoundManager = new SoundManager(this);
        this.oAnimations = new Animations(this);
        this.makeSocketConnection();
        this.emitTutorialOverlay({ type: 'sceneReady' });
        this.oServices = new Services({ sRoot: process.env.REACT_APP_API_ENDPOINT, authorization: this.sAuthToken });

        // [UI BUILD] editorCreate() is usually an auto-generated builder method.
        // It creates containers and base images/text (the scaffolding).
        // If you want to move UI around, you typically change:
        // - GameManager seat coordinates OR
        // - the specific setX() methods (setHeader/setFooter/etc).
        // Beginners: treat editorCreate() as “base layout created here”.

        this.editorCreate();
        this.registerFXOverlayPotAnchor();
        this.scale.on('resize', this.registerFXOverlayPotAnchor, this);
        window.FXOverlay?.enable?.();
        window.FXOverlay?.setSoundEnabled?.(this.oSoundManager.isSoundOn);
        window.FXOverlay?.setMusicEnabled?.(this.oSoundManager.isMusicOn);
        // [PROFILE SETTINGS] Pulls player settings from your API (sound/music toggles).
        // Safe edits:
        // - you can change what happens after profile loads (e.g., default sound on/off)
        // Expected outcome if you change the toggles here:
        // - it will change initial sound/music state when the scene loads.

        this.oServices.profile().then(res => {
            const data = res.data.data;
            this.oSoundManager.setSoundEnabled(data.bSoundEnabled);
            this.oSoundManager.setMusicEnabled(data.bMusicEnabled);
            window.FXOverlay?.setSoundEnabled?.(this.oSoundManager.isSoundOn);
            window.FXOverlay?.setMusicEnabled?.(this.oSoundManager.isMusicOn);
            this.settings.updateSoundSwitcher(this.oSoundManager.isSoundOn);
            this.settings.updateMusicSwitcher(this.oSoundManager.isMusicOn);
            if (this.oSoundManager.isMusicOn) {
                this.oSoundManager.playMusic(this.oSoundManager.bg_music, true);
            }
        }).catch(err => {
            console.error('err', err);
            window.FXOverlay?.setSoundEnabled?.(this.oSoundManager.isSoundOn);
            window.FXOverlay?.setMusicEnabled?.(this.oSoundManager.isMusicOn);
            if (this.oSoundManager.isMusicOn) {
                this.oSoundManager.playMusic(this.oSoundManager.bg_music, true);
            }
        });
        this.visibilityChangeHandler = () => {
            if (document.visibilityState === 'hidden') this.exitGame();
        };
        this.popStateHandler = () => this.exitGame();
        // [BROWSER EVENTS] These handlers exit the game if the tab becomes hidden
        // or user navigates back. This prevents desync / AFK abuse.
        // Safe edits:
        // - You can change the behavior to show a popup instead of instant exit.
        // Expected outcome:
        // - If you remove these, players can background the game and keep seat.

        window.addEventListener('visibilitychange', this.visibilityChangeHandler);
        window.addEventListener('popstate', this.popStateHandler);
        this.events.once('shutdown', this.cleanupGameBindings, this);
        this.events.once('destroy', this.cleanupGameBindings, this);
    }
    setCardHand({ aCardHand, nCardScore }) {
        this.oGameManager.exitMessage = 'Are you sure you want to quit?\nIf you quit now, your hand will be folded automatically, and you’ll lose your chance to win this round.';
        this.oTable.container_private_table.setVisible(false);
        const playersArray = Array.from(this.players.values());
        const dealerIndex = playersArray.findIndex(player => player?.iUserId === this.iDealerId);
        const reorderedPlayers = [...playersArray.slice(dealerIndex), ...playersArray.slice(0, dealerIndex)];
        aCardHand.forEach((cardData, cardIndex) => {
            reorderedPlayers?.forEach((player, playerIndex) => {
                player?.iUserId == this.iUserId && player?.playerProfile?.setScore(nCardScore);
                player.playerProfile.container_cards.removeAll(true);
                this.animateCard(cardData, cardIndex, player, playerIndex);
            });
        });
    }
    animateCard(cardData, cardIndex, player, playerIndex) {
        const animatedCard = this.add.image(config.centerX, 200, assets.card_back).setScale(0.7);
        this.container_closed_cards.add(animatedCard);

        const { x, y } = player?.playerProfile;
        const targetY = x === 960 ? y - 120 : y - 50;

        this.oSoundManager.playSound(this.oSoundManager.card_sound, false);
        this.oAnimations.move({
            aGameObjects: [animatedCard],
            targetX: x,
            targetY: targetY,
            duration: this.oGameManager.nCardDuration,
            delay: 100 * cardIndex + 100 * playerIndex,
            onComplete: () => {
                this.createCard(cardData, player, animatedCard);
                animatedCard.destroy();
            }
        });
    }
    async createCard(cardData, player, animatedCard) {
        if (!player?.playerProfile?.container_cards.list.includes(cardData._id)) {
            await player?.playerProfile?.createCard(cardData);
            const cardsList = player?.playerProfile?.container_cards.list;
            for (let index = 0; index < cardsList.length; index++) {
                const card = cardsList[index];
                if (player?.iUserId === this.iUserId) {
                    cardData._id === card._id && animatedCard ? card.animateCard() : card.openCard();
                } else {
                    card.closeCard();
                }
            }
        }
    }
    waitingForGameStart({ nInitializeTimer, nRoundStartsIn }) {
        this.prompt.hide();
        if (nRoundStartsIn) {
            this.waitingForNextRoundStart(Math.round(nRoundStartsIn / 1000));
            return;
        }
        const seconds = Math.max(0, Math.round(nInitializeTimer / 1000));
        this.prompt.show(`Game will starts in ${seconds} second(s)`);
        this.declreResultInterval && clearInterval(this.declreResultInterval);
        this.timer && clearInterval(this.timer);
        this.timer = setInterval(() => {
            if (nInitializeTimer <= 0) {
                clearInterval(this.timer);
                this.prompt.hide();
            } else {
                nInitializeTimer -= 1000;
                const remainingSeconds = Math.max(0, Math.round(nInitializeTimer / 1000));
                this.prompt.txt_message.setText(`Game will starts in ${remainingSeconds} second(s)`);
            }
        }, 1000);
    }
    waitingForNextRoundStart(remainingTime) {
        this.timer && clearInterval(this.timer);
        this.declreResultInterval && clearInterval(this.declreResultInterval);
        this.declreResultInterval = setInterval(() => {
            remainingTime--;
            if (remainingTime <= 0) {
                clearInterval(this.declreResultInterval);
                this.prompt.hide();
            } else {
                remainingTime < 3 && this.prompt.show(`The next round will starts in ${remainingTime} second(s)`);
            }
        }, 1000);
    }
    waitingForNextRound() {
        this.container_community_cards.setVisible(false);
        this.container_community_cards.removeAll(true);
        this.oTable.close_deck_card.setVisible(true);
        this.aPlayerProfiles.forEach(player => {
            player.container_cards.removeAll(true).setVisible(false);
        });
    }
    startGame() {
        this.prompt.hide();
        this.oTable.container_private_table.setVisible(false);
        this.container_table.setVisible(true);
        this.container_community_cards.setVisible(true);
    }
    async findMyPlayer(aParticipant) {
        for (let i = 0; i < aParticipant.length; i++) {
            if (aParticipant[i].sRootSocket === this.oSocketManager.sRootSocket) {
                this.iUserId = aParticipant[i].iUserId;
                return aParticipant[i];
            }
        }
    }
    async setGameData({ _id, aCommunityCard, iBigBlindId, iDealerId, iSmallBlindId, nTableChips, nDeck, aWinningAmount, nMaxPlayer, eState, ePokerType, nMaxTableAmount, nMinBuyIn, nMaxBuyIn, nMinBet, nMaxBet, iUserTurn, nTurnTime, nGraceTime, nTableRound, aOpenDeck, oWildJoker, oSetting, aParticipant, oGameInfo, oTutorial }) {
        try {
            this.oGameManager.oGameInfo = oGameInfo;
            this.oGameManager.nMaxPlayer = nMaxPlayer;
            this.oGameManager.oSetting = oSetting;
            this.oTutorialState = oTutorial || null;
            this.iDealerId = iDealerId;
            this.iBigBlindId = iBigBlindId;
            this.iSmallBlindId = iSmallBlindId;
            const myPlayer = await this.findMyPlayer(aParticipant);
            this.arrangeSeats(myPlayer.nSeat);
            this.updatePotAmount(nTableChips);
            this.checkGameEState(eState);
            this.setPlayersData(aParticipant);
            this.setCommunityCards(aCommunityCard);
            this.setDealerAndBlind();
            this.syncTutorialState(this.oTutorialState);
            // eState === 'finished' && 
        } catch (error) {
            console.error("Error while setting game data:", error);
        }
    }
    updatePotAmount(nTableChips) {
        this.oGameManager.nPotAmount = nTableChips;
        this.oPotAmount.pot_amount_text.setText(`${_.formatCurrencyWithComa(nTableChips)}`);
        const totalWidth = this.oPotAmount.chip_icon.displayWidth + this.oPotAmount.pot_amount_text.displayWidth;
        const startX = this.oPotAmount.pot_amount_base.x - totalWidth / 2;
        this.oPotAmount.chip_icon.setX(startX);
        this.oPotAmount.pot_amount_text.setX(startX + this.oPotAmount.chip_icon.displayWidth + this.oPotAmount.pot_amount_text.displayWidth / 2);
        this.callFXOverlay('setPotAmount', nTableChips);
    }
    handleDoubleDown(oData, sEventName) {
        const player = this.players.get(oData.iUserId);
        const potIncrease = Math.max(0, Number(oData.nTableChips || 0) - Number(this.oGameManager.nPotAmount || 0));

        const playerNewCards = [];
        this.oSoundManager.playSound(this.oSoundManager.doubleDown_sound, false);
        player?.playerProfile?.setAmountIn(oData.nChips);
        if (oData.iUserId !== this.iUserId && sEventName === 'resDoubledown') {
            player?.playerProfile?.setBettingLabel('DD', oData.nLastBidChips);
        }
        if (potIncrease > 0) {
            Number(oData.nChips) === 0
                ? this.playPlayerBetFX(player?.playerProfile, 'allIn', potIncrease, { audioAction: null })
                : this.playPlayerBetFX(player?.playerProfile, 'bigBet', potIncrease, { audioAction: null });
        }
        player.iUserId == this.iUserId && this.setAmountIn(oData.nChips);
        player.iUserId == this.iUserId && player?.playerProfile?.setScore(oData.nCardScore);
        this.updatePotAmount(oData.nTableChips);
        // const existingCardIds = player?.playerProfile?.container_cards.list.map(card => card._id);
        playerNewCards.push(oData.oCard);
        // oData.aCardHand.forEach((cardData, index) => {
        //     if (!existingCardIds.includes(cardData._id)) {
        // if (player.iUserId == this.iUserId) {
        // }
        // else {
        //     playerNewCards.push(oData.oCard);
        // }
        //     }
        // });
        playerNewCards.forEach((cardData, index) => {
            this.animateCard(cardData, index, player, index);
        });
        if (this.isGuestTutorial && oData.iUserId === this.iUserId) {
            this.emitTutorialOverlay({
                type: 'userAction',
                tutorial: this.oTutorialState,
                action: 'doubleDown',
            });
        }
    }
    handlePlayerBet(oData, sEventName) {
        const player = this.players.get(oData.iUserId);
        if (!player) return;
        const potIncrease = Math.max(0, Number(oData.nTableChips || 0) - Number(this.oGameManager.nPotAmount || 0));
        const isAllInAction = (sEventName === 'resRaise' || sEventName === 'resCall') && Number(oData.nChips) === 0;

        player?.playerProfile?.setAmountIn(oData.nChips);
        player?.iUserId == this.iUserId && this.setMyPlayerData(oData);
        if (potIncrease > 0) {
            if (isAllInAction) {
                this.oSoundManager.playSound(this.oSoundManager.chipsIn_sound, false);
                this.playPlayerBetFX(player?.playerProfile, 'allIn', potIncrease, { audioAction: null });
            } else if (sEventName === 'resRaise') {
                this.oSoundManager.playSound(this.oSoundManager.chipsIn_sound, false);
                this.playPlayerBetFX(player?.playerProfile, 'bigBet', potIncrease, { audioAction: null });
            } else if (sEventName === 'resCall') {
                this.oSoundManager.playSound(this.oSoundManager.chipsIn_sound, false);
                this.playPlayerBetFX(player?.playerProfile, 'smallBet', potIncrease, { audioAction: null });
            }
        } else if (sEventName === 'resCheck') {
            this.oSoundManager.playSound(this.oSoundManager.check_sound, false);
        }
        this.updatePotAmount(oData.nTableChips);

        if (this.isGuestTutorial && oData.iUserId === this.iUserId) {
            const sActionMap = {
                resCall: 'call',
                resStand: 'stand',
                resCheck: 'check',
                resRaise: 'raise',
            };
            const sTutorialAction = sActionMap[sEventName];
            if (sTutorialAction) {
                this.emitTutorialOverlay({
                    type: 'userAction',
                    tutorial: this.oTutorialState,
                    action: sTutorialAction,
                });
            }
        }

        if (oData.iUserId == this.iUserId) return;

        if (sEventName === 'resCall') {
            const callAmount = oData.nLastBidChips ?? oData.nCurrentChips ?? 0;
            player?.playerProfile?.setBettingLabel('Call', callAmount);
        } else if (sEventName === 'resRaise') {
            const raiseAmount = oData.nLastBidChips ?? oData.nCurrentChips ?? 0;
            player?.playerProfile?.setBettingLabel('Raised', raiseAmount);
            this.oGameManager.nMinRaiseAmount = oData.nMinBet ?? this.oGameManager.nMinRaiseAmount;
        } else if (sEventName === 'resStand') {
            const logs = this.oGameManager.recentLogs || [];
            const lastRaiseLog = logs.find(log =>
                log.sAction === 'raise+stand' && log.iUserId === oData.iUserId
            );
            const lastCallStandLog = logs.find(log =>
                log.sAction === 'call+stand' && log.iUserId === oData.iUserId
            );
            if (lastRaiseLog) {
                player?.playerProfile?.setBettingLabel('Raise+Stand');
            } else if (lastCallStandLog) {
                player?.playerProfile?.setBettingLabel('Call+Stand');
            } else {
                player?.playerProfile?.setBettingLabel('Stand');
            }
        } else if (sEventName === 'resCheck') {
            player?.playerProfile?.setBettingLabel('Check');
        }
    }
    setFoldPlayer(iUserId, eState, sReason, bShowMessage, options = {}) {
        const playAudio = options.playAudio !== false;
        const player = this.players.get(iUserId);
        if (eState === 'fold') {
            playAudio && this.oSoundManager.playSound(this.oSoundManager.fold_sound, false);
            player?.playerProfile.setAlpha(0.7);
            player?.playerProfile.setVisible(true);
            iUserId !== this.iUserId && player?.playerProfile.setBettingLabel('Fold');
            iUserId == this.iUserId && player?.playerProfile?.container_cards.list.forEach(card => {
                card.animateCard(false);
            });
        } else if (eState === 'leave') {
            player?.playerProfile.setLeave();
            if (iUserId == this.iUserId) {
                if (bShowMessage == true) {
                    this.popup.open({
                        confirm: false, title: 'LEAVE TABLE', message: sReason, callback: () => {
                            this.exitGame();
                        }
                    });
                } else {
                    this.exitGame();
                }
            }
            this.players.delete(iUserId);
        } else if (eState === 'bust') {
            playAudio && this.oSoundManager.playSound(this.oSoundManager.bust_sound, false);
            player?.playerProfile.showBustPrompt();
            // player?.playerProfile.setAlpha(0.7);
            player?.playerProfile.setVisible(true);
            iUserId !== this.iUserId && player?.playerProfile.setBettingLabel('Bust');
        }
    }
    handleCommunityCard(oData) {
        const { aCommunityCard, aParticipant } = oData;
        const myPlayerData = aParticipant.find(participant => participant.iUserId === this.iUserId);

        setTimeout(() => {
        this.clearAllBettingLabels();
        }, 1000);
        this.setCommunityCards(aCommunityCard, 'communityCard');
        this.setMyPlayerData(myPlayerData);
    }
    handleClearBettingLabels() {
    this.clearAllBettingLabels();
    }
    setCommunityCards(aCommunityCards, sType) {
        if (sType === 'communityCard') {
            aCommunityCards.forEach(card => {
                if (!this.oGameManager.aCommunityCards.some(existingCard => existingCard._id === card._id)) {
                    this.oGameManager.aCommunityCards.push(card);
                    const card_open = new Card(this, this.oTable.close_deck_card.x, this.oTable.close_deck_card.y, card.eSuit, card.nLabel, card.nValue, card._id, card.isJoker);
                    card_open.openCard();
                    this.oAnimations.move({
                        aGameObjects: [card_open],
                        targetX: this.oTable.close_deck_card.x + 160 + 160 * this.container_community_cards.list.length,
                        targetY: this.oTable.close_deck_card.y,
                        duration: 500,
                        ease: 'Quint.easeInOut',
                        yoyo: false,
                        repeat: 0,
                        onComplete: () => {
                            this.container_community_cards.add(card_open);
                            this.oSoundManager.playSound(this.oSoundManager.card_sound, false);
                        }
                    });
                }
            });
        }
        else {
            this.oGameManager.aCommunityCards = aCommunityCards;
            this.container_community_cards.removeAll(true);
            aCommunityCards.forEach(card => {
                const card_open = new Card(this, this.oTable.close_deck_card.x + 160 + 160 * this.container_community_cards.list.length, this.oTable.close_deck_card.y, card.eSuit, card.nLabel, card.nValue, card._id, card.isJoker);
                card_open.openCard();
                this.container_community_cards.add(card_open);
            });
        }
    }
    setMyPlayerData(myPlayerData) {
        const myPlayer = this.players.get(this.iUserId);
        myPlayerData?.nChips && (this.oGameManager.nMyPlayerChips = myPlayerData?.nChips);
        myPlayerData?.nChips && this.setAmountIn(myPlayerData?.nChips);
        myPlayerData?.nCardScore && myPlayer?.playerProfile?.setScore(myPlayerData?.nCardScore);
    }
    async setPlayersData(aParticipant) {
        for (let i = 0; i < aParticipant.length; i++) {
            const { iUserId, nSeat } = aParticipant[i];
            if (!this.players.has(iUserId)) {
                const playerProfile = this.aPlayerProfiles[nSeat];
                await this.mapPlayerData(iUserId, { ...aParticipant[i], playerProfile });
            } else {
                this.players.get(iUserId).eState = aParticipant[i].eState;
                // this.players.set(iUserId, { ...aParticipant[i], playerProfile: this.aPlayerProfiles[nSeat] });
                await this.setProfiles(iUserId);
            }
        }
    }
    async mapPlayerData(iUserId, participant) {
        this.players.set(iUserId, participant);
        await this.setProfiles(iUserId);
    };
    async setUserJoined(oData) {
        if (!this.players.has(oData.iUserId)) {
            await this.mapPlayerData(oData.iUserId, { ...oData, playerProfile: this.aPlayerProfiles[oData.nSeat] });
        }
    }
    async setProfiles(iUserId) {
        const player = await this.players.get(iUserId);
        const { sUserName, sAvatar, eState, nLastBidChips, aCardHand, nChips, nCardScore } = player;
        if (eState === "leave") {
            player?.playerProfile?.setVisible(false);
            iUserId == this.iUserId && this.exitGame();
            return;
        }
        await player?.playerProfile?.setProfile({ sUserName, sAvatar });
        await player?.playerProfile?.setBlind(iUserId);
        await player?.playerProfile?.setAmountIn(nChips);

        aCardHand?.forEach(cardData => {
            this.createCard(cardData, player);
        });
        this.setFoldPlayer(iUserId, eState, undefined, undefined, { playAudio: false });
        if (iUserId === this.iUserId) {
            this.setAmountIn(nChips);
            this.oGameManager.nMyPlayerChips = nChips;
            player?.playerProfile?.setScore(nCardScore);
        }
        if (eState === "spectator") {
            player?.playerProfile?.setWaiting();
            if (iUserId == this.iUserId) this.prompt.show('Please wait for the new game to start!');
        } else {
            player?.playerProfile?.hideWaiting();
        }
    }
    async setBoardState({ _id, aCommunityCard, iBigBlindId, iDealerId, iSmallBlindId, nTableFee, nTableChips, nDeck, aWinningAmount, nMaxPlayer, eState, ePokerType, nMaxTableAmount, nMinBuyIn, nMaxBuyIn, nMinBet, nMaxBet, iUserTurn, nTurnTime, nGraceTime, nTableRound, aOpenDeck, oWildJoker, oSetting, aParticipant, oTutorial }) {
        try {
            this.oTutorialState = oTutorial || this.oTutorialState;
            this.iDealerId = iDealerId;
            this.iBigBlindId = iBigBlindId;
            this.iSmallBlindId = iSmallBlindId;
            this.updatePotAmount(nTableChips);
            this.setCommunityCards(aCommunityCard);
            this.checkGameEState(eState);
            const myPlayer = await this.findMyPlayer(aParticipant);
            this.arrangeSeats(myPlayer.nSeat);
            await this.setPlayersData(aParticipant);
            this.isFinishGame = false;
            this.setDealerAndBlind();
            this.syncTutorialState(this.oTutorialState);
        } catch (error) {
            console.error("Error while setting board state:", error);
        }
    }
    setDealerAndBlind() {
        this.players.forEach(player => {
            player?.playerProfile?.setBlind(player.iUserId);
        });
    }
setCollectBootAmount({ nTableChips, aParticipant }) {
        let nRunningPot = Number(this.oGameManager.nPotAmount || 0);
        const nBigBlindAmount = Number(this.oGameManager?.oGameInfo?.nBigBlindAmount || 0);
        aParticipant.forEach(participant => {
            const player = this.players.get(participant.iUserId);
            const nBlindAmount = Math.max(Number(participant.nLastBidChips) || 0, 0);
            player?.playerProfile?.setAmountIn(participant.nChips);
            player?.iUserId == this.iUserId && this.setMyPlayerData(participant);
            if (player?.playerProfile && nBlindAmount > 0) {
                nRunningPot += nBlindAmount;
                this.playPlayerBetFX(
                    player.playerProfile,
                    nBlindAmount >= nBigBlindAmount ? 'bigBet' : 'smallBet',
                    nBlindAmount,
                    { audioAction: null, potAmountOverride: nRunningPot }
                );
            }
        });
        if (Number(nTableChips) > Number(this.oGameManager.nPotAmount || 0)) {
            this.oSoundManager.playSound(this.oSoundManager.chipsIn_sound, false);
        }
        this.updatePotAmount(nTableChips);
    }
    setAmountIn(nAmountIn) {
        this.oFooter.chip_icon.setX(this.oFooter.player_price_base.x - 50);
        this.oFooter.txt_player_price.setX(this.oFooter.chip_icon.x + this.oFooter.chip_icon.displayWidth);
        this.oFooter.txt_player_price.setText(nAmountIn < 9999 ? _.formatCurrencyWithComa(nAmountIn) : _.formatCurrency(nAmountIn));
        this.oFooter.chip_icon.setX(this.oFooter.txt_player_price.x - this.oFooter.txt_player_price.displayWidth / 2);
        this.oFooter.txt_player_price.setX(this.oFooter.chip_icon.x + this.oFooter.chip_icon.displayWidth / 2 + this.oFooter.txt_player_price.displayWidth / 1.5);
    }
    async resetTurnTimer() {
        if (this.iLastTurnId === this.iUserId) this.hideAllButtons();
        this.clearFXOverlayFocus();
        if (!this.iLastTurnId) return;
        const player = await this.players.get(this.iLastTurnId);
        player?.playerProfile?.resetTurnTimer();
        return player;
    }
    async setPlayerTurn({ iUserId, ttl, initialValue, nTotalTurnTime, aUserAction, nMinBet, nGraceTime, eTurnType, nRemainingInitializeTime, nRemainingRoundStartsIn, nTableChips, toCallAmount }) {
        if (nRemainingInitializeTime > 0 || nRemainingRoundStartsIn > 0) {
            this.aPlayerProfiles.forEach(player => {
                player.setAlpha(1);
                player.container_cards.removeAll(true);
                player.hideBettingLabel();
                player.setScore(0);
                // player.setAmountIn(0);
            });
            this.updatePotAmount(nTableChips);
            this.clearFXOverlayFocus();
            if (this.isGuestTutorial) {
                this.emitTutorialOverlay({
                    type: 'waiting',
                    tutorial: this.oTutorialState,
                });
            }
            nRemainingInitializeTime > 0 && this.waitingForGameStart({ nInitializeTimer: Math.round(nRemainingInitializeTime) });
            nRemainingRoundStartsIn > 0 && this.waitingForNextRoundStart(Math.round(nRemainingRoundStartsIn / 1000));
            return;
        }
        await this.resetTurnTimer();
        const player = await this.players.get(iUserId);
        this.iLastTurnId = iUserId;
        this.oGameManager.nMinRaiseAmount = nMinBet;
        this.focusFXOverlayPlayer(player?.playerProfile);
        if (ttl != null && nTotalTurnTime != null) player?.playerProfile?.resTurnTimer({ ttl, nTotalTurnTime, nGraceTime, eTurnType, initialValue, iUserId });
        else player?.playerProfile?.resetTurnTimer();
        if (player?.iUserId === this.iUserId) {
            this.showAllButtons(aUserAction, nMinBet, toCallAmount);
            if (this.isGuestTutorial) {
                const sExpectedAction = this.getTutorialActionFromState();
                this.emitTutorialOverlay({
                    type: 'playerTurn',
                    tutorial: this.oTutorialState,
                    aUserAction,
                    nMinBet,
                    toCallAmount,
                    targetRect: this.getTutorialButtonTarget(sExpectedAction),
                });
            }
        } else this.hideAllButtons();
    }
showAllButtons(aUserAction, nMinBet, toCallAmount) {
    this.hideAllButtons();
    this.oFooter.footer.setVisible(true);
    this.container_buttons.setVisible(true);

    // Enable all buttons in the main container
    this.enableContainerButtons(this.container_buttons);

    const parsedCallAmount = Number(toCallAmount);
    const fallbackCallAmount = Number(nMinBet);
    const callAmount = Number.isFinite(parsedCallAmount)
        ? parsedCallAmount
        : (Number.isFinite(fallbackCallAmount) ? fallbackCallAmount : 0);
    const actions = Array.isArray(aUserAction) ? aUserAction : [];
    actions.forEach(action => {
        switch (action) {
            case 'f':
                this.oButtons.btn_fold.setVisible(true);
                break;
            case 'c':
                this.oButtons.btn_call.setVisible(true);
                this.oButtons.btn_call.bAllInMode = false;
                this.setCallButtonLabel(`${_.appendMoneySymbolFront(callAmount)} Call`);
                break;
            case 'r':
                this.oButtons.btn_raise.setVisible(true);
                break;
            case 'd':
                this.oButtons.btn_doubleDown.setVisible(true);
                break;
            case 's':
                this.oButtons.btn_stand.setVisible(true);
                this.oButtons.btn_stand.bCallStandMode = actions.includes('c') && callAmount > 0;
                this.setStandButtonLabel(this.oButtons.btn_stand.bCallStandMode ? 'Call/Stand' : 'Stand');
                break;
            case 'a':
                this.oButtons.btn_call.setVisible(true);
                this.oButtons.btn_call.bAllInMode = true;
                this.setCallButtonLabel('All In');
                break;
            case 'ck':
                this.oButtons.btn_check.setVisible(true);
                break;
        }
    });
}
   hideAllButtons() {
    // Disable all containers before hiding
    this.disableContainerButtons(this.container_buttons);
    this.disableContainerButtons(this.container_raise_buttons);
    this.disableContainerButtons(this.container_confirm_raise);
    
    this.container_buttons.setVisible(false);
    this.container_raise_buttons.setVisible(false);
    this.container_confirm_raise.setVisible(false);
    
    this.oButtons.btn_fold.setVisible(false);
    this.oButtons.btn_call.setVisible(false);
    this.oButtons.btn_call.bAllInMode = false;
    this.setCallButtonLabel('Call');
    this.oButtons.btn_raise.setVisible(false);
    this.oButtons.btn_doubleDown.setVisible(false);
    this.oButtons.btn_allInCommon.setVisible(false);
    this.oButtons.btn_stand.setVisible(false);
    this.oButtons.btn_stand.bCallStandMode = false;
    this.setStandButtonLabel('Stand');
    this.oButtons.btn_check.setVisible(false);
    this.oFooter.footer.setVisible(false);
}
setDeclareResult({ nRoundStartsIn, aParticipant, bAllPlayerBust, bAllPlayersBust, sReason, oTutorial }) {
  if (oTutorial) {
    this.oTutorialState = oTutorial;
    this.emitTutorialOverlay({
      type: 'handResult',
      tutorial: oTutorial,
      nRoundStartsIn,
    });
  }
  let remainingTime = Math.round(nRoundStartsIn / 1000);
  clearInterval(this.declreInterval);
  if (this.declreResultInterval) {
    clearInterval(this.declreResultInterval);
  }
  
  if (nRoundStartsIn != 4000) {
    this.waitingForNextRoundStart(remainingTime);
  }

  // Show community cards immediately when round ends
  setTimeout(() => {
    // Show community cards first for players to see final board
    if (this.oGameManager.aCommunityCards.length > 0) {
      this.setCommunityCards(this.oGameManager.aCommunityCards);
    }
  }, 500); // Show cards almost immediately

  // Clear everything after showing cards for longer
  setTimeout(() => {
    if (this.sPrivateCode) this.oTable.container_private_table.setVisible(true);
    this.oTable.close_deck_card.setVisible(true).setX(config.centerX - 280);
    this.setCommunityCards([]); // Clear community cards here
    this.oGameManager.aWinnerPlayers.forEach(winner => {
      const player = this.players.get(winner);
      player?.playerProfile?.hideWinnerPrompt();
    });
    this.updatePotAmount(0);
    this.aPlayerProfiles.forEach(player => {
      player.setAlpha(1);
      player.container_cards.removeAll(true);
      player.hideBettingLabel();
      player.setScore(0);
    });
    this.prompt.hide();
  }, 6000); // Keep cards visible longer (was 7000, now cards show from 500ms to 6000ms)

  const allPlayersBust = bAllPlayerBust || bAllPlayersBust;
  if (allPlayersBust) {
    this.aPlayerProfiles.forEach(player => {
      player.setAlpha(1);
    });
    this.prompt.show(sReason);
    return;
  }

  this.resetTurnTimer();
  aParticipant?.forEach(participant => {
    if (!this.players.has(participant.iUserId)) return;
    const player = this.players.get(participant.iUserId);
    player?.playerProfile?.setAlpha(1);
    player?.playerProfile?.setAmountIn(participant?.nChips);
    participant.iUserId == this.iUserId && this.setAmountIn(participant?.nChips);
    console.log(participant,"PlayerProfile")
    player?.playerProfile?.setScore(participant.nCardScore || 0);
    setTimeout(() => {
      player?.playerProfile?.container_cards.removeAll(true);
      participant.aCardHand.forEach(cardData => {
        if (!player?.playerProfile?.container_cards.list.includes(cardData._id)) {
          player?.playerProfile?.createCard(cardData);

        }
      });
      player?.playerProfile?.container_cards.list.forEach(card => {
        player.iUserId !== this.iUserId ? card.animateCard() : card.openCard();
      });
    }, 700);
    
    if (participant.eState == "winner") {
      setTimeout(() => {
        player?.playerProfile?.showWinnerPrompt();
        participant.iUserId == this.iUserId && this.oSoundManager.playSound(this.oSoundManager.winAnimation_sound, false);
        participant.nCardScore === 21 && this.callFXOverlay('blackjack');
      }, 3000);
      this.oGameManager.aWinnerPlayers.push(participant.iUserId);
      
      setTimeout(() => {
        player?.playerProfile?.hideWinnerPrompt();
        participant.iUserId == this.iUserId && this.oSoundManager.playSound(this.oSoundManager.winCoin_sound, false);
        this.playWinPotFX(player?.playerProfile, participant.nWinningAmount || 0);
      }, 5000);
    }
  });
}
    setRefundOnLongWait({ message, nMaxWaitingTime }) {
        this.oGameManager.exitMessage = 'Are you sure you want to quit?';
        this.declreResultInterval && clearInterval(this.declreResultInterval);
        this.timer && clearTimeout(this.timer);
        this.prompt.showForSeconds(message, nMaxWaitingTime);
    }
    checkGameEState(eState) {
        switch (eState) {
            case "waiting":
                this.prompt.show('Please wait for other players to join');
                break;
            case "initializing":
                this.prompt.show('Please wait for other players to join');
                break;
            case "playing":
                this.startGame();
                break;
            case "initialized":
                this.waitingForNextRound();
                this.prompt.show('Please wait for other players to join');
                break;
            case "finishing":
                this.startGame();
                break;
            case "finished":
                this.waitingForNextRound();
                break;
            default:
                console.log('%cDEFAULT CASE IN checkGameState', 'color: #CE375C', eState);
                break;
        }
    }
    setPlayerLeft({ iUserId, eBehaviour, sReason }) {
        if (iUserId == this.iUserId) {
            this.exitGame();
        } else {
            this.setFoldPlayer(iUserId, eBehaviour, sReason);
        }
    }
    kickOut({ title = 'LEAVE TABLE', message = 'Oops! Not enough players joined.' }) {
        this.popup.open({
            confirm: false, title, message, callback: () => {
                this.exitGame();
            }
        })
    }
    cleanupGameBindings() {
        this.timer && clearInterval(this.timer);
        this.declreResultInterval && clearInterval(this.declreResultInterval);
        this.tostTimeOut && clearTimeout(this.tostTimeOut);
        this.oSoundManager.stopAllManagedSounds();
        this.scale?.off?.('resize', this.registerFXOverlayPotAnchor, this);
        this.clearFXOverlayPotAnchor();
        if (this.visibilityChangeHandler) window.removeEventListener('visibilitychange', this.visibilityChangeHandler);
        if (this.popStateHandler) window.removeEventListener('popstate', this.popStateHandler);
        this.oSocketManager?.destroy?.();
    }
    exitGame() {
        console.log('%cEXIT GAME CALLED, GAME IS FINISHED', 'color: #CE375C');
        window.location.href = '/lobby';
    }
    setPing(pingTime) {
        this.oHeader?.txt_ping?.setText(`${pingTime}ms`);
    }
} 
