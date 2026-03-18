(function (global) {
  'use strict';

  global.__FXOverlayModules = global.__FXOverlayModules || {};

  var LAYER_ID = 'fx-overlay-layer';
  var DEFAULT_CHIP_SRC = 'fx-overlay/chip.png';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
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
    layer.style.zIndex = '2147483647';
    layer.style.contain = 'layout style paint';
    global.document.body.appendChild(layer);

    return layer;
  }

  function getOverlayAnchor(name) {
    var overlay = global.FXOverlay;
    if (!overlay || typeof overlay.getAnchor !== 'function') return null;

    return overlay.getAnchor(name);
  }

  function getNamedAnchor(name) {
    return name ? getOverlayAnchor(name) : null;
  }

  function normalizeAnchor(anchor) {
    if (!anchor) return null;

    return {
      x: anchor.x,
      y: anchor.y,
      rect: {
        left: anchor.x - (anchor.width || 0) / 2,
        top: anchor.y - (anchor.height || 0) / 2,
        width: anchor.width || 0,
        height: anchor.height || 0,
      },
    };
  }

  function getTargetCenter(options) {
    return normalizeAnchor(
      (options && options.targetAnchor) ||
      getNamedAnchor(options && options.target) ||
      getOverlayAnchor('potPile') ||
      getOverlayAnchor('table') ||
      getOverlayAnchor('pot')
    );
  }

  function getSourceCenter(options) {
    return normalizeAnchor(
      (options && options.sourceAnchor) ||
      getNamedAnchor(options && options.source) ||
      getOverlayAnchor('betSource')
    );
  }

  function getChipImageSource() {
    var configured = global.FXOverlayConfig && global.FXOverlayConfig.chipImage;
    return typeof configured === 'string' && configured ? configured : DEFAULT_CHIP_SRC;
  }

  function removeNode(node) {
    if (node && node.parentNode) node.parentNode.removeChild(node);
  }

  function makeChip(size) {
    var chip = global.document.createElement('div');
    chip.style.position = 'absolute';
    chip.style.left = '0';
    chip.style.top = '0';
    chip.style.width = size + 'px';
    chip.style.height = size + 'px';
    chip.style.pointerEvents = 'none';
    chip.style.opacity = '0';
    chip.style.willChange = 'transform, opacity';
    chip.style.transformOrigin = '50% 50%';
    chip.style.backgroundImage = 'url("' + getChipImageSource() + '")';
    chip.style.backgroundRepeat = 'no-repeat';
    chip.style.backgroundPosition = 'center';
    chip.style.backgroundSize = 'contain';
    chip.style.filter = 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.26))';
    return chip;
  }

  function animateElement(node, keyframes, options) {
    if (typeof node.animate === 'function') {
      var animation = node.animate(keyframes, options);
      animation.onfinish = function () {
        removeNode(node);
      };
      animation.oncancel = function () {
        removeNode(node);
      };
      return true;
    }

    node.style.transform = keyframes[keyframes.length - 1].transform || '';
    node.style.opacity = keyframes[keyframes.length - 1].opacity || '0';
    global.setTimeout(function () {
      removeNode(node);
    }, options.duration || 400);
    return true;
  }

  function buildFlightFrame(x, y, scale, rotation) {
    return 'translate(' + x + 'px, ' + y + 'px) scale(' + scale + ') rotate(' + rotation + 'deg)';
  }

  function throwToPot(options) {
    try {
      var target = getTargetCenter(options);
      var source = getSourceCenter(options);
      var layer = getLayer();
      if (!target || !layer) return false;

      var count = clamp(Number(options && options.count) || 3, 1, 8);
      var size = clamp(Number(options && options.size) || 22, 16, 36);
      var duration = clamp(Number(options && options.duration) || 720, 420, 1400);
      var stagger = clamp(Number(options && options.stagger) || 54, 22, 120);
      var fan = Math.min(26, 8 + count * 2.5);
      var travelLift = clamp(Math.abs((source ? source.y : target.y) - target.y) * 0.18, 34, 110);

      for (var i = 0; i < count; i += 1) {
        var chip = makeChip(size + random(-1.5, 1.5));
        var startX = source ? source.x + random(-10, 10) : target.x;
        var startY = source ? source.y + random(-6, 10) : target.y;
        var endX = target.x + (i - (count - 1) / 2) * Math.min(10, fan * 0.32) + random(-4, 4);
        var endY = target.y + random(-3, 3);
        var midX = startX + (endX - startX) * 0.52 + random(-14, 14);
        var midY = Math.min(startY, endY) - travelLift - random(4, 14);
        var startRotation = random(-20, 20);
        var midRotation = startRotation + random(-36, 36);
        var endRotation = random(-10, 10);

        layer.appendChild(chip);

        animateElement(
          chip,
          [
            {
              transform: buildFlightFrame(startX, startY, 0.76, startRotation),
              opacity: 0,
            },
            {
              transform: buildFlightFrame(startX, startY - 4, 0.92, startRotation * 0.75),
              opacity: 1,
              offset: 0.09,
            },
            {
              transform: buildFlightFrame(midX, midY, 0.98, midRotation),
              opacity: 1,
              offset: 0.68,
            },
            {
              transform: buildFlightFrame(endX, endY, 0.88, endRotation),
              opacity: 0.92,
              offset: 0.92,
            },
            {
              transform: buildFlightFrame(endX, endY, 0.8, endRotation),
              opacity: 0,
            },
          ],
          {
            duration: duration + i * stagger,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'forwards',
          }
        );
      }

      return true;
    } catch (_error) {
      return false;
    }
  }

  function burstFromPot(options) {
    try {
      var target = getTargetCenter(options);
      var layer = getLayer();
      if (!target || !layer) return false;

      var count = clamp(Number(options && options.count) || 6, 1, 10);
      var spread = clamp(Number(options && options.spread) || 84, 36, 180);
      var duration = clamp(Number(options && options.duration) || 560, 280, 1100);
      var size = clamp(Number(options && options.size) || 18, 12, 28);

      for (var i = 0; i < count; i += 1) {
        var chip = makeChip(size + random(-1, 1.5));
        var angle = (-70 + (140 / Math.max(1, count - 1)) * i) + random(-8, 8);
        var radians = angle * (Math.PI / 180);
        var distance = spread * random(0.72, 1);
        var endX = target.x + Math.cos(radians) * distance;
        var endY = target.y + Math.sin(radians) * distance - random(0, 12);
        var rotation = random(-55, 55);

        layer.appendChild(chip);

        animateElement(
          chip,
          [
            {
              transform: buildFlightFrame(target.x, target.y, 0.48, rotation * 0.2),
              opacity: 0,
            },
            {
              transform: buildFlightFrame(target.x, target.y - 4, 0.9, rotation * 0.45),
              opacity: 1,
              offset: 0.14,
            },
            {
              transform: buildFlightFrame(endX, endY, 0.9, rotation),
              opacity: 0.86,
              offset: 0.82,
            },
            {
              transform: buildFlightFrame(endX, endY, 0.74, rotation * 1.1),
              opacity: 0,
            },
          ],
          {
            duration: duration + i * 18,
            easing: 'cubic-bezier(0.18, 0.84, 0.2, 1)',
            fill: 'forwards',
          }
        );
      }

      return true;
    } catch (_error) {
      return false;
    }
  }

  function celebrateWin(options) {
    try {
      return burstFromPot({
        count: clamp(Number(options && options.count) || 5, 1, 10),
        duration: clamp(Number(options && options.duration) || 520, 260, 1000),
        size: clamp(Number(options && options.size) || 18, 12, 28),
        spread: clamp(Number(options && options.spread) || 74, 32, 150),
        target: options && options.target,
        targetAnchor: options && options.targetAnchor,
      });
    } catch (_error) {
      return false;
    }
  }

  global.__FXOverlayModules.chipBurst = {
    burstFromPot: burstFromPot,
    celebrateWin: celebrateWin,
    throwToPot: throwToPot,
  };
})(window);
