import Phaser from "phaser";
import assets from "../scripts/assets";
import { getAvatarImageSrc, getAvatarTextureKey, getBuiltInAvatar } from "../shared/constants/builtInAvatars";

export default class ProfileRenderer extends Phaser.GameObjects.Container {
  constructor(scene, x, y, { isLocalSeat = false, profileSize = 92, profileOffsetY = 0, seatTheme = null } = {}) {
    super(scene, x, y);
    scene.add.existing(this);

    this.scene = scene;
    this.isLocalSeat = isLocalSeat;
    this.profileOffsetY = profileOffsetY;
    this.avatarDiameter = profileSize;
    this.frameDiameter = profileSize + (isLocalSeat ? 18 : 12);
    this.maskDiameter = profileSize - (isLocalSeat ? 10 : 8);
    this.pendingTextureKey = "";

    this._frameColor = seatTheme?.accentColor || 0xf5c842;
    this._seatSuit = seatTheme?.suit || '\u2660';

    this.shell = scene.add.container(0, this.profileOffsetY);
    this.backdrop = scene.add.graphics();
    this.avatar = scene.add.image(0, 0, assets.profile_picture).setOrigin(0.5);
    this.frameOverlay = scene.add.graphics();
    this.timer = scene.add
      .image(0, 0, assets.timer)
      .setScale(this.isLocalSeat ? 0.7 : 0.5)
      .setVisible(false);
    this.timerGlow = scene.add.graphics().setVisible(false);

    this.shell.add(this.backdrop);
    this.shell.add(this.avatar);
    this.shell.add(this.frameOverlay);

    // Suit badge: themed card suit symbol on the frame bottom-right edge
    this._suitBadgeGraphics = scene.add.graphics();
    this._suitText = scene.add
      .text(0, 0, this._seatSuit, {
        fontSize: isLocalSeat ? '16px' : '12px',
        fontFamily: 'Arial, sans-serif',
        color: '#050e18',
        resolution: 2,
      })
      .setOrigin(0.5, 0.55);
    this.shell.add(this._suitBadgeGraphics);
    this.shell.add(this._suitText);

    this.add(this.shell);
    this.add(this.timer);
    this.add(this.timerGlow);

    this.redraw();
  }

  setProfileImage(url, name, { showImage = true, seatIndex = -1 } = {}) {
    this.profileName = name;
    this.avatar.setVisible(showImage);

    if (!showImage) {
      this.avatar.setTexture(assets.profile_picture);
      this.redraw();
      return;
    }

    const directSource = getAvatarImageSrc(url, name, seatIndex);
    const fallbackSource = getBuiltInAvatar(name, seatIndex)?.sPath || "";

    if (this.useAvailableTexture(directSource, name)) return;
    if (this.useAvailableTexture(fallbackSource, name)) return;

    this.avatar.setTexture(assets.profile_picture);
    this.redraw();

    if (directSource) {
      this.loadRuntimeTexture(directSource, name);
      return;
    }

    if (fallbackSource) {
      this.loadRuntimeTexture(fallbackSource, name);
    }
  }

  useAvailableTexture(src, seed) {
    if (!src) return false;

    const builtInTextureKey = getAvatarTextureKey(src, seed);
    if (builtInTextureKey && this.scene.textures.exists(builtInTextureKey)) {
      this.avatar.setTexture(builtInTextureKey);
      this.redraw();
      return true;
    }

    const runtimeTextureKey = this.getRuntimeTextureKey(src);
    if (this.scene.textures.exists(runtimeTextureKey)) {
      this.avatar.setTexture(runtimeTextureKey);
      this.redraw();
      return true;
    }

    return false;
  }

  getRuntimeTextureKey(src = "") {
    const normalizedSrc = String(src || "");
    const hash = normalizedSrc
      .split("")
      .reduce((accumulator, character) => ((accumulator * 37) + character.charCodeAt(0)) % 2147483647, 29);

    return `fresh-profile-${Math.abs(hash)}`;
  }

