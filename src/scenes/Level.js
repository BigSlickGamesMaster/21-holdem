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
import PotDisplay from '../prefabs/PotDisplay';
import Settings from '../prefabs/Settings';
import SoundManager from '../scripts/SoundManager';
import Services from '../scripts/Services';
import Animations from '../scripts/Animations';
import ChipAnimationController from '../scripts/ChipAnimationController';
import { getApiRoot } from '../axios';
import { GAME_UI_LAYOUT_EVENT, readSavedGameUiLayout, sanitizeGameUiLayout } from '../scripts/gameUiLayout';
import {
    emitGameActionOverlayState,
    GAME_ACTION_OVERLAY_COMMAND_EVENT,
    hideGameActionOverlay,
} from '../scripts/gameActionOverlayBridge';
import GameInfo from 'prefabs/GameInfo';
/**
 * Level -- main Phaser game scene.
 * - create(): boots the scene, connects socket, builds UI.
 * - setHeader/setTable/setFooter/setButtons(): build UI containers.
 * - createPlayerProfiles(): spawns player seats around the table.
 * - req*(): player action -> socket emit to server.
 * - setX()/handleX(): server response -> UI update.
 * Note: server payload keys (iUserId, nChips, etc.) must not be renamed.
 */

export default class Level extends Phaser.Scene {
    constructor() {
        super("Level");
        this.checkedCommitments = new Map();
        this.raiseSequence = 0;
        this.bForcePairDeal = false;
    }

    getPlayfieldOffsetY() {
        return config.isDesktopLayout() ? -50 : -180;
    }

    getTableImageOffsetY() {
        return 100;
    }

    initializeGameUILayout() {
        this.oGameUILayoutBase = {
            tableY: this.table?.y || 0,
            tableScaleX: this.table?.scaleX || 1,
            tableScaleY: this.table?.scaleY || 1,
            headerY: this.container_header?.y || 0,
            potY: this.container_pot_amount?.y || 0,
            footerY: this.container_footer?.y || 0,
            buttonsY: this.container_buttons?.y || 0,
            raiseButtonsY: this.container_raise_buttons?.y || 0,
            confirmRaiseY: this.container_confirm_raise?.y || 0,
            uiNodes: [
                this.container_header,
                this.container_pot_amount,
                this.container_community_cards,
                this.container_table,
                this.container_bet_staging,
                this.container_closed_cards,
                this.container_player_cards,
                this.container_player_profiles,
                this.container_footer,
                this.container_buttons,
                this.container_raise_buttons,
                this.container_confirm_raise,
                this.prompt,
                this.settings,
                this.gameInfo,
                this.popup,
            ].filter(Boolean).map(node => ({
                node,
                x: node.x || 0,
                y: node.y || 0,
                scaleX: node.scaleX || 1,
                scaleY: node.scaleY || 1,
            })),
            playerProfiles: this.aAllPlayerProfiles.map(playerProfile => ({
                playerProfile,
                x: playerProfile.x,
                y: playerProfile.y,
                scaleX: playerProfile.scaleX || 1,
                scaleY: playerProfile.scaleY || 1,
            })),
        };

        this.oGameUILayout = sanitizeGameUiLayout(readSavedGameUiLayout());
        this.applyGameUILayout(this.oGameUILayout);
    }

    applyGameUILayout(nextLayout = {}) {
        if (!this.oGameUILayoutBase) return;

        this.oGameUILayout = sanitizeGameUiLayout({
            ...(this.oGameUILayout || {}),
            ...(nextLayout || {}),
        });

        const layout = this.oGameUILayout;
        const base = this.oGameUILayoutBase;
        const uiScale = config.isDesktopLayout() ? 1 : (layout.uiScale || 1);

        base.uiNodes?.forEach(({ node, x, y, scaleX, scaleY }) => {
            if (!node) return;

            node.setScale(scaleX * uiScale, scaleY * uiScale);
            node.setPosition(
                config.centerX + ((x || 0) - config.centerX) * uiScale,
                config.centerY + ((y || 0) - config.centerY) * uiScale
            );
        });

        if (this.table) {
            this.table.setY(base.tableY + layout.tableOffsetY);
            this.table.setScale(
                base.tableScaleX * layout.tableScale,
                base.tableScaleY * layout.tableScale
            );
        }

        this.container_header?.setY(base.headerY + layout.headerOffsetY);
        this.container_pot_amount?.setY(base.potY + layout.potOffsetY);
        this.container_footer?.setY(base.footerY + layout.footerOffsetY);
        this.container_buttons?.setY(base.buttonsY + layout.footerOffsetY);
        this.container_raise_buttons?.setY(base.raiseButtonsY + layout.footerOffsetY);
        this.container_confirm_raise?.setY(base.confirmRaiseY + layout.footerOffsetY);

        base.playerProfiles.forEach(({ playerProfile, x, y, scaleX, scaleY }) => {
            if (!playerProfile) return;
            playerProfile.setPosition(x, y + layout.playerProfilesOffsetY);
            playerProfile.setScale(
                scaleX * layout.playerProfilesScale,
                scaleY * layout.playerProfilesScale
            );
        });

        this.registerFXOverlayPotAnchor();
    }

    bindGameUILayoutEvents() {
        if (typeof window === 'undefined') return;

        this.handleGameUILayoutUpdate = (event) => {
            this.applyGameUILayout(event?.detail || {});
        };

        window.addEventListener(GAME_UI_LAYOUT_EVENT, this.handleGameUILayoutUpdate);
    }

