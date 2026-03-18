export default class Animations {
    constructor(oScene) {
        this.oScene = oScene;
    }
    move({ aGameObjects = [], startX = 0, startY = 0, targetX = 0, targetY = 0, duration = 0, delay = 0, ease = 'Linear', yoyo = false, repeat = 0, onComplete = () => { } }) {
        this.oScene.tweens.add({
            targets: aGameObjects,
            x: targetX,
            y: targetY,
            duration: duration,
            ease: ease,
            delay: delay,
            yoyo: yoyo,
            repeat: repeat,
            onComplete: onComplete,
        });
    }
    scale({ aGameObjects = [], scaleX = 0, scaleY = 0, duration = 0, delay = 0, ease = 'Linear', yoyo = false, repeat = 0, onComplete = () => { } }) {
        this.oScene.tweens.add({
            targets: aGameObjects,
            scaleX: scaleX,
            scaleY: scaleY,
            duration: duration,
            ease: ease,
            delay: delay,
            yoyo: yoyo,
            repeat: repeat,
            onComplete: onComplete,
        });
    }
}