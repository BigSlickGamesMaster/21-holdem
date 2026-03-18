import Phaser from "phaser";
import assets from "../scripts/assets";
import config from "../scripts/config";
import _ from "../scripts/helper";
import Card from "../prefabs/Card";
import { getAvatarImageSrc } from "../shared/constants/builtInAvatars";

export default class PlayerProfile extends Phaser.GameObjects.Container {
  constructor(scene, x, y, nPlayerIndex) {
    super(scene, x, y);
    scene.add.existing(this);
    this.scene = scene;
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
      .setScale(nPlayerIndex == 0 ? 1 : 0.7);
    this.add(this.container_profile);

    this.container_cards = scene.add.container(0, -120);
    this.container_profile.add(this.container_cards);

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

    const profile_box = scene.add.image(0, 0, assets.player_profile);
    this.container_profile.add(profile_box);

    const profileSize = nPlayerIndex === 0 ? 180 : 120;
    this.profileSize = profileSize;

    this.profile = scene.add
      .image(0, 0, assets.profile_picture)
      .setDisplaySize(profileSize, profileSize)
      .setScale(nPlayerIndex === 0 ? 1 : 1);
    this.container_profile.add(this.profile);

    const mask = scene.make.graphics();
    mask.fillStyle(0xffffff);
    mask.fillRoundedRect(
      x - profileSize / 2,
      y - profileSize / 2,
      profileSize,
      profileSize,
      profileSize / 2
    );
    this.profile.setMask(mask.createGeometryMask());

    this.my_player = scene.add.container(0, 0).setVisible(false);
    this.container_profile.add(this.my_player);
    this.other_player = scene.add.container(0, 0).setVisible(false);
    this.container_profile.add(this.other_player);
    nPlayerIndex == 0
      ? this.my_player.setVisible(true)
      : this.other_player.setVisible(true);

    const other_player_name_bar = scene.add
      .image(0, 130, assets.other_player_name_bar)
      .setScale(1);
    this.other_player.add(other_player_name_bar);

    this.txt_name = scene.add
      .text(
        other_player_name_bar.x,
        other_player_name_bar.y - 20,
        "waiting...",
        { ...style, color: "#f6e900", fontSize: "32px" }
      )
      .setOrigin(0.5);
    this.other_player.add(this.txt_name);

    this.txt_waiting = scene.add
      .text(other_player_name_bar.x, other_player_name_bar.y, "waiting...", {
        ...style,
        color: "#f6e900",
        fontSize: "32px",
      })
      .setOrigin(0.5);
    this.other_player.add(this.txt_waiting);

    this.chip_icon = scene.add.image(
      other_player_name_bar.x - 50,
      other_player_name_bar.y + 20,
      assets.chip_icon
    );
    this.other_player.add(this.chip_icon);
    this.txt_price = scene.add
      .text(
        this.chip_icon.x + this.chip_icon.displayWidth,
        this.chip_icon.y,
        "0",
        {
          ...style,
          fontSize: "26px",
          fontStyle: "bold",
          fontFamily: config.playerFontBold,
        }
      )
      .setOrigin(0.5);
    this.chip_icon.setX(this.txt_price.x - this.txt_price.displayWidth / 2);
    this.txt_price.setX(
      this.chip_icon.x +
        this.chip_icon.displayWidth / 2 +
        this.txt_price.displayWidth / 1.5
    );
    this.other_player.add(this.txt_price);

    this.turn_timer = scene.add.image(0, 0, assets.timer).setVisible(false);
    this.container_profile.add(this.turn_timer);

    this.dd_highlighter = scene.add
      .image(0, 0, assets.dd_highlighter)
      .setVisible(false);
    this.other_player.add(this.dd_highlighter);

    // this.score_bg = scene.add.image(100, -70, assets.score_bg);
    // this.my_player.add(this.score_bg);

    this.score_bg = scene.add
      .image(100, -70, assets.score_bg)
      .setVisible(false);
    this.container_profile.add(this.score_bg);

    this.txt_score = scene.add
      .text(this.score_bg.x, this.score_bg.y, "0", {
        ...style,
        fontSize: "32px",
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

    this.txt_blind = scene.add
      .text(this.blind_bg.x, this.blind_bg.y, "D", {
        ...style,
        fontSize: "32px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.container_blind.add(this.txt_blind);

    this.raise_arrow = scene.add
      .image(100, -70, assets.empty_spot)
      .setFlipY(true)
      .setScale(0.7)
      .setVisible(false);
    this.other_player.add(this.raise_arrow);
  }
  setProfile({ sUserName, sAvatar }) {
    this.txt_name.setText(_.appendSuffix(_.getFirstCapital(sUserName)));
    this.setProfileImage(sAvatar, sUserName);
    // this.container_blind.setVisible(oBlind.isDealer || oBlind.isSmallBlind || oBlind.isBigBlind);
    // this.txt_blind.setText(oBlind.isSmallBlind ? 'SB' : oBlind.isBigBlind ? 'BB' : 'D');
    this.container_profile.setVisible(true);
    this.container_emptySpot.setVisible(false);
    this.hideWaiting();
    return {
      name: this.txt_name,
      profile: this.profile,
      turn_timer: this.turn_timer,
    };
  }
  setScore(nScore) {
    this.txt_score.setText(nScore);
    this.score_bg.setVisible(true);
    this.txt_score.setVisible(true);
  }
  setBlind(iUserId) {
    switch (iUserId) {
      case this.scene.iDealerId:
        this.container_blind.setVisible(true);
        this.txt_blind.setText("D");
        break;
      case this.scene.iBigBlindId:
        this.container_blind.setVisible(true);
        this.txt_blind.setText("BB");
        break;
      case this.scene.iSmallBlindId:
        this.container_blind.setVisible(true);
        this.txt_blind.setText("SB");
        break;
      default:
        this.container_blind.setVisible(false);
        break;
    }
  }
  setBettingLabel(sBettingLabel, nAmount = null) {
    this.container_bettingLabel.setVisible(true);
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

  setWaiting() {
    this.txt_name.setVisible(false);
    this.chip_icon.setVisible(false);
    this.txt_price.setVisible(false);
    this.txt_waiting.setVisible(true);
  }
  hideWaiting() {
    this.txt_name.setVisible(true);
    this.chip_icon.setVisible(true);
    this.txt_price.setVisible(true);
    this.txt_waiting.setVisible(false);
  }
  setAmountIn(nAmountIn) {
    this.chip_icon.setX(-50);
    this.txt_price.setX(this.chip_icon.x + this.chip_icon.displayWidth);
    this.txt_price.setText(
      nAmountIn < 9999
        ? _.formatCurrencyWithComa(nAmountIn)
        : _.formatCurrency(nAmountIn)
    );
    this.chip_icon.setX(this.txt_price.x - this.txt_price.displayWidth / 2);
    this.txt_price.setX(
      this.chip_icon.x +
        this.chip_icon.displayWidth / 2 +
        this.txt_price.displayWidth / 1.5
    );
  }
  createCard(cardData) {
    const cardWidth = 100;
    const cardSpacing = 25;
    const cardTiltAngle = 15;
    const cardCount = this.container_cards?.list?.length;
    const { eSuit, nLabel, nValue, _id } = cardData;

    const card = new Card(this.scene, 0, 0, eSuit, nLabel, nValue, _id);

    if (cardCount > 0) {
      const totalWidth = (cardCount + 1) * cardSpacing;
      const startX = -totalWidth / 2;
      card.setX(startX + cardCount * cardSpacing);
      card.setAngle(cardTiltAngle * (cardCount - cardCount / 2));

      this.container_cards.list.forEach((existingCard, index) => {
        existingCard.setX(startX + index * cardSpacing);
        existingCard.setAngle(cardTiltAngle * (index - cardCount / 2));
      });
    }
    this.container_cards.setVisible(true);
    this.container_cards.add(card);
    return card;
  }
  setProfileImage(url, name) {
    const setDefaultProfile = () => {
      this.profile.setTexture(assets.profile_picture);
      this.profile.setDisplaySize(this.profileSize, this.profileSize);
    };
    const resolvedUrl = getAvatarImageSrc(url, name);
    if (resolvedUrl) {
      const textureKey = `profile_${String(name || "player").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      // Only remove if it exists and is not currently being used
      if (
        this.scene.textures.exists(textureKey) &&
        !this.scene.textures.get(textureKey).key
      ) {
        this.scene.textures.remove(textureKey);
      }
      try {
        this.scene.load.image(textureKey, resolvedUrl);
        this.scene.load.once("complete", () => {
          if (this.scene.textures.exists(textureKey)) {
            this.profile.setTexture(textureKey);
            this.profile.setDisplaySize(this.profileSize, this.profileSize);
          } else {
            console.error("Texture does not exist after loading:", textureKey);
            setDefaultProfile();
          }
        });
      } catch (error) {
        console.error("Error setting texture:", error);
        setDefaultProfile();
      }
      this.scene.load.once("loaderror", (file) => {
        console.error("Error loading image:", file.src);
        setDefaultProfile();
      });
      this.scene.load.start();
    } else {
      setDefaultProfile();
    }
  }
  resTurnTimer = ({ ttl, nTotalTurnTime, nGraceTime, eTurnType, iUserId }) => {
    this.resetTurnTimer();
    const shape = this.scene.make.graphics();
    const mask = shape.createGeometryMask();
    this.turn_timer.setMask(mask);
    this.turn_timer.setVisible(true);

    const totalTime = eTurnType === "graceTime" ? nGraceTime : nTotalTurnTime;
    let remainingTime = ttl;
    const interval = 50;
    let lastBeepTime = 0;

    const drawSlice = () => {
      const elapsedTime = totalTime - remainingTime;
      const progress = elapsedTime / totalTime;
      const start = -90;
      const end = -90 + progress * 360;
      shape.clear();
      shape.slice(
        this.x + this.turn_timer.x,
        this.y + this.turn_timer.y,
        this.turn_timer.displayWidth,
        Phaser.Math.DegToRad(start),
        Phaser.Math.DegToRad(end),
        true
      );
      shape.fillPath();
    };
    drawSlice();
    eTurnType === "graceTime" && this.setTimerTint(0xffff00);
    this.turnInterval = setInterval(() => {
      if (remainingTime <= 200) {
        this.resetTurnTimer();
      } else {
        remainingTime -= interval;
        // this.txt_timer.setText(Math.round(remainingTime / 1000));
        drawSlice();
        if (remainingTime <= totalTime / 6) {
          this.setTimerTint(0xff0000);
          const currentTime = Date.now();
          if (currentTime - lastBeepTime >= 1000) {
            if (iUserId == this.scene.iUserId) {
              this.scene.oSoundManager.playSound(
                this.scene.oSoundManager.timer_sound,
                false
              );
            }
            lastBeepTime = currentTime;
          }
        } else if (eTurnType === "general") {
          this.turn_timer.clearTint();
        }
      }
    }, interval);
  };
  setTimerTint(color) {
    this.turn_timer.tintFill = true;
    this.turn_timer.tintBottomLeft = color;
    this.turn_timer.tintBottomRight = color;
    this.turn_timer.tintTopLeft = color;
    this.turn_timer.tintTopRight = color;
  }
  resetTurnTimer() {
    clearInterval(this.turnInterval);
    this.scene.oSoundManager.stopSound(this.scene.oSoundManager.timer_sound);
    this.turn_timer.clearTint();
    this.turn_timer.setVisible(false);
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
    this.container_profile.setVisible(false);
    this.container_emptySpot.setVisible(false);
  }
}
