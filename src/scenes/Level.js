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
import CleanupRegistry from '../scripts/CleanupRegistry';
import { GAME_BROWSER_EVENTS } from '../scripts/gameEvents';
import { buildGameActionState } from '../scripts/gameActionState';
import {
    shouldRevealPlayerScore,
    shouldShowPlayerScore,
} from '../scripts/playerHandSync';
import {
    createHandResultToken,
    getHandResultSideBetSeconds,
    HAND_RESULT_CLEAR_DELAY_MS,
    HAND_RESULT_REVEAL_DELAY_MS,
    isActiveHandResultToken,
    shouldShowNextRoundCountdown,
} from '../scripts/handResultLifecycle';
import { SOCKET_REQUEST_EVENTS, SOCKET_RESPONSE_EVENTS } from '../scripts/socketEvents';
import { getBetPotEffectName, getPotIncrease, shouldCommitPotWithoutAnimation } from '../scripts/potState';
import { buildParticipantUpdatePlan, findParticipantForClient, findPlayerInMap } from '../scripts/participantState';
import {
    normalizeBoardSnapshot,
    shouldCancelResultForBoardState,
    shouldHideSideBetWindowForBoardState,
} from '../scripts/boardSnapshot';
import {
    CLIENT_GAME_STATE_ACTIONS,
    clientGameStateReducer,
    createInitialClientGameState,
} from '../scripts/clientGameState';
import {
    getClientCommunityCards,
    getClientParticipantChips,
    getClientParticipantScore,
    getClientTableChips,
    getClientTurnContext,
} from '../scripts/clientGameSelectors';
import { reduceSocketEventToClientState } from '../scripts/socketStateReducer';
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
            playerProfile.setPosition(x, y);
            playerProfile.setScale(
                scaleX,
                scaleY
            );
        });

        this.registerFXOverlayPotAnchor();
    }

    bindGameUILayoutEvents() {
        if (typeof window === 'undefined') return;

        this.handleGameUILayoutUpdate = (event) => {
            this.applyGameUILayout(event?.detail || {});
        };

        this.cleanupRegistry?.addWindowListener(window, GAME_UI_LAYOUT_EVENT, this.handleGameUILayoutUpdate);
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

shouldShowPlayerScore(aCardHand = [], nCardScore = 0, playerProfile = null) {
    return shouldShowPlayerScore(aCardHand, nCardScore, playerProfile);
}

shouldRevealPlayerScore(player = null, aCardHand = [], nCardScore = 0, options = {}) {
    const { forceReveal = false } = options;
    return shouldRevealPlayerScore({
        player,
        aCardHand,
        nCardScore,
        localUserId: this.iUserId,
        forceReveal,
    });
}

syncPlayerScoreDisplay(player = null, nCardScore = 0, aCardHand = [], options = {}) {
    if (!player?.playerProfile) return;

    if (this.shouldRevealPlayerScore(player, aCardHand, nCardScore, options)) {
        player.playerProfile.setScore(Number(nCardScore));
        return;
    }

    player.playerProfile.clearScore?.();
}

syncPlayerHandSnapshot(player, aCardHand = []) {
    if (!player) return;

    player.aCardHand = Array.isArray(aCardHand) ? aCardHand : [];
    player.playerProfile?.container_cards?.removeAll(true);
    player.playerProfile?.container_cards?.setVisible(false);
}

clearProfileSeatCards() {
    this.players?.forEach?.(player => {
        player?.playerProfile?.container_cards?.removeAll(true);
        player?.playerProfile?.container_cards?.setVisible(false);
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
        overlay.setAnchor('myConsole', () => {
            const canvas = this.game?.canvas;
            if (!canvas) return null;
            const rect = canvas.getBoundingClientRect();
            if (!rect.width || !rect.height) return null;
            return {
                x: rect.left + (rect.width * 0.20),
                y: rect.top + rect.height - 76,
                width: rect.width * 0.34,
                height: 76,
            };
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

getChipTransferSourceAnchor(playerProfile) {
    if (playerProfile?.bSuppressProfileDisplay) {
        const overlay = this.getFXOverlay();
        const consoleAnchor = overlay?.getAnchor?.('myConsole');
        if (consoleAnchor) return consoleAnchor;
    }

    return this.getFXOverlayProfileImageAnchor(playerProfile) || this.getFXOverlayPlayerAnchor(playerProfile);
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
        window.dispatchEvent(new CustomEvent(GAME_BROWSER_EVENTS.GUEST_TUTORIAL_UPDATE, { detail }));
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
    const sCountClass = buttons.length === 1
        ? 'game-action-overlay__row--single'
        : buttons.length === 2
            ? 'game-action-overlay__row--two'
            : buttons.length === 4
                ? 'game-action-overlay__row--four'
                : 'game-action-overlay__row--three';
    const sBaseClassName = String(className || '').replace(/game-action-overlay__row--(single|two|three|four)/g, '').trim();

    return {
        id,
        className: `${sBaseClassName} ${sCountClass}`.trim(),
        buttons,
    };
}

createGameActionOverlayRows(idPrefix, buttonKeys = [], buttonsPerRow = 2, className = '') {
    const buttons = buttonKeys
        .map(key => this.getGameActionOverlayButton(this.oButtons?.[key]))
        .filter(Boolean);

    const rows = [];
    for (let index = 0; index < buttons.length; index += buttonsPerRow) {
        const rowButtons = buttons.slice(index, index + buttonsPerRow);
        const sCountClass = rowButtons.length === 1
            ? 'game-action-overlay__row--single'
            : rowButtons.length === 2
                ? 'game-action-overlay__row--two'
                : rowButtons.length === 4
                    ? 'game-action-overlay__row--four'
                    : 'game-action-overlay__row--three';
        const sBaseClassName = String(className || '').replace(/game-action-overlay__row--(single|two|three|four)/g, '').trim();

        rows.push({
            id: `${idPrefix}-${rows.length + 1}`,
            className: `${sBaseClassName} ${sCountClass}`.trim(),
            buttons: rowButtons,
        });
    }

    return rows;
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
                this.createGameActionOverlayRow('raise-bottom', ['btn_allIn', 'btn_doubleDown', 'btn_cancel'], 'game-action-overlay__row--three'),
            );
        } else if (this.container_buttons?.visible) {
            rows.push(
                ...this.createGameActionOverlayRows('main', ['btn_fold', 'btn_call', 'btn_stand', 'btn_check', 'btn_raise', 'btn_allInCommon'], 2),
            );
        }

        const aVisibleRows = rows.filter(Boolean);
        const tableBankroll = Number.isFinite(Number(this.nOverlayTableBankroll))
            ? Number(this.nOverlayTableBankroll)
            : Number(this.oGameManager?.nMyPlayerChips);
        const nSmallBlind = Number(this.oGameManager?.oGameInfo?.nSmallBlindAmount);
        const nBigBlind = Number(this.oGameManager?.oGameInfo?.nBigBlindAmount);
        const shouldShowTray = Boolean(this.isOverlayReady && (aVisibleRows.length > 0 || Number.isFinite(tableBankroll)));

        emitGameActionOverlayState({
            visible: shouldShowTray,
            mode: this.sRaiseUiMode || (shouldShowTray ? 'main' : 'hidden'),
            message: this.sRaiseUiMode === 'builder'
                ? ''
                : (this.sRaiseUiMode === 'confirm'
                    ? `${this.oGameManager?.tempRaiseIsAllIn ? 'All In' : 'Raise'} ${this.formatRaiseAmountLabel(this.oGameManager?.tempRaiseAmount)}`
                    : ''),
            rows: aVisibleRows,
            tableBankroll: Number.isFinite(tableBankroll) ? tableBankroll : null,
            smallBlind: Number.isFinite(nSmallBlind) && nSmallBlind > 0 ? nSmallBlind : null,
            bigBlind: Number.isFinite(nBigBlind) && nBigBlind > 0 ? nBigBlind : null,
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
                        window.dispatchEvent(new CustomEvent(GAME_BROWSER_EVENTS.NAVIGATE, { detail: { path: '/lobby?tab=lobby-shop' } }));
                    }
                },
            });
            return;
        }

        if (!this.isMyTurn) return;

        switch (command) {
            case 'fold':
                this.oSocketManager.emit(emitter.reqFold);
                this.hideAllButtons();
                break;
            case 'call':
                if (this.oButtons?.btn_call?.bAllInMode) {
                    this.openRaiseConfirm(this.getRaiseRequestAmountForAllIn(), { bAllIn: true, source: 'main' });
                } else if (this.oTurnContext?.bAllInStandChoice && Number(this.oTurnContext?.toCallAmount) <= 0) {
                    this.oSocketManager.emit(emitter.reqCheck);
                    this.hideAllButtons();
                } else {
                    this.oSocketManager.emit(emitter.reqCall);
                    this.hideAllButtons();
                }
                break;
            case 'check':
                this.oSocketManager.emit(emitter.reqCheck);
                this.hideAllButtons();
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
            case 'stand':
                this.markLocalConsoleStandLock();
                if (this.oButtons?.btn_stand?.bCallStandMode) {
                    this.oSocketManager.emit(emitter.reqCall, { bTakeCard: false });
                } else {
                    this.oSocketManager.emit(emitter.reqStand);
                }
                this.hideAllButtons();
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
            case 'allInRaise':
                this.openRaiseConfirm(this.getRaiseRequestAmountForAllIn(), { bAllIn: true, source: 'builder' });
                break;
            case 'allIn':
                this.openRaiseConfirm(this.getRaiseRequestAmountForAllIn(), { bAllIn: true, source: 'main' });
                break;
            case 'cancelRaiseBuilder':
                this.container_raise_buttons?.setVisible(false);
                this.container_confirm_raise?.setVisible(false);
                this.showAllButtons(this.oTurnContext?.aUserAction, this.oTurnContext?.nMinBet, this.oTurnContext?.toCallAmount, {
                    bAllInStandChoice: this.oTurnContext?.bAllInStandChoice,
                });
                break;
            case 'confirmRaise':
                this.confirmTakeCardRaiseRequest();
                break;
            case 'standRaise':
                this.markLocalConsoleStandLock();
                this.submitRaiseRequest({ bTakeCard: false });
                break;
            case 'cancelRaiseConfirm':
                if (this.oGameManager?.tempRaiseIsAllIn && this.sRaiseConfirmSource === 'main') {
                    this.showAllButtons(this.oTurnContext?.aUserAction, this.oTurnContext?.nMinBet, this.oTurnContext?.toCallAmount, {
                        bAllInStandChoice: this.oTurnContext?.bAllInStandChoice,
                    });
                } else {
                    this.openRaiseBuilder();
                }
                break;
            default:
                break;
        }
    };

    this.cleanupRegistry?.addWindowListener(window, GAME_ACTION_OVERLAY_COMMAND_EVENT, this.handleGameActionOverlayCommand);

    this.handleEmojiSent = (event) => {
        const sEmoji = event?.detail?.sEmoji;
        if (sEmoji) this.showPlayerEmoji(sEmoji);
    };
    this.cleanupRegistry?.addWindowListener(window, GAME_BROWSER_EVENTS.EMOJI_SENT, this.handleEmojiSent);

    this.handleSoundToggle = () => {
        const sm = this.oSoundManager;
        if (!sm) return;
        const bothOff = !sm.isSoundOn && !sm.isMusicOn;
        if (bothOff) {
            sm.setSoundEnabled(true);
            sm.setMusicEnabled(true);
            if (sm.isMusicOn) sm.playMusic(sm.bg_music, true);
        } else {
            sm.setSoundEnabled(false);
            sm.setMusicEnabled(false);
            sm.stopMusic?.();
        }
        window.FXOverlay?.setSoundEnabled?.(sm.isSoundOn);
        window.FXOverlay?.setMusicEnabled?.(sm.isMusicOn);
        window.dispatchEvent(new CustomEvent(GAME_BROWSER_EVENTS.SOUND_STATE, { detail: { muted: !sm.isSoundOn } }));
    };
    this.cleanupRegistry?.addWindowListener(window, GAME_BROWSER_EVENTS.SOUND_TOGGLE, this.handleSoundToggle);
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

renderStagedBetPile() {
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
        gap: 110 / normalizedUiScale,
    };
}

