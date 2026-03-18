(function (global) {
  'use strict';

  global.__FXOverlayModules = global.__FXOverlayModules || {};

  function safe(fn) {
    try {
      return fn();
    } catch (_error) {
      return false;
    }
  }

  function getModule(name) {
    return global.__FXOverlayModules && global.__FXOverlayModules[name]
      ? global.__FXOverlayModules[name]
      : null;
  }

  function isEnabled() {
    return global.FXOverlay && global.FXOverlay._enabled !== false;
  }

  function isFiniteNumber(value) {
    return isFinite(Number(value));
  }

  function amountToCount(amount, min, max) {
    var value = Number(amount) || 0;
    if (value <= 0) return min;
    return Math.max(min, Math.min(max, Math.round(Math.log10(value + 10) * 1.35)));
  }

  function chipThrow(count, amount, size, duration, options) {
    var chipBurst = getModule('chipBurst');
    if (!chipBurst || typeof chipBurst.throwToPot !== 'function') return false;

    return safe(function () {
      return chipBurst.throwToPot({
        count: count,
        amount: amount,
        size: size,
        duration: duration,
        palette: options && options.palette,
        source: options && options.source,
        sourceAnchor: options && options.sourceAnchor,
        target: options && options.target,
        targetAnchor: options && options.targetAnchor,
      });
    });
  }

  function chipWinBurst(count, amount, spread, duration, options) {
    var chipBurst = getModule('chipBurst');
    if (!chipBurst || typeof chipBurst.celebrateWin !== 'function') return false;

    return safe(function () {
      return chipBurst.celebrateWin({
        count: count,
        amount: amount,
        spread: spread,
        duration: duration,
        palette: options && options.palette,
        target: options && options.target,
        targetAnchor: options && options.targetAnchor,
      });
    });
  }

  function pulsePot(options) {
    var potEffects = getModule('potEffects');
    if (!potEffects || typeof potEffects.pulse !== 'function') return false;

    return safe(function () {
      return potEffects.pulse(options || {});
    });
  }

  function setPotAmount(amount, options) {
    var potEffects = getModule('potEffects');
    if (!potEffects || typeof potEffects.setPotStackAmount !== 'function') return false;

    return safe(function () {
      return potEffects.setPotStackAmount(amount, options || {});
    });
  }

  function dispatchAudioAction(actionName, payload) {
    var audioLayer = getModule('audioLayer');
    if (!audioLayer || typeof audioLayer.dispatch !== 'function') return false;

    return safe(function () {
      return audioLayer.dispatch(actionName, payload || {});
    });
  }

  function setSoundEnabled(value) {
    var audioLayer = getModule('audioLayer');
    if (!audioLayer || typeof audioLayer.setSoundEnabled !== 'function') return false;

    return safe(function () {
      return audioLayer.setSoundEnabled(value);
    });
  }

  function setMusicEnabled(value) {
    var audioLayer = getModule('audioLayer');
    if (!audioLayer || typeof audioLayer.setMusicEnabled !== 'function') return false;

    return safe(function () {
      return audioLayer.setMusicEnabled(value);
    });
  }

  function spotlightPlayer() {
    var potEffects = getModule('potEffects');
    if (!potEffects || typeof potEffects.spotlight !== 'function') return false;

    return safe(function () {
      return potEffects.spotlight({ anchorName: 'activePlayer' });
    });
  }

  function clearPlayerSpotlight() {
    var potEffects = getModule('potEffects');
    if (!potEffects || typeof potEffects.clearSpotlight !== 'function') return false;

    return safe(function () {
      return potEffects.clearSpotlight();
    });
  }

  function getRedChipPalette() {
    return {
      highlight: 'rgba(255,255,255,0.97)',
      mid: 'rgba(255, 130, 130, 0.98)',
      base: 'rgba(206, 39, 39, 0.98)',
      edge: 'rgba(94, 12, 12, 1)',
      glow: 'rgba(255, 64, 64, 0.46)',
    };
  }

  function showReactionBubble(emoji, options) {
    var overlayUI = getModule('overlayUI');
    if (!overlayUI || typeof overlayUI.showReaction !== 'function') return false;

    return safe(function () {
      return overlayUI.showReaction(emoji, options || {});
    });
  }

  function resolveAudioAction(options, fallback) {
    if (!options || !Object.prototype.hasOwnProperty.call(options, 'audioAction')) {
      return fallback;
    }

    return options.audioAction;
  }

  var FXOverlay = global.FXOverlay || {};

  FXOverlay._enabled = FXOverlay._enabled !== false;
  FXOverlay._anchors = FXOverlay._anchors || {};

  FXOverlay.enable = function () {
    FXOverlay._enabled = true;
    return true;
  };

  FXOverlay.disable = function () {
    FXOverlay._enabled = false;
    return true;
  };

  FXOverlay.setEnabled = function (value) {
    FXOverlay._enabled = !!value;
    return FXOverlay._enabled;
  };

  FXOverlay.isEnabled = function () {
    return FXOverlay._enabled !== false;
  };

  FXOverlay.action = function (actionName, payload) {
    if (!isEnabled()) return false;
    return dispatchAudioAction(actionName, payload);
  };

  FXOverlay.setAnchor = function (name, anchor) {
    if (!name || !anchor) return false;

    FXOverlay._anchors[name] = anchor;
    return true;
  };

  FXOverlay.clearAnchor = function (name) {
    if (!name || !FXOverlay._anchors[name]) return false;

    delete FXOverlay._anchors[name];
    return true;
  };

  FXOverlay.getAnchor = function (name) {
    try {
      if (!name || !FXOverlay._anchors[name]) return null;

      var anchor = FXOverlay._anchors[name];
      var resolved = typeof anchor === 'function' ? anchor() : anchor;
      if (!resolved) return null;
      if (!isFiniteNumber(resolved.x) || !isFiniteNumber(resolved.y)) return null;

      return {
        x: Number(resolved.x),
        y: Number(resolved.y),
        width: isFiniteNumber(resolved.width) ? Number(resolved.width) : 0,
        height: isFiniteNumber(resolved.height) ? Number(resolved.height) : 0,
      };
    } catch (_error) {
      return null;
    }
  };

  FXOverlay.smallBet = function (amount, options) {
    if (!isEnabled()) return false;

    var audioAction = resolveAudioAction(options, 'call');
    if (audioAction) {
      dispatchAudioAction(audioAction, { amount: amount });
    }
    chipThrow(amountToCount(amount, 1, 2), amount, 24, 680, {
      source: options && options.source,
      sourceAnchor: options && options.sourceAnchor,
      target: options && options.target ? options.target : 'potPile',
      targetAnchor: options && options.targetAnchor,
      stagger: 44,
    });
    setPotAmount(options && options.potAmount, { target: 'potPile' });
    pulsePot({
      duration: 240,
      blur: 12,
      color: 'rgba(255, 224, 150, 0.28)',
      brightness: 1.02,
      target: 'potPile',
    });

    return true;
  };

  FXOverlay.bigBet = function (amount, options) {
    if (!isEnabled()) return false;

    var audioAction = resolveAudioAction(options, 'raise');
    if (audioAction) {
      dispatchAudioAction(audioAction, { amount: amount });
    }
    chipThrow(amountToCount(amount, 2, 4), amount, 26, 760, {
      source: options && options.source,
      sourceAnchor: options && options.sourceAnchor,
      target: options && options.target ? options.target : 'potPile',
      targetAnchor: options && options.targetAnchor,
      stagger: 56,
    });
    setPotAmount(options && options.potAmount, { target: 'potPile' });
    pulsePot({
      duration: 280,
      blur: 16,
      color: 'rgba(255, 222, 142, 0.34)',
      brightness: 1.04,
      target: 'potPile',
    });

    return true;
  };

  FXOverlay.allIn = function (amount, options) {
    if (!isEnabled()) return false;

    var audioAction = resolveAudioAction(options, 'allIn');
    if (audioAction) {
      dispatchAudioAction(audioAction, { amount: amount });
    }
    chipThrow(amountToCount(amount, 4, 6), amount || 0, 28, 920, {
      source: options && options.source,
      sourceAnchor: options && options.sourceAnchor,
      target: options && options.target ? options.target : 'potPile',
      targetAnchor: options && options.targetAnchor,
      stagger: 62,
    });
    setPotAmount(options && options.potAmount, { target: 'potPile' });
    pulsePot({
      duration: 360,
      blur: 20,
      color: 'rgba(255, 188, 120, 0.42)',
      brightness: 1.08,
      target: 'potPile',
    });

    return true;
  };

  FXOverlay.winPot = function (amount, options) {
    if (!isEnabled()) return false;

    dispatchAudioAction('winPot', { amount: amount });
    pulsePot({
      duration: 340,
      blur: 24,
      color: 'rgba(120, 255, 180, 0.85)',
      brightness: 1.1,
      target: options && options.source ? options.source : 'potPile',
    });
    chipWinBurst(amountToCount(amount, 4, 6), amount, 86, 440, {
      target: options && options.source ? options.source : 'potPile',
      targetAnchor: options && options.sourceAnchor,
      size: 20,
    });
    chipThrow(amountToCount(amount, 4, 6), amount, 26, 860, {
      source: options && options.source ? options.source : 'potPile',
      sourceAnchor: options && options.sourceAnchor,
      target: options && options.target ? options.target : 'table',
      targetAnchor: options && options.targetAnchor,
      stagger: 58,
    });

    return true;
  };

  FXOverlay.blackjack = function () {
    if (!isEnabled()) return false;

    dispatchAudioAction('blackjack');
    pulsePot({
      duration: 380,
      blur: 26,
      color: 'rgba(255, 230, 110, 0.95)',
      brightness: 1.12,
      target: 'potPile',
    });
    chipWinBurst(6, 0, 94, 480, {
      target: 'potPile',
      size: 20,
    });

    return true;
  };

  FXOverlay.cardFlip = function () {
    if (!isEnabled()) return false;

    dispatchAudioAction('cardFlip');
    return true;
  };

  FXOverlay.dealCard = function () {
    if (!isEnabled()) return false;

    dispatchAudioAction('dealCard');
    return true;
  };

  FXOverlay.focusPlayer = function () {
    if (!isEnabled()) return false;
    return spotlightPlayer();
  };

  FXOverlay.clearFocus = function () {
    return clearPlayerSpotlight();
  };

  FXOverlay.setPotAmount = function (amount) {
    if (!isEnabled()) return false;
    return setPotAmount(amount, { target: 'potPile' });
  };

  FXOverlay.showReaction = function (emoji, options) {
    if (!isEnabled()) return false;
    return showReactionBubble(emoji, options);
  };

  FXOverlay.setSoundEnabled = function (value) {
    return setSoundEnabled(value);
  };

  FXOverlay.setMusicEnabled = function (value) {
    return setMusicEnabled(value);
  };

  global.FXOverlay = FXOverlay;
})(window);