  loadRuntimeTexture(src, seed) {
    if (!src) return;

    const builtInTextureKey = getAvatarTextureKey(src, seed);
    if (builtInTextureKey && this.scene.textures.exists(builtInTextureKey)) return;

    const runtimeTextureKey = this.getRuntimeTextureKey(src);
    if (this.scene.textures.exists(runtimeTextureKey)) return;
    if (this.pendingTextureKey === runtimeTextureKey) return;

    if (this.scene.load.isLoading()) {
      this.queuedTexture = { src, seed };
      this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
        const nextTexture = this.queuedTexture;
        this.queuedTexture = null;
        if (!nextTexture) return;
        this.loadRuntimeTexture(nextTexture.src, nextTexture.seed);
      });
      return;
    }

    this.pendingTextureKey = runtimeTextureKey;
    this.scene.load.image(runtimeTextureKey, src);
    this.scene.load.once(`filecomplete-image-${runtimeTextureKey}`, () => {
      this.pendingTextureKey = "";
      if (!this.avatar || !this.scene.textures.exists(runtimeTextureKey)) return;

      this.avatar.setTexture(runtimeTextureKey);
      this.redraw();
    });
    this.scene.load.once(Phaser.Loader.Events.LOAD_ERROR, () => {
      this.pendingTextureKey = "";
    });
    this.scene.load.start();
  }

  redraw() {
    const frame = this.avatar?.frame;
    const sourceWidth =
      Number(frame?.realWidth) ||
      Number(frame?.width) ||
      Number(this.avatar?.width) ||
      this.avatarDiameter;
    const sourceHeight =
      Number(frame?.realHeight) ||
      Number(frame?.height) ||
      Number(this.avatar?.height) ||
      this.avatarDiameter;
    const coverScale = Math.max(this.avatarDiameter / sourceWidth, this.avatarDiameter / sourceHeight);
    const outerRadius = this.frameDiameter / 2;
    const clipRadius = this.maskDiameter / 2;

    this.avatar.setDisplaySize(sourceWidth * coverScale, sourceHeight * coverScale);

    // Backdrop: dark filled circle behind avatar
    this.backdrop.clear();
    this.backdrop.fillStyle(0x111111, 0.96);
    this.backdrop.fillCircle(0, 0, outerRadius);

    if (!this.avatar.visible) {
      this.backdrop.fillStyle(0x1a1714, 1);
      this.backdrop.fillCircle(0, 0, clipRadius);
    }

    // Frame overlay: dark clip ring + themed poker-chip border + suit badge
    this.frameOverlay.clear();
    const accentColor = this._frameColor || 0xf5c842;
    const ringCenter = (clipRadius + outerRadius) / 2;
    const ringHalfWidth = (outerRadius - clipRadius) / 2 + 3;

    // Clipping ring (hides avatar outside circle)
    this.frameOverlay.lineStyle(ringHalfWidth * 2, 0x0e0c09, 1);
    this.frameOverlay.strokeCircle(0, 0, ringCenter);

    // Soft outer glow halo
    this.frameOverlay.lineStyle(this.isLocalSeat ? 10 : 7, accentColor, 0.2);
    this.frameOverlay.strokeCircle(0, 0, outerRadius + (this.isLocalSeat ? 5 : 4));

    // Main accent border
    this.frameOverlay.lineStyle(this.isLocalSeat ? 5 : 3.5, accentColor, 1);
    this.frameOverlay.strokeCircle(0, 0, outerRadius - 2);

    // Poker chip tick marks around the rim
    const tickCount = this.isLocalSeat ? 16 : 12;
    const tickInner = outerRadius + 1;
    const tickOuter = outerRadius + (this.isLocalSeat ? 7 : 5);
    this.frameOverlay.lineStyle(this.isLocalSeat ? 2.5 : 2, accentColor, 0.65);
    for (let i = 0; i < tickCount; i++) {
      const angle = (i / tickCount) * Math.PI * 2 - Math.PI / 2;
      this.frameOverlay.lineBetween(
        Math.cos(angle) * tickInner, Math.sin(angle) * tickInner,
        Math.cos(angle) * tickOuter, Math.sin(angle) * tickOuter
      );
    }

    // Inner brightening ring
    this.frameOverlay.lineStyle(1.5, 0xffffff, 0.15);
    this.frameOverlay.strokeCircle(0, 0, Math.max(clipRadius + 4, outerRadius - 12));

    this._drawSuitBadge();
  }

  _drawSuitBadge() {
    if (!this._suitBadgeGraphics || !this._suitText) return;
    const outerRadius = this.frameDiameter / 2;
    const badgeR = this.isLocalSeat ? 13 : 10;
    const angle = Math.PI * 0.25; // 45° = bottom-right
    const bx = Math.cos(angle) * outerRadius;
    const by = Math.sin(angle) * outerRadius;
    const accentColor = this._frameColor || 0xf5c842;

    this._suitBadgeGraphics.clear();
    this._suitBadgeGraphics.fillStyle(0x030810, 1);
    this._suitBadgeGraphics.fillCircle(bx, by, badgeR + 2);
    this._suitBadgeGraphics.fillStyle(accentColor, 1);
    this._suitBadgeGraphics.fillCircle(bx, by, badgeR);

    this._suitText.setPosition(bx, by - 1);
  }

  resTurnTimer = () => {};

  startTurnTimer(ttl, totalTime) {
    this.resetTurnTimer();

    const radius = (this.frameDiameter / 2) + (this.isLocalSeat ? 10 : 7);
    const lineWidth = this.isLocalSeat ? 8 : 5;
    const cy = this.profileOffsetY;
    const startAngle = -Math.PI / 2; // 12 o'clock

    const endTime = Date.now() + ttl;
    const duration = totalTime > 0 ? totalTime : ttl;

    const tick = () => {
      const remaining = endTime - Date.now();
      const fraction = Math.max(0, Math.min(1, remaining / duration));

      // Color: green → amber → red
      let color;
      if (fraction > 0.5) {
        // green → amber  (fraction 1.0 → 0.5)
        const t = (fraction - 0.5) / 0.5; // 1 at full, 0 at half
        const r = Math.round(Phaser.Math.Linear(0xff, 0x00, t));
        const g = Math.round(Phaser.Math.Linear(0xaa, 0xdd, t));
        const b = 0x00;
        color = (r << 16) | (g << 8) | b;
      } else {
        // amber → red  (fraction 0.5 → 0.0)
        const t = fraction / 0.5; // 1 at half, 0 at zero
        const r = 0xff;
        const g = Math.round(Phaser.Math.Linear(0x00, 0xaa, t));
        const b = 0x00;
        color = (r << 16) | (g << 8) | b;
      }

      const endArc = startAngle + fraction * Math.PI * 2;

      this.timerGlow.clear();
      // Dim track
      this.timerGlow.lineStyle(lineWidth, 0xffffff, 0.12);
      this.timerGlow.strokeCircle(0, cy, radius);
      // Active arc
      if (fraction > 0) {
        this.timerGlow.lineStyle(lineWidth, color, 0.92);
        this.timerGlow.beginPath();
        this.timerGlow.arc(0, cy, radius, startAngle, endArc, false);
        this.timerGlow.strokePath();
      }
      this.timerGlow.setVisible(true);

      if (remaining <= 0) {
        clearInterval(this.turnInterval);
      }
    };

    tick();
    this.turnInterval = setInterval(tick, 100);
  }

  setTimerTint(color = 0xf2d57e, alpha = 0.28) {
    const radius = (this.frameDiameter / 2) + (this.isLocalSeat ? 10 : 7);
    this.timerGlow.clear();
    this.timerGlow.lineStyle(this.isLocalSeat ? 8 : 6, color, alpha);
    this.timerGlow.strokeCircle(0, this.profileOffsetY, radius);
    this.timerGlow.setVisible(true);
  }

  resetTurnTimer() {
    clearInterval(this.turnInterval);
    this.timer.clearTint();
    this.timer.setVisible(false);
    this.timerGlow.clear();
    this.timerGlow.setVisible(false);
  }

  startActivePulse() {
    this.stopActivePulse();
    const radius = this.frameDiameter / 2 + (this.isLocalSeat ? 9 : 7);
    this._pulseRing = this.scene.add.graphics();
    this._pulseRing.lineStyle(this.isLocalSeat ? 6 : 4, this._frameColor || 0xf5c842, 1);
    this._pulseRing.strokeCircle(0, this.profileOffsetY, radius);
    this.shell.add(this._pulseRing);
    this._pulseTween = this.scene.tweens.add({
      targets: this._pulseRing,
      alpha: { from: 0.9, to: 0.15 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  stopActivePulse() {
    if (this._pulseTween) { this._pulseTween.stop(); this._pulseTween = null; }
    if (this._pulseRing) { this._pulseRing.destroy(); this._pulseRing = null; }
  }

  setFrameColor(hexColor = 0xf2d57e) {
    this._frameColor = hexColor;
    this.redraw();
  }
}