getCommunityCardBasePosition() {
    return {
        x: config.centerX,
        y: config.centerY - 30,
    };
}

getCommunityCardPosition(index = 0) {
    const { gap } = this.getCommunityCardLayoutMetrics();
    const base = this.getCommunityCardBasePosition();
    // Left-anchored: card 0 is fixed at the left of a max 5-card spread;
    // subsequent cards step right by gap. No recentering as cards are added.
    const leftAnchor = base.x - 1 * gap;

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
    return {
        x: config.centerX,
        y: 390,
    };
}

updatePotPosition() {
    if (!this.oPotAmount) return Promise.resolve();
    const nextPosition = this.getPotTargetPosition();
    this.oPotAmount.setPosition(nextPosition.x, nextPosition.y);
    this.registerFXOverlayPotAnchor();
    return Promise.resolve();
}

commitPotAmount(nTableChips) {
    const nNextPotAmount = Number(nTableChips) || 0;
    this.oClientGameState = clientGameStateReducer(this.oClientGameState, {
        type: CLIENT_GAME_STATE_ACTIONS.SET_TABLE_CHIPS,
        payload: { nTableChips: nNextPotAmount },
    });
    this.oGameManager.nPotAmount = nNextPotAmount;
    this.oPotAmount?.setAmount(this.oGameManager.nPotAmount);
    this.registerFXOverlayPotAnchor();
    try {
        const overlay = this.getFXOverlay();
        overlay?.setPotAmount && overlay.setPotAmount(0);
    } catch (_error) {
        return;
    }
}

queuePotUpdate({ amount = 0, targetAmount = 0, playerProfile = null } = {}) {
    this.callFXOverlay('transferChips', {
        sourceAnchor: this.getChipTransferSourceAnchor(playerProfile),
        targetAnchor: this.getFXOverlayScreenAnchor(this.oPotAmount, {
            width: 96,
            height: 64,
            offsetY: 42,
        }),
        amount,
        direction: 'toPot',
    });

    return new Promise((resolve) => {
        this.cleanupRegistry?.addTimeout(setTimeout(resolve, 940));
    }).finally(() => {
        this.commitPotAmount(targetAmount);
    });
}

queuePotPayout({ amount = 0, targetAmount = 0, playerProfile = null } = {}) {
    this.callFXOverlay('transferChips', {
        sourceAnchor: this.getFXOverlayScreenAnchor(this.oPotAmount, {
            width: 96,
            height: 64,
            offsetY: 42,
        }),
        targetAnchor: this.getFXOverlayProfileImageAnchor(playerProfile) || this.getFXOverlayPlayerAnchor(playerProfile),
        amount,
        direction: 'toPlayer',
    });

    return new Promise((resolve) => {
        this.cleanupRegistry?.addTimeout(setTimeout(resolve, 980));
    }).finally(() => {
        this.commitPotAmount(targetAmount);
    });
}

findPlayerByUserId(iUserId) {
    return findPlayerInMap(this.players, iUserId);
}

playPlayerBetFX() {
    return Promise.resolve(false);
}