    clearAllBettingLabels() {
        this.aPlayerProfiles.forEach(playerProfile => {
            if (playerProfile) {
                playerProfile.hideBettingLabel();
            }
        });
    }

enableContainerButtons(container) {
    if (Array.isArray(container?.buttonKeys)) {
        container.buttonKeys.forEach(key => this.setGameActionButtonEnabled(this.oButtons?.[key], true));
    }

    container.list.forEach(btn => {
        if (btn.btn_image) {
            btn.btn_image.setInteractive();
        }
    });
}

// Helper method to disable all buttons in a container  
disableContainerButtons(container) {
    if (Array.isArray(container?.buttonKeys)) {
        container.buttonKeys.forEach(key => this.setGameActionButtonEnabled(this.oButtons?.[key], false));
    }

    container.list.forEach(btn => {
        if (btn.btn_image) {
            btn.btn_image.disableInteractive();
        }
    });
}

layoutButtonIconText(btn) {
    if (!btn?.btn_text || !btn?.btn_image) return;
    const icon = btn.btn_icon || btn.list?.find(child => child !== btn.btn_image && child !== btn.btn_text);
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

    if (btn.btn_icon_chip && icon) {
        btn.btn_icon_chip.setPosition(icon.x, icon.y);
    }
}

playerHasRenderedCard(player, sCardId) {
    const aCards = player?.playerProfile?.container_cards?.list || [];
    return aCards.some(card => String(card?._id) === String(sCardId));
}

getRenderedHandIds(player) {
    return (player?.playerProfile?.container_cards?.list || [])
        .map(card => String(card?._id || ''))
        .filter(Boolean);
}

getIncomingHandIds(aCardHand = []) {
    return (Array.isArray(aCardHand) ? aCardHand : [])
        .map(card => String(card?._id || ''))
        .filter(Boolean);
}

shouldShowPlayerScore(aCardHand = [], nCardScore = 0, playerProfile = null) {
    const nParsedScore = Number(nCardScore);
    if (!Number.isFinite(nParsedScore) || nParsedScore <= 0) return false;

    if (this.getIncomingHandIds(aCardHand).length > 0) return true;

    return (Number(playerProfile?.container_cards?.list?.length) || 0) > 0;
}

shouldRevealPlayerScore(player = null, aCardHand = [], nCardScore = 0, options = {}) {
    const { forceReveal = false } = options;
    if (!player?.playerProfile) return false;
    if (!this.shouldShowPlayerScore(aCardHand, nCardScore, player.playerProfile)) return false;
    if (forceReveal) return true;

    return player.iUserId === this.iUserId;
}

syncPlayerScoreDisplay(player = null, nCardScore = 0, aCardHand = [], options = {}) {
    if (!player?.playerProfile) return;

    if (this.shouldRevealPlayerScore(player, aCardHand, nCardScore, options)) {
        player.playerProfile.setScore(Number(nCardScore));
        return;
    }

    player.playerProfile.clearScore?.();
}

playerHandNeedsReset(player, aCardHand = []) {
    const renderedIds = this.getRenderedHandIds(player);
    const incomingIds = this.getIncomingHandIds(aCardHand);

    if (!renderedIds.length) return false;
    if (!incomingIds.length) return true;
    if (renderedIds.length > incomingIds.length) return true;

    const incomingIdSet = new Set(incomingIds);
    return renderedIds.some(id => !incomingIdSet.has(id));
}

syncPlayerHandSnapshot(player, aCardHand = []) {
    if (!player?.playerProfile?.container_cards) return;
    const aIncomingHand = Array.isArray(aCardHand) ? aCardHand : [];

    if (this.playerHandNeedsReset(player, aIncomingHand)) {
        player.playerProfile.container_cards.removeAll(true);
    }

    aIncomingHand.forEach(cardData => {
        if (!this.playerHasRenderedCard(player, cardData?._id)) {
            this.createCard(cardData, player);
        }
    });
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
        if (!overlay || typeof overlay.setAnchor !== 'function' || !this.table || !this.oPotAmount?.getAnchorBounds) return false;

        const potBounds = this.oPotAmount.getAnchorBounds();

        overlay.setAnchor('table', () => this.getFXOverlayScreenAnchor(this.table, {
            width: this.table.displayWidth * 0.52,
            height: this.table.displayHeight * 0.30,
            offsetY: this.table.displayHeight * 0.02,
        }));
        overlay.setAnchor('pot', () => this.getFXOverlayScreenAnchor(this.oPotAmount, {
            width: potBounds.width,
            height: potBounds.height,
        }));
        overlay.setAnchor('mySeat', () => {
            const myPlayer = this.players && this.players.get ? this.players.get(this.iUserId) : null;
            return this.getFXOverlayProfileImageAnchor(myPlayer && myPlayer.playerProfile);
        });
        overlay.setAnchor('mySeatDock', () => {
            const myPlayer = this.findPlayerByUserId(this.iUserId);
            return this.getFXOverlayProfileImageAnchor(myPlayer && myPlayer.playerProfile);
        });
        overlay.setAnchor('potPile', () => this.getFXOverlayScreenAnchor(this.oPotAmount, {
            width: Math.max(126, potBounds.width * 0.6),
            height: Math.max(84, potBounds.height * 0.7),
            offsetY: Math.round(potBounds.height * 0.82),
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
    const worldPoint = this.getGameObjectScenePoint(gameObject);
    const x = Number(worldPoint?.x ?? gameObject.x ?? 0) + Number(options.offsetX || 0);
    const y = Number(worldPoint?.y ?? gameObject.y ?? 0) + Number(options.offsetY || 0);
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

createGameActionButtonState(command, label, variant = 'secondary') {
    const button = {
        command,
        label,
        variant,
        visible: false,
        enabled: true,
        alpha: 1,
        x: 0,
        y: 0,
        nRaiseAmount: 0,
        bAllInMode: false,
        bCallStandMode: false,
        setVisible(nextVisible) {
            button.visible = Boolean(nextVisible);
            return button;
        },
        setAlpha(nextAlpha) {
            button.alpha = Number(nextAlpha) || 0;
            return button;
        },
        setPosition(nextX = 0, nextY = 0) {
            button.x = Number(nextX) || 0;
            button.y = Number(nextY) || 0;
            return button;
        },
    };

    button.btn_text = {
        displayWidth: 0,
        setText(nextLabel) {
            button.label = String(nextLabel ?? '');
            return button.btn_text;
        },
        setFontSize() { return button.btn_text; },
        setFontFamily() { return button.btn_text; },
        setColor() { return button.btn_text; },
        setFontStyle() { return button.btn_text; },
        setLetterSpacing() { return button.btn_text; },
        setShadow() { return button.btn_text; },
        setStroke() { return button.btn_text; },
        setScale() { return button.btn_text; },
        setX() { return button.btn_text; },
        setY() { return button.btn_text; },
        setVisible() { return button.btn_text; },
    };

    Object.defineProperty(button.btn_text, 'text', {
        get: () => button.label,
    });

    button.btn_image = {
        displayWidth: 0,
        displayHeight: 0,
        setTexture() { return button.btn_image; },
        clearTint() { return button.btn_image; },
        setScale() { return button.btn_image; },
        setY() { return button.btn_image; },
        setInteractive() {
            button.enabled = true;
            return button.btn_image;
        },
        disableInteractive() {
            button.enabled = false;
            return button.btn_image;
        },
    };

    return button;
}

setGameActionButtonEnabled(button, enabled = true) {
    if (!button) return;
    button.enabled = Boolean(enabled);
}

getGameActionOverlayButton(button) {
    if (!button?.visible) return null;

    return {
        key: button.command,
        label: String(button.label || ''),
        variant: button.variant || 'secondary',
        disabled: button.enabled === false,
        amount: Number(button.nRaiseAmount) || 0,
    };
}

createGameActionOverlayRow(id, buttonKeys = [], className = '') {
    const buttons = buttonKeys
        .map(key => this.getGameActionOverlayButton(this.oButtons?.[key]))
        .filter(Boolean);

    if (!buttons.length) return null;

    return {
        id,
        className,
        buttons,
    };
}

    syncGameActionOverlay() {
        if (!this.oButtons) {
            hideGameActionOverlay();
            return;
        }

        const rows = [];

        if (this.sRaiseUiMode === 'confirm') {
            rows.push(
                this.createGameActionOverlayRow('confirm', ['btn_confirmRaise', 'btn_standRaise', 'btn_cancelRaise'], 'game-action-overlay__row--three'),
            );
        } else if (this.sRaiseUiMode === 'builder') {
            rows.push(
                this.createGameActionOverlayRow('raise-top', ['btn_min', 'btn_halfPot', 'btn_fullPot'], 'game-action-overlay__row--three game-action-overlay__row--preset'),
                this.createGameActionOverlayRow('raise-bottom', ['btn_doubleDown', 'btn_cancel'], 'game-action-overlay__row--two'),
            );
        } else if (this.container_buttons?.visible) {
            rows.push(
                this.createGameActionOverlayRow('main-top', ['btn_fold', 'btn_call', 'btn_check'], 'game-action-overlay__row--three'),
                this.createGameActionOverlayRow('main-bottom', ['btn_raise', 'btn_stand'], 'game-action-overlay__row--two'),
            );
        }

        const aVisibleRows = rows.filter(Boolean);
        const tableBankroll = Number.isFinite(Number(this.nOverlayTableBankroll))
            ? Number(this.nOverlayTableBankroll)
            : Number(this.oGameManager?.nMyPlayerChips);
        const shouldShowTray = Boolean(this.isOverlayReady && (aVisibleRows.length > 0 || Number.isFinite(tableBankroll)));

        emitGameActionOverlayState({
            visible: shouldShowTray,
            mode: this.sRaiseUiMode || (shouldShowTray ? 'main' : 'hidden'),
            message: this.sRaiseUiMode === 'builder'
                ? ''
                : (this.sRaiseUiMode === 'confirm'
                    ? `Raise ${this.formatRaiseAmountLabel(this.oGameManager?.tempRaiseAmount)}`
                    : ''),
            rows: aVisibleRows,
            tableBankroll: Number.isFinite(tableBankroll) ? tableBankroll : null,
        });
    }

bindGameActionOverlayEvents() {
    if (typeof window === 'undefined') return;

    this.handleGameActionOverlayCommand = (event) => {
        const command = String(event?.detail?.command || '');
        if (!command) return;

        // Commands that bypass the isMyTurn guard:
        if (command === 'openShop') {
            this.popup.open({
                confirm: true,
                title: 'LEAVE TABLE',
                message: 'Visiting the shop will take you away from the table. Your hand will continue automatically.',
                callback: () => {
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('bsg:navigate', { detail: { path: '/lobby?tab=lobby-shop' } }));
                    }
                },
            });
            return;
        }

        if (!this.isMyTurn) return;

        switch (command) {
            case 'fold':
                this.oSocketManager.emit(emitter.reqFold);
                break;
            case 'call':
                if (this.oButtons?.btn_call?.bAllInMode) {
                    this.oSocketManager.emit(emitter.reqRaise, { nRaiseAmount: this.getRaiseRequestAmountForAllIn() });
                } else {
                    this.oSocketManager.emit(emitter.reqCall);
                }
                break;
            case 'check':
                this.oSocketManager.emit(emitter.reqCheck);
                break;
            case 'raise':
                this.openRaiseBuilder();
                break;
            case 'exitTable':
                this.popup.open({ confirm: true, title: 'EXIT', message: this.oGameManager.exitMessage, callback: () => {
                    this.reqLeaveGame();
                }});
                break;
            case 'doubleDown':
                this.hideAllButtons();
                this.oSocketManager.emit(emitter.reqDoubleDown);
                break;
            case 'split':
                this.hideAllButtons();
                this.oSocketManager.emit(emitter.reqSplit);
                break;
            case 'stand':
                if (this.oButtons?.btn_stand?.bCallStandMode) {
                    this.oSocketManager.emit(emitter.reqCall, { bTakeCard: false });
                } else {
                    this.oSocketManager.emit(emitter.reqStand);
                }
                break;
            case 'minRaise':
                this.openRaiseConfirm(this.oButtons?.btn_min?.nRaiseAmount);
                break;
            case 'halfPotRaise':
                this.openRaiseConfirm(this.oButtons?.btn_halfPot?.nRaiseAmount);
                break;
            case 'fullPotRaise':
                this.openRaiseConfirm(this.oButtons?.btn_fullPot?.nRaiseAmount);
                break;
            case 'cancelRaiseBuilder':
                this.container_raise_buttons?.setVisible(false);
                this.container_confirm_raise?.setVisible(false);
                this.showAllButtons(this.oTurnContext?.aUserAction, this.oTurnContext?.nMinBet, this.oTurnContext?.toCallAmount);
                break;
            case 'confirmRaise':
                this.submitRaiseRequest({ bTakeCard: true });
                break;
            case 'standRaise':
                this.submitRaiseRequest({ bTakeCard: false });
                break;
            case 'cancelRaiseConfirm':
                this.openRaiseBuilder();
                break;
            default:
                break;
        }
    };

    window.addEventListener(GAME_ACTION_OVERLAY_COMMAND_EVENT, this.handleGameActionOverlayCommand);

    this.handleEmojiSent = (event) => {
        const sEmoji = event?.detail?.sEmoji;
        if (sEmoji) this.showPlayerEmoji(sEmoji);
    };
    window.addEventListener('bsg:emoji-sent', this.handleEmojiSent);
}

getTutorialActionFromState() {
    const nHandIndex = Number(this.oTutorialState?.nHandIndex);
    const aTutorialActions = ['call', 'stand', 'doubleDown'];
    return this.oTutorialState?.sExpectedAction || aTutorialActions[nHandIndex] || null;
}

getTutorialButtonTarget(actionKey) {
    if (typeof document === 'undefined') return null;

    const actionSelectorMap = {
        call: 'call',
        stand: 'stand',
        doubleDown: 'doubleDown',
        check: 'check',
        raise: 'raise',
    };
    const sActionKey = actionSelectorMap[actionKey];
    if (!sActionKey) return null;

    const element = document.querySelector(`[data-game-action-key="${sActionKey}"]`);
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
    };
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

getGameObjectScenePoint(gameObject) {
    if (!gameObject?.getWorldTransformMatrix) return null;
    const matrix = gameObject.getWorldTransformMatrix();
    return { x: matrix.tx, y: matrix.ty };
}

getPlayerChipAnchor(playerProfile) {
    if (!playerProfile) return { x: config.centerX, y: config.centerY };
    return this.getGameObjectScenePoint(playerProfile)
        || { x: playerProfile.x, y: playerProfile.y };
}

getPotChipAnchor() {
    const anchor = this.getGameObjectScenePoint(this.oPotAmount) || { x: config.centerX, y: config.centerY };
    const potBounds = this.oPotAmount?.getAnchorBounds?.() || { height: 80 };
    return {
        x: anchor.x,
        y: anchor.y + (potBounds.height * 0.82),
    };
}

getPlayerBetStageAnchor(playerProfile) {
    const communityBounds = this.getCommunityCardBounds();
    const stagedY = communityBounds
        ? communityBounds.bottom + 84
        : this.getCommunityCardBasePosition().y + 164;
    const seatIndex = Number(this.aAllPlayerProfiles?.indexOf?.(playerProfile));
    const spreadBySeat = [-120, -220, -170, -110, -54, 54, 110, 170, 220];

    return {
        x: config.centerX + (spreadBySeat[seatIndex] || 0),
        y: stagedY,
    };
}

renderStagedBetPile(playerProfile, amount = 0) {
    return null;
}

clearStagedBetPiles() {
    const stagedEntries = Array.from(this.stagedBetPiles?.entries?.() || []);
    stagedEntries.forEach(([, stagedPile]) => {
        stagedPile?.container?.destroy?.();
    });
    this.stagedBetPiles?.clear?.();
}

flushStagedBetsToPot() {
    this.clearStagedBetPiles();
    return Promise.resolve();
}

getCommunityCardBounds() {
    const cards = this.container_community_cards?.list || [];
    if (!cards.length) return null;

    const aBounds = cards.map((card) => ({
        left: card.x - (card.displayWidth / 2),
        right: card.x + (card.displayWidth / 2),
        top: card.y - (card.displayHeight / 2),
        bottom: card.y + (card.displayHeight / 2),
    }));

    return {
        left: Math.min(...aBounds.map(bound => bound.left)),
        right: Math.max(...aBounds.map(bound => bound.right)),
        top: Math.min(...aBounds.map(bound => bound.top)),
        bottom: Math.max(...aBounds.map(bound => bound.bottom)),
    };
}

getCommunityCardLayoutMetrics() {
    const uiScale = config.isDesktopLayout() ? 1 : (this.oGameUILayout?.uiScale || 1);
    const normalizedUiScale = Math.max(1, uiScale * 0.92);

    return {
        scale: 0.82 / normalizedUiScale,
        gap: 158 / normalizedUiScale,
    };
}

getCommunityCardBasePosition() {
    return {
        x: config.centerX,
        y: config.centerY - 30,
    };
}

getCommunityCardPosition(index = 0, totalCards = 0) {
    const { gap } = this.getCommunityCardLayoutMetrics();
    const base = this.getCommunityCardBasePosition();
    // Left-anchored: card 0 is fixed at the left of a max 5-card spread;
    // subsequent cards step right by gap. No recentering as cards are added.
    const leftAnchor = base.x - 2 * gap;

    return {
        x: Math.round(leftAnchor + index * gap),
        y: Math.round(base.y),
        angle: 0,
    };
}

getDeckCardPosition() {
    const base = this.getCommunityCardBasePosition();

    return {
        x: base.x - 322,
        y: base.y,
    };
}

getPotTargetPosition() {
    const communityBounds = this.getCommunityCardBounds();
    const deckAnchor = this.getDeckCardPosition();
    const topGuideY = communityBounds
        ? communityBounds.top - 220
        : deckAnchor.y - 240;

    return {
        x: config.centerX,
        y: Math.max(240, Math.min(topGuideY, 376)),
    };
}

updatePotPosition(options = {}) {
    if (!this.oPotAmount) return Promise.resolve();
    const nextPosition = this.getPotTargetPosition();
    this.oPotAmount.setPosition(nextPosition.x, nextPosition.y);
    this.registerFXOverlayPotAnchor();
    return Promise.resolve();
}

commitPotAmount(nTableChips) {
    this.oGameManager.nPotAmount = Number(nTableChips) || 0;
    this.oPotAmount?.setAmount(this.oGameManager.nPotAmount);
    this.registerFXOverlayPotAnchor();
    try {
        const overlay = this.getFXOverlay();
        overlay?.setPotAmount && overlay.setPotAmount(0);
    } catch (_error) {}
}

queuePotUpdate({ amount = 0, targetAmount = 0, playerProfile = null, effectName = 'smallBet' } = {}) {
    this.commitPotAmount(targetAmount);
    return Promise.resolve();
}

queuePotPayout({ amount = 0, targetAmount = 0, playerProfile = null } = {}) {
    this.commitPotAmount(targetAmount);
    return Promise.resolve();
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
    return Promise.resolve(false);
}

playWinPotFX(playerProfile, amount) {
    return Promise.resolve(false);
}

playWinnerCelebrationFX(playerProfile, options = {}) {
    try {
        const anchor =
            this.getFXOverlayProfileImageAnchor(playerProfile) ||
            this.getFXOverlayPlayerAnchor(playerProfile);
        if (!anchor) return false;

        return this.callFXOverlay('winnerCelebration', {
            anchor,
            isSelf: !!options.isSelf,
            text: options.text,
        });
    } catch (_error) {
        return false;
    }
}

playBustFX(playerProfile, options = {}) {
    try {
        const anchor =
            this.getFXOverlayProfileImageAnchor(playerProfile) ||
            this.getFXOverlayPlayerAnchor(playerProfile);
        if (!anchor) return false;

        this.callFXOverlay('bust', {
            anchor,
            isSelf: !!options.isSelf,
            text: options.text,
        });

        if (options.isSelf) {
            this.callFXOverlay('crowdOoh', {
                anchor,
                isSelf: true,
                text: options.crowdText,
            });
        }

        return true;
    } catch (_error) {
        return false;
    }
}

playDoubleDownMomentFX(playerProfile, options = {}) {
    try {
        const anchor =
            this.getFXOverlayPlayerAnchor(playerProfile) ||
            this.getFXOverlayProfileImageAnchor(playerProfile);
        if (!anchor) return false;

        return this.callFXOverlay('doubleDownMoment', {
            anchor,
            isSelf: !!options.isSelf,
            text: options.text,
        });
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
    if (!btn) return;

    const sLabel = String(label || '').trim();
    btn.variant = 'secondary';
    btn.label = sLabel || 'Stand';
}

setCallButtonLabel(label = 'Call') {
    const btn = this.oButtons?.btn_call;
    if (!btn) return;

    btn.variant = 'primary';
    btn.label = String(label || 'Call').trim().toLowerCase() === 'all in' ? 'All In' : String(label || 'Call');
}

getButtonRowWidth(button) {
    if (!button?.btn_image) return 0;
    const nImageWidth = Number(button.btn_image.displayWidth) || 0;
    const nTextWidth = Number(button?.btn_text?.displayWidth) || 0;
    return Math.max(nImageWidth, nTextWidth + 84);
}

layoutVisibleButtonRow(buttons = [], { centerX = config.centerX, gap = 28, fallbackY = 0 } = {}) {
    const aVisibleButtons = buttons.filter(button => button?.visible && button?.btn_image);
    if (!aVisibleButtons.length) return;

    const aWidths = aVisibleButtons.map(button => this.getButtonRowWidth(button));
    const nTotalWidth = aWidths.reduce((sum, width) => sum + width, 0) + (Math.max(aVisibleButtons.length - 1, 0) * gap);
    let nCursorX = centerX - (nTotalWidth / 2);
    const nTargetY = Number.isFinite(Number(fallbackY)) ? Number(fallbackY) : (Number(aVisibleButtons[0]?.y) || 0);

    aVisibleButtons.forEach((button, index) => {
        const nWidth = aWidths[index];
        button.setPosition(Math.round(nCursorX + (nWidth / 2)), nTargetY);
        nCursorX += nWidth + gap;
    });
}

layoutActionButtonGroups() {
    this.syncGameActionOverlay();
}

formatRaiseAmountLabel(amount = 0) {
    return _.formatCurrencyWithComa(Math.max(0, Math.round(Number(amount) || 0)));
}

getRaiseContext() {
    const toCallAmount = Math.max(0, Number(this.oTurnContext?.toCallAmount) || 0);
    const minRaise = Math.max(0, Math.round(Number(this.oGameManager?.nMinRaiseAmount) || 0));
    const potAmount = Math.max(0, Math.round(Number(this.oGameManager?.nPotAmount) || 0));
    const myChips = Math.max(0, Math.round(Number(this.oGameManager?.nMyPlayerChips) || 0));
    const maxRaiseAmount = Math.max(0, myChips - toCallAmount);

    return {
        toCallAmount,
        minRaise,
        potAmount,
        myChips,
        maxRaiseAmount,
    };
}

getRaiseRequestAmountForAllIn() {
    const { maxRaiseAmount, myChips } = this.getRaiseContext();
    if (maxRaiseAmount > 0) return maxRaiseAmount;
    return myChips;
}

setPresetButtonState(button, { label, amount, visible = true, enabled = true }) {
    if (!button) return;

    button.nRaiseAmount = amount;
    button.setVisible(visible);
    button.label = String(label || '');
    this.setGameActionButtonEnabled(button, visible && enabled);
    button.setAlpha(enabled ? 1 : 0.45);
}

refreshRaisePresetLabels() {
    const btnMin = this.oButtons?.btn_min;
    const btnHalfPot = this.oButtons?.btn_halfPot;
    const btnFullPot = this.oButtons?.btn_fullPot;
    const btnAllIn = this.oButtons?.btn_allIn;
    if (!btnMin || !btnHalfPot || !btnFullPot) return false;

    const { minRaise, potAmount, maxRaiseAmount } = this.getRaiseContext();
    const canAffordRaise = maxRaiseAmount >= minRaise && minRaise > 0;

    const desiredHalfPot = Math.max(minRaise, Math.round(potAmount / 2));
    const desiredFullPot = Math.max(minRaise, Math.round(potAmount));
    const effectiveHalfPot = Math.min(desiredHalfPot, maxRaiseAmount);
    const effectiveFullPot = Math.min(desiredFullPot, maxRaiseAmount);

    this.setPresetButtonState(btnMin, {
        label: 'MIN',
        amount: minRaise,
        visible: canAffordRaise,
        enabled: canAffordRaise,
    });

    this.setPresetButtonState(btnHalfPot, {
        label: '1/2',
        amount: effectiveHalfPot,
        visible: canAffordRaise,
        enabled: canAffordRaise && effectiveHalfPot >= minRaise,
    });

    this.setPresetButtonState(btnFullPot, {
        label: 'POT',
        amount: effectiveFullPot,
        visible: canAffordRaise,
        enabled: canAffordRaise && effectiveFullPot >= minRaise,
    });

    if (btnAllIn) {
        this.setPresetButtonState(btnAllIn, {
            label: '',
            amount: 0,
            visible: false,
            enabled: false,
        });
    }

    const btnDoubleDown = this.oButtons?.btn_doubleDown;
    if (btnDoubleDown) {
        const canDD = this.canShowDoubleDownAction();
        btnDoubleDown.setVisible(canDD);
        this.setGameActionButtonEnabled(btnDoubleDown, canDD);
        btnDoubleDown.setAlpha(canDD ? 1 : 0.45);
    }

    return canAffordRaise;
}

openRaiseBuilder() {
    const canAffordRaise = this.refreshRaisePresetLabels();
    if (!canAffordRaise) {
        this.prompt.showForSeconds('You do not have enough chips to raise.');
        this.restoreTurnUiAfterError();
        return false;
    }

    this.disableContainerButtons(this.container_buttons);
    this.container_buttons.setVisible(false);
    this.container_confirm_raise.setVisible(false);
    this.container_raise_buttons.setVisible(true);
    this.oButtons?.btn_cancel?.setVisible(true);
    this.oButtons?.btn_confirmRaise?.setVisible(false);
    this.oButtons?.btn_standRaise?.setVisible(false);
    this.oButtons?.btn_cancelRaise?.setVisible(false);
    this.enableContainerButtons(this.container_raise_buttons);
    this.sRaiseUiMode = 'builder';
    this.setConsolePrompt('Set your raise');
    this.syncGameActionOverlay();
    return true;
}

openRaiseConfirm(nRaiseAmount) {
    const amount = Math.max(0, Math.round(Number(nRaiseAmount) || 0));
    const { minRaise } = this.getRaiseContext();
    if (amount < minRaise) {
        this.prompt.showForSeconds('Raise must be at least the minimum bet.');
        return false;
    }

    this.oGameManager.tempRaiseAmount = amount;
    this.disableContainerButtons(this.container_raise_buttons);
    this.container_raise_buttons.setVisible(false);
    this.container_confirm_raise.setVisible(true);
    this.oButtons?.btn_cancel?.setVisible(false);
    this.oButtons?.btn_confirmRaise?.setVisible(true);
    this.oButtons?.btn_standRaise?.setVisible(true);
    this.oButtons?.btn_cancelRaise?.setVisible(true);
    this.enableContainerButtons(this.container_confirm_raise);
    this.sRaiseUiMode = 'confirm';
    this.setConsolePrompt('Confirm your raise');
    this.syncGameActionOverlay();
    return true;
}

restoreTurnUiAfterError(preferRaiseBuilder = false) {
    if (!this.isMyTurn || !this.oTurnContext) return;

    if (preferRaiseBuilder && Array.isArray(this.oTurnContext.aUserAction) && this.oTurnContext.aUserAction.includes('r')) {
        this.openRaiseBuilder();
        return;
    }

    this.showAllButtons(this.oTurnContext.aUserAction, this.oTurnContext.nMinBet, this.oTurnContext.toCallAmount);
}

handleActionError(sEventName, sErrorMessage) {
    if (sErrorMessage) {
        this.prompt.showForSeconds(sErrorMessage);
    }

    if (sEventName === 'reqRaise') {
        this.restoreTurnUiAfterError(true);
        return;
    }

    this.restoreTurnUiAfterError(false);
}

submitRaiseRequest(extraData = {}) {
    this.disableContainerButtons(this.container_confirm_raise);
    this.syncGameActionOverlay();
    this.setConsolePrompt('Submitting raise');
    this.oSocketManager.emit(emitter.reqRaise, {
        nRaiseAmount: this.oGameManager.tempRaiseAmount,
        ...extraData,
    });
}

createGlassTexture(key, width, height, palette = {}) {
    if (this.textures.exists(key)) return key;

    const {
        radius = 28,
        top = 0x1b5e8d,
        bottom = 0x071a2c,
        border = 0xbde8ff,
        innerBorder = 0x6fc7ff,
        highlight = 0xffffff,
        accent = 0xffd564,
        shadow = 0x04111d,
        shadowAlpha = 0.28,
        beam = 0x7ed6ff,
        highlightAlpha = 0.12,
        showStripes = false,
        stripeColor = 0x67f0d7,
        stripeCount = 3,
        stripeInset = 22,
        stripeHeight = 12,
        stripeGap = 8,
        showGoldCap = false,
        goldCap = 0xf0b24c,
        goldCapBorder = 0xffe6a7,
        showAura = false,
        auraColor = 0x59c1ff,
        simple = false,
    } = palette;

    const graphics = this.make.graphics({ add: false });

    if (simple) {
        graphics.fillStyle(shadow, shadowAlpha);
        graphics.fillRoundedRect(10, 12, width - 20, height - 12, radius);

        graphics.fillStyle(bottom, 1);
        graphics.fillRoundedRect(0, 0, width, height, radius);

        graphics.fillStyle(top, 0.94);
        graphics.fillRoundedRect(4, 4, width - 8, height - 8, Math.max(radius - 4, 8));

        graphics.fillStyle(0xffffff, 0.05);
        graphics.fillRoundedRect(10, 10, width - 20, Math.max(14, Math.round(height * 0.18)), Math.max(radius - 10, 6));

        graphics.lineStyle(2.5, border, 0.94);
        graphics.strokeRoundedRect(1.5, 1.5, width - 3, height - 3, radius);
        graphics.lineStyle(1.2, innerBorder, 0.5);
        graphics.strokeRoundedRect(7.5, 7.5, width - 15, height - 15, Math.max(radius - 8, 6));
        graphics.generateTexture(key, width, height);
        graphics.destroy();
        return key;
    }

    if (showAura) {
        graphics.fillStyle(auraColor, 0.14);
        graphics.fillRoundedRect(8, 10, width - 16, height - 6, radius + 2);
    }

    graphics.fillStyle(shadow, shadowAlpha);
    graphics.fillRoundedRect(12, 18, width - 24, height - 16, radius);

    graphics.fillStyle(0x030c15, 1);
    graphics.fillRoundedRect(0, 0, width, height, radius);

    graphics.fillStyle(bottom, 1);
    graphics.fillRoundedRect(4, 4, width - 8, height - 8, Math.max(radius - 4, 8));

    graphics.fillStyle(top, 0.9);
    graphics.fillRoundedRect(7, 7, width - 14, Math.round(height * 0.46), Math.max(radius - 7, 6));

    graphics.fillStyle(0xffffff, 0.045);
    graphics.fillRoundedRect(8, Math.round(height * 0.48), width - 16, Math.round(height * 0.18), Math.max(radius - 8, 6));

    graphics.fillStyle(beam, 0.24);
    graphics.fillPoints([
        new Phaser.Geom.Point(20, 14),
        new Phaser.Geom.Point(width * 0.46, 14),
        new Phaser.Geom.Point(width * 0.32, height - 18),
        new Phaser.Geom.Point(20, height - 18),
    ], true);

    graphics.fillStyle(highlight, highlightAlpha);
    graphics.fillRoundedRect(18, 12, width - 36, Math.max(14, Math.round(height * 0.1)), Math.max(radius - 16, 5));

    graphics.fillStyle(accent, 0.95);
    graphics.fillRoundedRect(26, height - 16, width - 52, 6, 3);

    if (showStripes) {
        const stripeLeft = stripeInset;
        const stripeTop = Math.round((height - ((stripeCount * stripeHeight) + ((stripeCount - 1) * stripeGap))) / 2);
        for (let index = 0; index < stripeCount; index++) {
            const stripeY = stripeTop + index * (stripeHeight + stripeGap);
            graphics.fillStyle(stripeColor, index === 0 ? 0.95 : 0.78);
            graphics.fillPoints([
                new Phaser.Geom.Point(stripeLeft, stripeY),
                new Phaser.Geom.Point(stripeLeft + 11, stripeY - 4),
                new Phaser.Geom.Point(stripeLeft + 20, stripeY - 4),
                new Phaser.Geom.Point(stripeLeft + 9, stripeY + stripeHeight),
                new Phaser.Geom.Point(stripeLeft, stripeY + stripeHeight),
            ], true);
        }
    }

    if (showGoldCap) {
        const capWidth = Math.max(62, Math.round(width * 0.18));
        const capX = width - capWidth - 10;
        graphics.fillStyle(goldCap, 0.96);
        graphics.fillRoundedRect(capX, 8, capWidth, height - 16, Math.max(radius - 10, 10));
        graphics.fillStyle(0xffffff, 0.18);
        graphics.fillRoundedRect(capX + 8, 12, capWidth - 16, Math.round((height - 16) * 0.28), Math.max(radius - 16, 6));
        graphics.lineStyle(2, goldCapBorder, 0.95);
        graphics.strokeRoundedRect(capX + 1, 9, capWidth - 2, height - 18, Math.max(radius - 11, 9));
    }

    graphics.fillStyle(border, 0.24);
    graphics.fillCircle(28, height / 2, 3);
    graphics.fillCircle(width - 28, height / 2, 3);

    graphics.lineStyle(3, border, 1);
    graphics.strokeRoundedRect(1.5, 1.5, width - 3, height - 3, radius);
    graphics.lineStyle(1.5, innerBorder, 0.45);
    graphics.strokeRoundedRect(8.5, 8.5, width - 17, height - 17, Math.max(radius - 8, 6));
    graphics.lineStyle(1, highlight, 0.08);
    graphics.strokeRoundedRect(16.5, 16.5, width - 33, height - 33, Math.max(radius - 16, 4));
    graphics.generateTexture(key, width, height);
    graphics.destroy();
    return key;
}

createIconChipTexture(key, size = 58) {
    if (this.textures.exists(key)) return key;
    const graphics = this.make.graphics({ add: false });
    const radius = 18;
    graphics.fillStyle(0x05101a, 0.96);
    graphics.fillRoundedRect(0, 0, size, size, radius);
    graphics.fillStyle(0x1d5c88, 0.98);
    graphics.fillRoundedRect(4, 4, size - 8, size - 8, radius - 4);
    graphics.fillStyle(0xffffff, 0.16);
    graphics.fillRoundedRect(8, 7, size - 16, Math.round(size * 0.26), radius - 10);
    graphics.fillStyle(0xffc65e, 0.94);
    graphics.fillRoundedRect(size - 16, 10, 6, size - 20, 3);
    graphics.lineStyle(2.5, 0xdaf2ff, 0.95);
    graphics.strokeRoundedRect(1.5, 1.5, size - 3, size - 3, radius);
    graphics.lineStyle(1.2, 0x78d6ff, 0.46);
    graphics.strokeRoundedRect(6.5, 6.5, size - 13, size - 13, radius - 6);
    graphics.generateTexture(key, size, size);
    graphics.destroy();
    return key;
}

styleConsoleButton(button, options = {}) {
    if (!button) return button;
    const { compact = false } = options;
    if (button.btn_indent_base) {
        button.btn_indent_base.destroy();
        button.btn_indent_base = null;
    }

    if (button.btn_active_bar) {
        button.btn_active_bar.destroy();
        button.btn_active_bar = null;
    }

    if (button.btn_icon_chip) {
        button.btn_icon_chip.destroy();
        button.btn_icon_chip = null;
    }

    if (button.btn_image) {
        button.btn_image.setScale(compact ? 0.7 : 0.72, compact ? 0.74 : 0.78);
        button.btn_image.setY(0);
    }
    this.layoutButtonIconText(button);
    if (button.btn_text) {
        button.btn_text.setFontFamily(config.ButtonFont);
        button.btn_text.setFontSize(compact ? 38 : 56);
        button.btn_text.setY(0);
    }
    button.btn_text.setFontStyle('bold');
    button.btn_text.setLetterSpacing(0);
    button.btn_text.setShadow(0, 0, '#000000', 0, false, false);
    button.btn_text.setStroke('#000000', 0);
    return button;
}

applyEmbeddedLabelButton(button, textureKey, options = {}) {
    if (!button?.btn_image) return button;
    const { scaleX = 0.68, scaleY = 0.68 } = options;

    button.btn_image.setTexture(textureKey);
    button.btn_image.clearTint();
    button.btn_image.setScale(scaleX, scaleY);

    if (button.btn_text) {
        button.btn_text.setText('');
        button.btn_text.setVisible(false);
    }

    return button;
}

applyUtilityLabelButton(button, options = {}) {
    if (!button?.btn_image) return button;
    const {
        textureKey = assets.blank_button,
        scaleX = 0.62,
        scaleY = 0.62,
        fontSize = '40px',
    } = options;

    button.btn_image.setTexture(textureKey);
    button.btn_image.clearTint();
    button.btn_image.setScale(scaleX, scaleY);

    if (button.btn_text) {
        button.btn_text.setVisible(true);
        button.btn_text.setFontFamily(config.ButtonFont);
        button.btn_text.setFontSize(fontSize);
        button.btn_text.setColor('#ffffff');
        button.btn_text.setFontStyle('bold');
        button.btn_text.setLetterSpacing(0);
        button.btn_text.setShadow(0, 0, '#000000', 0, false, false);
        button.btn_text.setStroke('#000000', 0);
    }

    return button;
}

createAuthButtonTexture(key, width, height, options = {}) {
    if (this.textures.exists(key)) return key;

    const {
        primary = false,
        radius = Math.round(height / 2),
    } = options;

    const graphics = this.make.graphics({ add: false });

    // Exact source styling copied from:
    // src/assets/scss/views/auth/_login.scss
    // - .auth-intro-actions .guest-entry-btn
    // - .auth-intro-actions .about-entry-btn

    if (primary) {
        graphics.fillStyle(0x42d985, 0.22);
        graphics.fillRoundedRect(0, 12, width, height, radius);
        graphics.fillGradientStyle(
            0x8dfcb3, 0x8dfcb3,
            0x42d985, 0x42d985,
            1, 1, 1, 1
        );
        graphics.fillRoundedRect(0, 0, width, height, radius);
    } else {
        graphics.fillStyle(0xffffff, 0.06);
        graphics.fillRoundedRect(0, 0, width, height, radius);
        graphics.lineStyle(2, 0x89d5ff, 0.45);
        graphics.strokeRoundedRect(1.5, 1.5, width - 3, height - 3, radius);
    }

    graphics.generateTexture(key, width, height);
    graphics.destroy();
    return key;
}

ensureGameUiTextures() {
    this.createGlassTexture('ui_console_auth_shell', 1040, 336, {
        radius: 42,
        top: 0x10314b,
        bottom: 0x081e31,
        border: 0x4b7391,
        innerBorder: 0x264e68,
        shadow: 0x020c15,
        shadowAlpha: 0.36,
        simple: true,
    });
    this.createGlassTexture('ui_console_auth_block', 360, 108, {
        radius: 30,
        top: 0x0b2337,
        bottom: 0x071a2a,
        border: 0x345672,
        innerBorder: 0x16364d,
        shadow: 0x020c15,
        shadowAlpha: 0.24,
        simple: true,
    });
    this.createGlassTexture('ui_console_auth_prompt', 568, 108, {
        radius: 30,
        top: 0x0d2840,
        bottom: 0x081d2e,
        border: 0x3d617d,
        innerBorder: 0x1f435d,
        shadow: 0x020c15,
        shadowAlpha: 0.24,
        simple: true,
    });
    this.createGlassTexture('ui_console_panel', 1000, 330, {
        radius: 40,
        top: 0x485260,
        bottom: 0x2a313b,
        border: 0xc8d2dd,
        innerBorder: 0x748393,
        shadow: 0x11161c,
        shadowAlpha: 0.3,
        simple: true,
    });
    this.createGlassTexture('ui_console_stack', 330, 98, {
        radius: 28,
        top: 0x5b6674,
        bottom: 0x333b46,
        border: 0xd7dee6,
        innerBorder: 0x788695,
        shadow: 0x11161c,
        shadowAlpha: 0.26,
        simple: true,
    });
    this.createGlassTexture('ui_console_prompt', 560, 98, {
        radius: 28,
        top: 0x596574,
        bottom: 0x313945,
        border: 0xd7dee6,
        innerBorder: 0x788695,
        shadow: 0x11161c,
        shadowAlpha: 0.26,
        simple: true,
    });
    this.createGlassTexture('ui_console_actions', 936, 184, {
        radius: 32,
        top: 0x4c5765,
        bottom: 0x2d353f,
        border: 0xc9d2dd,
        innerBorder: 0x748393,
        shadow: 0x11161c,
        shadowAlpha: 0.28,
        simple: true,
    });
    this.createAuthButtonTexture('ui_btn_primary', 380, 84, { primary: true, radius: 30 });
    this.createAuthButtonTexture('ui_btn_secondary', 380, 84, { primary: false, radius: 30 });
    this.createGlassTexture('ui_btn_positive', 380, 84, {
        radius: 30,
        top: 0x7effd0,
        bottom: 0x28c893,
        border: 0xd9fff1,
        innerBorder: 0x7af0cc,
        shadow: 0x0f6a4f,
        shadowAlpha: 0.24,
        simple: true,
    });
    this.createGlassTexture('ui_btn_warning', 380, 84, {
        radius: 30,
        top: 0xff8f98,
        bottom: 0xd94c5f,
        border: 0xffe2e6,
        innerBorder: 0xffb2ba,
        shadow: 0x131920,
        shadowAlpha: 0.2,
        simple: true,
    });
    this.createAuthButtonTexture('ui_btn_preset', 254, 78, { primary: false, radius: 26 });
    this.createAuthButtonTexture('ui_btn_preset_positive', 254, 78, { primary: true, radius: 26 });
    this.createGlassTexture('ui_btn_preset_warning', 254, 78, {
        radius: 26,
        top: 0xff8f98,
        bottom: 0xd94c5f,
        border: 0xffe2e6,
        innerBorder: 0xffb2ba,
        shadow: 0x131920,
        shadowAlpha: 0.24,
        simple: true,
    });
    this.createIconChipTexture('ui_btn_icon_chip');
}

updateFooterStackLayout() {
    if (!this.oFooter?.player_price_base || !this.oFooter?.chip_icon || !this.oFooter?.txt_player_price) return;

    const spacing = 16;
    const totalWidth = this.oFooter.chip_icon.displayWidth + spacing + this.oFooter.txt_player_price.displayWidth;
    this.oFooter.chip_icon.setX(this.oFooter.player_price_base.x - totalWidth / 2 + this.oFooter.chip_icon.displayWidth / 2);
    this.oFooter.txt_player_price.setX(
        this.oFooter.chip_icon.x + this.oFooter.chip_icon.displayWidth / 2 + spacing + this.oFooter.txt_player_price.displayWidth / 2
    );
}

setConsolePrompt(label = 'Waiting for turn') {
    if (!this.oFooter?.txt_action_hint) return;
    this.oFooter.txt_action_hint.setText(label);
    if (this.oFooter.txt_action_hint.setWordWrapWidth) {
        this.oFooter.txt_action_hint.setWordWrapWidth(this.oFooter.action_prompt_wrap_width || 360);
    }

    const sLabel = String(label || '');
    const bEmpty = sLabel.trim().length === 0;
    const bWaiting = /^waiting/i.test(sLabel);
    const bRaiseBuilder = /^set your raise/i.test(sLabel);
    const bRaiseReview = /^confirm your raise/i.test(sLabel);

    if (this.oFooter?.txt_action_state) {
        this.oFooter.txt_action_state.setText(
            bWaiting ? 'TABLE STATUS' : (bRaiseBuilder ? 'RAISE BUILDER' : (bRaiseReview ? 'RAISE REVIEW' : (bEmpty ? 'YOUR TURN' : 'ACTION READY')))
        );
        this.oFooter.txt_action_state.setY(bEmpty ? this.oFooter.action_prompt_base.y - 2 : this.oFooter.action_state_y);
    }

    this.oFooter.txt_action_hint.setAlpha(bEmpty ? 0 : 1);
    this.oFooter.txt_action_hint.setY(this.oFooter.action_hint_y);

    if (this.oFooter?.turn_indicator) {
        const fill = bWaiting ? 0x4e7390 : (bRaiseReview ? 0xffd564 : (bEmpty ? 0x79d6ff : 0x7df7cf));
        this.oFooter.turn_indicator.setFillStyle(fill, 1);
    }

    if (this.oFooter?.turn_indicator_glow) {
        this.oFooter.turn_indicator_glow.setFillStyle(bWaiting ? 0x4f84ad : (bRaiseReview ? 0xffd564 : 0x5ec4ff), 1);
        this.oFooter.turn_indicator_glow.setAlpha(bWaiting ? 0.12 : (bEmpty ? 0.3 : 0.26));
    }
}

    // Header: ping, settings, and exit buttons.
    setHeader() {
        const btn_setting = new Button(this, 84, 88, { texture: assets.btn_setting, scaleX: 0.72, scaleY: 0.72 }, () => {
            btn_setting.setVisible(false);
            this.settings.open();
        });
        this.container_header.add(btn_setting);

        const btn_exit = new Button(this, config.width - 84, btn_setting.y, { texture: assets.btn_exit, scaleX: 0.72, scaleY: 0.72 }, () => {
            this.popup.open({
                confirm: true, title: 'EXIT', message: this.oGameManager.exitMessage, callback: () => {
                    this.reqLeaveGame();
                }
            });
        });
        this.container_header.add(btn_exit);

        this.oHeader = { btn_setting: btn_setting, btn_exit: btn_exit };
    }

    // Table: felt background and private table code overlay.
    setTable() {
        // Private table overlay container
        const container_private_table = this.add.container(0, 0).setVisible(false);
        this.container_table.add(container_private_table);

        // Tint overlay
        const privateTint = this.add.rectangle(config.centerX, config.centerY, config.width, config.height, 0x000000, 0.38)
            .setOrigin(0.5)
            .setVisible(false);
        container_private_table.add(privateTint);

        // Lock icon
        const lockIcon = this.add.image(config.centerX, 170, 'privateTable_icon').setScale(0.32).setAlpha(0.92).setVisible(false);
        container_private_table.add(lockIcon);

        // Banner
        const banner = this.add.rectangle(config.centerX, 230, 540, 64, 0x1b5e8d, 0.92)
            .setOrigin(0.5)
            .setVisible(false);
        container_private_table.add(banner);
        const bannerText = this.add.text(config.centerX, 230, 'PRIVATE TABLE', {
            fontSize: '38px',
            fontFamily: config.CommonFont,
            color: '#ffd564',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0.98).setVisible(false);
        container_private_table.add(bannerText);

        // Message and code
        const txt_privateTableMessage = this.add.text(config.centerX, 300, 'Share this code with your friends to join this table!', { fontSize: '30px', fontFamily: config.CommonFont, color: '#ffffff' }).setAlpha(0.92).setOrigin(0.5);
        txt_privateTableMessage.setWordWrapWidth(760);
        container_private_table.add(txt_privateTableMessage);
        const code_base = this.add.image(config.centerX, txt_privateTableMessage.y + txt_privateTableMessage.displayHeight + 34, assets.black_base).setScale(0.62);
        container_private_table.add(code_base);
        const txt_privateTableCode = this.add.text(code_base.x, code_base.y, '123456', { fontSize: '34px', fontFamily: config.CommonFont, color: '#ffffff' }).setOrigin(0.5);
        container_private_table.add(txt_privateTableCode);

        // Copy code toast
        const tostMessage = this.add.text(code_base.x, code_base.y + code_base.displayHeight * 0.8, 'Code copied!', { fontSize: '28px', fontFamily: config.CommonFont, color: '#ffffff' }).setAlpha(0.92).setOrigin(0.5).setVisible(false);
        container_private_table.add(tostMessage);

        // Copy button
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

        // Deck card (hidden â€” not shown at this time)
        const { scale: communityCardScale } = this.getCommunityCardLayoutMetrics();
        const deckPosition = this.getDeckCardPosition();
        const close_deck_card = this.add
            .image(deckPosition.x, deckPosition.y, assets.card_deck)
            .setScale(communityCardScale)
            .setVisible(false);
        this.container_table.add(close_deck_card);

        // Show overlay if private
        if (this.sPrivateCode) {
            txt_privateTableCode.setText(this.sPrivateCode);
            container_private_table.setVisible(true);
            privateTint.setVisible(true);
            lockIcon.setVisible(true);
            banner.setVisible(true);
            bannerText.setVisible(true);
            this.table.setTexture(assets.private_table);
        }
        this.oTable = {
            close_deck_card: close_deck_card,
            container_private_table: container_private_table,
        }
    }

    // Footer: player chip stack, bet display, and action prompts.
    setFooter() {
        const footerY = config.height - 128;
        const action_tray = this.add.zone(config.centerX, footerY, 10, 10);
        this.container_footer.add(action_tray);

        this.oFooter = {
            footer: null,
            action_tray,
            player_price_base: null,
            txt_player_price: null,
            chip_icon: null,
            txt_stack_label: null,
            action_prompt_base: null,
            action_state_y: 0,
            action_hint_y: 0,
            txt_action_state: null,
            txt_action_hint: null,
            turn_indicator: null,
            turn_indicator_glow: null,
            action_prompt_wrap_width: 0,
            slot_positions: {
                leftTopX: config.centerX - 220,
                rightTopX: config.centerX + 220,
                leftBottomX: config.centerX - 220,
                rightBottomX: config.centerX + 220,
                mainTopY: config.height - 210,
                mainBottomY: config.height - 112,
                raiseLeftX: config.centerX - 288,
                raiseCenterX: config.centerX,
                raiseRightX: config.centerX + 288,
                raiseTopY: config.height - 210,
                raiseBottomY: config.height - 112,
                confirmY: config.height - 160,
            },
        };
        this.updateFooterStackLayout();
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
    this.container_buttons.buttonKeys = ['btn_fold', 'btn_call', 'btn_check', 'btn_raise', 'btn_split', 'btn_stand'];
    this.container_raise_buttons.buttonKeys = ['btn_min', 'btn_halfPot', 'btn_fullPot', 'btn_doubleDown', 'btn_cancel'];
    this.container_confirm_raise.buttonKeys = ['btn_confirmRaise', 'btn_standRaise', 'btn_cancelRaise'];

    this.oButtons = {
        btn_fold: this.createGameActionButtonState('fold', 'Fold', 'secondary'),
        btn_call: this.createGameActionButtonState('call', 'Call', 'primary'),
        btn_check: this.createGameActionButtonState('check', 'Check', 'secondary'),
        btn_raise: this.createGameActionButtonState('raise', 'Raise', 'primary'),
        btn_doubleDown: this.createGameActionButtonState('doubleDown', 'Double Down', 'primary'),
        btn_split: this.createGameActionButtonState('split', 'Split', 'primary'),
        btn_stand: this.createGameActionButtonState('stand', 'Stand', 'secondary'),
        btn_min: this.createGameActionButtonState('minRaise', 'MIN', 'secondary'),
        btn_halfPot: this.createGameActionButtonState('halfPotRaise', '1/2 Pot', 'secondary'),
        btn_fullPot: this.createGameActionButtonState('fullPotRaise', 'Pot', 'secondary'),
        btn_allIn: this.createGameActionButtonState('allInRaise', 'All In', 'primary'),
        btn_allInCommon: this.createGameActionButtonState('allIn', 'All In', 'primary'),
        btn_cancel: this.createGameActionButtonState('cancelRaiseBuilder', 'Cancel', 'secondary'),
        btn_confirmRaise: this.createGameActionButtonState('confirmRaise', 'Confirm', 'primary'),
        btn_standRaise: this.createGameActionButtonState('standRaise', 'Stand', 'secondary'),
        btn_cancelRaise: this.createGameActionButtonState('cancelRaiseConfirm', 'Cancel', 'secondary'),
        btn_declare: this.createGameActionButtonState('declare', 'Declare', 'primary'),
    };

    this.layoutActionButtonGroups();
}

createFloatSplitButton() {
    const btnW = 172;
    const btnH = 66;
    const r = 33;

    const container = this.add.container(0, 0).setVisible(false);

    const bg = this.add.graphics();
    const drawDefault = () => {
        bg.clear();
        bg.fillStyle(0x061828, 0.90);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, r);
        bg.fillStyle(0x48d8ff, 0.08);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, r);
        bg.lineStyle(2.5, 0x48d8ff, 0.95);
        bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, r);
        bg.lineStyle(1, 0xffffff, 0.10);
        bg.strokeRoundedRect(-btnW / 2 + 2, -btnH / 2 + 2, btnW - 4, btnH - 4, Math.max(4, r - 2));
    };
    const drawHover = () => {
        bg.clear();
        bg.fillStyle(0x0d3a6e, 1);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, r);
        bg.lineStyle(3, 0x88eeff, 1);
        bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, r);
    };
    drawDefault();

