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

  function chipTransfer(options) {
    var chipBurst = getModule('chipBurst');
    if (!chipBurst || typeof chipBurst.transferChips !== 'function') return false;

    return safe(function () {
      return chipBurst.transferChips(options || {});
    });
  }

  function showOverlayEffect(methodName, options) {
    var overlayUI = getModule('overlayUI');
    if (!overlayUI || typeof overlayUI[methodName] !== 'function') return false;

    return safe(function () {
      return overlayUI[methodName](options || {});
    });
  }

  function shakeScreen(intensity, duration) {
    var screenShake = getModule('screenShake');
    if (!screenShake || typeof screenShake.shake !== 'function') return false;

    return safe(function () {
      return screenShake.shake(intensity, duration);
    });
  }

  function resolveAudioAction(options, fallback) {
    if (!options || !Object.prototype.hasOwnProperty.call(options, 'audioAction')) {
      return fallback;
    }

    return options.audioAction;
  }

  function resolveEffectAnchor(options, fallbackName) {
    var anchor = options && options.anchor;
    if (anchor && isFiniteNumber(anchor.x) && isFiniteNumber(anchor.y)) {
      return {
        x: Number(anchor.x),
        y: Number(anchor.y),
        width: isFiniteNumber(anchor.width) ? Number(anchor.width) : 0,
        height: isFiniteNumber(anchor.height) ? Number(anchor.height) : 0,
      };
    }

    if (options && options.anchorName && global.FXOverlay && typeof global.FXOverlay.getAnchor === 'function') {
      return global.FXOverlay.getAnchor(options.anchorName);
    }

    if (fallbackName && global.FXOverlay && typeof global.FXOverlay.getAnchor === 'function') {
      return global.FXOverlay.getAnchor(fallbackName);
    }

    return null;
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

  FXOverlay.clear = function () {
    var chipBurst = getModule('chipBurst');
    var potEffects = getModule('potEffects');

    if (chipBurst && typeof chipBurst.clear === 'function') {
      safe(function () { return chipBurst.clear(); });
    }
    if (potEffects && typeof potEffects.clearPotStack === 'function') {
      safe(function () { return potEffects.clearPotStack(); });
    }
    if (potEffects && typeof potEffects.clearSpotlight === 'function') {
      safe(function () { return potEffects.clearSpotlight(); });
    }

    FXOverlay._anchors = {};

    if (global.document) {
      [
        'fx-overlay-chip-layer',
        'fx-overlay-pot-stack-layer',
        'fx-overlay-pot-pulse-layer',
        'fx-overlay-active-player-layer'
      ].forEach(function (id) {
        var node = global.document.getElementById(id);
        if (node && node.parentNode) node.parentNode.removeChild(node);
      });
    }

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

    return true;
  };

  FXOverlay.bigBet = function (amount, options) {
    if (!isEnabled()) return false;

    var audioAction = resolveAudioAction(options, 'raise');
    if (audioAction) {
      dispatchAudioAction(audioAction, { amount: amount });
    }
    chipThrow(amountToCount(amount, 3, 6), amount, 26, 820, {
      source: options && options.source,
      sourceAnchor: options && options.sourceAnchor,
      target: options && options.target ? options.target : 'potPile',
      targetAnchor: options && options.targetAnchor,
      stagger: 56,
    });
    setPotAmount(options && options.potAmount, { target: 'potPile' });

    return true;
  };

  FXOverlay.allIn = function (amount, options) {
    if (!isEnabled()) return false;

    var audioAction = resolveAudioAction(options, 'allIn');
    if (audioAction) {
      dispatchAudioAction(audioAction, { amount: amount });
    }
    chipThrow(amountToCount(amount, 5, 8), amount || 0, 28, 980, {
      source: options && options.source,
      sourceAnchor: options && options.sourceAnchor,
      target: options && options.target ? options.target : 'potPile',
      targetAnchor: options && options.targetAnchor,
      stagger: 62,
    });
    setPotAmount(options && options.potAmount, { target: 'potPile' });

    return true;
  };

  FXOverlay.winPot = function (amount, options) {
    if (!isEnabled()) return false;

    dispatchAudioAction('winPot', { amount: amount });
    chipWinBurst(amountToCount(amount, 6, 10), amount, 112, 640, {
      target: options && options.target ? options.target : 'activePlayer',
      targetAnchor: options && options.targetAnchor,
      size: 20,
    });

    return true;
  };

  FXOverlay.transferChips = function (options) {
    if (!isEnabled()) return false;

    return chipTransfer({
      amount: options && options.amount,
      count: options && options.count,
      direction: options && options.direction,
      duration: options && options.duration,
      hold: options && options.hold,
      size: options && options.size,
      source: options && options.source,
      sourceAnchor: options && options.sourceAnchor,
      target: options && options.target,
      targetAnchor: options && options.targetAnchor,
    });
  };

  FXOverlay.winnerCelebration = function (options) {
    if (!isEnabled()) return false;

    return showOverlayEffect('showWinnerCelebration', {
      anchor: resolveEffectAnchor(options, options && options.isSelf ? 'mySeat' : 'activePlayer'),
      isSelf: !!(options && options.isSelf),
      text: options && options.text ? options.text : null,
    });
  };

  FXOverlay.crownWinner = function (options) {
    if (!isEnabled()) return false;

    return showOverlayEffect('showCrown', {
      anchor: resolveEffectAnchor(options, 'activePlayer'),
      duration: options && options.duration,
    });
  };

  FXOverlay.bust = function (options) {
    if (!isEnabled()) return false;

    var anchor = resolveEffectAnchor(options, options && options.isSelf ? 'mySeat' : 'activePlayer');
    showOverlayEffect('showBust', {
      anchor: anchor,
      isSelf: !!(options && options.isSelf),
      text: options && options.text ? options.text : null,
    });

    if (options && options.isSelf) {
      shakeScreen(
        isFiniteNumber(options.intensity) ? Number(options.intensity) : 3.6,
        isFiniteNumber(options.duration) ? Number(options.duration) : 180
      );
    }

    return true;
  };

  FXOverlay.crowdOoh = function (options) {
    if (!isEnabled()) return false;

    dispatchAudioAction('crowdOoh', {
      text: options && options.text ? options.text : 'Oooooohhhhhh',
    });
    return showOverlayEffect('showCrowdOoh', {
      anchor: resolveEffectAnchor(options, 'mySeat'),
      isSelf: !!(options && options.isSelf),
      text: options && options.text ? options.text : null,
    });
  };

  FXOverlay.doubleDownMoment = function (options) {
    if (!isEnabled()) return false;

    return showOverlayEffect('showActionText', {
      anchor: resolveEffectAnchor(options, options && options.isSelf ? 'mySeat' : 'activePlayer'),
      isSelf: !!(options && options.isSelf),
      variant: 'doubleDown',
      text: options && options.text ? options.text : 'Double Down!',
      duration: options && options.duration ? options.duration : 2400,
    });
  };

  FXOverlay.screenShake = function (options) {
    if (!isEnabled()) return false;
    return shakeScreen(
      isFiniteNumber(options && options.intensity) ? Number(options.intensity) : 2.6,
      isFiniteNumber(options && options.duration) ? Number(options.duration) : 140
    );
  };

  FXOverlay.turnAlert = function () {
    if (!isEnabled()) return false;

    dispatchAudioAction('turnAlert');
    pulsePot({
      duration: 260,
      blur: 18,
      color: 'rgba(80, 255, 150, 0.82)',
      brightness: 1.08,
      target: 'mySeat',
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
