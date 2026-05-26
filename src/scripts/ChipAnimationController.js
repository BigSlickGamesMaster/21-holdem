import Phaser from 'phaser';
import assets from './assets';

export default class ChipAnimationController {
    constructor(scene) {
        this.scene = scene;
    }

    getChipCount(amount = 0) {
        const nAmount = Math.max(0, Number(amount) || 0);
        if (nAmount >= 5000) return 7;
        if (nAmount >= 1000) return 5;
        if (nAmount >= 100) return 3;
        return 2;
    }

    getCurve(from, to, index = 0, direction = 'toPot') {
        const start = new Phaser.Math.Vector2(from.x, from.y);
        const end = new Phaser.Math.Vector2(to.x, to.y);
        const midpoint = start.clone().lerp(end, 0.5);
        const delta = end.clone().subtract(start);
        const normal = delta.lengthSq() > 0 ? new Phaser.Math.Vector2(-delta.y, delta.x).normalize() : new Phaser.Math.Vector2(0, -1);
        const bend = direction === 'toPot' ? 64 : 78;
        const spread = (index - 2) * 16;
        const control = midpoint.add(normal.scale(bend + spread));
        return new Phaser.Curves.QuadraticBezier(start, control, end);
    }

    animateTransfer({ from, to, amount = 0, duration = 620, hold = 170, direction = 'toPot', onComplete = null } = {}) {
        if (!from || !to) return Promise.resolve();

        const aAnimations = [];
        const nChipCount = this.getChipCount(amount);
        const nDepth = direction === 'toPot' ? 118 : 122;

        for (let index = 0; index < nChipCount; index += 1) {
            const angle = ((Math.PI * 2) / nChipCount) * index;
            const popDistance = 18 + (index % 3) * 4;
            const popPoint = {
                x: from.x + Math.cos(angle) * popDistance,
                y: from.y + Math.sin(angle) * popDistance,
            };
            const chip = this.scene.add.image(from.x, from.y, assets.chip_icon)
                .setScale(0.42)
                .setDepth(nDepth)
                .setAlpha(0.98);

            const curve = this.getCurve(popPoint, to, index, direction);
            const state = { t: 0 };

            aAnimations.push(new Promise((resolve) => {
                this.scene.tweens.timeline({
                    targets: chip,
                    tweens: [
                        {
                            x: popPoint.x,
                            y: popPoint.y,
                            scale: 0.74 + (index * 0.035),
                            duration: 115 + (index * 18),
                            ease: 'Back.easeOut',
                        },
                        {
                            scale: 0.68 + (index * 0.025),
                            duration: hold + (index * 12),
                            ease: 'Sine.easeInOut',
                        },
                    ],
                    onComplete: () => {
                        this.scene.tweens.add({
                            targets: state,
                            t: 1,
                            duration: duration + (index * 42),
                            ease: 'Cubic.easeInOut',
                            onUpdate: () => {
                                const point = curve.getPoint(state.t);
                                chip.setPosition(point.x, point.y);
                                chip.setScale(0.76 - (state.t * 0.16));
                                chip.setAlpha(1 - (state.t * 0.16));
                            },
                            onComplete: () => {
                                chip.destroy();
                                resolve();
                            },
                        });
                    },
                });
            }));
        }

        return Promise.all(aAnimations).then(() => {
            if (typeof onComplete === 'function') onComplete();
        });
    }
}
