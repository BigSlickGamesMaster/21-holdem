import Phaser from "phaser";
import assets from "../scripts/assets";
import config from "../scripts/config";
import _ from "../scripts/helper";
import ProfileRenderer from "./ProfileRenderer";

// Seat accents rotate through a fixed palette so colors are varied but stable.
const SEAT_THEMES = [
  { accentColor: 0xd4af6a, accentHex: '#d4af6a', suit: '\u2660' },
  { accentColor: 0x58c7ff, accentHex: '#58c7ff', suit: '\u2663' },
  { accentColor: 0xff6b8a, accentHex: '#ff6b8a', suit: '\u2665' },
  { accentColor: 0x7ee081, accentHex: '#7ee081', suit: '\u2666' },
  { accentColor: 0xc38cff, accentHex: '#c38cff', suit: '\u2660' },
  { accentColor: 0xffb15c, accentHex: '#ffb15c', suit: '\u2663' },
  { accentColor: 0x5eead4, accentHex: '#5eead4', suit: '\u2665' },
  { accentColor: 0xf7e36b, accentHex: '#f7e36b', suit: '\u2666' },
  { accentColor: 0x9bb6ff, accentHex: '#9bb6ff', suit: '\u2660' },
];

export default class PlayerProfile extends Phaser.GameObjects.Container {
  constructor(scene, x, y, nPlayerIndex) {
    super(scene, x, y);
    scene.add.existing(this);
    this.scene = scene;
    this.nPlayerIndex = nPlayerIndex;
    this.isLocalSeat = nPlayerIndex === 0;
    this.bSuppressProfileDisplay = this.isLocalSeat;
    this.seatTheme = SEAT_THEMES[nPlayerIndex % SEAT_THEMES.length];
    this.isRightSideSeat = !this.isLocalSeat && x > (config.centerX + 32);
    this.profileScaleBoost = 1.133;
    this.baseProfileScale = this.isLocalSeat ? 0.756 : 0.497;
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

    this.container_cards = scene.add.container(0, -44).setVisible(false);
    this.container_cards.bSuppressSeatCardDisplay = true;
    this.container_profile.add(this.container_cards);

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
    this.container_winAmountPopup = null;
    this.bScoreLocked = false;

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

    const profileSize = 140;
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
    const identityPanelHeight = this.isLocalSeat ? 46 : 50;
    const nameY = 0;
    const bankrollY = 8;
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
    this.identity_panel.setVisible(false);

    this.profileBorder = scene.add.graphics().setVisible(false);
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
    this._drawProfileBorder = () => {};
    this.profileBorder.clear();

    this.card_icon = scene.add.container(0, -(identityPanelHeight / 2) - 13);
    this.card_icon_bg = scene.add.graphics();
    this.card_icon_rank_top = scene.add.text(-9, -13, "21", {
      fontSize: "9px",
      fontFamily: config.playerFontBold,
      fontStyle: "bold",
      color: "#123047",
      resolution: 2,
    }).setOrigin(0, 0);
    this.card_icon_rank_bottom = scene.add.text(9, 13, "21", {
      fontSize: "9px",
      fontFamily: config.playerFontBold,
      fontStyle: "bold",
      color: "#123047",
      resolution: 2,
    }).setOrigin(1, 1).setAngle(180);
    this.card_icon_suit = scene.add.text(0, 0, this.seatTheme.suit, {
      fontSize: "16px",
      fontFamily: "Arial, sans-serif",
      fontStyle: "bold",
      color: this.seatTheme.suit === '\u2665' || this.seatTheme.suit === '\u2666' ? "#c52e3d" : "#123047",
      resolution: 2,
    }).setOrigin(0.5, 0.52);
    this.card_icon.add([this.card_icon_bg, this.card_icon_rank_top, this.card_icon_rank_bottom, this.card_icon_suit]);
    this._drawCardIcon = () => {
      this.card_icon_bg.clear();
      this.card_icon_bg.fillStyle(0xfffbef, 1);
      this.card_icon_bg.fillRoundedRect(-13, -17, 26, 34, 5);
      this.card_icon_bg.lineStyle(1.5, this.seatTheme.accentColor, 0.9);
      this.card_icon_bg.strokeRoundedRect(-13, -17, 26, 34, 5);
      this.card_icon_bg.lineStyle(1, 0x123047, 0.2);
      this.card_icon_bg.strokeRoundedRect(-10, -14, 20, 28, 3);
    };
    this._drawCardIcon();
    this.card_icon.setVisible(false);
    this.container_identity.add(this.card_icon);

    this.txt_name = scene.add
      .text(0, nameY, "", {
        ...style,
        color: '#f0e0bb',
        fontSize: "1px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.container_identity.add(this.txt_name);

    this.txt_waiting = scene.add
      .text(0, nameY, "waiting...", {
        ...style,
        color: '#f0e0bb',
        fontSize: "24px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.container_identity.add(this.txt_waiting);

    this.bankrollY = bankrollY;
    this.bankroll_tablet = scene.add.graphics().setVisible(true);
    this.container_identity.add(this.bankroll_tablet);

    this.chip_icon = scene.add
      .image(-31, bankrollY, assets.chip_icon)
      .setScale(0.52)
      .setVisible(true);
    this.container_identity.add(this.chip_icon);

    this.txt_price = scene.add
      .text(8, bankrollY, "0", {
        ...style,
        fontSize: "22px",
        fontStyle: "bold",
        fontFamily: config.playerFontBold,
        color: "#f4dc9f",
      })
      .setOrigin(0.5)
      .setVisible(true);
    this.container_identity.add(this.txt_price);
    this.drawBankrollTablet();

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
  applyProfileSuppression() {
    if (!this.bSuppressProfileDisplay) return;
    this.container_profile?.setVisible(false);
    this.container_emptySpot?.setVisible(false);
  }
  setVisible(value) {
    super.setVisible(value);
    this.applyProfileSuppression();
    return this;
  }
  setProfile({ sUserName, sAvatar, eUserType }) {
    this.setAlpha(1);
    this.container_cards?.setVisible(false);
    this.txt_name.setText("");
    this.setProfileImage(sAvatar, sUserName, eUserType);
    // this.container_blind.setVisible(oBlind.isDealer || oBlind.isSmallBlind || oBlind.isBigBlind);
    // this.txt_blind.setText(oBlind.isSmallBlind ? 'SB' : oBlind.isBigBlind ? 'BB' : 'D');
    this.container_profile.setVisible(true);
    this.container_emptySpot.setVisible(false);
    this.hideWaiting();
    this.setIdentityState('normal');
    this.startIdleFloat();
    this.applyProfileSuppression();
    return {
      name: this.txt_name,
      profile: this.profile,
      turn_timer: this.turn_timer,
    };
  }
  clearScore() {
    if (this.bScoreLocked) return;
    this.forceClearScore();
  }
  forceClearScore() {
    this.txt_score.setText("");
    this.score_bg.setVisible(false);
    this.txt_score.setVisible(false);
    this.container_cards?.setAlpha(1);
    this.removeSplitArtifacts();
    this.setIdentityState('normal');
    this.profileRenderer.stopActivePulse();
    this.profileRenderer.setFrameColor(this.seatTheme.accentColor);
  }
  lockScoreDisplay(nScore) {
    const parsedScore = Number(nScore);
    if (!Number.isFinite(parsedScore) || parsedScore <= 0) return;
    this.bScoreLocked = true;
    this.setScore(parsedScore);
  }
  unlockScoreDisplay({ clear = false } = {}) {
    this.bScoreLocked = false;
    if (clear) this.forceClearScore();
  }
  removeSplitArtifacts() {
    this.split_score_bg?.destroy?.();
    this.txt_splitScore?.destroy?.();
    this.container_split_cards?.removeAll?.(true);
    this.container_split_cards?.destroy?.();
    this.split_score_bg = null;
    this.txt_splitScore = null;
    this.container_split_cards = null;
    this.container_cards?.setAlpha?.(1);
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
    if (!sBettingLabel && nAmount === null) {
      this.hideBettingLabel();
      return;
    }
    this.removeSplitArtifacts();
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
    this.removeSplitArtifacts();

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
    this.bankroll_tablet.setVisible(false);
    this.chip_icon.setVisible(false);
    this.txt_price.setVisible(false);
    this.card_icon.setVisible(false);
    this.txt_waiting.setVisible(true);
  }
  hideWaiting() {
    this.txt_name.setVisible(false);
    this.bankroll_tablet.setVisible(true);
    this.chip_icon.setVisible(true);
    this.txt_price.setVisible(true);
    this.card_icon.setVisible(false);
    this.txt_waiting.setVisible(false);
  }
  drawBankrollTablet() {
    if (!this.bankroll_tablet || !this.txt_price || !this.chip_icon) return;

    const textWidth = Math.max(24, this.txt_price.displayWidth || 0);
    const width = Math.max(82, Math.min(152, textWidth + 52));
    const height = 30;
    const x = -width / 2;
    const y = this.bankrollY - (height / 2);
    const radius = 15;

    this.bankroll_tablet.clear();
    this.bankroll_tablet.fillStyle(0x000000, 0.24);
    this.bankroll_tablet.fillRoundedRect(x + 1, y + 4, width, height, radius);
    this.bankroll_tablet.fillStyle(0x0e2234, 0.96);
    this.bankroll_tablet.fillRoundedRect(x, y, width, height, radius);
    this.bankroll_tablet.fillStyle(0x04101c, 0.32);
    this.bankroll_tablet.fillRoundedRect(x, y + (height / 2), width, height / 2, { tl: 0, tr: 0, bl: radius, br: radius });
    this.bankroll_tablet.lineStyle(1.5, 0xffd874, 0.62);
    this.bankroll_tablet.strokeRoundedRect(x, y, width, height, radius);
    this.bankroll_tablet.lineStyle(1, 0xffffff, 0.12);
    this.bankroll_tablet.strokeRoundedRect(x + 2, y + 2, width - 4, height - 4, Math.max(4, radius - 2));

    const contentWidth = 18 + 5 + textWidth;
    const startX = -contentWidth / 2;
    this.chip_icon.setPosition(startX + 9, this.bankrollY);
    this.txt_price.setPosition(startX + 18 + 5 + (textWidth / 2), this.bankrollY + 1);
  }
  setAmountIn(nAmountIn) {
    this.txt_price.setText(
      nAmountIn < 9999
        ? _.formatCurrencyWithComa(nAmountIn)
        : _.formatCurrency(nAmountIn)
    );
    this.drawBankrollTablet();
  }
  createCard() {
    return null;
  }
  setProfileImage(url, name, eUserType = "user") {
    void eUserType;
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
  showWinAmountPopup(nAmount = 0) {
    const nWinAmount = Math.max(0, Math.round(Number(nAmount) || 0));
    if (!nWinAmount) return;

    this.hideWinAmountPopup();

    const sAmount = `+${_.formatCurrencyWithComa(nWinAmount)}`;
    const popup = this.scene.add.container(0, -34).setAlpha(0).setScale(0.9);
    const bg = this.scene.add.graphics();
    const text = this.scene.add.text(0, 0, sAmount, {
      fontFamily: config.playerFontBold || config.playerFont,
      fontSize: this.isLocalSeat ? "38px" : "34px",
      fontStyle: "bold",
      color: "#fff4b8",
      stroke: "#173a23",
      strokeThickness: 7,
      align: "center",
    }).setOrigin(0.5);

    const nWidth = Math.max(116, text.width + 34);
    const nHeight = Math.max(48, text.height + 18);
    bg.fillStyle(0x082414, 0.82);
    bg.fillRoundedRect(-nWidth / 2, -nHeight / 2, nWidth, nHeight, 14);
    bg.lineStyle(2, 0xf4d66a, 0.95);
    bg.strokeRoundedRect(-nWidth / 2, -nHeight / 2, nWidth, nHeight, 14);
    bg.fillStyle(0xffffff, 0.10);
    bg.fillRoundedRect((-nWidth / 2) + 4, (-nHeight / 2) + 4, nWidth - 8, Math.min(15, nHeight - 8), 10);

    popup.add([bg, text]);
    this.container_profile.add(popup);
    this.container_winAmountPopup = popup;

    const nRiseDistance = this.isLocalSeat ? 54 : 74;
    const nExitDistance = this.isLocalSeat ? 30 : 42;
    const nIntroDuration = this.isLocalSeat ? 560 : 360;
    const nHoldDelay = this.isLocalSeat ? 1900 : 650;
    const nExitDuration = this.isLocalSeat ? 1800 : 1150;

    this.scene.tweens.add({
      targets: popup,
      y: popup.y - nRiseDistance,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: nIntroDuration,
      ease: "Back.Out",
      onComplete: () => {
        this.scene.tweens.add({
          targets: popup,
          y: popup.y - nExitDistance,
          alpha: 0,
          duration: nExitDuration,
          delay: nHoldDelay,
          ease: "Sine.easeIn",
          onComplete: () => {
            if (this.container_winAmountPopup === popup) this.container_winAmountPopup = null;
            popup.destroy();
          },
        });
      },
    });
  }
  hideWinAmountPopup() {
    if (!this.container_winAmountPopup) return;
    this.scene.tweens.killTweensOf(this.container_winAmountPopup);
    this.container_winAmountPopup.destroy();
    this.container_winAmountPopup = null;
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
    this.hideWinAmountPopup();
    this.container_cards.removeAll(true);
    this.scene.oAnimations.scale({
      aGameObjects: [this.container_winner],
      scaleX: 0,
      scaleY: 0,
      duration: 500,
      ease: "Quint.easeInOut",
      yoyo: false,
      repeat: 0,
      onComplete: () => {
        this.container_cards.setVisible(false);
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
    this.identity_panel?.setVisible(false);
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
