(function (global) {
  'use strict';

  global.__FXOverlayModules = global.__FXOverlayModules || {};
  var LAYER_ID = 'fx-overlay-pot-pulse-layer';
  var ACTIVE_PLAYER_LAYER_ID = 'fx-overlay-active-player-layer';
  var POT_STACK_LAYER_ID = 'fx-overlay-pot-stack-layer';
  var DEFAULT_CHIP_SRC = 'fx-overlay/chip.png';
  var potStackState = {
    amount: 0,
    chips: [],
    layer: null,
    visibleCount: 0,
    shadow: null,
  };
  var activePlayerState = {
    raf: null,
    anchorName: null,
    layer: null,
    halo: null,
    pedestal: null,
    spark: null,
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getOverlayAnchor(name) {
    var overlay = global.FXOverlay;
    if (!overlay || typeof overlay.getAnchor !== 'function') return null;

    return overlay.getAnchor(name);
  }

  function removeNode(node) {
    if (node && node.parentNode) node.parentNode.removeChild(node);
  }

  function animateNode(node, keyframes, options) {
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

    global.setTimeout(function () {
      removeNode(node);
    }, options.duration || 320);
    return true;
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
    global.document.body.appendChild(layer);

    return layer;
  }

  function getChipImageSource() {
    var configured = global.FXOverlayConfig && global.FXOverlayConfig.chipImage;
    return typeof configured === 'string' && configured ? configured : DEFAULT_CHIP_SRC;
  }

  function getActivePlayerLayer() {
    if (!global.document || !global.document.body) return null;
    if (activePlayerState.layer) return activePlayerState.layer;

    var layer = global.document.getElementById(ACTIVE_PLAYER_LAYER_ID);
    if (!layer) {
      layer = global.document.createElement('div');
      layer.id = ACTIVE_PLAYER_LAYER_ID;
      layer.setAttribute('aria-hidden', 'true');
      layer.style.position = 'fixed';
      layer.style.left = '0';
      layer.style.top = '0';
      layer.style.width = '100vw';
      layer.style.height = '100vh';
      layer.style.pointerEvents = 'none';
      layer.style.overflow = 'hidden';
      layer.style.zIndex = '2147483646';
      global.document.body.appendChild(layer);
    }

    var halo = global.document.createElement('div');
    halo.style.position = 'absolute';
    halo.style.borderRadius = '999px';
    halo.style.pointerEvents = 'none';
    halo.style.opacity = '0';
    halo.style.mixBlendMode = 'screen';
    halo.style.transition = 'opacity 180ms ease-out';
    halo.style.filter = 'blur(14px)';

    var pedestal = global.document.createElement('div');
    pedestal.style.position = 'absolute';
    pedestal.style.borderRadius = '999px';
    pedestal.style.pointerEvents = 'none';
    pedestal.style.opacity = '0';
    pedestal.style.transition = 'opacity 180ms ease-out';
    pedestal.style.background = 'radial-gradient(ellipse at center, rgba(135, 255, 231, 0.22) 0%, rgba(135, 255, 231, 0.10) 38%, rgba(135, 255, 231, 0) 72%)';
    pedestal.style.filter = 'blur(10px)';

    var spark = global.document.createElement('div');
    spark.style.position = 'absolute';
    spark.style.borderRadius = '999px';
    spark.style.pointerEvents = 'none';
    spark.style.opacity = '0';
    spark.style.mixBlendMode = 'screen';
    spark.style.transition = 'opacity 180ms ease-out';

    layer.appendChild(halo);
    layer.appendChild(pedestal);
    layer.appendChild(spark);

    activePlayerState.layer = layer;
    activePlayerState.halo = halo;
    activePlayerState.pedestal = pedestal;
    activePlayerState.spark = spark;

    if (typeof halo.animate === 'function') {
      halo.animate(
        [
          { transform: 'scale(0.94)', opacity: 0.72 },
          { transform: 'scale(1.04)', opacity: 0.98 },
          { transform: 'scale(0.96)', opacity: 0.78 },
        ],
        {
          duration: 1800,
          easing: 'ease-in-out',
          iterations: Infinity,
        }
      );
    }

    if (typeof pedestal.animate === 'function') {
      pedestal.animate(
        [
          { transform: 'scale(0.96)', opacity: 0.7 },
          { transform: 'scale(1.04)', opacity: 0.92 },
          { transform: 'scale(0.98)', opacity: 0.74 },
        ],
        {
          duration: 1800,
          easing: 'ease-in-out',
          iterations: Infinity,
        }
      );
    }

    if (typeof spark.animate === 'function') {
      spark.animate(
        [
          { transform: 'translateY(0px) scale(0.95)', opacity: 0.34 },
          { transform: 'translateY(-5px) scale(1.02)', opacity: 0.18 },
          { transform: 'translateY(0px) scale(0.96)', opacity: 0.3 },
        ],
        {
          duration: 2000,
          easing: 'ease-in-out',
          iterations: Infinity,
        }
      );
    }

    return layer;
  }

  function getPotStackLayer() {
    if (!global.document || !global.document.body) return null;
    if (potStackState.layer) return potStackState.layer;

    var layer = global.document.getElementById(POT_STACK_LAYER_ID);
    if (!layer) {
      layer = global.document.createElement('div');
      layer.id = POT_STACK_LAYER_ID;
      layer.setAttribute('aria-hidden', 'true');
      layer.style.position = 'fixed';
      layer.style.left = '0';
      layer.style.top = '0';
      layer.style.width = '100vw';
      layer.style.height = '100vh';
      layer.style.pointerEvents = 'none';
      layer.style.overflow = 'hidden';
      layer.style.zIndex = '2147483645';
      global.document.body.appendChild(layer);
    }

    if (!potStackState.shadow) {
      var shadow = global.document.createElement('div');
      shadow.style.position = 'absolute';
      shadow.style.left = '0';
      shadow.style.top = '0';
      shadow.style.pointerEvents = 'none';
      shadow.style.opacity = '0';
      shadow.style.borderRadius = '999px';
      shadow.style.background = 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.24) 0%, rgba(0, 0, 0, 0.16) 48%, rgba(0, 0, 0, 0) 74%)';
      shadow.style.transition = 'opacity 180ms ease-out';
      layer.appendChild(shadow);
      potStackState.shadow = shadow;
    }

    potStackState.layer = layer;
    return layer;
  }

  function cancelActivePlayerLoop() {
    if (activePlayerState.raf) {
      global.cancelAnimationFrame(activePlayerState.raf);
      activePlayerState.raf = null;
    }
  }

  function clearSpotlight() {
    cancelActivePlayerLoop();
    activePlayerState.anchorName = null;

    if (activePlayerState.halo) activePlayerState.halo.style.opacity = '0';
    if (activePlayerState.pedestal) activePlayerState.pedestal.style.opacity = '0';
    if (activePlayerState.spark) activePlayerState.spark.style.opacity = '0';

    return true;
  }

  function renderSpotlight(anchor) {
    if (!anchor) return clearSpotlight();

    getActivePlayerLayer();
    if (!activePlayerState.halo || !activePlayerState.pedestal || !activePlayerState.spark) return false;

    var haloWidth = clamp(Math.max(anchor.width || 150, 170) * 1.32, 190, 300);
    var haloHeight = clamp(Math.max(anchor.height || 120, 120) * 0.9, 120, 190);
    var pedestalWidth = clamp((anchor.width || 150) * 1.18, 160, 250);
    var pedestalHeight = clamp((anchor.height || 80) * 0.46, 34, 72);
    var sparkWidth = haloWidth * 0.82;
    var sparkHeight = haloHeight * 0.54;
    var haloY = anchor.y - (anchor.height || 0) * 0.02;
    var pedestalY = anchor.y + (anchor.height || 0) * 0.34;

    activePlayerState.halo.style.left = anchor.x - haloWidth / 2 + 'px';
    activePlayerState.halo.style.top = haloY - haloHeight / 2 + 'px';
    activePlayerState.halo.style.width = haloWidth + 'px';
    activePlayerState.halo.style.height = haloHeight + 'px';
    activePlayerState.halo.style.background =
      'radial-gradient(ellipse at center, rgba(214, 255, 245, 0.26) 0%, rgba(173, 255, 236, 0.12) 34%, rgba(173, 255, 236, 0) 74%)';
    activePlayerState.halo.style.opacity = '0.92';

    activePlayerState.pedestal.style.left = anchor.x - pedestalWidth / 2 + 'px';
    activePlayerState.pedestal.style.top = pedestalY - pedestalHeight / 2 + 'px';
    activePlayerState.pedestal.style.width = pedestalWidth + 'px';
    activePlayerState.pedestal.style.height = pedestalHeight + 'px';
    activePlayerState.pedestal.style.opacity = '1';

    activePlayerState.spark.style.left = anchor.x - sparkWidth / 2 + 'px';
    activePlayerState.spark.style.top = haloY - sparkHeight / 2 - 2 + 'px';
    activePlayerState.spark.style.width = sparkWidth + 'px';
    activePlayerState.spark.style.height = sparkHeight + 'px';
    activePlayerState.spark.style.background =
      'radial-gradient(ellipse at center, rgba(255,255,255,0.20) 0%, rgba(206,255,245,0.10) 34%, rgba(206,255,245,0) 74%)';
    activePlayerState.spark.style.filter = 'blur(12px)';
    activePlayerState.spark.style.opacity = '0.88';

    return true;
  }

  function updateSpotlight() {
    if (!activePlayerState.anchorName) return;

    renderSpotlight(getOverlayAnchor(activePlayerState.anchorName));
    activePlayerState.raf = global.requestAnimationFrame(updateSpotlight);
  }

  function spotlight(options) {
    var anchorName = (options && options.anchorName) || 'activePlayer';
    var anchor = getOverlayAnchor(anchorName);
    if (!anchor) return false;

    activePlayerState.anchorName = anchorName;
    renderSpotlight(anchor);
    cancelActivePlayerLoop();
    activePlayerState.raf = global.requestAnimationFrame(updateSpotlight);

    return true;
  }

  function getPotStackChipCount(amount) {
    var value = Number(amount) || 0;
    if (value <= 0) return 0;
    return clamp(Math.round(Math.log10(value + 10) * 2.2), 3, 8);
  }

  function createPotStackChip() {
    var chip = global.document.createElement('div');
    chip.style.position = 'absolute';
    chip.style.width = '34px';
    chip.style.height = '34px';
    chip.style.pointerEvents = 'none';
    chip.style.opacity = '0';
    chip.style.willChange = 'transform, opacity';
    chip.style.backgroundImage = 'url("' + getChipImageSource() + '")';
    chip.style.backgroundRepeat = 'no-repeat';
    chip.style.backgroundPosition = 'center';
    chip.style.backgroundSize = 'contain';
    chip.style.filter = 'drop-shadow(0 8px 14px rgba(0, 0, 0, 0.28))';
    chip.style.transition = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease-out';
    return chip;
  }

  function ensurePotStackChips(count) {
    var layer = getPotStackLayer();
    if (!layer) return [];

    while (potStackState.chips.length < count) {
      var chip = createPotStackChip();
      layer.appendChild(chip);
      potStackState.chips.push(chip);
    }

    return potStackState.chips;
  }

  function positionPotStackChip(chip, anchor, index) {
    var row = Math.floor(index / 3);
    var column = index % 3;
    var offsetX = (column - 1) * 10 + (row % 2 ? 4 : 0);
    var offsetY = row * -5 + Math.abs(column - 1) * 1.5;
    var scale = 0.76 + row * 0.025;
    var x = anchor.x + offsetX;
    var y = anchor.y + offsetY;

    chip.style.left = x - 17 + 'px';
    chip.style.top = y - 17 + 'px';
    chip.style.transform = 'translate3d(0,0,0) scale(' + scale + ') rotate(' + ((column - 1) * 3) + 'deg)';
    chip.style.opacity = '1';
  }

  function hidePotStack() {
    potStackState.amount = 0;
    potStackState.visibleCount = 0;
    if (potStackState.shadow) potStackState.shadow.style.opacity = '0';
    potStackState.chips.forEach(function (chip) {
      chip.style.opacity = '0';
      chip.style.transform = 'scale(0.72) translateY(6px)';
    });
    return true;
  }

  function renderPotStack(anchor, amount) {
    var targetCount = getPotStackChipCount(amount);
    var count = potStackState.visibleCount;

    if (!targetCount) return hidePotStack();

    if (potStackState.amount <= 0 && amount > 0) {
      count = 3;
    } else if (amount > potStackState.amount) {
      count = Math.min(8, Math.max(count + 1, 3));
    } else {
      count = Math.max(count, 3);
    }

    ensurePotStackChips(count);

    if (potStackState.shadow) {
      potStackState.shadow.style.width = '86px';
      potStackState.shadow.style.height = '26px';
      potStackState.shadow.style.left = anchor.x - 43 + 'px';
      potStackState.shadow.style.top = anchor.y + 7 + 'px';
      potStackState.shadow.style.opacity = '1';
    }

    potStackState.chips.forEach(function (chip, index) {
      if (index < count) {
        positionPotStackChip(chip, anchor, index);
      } else {
        chip.style.opacity = '0';
        chip.style.transform = 'scale(0.72) translateY(6px)';
      }
    });

    potStackState.amount = amount;
    potStackState.visibleCount = Math.max(3, Math.min(count, 8));
    return true;
  }

  function setPotStackAmount(amount, options) {
    try {
      var anchor =
        (options && options.targetAnchor) ||
        getOverlayAnchor(options && options.target) ||
        getOverlayAnchor('potPile');
      if (!anchor) return false;

      return renderPotStack(anchor, Number(amount) || 0);
    } catch (_error) {
      return false;
    }
  }

  function pulseAnchor(anchor, duration, blur, brightness, color) {
    var layer = getLayer();
    if (!layer || !anchor) return false;

    var size = clamp(Math.max(anchor.width || 96, anchor.height || 60, 96), 72, 210);
    var node = global.document.createElement('div');
    node.style.position = 'absolute';
    node.style.left = anchor.x - size / 2 + 'px';
    node.style.top = anchor.y - size / 2 + 'px';
    node.style.width = size + 'px';
    node.style.height = size + 'px';
    node.style.borderRadius = '999px';
    node.style.pointerEvents = 'none';
    node.style.opacity = '0';
    node.style.mixBlendMode = 'screen';
    node.style.background = 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0) 72%)';
    node.style.boxShadow = '0 0 ' + blur + 'px ' + color;
    node.style.filter = 'brightness(' + brightness + ')';
    node.style.willChange = 'transform, opacity';

    layer.appendChild(node);

    return animateNode(
      node,
      [
        { transform: 'scale(0.82)', opacity: 0 },
        { transform: 'scale(1.0)', opacity: 0.92, offset: 0.42 },
        { transform: 'scale(1.1)', opacity: 0, offset: 1 },
      ],
      {
        duration: duration,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      }
    );
  }

  function pulse(options) {
    try {
      if (!global.document) return false;

      var pot = global.document.getElementById('pot');
      var anchor =
        (options && options.targetAnchor) ||
        getOverlayAnchor(options && options.target) ||
        getOverlayAnchor('pot');
      var duration = clamp(Number(options && options.duration) || 320, 180, 700);
      var blur = clamp(Number(options && options.blur) || 18, 8, 34);
      var brightness = clamp(Number(options && options.brightness) || 1.08, 1, 1.25);
      var color = (options && options.color) || 'rgba(255, 215, 90, 0.7)';

      if (!pot && anchor) {
        return pulseAnchor(anchor, duration, blur, brightness, color);
      }
      if (!pot) return false;

      if (typeof pot.animate === 'function') {
        var computedFilter = global.getComputedStyle(pot).filter;
        var baseFilter = computedFilter && computedFilter !== 'none' ? computedFilter : 'none';
        var glowFilter = 'drop-shadow(0 0 ' + blur + 'px ' + color + ') brightness(' + brightness + ')';

        pot.animate(
          [
            { filter: baseFilter, offset: 0 },
            { filter: glowFilter, offset: 0.35 },
            { filter: baseFilter, offset: 1 },
          ],
          {
            duration: duration,
            easing: 'ease-out',
            iterations: 1,
            fill: 'none',
          }
        );

        return true;
      }

      var previousFilter = pot.style.filter;
      var previousTransition = pot.style.transition;

      pot.style.transition = 'filter ' + duration + 'ms ease-out';
      pot.style.filter = 'drop-shadow(0 0 ' + blur + 'px ' + color + ') brightness(' + brightness + ')';

      global.setTimeout(function () {
        pot.style.filter = previousFilter;
        pot.style.transition = previousTransition;
      }, duration);

      return true;
    } catch (_error) {
      return false;
    }
  }

  global.__FXOverlayModules.potEffects = {
    clearSpotlight: clearSpotlight,
    pulse: pulse,
    setPotStackAmount: setPotStackAmount,
    spotlight: spotlight,
  };
})(window);
