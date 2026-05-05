import Phaser from "phaser";
import assets from "../scripts/assets";
import config from "../scripts/config";
import _ from "../scripts/helper";
import ProfileRenderer from "./ProfileRenderer";

// Single neutral theme — warm casino gold
const NEUTRAL_SEAT_THEME = { accentColor: 0xd4af6a, accentHex: '#d4af6a', suit: '\u2660' };
const SEAT_THEMES = Array(9).fill(NEUTRAL_SEAT_THEME);

export default class PlayerProfile extends Phaser.GameObjects.Container {
  constructor(scene, x, y, nPlayerIndex) {
    super(scene, x, y);
    scene.add.existing(this);
    this.scene = scene;
    this.nPlayerIndex = nPlayerIndex;
    this.isLocalSeat = nPlayerIndex === 0;
    this.seatTheme = SEAT_THEMES[nPlayerIndex % SEAT_THEMES.length];
    this.isRightSideSeat = !this.isLocalSeat && x > (config.centerX + 32);
    this.profileScaleBoost = 1.18;
    this.baseProfileScale = this.isLocalSeat ? 0.84 : 0.552;
    const style = {
      fontSize: "20px",
      fontFamily: config.playerFont,
      color: "#ffffff",
      aligh: "center",
    };

    this.container_emptySpot = scene.add.container(0, 0).setVisible(false);
    this.add(this.container_emptySpot);
    // const empty_profile_bg = scene.add.image(0, 0, assets.player_profile).setAlpha(0.7);
    // this.container_emptySpot.add(empty_profile_bg);
    // const empty_profile = scene.add.image(0, 0, assets.profile_picture).setAlpha(0.7);
    // this.container_emptySpot.add(empty_profile);
    this.empty_spot = scene.add.image(0, 0, assets.empty_spot);
    this.container_emptySpot.add(this.empty_spot);

    this.container_profile = scene.add
      .container(0, 0)
      .setVisible(false)
      .setScale(this.baseProfileScale * this.profileScaleBoost);
    this.add(this.container_profile);

    this.container_cards = scene.add.container(0, -44);
    this.container_profile.add(this.container_cards);

    // Second card row for the split sub-hand
    this.container_split_cards = scene.add.container(0, -22);
    this.container_split_cards.setVisible(false);
    this.container_profile.add(this.container_split_cards);

    this.container_profileImage = scene.add.container(0, 0);
    this.container_profile.add(this.container_profileImage);

    const createPromptContainer = (type) => {
      const container = scene.add.container(0, 0).setScale(0);
      this.container_profile.add(container);

      const categoryConfig = {
        winner: {
          glow: assets.winner_glow,
          bg: assets.winnerPrompt_bg,
          text: "Winner",
        },
        bust: {
          glow: assets.bust_glow,
          bg: assets.bustPrompt_bg,
          text: "Bust",
        },
      };

      const glow = scene.add.image(-2, 5, categoryConfig[type].glow);
      container.add(glow);

      const promptBg = scene.add
        .image(0, -150, categoryConfig[type].bg)
        .setVisible(type == "winner");
      container.add(promptBg);

      const text = scene.add
        .text(promptBg.x, promptBg.y, categoryConfig[type].text, {
          fontSize: "32px",
          fontFamily: config.CommonFont,
          color: "#000000",
        })
        .setAlpha(0.7)
        .setOrigin(0.5)
        .setVisible(type == "winner");
      container.add(text);

      return container;
    };

    this.container_winner = createPromptContainer("winner");
    this.container_bust = createPromptContainer("bust");

    this.container_bettingLabel = scene.add.container(0, 0).setVisible(false);
    this.container_profile.add(this.container_bettingLabel);
    const bettingLabel_base = scene.add
      .image(150, 0, assets.bettingLabel_base)
      .setAlpha(1)
      .setScale(0.7);
    this.bettingLabel_base = bettingLabel_base;
    this.container_bettingLabel.add(bettingLabel_base);
    this.txt_bettingLabel = scene.add
      .text(bettingLabel_base.x + 20, bettingLabel_base.y - 10, "", {
        ...style,
        color: "#000000",
        fontSize: "28px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.container_bettingLabel.add(this.txt_bettingLabel);

    // amount text (second line: "200", "500")
    this.txt_bettingAmount = scene.add
      .text(bettingLabel_base.x + 20, bettingLabel_base.y + 20, "", {
        ...style,
        color: "#000000",
        fontSize: "26px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.container_bettingLabel.add(this.txt_bettingAmount);

    const profileSize = 156;
    const profileOffsetY = -6;
    this.profileSize = profileSize;
    this.profileOffsetY = profileOffsetY;
    this.profileRenderer = new ProfileRenderer(scene, 0, 0, {
      isLocalSeat: this.isLocalSeat,
      profileSize,
      profileOffsetY,
      seatTheme: this.seatTheme,
    });
    this.container_profileImage.add(this.profileRenderer);
    this.container_profileImage.setVisible(true);
    this.profileBackdrop = this.profileRenderer.backdrop;
    this.profile = this.profileRenderer.avatar;

    const identityPanelY = this.isLocalSeat ? 66 : 74;
    const identityPanelWidth = 194;
    const identityPanelHeight = this.isLocalSeat ? 52 : 66;
    const nameY = this.isLocalSeat ? -2 : -14;
    const bankrollY = 16;
    this.container_identity = scene.add.container(0, identityPanelY);
    this.container_profile.add(this.container_identity);

    this.identity_panel = scene.add.graphics();
    this.container_identity.add(this.identity_panel);
    this._identityPanelState = { fillColor: 0x10314b, fillAlpha: 0.85, strokeColor: 0x4b7391 };
    this._drawIdentityPanel = () => {
      const { fillColor, fillAlpha, strokeColor } = this._identityPanelState;
      const r = 10;
      this.identity_panel.clear();
      // Glass base fill
      this.identity_panel.fillStyle(fillColor, fillAlpha);
      this.identity_panel.fillRoundedRect(-identityPanelWidth / 2, -identityPanelHeight / 2, identityPanelWidth, identityPanelHeight, r);
      // Subtle accent tint layer
      this.identity_panel.fillStyle(strokeColor, 0.07);
      this.identity_panel.fillRoundedRect(-identityPanelWidth / 2, -identityPanelHeight / 2, identityPanelWidth, identityPanelHeight, r);
      // Accent border
      this.identity_panel.lineStyle(1.5, strokeColor, 0.80);
      this.identity_panel.strokeRoundedRect(-identityPanelWidth / 2, -identityPanelHeight / 2, identityPanelWidth, identityPanelHeight, r);
      // (eyebrow removed)
    };
    this._drawIdentityPanel();

    this.profileBorder = scene.add.graphics();
    this.container_profile.addAt(this.profileBorder, 0);
    this._drawProfileBorder = () => {
      if (!this.profileRenderer || !this.profileBorder) return;
      const borderPadding = 10;
      const outerRadius = this.profileRenderer.frameDiameter / 2;
      const top = -outerRadius - borderPadding;
      const bottom = identityPanelY + (identityPanelHeight / 2) + borderPadding;
      const height = bottom - top;
      const width = Math.max(this.profileRenderer.frameDiameter, identityPanelWidth) + (borderPadding * 2);
      const x = -width / 2;
      const y = top;
      const r = 18;
      this.profileBorder.clear();
      // Glassmorphic fill — navy blue base matching UI console panel
      this.profileBorder.fillStyle(0x10314b, 0.75);
      this.profileBorder.fillRoundedRect(x, y, width, height, r);
      // Subtle blue accent tint
      this.profileBorder.fillStyle(0x264e68, 0.08);
      this.profileBorder.fillRoundedRect(x, y, width, height, r);
      // Glass top-edge highlight (simulate refraction)
      this.profileBorder.fillStyle(0xffffff, 0.07);
      this.profileBorder.fillRoundedRect(x, y, width, Math.min(height * 0.15, 18), { tl: r, tr: r, bl: 0, br: 0 });
      // Main blue accent border
      this.profileBorder.lineStyle(1.5, 0x4b7391, 0.85);
      this.profileBorder.strokeRoundedRect(x, y, width, height, r);
      // Inner bright glass edge
      this.profileBorder.lineStyle(1, 0xffffff, 0.10);
      this.profileBorder.strokeRoundedRect(x + 2, y + 2, width - 4, height - 4, Math.max(6, r - 2));
    };
    this._drawProfileBorder();

    this.txt_name = scene.add
      .text(0, nameY, "waiting...", {
        ...style,
        color: '#f0e0bb',
        fontSize: "28px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.container_identity.add(this.txt_name);

    this.txt_waiting = scene.add
      .text(0, nameY, "waiting...", {
        ...style,
        color: '#f0e0bb',
        fontSize: "28px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.container_identity.add(this.txt_waiting);

    this.chip_icon = scene.add
      .image(-70, bankrollY, assets.chip_icon)
      .setScale(0.82)
      .setVisible(!this.isLocalSeat);
    this.container_identity.add(this.chip_icon);

    this.txt_price = scene.add
      .text(-42, bankrollY, "0", {
        ...style,
        fontSize: "32px",
        fontStyle: "bold",
        fontFamily: config.playerFontBold,
        color: "#ffffff",
      })
      .setOrigin(0, 0.5)
      .setVisible(!this.isLocalSeat);
    this.container_identity.add(this.txt_price);

    this.self_bankroll_base = this.identity_panel;
    this.self_chip_icon = this.chip_icon;
    this.self_txt_price = this.txt_price;

    this.turn_timer = this.profileRenderer.timer;

    this.dd_highlighter = scene.add
      .image(0, 0, assets.dd_highlighter)
      .setVisible(false);
    this.container_profile.add(this.dd_highlighter);

    // this.score_bg = scene.add.image(100, -70, assets.score_bg);
    // this.my_player.add(this.score_bg);

    this.score_bg = scene.add
      .image(100, -70, assets.score_bg)
      .setScale(1.12)
      .setVisible(false);
    this.container_profile.add(this.score_bg);

    // Split score badge — shown below main score when player has split
    this.split_score_bg = scene.add
      .image(100, -35, assets.score_bg)
      .setScale(0.95)
      .setTint(0x1a8040)
      .setVisible(false);
    this.container_profile.add(this.split_score_bg);

    this.txt_splitScore = scene.add
      .text(100, -35, 'SP', {
        ...style,
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#aaffaa',
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.container_profile.add(this.txt_splitScore);

    this.txt_score = scene.add
      .text(this.score_bg.x, this.score_bg.y, "0", {
        ...style,
        fontSize: "38px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.container_profile.add(this.txt_score);

    // this.txt_score = scene.add.text(this.score_bg.x, this.score_bg.y, '0', { ...style, fontSize: '32px', fontStyle: 'bold' }).setOrigin(0.5);
    // this.my_player.add(this.txt_score);

    this.container_blind = scene.add.container(0, 0).setVisible(false);
    this.container_profile.add(this.container_blind);

    this.blind_bg = scene.add.image(-100, -70, assets.blind_bg);
    this.container_blind.add(this.blind_bg);

    // Blind icons
    this.icon_dealer = scene.add.image(this.blind_bg.x, this.blind_bg.y, 'copy_icon').setScale(0.01).setVisible(false);
    this.icon_sb = scene.add.image(this.blind_bg.x, this.blind_bg.y, 'copy_icon').setScale(0.01).setVisible(false);
    this.icon_bb = scene.add.image(this.blind_bg.x, this.blind_bg.y, 'copy_icon').setScale(0.01).setVisible(false);
    this.container_blind.add(this.icon_dealer);
    this.container_blind.add(this.icon_sb);
    this.container_blind.add(this.icon_bb);

    this.txt_blind = scene.add
      .text(this.blind_bg.x, this.blind_bg.y, "", {
        ...style,
        fontSize: "32px",
        fontStyle: "bold",
      })
      .setOrigin(0.5).setVisible(false);
    this.container_blind.add(this.txt_blind);

    this.raise_arrow = scene.add
      .image(100, -70, assets.empty_spot)
      .setFlipY(true)
      .setScale(0.7)
      .setVisible(false);
    this.container_profile.add(this.raise_arrow);

    this.updateBettingLabelLayout();
  }
  setProfile({ sUserName, sAvatar, eUserType }) {
    this.txt_name.setText(_.appendSuffix(_.getFirstCapital(sUserName)));
    this.setProfileImage(sAvatar, sUserName, eUserType);
    // this.container_blind.setVisible(oBlind.isDealer || oBlind.isSmallBlind || oBlind.isBigBlind);
    // this.txt_blind.setText(oBlind.isSmallBlind ? 'SB' : oBlind.isBigBlind ? 'BB' : 'D');
    this.container_profile.setVisible(true);
    this.container_emptySpot.setVisible(false);
    this.hideWaiting();
    this.setIdentityState('normal');
    this.startIdleFloat();
    return {
      name: this.txt_name,
      profile: this.profile,
      turn_timer: this.turn_timer,
    };
  }
  clearScore() {
    this.txt_score.setText("");
    this.score_bg.setVisible(false);
    this.txt_score.setVisible(false);
    this.clearSplitHand();
    this.container_split_cards?.removeAll(true);
    this.container_split_cards?.setVisible(false);
    this.container_cards?.setAlpha(1);
    this.container_split_cards?.setAlpha(1);
    this.setIdentityState('normal');
    this.profileRenderer.stopActivePulse();
    this.profileRenderer.setFrameColor(this.seatTheme.accentColor);
  }
  clearSplitHand() {
    if (this.split_score_bg) { this.split_score_bg.setAlpha(1); this.split_score_bg.setVisible(false); }
    if (this.txt_splitScore) { this.txt_splitScore.setAlpha(1); this.txt_splitScore.setVisible(false); }
  }
  showSplitPreview() {
    this.txt_splitScore.setText('Split');
    this.split_score_bg.setAlpha(0.5);
    this.txt_splitScore.setAlpha(0.5);
    this.split_score_bg.setVisible(true);
    this.txt_splitScore.setVisible(true);
  }
  setSplitHand(aSplitHand, nSplitCardScore) {
    const score = Number(nSplitCardScore);
    if (!Number.isFinite(score) || score <= 0) return;
    const label = score > 21 ? `SP:BUST` : `SP:${score}`;
    this.txt_splitScore.setText(label);
    this.split_score_bg.setAlpha(1);
    this.txt_splitScore.setAlpha(1);
    this.split_score_bg.setVisible(true);
    this.txt_splitScore.setVisible(true);
    // Show the split card row if it has content
    if (this.container_split_cards?.list?.length > 0) this.container_split_cards.setVisible(true);
  }
  // Dim the inactive sub-hand during split turns so the active one is obvious
  highlightActiveSplitHand(eSplitPhase) {
    if (!this.container_split_cards) return;
    if (eSplitPhase === 'hand1') {
      this.container_cards.setAlpha(1);
      this.container_split_cards.setAlpha(0.4);
    } else if (eSplitPhase === 'hand2') {
      this.container_cards.setAlpha(0.4);
      this.container_split_cards.setAlpha(1);
    } else {
      this.container_cards.setAlpha(1);
      this.container_split_cards.setAlpha(1);
    }
  }
  setScore(nScore) {
    const parsedScore = Number(nScore);
    if (!Number.isFinite(parsedScore) || parsedScore <= 0) {
      this.clearScore();
      return;
    }

    this.txt_score.setText(parsedScore);
    this.score_bg.setVisible(true);
    this.txt_score.setVisible(true);
  }
  setBlind(iUserId) {
    // Hide all icons and text by default
    this.icon_dealer.setVisible(false);
    this.icon_sb.setVisible(false);
    this.icon_bb.setVisible(false);
    this.txt_blind.setVisible(false);
    this.txt_blind.setText("");

    switch (iUserId) {
      case this.scene.iDealerId:
        this.container_blind.setVisible(true);
        this.txt_blind.setText("D").setVisible(true);
        break;
      case this.scene.iBigBlindId:
        this.container_blind.setVisible(true);
        this.txt_blind.setText("BB").setVisible(true);
        break;
      case this.scene.iSmallBlindId:
        this.container_blind.setVisible(true);
        this.txt_blind.setText("SB").setVisible(true);
        break;
      default:
        this.container_blind.setVisible(false);
        break;
    }
  }
  setBettingLabel(sBettingLabel, nAmount = null) {
    this.updateBettingLabelLayout();
    this.container_bettingLabel.setVisible(true).setScale(0);
    if (this._bettingLabelTween) this._bettingLabelTween.stop();
    this._bettingLabelTween = this.scene.tweens.add({
      targets: this.container_bettingLabel,
      scaleX: 1, scaleY: 1,
      duration: 180,
      ease: 'Back.easeOut',
    });
    this.txt_bettingLabel.setText(sBettingLabel);

    if (nAmount !== null) {
      this.txt_bettingAmount.setText(nAmount);
      this.txt_bettingAmount.setVisible(true);
    } else {
      this.txt_bettingAmount.setVisible(false);
    }

    this.raise_arrow.setVisible(sBettingLabel === "Raised");
    this.dd_highlighter.setVisible(sBettingLabel === "DD");

    if (this.bettingLabelTimeout) clearTimeout(this.bettingLabelTimeout);

    this.bettingLabelTimeout = setTimeout(() => {
      this.hideBettingLabel();
    }, 3000);
  }

  hideBettingLabel() {
    this.container_bettingLabel.setVisible(false);

    // Clear texts so old values don’t remain
    this.txt_bettingLabel.setText("");
    this.txt_bettingAmount.setText("");

    this.raise_arrow.setVisible(false);
    this.dd_highlighter.setVisible(false);
  }

  updateBettingLabelLayout() {
    if (!this.bettingLabel_base || !this.txt_bettingLabel || !this.txt_bettingAmount || !this.raise_arrow) return;

    const nBannerOffsetX = this.isRightSideSeat ? -164 : 164;
    const nTextOffsetX = this.isRightSideSeat ? -18 : 18;
    const nRaiseArrowX = this.isRightSideSeat ? -108 : 100;

    this.bettingLabel_base.setX(nBannerOffsetX);
    this.bettingLabel_base.setFlipX(this.isRightSideSeat);
    this.txt_bettingLabel.setX(this.bettingLabel_base.x + nTextOffsetX);
    this.txt_bettingAmount.setX(this.bettingLabel_base.x + nTextOffsetX);
    this.raise_arrow.setX(nRaiseArrowX);
  }

  setWaiting() {
    this.txt_name.setVisible(false);
    this.chip_icon.setVisible(false);
    this.txt_price.setVisible(false);
    this.txt_waiting.setVisible(true);
  }
  hideWaiting() {
    this.txt_name.setVisible(true);
    this.chip_icon.setVisible(!this.isLocalSeat);
    this.txt_price.setVisible(!this.isLocalSeat);
    this.txt_waiting.setVisible(false);
  }
  setAmountIn(nAmountIn) {
    this.chip_icon.setX(-70);
    this.txt_price.setX(-42);
    this.txt_price.setText(
      nAmountIn < 9999
        ? _.formatCurrencyWithComa(nAmountIn)
        : _.formatCurrency(nAmountIn)
    );
  }
  createCard() {
    return null;
  }
  setProfileImage(url, name, eUserType = "user") {
    this.profileRenderer.setProfileImage(url, name, { showImage: true, seatIndex: this.nPlayerIndex });
  }
  resTurnTimer = () => this.profileRenderer.resTurnTimer();
  startTurnTimer(ttl, totalTime) {
    this.setIdentityState('active');
    this.profileRenderer.startActivePulse();
    this.profileRenderer.startTurnTimer(ttl, totalTime);
  }
  setTimerTint() {
    this.profileRenderer.setTimerTint();
  }
  resetTurnTimer() {
    this.setIdentityState('normal');
    this.profileRenderer.stopActivePulse();
    this.profileRenderer.setFrameColor(this.seatTheme.accentColor);
    this.profileRenderer.resetTurnTimer();
  }
  showWinnerPrompt() {
    this.container_bettingLabel.setVisible(false);
    // this.container_cards.setVisible(false);
    this.container_winner.setVisible(true);
    this.scene.oAnimations.scale({
      aGameObjects: [this.container_winner],
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: "Quint.easeInOut",
      yoyo: false,
      repeat: 0,
      onComplete: () => {},
    });
  }
  showBustPrompt() {
    this.setIdentityState('bust');
    this.profileRenderer.setFrameColor(0x882222);
    this.profileRenderer.stopActivePulse();
    this.container_bust.setVisible(true);
    this.scene.oAnimations.scale({
      aGameObjects: [this.container_bust],
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: "Quint.easeInOut",
      yoyo: false,
      repeat: 0,
      onComplete: () => {
        this.scene.oAnimations.scale({
          aGameObjects: [this.container_bust],
          scaleX: 0,
          scaleY: 0,
          duration: 500,
          delay: 1500,
          ease: "Quint.easeInOut",
          yoyo: false,
          repeat: 0,
          onComplete: () => {
            this.setAlpha(0.7);
          },
        });
      },
    });
  }
  hideWinnerPrompt() {
    this.container_cards.removeAll(true);
    this.container_split_cards?.removeAll(true);
    this.container_split_cards?.setVisible(false);
    this.scene.oAnimations.scale({
      aGameObjects: [this.container_winner],
      scaleX: 0,
      scaleY: 0,
      duration: 500,
      ease: "Quint.easeInOut",
      yoyo: false,
      repeat: 0,
      onComplete: () => {
        this.container_cards.setVisible(true);
        this.container_winner.setVisible(false);
      },
    });
  }
  setLeave() {
    this.stopIdleFloat();
    this.clearScore();
    this.container_profile.setVisible(false);
    this.container_emptySpot.setVisible(false);
  }

  setIdentityState(state) {
    if (!this._drawIdentityPanel) return;
    const states = {
      normal: { fillColor: 0x060e1a, fillAlpha: 0.55, strokeColor: 0x89d5ff },
      active: { fillColor: 0x0a2040, fillAlpha: 0.70, strokeColor: 0xe8f6ff },
      fold:   { fillColor: 0x0a0a0a, fillAlpha: 0.50, strokeColor: 0x334455 },
      bust:   { fillColor: 0x2a0808, fillAlpha: 0.65, strokeColor: 0x882222 },
    };
    this._identityPanelState = states[state] || states.normal;
    this._drawIdentityPanel();
  }

  setFolded() {
    this.setAlpha(0.7);
    this.setIdentityState('fold');
    this.profileRenderer.stopActivePulse();
    this.profileRenderer.setFrameColor(0x444444);
  }

  startIdleFloat() {
    this.stopIdleFloat();
    this._floatTween = this.scene.tweens.add({
      targets: this.container_profileImage,
      y: 5,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  stopIdleFloat() {
    if (this._floatTween) { this._floatTween.stop(); this._floatTween = null; }
    this.container_profileImage?.setY(0);
  }

  setEmojiDisplay(sEmoji) {
    if (!sEmoji || !this.scene) return;

    // Cancel any existing hide timer
    if (this._emojiHideTimer) {
      this._emojiHideTimer.remove(false);
      this._emojiHideTimer = null;
    }

    // Reuse or create the emoji text object
    if (!this.txt_emoji) {
      this.txt_emoji = this.scene.add.text(52, -110, '', {
        fontSize: '56px',
        fontFamily: 'sans-serif',
      }).setOrigin(0.5).setDepth(10);
      this.container_profileImage.add(this.txt_emoji);
    }

    this.txt_emoji.setText(sEmoji).setScale(0).setVisible(true);

    // Pop-in tween
    this.scene.tweens.add({
      targets: this.txt_emoji,
      scaleX: 1,
      scaleY: 1,
      duration: 220,
      ease: 'Back.easeOut',
    });

    // Auto-hide after 3 seconds
    this._emojiHideTimer = this.scene.time.delayedCall(3000, () => {
      this.scene.tweens.add({
        targets: this.txt_emoji,
        scaleX: 0,
        scaleY: 0,
        duration: 180,
        ease: 'Quart.easeIn',
        onComplete: () => { if (this.txt_emoji) this.txt_emoji.setVisible(false); },
      });
      this._emojiHideTimer = null;
    });
  }
}
