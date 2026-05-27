import React, { useEffect, useRef } from "react";
import PropTypes from 'prop-types';
import Phaser from "phaser";
import Preload from "../../scenes/Preload";
import Level from "../../scenes/Level";
import config from "../../scripts/config";
import { useLocation, useNavigate } from "react-router-dom";
import game_bg from '../../assets/images/bg/game_bg.png';
import portrait_table from '../../assets/images/gameplay/portrate_table.png';
import GameActionOverlay from "./GameActionOverlay";
import { hideGameActionOverlay } from "../../scripts/gameActionOverlayBridge";

class Boot extends Phaser.Scene {
    constructor() {
        super({ key: 'Boot' });
    }
    init(data) {
        this.sAuthToken = data.sAuthToken;
        this.iBoardId = data.iBoardId;
        this.sPrivateCode = data.sPrivateCode;
        this.isGuestTutorial = Boolean(data.isGuestTutorial);
        this.fallbackPath = data.fallbackPath;
    }
    preload() {
        const data = {
            sAuthToken: this.sAuthToken,
            iBoardId: this.iBoardId,
            sPrivateCode: this.sPrivateCode,
            isGuestTutorial: this.isGuestTutorial,
            fallbackPath: this.fallbackPath,
        }
        this.load.image('game_bg', game_bg);
        this.load.image('preload_table', portrait_table);
        this.load.on(Phaser.Loader.Events.COMPLETE, () => this.scene.start("Preload", data));
    }
}
function Game({ isPausedExternally = false }) {
    const { sAuthToken, iBoardId, sPrivateCode, fallbackPath = '/lobby', isGuestTutorial = false } = useLocation()?.state || {};
    const navigate = useNavigate();
    const gameRef = useRef(null);
    const phaserGameRef = useRef(null);
    const layoutMode = 'mobile';

    useEffect(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

        const setVisibleViewportHeight = () => {
            const viewportHeight = window.visualViewport?.height || window.innerHeight;
            document.documentElement.style.setProperty('--vh', `${viewportHeight * 0.01}px`);
        };

        setVisibleViewportHeight();
        window.addEventListener('resize', setVisibleViewportHeight);
        window.addEventListener('orientationchange', setVisibleViewportHeight);
        window.visualViewport?.addEventListener('resize', setVisibleViewportHeight);
        window.visualViewport?.addEventListener('scroll', setVisibleViewportHeight);

        return () => {
            window.removeEventListener('resize', setVisibleViewportHeight);
            window.removeEventListener('orientationchange', setVisibleViewportHeight);
            window.visualViewport?.removeEventListener('resize', setVisibleViewportHeight);
            window.visualViewport?.removeEventListener('scroll', setVisibleViewportHeight);
        };
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') return;

        window.FXOverlayUI?.closeBugPanel?.();
        document.querySelector('#fx-overlay-ui-root .fxui-bug-panel')?.remove();
    }, []);

    useEffect(() => {
        if (!sAuthToken || !iBoardId) {
            navigate(fallbackPath);
            return;
        }
        config.setLayout('mobile');
        const gameConfig = {
            type: Phaser.AUTO,
            width: config.width,
            height: config.height,
            version: config.version,
            title: config.title,
            parent: "game-stage",
            transparent: true,
            render: {
                preserveDrawingBuffer: true,
            },
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
        };
        const game = new Phaser.Game(gameConfig);
        const data = {
            sAuthToken: sAuthToken,
            iBoardId: iBoardId,
            sPrivateCode: sPrivateCode,
            isGuestTutorial,
            fallbackPath,
        }
        game.scene.add('Level', Level);
        game.scene.add('Preload', Preload);
        game.scene.add('Boot', Boot, true, data);
        phaserGameRef.current = game;

        return () => {
            hideGameActionOverlay();
            window.dispatchEvent(new CustomEvent('bsg:profile-refresh'));
            phaserGameRef.current = null;
            game.destroy(true);
        };

    }, [fallbackPath, iBoardId, isGuestTutorial, navigate, sAuthToken, sPrivateCode]);

    useEffect(() => {
        const game = phaserGameRef.current;
        if (!game) return;

        if (game.canvas) {
            game.canvas.style.pointerEvents = isPausedExternally ? 'none' : 'auto';
        }

        if (isPausedExternally) {
            if (game.scene.isActive('Level')) game.scene.pause('Level');
            if (game.scene.isActive('Preload')) game.scene.pause('Preload');
            if (game.scene.isActive('Boot')) game.scene.pause('Boot');
            return;
        }

        if (game.scene.isPaused('Level')) game.scene.resume('Level');
        if (game.scene.isPaused('Preload')) game.scene.resume('Preload');
        if (game.scene.isPaused('Boot')) game.scene.resume('Boot');
    }, [isPausedExternally]);

    return (
        <div className={`game-shell game-shell--${layoutMode}`}>
            <div id='game-stage' className={`game-stage game-stage--${layoutMode}`} ref={gameRef}>
                <GameActionOverlay isPaused={isPausedExternally} />
            </div>
        </div>
    );
}

Game.propTypes = {
    isPausedExternally: PropTypes.bool,
};

Game.defaultProps = {
    isPausedExternally: false,
};

export default Game;
