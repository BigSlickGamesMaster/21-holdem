import Phaser from "phaser";
import assets from "../scripts/assets";
import { getAvatarImageSrc, getAvatarTextureKey, getBuiltInAvatar } from "../shared/constants/builtInAvatars";

export default class ProfileRenderer extends Phaser.GameObjects.Container {
  constructor(scene, x, y, { isLocalSeat = false, profileSize = 92, profileOffsetY = 0 } = {}) {
    super(scene, x, y);
    scene.add.existing(this);

    this.scene = scene;
    this.isLocalSeat = isLocalSeat;
    this.profileOffsetY = profileOffsetY;
    this.avatarDiameter = profileSize;
    this.frameDiameter = profileSize + (isLocalSeat ? 18 : 12);
    this.maskDiameter = profileSize - (isLocalSeat ? 10 : 8);
    this.pendingTextureKey = "";

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

    this.add(this.shell);
    this.add(this.timer);
    this.add(this.timerGlow);

    this.redraw();
  }

  setProfileImage(url, name, { showImage = true } = {}) {
    this.profileName = name;
    this.avatar.setVisible(showImage);

    if (!showImage) {
      this.avatar.setTexture(assets.profile_picture);
      this.redraw();
      return;
    }

    const directSource = getAvatarImageSrc(url, name);
    const fallbackSource = getBuiltInAvatar(name)?.sPath || "";

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
    this.backdrop.fillStyle(0x081722, 0.94);
    this.backdrop.fillCircle(0, 0, outerRadius);

    if (!this.avatar.visible) {
      this.backdrop.fillStyle(0x122738, 1);
      this.backdrop.fillCircle(0, 0, clipRadius);
    }

    // Frame overlay drawn ON TOP of avatar:
    // A thick dark ring covers from inside clipRadius outward, then gold border.
    // This visually clips the avatar to a circle without needing a geometry mask.
    this.frameOverlay.clear();
    const ringCenter = (clipRadius + outerRadius) / 2;
    const ringHalfWidth = (outerRadius - clipRadius) / 2 + 3; // +3px overlap into avatar edge
    this.frameOverlay.lineStyle(ringHalfWidth * 2, 0x081722, 1);
    this.frameOverlay.strokeCircle(0, 0, ringCenter);
    // Gold border
    this.frameOverlay.lineStyle(this.isLocalSeat ? 6 : 4, 0xf2d57e, 1);
    this.frameOverlay.strokeCircle(0, 0, outerRadius - 3);
    // Inner subtle ring
    this.frameOverlay.lineStyle(2, 0xffffff, 0.28);
    this.frameOverlay.strokeCircle(0, 0, Math.max(clipRadius + 4, outerRadius - 12));
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
}