    const label = this.add.text(0, 1, 'SPLIT', {
        fontSize: '30px',
        fontFamily: config.playerFontBold || 'Arial',
        color: '#48d8ff',
        fontStyle: 'bold',
        resolution: 2,
    }).setOrigin(0.5);

    container.add(bg);
    container.add(label);
    container.setSize(btnW, btnH);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => {
        if (!this.isMyTurn) return;
        this.hideAllButtons();
        this.oSocketManager.emit(emitter.reqSplit);
    });
    container.on('pointerover', drawHover);
    container.on('pointerout', drawDefault);

    this.floatSplitBtn = container;
}

    setPotAmount() {
        const potPosition = this.getPotTargetPosition();
        this.oPotAmount = new PotDisplay(this, potPosition.x, potPosition.y).setAmount(0);
        this.container_pot_amount.add(this.oPotAmount);
        this.updatePotPosition({ animate: false });
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
        const aSeatProfileOrder = _.getPreferredSeatProfileOrder();
        for (let i = 0; i < aSeats.length; i++) {
            const nSeatProfileIndex = aSeatProfileOrder[i] ?? i;
            this.aPlayerProfiles[aSeats[i]] = this.aAllPlayerProfiles[nSeatProfileIndex];
        }
    }
    setSceneDepths() {
        this.container_body?.setDepth(0);
        this.container_table?.setDepth(20);
        this.container_closed_cards?.setDepth(30);
        this.container_community_cards?.setDepth(40);
        this.container_bet_staging?.setDepth(45);
        this.container_player_cards?.setDepth(50);
        this.container_pot_amount?.setDepth(60);
        this.container_header?.setDepth(70);
        this.container_footer?.setDepth(80);
        this.container_buttons?.setDepth(90);
        this.container_raise_buttons?.setDepth(91);
        this.container_confirm_raise?.setDepth(92);
        this.container_player_profiles?.setDepth(120);
        this.prompt?.setDepth(300);
        this.gameInfo?.setDepth(310);
        this.settings?.setDepth(320);
        this.popup?.setDepth(330);
    }
    editorCreate() {
        const tableImageOffsetY = this.getTableImageOffsetY();
        const playfieldOffsetY = this.getPlayfieldOffsetY();
        const headerOffsetY = config.isDesktopLayout() ? playfieldOffsetY : 0;
        this.container_body = this.add.container(0, 0);
        const bg = this.add.image(config.centerX, config.centerY, assets.game_bg);
        bg.setDisplaySize(config.width, config.height);
        this.container_body.add(bg);
        this.table = this.add.image(config.centerX, config.centerY + 8 + tableImageOffsetY, assets.table);
        const tableCoverScale = Math.max(config.width / this.table.width, config.height / this.table.height) * 0.9;
        this.table.setScale(tableCoverScale);
        this.container_body.add(this.table);
        this.container_header = this.add.container(0, 0);
        this.container_pot_amount = this.add.container(0, 0);
        this.container_community_cards = this.add.container(0, 0);
        this.container_table = this.add.container(0, 0);
        this.container_bet_staging = this.add.container(0, 0);
        this.container_closed_cards = this.add.container(0, 0);
        this.container_player_cards = this.add.container(0, 0);
        this.container_player_profiles = this.add.container(0, 0);
        this.container_footer = this.add.container(0, 0);
        this.container_buttons = this.add.container(0, 0).setVisible(false);
        this.container_raise_buttons = this.add.container(0, 0).setVisible(false);
        this.container_confirm_raise = this.add.container(0, 0).setVisible(false);
        this.prompt = new Prompt(this, config.centerX, config.centerY - 40, 'Please wait for other players to join');
        this.prompt.hide();
        this.settings = new Settings(this, -200, 250);
        this.oChipAnimationController = null;
        this.potAnimationQueue = Promise.resolve();
        this.stagedBetPiles = new Map();
        this.container_body.setY(playfieldOffsetY);
        this.container_header.setY(headerOffsetY);
        this.container_pot_amount.setY(playfieldOffsetY);
        this.container_community_cards.setY(playfieldOffsetY);
        this.container_table.setY(playfieldOffsetY);
        this.container_bet_staging.setY(playfieldOffsetY);
        this.container_closed_cards.setY(playfieldOffsetY);
        this.container_player_cards.setY(playfieldOffsetY);
        this.container_player_profiles.setY(playfieldOffsetY);
        this.container_footer.setY(playfieldOffsetY);
        this.container_buttons.setY(playfieldOffsetY);
        this.container_raise_buttons.setY(playfieldOffsetY);
        this.container_confirm_raise.setY(playfieldOffsetY);
        this.ensureGameUiTextures();
        this.setHeader();
        this.gameInfo = new GameInfo(this, config.centerX, config.centerY, this.oGameManager.oGameInfo);
        this.gameInfo.close();
        this.popup = new Popup(this, config.centerX, config.centerY, { title: 'EXIT', message: 'Are you sure you want to leave this table?' }).setScale(0.8);
        this.popup.close();
        this.setPotAmount();
        this.setTable();
        this.setFooter();
        this.setButtons();
        this.createFloatSplitButton();
        this.container_community_cards.add(this.floatSplitBtn);
        this.createPlayerProfiles();
        this.setSceneDepths();

    }

    // Connects SocketManager using sAuthToken + iBoardId.
    makeSocketConnection() {
        this.oSocketManager = new SocketManager(this, {
            sAuthToken: this.sAuthToken,
            iBoardId: this.iBoardId,
        });
    }
    init({ sAuthToken, iBoardId, sPrivateCode, isGuestTutorial = false, fallbackPath = '/lobby' }) {
        this.sAuthToken = sAuthToken;
        this.iBoardId = iBoardId;
        this.sPrivateCode = sPrivateCode;
        this.isGuestTutorial = Boolean(isGuestTutorial);
        this.fallbackPath = fallbackPath;
    }

    // Scene boot: initializes state, builds UI, connects socket, binds events.
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
        this.isOverlayReady = false;
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
        this.oServices = new Services({ sRoot: getApiRoot(), authorization: this.sAuthToken });

        // Build base UI containers and scaffolding.
        this.editorCreate();
        this.initializeGameUILayout();
        this.bindGameUILayoutEvents();
        this.bindGameActionOverlayEvents();
        this.registerFXOverlayPotAnchor();
        this.scale.on('resize', this.registerFXOverlayPotAnchor, this);
        window.FXOverlay?.enable?.();
        window.FXOverlay?.setSoundEnabled?.(this.oSoundManager.isSoundOn);
        window.FXOverlay?.setMusicEnabled?.(this.oSoundManager.isMusicOn);
        // Fetch player settings (sound/music) and apply to sound manager.
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
        // Exit game on tab hide or browser back â€” prevents desync and seat abuse.
        window.addEventListener('visibilitychange', this.visibilityChangeHandler);
        window.addEventListener('popstate', this.popStateHandler);
        this.events.once('shutdown', this.cleanupGameBindings, this);
        this.events.once('destroy', this.cleanupGameBindings, this);
    }
    setCardHand({ aCardHand, nCardScore }) {
        this.oTable.container_private_table.setVisible(false);
        const playersArray = Array.from(this.players.values());
        const myPlayer = this.players.get(this.iUserId);
        const dealerIndex = playersArray.findIndex(player => player?.iUserId === this.iDealerId);
        const reorderedPlayers = dealerIndex >= 0
            ? [...playersArray.slice(dealerIndex), ...playersArray.slice(0, dealerIndex)]
            : playersArray;
        const aIncomingHand = Array.isArray(aCardHand) ? aCardHand : [];

        // Keep the player data snapshot in sync so canShowSplitAction() can read hole cards.
        if (myPlayer) myPlayer.aCardHand = aIncomingHand;

        if (this.playerHandNeedsReset(myPlayer, aIncomingHand)) {
            myPlayer?.playerProfile?.container_cards?.removeAll(true);
        }

        const aNewCards = aIncomingHand.filter(cardData => !this.playerHasRenderedCard(myPlayer, cardData?._id));

        reorderedPlayers.forEach(player => {
            if (!player?.playerProfile?.container_cards) return;
            if (player?.iUserId == this.iUserId) {
                this.syncPlayerScoreDisplay(player, nCardScore, aIncomingHand);
            }
            const nRenderedCards = player.playerProfile.container_cards.list.length;
            if (nRenderedCards > aIncomingHand.length) {
                player.playerProfile.container_cards.removeAll(true);
            }
        });

        aNewCards.forEach((cardData, cardIndex) => {
            reorderedPlayers.forEach((player, playerIndex) => {
                if (!player?.playerProfile) return;

                if (player?.iUserId === this.iUserId) {
                    if (this.playerHasRenderedCard(player, cardData._id)) return;
                    this.animateCard(cardData, cardIndex, player, playerIndex);
                    return;
                }

                if (player?.playerProfile?.container_cards?.list?.length >= aIncomingHand.length) return;

                this.animateCard({
                    ...cardData,
                    _id: `${cardData._id}_${player.iUserId}_${cardIndex}`,
                }, cardIndex, player, playerIndex);
            });
        });
    }
    animateCard(cardData, cardIndex, player, playerIndex, targetContainer = null) {
        this.createCard(cardData, player, null, targetContainer);
    }
    async createCard(cardData, player, animatedCard, targetContainer = null) {
        if (this.playerHasRenderedCard(player, cardData?._id)) return;

        const container = targetContainer || player?.playerProfile?.container_cards;
        if (!container) return;

        const cardSpacing = 25;
        const cardTiltAngle = 15;
        const cardCount = container.list.length;
        const card = new Card(this, 0, 0, cardData.eSuit, cardData.nLabel, cardData.nValue, cardData._id);

        if (cardCount > 0) {
            const totalWidth = (cardCount + 1) * cardSpacing;
            const startX = -totalWidth / 2;
            card.setX(startX + cardCount * cardSpacing);
            card.setAngle(cardTiltAngle * (cardCount - cardCount / 2));

            container.list.forEach((existingCard, index) => {
                existingCard.setX(startX + index * cardSpacing);
                existingCard.setAngle(cardTiltAngle * (index - cardCount / 2));
            });
        }

        container.setVisible(true);
        container.add(card);
        // Open own cards regardless of which container they went into
        const cardsList = container.list || [];
        for (let index = 0; index < cardsList.length; index++) {
            const card = cardsList[index];
            if (player?.iUserId === this.iUserId) {
                card.openCard();
            } else {
                card.closeCard();
            }
        }
    }
    waitingForGameStart({ nInitializeTimer, nRoundStartsIn }) {
        this.prompt.hide();
        if (nRoundStartsIn) {
            this.waitingForNextRoundStart(Math.round(nRoundStartsIn / 1000));
            return;
        }
        this.declreResultInterval && clearInterval(this.declreResultInterval);
        this.timer && clearInterval(this.timer);
    }
    waitingForNextRoundStart(remainingTime) {
        this.timer && clearInterval(this.timer);
        this.declreResultInterval && clearInterval(this.declreResultInterval);
        this.prompt.hide();
    }
    waitingForNextRound() {
        this.resetCheckCommitments();
        // Don't wipe community cards while the hand-result display window is active
        if (!this.bShowingHandResult) {
            this.container_community_cards.setVisible(false);
            if (this.floatSplitBtn) {
                this.container_community_cards.remove(this.floatSplitBtn, false);
                this.floatSplitBtn.setVisible(false);
            }
            this.container_community_cards.removeAll(true);
            if (this.floatSplitBtn) {
                this.container_community_cards.add(this.floatSplitBtn);
            }
        }
        this.oTable.close_deck_card.setVisible(false);
        this.aPlayerProfiles.forEach(player => {
            player.container_cards.removeAll(true).setVisible(false);
        });
    }
    startGame() {
        this.prompt.hide();
        this.oTable.container_private_table.setVisible(false);
        this.container_community_cards.setVisible(true);
    }

    resetCheckCommitments() {
        if (!this.checkedCommitments) this.checkedCommitments = new Map();
        this.checkedCommitments.clear();
        this.raiseSequence = 0;
    }

    markCheckCommitment(iUserId) {
        if (!this.checkedCommitments) this.checkedCommitments = new Map();
        this.checkedCommitments.set(Number(iUserId), this.raiseSequence ?? 0);
    }

    markRaiseOccurred() {
        this.raiseSequence = (this.raiseSequence ?? 0) + 1;
    }

    hasRaiseSinceCheck(iUserId) {
        if (!this.checkedCommitments?.has(Number(iUserId))) return false;
        return (this.raiseSequence ?? 0) > this.checkedCommitments.get(Number(iUserId));
    }
    async findMyPlayer(aParticipant) {
        // Primary: match by socket ID (most reliable when socket just connected)
        for (let i = 0; i < aParticipant.length; i++) {
            if (aParticipant[i].sRootSocket === this.oSocketManager.sRootSocket) {
                this.iUserId = aParticipant[i].iUserId;
                return aParticipant[i];
            }
        }
        // Fallback: match by previously stored iUserId (handles mid-hand reconnect
        // where socket ID in board hasn't updated yet)
        if (this.iUserId) {
            for (let i = 0; i < aParticipant.length; i++) {
                if (String(aParticipant[i].iUserId) === String(this.iUserId)) {
                    return aParticipant[i];
                }
            }
        }
        return undefined;
    }
    async setGameData({ _id, aCommunityCard, iBigBlindId, iDealerId, iSmallBlindId, nTableChips, nDeck, aWinningAmount, nMaxPlayer, eState, ePokerType, nMaxTableAmount, nMinBuyIn, nMaxBuyIn, nMinBet, nMaxBet, iUserTurn, nTurnTime, nGraceTime, nTableRound, aOpenDeck, oWildJoker, oSetting, aParticipant, oGameInfo, oTutorial }) {
        try {
            this.clearStagedBetPiles();
            this.oGameManager.oGameInfo = oGameInfo;
            this.oGameManager.nMaxPlayer = nMaxPlayer;
            this.oGameManager.oSetting = oSetting;
            this.oTutorialState = oTutorial || null;
            this.iDealerId = iDealerId;
            this.iBigBlindId = iBigBlindId;
            this.iSmallBlindId = iSmallBlindId;
            const myPlayer = await this.findMyPlayer(aParticipant);
            if (!myPlayer) {
                console.error('[setGameData] Could not match current player in participant list â€” skipping seat setup');
                return;
            }
            this.arrangeSeats(myPlayer.nSeat);
            this.updatePotAmount(nTableChips);
            this.checkGameEState(eState);
            await this.setPlayersData(aParticipant);
            this.setCommunityCards(aCommunityCard);
            // Render the current player's cards if joining mid-hand (reconnect with hand in progress)
            const me = this.players.get(this.iUserId);
            if (Array.isArray(me?.aCardHand) && me.aCardHand.length > 0) {
                this.setCardHand({ aCardHand: me.aCardHand, nCardScore: me.nCardScore });
            }
            this.setDealerAndBlind();
            this.syncTutorialState(this.oTutorialState);
            this.nTableRound = Number(nTableRound) || 1;
            this.isOverlayReady = true;
            this.syncGameActionOverlay();
            // If resPlayerTurn arrived before setPlayersData finished, apply it now
            if (this.oPendingTurn) {
                const pending = this.oPendingTurn;
                this.oPendingTurn = null;
                await this.setPlayerTurn(pending);
            }
        } catch (error) {
            console.error("Error while setting game data:", error);
        }
    }
    updatePotAmount(nTableChips) {
        this.commitPotAmount(nTableChips);
    }
    handleDoubleDown(oData, sEventName) {
        const player = this.players.get(oData.iUserId);
        const potIncrease = Math.max(0, Number(oData.nTableChips || 0) - Number(this.oGameManager.nPotAmount || 0));
        const nUpdatedScore = Number(oData.nCardScore);

        const playerNewCards = [];
        this.oSoundManager.playSound(this.oSoundManager.doubleDown_sound, false);
        player?.playerProfile?.setAmountIn(oData.nChips);
        this.syncPlayerScoreDisplay(player, nUpdatedScore, oData.aCardHand || [oData.oCard].filter(Boolean));
        if (oData.iUserId !== this.iUserId && sEventName === 'resDoubledown') {
            player?.playerProfile?.setBettingLabel('DD', oData.nLastBidChips);
        }
        if (potIncrease > 0) {
            this.queuePotUpdate({
                amount: potIncrease,
                targetAmount: oData.nTableChips,
                playerProfile: player?.playerProfile,
                effectName: Number(oData.nChips) === 0 ? 'allIn' : 'bigBet',
            });
        } else {
            this.updatePotAmount(oData.nTableChips);
        }
        player.iUserId == this.iUserId && this.setAmountIn(oData.nChips);
        this.playDoubleDownMomentFX(player?.playerProfile, {
            isSelf: oData.iUserId === this.iUserId,
            text: 'DOUBLE DOWN!',
            duration: 2400,
        });
        playerNewCards.push(oData.oCard);
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
    handleSplit(oData) {
        const player = this.players.get(oData.iUserId);
        if (!player) return;

        // Update player state
        player.bHasSplit = true;
        if (player.iUserId === this.iUserId) {
            const myPlayer = this.players.get(this.iUserId);
            if (myPlayer) {
                myPlayer.aCardHand = Array.isArray(oData.aCardHand) ? oData.aCardHand : myPlayer.aCardHand;
                myPlayer.bHasSplit = true;
            }
            this.setMyPlayerData(oData);
        }
        player?.playerProfile?.setAmountIn(oData.nChips);

        // Animate community card copy â†’ split hand container (visual: paired card starts the split hand)
        if (oData.oCommunityCard) {
            this.animateCard(oData.oCommunityCard, 1, player, 1, player?.playerProfile?.container_split_cards);
        }

        // Animate new main-hand private card â†’ main hand container
        if (oData.oMainCard) {
            this.animateCard(oData.oMainCard, 2, player, 2);
        }

        // Animate new split-hand private card â†’ split hand container
        if (oData.oSplitCard) {
            this.animateCard(oData.oSplitCard, 3, player, 3, player?.playerProfile?.container_split_cards);
        }

        // Update pot for split cost
        const potIncrease = Math.max(0, Number(oData.nTableChips || 0) - Number(this.oGameManager.nPotAmount || 0));
        if (potIncrease > 0) {
            this.queuePotUpdate({
                amount: potIncrease,
                targetAmount: oData.nTableChips,
                playerProfile: player?.playerProfile,
                effectName: 'bigBet',
            });
        } else {
            this.updatePotAmount(oData.nTableChips);
        }

        // Show split hand score badge
        player?.playerProfile?.setSplitHand?.(oData.aSplitHand, oData.nSplitCardScore);

        // Update main hand score display
        this.syncPlayerScoreDisplay(player, oData.nCardScore, oData.aCardHand || []);

        // Hide split button â€” player has split, no second split allowed
        if (this.floatSplitBtn) this.floatSplitBtn.setVisible(false);

        this.oSoundManager.playSound(this.oSoundManager.chipsIn_sound, false);
    }
    handlePlayerBet(oData, sEventName) {
        const player = this.players.get(oData.iUserId);
        if (!player) return;
        const potIncrease = Math.max(0, Number(oData.nTableChips || 0) - Number(this.oGameManager.nPotAmount || 0));
        const isAllInAction = (sEventName === 'resRaise' || sEventName === 'resCall') && Number(oData.nChips) === 0;
        const aParticipantAdjustments = Array.isArray(oData.aParticipantAdjustments) ? oData.aParticipantAdjustments : [];

        player?.playerProfile?.setAmountIn(oData.nChips);
        player?.iUserId == this.iUserId && this.setMyPlayerData(oData);
        aParticipantAdjustments.forEach((participantData) => this.applyParticipantAdjustment(participantData));
        if (potIncrease > 0) {
            if (isAllInAction) {
                this.oSoundManager.playSound(this.oSoundManager.chipsIn_sound, false);
                this.queuePotUpdate({
                    amount: potIncrease,
                    targetAmount: oData.nTableChips,
                    playerProfile: player?.playerProfile,
                    effectName: 'allIn',
                });
            } else if (sEventName === 'resRaise') {
                this.oSoundManager.playSound(this.oSoundManager.chipsIn_sound, false);
                this.queuePotUpdate({
                    amount: potIncrease,
                    targetAmount: oData.nTableChips,
                    playerProfile: player?.playerProfile,
                    effectName: 'bigBet',
                });
            } else if (sEventName === 'resCall') {
                this.oSoundManager.playSound(this.oSoundManager.chipsIn_sound, false);
                this.queuePotUpdate({
                    amount: potIncrease,
                    targetAmount: oData.nTableChips,
                    playerProfile: player?.playerProfile,
                    effectName: 'smallBet',
                });
            }
        } else if (sEventName === 'resCheck') {
            this.oSoundManager.playSound(this.oSoundManager.check_sound, false);
            this.updatePotAmount(oData.nTableChips);
        }
        this.oGameManager.nMinRaiseAmount = oData.nMinBet ?? this.oGameManager.nMinRaiseAmount;
        if (potIncrease <= 0 && sEventName !== 'resCheck') {
            this.updatePotAmount(oData.nTableChips);
        }

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

        if (sEventName === 'resCall') {
            const callAmount = oData.nLastBidChips ?? oData.nCurrentChips ?? 0;
            if (oData.iUserId != this.iUserId) {
                player?.playerProfile?.setBettingLabel(oData.bAllIn ? 'All In' : 'Call', callAmount);
            }
        } else if (sEventName === 'resRaise') {
            this.markRaiseOccurred();
            const raiseAmount = oData.nLastBidChips ?? oData.nCurrentChips ?? 0;
            if (oData.iUserId != this.iUserId) {
                player?.playerProfile?.setBettingLabel('Raised', raiseAmount);
            }
        } else if (sEventName === 'resStand') {
            const logs = this.oGameManager.recentLogs || [];
            const lastRaiseLog = logs.find(log =>
                log.sAction === 'raise+stand' && log.iUserId === oData.iUserId
            );
            const lastCallStandLog = logs.find(log =>
                log.sAction === 'call+stand' && log.iUserId === oData.iUserId
            );
            if (lastRaiseLog) {
                if (oData.iUserId != this.iUserId) {
                    player?.playerProfile?.setBettingLabel('Raise+Stand');
                }
            } else if (lastCallStandLog) {
                if (oData.iUserId != this.iUserId) {
                    player?.playerProfile?.setBettingLabel('Call+Stand');
                }
            } else {
                if (oData.iUserId != this.iUserId) {
                    player?.playerProfile?.setBettingLabel('Stand');
                }
            }
        } else if (sEventName === 'resCheck') {
            this.markCheckCommitment(oData.iUserId);
            if (oData.iUserId != this.iUserId) {
                player?.playerProfile?.setBettingLabel('Check');
            }
        }
    }
    setFoldPlayer(iUserId, eState, sReason, bShowMessage, options = {}) {
        const playAudio = options.playAudio !== false;
        const player = this.players.get(iUserId);
        if (eState === 'fold') {
            playAudio && this.oSoundManager.playSound(this.oSoundManager.fold_sound, false);
            player?.playerProfile.setFolded();
            player?.playerProfile.setVisible(true);
            iUserId !== this.iUserId && player?.playerProfile.setBettingLabel('Fold');
            iUserId == this.iUserId && player?.playerProfile?.container_cards.list.forEach(card => {
                card.closeCard();
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
            player?.playerProfile.showBustPrompt();
            player?.playerProfile.setVisible(true);
            iUserId !== this.iUserId && player?.playerProfile.setBettingLabel('Bust');
        }
    }
    handleCommunityCard(oData) {
        // A new community card has been dealt â€” reset check commitments for the next betting round.
        this.resetCheckCommitments();
        const { aCommunityCard, aParticipant } = oData;
        const aUpdatedParticipants = Array.isArray(aParticipant) ? aParticipant : [];

        setTimeout(() => {
        this.clearAllBettingLabels();
        }, 1000);
        this.flushStagedBetsToPot().finally(() => {
            this.setCommunityCards(aCommunityCard, 'communityCard');
            // Re-evaluate split button now that aCommunityCards is populated.
            // setPlayerTurn may have already fired before this Promise resolved.
            if (this.isMyTurn && this.floatSplitBtn) {
                const canSplit = this.canShowSplitAction();
                if (canSplit) {
                    const cardPos = this.getCommunityCardPosition(0, 1);
                    this.floatSplitBtn.setPosition(cardPos.x, cardPos.y - 120);
                    this.floatSplitBtn.setVisible(true);
                }
            }
        });
        aUpdatedParticipants.forEach((participant) => {
            if (!participant || !this.players.has(participant.iUserId)) return;

            const player = this.players.get(participant.iUserId);
            Object.assign(player, participant);
            player?.playerProfile?.setAmountIn(participant.nChips);

            this.syncPlayerScoreDisplay(player, participant.nCardScore, participant.aCardHand);

            if (participant.bHasSplit) {
                player?.playerProfile?.setSplitHand?.(participant.aSplitHand, participant.nSplitCardScore);
            }

            if (participant.iUserId === this.iUserId) {
                this.setMyPlayerData(participant);
            }
        });
    }
    handleClearBettingLabels() {
    this.clearAllBettingLabels();
    }
    setCommunityCards(aCommunityCards, sType) {
        const { scale: communityCardScale } = this.getCommunityCardLayoutMetrics();

        if (sType === 'communityCard') {
            const nExistingCount = this.container_community_cards.list.filter(item => item !== this.floatSplitBtn).length;
            const aNewCards = aCommunityCards.filter(card =>
                !this.oGameManager.aCommunityCards.some(existingCard => existingCard._id === card._id)
            );

            aNewCards.forEach((card, incomingIndex) => {
                if (!this.oGameManager.aCommunityCards.some(existingCard => existingCard._id === card._id)) {
                    const nTargetIndex = nExistingCount + incomingIndex;
                    const nTargetPosition = this.getCommunityCardPosition(nTargetIndex, nExistingCount + aNewCards.length);

                    this.oGameManager.aCommunityCards.push(card);

                    const card_open = new Card(this, nTargetPosition.x, nTargetPosition.y, card.eSuit, card.nLabel, card.nValue, card._id, card.isJoker);
                    card_open.setScale(communityCardScale);
                    card_open.setAngle(nTargetPosition.angle || 0);
                    card_open.openCard();
                    this.container_community_cards.add(card_open);
                    this.updatePotPosition({ animate: false });
                }
            });

            // If it's already the player's turn when the community card arrives,
            // re-evaluate the split button (handles reconnect / reorder edge cases).
            if (this.isMyTurn && this.floatSplitBtn) {
                const canSplit = this.canShowSplitAction();
                if (canSplit) {
                    const cardPos = this.getCommunityCardPosition(0, 1);
                    this.floatSplitBtn.setPosition(cardPos.x, cardPos.y - 120);
                    this.floatSplitBtn.setVisible(true);
                } else {
                    this.floatSplitBtn.setVisible(false);
                }
            }
        }
        else {
            this.oGameManager.aCommunityCards = aCommunityCards;
            // Remove floatSplitBtn before removeAll(true) to prevent it from being destroyed
            if (this.floatSplitBtn) this.container_community_cards.remove(this.floatSplitBtn, false);
            this.container_community_cards.removeAll(true);
            aCommunityCards.forEach((card, index) => {
                const nPosition = this.getCommunityCardPosition(index, aCommunityCards.length);
                const card_open = new Card(this, nPosition.x, nPosition.y, card.eSuit, card.nLabel, card.nValue, card._id, card.isJoker);
                card_open.setScale(communityCardScale);
                card_open.setAngle(nPosition.angle || 0);
                card_open.openCard();
                this.container_community_cards.add(card_open);
            });
            if (this.floatSplitBtn) this.container_community_cards.add(this.floatSplitBtn);
            this.updatePotPosition({ animate: false });
        }
    }
    setMyPlayerData(myPlayerData) {
        const myPlayer = this.players.get(this.iUserId);
        const nChips = Number(myPlayerData?.nChips);
        const nCardScore = Number(myPlayerData?.nCardScore);

        if (Number.isFinite(nChips)) {
            this.oGameManager.nMyPlayerChips = nChips;
            this.setAmountIn(nChips);
        }

        this.syncPlayerScoreDisplay(myPlayer, nCardScore, myPlayerData?.aCardHand);
    }
    applyParticipantAdjustment(participantData) {
        const iUserId = participantData?.iUserId;
        if (!iUserId || !this.players.has(iUserId)) return;

        const player = this.players.get(iUserId);
        Object.assign(player, participantData);
        player?.playerProfile?.setAmountIn(participantData?.nChips);

        if (iUserId === this.iUserId) {
            this.setMyPlayerData(participantData);
        }
    }
    async setPlayersData(aParticipant) {
        for (let i = 0; i < aParticipant.length; i++) {
            const { iUserId, nSeat } = aParticipant[i];
            if (!this.players.has(iUserId)) {
                const playerProfile = this.aPlayerProfiles[nSeat];
                await this.mapPlayerData(iUserId, { ...aParticipant[i], playerProfile });
            } else {
                const player = this.players.get(iUserId);
                Object.assign(player, aParticipant[i], {
                    playerProfile: player?.playerProfile || this.aPlayerProfiles[nSeat],
                });
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
        const { sUserName, sAvatar, eUserType, eState, nLastBidChips, aCardHand, nChips, nCardScore } = player;
        if (eState === "leave") {
            player?.playerProfile?.setVisible(false);
            iUserId == this.iUserId && this.exitGame();
            return;
        }
        await player?.playerProfile?.setProfile({ sUserName, sAvatar, eUserType });
        await player?.playerProfile?.setBlind(iUserId);
        await player?.playerProfile?.setAmountIn(nChips);
        this.syncPlayerHandSnapshot(player, aCardHand);
        this.syncPlayerScoreDisplay(player, nCardScore, aCardHand);
        this.setFoldPlayer(iUserId, eState, undefined, undefined, { playAudio: false });
        if (iUserId === this.iUserId) {
            this.setAmountIn(nChips);
            this.oGameManager.nMyPlayerChips = nChips;
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
            this.clearStagedBetPiles();
            this.oTutorialState = oTutorial || this.oTutorialState;
            this.iDealerId = iDealerId;
            this.iBigBlindId = iBigBlindId;
            this.iSmallBlindId = iSmallBlindId;
            this.updatePotAmount(nTableChips);
            // Don't wipe community cards while the hand-result display window is active
            if (!this.bShowingHandResult) {
                this.setCommunityCards(aCommunityCard);
            }
            this.checkGameEState(eState);
            const myPlayer = await this.findMyPlayer(aParticipant);
            if (!myPlayer) {
                console.error('[setBoardState] Could not match current player in participant list â€” skipping seat setup');
                return;
            }
            this.arrangeSeats(myPlayer.nSeat);
            await this.setPlayersData(aParticipant);
            // Render the current player's cards if joining mid-hand
            const me = this.players.get(this.iUserId);
            if (Array.isArray(me?.aCardHand) && me.aCardHand.length > 0) {
                this.setCardHand({ aCardHand: me.aCardHand, nCardScore: me.nCardScore });
            }
            this.isFinishGame = false;
            this.setDealerAndBlind();
            this.syncTutorialState(this.oTutorialState);
            this.nTableRound = Number(nTableRound) || 1;
            this.isOverlayReady = true;
            this.syncGameActionOverlay();
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
                this.queuePotUpdate({
                    amount: nBlindAmount,
                    targetAmount: nRunningPot,
                    playerProfile: player.playerProfile,
                    effectName: nBlindAmount >= nBigBlindAmount ? 'bigBet' : 'smallBet',
                });
            }
        });
        if (Number(nTableChips) > Number(this.oGameManager.nPotAmount || 0)) {
            this.oSoundManager.playSound(this.oSoundManager.chipsIn_sound, false);
        }
        if (!aParticipant.some(participant => Math.max(Number(participant.nLastBidChips) || 0, 0) > 0)) {
            this.updatePotAmount(nTableChips);
        }
    }
    setAmountIn(nAmountIn) {
        this.nOverlayTableBankroll = Number(nAmountIn) || 0;
        this.oGameManager.nMyPlayerChips = this.nOverlayTableBankroll;

        this.oFooter?.player_price_base?.setVisible?.(false);
        this.oFooter?.txt_player_price?.setVisible?.(false);
        this.oFooter?.chip_icon?.setVisible?.(false);
        this.oFooter?.txt_stack_label?.setVisible?.(false);

        const myPlayer = this.players?.get?.(this.iUserId);
        myPlayer?.playerProfile?.setAmountIn?.(nAmountIn);
        this.syncGameActionOverlay();
    }
    async resetTurnTimer() {
        if (this.iLastTurnId === this.iUserId) this.hideAllButtons();
        this.clearFXOverlayFocus();
        if (!this.iLastTurnId) return undefined;
        const lastPlayer = await this.players.get(this.iLastTurnId);
        lastPlayer?.playerProfile?.resetTurnTimer();
        return lastPlayer;
    }
    async setPlayerTurn({ iUserId, ttl, initialValue, nTotalTurnTime, aUserAction, nMinBet, nGraceTime, eTurnType, nRemainingInitializeTime, nRemainingRoundStartsIn, nTableChips, toCallAmount, eSplitPhase }) {
        if (nRemainingInitializeTime > 0 || nRemainingRoundStartsIn > 0) {
            this.resetCheckCommitments();
            this.clearStagedBetPiles();
            this.aPlayerProfiles.forEach(player => {
                player.setAlpha(1);
                player.container_cards.removeAll(true);
                player.container_split_cards?.removeAll(true);
                player.container_split_cards?.setVisible(false);
                player.hideBettingLabel();
                player.clearScore?.();
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
        // If player data isn't ready yet (join race condition), defer until setGameData finishes
        if (!this.players.get(iUserId) && iUserId === this.iUserId) {
            this.oPendingTurn = { iUserId, ttl, initialValue, nTotalTurnTime, aUserAction, nMinBet, nGraceTime, eTurnType, nRemainingInitializeTime, nRemainingRoundStartsIn, nTableChips, toCallAmount, eSplitPhase };
            return;
        }        await this.resetTurnTimer();
        const player = await this.players.get(iUserId);
        this.isMyTurn = player?.iUserId === this.iUserId;
        this.iLastTurnId = iUserId;
        this.oGameManager.nMinRaiseAmount = nMinBet;
        this.focusFXOverlayPlayer(player?.playerProfile);

        // Highlight the active split sub-hand for all visible profiles
        if (player?.playerProfile) {
            player.playerProfile.highlightActiveSplitHand(eSplitPhase || 'none');
        }

        if (player?.playerProfile && ttl > 0) {
            const total = nTotalTurnTime > 0 ? nTotalTurnTime : ttl;
            player.playerProfile.startTurnTimer(ttl, total);
        }
        if (player?.iUserId === this.iUserId) {
            this.syncGameActionOverlay();
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
    this.isMyTurn = true;
    this.oTurnContext = { aUserAction, nMinBet, toCallAmount };
    this.hideAllButtons();
    this.container_buttons.setVisible(true);
    this.setConsolePrompt('');

    // Enable all buttons in the main container
    this.enableContainerButtons(this.container_buttons);

    const parsedCallAmount = Number(toCallAmount);
    const fallbackCallAmount = Number(nMinBet);
    const callAmount = Number.isFinite(parsedCallAmount)
        ? parsedCallAmount
        : (Number.isFinite(fallbackCallAmount) ? fallbackCallAmount : 0);
    const canAffordRaise = this.getRaiseContext().maxRaiseAmount >= (Number(nMinBet) || 0);
    // If the local player previously checked and another player since raised,
    // they are committed to an additional community card â€” strip stand, raise, and direct call.
    const iAmCheckCommitted = this.hasRaiseSinceCheck(this.iUserId);
    const actions = Array.isArray(aUserAction) ? aUserAction : [];
    actions.forEach(action => {
        switch (action) {
            case 'f':
                this.oButtons.btn_fold.setVisible(true);
                break;
            case 'c':
                this.oButtons.btn_call.setVisible(true);
                this.oButtons.btn_call.bAllInMode = false;
                this.setCallButtonLabel(callAmount > 0 ? `Call ${_.formatCurrencyWithComa(callAmount)}` : 'Call');
                break;
            case 'r':
                this.oButtons.btn_raise.setVisible(canAffordRaise);
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
            case 'd': {
                const canDD = this.canShowDoubleDownAction();
                this.oButtons.btn_doubleDown.setVisible(canDD);
                if (canDD) {
                    this.setGameActionButtonEnabled(this.oButtons.btn_doubleDown, true);
                    this.oButtons.btn_doubleDown.setAlpha(1);
                }
                break;
            }
            case 'sp': {
                const canSplit = this.canShowSplitAction();
                this.oButtons.btn_split.setVisible(canSplit);
                if (this.floatSplitBtn) {
                    if (canSplit) {
                        const cardPos = this.getCommunityCardPosition(0, 1);
                        this.floatSplitBtn.setPosition(cardPos.x, cardPos.y - 120);
                        this.floatSplitBtn.setVisible(true);
                    } else {
                        this.floatSplitBtn.setVisible(false);
                    }
                }
                const _myPlayer = this.players?.get?.(this.iUserId);
                if (canSplit) {
                    _myPlayer?.playerProfile?.showSplitPreview?.();
                } else if (!_myPlayer?.bHasSplit) {
                    _myPlayer?.playerProfile?.clearSplitHand?.();
                }
                break;
            }
        }
    });

    // Always show the split button on the first community card if a pair exists,
    // regardless of whether the server sent 'sp' in aUserAction.
    if (this.floatSplitBtn) {
        const canSplit = this.canShowSplitAction();
        if (canSplit) {
            const cardPos = this.getCommunityCardPosition(0, 1);
            this.floatSplitBtn.setPosition(cardPos.x, cardPos.y - 120);
            this.floatSplitBtn.setVisible(true);
        } else {
            this.floatSplitBtn.setVisible(false);
        }
    }

    this.layoutActionButtonGroups();
}
canShowDoubleDownAction() {
    const myPlayer = this.players?.get?.(this.iUserId);
    if (myPlayer?.bHasSplit) return false;
    const nCardScore = Number(myPlayer?.nCardScore);
    // DD only in round 2 (after 1st community card). Use server-authoritative nTableRound.
    if (this.nTableRound !== 2) return false;
    return Number.isFinite(nCardScore) && nCardScore >= 9 && nCardScore <= 12;
}
canShowSplitAction() {
    // Split available when: 1 community card dealt, player not yet split,
    // and their hole card (nLabel) matches the community card (nLabel).
    const myPlayer = this.players?.get?.(this.iUserId);
    if (!myPlayer || myPlayer.bHasSplit) return false;

    const communityCards = Array.isArray(this.oGameManager?.aCommunityCards)
        ? this.oGameManager.aCommunityCards
        : [];

    const holeCard = myPlayer?.aCardHand?.[0];
    const communityCard = communityCards[0];

    if (communityCards.length !== 1) return false;
    if (!holeCard || !communityCard) return false;

    return holeCard.nLabel === communityCard.nLabel;
}
   hideAllButtons() {
    this.sRaiseUiMode = null;
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
    this.oButtons.btn_split.setVisible(false);
    if (this.floatSplitBtn) this.floatSplitBtn.setVisible(false);
    this.oButtons.btn_allInCommon.setVisible(false);
    this.oButtons.btn_stand.setVisible(false);
    this.oButtons.btn_stand.bCallStandMode = false;
    this.setStandButtonLabel('Stand');
    this.oButtons.btn_check.setVisible(false);
    this.oButtons.btn_cancel.setVisible(false);
    this.oButtons.btn_confirmRaise.setVisible(false);
    this.oButtons.btn_standRaise.setVisible(false);
    this.oButtons.btn_cancelRaise.setVisible(false);
    this.setConsolePrompt('Waiting for turn');
    this.layoutActionButtonGroups();
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

  // Lock community cards on screen for the result display window
  this.bShowingHandResult = true;
  // Capture the final board cards now — setBoardState may arrive before the
  // timeout fires and clear oGameManager.aCommunityCards, so store locally.
  const _finalCommunityCards = [...(this.oGameManager.aCommunityCards || [])];

  // Show community cards immediately when round ends
  setTimeout(() => {
    // Show community cards first for players to see final board
    if (_finalCommunityCards.length > 0) {
      this.setCommunityCards(_finalCommunityCards);
      this.container_community_cards.setVisible(true);
    }
  }, 500); // Show cards almost immediately

  // Clear everything after showing cards for longer
  setTimeout(() => {
    this.bShowingHandResult = false;
    if (this.sPrivateCode) this.oTable.container_private_table.setVisible(true);
    const deckPosition = this.getDeckCardPosition();
    this.oTable.close_deck_card.setVisible(false).setPosition(deckPosition.x, deckPosition.y);
    this.setCommunityCards([]); // Clear community cards here
    this.clearStagedBetPiles();
    this.oGameManager.aWinnerPlayers.forEach(winner => {
      const player = this.players.get(winner);
      player?.playerProfile?.hideWinnerPrompt();
    });
    this.updatePotAmount(0);
    this.aPlayerProfiles.forEach(player => {
      player.setAlpha(1);
      player.container_cards.removeAll(true);
      player.hideBettingLabel();
      player.clearScore?.();
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
        this.flushStagedBetsToPot();
    let nRemainingPot = Number(this.oGameManager.nPotAmount || 0);
    aParticipant?.forEach(participant => {
    if (!this.players.has(participant.iUserId)) return;
    const player = this.players.get(participant.iUserId);
    player?.playerProfile?.setAlpha(1);
    player?.playerProfile?.setAmountIn(participant?.nChips);
    participant.iUserId == this.iUserId && this.setAmountIn(participant?.nChips);
    this.syncPlayerScoreDisplay(player, participant.nCardScore, participant.aCardHand, { forceReveal: true });
    setTimeout(() => {
      player?.playerProfile?.container_cards.removeAll(true);
      participant.aCardHand.forEach(cardData => {
        if (!this.playerHasRenderedCard(player, cardData._id)) {
          this.createCard(cardData, player);

        }
      });
      player?.playerProfile?.container_cards.list.forEach(card => {
        card.openCard();
      });
    }, 700);
    
    if (participant.eState == "winner") {
      setTimeout(() => {
        player?.playerProfile?.showWinnerPrompt();
        this.playWinnerCelebrationFX(player?.playerProfile, {
            isSelf: participant.iUserId === this.iUserId,
            text: participant.iUserId === this.iUserId ? 'You Win!' : 'Winner!',
        });
        participant.iUserId == this.iUserId && this.oSoundManager.playSound(this.oSoundManager.winAnimation_sound, false);
        participant.nCardScore === 21 && this.callFXOverlay('blackjack');
      }, 3000);
      this.oGameManager.aWinnerPlayers.push(participant.iUserId);
      
      setTimeout(() => {
        participant.iUserId == this.iUserId && this.oSoundManager.playSound(this.oSoundManager.winCoin_sound, false);
                nRemainingPot = Math.max(0, nRemainingPot - Math.max(0, Number(participant.nWinningAmount) || 0));
                this.queuePotPayout({
                    amount: participant.nWinningAmount || 0,
                    targetAmount: nRemainingPot,
                    playerProfile: player?.playerProfile,
                });
      }, 4200);

      setTimeout(() => {
        player?.playerProfile?.hideWinnerPrompt();
      }, 5200);
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
    showPlayerEmoji(sEmoji) {
        const myPlayer = this.players.get(this.iUserId);
        if (!myPlayer?.playerProfile) return;
        myPlayer.playerProfile.setEmojiDisplay(sEmoji);
        this.oSocketManager?.emit(emitter.reqReaction, { sEmoji });
    }

    handleResReaction({ iUserId, sEmoji } = {}) {
        if (String(iUserId) === String(this.iUserId)) return; // already shown optimistically
        const player = this.players.get(String(iUserId));
        player?.playerProfile?.setEmojiDisplay(sEmoji);
    }

    handleSplitAutoFold({ iUserId, sMessage } = {}) {
        if (String(iUserId) === String(this.iUserId)) {
            this.prompt?.showForSeconds?.(sMessage || 'Your second split hand was auto-folded (bust).');
        }
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
        if (this.handleGameUILayoutUpdate) window.removeEventListener(GAME_UI_LAYOUT_EVENT, this.handleGameUILayoutUpdate);
        if (this.handleGameActionOverlayCommand) window.removeEventListener(GAME_ACTION_OVERLAY_COMMAND_EVENT, this.handleGameActionOverlayCommand);
        if (this.handleEmojiSent) window.removeEventListener('bsg:emoji-sent', this.handleEmojiSent);
        hideGameActionOverlay();
        this.oSocketManager?.destroy?.();
    }
    exitGame() {
        window.location.href = this.fallbackPath || '/lobby';
    }
    setPing(pingTime) {
        this.oHeader?.txt_ping?.setText(`${pingTime}ms`);
    }
} 