playWinPotFX() {
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
        overlay.clearAnchor('potPile');
        overlay.clearAnchor('betSource');
        overlay.clearAnchor('activePlayer');
        overlay.clearAnchor('mySeat');
        overlay.clear?.();
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
    const clientTurnContext = getClientTurnContext(this.oClientGameState);
    const toCallAmount = Math.max(0, Number(clientTurnContext?.toCallAmount ?? this.oTurnContext?.toCallAmount) || 0);
    const minRaise = Math.max(0, Math.round(Number(this.oGameManager?.nMinRaiseAmount) || 0));
    const statePotAmount = getClientTableChips(this.oClientGameState);
    const potAmount = Math.max(0, Math.round(statePotAmount || Number(this.oGameManager?.nPotAmount) || 0));
    const stateMyChips = getClientParticipantChips(this.oClientGameState, this.iUserId);
    const myChips = Math.max(0, Math.round(stateMyChips || Number(this.oGameManager?.nMyPlayerChips) || 0));
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

getDoubleDownAmount() {
    return Math.max(0, Math.round(Number(this.oGameManager?.nMinRaiseAmount) || 0) * 2);
}

getMyCurrentHandTotal() {
    const stateScore = getClientParticipantScore(this.oClientGameState, this.iUserId);
    if (stateScore > 0) return stateScore;
    const myPlayer = this.players?.get?.(this.iUserId);
    const score = Number(myPlayer?.nCardScore);
    return Number.isFinite(score) ? score : 0;
}

shouldWarnBeforeTakingCommunityCard() {
    return this.getMyCurrentHandTotal() >= 19;
}

canStandThisRound() {
    const stateCommunityCards = getClientCommunityCards(this.oClientGameState);
    const nCommunityCards = stateCommunityCards.length || (Array.isArray(this.oGameManager?.aCommunityCards)
        ? this.oGameManager.aCommunityCards.length
        : 0);
    return nCommunityCards > 0 || Number(this.nTableRound) > 1;
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

    const { minRaise, potAmount, maxRaiseAmount, myChips } = this.getRaiseContext();
    const canAffordRaise = maxRaiseAmount >= minRaise && minRaise > 0;

    const desiredHalfPot = Math.max(minRaise, Math.round(potAmount / 2));
    const desiredFullPot = Math.max(minRaise, Math.round(potAmount));
    const canAllInRaise = myChips > 0 && maxRaiseAmount > 0 && maxRaiseAmount < desiredFullPot;

    this.setPresetButtonState(btnMin, {
        label: 'MIN',
        amount: minRaise,
        visible: canAffordRaise,
        enabled: canAffordRaise,
    });

    this.setPresetButtonState(btnHalfPot, {
        label: '1/2',
        amount: desiredHalfPot,
        visible: canAffordRaise && maxRaiseAmount >= desiredHalfPot,
        enabled: canAffordRaise && maxRaiseAmount >= desiredHalfPot,
    });

    this.setPresetButtonState(btnFullPot, {
        label: 'POT',
        amount: desiredFullPot,
        visible: canAffordRaise && maxRaiseAmount >= desiredFullPot,
        enabled: canAffordRaise && maxRaiseAmount >= desiredFullPot,
    });

    if (btnAllIn) {
        this.setPresetButtonState(btnAllIn, {
            label: 'All In',
            amount: myChips,
            visible: canAllInRaise,
            enabled: canAllInRaise,
        });
    }

    const btnDoubleDown = this.oButtons?.btn_doubleDown;
    if (btnDoubleDown) {
        const canDD = this.canShowDoubleDownAction();
        btnDoubleDown.setVisible(canDD);
        this.setGameActionButtonEnabled(btnDoubleDown, canDD);
        btnDoubleDown.setAlpha(canDD ? 1 : 0.45);
    }

    return canAffordRaise || canAllInRaise;
}

openRaiseBuilder() {
    const canAffordRaise = this.refreshRaisePresetLabels();
    if (!canAffordRaise) {
        this.prompt.showForSeconds('You do not have enough chips to raise.');
        this.restoreTurnUiAfterError();
        return false;
    }

    this.oGameManager.tempRaiseIsAllIn = false;
    this.sRaiseConfirmSource = 'builder';
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

openRaiseConfirm(nRaiseAmount, options = {}) {
    const amount = Math.max(0, Math.round(Number(nRaiseAmount) || 0));
    const bAllIn = options?.bAllIn === true;
    const { minRaise, myChips } = this.getRaiseContext();
    if (!bAllIn && amount < minRaise) {
        this.prompt.showForSeconds('Raise must be at least the minimum bet.');
        return false;
    }

    this.oGameManager.tempRaiseAmount = bAllIn ? myChips : amount;
    this.oGameManager.tempRaiseIsAllIn = bAllIn;
    this.sRaiseConfirmSource = options?.source || 'builder';
    this.disableContainerButtons(this.container_raise_buttons);
    this.container_raise_buttons.setVisible(false);
    this.container_confirm_raise.setVisible(true);
    this.oButtons?.btn_cancel?.setVisible(false);
    this.oButtons?.btn_confirmRaise?.setVisible(true);
    this.oButtons?.btn_standRaise?.setVisible(this.canStandThisRound());
    this.oButtons?.btn_cancelRaise?.setVisible(true);
    this.enableContainerButtons(this.container_confirm_raise);
    this.sRaiseUiMode = 'confirm';
    this.setConsolePrompt(bAllIn ? 'Confirm all in' : 'Confirm your raise');
    this.syncGameActionOverlay();
    return true;
}

restoreTurnUiAfterError(preferRaiseBuilder = false) {
    if (!this.isMyTurn || !this.oTurnContext) return;

    if (preferRaiseBuilder && Array.isArray(this.oTurnContext.aUserAction) && this.oTurnContext.aUserAction.includes('r')) {
        this.openRaiseBuilder();
        return;
    }

    this.showAllButtons(this.oTurnContext.aUserAction, this.oTurnContext.nMinBet, this.oTurnContext.toCallAmount, {
        bAllInStandChoice: this.oTurnContext?.bAllInStandChoice,
    });
}

handleActionError(sEventName, sErrorMessage) {
    this.oLocalConsoleHandLock = null;
    this.bLocalConsoleStandLocked = false;

    if (sErrorMessage) {
        this.prompt.showForSeconds(sErrorMessage);
    }

    if (sEventName === SOCKET_REQUEST_EVENTS.RAISE) {
        this.restoreTurnUiAfterError(true);
        return;
    }

    this.restoreTurnUiAfterError(false);
}

confirmTakeCardRaiseRequest() {
    if (!this.shouldWarnBeforeTakingCommunityCard()) {
        this.submitRaiseRequest({ bTakeCard: true });
        return;
    }

    const handTotal = this.getMyCurrentHandTotal();
    const message = handTotal >= 21
        ? `You're on ${handTotal}. Taking another card may bust your hand. Continue?`
        : `You're on ${handTotal}. Take another community card?`;

    this.popup.open({
        confirm: true,
        title: 'TAKE CARD?',
        message,
        confirmText: 'Take Card',
        cancelText: 'Cancel',
        callback: () => this.submitRaiseRequest({ bTakeCard: true }),
    });
}

submitRaiseRequest(extraData = {}) {
    this.disableContainerButtons(this.container_confirm_raise);
    this.syncGameActionOverlay();
    const bAllIn = this.oGameManager?.tempRaiseIsAllIn === true;
    const { toCallAmount, myChips } = this.getRaiseContext();
    this.setConsolePrompt(bAllIn ? 'Submitting all in' : 'Submitting raise');
    if (extraData?.bTakeCard === false) this.markLocalConsoleStandLock();

    if (bAllIn && toCallAmount >= myChips) {
        this.oSocketManager.emit(emitter.reqCall, {
            ...extraData,
            bAllIn: true,
        });
        return;
    }

    this.oSocketManager.emit(emitter.reqRaise, {
        nRaiseAmount: bAllIn ? myChips : this.oGameManager.tempRaiseAmount,
        ...(bAllIn ? { bAllIn: true } : {}),
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

    // Header controls were replaced by the React game utility overlay.
    setHeader() {
        this.container_header?.removeAll(true);
        this.container_header?.setVisible(false);
        this.oHeader = {};
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
        this.bLeaveRequested = true;
        let bExited = false;
        const finishExit = () => {
            if (bExited) return;
            bExited = true;
            this.exitGame();
        };

        this.oSocketManager.emit(emitter.reqLeave, {}, () => {
            this.refreshGlobalProfileState();
            finishExit();
        });
        this.time.delayedCall(900, finishExit);
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
    this.container_buttons.buttonKeys = ['btn_fold', 'btn_call', 'btn_check', 'btn_raise', 'btn_stand'];
    this.container_raise_buttons.buttonKeys = ['btn_min', 'btn_halfPot', 'btn_fullPot', 'btn_allIn', 'btn_doubleDown', 'btn_cancel'];
    this.container_confirm_raise.buttonKeys = ['btn_confirmRaise', 'btn_standRaise', 'btn_cancelRaise'];

    this.oButtons = {
        btn_fold: this.createGameActionButtonState('fold', 'Fold', 'secondary'),
        btn_call: this.createGameActionButtonState('call', 'Call', 'primary'),
        btn_check: this.createGameActionButtonState('check', 'Check', 'secondary'),
        btn_raise: this.createGameActionButtonState('raise', 'Raise', 'primary'),
        btn_doubleDown: this.createGameActionButtonState('doubleDown', 'Double Down', 'primary'),
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
        this.container_community_cards?.setDepth(125);
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
        const tableCoverScale = Math.max(config.width / this.table.width, config.height / this.table.height) * 0.92;
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
        this.cleanupRegistry = new CleanupRegistry();
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
        this.oClientGameState = createInitialClientGameState();
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
        this.cleanupRegistry.addPhaserListener(this.scale, 'resize', this.registerFXOverlayPotAnchor, this);
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
        this.sideBetsChangeHandler = (event) => this.handleSideBetsChange(event?.detail);
        // Exit game on tab hide or browser back â€” prevents desync and seat abuse.
        this.cleanupRegistry.addWindowListener(window, 'visibilitychange', this.visibilityChangeHandler);
        this.cleanupRegistry.addWindowListener(window, 'popstate', this.popStateHandler);
        this.cleanupRegistry.addWindowListener(window, GAME_BROWSER_EVENTS.SIDE_BETS_CHANGE, this.sideBetsChangeHandler);
        this.events.once('shutdown', this.cleanupGameBindings, this);
        this.events.once('destroy', this.cleanupGameBindings, this);
    }
    getLocalConsoleCardPayload({ ignoreLock = false } = {}) {
        const myPlayer = this.players?.get?.(this.iUserId);
        if (!myPlayer) {
            return {
                hand: [],
                community: [],
                sideBetCommunity: [],
                sideBetLive: true,
                score: 0,
                locked: false,
            };
        }

        const bLocked = Boolean(this.oLocalConsoleHandLock?.active || this.bLocalConsoleStandLocked);
        if (!ignoreLock && bLocked && this.oLocalConsoleHandLock) {
            return {
                hand: this.oLocalConsoleHandLock.hand,
                community: this.oLocalConsoleHandLock.community,
                sideBetCommunity: this.oLocalConsoleHandLock.sideBetCommunity,
                sideBetLive: false,
                score: this.oLocalConsoleHandLock.score,
                locked: true,
            };
        }

        const aCommunityCards = Array.isArray(this.oGameManager?.aCommunityCards) ? this.oGameManager.aCommunityCards : [];
        const bSideBetLive = myPlayer?.eState === 'playing' && !myPlayer?.isDoubleDownLock;
        const nStandAtRound = Math.max(1, Number(myPlayer?.nStandAtRound) || 1);
        const nEligibleCommunityCards = bSideBetLive ? aCommunityCards.length : Math.max(0, nStandAtRound - 1);
        const aVisibleCommunityCards = bSideBetLive ? aCommunityCards : aCommunityCards.slice(0, nEligibleCommunityCards);
        return {
            hand: Array.isArray(myPlayer?.aCardHand) ? myPlayer.aCardHand : [],
            community: aVisibleCommunityCards,
            sideBetCommunity: aCommunityCards.slice(0, nEligibleCommunityCards),
            sideBetLive: bSideBetLive,
            score: Number(myPlayer?.nCardScore) || 0,
            locked: false,
        };
    }
    emitConsoleCards() {
        if (typeof window === 'undefined') return;
        const consoleCards = this.getLocalConsoleCardPayload();
        window.dispatchEvent(new CustomEvent(GAME_BROWSER_EVENTS.CONSOLE_CARDS, {
            detail: consoleCards,
        }));
    }
    isLocalConsoleHandLocked() {
        return Boolean(this.oLocalConsoleHandLock?.active || this.bLocalConsoleStandLocked);
    }
    assignParticipantData(player, participantData = {}) {
        if (!player || !participantData) return;
        if (player.iUserId === this.iUserId && this.isLocalConsoleHandLocked()) {
            const safeParticipantData = { ...participantData };
            delete safeParticipantData.aCardHand;
            delete safeParticipantData.nCardScore;
            Object.assign(player, safeParticipantData);
            return;
        }
        Object.assign(player, participantData);
    }
    markLocalConsoleStandLock() {
        this.bLocalConsoleStandLocked = true;
        this.lockLocalConsoleHand();
        this.emitConsoleCards();
    }
    lockLocalConsoleHand() {
        const consoleCards = this.getLocalConsoleCardPayload({ ignoreLock: true });
        this.oLocalConsoleHandLock = {
            active: true,
            hand: [...consoleCards.hand],
            community: [...consoleCards.community],
            sideBetCommunity: [...consoleCards.sideBetCommunity],
            score: consoleCards.score,
        };
    }
    clearLocalConsoleHand() {
        this.oLocalConsoleHandLock = null;
        this.bLocalConsoleStandLocked = false;
        const myPlayer = this.players?.get?.(this.iUserId);
        if (myPlayer) {
            myPlayer.aCardHand = [];
            myPlayer.nCardScore = 0;
            myPlayer.isDoubleDownLock = false;
            myPlayer.nStandAtRound = 1;
        }
        this.oClientGameState = clientGameStateReducer(this.oClientGameState, {
            type: CLIENT_GAME_STATE_ACTIONS.SET_PARTICIPANT_HAND_SCORE,
            payload: {
                iUserId: this.iUserId,
                aCardHand: [],
                nCardScore: 0,
            },
        });
        this.emitConsoleCards();
    }
    handleSideBetsChange(detail = {}) {
        if (!this.oSocketManager || !this.iUserId) return;
        const bets = detail?.bets;
        if (!bets || typeof bets !== 'object') return;
        const sSerializedBets = JSON.stringify(bets);
        if (sSerializedBets === this.sLastSideBetsSent) return;
        this.sLastSideBetsSent = sSerializedBets;
        this.oSocketManager.emit(SOCKET_REQUEST_EVENTS.SIDE_BETS, { bets });
    }
    handleSideBetsState(oData = {}) {
        const oResult = oData?.results && !Array.isArray(oData.results) ? oData.results : null;
        const aResultRows = Array.isArray(oData?.results)
            ? oData.results
            : (Array.isArray(oResult?.results) ? oResult.results : []);
        const payouts = oData?.payouts || oData?.winnings || oData?.sideBetPayouts || aResultRows.reduce((accumulator, result) => {
            const nCredit = Number(result?.creditAmount ?? result?.winAmount);
            if (result?.type && Number.isFinite(nCredit) && nCredit > 0) accumulator[result.type] = nCredit;
            return accumulator;
        }, {});
        const nWinningAmount = Number(
            oData?.nWinningAmount
            ?? oData?.nSideBetWinningAmount
            ?? oData?.sideBetWinningAmount
            ?? oResult?.creditAmount
        );
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(GAME_BROWSER_EVENTS.SIDE_BETS_SERVER_STATE, {
                detail: {
                    bets: oData?.bets || {},
                    total: Number(oData?.total) || 0,
                    results: oData?.results || null,
                    payouts,
                    nWinningAmount: Number.isFinite(nWinningAmount) ? nWinningAmount : 0,
                    nChips: Number.isFinite(Number(oData?.nChips)) ? Number(oData.nChips) : null,
                    message: oData?.message || oData?.sMessage || '',
                },
            }));
            if ((Number.isFinite(nWinningAmount) && nWinningAmount > 0) || (payouts && Object.keys(payouts).length > 0)) {
                window.dispatchEvent(new CustomEvent(GAME_BROWSER_EVENTS.SIDE_BET_PAYOUT, {
                    detail: {
                        payouts,
                        nWinningAmount: Number.isFinite(nWinningAmount) ? nWinningAmount : 0,
                        nChips: Number.isFinite(Number(oData?.nChips)) ? Number(oData.nChips) : null,
                        message: oData?.message || oData?.sMessage || '',
                    },
                }));
            }
        }
        if (Number.isFinite(Number(oData?.nChips))) {
            this.oGameManager.nMyPlayerChips = Number(oData.nChips);
            this.setAmountIn(Number(oData.nChips));
        }
    }
    emitSideBetConfig(detail = {}) {
        if (typeof window === 'undefined') return;
        const nSmallBlind = Number(detail.nMinBet || this.oGameManager?.oGameInfo?.nSmallBlindAmount || 0);
        const nBigBlind = Number(detail.nBigBlindAmount || this.oGameManager?.oGameInfo?.nBigBlindAmount || (nSmallBlind * 2) || 0);
        window.dispatchEvent(new CustomEvent(GAME_BROWSER_EVENTS.SIDE_BET_CONFIG, {
            detail: {
                bigBlind: nBigBlind > 0 ? nBigBlind : 100,
            },
        }));
    }
    emitSideBetWindow(visible, seconds = 0) {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent(GAME_BROWSER_EVENTS.SIDE_BET_WINDOW, {
            detail: {
                visible: Boolean(visible),
                seconds: Math.max(0, Number(seconds) || 0),
            },
        }));
    }
    emitConsoleTurnTimer(active, remainingMs = 0, totalMs = 0) {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent(GAME_BROWSER_EVENTS.CONSOLE_TURN_TIMER, {
            detail: {
                active: Boolean(active),
                remainingMs: Math.max(0, Number(remainingMs) || 0),
                totalMs: Math.max(0, Number(totalMs) || 0),
            },
        }));
    }
    emitConsoleBust() {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent(GAME_BROWSER_EVENTS.CONSOLE_BUST, {
            detail: {
                token: Date.now(),
            },
        }));
    }
    emitConsoleWin(amount = 0) {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent(GAME_BROWSER_EVENTS.CONSOLE_WIN, {
            detail: {
                amount: Math.max(0, Number(amount) || 0),
            },
        }));
    }
    setCardHand({ aCardHand, nCardScore }) {
        this.oTable.container_private_table.setVisible(false);
        const myPlayer = this.players.get(this.iUserId);
        if (this.isLocalConsoleHandLocked()) {
            this.emitConsoleCards();
            this.clearProfileSeatCards();
            return;
        }
        const aIncomingHand = Array.isArray(aCardHand) ? aCardHand : [];

        if (myPlayer) myPlayer.aCardHand = aIncomingHand;
        if (myPlayer) myPlayer.nCardScore = Number(nCardScore) || myPlayer.nCardScore;
        if (myPlayer) {
            this.oClientGameState = clientGameStateReducer(this.oClientGameState, {
                type: CLIENT_GAME_STATE_ACTIONS.SET_PARTICIPANT_HAND_SCORE,
                payload: {
                    iUserId: this.iUserId,
                    aCardHand: aIncomingHand,
                    nCardScore,
                },
            });
        }
        this.emitConsoleCards();
        this.clearProfileSeatCards();
        this.syncPlayerScoreDisplay(myPlayer, nCardScore, aIncomingHand);
    }
    waitingForGameStart({ nRoundStartsIn }) {
        this.prompt.hide();
        if (nRoundStartsIn) {
            this.waitingForNextRoundStart(Math.round(nRoundStartsIn / 1000));
            return;
        }
        this.declreResultInterval && clearInterval(this.declreResultInterval);
        this.timer && clearInterval(this.timer);
    }
    waitingForNextRoundStart() {
        this.timer && clearInterval(this.timer);
        this.declreResultInterval && clearInterval(this.declreResultInterval);
        this.prompt.hide();
    }
    waitingForNextRound() {
        this.resetCheckCommitments();
        // Don't wipe community cards while the hand-result display window is active
        if (!this.bShowingHandResult) {
            this.container_community_cards.setVisible(false);
            this.container_community_cards.removeAll(true);
        }
        this.oTable.close_deck_card.setVisible(false);
        this.aPlayerProfiles.forEach(player => {
            player.container_cards.removeAll(true).setVisible(false);
            player.clearScore?.();
        });
        this.clearLocalConsoleHand();
    }
    startGame() {
        this.cancelHandResultCleanup();
        this.prompt.hide();
        this.oTable.container_private_table.setVisible(false);
        this.container_community_cards.setVisible(true);
    }

    cancelHandResultCleanup() {
        if (this.handResultShowTimeout) {
            clearTimeout(this.handResultShowTimeout);
            this.handResultShowTimeout = null;
        }
        if (this.handResultClearTimeout) {
            clearTimeout(this.handResultClearTimeout);
            this.handResultClearTimeout = null;
        }
        this.bShowingHandResult = false;
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
        const myPlayer = findParticipantForClient(aParticipant, {
            sRootSocket: this.oSocketManager?.sRootSocket,
            iUserId: this.iUserId,
        });

        if (myPlayer) this.iUserId = myPlayer.iUserId;
        return myPlayer;
    }
    async setGameData({ aCommunityCard, iBigBlindId, iDealerId, iSmallBlindId, nTableChips, nMaxPlayer, eState, nMinBet, nTableRound, oSetting, aParticipant, oGameInfo, oTutorial }) {
        try {
            const boardSnapshot = normalizeBoardSnapshot({
                aCommunityCard,
                iBigBlindId,
                iDealerId,
                iSmallBlindId,
                nTableChips,
                nMaxPlayer,
                eState,
                nMinBet,
                nTableRound,
                oSetting,
                aParticipant,
                oGameInfo,
                oTutorial,
            }, {
                oSetting: this.oGameManager?.oSetting,
                oGameInfo: this.oGameManager?.oGameInfo,
                oTutorial: this.oTutorialState,
            });
            this.oClientGameState = clientGameStateReducer(this.oClientGameState, {
                type: CLIENT_GAME_STATE_ACTIONS.APPLY_BOARD_SNAPSHOT,
                payload: {
                    ...boardSnapshot,
                    aParticipant: boardSnapshot.aParticipant,
                },
            });
            if (shouldCancelResultForBoardState(boardSnapshot.eState)) this.cancelHandResultCleanup();
            this.clearStagedBetPiles();
            this.oGameManager.oGameInfo = boardSnapshot.oGameInfo;
            this.emitSideBetConfig({ nMinBet: boardSnapshot.nMinBet, nBigBlindAmount: boardSnapshot.oGameInfo?.nBigBlindAmount });
            if (shouldHideSideBetWindowForBoardState(boardSnapshot.eState)) this.emitSideBetWindow(false);
            this.oGameManager.nMaxPlayer = boardSnapshot.nMaxPlayer;
            this.oGameManager.oSetting = boardSnapshot.oSetting;
            this.oTutorialState = boardSnapshot.oTutorial;
            this.iDealerId = boardSnapshot.iDealerId;
            this.iBigBlindId = boardSnapshot.iBigBlindId;
            this.iSmallBlindId = boardSnapshot.iSmallBlindId;
            const myPlayer = await this.findMyPlayer(boardSnapshot.aParticipant);
            if (!myPlayer) {
                console.error('[setGameData] Could not match current player in participant list â€” skipping seat setup');
                return;
            }
            this.arrangeSeats(myPlayer.nSeat);
            this.updatePotAmount(boardSnapshot.nTableChips);
            this.checkGameEState(boardSnapshot.eState);
            await this.setPlayersData(boardSnapshot.aParticipant);
            this.setCommunityCards(boardSnapshot.aCommunityCard);
            // Render the current player's cards if joining mid-hand (reconnect with hand in progress)
            const me = this.players.get(this.iUserId);
            if (Array.isArray(me?.aCardHand) && me.aCardHand.length > 0) {
                this.setCardHand({ aCardHand: me.aCardHand, nCardScore: me.nCardScore });
            }
            this.setDealerAndBlind();
            this.syncTutorialState(this.oTutorialState);
            this.nTableRound = boardSnapshot.nTableRound;
            this.sActiveTurnKey = null;
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
    applySocketEventToClientState(data) {
        this.oClientGameState = reduceSocketEventToClientState(this.oClientGameState, data, {
            localUserId: this.iUserId,
        });
    }
    handleDoubleDown(oData, sEventName) {
        const player = this.players.get(oData.iUserId);
        const potIncrease = Math.max(0, Number(oData.nTableChips || 0) - Number(this.oGameManager.nPotAmount || 0));
        const nUpdatedScore = Number(oData.nCardScore);

        this.oSoundManager.playSound(this.oSoundManager.doubleDown_sound, false);
        player?.playerProfile?.setAmountIn(oData.nChips);
        const aUpdatedHand = Array.isArray(oData.aCardHand) ? oData.aCardHand : [oData.oCard].filter(Boolean);
        player.aCardHand = aUpdatedHand;
        player.nCardScore = Number(nUpdatedScore) || player.nCardScore;
        this.syncPlayerScoreDisplay(player, nUpdatedScore, aUpdatedHand);
        if (oData.iUserId !== this.iUserId && sEventName === SOCKET_RESPONSE_EVENTS.DOUBLE_DOWN) {
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
        this.clearProfileSeatCards();
        if (oData.iUserId === this.iUserId) {
            this.oClientGameState = clientGameStateReducer(this.oClientGameState, {
                type: CLIENT_GAME_STATE_ACTIONS.SET_PARTICIPANT_HAND_SCORE,
                payload: {
                    iUserId: this.iUserId,
                    aCardHand: aUpdatedHand,
                    nCardScore: nUpdatedScore,
                },
            });
            this.emitConsoleCards();
        }
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
        const potIncrease = getPotIncrease(oData.nTableChips, this.oGameManager.nPotAmount);
        const effectName = getBetPotEffectName({ sEventName, nChips: oData.nChips, potIncrease });
        const aParticipantAdjustments = Array.isArray(oData.aParticipantAdjustments) ? oData.aParticipantAdjustments : [];

        const bLocalStandIntent = oData.iUserId === this.iUserId && this.bLocalConsoleStandLocked;
        const bStandWithoutCard = (
            bLocalStandIntent
            || (
                sEventName === SOCKET_RESPONSE_EVENTS.STAND
                || (
                    (sEventName === SOCKET_RESPONSE_EVENTS.CALL || sEventName === SOCKET_RESPONSE_EVENTS.RAISE)
                    && oData?.bTakeCard === false
                )
            )
        );

        if (bStandWithoutCard) {
            if (player.iUserId === this.iUserId) this.markLocalConsoleStandLock();
            player.isDoubleDownLock = true;
            player.bPendingAllInStandChoice = false;
            player.nStandAtRound = Number(oData.nStandAtRound) || this.nTableRound || 1;
        }
        player?.playerProfile?.setAmountIn(oData.nChips);
        player?.iUserId == this.iUserId && this.setMyPlayerData(oData);
        aParticipantAdjustments.forEach((participantData) => this.applyParticipantAdjustment(participantData));
        if (effectName) {
            this.oSoundManager.playSound(this.oSoundManager.chipsIn_sound, false);
            this.queuePotUpdate({
                amount: potIncrease,
                targetAmount: oData.nTableChips,
                playerProfile: player?.playerProfile,
                effectName,
            });
        } else if (sEventName === SOCKET_RESPONSE_EVENTS.CHECK) {
            this.oSoundManager.playSound(this.oSoundManager.check_sound, false);
            this.updatePotAmount(oData.nTableChips);
        }
        this.oGameManager.nMinRaiseAmount = oData.nMinBet ?? this.oGameManager.nMinRaiseAmount;
        if (shouldCommitPotWithoutAnimation({ sEventName, potIncrease })) {
            this.updatePotAmount(oData.nTableChips);
        }

        if (this.isGuestTutorial && oData.iUserId === this.iUserId) {
            const sActionMap = {
                [SOCKET_RESPONSE_EVENTS.CALL]: 'call',
                [SOCKET_RESPONSE_EVENTS.STAND]: 'stand',
                [SOCKET_RESPONSE_EVENTS.CHECK]: 'check',
                [SOCKET_RESPONSE_EVENTS.RAISE]: 'raise',
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

        if (sEventName === SOCKET_RESPONSE_EVENTS.CALL) {
            const callAmount = oData.nLastBidChips ?? oData.nCurrentChips ?? 0;
            if (oData.iUserId != this.iUserId) {
                player?.playerProfile?.setBettingLabel(oData.bAllIn ? 'All In' : 'Call', callAmount);
            }
        } else if (sEventName === SOCKET_RESPONSE_EVENTS.RAISE) {
            this.markRaiseOccurred();
            const raiseAmount = oData.nLastBidChips ?? oData.nCurrentChips ?? 0;
            if (oData.iUserId != this.iUserId) {
                player?.playerProfile?.setBettingLabel('Raised', raiseAmount);
            }
        } else if (sEventName === SOCKET_RESPONSE_EVENTS.STAND) {
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
        } else if (sEventName === SOCKET_RESPONSE_EVENTS.CHECK) {
            this.markCheckCommitment(oData.iUserId);
            if (oData.iUserId != this.iUserId) {
                player?.playerProfile?.setBettingLabel('Check');
            }
        }
    }
    setFoldPlayer(iUserId, eState, sReason, bShowMessage, options = {}) {
        const playAudio = options.playAudio !== false;
        const player = this.players.get(iUserId);
        this.oClientGameState = clientGameStateReducer(this.oClientGameState, {
            type: CLIENT_GAME_STATE_ACTIONS.SET_PARTICIPANT_STATUS,
            payload: {
                iUserId,
                eState,
                sReason,
                bShowMessage,
            },
        });
        if (eState === 'fold') {
            playAudio && this.oSoundManager.playSound(this.oSoundManager.fold_sound, false);
            player?.playerProfile?.container_cards?.removeAll(true).setVisible(false);
            player?.playerProfile.setFolded();
            player?.playerProfile.setVisible(true);
            iUserId !== this.iUserId && player?.playerProfile.setBettingLabel('Fold');
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
            player?.playerProfile?.container_cards?.removeAll(true).setVisible(false);
            player?.playerProfile.showBustPrompt();
            player?.playerProfile.setVisible(true);
            if (iUserId === this.iUserId) {
                this.emitConsoleBust();
                this.playBustFX(player?.playerProfile, { isSelf: true, text: 'Bust' });
            }
            iUserId !== this.iUserId && player?.playerProfile.setBettingLabel('Bust');
        }
    }
    handleCommunityCard(oData) {
        // A new community card has been dealt â€” reset check commitments for the next betting round.
        this.sActiveTurnKey = null;
        this.resetCheckCommitments();
        const { aCommunityCard, aParticipant } = oData;
        const aUpdatedParticipants = Array.isArray(aParticipant) ? aParticipant : [];

        this.cleanupRegistry?.addTimeout(setTimeout(() => {
        this.clearAllBettingLabels();
        }, 1000));
        this.flushStagedBetsToPot().finally(() => {
            this.setCommunityCards(aCommunityCard, 'communityCard');
        });
        aUpdatedParticipants.forEach((participant) => {
            if (!participant || !this.players.has(participant.iUserId)) return;

            const player = this.players.get(participant.iUserId);
            this.assignParticipantData(player, participant);
            player?.playerProfile?.setAmountIn(participant.nChips);

            if (!(participant.iUserId === this.iUserId && this.isLocalConsoleHandLocked())) {
                this.syncPlayerScoreDisplay(player, participant.nCardScore, participant.aCardHand);
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
            const nExistingCount = this.container_community_cards.list.length;
            const aNewCards = aCommunityCards.filter(card =>
                !this.oGameManager.aCommunityCards.some(existingCard => existingCard._id === card._id)
            );

            aNewCards.forEach((card, incomingIndex) => {
                if (!this.oGameManager.aCommunityCards.some(existingCard => existingCard._id === card._id)) {
                    const nTargetIndex = nExistingCount + incomingIndex;
                    const nTargetPosition = this.getCommunityCardPosition(nTargetIndex, nExistingCount + aNewCards.length);

                    this.oGameManager.aCommunityCards.push(card);
                    this.emitConsoleCards();

                    const card_open = new Card(this, nTargetPosition.x, nTargetPosition.y, card.eSuit, card.nLabel, card.nValue, card._id, card.isJoker);
                    card_open.setScale(communityCardScale);
                    card_open.setAngle(nTargetPosition.angle || 0);
                    card_open.openCard();
                    this.container_community_cards.add(card_open);
                    this.updatePotPosition({ animate: false });
                }
            });

        }
        else {
            this.oGameManager.aCommunityCards = aCommunityCards;
            this.emitConsoleCards();
            this.container_community_cards.removeAll(true);
            aCommunityCards.forEach((card, index) => {
                const nPosition = this.getCommunityCardPosition(index, aCommunityCards.length);
                const card_open = new Card(this, nPosition.x, nPosition.y, card.eSuit, card.nLabel, card.nValue, card._id, card.isJoker);
                card_open.setScale(communityCardScale);
                card_open.setAngle(nPosition.angle || 0);
                card_open.openCard();
                this.container_community_cards.add(card_open);
            });
            this.updatePotPosition({ animate: false });
        }
    }
    setMyPlayerData(myPlayerData) {
        const myPlayer = this.players.get(this.iUserId);
        const nChips = Number(myPlayerData?.nChips);
        const nCardScore = Number(myPlayerData?.nCardScore);
        const bLocalConsoleLocked = Boolean(this.oLocalConsoleHandLock?.active || this.bLocalConsoleStandLocked);

        if (!bLocalConsoleLocked && (myPlayerData?.aCardHand || Number.isFinite(nCardScore))) {
            this.oClientGameState = clientGameStateReducer(this.oClientGameState, {
                type: CLIENT_GAME_STATE_ACTIONS.SET_PARTICIPANT_HAND_SCORE,
                payload: {
                    iUserId: this.iUserId,
                    aCardHand: myPlayerData?.aCardHand,
                    nCardScore: myPlayerData?.nCardScore,
                },
            });
        }

        if (Number.isFinite(nChips)) {
            this.oGameManager.nMyPlayerChips = nChips;
            this.setAmountIn(nChips);
        }

        if (!bLocalConsoleLocked) this.syncPlayerScoreDisplay(myPlayer, nCardScore, myPlayerData?.aCardHand);
        this.emitConsoleCards();
    }
    applyParticipantAdjustment(participantData) {
        const iUserId = participantData?.iUserId;
        if (!iUserId || !this.players.has(iUserId)) return;

        this.oClientGameState = clientGameStateReducer(this.oClientGameState, {
            type: CLIENT_GAME_STATE_ACTIONS.APPLY_PARTICIPANT_PATCH,
            payload: participantData,
        });
        const player = this.players.get(iUserId);
        this.assignParticipantData(player, participantData);
        player?.playerProfile?.setAmountIn(participantData?.nChips);

        if (iUserId === this.iUserId) {
            this.setMyPlayerData(participantData);
        }
    }
    async setPlayersData(aParticipant) {
        const updatePlan = buildParticipantUpdatePlan(aParticipant, this.players, this.aPlayerProfiles);
        for (let i = 0; i < updatePlan.length; i++) {
            const { iUserId, type, participant, existingPlayer } = updatePlan[i];
            if (type === 'create') {
                await this.mapPlayerData(iUserId, participant);
            } else {
                this.assignParticipantData(existingPlayer, participant);
                await this.setProfiles(iUserId);
            }
        }
    }
    async mapPlayerData(iUserId, participant) {
        this.players.set(iUserId, participant);
        await this.setProfiles(iUserId);
    };
    async setUserJoined(oData) {
        this.oClientGameState = clientGameStateReducer(this.oClientGameState, {
            type: CLIENT_GAME_STATE_ACTIONS.APPLY_PARTICIPANT_PATCH,
            payload: oData,
        });
        if (!this.players.has(oData.iUserId)) {
            await this.mapPlayerData(oData.iUserId, { ...oData, playerProfile: this.aPlayerProfiles[oData.nSeat] });
        }
    }
    async setProfiles(iUserId) {
        const player = await this.players.get(iUserId);
        const { sUserName, sAvatar, eUserType, eState, aCardHand, nChips, nCardScore } = player;
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
    async setBoardState({ aCommunityCard, iBigBlindId, iDealerId, iSmallBlindId, nTableChips, nMaxPlayer, eState, nMinBet, nTableRound, oSetting, aParticipant, oTutorial }) {
        try {
            const boardSnapshot = normalizeBoardSnapshot({
                aCommunityCard,
                iBigBlindId,
                iDealerId,
                iSmallBlindId,
                nTableChips,
                nMaxPlayer,
                eState,
                nMinBet,
                nTableRound,
                oSetting,
                aParticipant,
                oTutorial,
            }, {
                oSetting: this.oGameManager?.oSetting,
                oGameInfo: this.oGameManager?.oGameInfo,
                oTutorial: this.oTutorialState,
            });
            this.oClientGameState = clientGameStateReducer(this.oClientGameState, {
                type: CLIENT_GAME_STATE_ACTIONS.APPLY_BOARD_SNAPSHOT,
                payload: {
                    ...boardSnapshot,
                    aParticipant: boardSnapshot.aParticipant,
                },
            });
            if (shouldCancelResultForBoardState(boardSnapshot.eState)) this.cancelHandResultCleanup();
            this.clearStagedBetPiles();
            this.oTutorialState = boardSnapshot.oTutorial;
            this.emitSideBetConfig({ nMinBet: boardSnapshot.nMinBet });
            if (shouldHideSideBetWindowForBoardState(boardSnapshot.eState)) this.emitSideBetWindow(false);
            this.iDealerId = boardSnapshot.iDealerId;
            this.iBigBlindId = boardSnapshot.iBigBlindId;
            this.iSmallBlindId = boardSnapshot.iSmallBlindId;
            this.updatePotAmount(boardSnapshot.nTableChips);
            // Don't wipe community cards while the hand-result display window is active
            if (!this.bShowingHandResult) {
                this.setCommunityCards(boardSnapshot.aCommunityCard);
            }
            this.checkGameEState(boardSnapshot.eState);
            const myPlayer = await this.findMyPlayer(boardSnapshot.aParticipant);
            if (!myPlayer) {
                console.error('[setBoardState] Could not match current player in participant list â€” skipping seat setup');
                return;
            }
            this.arrangeSeats(myPlayer.nSeat);
            await this.setPlayersData(boardSnapshot.aParticipant);
            // Render the current player's cards if joining mid-hand
            const me = this.players.get(this.iUserId);
            if (Array.isArray(me?.aCardHand) && me.aCardHand.length > 0) {
                this.setCardHand({ aCardHand: me.aCardHand, nCardScore: me.nCardScore });
            }
            this.isFinishGame = false;
            this.setDealerAndBlind();
            this.syncTutorialState(this.oTutorialState);
            this.nTableRound = boardSnapshot.nTableRound;
            this.sActiveTurnKey = null;
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
        this.emitConsoleTurnTimer(false);
        if (this.iLastTurnId === this.iUserId) this.hideAllButtons();
        this.clearFXOverlayFocus();
        if (!this.iLastTurnId) return undefined;
        const lastPlayer = await this.players.get(this.iLastTurnId);
        lastPlayer?.playerProfile?.resetTurnTimer();
        return lastPlayer;
    }
    async setPlayerTurn({ iUserId, ttl, initialValue, nTotalTurnTime, aUserAction, nMinBet, nGraceTime, eTurnType, nRemainingInitializeTime, nRemainingRoundStartsIn, nTableChips, toCallAmount, bAllInStandChoice }) {
        this.emitSideBetConfig({ nMinBet });
        if (nRemainingInitializeTime > 0 || nRemainingRoundStartsIn > 0) {
            this.resetCheckCommitments();
            this.clearStagedBetPiles();
            this.aPlayerProfiles.forEach(player => {
                player.setAlpha(1);
                player.container_cards.removeAll(true);
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
        this.emitSideBetWindow(false);
        // If player data isn't ready yet (join race condition), defer until setGameData finishes
        if (!this.players.get(iUserId) && iUserId === this.iUserId) {
            this.oPendingTurn = { iUserId, ttl, initialValue, nTotalTurnTime, aUserAction, nMinBet, nGraceTime, eTurnType, nRemainingInitializeTime, nRemainingRoundStartsIn, nTableChips, toCallAmount, bAllInStandChoice };
            return;
        }
        const sTurnKey = JSON.stringify({
            iUserId,
            nTableRound: this.nTableRound,
            aUserAction: Array.isArray(aUserAction) ? aUserAction : [],
            nMinBet: Number(nMinBet) || 0,
            toCallAmount: Number(toCallAmount) || 0,
            bAllInStandChoice: bAllInStandChoice === true,
        });
        if (this.sActiveTurnKey === sTurnKey && this.iLastTurnId === iUserId) {
            return;
        }
        this.sActiveTurnKey = sTurnKey;
        await this.resetTurnTimer();
        const player = await this.players.get(iUserId);
        this.isMyTurn = player?.iUserId === this.iUserId;
        this.iLastTurnId = iUserId;
        this.oGameManager.nMinRaiseAmount = nMinBet;
        this.focusFXOverlayPlayer(player?.playerProfile);

        if (player?.playerProfile && ttl > 0) {
            const total = nTotalTurnTime > 0 ? nTotalTurnTime : ttl;
            player.playerProfile.startTurnTimer(ttl, total);
            if (player.iUserId === this.iUserId) {
                this.emitConsoleTurnTimer(true, ttl, total);
                this.callFXOverlay('turnAlert');
            }
        }
        if (player?.iUserId === this.iUserId) {
            this.syncGameActionOverlay();
            this.showAllButtons(aUserAction, nMinBet, toCallAmount, { bAllInStandChoice });
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
showAllButtons(aUserAction, nMinBet, toCallAmount, options = {}) {
    this.isMyTurn = true;
    const bAllInStandChoice = options?.bAllInStandChoice === true;
    this.oTurnContext = { aUserAction, nMinBet, toCallAmount, bAllInStandChoice };
    this.hideAllButtons();
    this.container_buttons.setVisible(true);
    this.setConsolePrompt('');

    // Enable all buttons in the main container
    this.enableContainerButtons(this.container_buttons);

    const { myChips, maxRaiseAmount, minRaise, potAmount } = this.getRaiseContext();
    const actionState = buildGameActionState({
        aUserAction,
        nMinBet,
        toCallAmount,
        myChips,
        maxRaiseAmount,
        minRaise,
        potAmount,
        canStand: this.canStandThisRound(),
        canDoubleDown: this.canShowDoubleDownAction(),
        hasRaiseSinceCheck: this.hasRaiseSinceCheck(this.iUserId),
        bAllInStandChoice,
        formatAmount: (amount) => _.formatCurrencyWithComa(amount),
    });

    this.oClientGameState = clientGameStateReducer(this.oClientGameState, {
        type: CLIENT_GAME_STATE_ACTIONS.SET_TURN_ACTION_STATE,
        payload: {
            iUserId: this.iUserId,
            isLocalTurn: true,
            context: this.oTurnContext,
            actionState,
        },
    });
    this.applyGameActionState(actionState);
    this.layoutActionButtonGroups();
}
applyGameActionState(actionState = {}) {
    const state = {
        fold: {},
        call: {},
        raise: {},
        stand: {},
        allInCommon: {},
        check: {},
        doubleDown: {},
        ...actionState,
    };

    this.oButtons.btn_fold.setVisible(Boolean(state.fold.visible));

    this.oButtons.btn_call.setVisible(Boolean(state.call.visible));
    this.oButtons.btn_call.bAllInMode = Boolean(state.call.bAllInMode);
    if (state.call.visible) this.setCallButtonLabel(state.call.label || 'Call');

    this.oButtons.btn_raise.setVisible(Boolean(state.raise.visible));

    this.oButtons.btn_stand.setVisible(Boolean(state.stand.visible));
    this.oButtons.btn_stand.bCallStandMode = Boolean(state.stand.bCallStandMode);
    if (state.stand.visible) this.setStandButtonLabel(state.stand.label || 'Stand');

    this.oButtons.btn_allInCommon.setVisible(Boolean(state.allInCommon.visible));
    this.oButtons.btn_allInCommon.nRaiseAmount = Number(state.allInCommon.amount) || 0;

    this.oButtons.btn_check.setVisible(Boolean(state.check.visible));

    this.oButtons.btn_doubleDown.setVisible(Boolean(state.doubleDown.visible));
    this.setGameActionButtonEnabled(this.oButtons.btn_doubleDown, state.doubleDown.enabled !== false);
    this.oButtons.btn_doubleDown.setAlpha(Number(state.doubleDown.alpha) || 0);
}
canShowDoubleDownAction() {
    const stateScore = getClientParticipantScore(this.oClientGameState, this.iUserId);
    const myPlayer = this.players?.get?.(this.iUserId);
    const nCardScore = stateScore > 0 ? stateScore : Number(myPlayer?.nCardScore);
    const { myChips } = this.getRaiseContext();
    const nDoubleDownAmount = this.getDoubleDownAmount();
    // DD available when exactly 1 community card is on the table (round 2).
    // Use actual card count — nTableRound is only updated in setGameData/setBoardState,
    // not when resCommunityCard fires, so it lags behind when turn fires.
    const stateCommunityCards = getClientCommunityCards(this.oClientGameState);
    const nCommCards = stateCommunityCards.length || (this.oGameManager?.aCommunityCards || []).length;
    if (nCommCards !== 1) return false;
    if (nDoubleDownAmount <= 0 || myChips < nDoubleDownAmount) return false;
    return Number.isFinite(nCardScore) && nCardScore >= 9 && nCardScore <= 12;
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
    this.oButtons.btn_allInCommon.setVisible(false);
    this.oButtons.btn_allIn.setVisible(false);
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
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GAME_BROWSER_EVENTS.PROFILE_REFRESH));
  }

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
  
  if (shouldShowNextRoundCountdown(nRoundStartsIn)) {
    this.waitingForNextRoundStart(remainingTime);
  }

  // Lock community cards on screen for the result display window
  this.bShowingHandResult = true;
  // Capture the final board cards now — setBoardState may arrive before the
  // timeout fires and clear oGameManager.aCommunityCards, so store locally.
  const _finalCommunityCards = [...(this.oGameManager.aCommunityCards || [])];

  const nResultToken = createHandResultToken();
  this.nHandResultToken = nResultToken;

  // Show community cards immediately when round ends
  this.handResultShowTimeout = setTimeout(() => {
    if (!isActiveHandResultToken(this.nHandResultToken, nResultToken, this.bShowingHandResult)) return;
    // Show community cards first for players to see final board
    if (_finalCommunityCards.length > 0) {
      this.setCommunityCards(_finalCommunityCards);
      this.container_community_cards.setVisible(true);
    }
  }, HAND_RESULT_REVEAL_DELAY_MS); // Show cards almost immediately
  this.cleanupRegistry?.addTimeout(this.handResultShowTimeout);

  // Clear everything after showing cards for longer
  this.handResultClearTimeout = setTimeout(() => {
    if (!isActiveHandResultToken(this.nHandResultToken, nResultToken, this.bShowingHandResult)) return;
    this.bShowingHandResult = false;
    this.handResultShowTimeout = null;
    this.handResultClearTimeout = null;
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
      player.unlockScoreDisplay?.({ clear: true });
    });
    this.clearLocalConsoleHand();
    this.prompt.hide();
    const nSideBetSeconds = getHandResultSideBetSeconds(nRoundStartsIn);
    if (nSideBetSeconds > 0) this.emitSideBetWindow(true, nSideBetSeconds);
  }, HAND_RESULT_CLEAR_DELAY_MS); // Keep cards visible longer (was 7000, now cards show from 500ms to 6000ms)
  this.cleanupRegistry?.addTimeout(this.handResultClearTimeout);

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
    const aParticipantHand = Array.isArray(participant.aCardHand) ? participant.aCardHand : [];
    player.aCardHand = aParticipantHand;
    player.nCardScore = Number(participant.nCardScore) || player.nCardScore;
    this.syncPlayerScoreDisplay(player, participant.nCardScore, aParticipantHand, { forceReveal: true });
    player?.playerProfile?.lockScoreDisplay(participant.nCardScore);
    player?.playerProfile?.container_cards?.removeAll(true);
    player?.playerProfile?.container_cards?.setVisible(false);
    if (participant.iUserId === this.iUserId) this.emitConsoleCards();
    
    if (participant.eState == "winner") {
      this.cleanupRegistry?.addTimeout(setTimeout(() => {
        player?.playerProfile?.showWinnerPrompt();
        participant.iUserId == this.iUserId && this.oSoundManager.playSound(this.oSoundManager.winAnimation_sound, false);
        participant.nCardScore === 21 && this.callFXOverlay('blackjack');
      }, 3000));
      this.oGameManager.aWinnerPlayers.push(participant.iUserId);
      
      this.cleanupRegistry?.addTimeout(setTimeout(() => {
        participant.iUserId == this.iUserId && this.oSoundManager.playSound(this.oSoundManager.winCoin_sound, false);
                if (participant.iUserId === this.iUserId) this.emitConsoleWin(participant.nWinningAmount || 0);
                player?.playerProfile?.showWinAmountPopup(participant.nWinningAmount || 0);
                nRemainingPot = Math.max(0, nRemainingPot - Math.max(0, Number(participant.nWinningAmount) || 0));
                this.queuePotPayout({
                    amount: participant.nWinningAmount || 0,
                    targetAmount: nRemainingPot,
                    playerProfile: player?.playerProfile,
                });
      }, 4200));

      this.cleanupRegistry?.addTimeout(setTimeout(() => {
        player?.playerProfile?.hideWinnerPrompt();
      }, 5200));
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

    cleanupGameBindings() {
        this.cleanupRegistry?.cleanup();
        this.timer && clearInterval(this.timer);
        this.declreResultInterval && clearInterval(this.declreResultInterval);
        this.tostTimeOut && clearTimeout(this.tostTimeOut);
        this.oSoundManager.stopAllManagedSounds();
        this.clearFXOverlayPotAnchor();
        hideGameActionOverlay();
        this.oSocketManager?.destroy?.();
    }
    refreshGlobalProfileState() {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent(GAME_BROWSER_EVENTS.PROFILE_REFRESH));
    }
    exitGame() {
        const fallbackPath = this.fallbackPath || '/lobby';
        if (!this.bLeaveRequested && this.oSocketManager?.socket?.connected) {
            this.bLeaveRequested = true;
            this.oSocketManager.emit(emitter.reqLeave, {}, () => {
                this.refreshGlobalProfileState();
            });
        }
        this.nOverlayTableBankroll = null;
        if (this.oGameManager) this.oGameManager.nMyPlayerChips = 0;
        hideGameActionOverlay();
        this.refreshGlobalProfileState();
        window.dispatchEvent(new CustomEvent(GAME_BROWSER_EVENTS.NAVIGATE, { detail: { path: fallbackPath } }));
        window.setTimeout(() => {
            const fallbackRoute = fallbackPath.split('?')[0];
            if (window.location.pathname !== fallbackRoute) {
                window.location.href = fallbackPath;
            }
        }, 250);
    }
    setPing(pingTime) {
        this.oHeader?.txt_ping?.setText(`${pingTime}ms`);
    }
} 
