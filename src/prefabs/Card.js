import Phaser from 'phaser';
import assets from '../scripts/assets';
import config from '../scripts/config';

export default class Card extends Phaser.GameObjects.Container {
    constructor(scene, x, y, eSuit, nLabel, nValue, _id) {
        super(scene, x, y);
        scene.add.existing(this);
        this.scene = scene;
        this._id = _id;
        this.eSuit = eSuit;
        this.nLabel = nLabel;
        this.nValue = nValue;
        this.setName(`${eSuit}_${nLabel}_${nValue}_${_id}`);

        this.container_card = scene.add.container(0, 0);
        this.add(this.container_card);

        this.card_front = scene.add.image(0, 0, assets.card_front);
        this.container_card.add(this.card_front);
        this.setSize(this.card_front.width * this.card_front.scale, this.card_front.height * this.card_front.scale);

        this.top_number = scene.add.text(-(this.card_front.width / 2.7), -(this.card_front.height / 2.3), '10', {
            fontFamily: config.CardFont, fontSize: '42px', align: 'right', color: '#000000',
        }).setOrigin(0, 0);
        this.container_card.add(this.top_number);

        this.main_symbol = scene.add.image(10, 40, 'spades').setScale(1);
        this.container_card.add(this.main_symbol);

        this.other_symbol = scene.add.image(this.top_number.x + 30, this.top_number.y + 50, 'spades').setOrigin(1, 0).setScale(0.35);
        this.container_card.add(this.other_symbol);

        this.card_glow = scene.add.image(0, 0, assets.card_glow).setScale(1.3).setVisible(false);
        this.add(this.card_glow);

        this.closed_card = scene.add.image(0, 0, assets.card_back);
        this.add(this.closed_card);

        this.setCard({ eSuit, nLabel, nValue, _id });
    }
    setCard({ eSuit, nLabel, nValue, _id }) {
        this._id = _id;
        this.eSuit = eSuit;
        this.nLabel = nLabel;
        this.nValue = nValue;
        this.setName(`${eSuit}_${nLabel}_${nValue}_${_id}`);

        const suitAsset = this.getSuitAsset(eSuit);
        this.main_symbol.setTexture(suitAsset);
        this.other_symbol.setTexture(suitAsset);

        let labelText = nLabel.toString();
        if (nLabel === 1) labelText = 'A';
        else if (nLabel === 11) labelText = 'J';
        else if (nLabel === 12) labelText = 'Q';
        else if (nLabel === 13) labelText = 'K';
        this.top_number.setText(labelText);

        if (eSuit === 'd' || eSuit === 'h') {
            this.top_number.setColor('#b22a0b');
        } else {
            this.top_number.setColor('#000000');
        }

        // if (eSuit === 'j') {
        //     this.card_joker.setVisible(true);
        // } else {
        //     this.card_joker.setVisible(false);
        //     this.card_front.setVisible(true);
        //     this.main_symbol.setVisible(true);
        //     this.other_symbol.setVisible(true);
        //     this.top_number.setVisible(true);
        // }
    }
    getSuitAsset(eSuit) {
        switch (eSuit) {
            case 'd': return 'diamond';
            case 'h': return 'heart';
            case 's': return 'spades';
            case 'c': return 'club';
            default: return 'spades';
        }
    }
    setupInteractions() {
        this.setInteractive();
    }
    setGlowCard(color) {
        this.card_glow.setVisible(true);
        if (color) {
            this.setCardTint(color);
        }
    }
    removeGlow() {
        this.card_glow.setVisible(false);
        this.card_glow.clearTint();
    }
    setCardTint(color) {
        this.card_glow.tintFill = true;
        this.card_glow.tintBottomLeft = color;
        this.card_glow.tintBottomRight = color;
        this.card_glow.tintTopLeft = color;
        this.card_glow.tintTopRight = color;
    }
    openCard() {
        this.container_card.setVisible(true);
        this.closed_card.setVisible(false);
    }
    closeCard() {
        this.container_card.setVisible(false);
        this.closed_card.setVisible(true);
    }
    animateCard(isOpen = true) {
        isOpen ? this.container_card.setScale(0, 1) : this.closed_card.setScale(0, 1);
        this?.scene?.tweens?.add({
            targets: isOpen ? this.closed_card : this.container_card,
            scaleX: 0,
            duration: 200,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                isOpen ? this.closed_card.setVisible(false) : this.container_card.setVisible(false);
                isOpen ? this.closed_card.setScale(1) : this.container_card.setScale(1);
                isOpen ? this.container_card.setVisible(true).setScale(0, 1) : this.closed_card.setVisible(true).setScale(0, 1);
                this?.scene?.tweens?.add({
                    targets: isOpen ? this.container_card : this.closed_card,
                    scaleX: 1,
                    duration: 200,
                    ease: 'Sine.easeInOut',
                });
            }
        });
    }
}
