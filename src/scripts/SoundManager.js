export default class SoundManager {
    constructor(oScene) {
        this.oScene = oScene;
        this.isSoundOn = true;
        this.isMusicOn = true;
        this.bg_music = this.createSoundRef('bg_music', { volume: 0.32, allowOverlap: false });
        this.winAnimation_sound = this.createSoundRef('winAnimation_sound', { volume: 0.42, allowOverlap: false, restartOnPlay: true });
        this.winCoin_sound = this.createSoundRef('winCoin_sound', { volume: 0.36, allowOverlap: false, restartOnPlay: true });
        this.coin_sound = this.createSoundRef('coin_sound', { volume: 0.28, allowOverlap: false, restartOnPlay: true });
        this.chipsIn_sound = this.createSoundRef('chipsIn_sound', { volume: 0.34, allowOverlap: false, restartOnPlay: true });
        this.card_sound = this.createSoundRef('card_sound', { volume: 0.2, allowOverlap: false, restartOnPlay: true });
        this.click_sound = this.createSoundRef('click_sound', { volume: 0.22, allowOverlap: false, restartOnPlay: true });
        this.bust_sound = this.createSoundRef('bust_sound', { volume: 0.34, allowOverlap: false, restartOnPlay: true });
        this.fold_sound = this.createSoundRef('fold_sound', { volume: 0.34, allowOverlap: false, restartOnPlay: true });
        this.timer_sound = this.createSoundRef('timer_sound', { volume: 0.22, allowOverlap: false, restartOnPlay: true });
        this.raise_sound = this.createSoundRef('raise_sound', { volume: 0.32, allowOverlap: false, restartOnPlay: true });
        this.check_sound = this.createSoundRef('check_sound', { volume: 0.28, allowOverlap: false, restartOnPlay: true });
        this.doubleDown_sound = this.createSoundRef('doubleDown_sound', { volume: 0.45, allowOverlap: false, restartOnPlay: true });
        this.managedSounds = [
            this.bg_music,
            this.winAnimation_sound,
            this.winCoin_sound,
            this.coin_sound,
            this.chipsIn_sound,
            this.card_sound,
            this.click_sound,
            this.bust_sound,
            this.fold_sound,
            this.timer_sound,
            this.raise_sound,
            this.check_sound,
            this.doubleDown_sound,
        ];
    }
    createSoundRef(key = '', options = {}) {
        const { allowOverlap = true, restartOnPlay = false, ...config } = options;
        return {
            key,
            config,
            allowOverlap,
            restartOnPlay,
            isPlaying: false,
            loop: false,
        };
    }
    hasLoadedSound(key) {
        if (!key || !this.oScene?.cache?.audio?.exists) return false;
        return this.oScene.cache.audio.exists(key);
    }
    getActiveSound(key) {
        if (!key || !this.oScene?.sound?.get) return null;
        return this.oScene.sound.get(key) || null;
    }
    canPlaySound() {
        if (!this.isSoundOn || !this.oScene?.sound?.play) return false;
        if (typeof document !== 'undefined') {
            if (document.visibilityState === 'hidden') return false;
            if (typeof document.hasFocus === 'function' && !document.hasFocus()) return false;
        }
        return true;
    }
    canPlayMusic() {
        if (!this.isMusicOn || !this.oScene?.sound?.play) return false;
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
        return true;
    }
    setSoundEnabled(value) {
        this.isSoundOn = !!value;
        if (!this.isSoundOn) {
            this.stopEffectSounds();
        }
        return this.isSoundOn;
    }
    setMusicEnabled(value) {
        this.isMusicOn = !!value;
        if (!this.isMusicOn) {
            this.stopSound(this.bg_music);
        }
        return this.isMusicOn;
    }
    stopEffectSounds() {
        this.managedSounds.forEach((soundRef) => {
            if (soundRef !== this.bg_music) {
                this.stopSound(soundRef);
            }
        });
    }
    stopAllManagedSounds() {
        this.managedSounds.forEach((soundRef) => this.stopSound(soundRef));
    }
    playSound(key, loop = false) {
        if (!key?.key || !this.hasLoadedSound(key.key) || !this.canPlaySound()) return false;
        const activeSound = this.getActiveSound(key.key);
        if (key.restartOnPlay && activeSound?.isPlaying) {
            activeSound.stop();
        } else if (!key.allowOverlap && activeSound?.isPlaying) {
            return false;
        }
        key.loop = loop;
        key.isPlaying = true;
        try {
            this.oScene.sound.play(key.key, { ...key.config, loop });
            return true;
        } catch (_error) {
            key.isPlaying = false;
            return false;
        }
    }
    playMusic(key, loop = false) {
        if (!key?.key || !this.hasLoadedSound(key.key) || !this.canPlayMusic()) return false;
        const activeSound = this.getActiveSound(key.key);
        if (activeSound?.isPlaying) return false;
        key.loop = loop;
        key.isPlaying = true;
        try {
            this.oScene.sound.play(key.key, { ...key.config, loop });
            return true;
        } catch (_error) {
            key.isPlaying = false;
            return false;
        }
    }
    stopSound(key, loop = false) {
        if (!key?.key || !this.oScene?.sound?.stopByKey) return false;
        key.loop = loop;
        key.isPlaying = false;
        try {
            this.oScene.sound.stopByKey(key.key);
            return true;
        } catch (_error) {
            return false;
        }
    }
}
