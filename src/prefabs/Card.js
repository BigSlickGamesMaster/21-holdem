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

        const _hw = this.card_front.width / 2;
        const _hh = this.card_front.height / 2;
        const _pad = 20;

        // Small label — top left
        this.top_number = scene.add.text(-_hw + _pad, -_hh + _pad, '10', {
            fontFamily: config.CardFont, fontSize: '42px', align: 'left', color: '#000000',
        }).setOrigin(0, 0).setVisible(false);
        this.container_card.add(this.top_number);

        // Small suit — to the right of the small label (x updated in setCard after setText)
        this.other_symbol = scene.add.image(-_hw + _pad, -_hh + _pad + 4, 'spades').setOrigin(0, 0).setScale(0.45);
        this.container_card.add(this.other_symbol);

        // Big rank label — centre of card
        this.center_number = scene.add.text(0, 0, '10', {
            fontFamily: config.CardFont,
            fontSize: Math.round(this.card_front.height * 0.28) + 'px',
            fontStyle: 'bold',
            align: 'center',
            color: '#000000',
        }).setOrigin(0.5, 0.5);
        this.container_card.add(this.center_number);

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
        this.other_symbol.setTexture(suitAsset);

        let labelText = nLabel.toString();
        if (nLabel === 1) labelText = 'A';
        else if (nLabel === 11) labelText = 'J';
        else if (nLabel === 12) labelText = 'Q';
        else if (nLabel === 13) labelText = 'K';
        this.top_number.setText(labelText);
        this.center_number.setText(labelText);

        // Align small suit to the right of the small label
        this.other_symbol.setPosition(
            -(this.card_front.width / 2) + 20,
            -(this.card_front.height / 2) + 24
        );

        const color = (eSuit === 'd' || eSuit === 'h') ? '#b22a0b' : '#000000';
        this.top_number.setColor(color);
        this.center_number.setColor(color);

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
}
