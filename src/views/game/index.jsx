import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import Preload from "../../scenes/Preload";
import Level from "../../scenes/Level";
import config from "../../scripts/config";
import { useLocation, useNavigate } from "react-router-dom";
import logo from '../../assets/images/splash/logo.png';
import game_bg from '../../assets/images/bg/game_bg.png';

class Boot extends Phaser.Scene {
    constructor() {
        super({ key: 'Boot' });
    }
    init(data) {
        this.sAuthToken = data.sAuthToken;
        this.iBoardId = data.iBoardId;
        this.sPrivateCode = data.sPrivateCode;
        this.isGuestTutorial = Boolean(data.isGuestTutorial);
    }
    preload() {
        const data = {
            sAuthToken: this.sAuthToken,
            iBoardId: this.iBoardId,
            sPrivateCode: this.sPrivateCode,
            isGuestTutorial: this.isGuestTutorial,
        }
        this.load.image('logo', logo);
        this.load.image('game_bg', game_bg);
        this.load.on(Phaser.Loader.Events.COMPLETE, () => this.scene.start("Preload", data));
    }
}
function Game({ isPausedExternally = false }) {
    const { sAuthToken, iBoardId, sPrivateCode, fallbackPath = '/lobby', isGuestTutorial = false } = useLocation()?.state || {};
    const navigate = useNavigate();
    const gameRef = useRef(null);
    const phaserGameRef = useRef(null);
    useEffect(() => {
        if (!sAuthToken || !iBoardId) {
            navigate(fallbackPath);
            return;
        }
        const gameConfig = {
            type: Phaser.AUTO,
            width: config.width,
            height: config.height,
            version: config.version,
            title: config.title,
            parent: "game-stage",
            transparent: true,
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
        }
        game.scene.add('Level', Level);
        game.scene.add('Preload', Preload);
        game.scene.add('Boot', Boot, true, data);
        phaserGameRef.current = game;

        return () => {
            phaserGameRef.current = null;
            game.destroy(true);
        };

    }, [fallbackPath, iBoardId, isGuestTutorial, navigate, sAuthToken]);

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

    return <div id='game-stage' className='game-stage' ref={gameRef} />;
}

export default Game;
