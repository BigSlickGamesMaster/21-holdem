(function (global) {
  'use strict';

  global.__FXOverlayModules = global.__FXOverlayModules || {};

  var ACTION_EVENT = 'fxoverlay:action';
  var DEFAULT_SOURCES = {
    allIn: 'fx-overlay/audio/all-in.mp3',
    blackjack: 'fx-overlay/audio/blackjack.mp3',
    button: 'fx-overlay/audio/button.mp3',
    bust: 'fx-overlay/audio/bust.mp3',
    cardFlip: 'fx-overlay/audio/card-flip.mp3',
    dealCard: 'fx-overlay/audio/deal-card.mp3',
    doubleDown: 'fx-overlay/audio/double-down.mp3',
    fold: 'fx-overlay/audio/fold.mp3',
    music: 'fx-overlay/audio/music.mp3',
    raise: 'fx-overlay/audio/raise.mp3',
    smallBet: 'fx-overlay/audio/call.mp3',
    stand: 'fx-overlay/audio/stand.mp3',
    timer: 'fx-overlay/audio/timer.mp3',
    winPot: 'fx-overlay/audio/win-pot.mp3',
    check: 'fx-overlay/audio/check.mp3',
  };
  var ACTION_MAP = {
    allIn: { sound: 'allIn', volume: 0.34, playbackRate: 0.94 },
    blackjack: { sound: 'blackjack', volume: 0.42, playbackRate: 1.0 },
    bigBet: { sound: 'raise', volume: 0.28, playbackRate: 0.98 },
    bust: { sound: 'bust', volume: 0.3, playbackRate: 1.0 },
    button: { sound: 'button', volume: 0.18, playbackRate: 1.0 },
    call: { sound: 'smallBet', volume: 0.2, playbackRate: 1.02 },
    cardFlip: { sound: 'cardFlip', volume: 0.14, playbackRate: 1.1 },
    check: { sound: 'check', volume: 0.16, playbackRate: 1.0 },
    dealCard: { sound: 'dealCard', volume: 0.1, playbackRate: 1.12 },
    doubleDown: { sound: 'doubleDown', volume: 0.24, playbackRate: 0.96 },
    fold: { sound: 'fold', volume: 0.24, playbackRate: 1.0 },
    musicStart: { sound: 'music', volume: 0.25, playbackRate: 1.0, loop: true, music: true },
    musicStop: { stop: 'music', music: true },
    raise: { sound: 'raise', volume: 0.26, playbackRate: 0.98 },
    smallBet: { sound: 'smallBet', volume: 0.2, playbackRate: 1.02 },
    stand: { sound: 'stand', volume: 0.18, playbackRate: 1.0 },
    timer: { sound: 'timer', volume: 0.16, playbackRate: 1.0 },
    winPot: { sound: 'winPot', volume: 0.36, playbackRate: 1.0 },
  };
  var state = {
    initialized: false,
    isMusicEnabled: true,
    isSoundEnabled: true,
    activeMusic: {},
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getConfigAudio() {
    return global.FXOverlayConfig && global.FXOverlayConfig.audio
      ? global.FXOverlayConfig.audio
      : {};
  }

  function getSource(name) {
    var configAudio = getConfigAudio();
    if (typeof configAudio[name] === 'string' && configAudio[name]) return configAudio[name];
    return DEFAULT_SOURCES[name] || '';
  }

  function isEnabledFor(options) {
    return options && options.music ? state.isMusicEnabled : state.isSoundEnabled;
  }

  function buildAudio(src, options) {
    var audio = new global.Audio(src);
    audio.preload = 'auto';
    audio.loop = !!(options && options.loop);
    audio.volume = clamp(Number(options && options.volume) || 0.2, 0, 1);

    if (options && Number.isFinite(Number(options.playbackRate))) {
      audio.playbackRate = clamp(Number(options.playbackRate), 0.5, 2);
    }

    return audio;
  }

  function play(name, options) {
    try {
      if (typeof global.Audio !== 'function') return false;
      if (!isEnabledFor(options)) return false;

      var src = getSource(name);
      if (!src) return false;

      if (options && options.music) {
        stop(name);
      }

      var audio = buildAudio(src, options || {});
      var playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () {});
      }

      if (options && options.music) {
        state.activeMusic[name] = audio;
      }

      return true;
    } catch (_error) {
      return false;
    }
  }

  function stop(name) {
    var audio = state.activeMusic[name];
    if (!audio) return false;

    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (_error) {}

    delete state.activeMusic[name];
    return true;
  }

  function handleAction(actionName, payload) {
    var action = ACTION_MAP[actionName];
    if (!action) return false;

    if (action.stop) {
      return stop(action.stop);
    }

    return play(action.sound, {
      loop: !!action.loop,
      music: !!action.music,
      playbackRate:
        payload && Number.isFinite(Number(payload.playbackRate))
          ? Number(payload.playbackRate)
          : action.playbackRate,
      volume:
        payload && Number.isFinite(Number(payload.volume))
          ? Number(payload.volume)
          : action.volume,
    });
  }

  function dispatch(actionName, payload) {
    try {
      if (!actionName || !global.dispatchEvent || typeof global.CustomEvent !== 'function') return false;

      global.dispatchEvent(
        new global.CustomEvent(ACTION_EVENT, {
          detail: {
            action: actionName,
            payload: payload || {},
          },
        })
      );
      return true;
    } catch (_error) {
      return false;
    }
  }

  function onAction(event) {
    var detail = event && event.detail ? event.detail : {};
    if (!detail.action) return false;

    return handleAction(detail.action, detail.payload || {});
  }

  function setSoundEnabled(value) {
    state.isSoundEnabled = !!value;
    return state.isSoundEnabled;
  }

  function setMusicEnabled(value) {
    state.isMusicEnabled = !!value;
    if (!state.isMusicEnabled) {
      stop('music');
    }
    return state.isMusicEnabled;
  }

  function init() {
    if (state.initialized || !global.addEventListener) return true;

    global.addEventListener(ACTION_EVENT, onAction);
    state.initialized = true;
    return true;
  }

  init();

  global.__FXOverlayModules.audioLayer = {
    dispatch: dispatch,
    handleAction: handleAction,
    init: init,
    play: play,
    setMusicEnabled: setMusicEnabled,
    setSoundEnabled: setSoundEnabled,
    stop: stop,
  };
})(window);
