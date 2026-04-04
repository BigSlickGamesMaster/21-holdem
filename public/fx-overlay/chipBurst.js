(function (global) {
  'use strict';

  global.__FXOverlayModules = global.__FXOverlayModules || {};

  var LAYER_ID = 'fx-overlay-chip-layer';
  var DEFAULT_CHIP_SRC = 'fx-overlay/chip.png';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  }

  function easeOutBack(t) {
    var value = clamp(t, 0, 1);
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
  }

  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  function getLayer() {
    if (!global.document || !global.document.body) return null;

    var layer = global.document.getElementById(LAYER_ID);
    if (layer) return layer;

    layer = global.document.createElement('div');
    layer.id = LAYER_ID;
    layer.setAttribute('aria-hidden', 'true');
    layer.style.position = 'fixed';
    layer.style.left = '0';
    layer.style.top = '0';
    layer.style.width = '100vw';
    layer.style.height = '100vh';
    layer.style.pointerEvents = 'none';
    layer.style.overflow = 'hidden';
    layer.style.zIndex = '2147483646';
    layer.style.contain = 'layout style paint';
    global.document.body.appendChild(layer);
    return layer;
  }

  function getChipImageSource() {
    var configured = global.FXOverlayConfig && global.FXOverlayConfig.chipImage;
    return typeof configured === 'string' && configured ? configured : DEFAULT_CHIP_SRC;
  }

  function getAnchor(name) {
    var overlay = global.FXOverlay;
    if (!overlay || typeof overlay.getAnchor !== 'function' || !name) return null;
    return overlay.getAnchor(name);
  }

  function resolvePoint(anchorName, anchorOverride, fallbackName) {
    var anchor = anchorOverride || getAnchor(anchorName) || getAnchor(fallbackName);
    if (!anchor || !isFinite(Number(anchor.x)) || !isFinite(Number(anchor.y))) return null;

    return {
      x: Number(anchor.x),
      y: Number(anchor.y),
    };
  }

  function removeNode(node) {
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  function createChipNode(size) {
    var node = global.document.createElement('div');
    node.style.position = 'absolute';
    node.style.left = '0';
    node.style.top = '0';
    node.style.width = size + 'px';
    node.style.height = size + 'px';
    node.style.pointerEvents = 'none';
    node.style.opacity = '0';
    node.style.willChange = 'transform, opacity';
    node.style.transformOrigin = '50% 50%';
    node.style.backgroundImage = 'url("' + getChipImageSource() + '")';
    node.style.backgroundRepeat = 'no-repeat';
    node.style.backgroundPosition = 'center';
    node.style.backgroundSize = 'contain';
    node.style.filter = 'drop-shadow(0 8px 14px rgba(0, 0, 0, 0.28))';
    return node;
  }

  var chipSystem = {
    chips: [],
    potChips: [],
    rafId: 0,
    lastFrameTime: 0,
    lastPotPoint: null,
  };

  function createChipObject(config) {
    var layer = getLayer();
    if (!layer) return null;

    var size = clamp(Number(config.size) || 24, 16, 40);
    var node = createChipNode(size);
    layer.appendChild(node);

    return {
      x: Number(config.x) || 0,
      y: Number(config.y) || 0,
      startX: Number(config.x) || 0,
      startY: Number(config.y) || 0,
      targetX: Number(config.targetX) || 0,
      targetY: Number(config.targetY) || 0,
      settleX: Number(config.targetX) || 0,
      settleY: Number(config.targetY) || 0,
      velocity: { x: 0, y: 0 },
      state: config.state || 'queued',
      duration: clamp(Number(config.duration) || 680, 220, 1800),
      elapsed: 0,
      delay: Math.max(0, Number(config.delay) || 0),
      arcHeight: Math.max(0, Number(config.arcHeight) || 0),
      curveX: Number(config.curveX) || 0,
      wobble: Number(config.wobble) || 0,
      size: size,
      scale: Number(config.scale) || 1,
      opacity: 0,
      rotation: Number(config.rotation) || 0,
      startRotation: Number(config.rotation) || 0,
      endRotation: Number(config.endRotation) || 0,
      node: node,
      removeOnArrival: !!config.removeOnArrival,
      stackRotation: Number(config.stackRotation) || 0,
      stackScale: Number(config.stackScale) || 1,
      spawnedAt: 0,
    };
  }

  function renderChip(chip) {
    if (!chip || !chip.node) return;

    var popProgress = chip.state === 'queued'
      ? 0
      : clamp(chip.elapsed / Math.min(chip.duration, 180), 0, 1);
    var scaleMultiplier = chip.state === 'stacked'
      ? chip.stackScale
      : easeOutBack(popProgress);
    var finalScale = chip.scale * clamp(scaleMultiplier, 0.72, 1.12);
    var rotation = chip.state === 'stacked' ? chip.stackRotation : chip.rotation;
    var halfSize = chip.size / 2;

    chip.node.style.opacity = String(chip.opacity);
    chip.node.style.transform =
      'translate3d(' + (chip.x - halfSize) + 'px, ' + (chip.y - halfSize) + 'px, 0) ' +
      'scale(' + finalScale + ') rotate(' + rotation + 'deg)';
  }

  function removeChip(chip) {
    if (!chip) return;

    removeNode(chip.node);
    chip.node = null;
    chip.state = 'removed';
  }

  function prunePotChips() {
    chipSystem.potChips = chipSystem.potChips.filter(function (chip) {
      return chip && chip.state !== 'removed' && chip.state !== 'finished';
    });
  }

  function updateChip(chip, deltaMs) {
    if (!chip || chip.state === 'removed' || chip.state === 'finished') return false;

    chip.spawnedAt += deltaMs;

    if (chip.state === 'queued') {
      chip.delay -= deltaMs;
      if (chip.delay > 0) {
        chip.opacity = 0;
        renderChip(chip);
        return true;
      }

      chip.state = 'flying';
      chip.elapsed = Math.max(0, -chip.delay);
      chip.delay = 0;
    } else {
      chip.elapsed += deltaMs;
    }

    if (chip.state === 'stacked') {
      chip.opacity = 1;
      renderChip(chip);
      return false;
    }

    var progress = clamp(chip.elapsed / Math.max(1, chip.duration), 0, 1);
    var eased = easeOutCubic(progress);
    var arc = Math.sin(progress * Math.PI) * chip.arcHeight;
    var sway = Math.sin(progress * Math.PI) * chip.wobble;
    var curve = Math.sin(progress * Math.PI) * chip.curveX;
    var nextX = lerp(chip.startX, chip.targetX, eased) + sway + curve;
    var nextY = lerp(chip.startY, chip.targetY, eased) - arc;
    var frameDelta = Math.max(deltaMs, 16);

    chip.velocity.x = (nextX - chip.x) / frameDelta;
    chip.velocity.y = (nextY - chip.y) / frameDelta;
    chip.x = nextX;
    chip.y = nextY;
    chip.rotation = lerp(chip.startRotation, chip.endRotation, eased);
    chip.opacity = chip.state === 'collecting'
      ? lerp(1, 0.12, Math.max(0, progress - 0.7) / 0.3)
      : lerp(0.15, 1, Math.min(1, progress * 2.5));

    if (progress >= 1) {
      chip.x = chip.targetX;
      chip.y = chip.targetY;
      chip.velocity.x = 0;
      chip.velocity.y = 0;

      if (chip.removeOnArrival || chip.state === 'collecting') {
        chip.state = 'finished';
        chip.opacity = 0;
        renderChip(chip);
        removeChip(chip);
        return false;
      }

      chip.state = 'stacked';
      chip.x = chip.settleX;
      chip.y = chip.settleY;
      chip.targetX = chip.settleX;
      chip.targetY = chip.settleY;
      chip.rotation = chip.stackRotation;
      chip.opacity = 1;
      renderChip(chip);
      return false;
    }

    renderChip(chip);
    return true;
  }

  function tick(frameTime) {
    if (!chipSystem.rafId) return;

    var deltaMs = chipSystem.lastFrameTime ? clamp(frameTime - chipSystem.lastFrameTime, 8, 40) : 16;
    chipSystem.lastFrameTime = frameTime;

    var hasMovingChip = false;
    chipSystem.chips = chipSystem.chips.filter(function (chip) {
      if (!chip || chip.state === 'removed' || chip.state === 'finished') {
        removeChip(chip);
        return false;
      }

      if (updateChip(chip, deltaMs)) {
        hasMovingChip = true;
      }

      return chip.state !== 'removed' && chip.state !== 'finished';
    });

    prunePotChips();

    if (hasMovingChip) {
      chipSystem.rafId = global.requestAnimationFrame(tick);
      return;
    }

    chipSystem.rafId = 0;
    chipSystem.lastFrameTime = 0;
  }

  function ensureLoop() {
    if (chipSystem.rafId) return;
    chipSystem.rafId = global.requestAnimationFrame(tick);
  }

  function createStackedChip(fromX, fromY, potX, potY, index, count, options) {
    var spread = Math.min(18, 6 + count * 1.8);
    var settleX = potX + random(-spread, spread);
    var settleY = potY + random(-spread * 0.45, spread * 0.45);
    var chip = createChipObject({
      x: fromX + random(-12, 12),
      y: fromY + random(-10, 10),
      targetX: settleX,
      targetY: settleY,
      duration: Number(options.duration) || random(520, 760),
      delay: index * (Number(options.stagger) || 52),
      arcHeight: random(24, 72),
      curveX: random(-16, 16),
      wobble: random(-10, 10),
      size: Number(options.size) || random(22, 28),
      scale: random(0.92, 1.06),
      rotation: random(-14, 14),
      endRotation: random(-22, 22),
      stackRotation: random(-20, 20),
      stackScale: random(0.94, 1.04),
    });

    if (!chip) return null;

    chip.settleX = settleX;
    chip.settleY = settleY;
    return chip;
  }

  function queueChipsToPot(playerX, playerY, potX, potY, options) {
    var count = clamp(
      Number(options && options.count) || Math.round(random(1, 5)),
      1,
      5
    );

    chipSystem.lastPotPoint = { x: potX, y: potY };

    for (var index = 0; index < count; index += 1) {
      var chip = createStackedChip(playerX, playerY, potX, potY, index, count, options || {});
      if (!chip) continue;
      chipSystem.chips.push(chip);
      chipSystem.potChips.push(chip);
    }

    ensureLoop();
    return true;
  }

  function seedPotIfEmpty(winnerX, winnerY, options) {
    if (chipSystem.potChips.length) return;

    var potPoint = chipSystem.lastPotPoint || {
      x: global.innerWidth * 0.5,
      y: global.innerHeight * 0.38,
    };

    var count = clamp(Number(options && options.count) || 5, 1, 8);
    for (var index = 0; index < count; index += 1) {
      var chip = createChipObject({
        x: potPoint.x + random(-18, 18),
        y: potPoint.y + random(-12, 12),
        targetX: potPoint.x + random(-18, 18),
        targetY: potPoint.y + random(-12, 12),
        duration: 1,
        delay: 0,
        arcHeight: 0,
        curveX: 0,
        wobble: 0,
        size: random(22, 28),
        scale: random(0.94, 1.04),
        rotation: random(-16, 16),
        endRotation: random(-16, 16),
        stackRotation: random(-18, 18),
        stackScale: random(0.96, 1.05),
      });
      if (!chip) continue;
      chip.state = 'stacked';
      chip.opacity = 1;
      chip.settleX = chip.x;
      chip.settleY = chip.y;
      renderChip(chip);
      chipSystem.chips.push(chip);
      chipSystem.potChips.push(chip);
    }

    chipSystem.lastPotPoint = {
      x: winnerX,
      y: winnerY,
    };
  }

  function collectPotToWinner(winnerX, winnerY, options) {
    seedPotIfEmpty(winnerX, winnerY, options);

    var activePotChips = chipSystem.potChips.slice();
    if (!activePotChips.length) return false;

    activePotChips.forEach(function (chip, index) {
      if (!chip || chip.state === 'removed' || chip.state === 'finished') return;

      chip.startX = chip.x;
      chip.startY = chip.y;
      chip.targetX = winnerX + random(-16, 16);
      chip.targetY = winnerY + random(-10, 10);
      chip.settleX = chip.targetX;
      chip.settleY = chip.targetY;
      chip.duration = clamp(Number(options && options.duration) || random(360, 520), 220, 900);
      chip.delay = index * (Number(options && options.stagger) || 24);
      chip.elapsed = 0;
      chip.arcHeight = random(34, 86);
      chip.curveX = random(-18, 18);
      chip.wobble = random(-8, 8);
      chip.startRotation = chip.rotation;
      chip.endRotation = chip.rotation + random(-36, 36);
      chip.removeOnArrival = true;
      chip.state = 'collecting';
      chip.opacity = 1;
    });

    chipSystem.potChips = [];
    ensureLoop();
    return true;
  }

  function onCall(playerX, playerY, potX, potY, options) {
    if (!isFinite(Number(playerX)) || !isFinite(Number(playerY)) || !isFinite(Number(potX)) || !isFinite(Number(potY))) {
      return false;
    }

    return queueChipsToPot(Number(playerX), Number(playerY), Number(potX), Number(potY), options || {});
  }

  function sendPotToWinner(winnerX, winnerY, options) {
    if (!isFinite(Number(winnerX)) || !isFinite(Number(winnerY))) return false;
    return collectPotToWinner(Number(winnerX), Number(winnerY), options || {});
  }

  function throwToPot(options) {
    var source = resolvePoint(options && options.source, options && options.sourceAnchor, 'betSource');
    var target = resolvePoint(options && options.target, options && options.targetAnchor, 'potPile') ||
      resolvePoint('potPile', null, 'pot');

    if (!source || !target) return false;

    return onCall(source.x, source.y, target.x, target.y, {
      count: Number(options && options.count) || 3,
      duration: Number(options && options.duration) || 680,
      size: Number(options && options.size) || 24,
      stagger: Number(options && options.stagger) || 52,
    });
  }

  function celebrateWin(options) {
    var target = resolvePoint(options && options.target, options && options.targetAnchor, 'activePlayer') ||
      resolvePoint('mySeat', null, 'activePlayer');
    if (!target) return false;

    return sendPotToWinner(target.x, target.y, {
      count: Number(options && options.count) || 6,
      duration: Number(options && options.duration) || 420,
      stagger: 18,
    });
  }

  function clear() {
    chipSystem.chips.forEach(removeChip);
    chipSystem.chips = [];
    chipSystem.potChips = [];
    chipSystem.lastFrameTime = 0;
    if (chipSystem.rafId) {
      global.cancelAnimationFrame(chipSystem.rafId);
      chipSystem.rafId = 0;
    }
    return true;
  }

  global.__FXOverlayModules.chipBurst = {
    clear: clear,
    onCall: onCall,
    sendPotToWinner: sendPotToWinner,
    throwToPot: throwToPot,
    celebrateWin: celebrateWin,
  };
})(window);
