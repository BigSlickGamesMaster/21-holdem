(function (global) {
  'use strict';

  global.__FXOverlayModules = global.__FXOverlayModules || {};

  var ROOT_ID = 'fx-overlay-ui-root';
  var STYLE_ID = 'fx-overlay-ui-style';
  var EFFECT_LAYER_CLASS = 'fxui-effect-layer';
  var BUG_PANEL_CLASS = 'fxui-bug-panel';

  function isGameplayRoute() {
    try {
      var path = String(global.location && global.location.pathname || '').toLowerCase();
      return path.indexOf('/game') !== -1;
    } catch (_error) {
      return false;
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function isFiniteNumber(value) {
    return Number.isFinite(Number(value));
  }

  function getViewportAnchor() {
    return {
      x: (global.innerWidth || 0) / 2,
      y: (global.innerHeight || 0) / 2,
      width: 0,
      height: 0,
    };
  }

  function getOverlayAnchor(name) {
    var overlay = global.FXOverlay;
    if (!overlay || typeof overlay.getAnchor !== 'function' || !name) return null;
    return overlay.getAnchor(name);
  }

  function normalizeAnchor(anchor) {
    if (!anchor || !isFiniteNumber(anchor.x) || !isFiniteNumber(anchor.y)) return null;
    return {
      x: Number(anchor.x),
      y: Number(anchor.y),
      width: isFiniteNumber(anchor.width) ? Number(anchor.width) : 0,
      height: isFiniteNumber(anchor.height) ? Number(anchor.height) : 0,
    };
  }

  function resolveAnchor(options, fallbackName) {
    if (options && normalizeAnchor(options.anchor)) return normalizeAnchor(options.anchor);
    if (options && options.anchorName) {
      var namedAnchor = normalizeAnchor(getOverlayAnchor(options.anchorName));
      if (namedAnchor) return namedAnchor;
    }
    if (fallbackName) {
      var fallbackAnchor = normalizeAnchor(getOverlayAnchor(fallbackName));
      if (fallbackAnchor) return fallbackAnchor;
    }
    return getViewportAnchor();
  }

  function removeNode(node) {
    if (node && node.parentNode) node.parentNode.removeChild(node);
  }

  function scheduleRemoval(node, duration) {
    global.setTimeout(function () {
      removeNode(node);
    }, duration || 600);
  }

  function animateNode(node, keyframes, options) {
    if (!node) return false;

    if (typeof node.animate === 'function') {
      var animation = node.animate(keyframes, options || {});
      animation.onfinish = function () {
        if (options && options.persist) return;
        removeNode(node);
      };
      animation.oncancel = function () {
        if (options && options.persist) return;
        removeNode(node);
      };
      return true;
    }

    scheduleRemoval(node, (options && options.duration) || 600);
    return true;
  }

  function injectStyles() {
    if (!global.document || global.document.getElementById(STYLE_ID)) return false;

    var style = global.document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = ''
      + '#' + ROOT_ID + ' { position: fixed; inset: 0; pointer-events: none; z-index: 2147483644; font-family: "TTCommons", sans-serif; }'
      + '#' + ROOT_ID + ' .' + EFFECT_LAYER_CLASS + ' { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }'
      + '#' + ROOT_ID + ' .' + BUG_PANEL_CLASS + ' { position: absolute; right: 12px; top: calc(70px + env(safe-area-inset-top, 0px)); width: min(360px, calc(100vw - 24px)); padding: 18px;'
      + ' max-height: min(520px, calc(100vh - 120px)); overflow: auto; border-radius: 24px; background: linear-gradient(180deg, rgba(11,39,60,0.97), rgba(7,25,40,0.98)); border: 1px solid rgba(147,220,255,0.26);'
      + ' box-shadow: inset 0 1px 0 rgba(201,236,255,0.12), 0 24px 48px rgba(2,10,18,0.38); opacity: 0; transform: translateY(18px); transition: opacity 180ms ease, transform 240ms cubic-bezier(0.22, 1, 0.36, 1); pointer-events: none; }'
      + '#' + ROOT_ID + ' .' + BUG_PANEL_CLASS + '[data-open="true"] { opacity: 1; transform: translateY(0); pointer-events: auto; }'
      + '#' + ROOT_ID + ' .fxui-bug-title { margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.18em; color: rgba(214,255,242,0.84); }'
      + '#' + ROOT_ID + ' .fxui-bug-field { display: block; margin-bottom: 10px; }'
      + '#' + ROOT_ID + ' .fxui-bug-field span { display: block; margin-bottom: 6px; color: rgba(241,255,248,0.86); font-size: 13px; }'
      + '#' + ROOT_ID + ' .fxui-bug-input, #' + ROOT_ID + ' .fxui-bug-textarea { width: 100%; border: 1px solid rgba(170,228,255,0.24); background: rgba(1,16,28,0.6);'
      + ' color: #f5fcff; border-radius: 12px; padding: 11px 12px; outline: none; }'
      + '#' + ROOT_ID + ' .fxui-bug-textarea { min-height: 116px; resize: vertical; }'
      + '#' + ROOT_ID + ' .fxui-bug-check { display: flex; align-items: center; gap: 8px; color: rgba(237,255,245,0.84); font-size: 13px; margin: 6px 0 14px; }'
      + '#' + ROOT_ID + ' .fxui-bug-actions { display: flex; align-items: center; gap: 10px; justify-content: space-between; }'
      + '#' + ROOT_ID + ' .fxui-bug-send, #' + ROOT_ID + ' .fxui-bug-close { border: 0; border-radius: 999px; padding: 10px 14px; cursor: pointer; pointer-events: auto; }'
      + '#' + ROOT_ID + ' .fxui-bug-send { background: linear-gradient(180deg, #8dfcb3 0%, #42d985 100%); color: #052132; font-weight: 700; }'
      + '#' + ROOT_ID + ' .fxui-bug-close { background: rgba(255,255,255,0.06); color: #fff; border: 1px solid rgba(137,213,255,0.24); }'
      + '#' + ROOT_ID + ' .fxui-bug-status { margin-top: 10px; min-height: 18px; font-size: 12px; line-height: 1.4; color: rgba(215,255,239,0.92); }'
      + '@media (max-width: 768px) { #' + ROOT_ID + ' .' + BUG_PANEL_CLASS + ' { right: 10px; left: 10px; top: calc(68px + env(safe-area-inset-top, 0px)); width: auto; } }';
    global.document.head.appendChild(style);
    return true;
  }

  function getRoot() {
    if (!global.document || !global.document.body) return null;
    injectStyles();

    var root = global.document.getElementById(ROOT_ID);
    if (root) return root;

    root = global.document.createElement('div');
    root.id = ROOT_ID;

    var effectLayer = global.document.createElement('div');
    effectLayer.className = EFFECT_LAYER_CLASS;
    root.appendChild(effectLayer);

    global.document.body.appendChild(root);
    return root;
  }

  function syncBugUiRouteState(root) {
    if (!root) return false;

    var bugPanel = getBugPanel(root);
    if (isGameplayRoute()) {
      removeNode(bugPanel);
      return false;
    }

    if (!bugPanel) {
      buildBugUi(root);
      return true;
    }

    return true;
  }

  function getEffectLayer() {
    var root = getRoot();
    if (!root) return null;

    syncBugUiRouteState(root);

    var effectLayer = root.querySelector('.' + EFFECT_LAYER_CLASS);
    if (effectLayer) return effectLayer;

    effectLayer = global.document.createElement('div');
    effectLayer.className = EFFECT_LAYER_CLASS;
    root.appendChild(effectLayer);
    return effectLayer;
  }

  function createEffectNode() {
    var layer = getEffectLayer();
    if (!layer) return null;

    var node = global.document.createElement('div');
    node.style.position = 'absolute';
    node.style.left = '0';
    node.style.top = '0';
    node.style.pointerEvents = 'none';
    layer.appendChild(node);
    return node;
  }

  function getBugPanel(root) {
    if (!root) return null;
    return root.querySelector('.' + BUG_PANEL_CLASS);
  }

  function closeBugPanel() {
    var root = getRoot();
    syncBugUiRouteState(root);
    var bugPanel = getBugPanel(root);
    if (!bugPanel) return false;
    bugPanel.setAttribute('data-open', 'false');
    return true;
  }

  function openBugPanel() {
    var root = getRoot();
    if (!syncBugUiRouteState(root)) return false;
    buildBugUi(root);
    var bugPanel = getBugPanel(root);
    if (!bugPanel) return false;
    bugPanel.setAttribute('data-open', 'true');
    return true;
  }

  function toggleBugPanel() {
    var root = getRoot();
    if (!syncBugUiRouteState(root)) return false;
    buildBugUi(root);
    var bugPanel = getBugPanel(root);
    if (!bugPanel) return false;
    var isOpen = bugPanel.getAttribute('data-open') === 'true';
    bugPanel.setAttribute('data-open', isOpen ? 'false' : 'true');
    return true;
  }

  function buildBugUi(root) {
    if (!root || getBugPanel(root) || isGameplayRoute()) return false;

    var bugPanel = global.document.createElement('div');
    bugPanel.className = BUG_PANEL_CLASS;
    bugPanel.setAttribute('data-open', 'false');
    bugPanel.innerHTML = ''
      + '<div class="fxui-bug-title">Bug Report</div>'
      + '<label class="fxui-bug-field"><span>Player Name</span><input class="fxui-bug-input" name="playerName" type="text" maxlength="64"></label>'
      + '<label class="fxui-bug-field"><span>Email</span><input class="fxui-bug-input" name="email" type="email" maxlength="128"></label>'
      + '<label class="fxui-bug-field"><span>Issue</span><textarea class="fxui-bug-textarea" name="issue"></textarea></label>'
      + '<label class="fxui-bug-check"><input name="contactOk" type="checkbox"> You may contact me for more information</label>'
      + '<div class="fxui-bug-actions"><button type="button" class="fxui-bug-close">Close</button><button type="button" class="fxui-bug-send">Submit</button></div>'
      + '<div class="fxui-bug-status" aria-live="polite"></div>';

    root.appendChild(bugPanel);

    bugPanel.querySelector('.fxui-bug-close').addEventListener('click', function () {
      closeBugPanel();
    });
    bugPanel.querySelector('.fxui-bug-send').addEventListener('click', function () {
      sendBugMail(bugPanel);
    });

    return true;
  }

  function ensureRoot() {
    if (!global.document) return false;

    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', function () {
        var root = getRoot();
        syncBugUiRouteState(root);
      }, { once: true });
      return true;
    }

    var root = getRoot();
    syncBugUiRouteState(root);
    return !!root;
  }

  function sendBugMail(panel) {
    try {
      var playerName = panel.querySelector('[name="playerName"]').value || '';
      var email = panel.querySelector('[name="email"]').value || '';
      var issue = panel.querySelector('[name="issue"]').value || '';
      var contactOk = panel.querySelector('[name="contactOk"]').checked ? 'Yes' : 'No';
      var status = panel.querySelector('.fxui-bug-status');
      var trimmedEmail = String(email).trim();
      var trimmedIssue = String(issue).trim();

      if (!trimmedEmail || !trimmedIssue) {
        if (status) status.textContent = 'Please add your email and a short issue description.';
        return false;
      }

      if (status) {
        status.textContent = 'Thanks for helping to improve 21 Hold\'em. I\'ve got your email and will look into your report.';
      }

      panel.querySelector('[name="playerName"]').value = playerName.trim();
      panel.querySelector('[name="email"]').value = trimmedEmail;
      panel.querySelector('[name="issue"]').value = '';
      panel.querySelector('[name="contactOk"]').checked = contactOk === 'Yes';
      return true;
    } catch (_error) {
      return false;
    }
  }

  function makeAccentBar(node, colors) {
    var bar = global.document.createElement('div');
    bar.style.position = 'absolute';
    bar.style.left = '10%';
    bar.style.right = '10%';
    bar.style.bottom = '10px';
    bar.style.height = '4px';
    bar.style.borderRadius = '999px';
    bar.style.background = 'linear-gradient(90deg, ' + colors[0] + ', ' + colors[1] + ')';
    bar.style.boxShadow = '0 0 16px ' + colors[1];
    node.appendChild(bar);
  }

  function showScreenFlash(color, duration) {
    var flash = createEffectNode();
    if (!flash) return false;

    flash.style.left = '0';
    flash.style.top = '0';
    flash.style.width = '100vw';
    flash.style.height = '100vh';
    flash.style.background =
      'radial-gradient(circle at center, ' + color + ' 0%, rgba(6, 12, 26, 0.18) 32%, rgba(6, 12, 26, 0) 72%)';
    flash.style.mixBlendMode = 'screen';
    flash.style.opacity = '0';
    flash.style.filter = 'blur(8px)';

    animateNode(
      flash,
      [
        { opacity: 0, transform: 'scale(0.96)' },
        { opacity: 1, transform: 'scale(1)' , offset: 0.18 },
        { opacity: 0, transform: 'scale(1.05)' },
      ],
      {
        duration: duration || 520,
        easing: 'ease-out',
      }
    );

    return true;
  }

  function showShockwave(anchor, options) {
    var node = createEffectNode();
    if (!node || !anchor) return false;

    var baseSize = clamp(Math.max(anchor.width || 120, anchor.height || 120) * (options && options.scale || 1.2), 110, 240);
    node.style.left = anchor.x - baseSize / 2 + 'px';
    node.style.top = anchor.y - baseSize / 2 + 'px';
    node.style.width = baseSize + 'px';
    node.style.height = baseSize + 'px';
    node.style.borderRadius = '999px';
    node.style.border = (options && options.borderWidth || 4) + 'px solid ' + ((options && options.color) || 'rgba(255, 91, 91, 0.92)');
    node.style.boxShadow = '0 0 34px ' + ((options && options.glow) || 'rgba(255, 91, 91, 0.44)');
    node.style.opacity = '0';
    node.style.filter = 'blur(0.2px)';

    animateNode(
      node,
      [
        { opacity: 0, transform: 'scale(0.36)' },
        { opacity: 1, transform: 'scale(0.92)', offset: 0.18 },
        { opacity: 0, transform: 'scale(1.42)' },
      ],
      {
        duration: (options && options.duration) || 760,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }
    );

    return true;
  }

  function getBannerTheme(variant) {
    switch (variant) {
      case 'doubleDown':
        return {
          background: 'linear-gradient(180deg, rgba(6,28,60,0.94), rgba(6,16,34,0.96))',
          border: 'rgba(115, 214, 255, 0.86)',
          glow: 'rgba(52, 193, 255, 0.44)',
          text: '#ffd768',
          accentA: 'rgba(115, 214, 255, 1)',
          accentB: 'rgba(255, 215, 104, 0.98)',
        };
      case 'crowd':
        return {
          background: 'linear-gradient(180deg, rgba(7,18,38,0.92), rgba(6,13,26,0.94))',
          border: 'rgba(150, 196, 255, 0.65)',
          glow: 'rgba(114, 179, 255, 0.3)',
          text: '#ffffff',
          accentA: 'rgba(119, 210, 255, 1)',
          accentB: 'rgba(255, 255, 255, 0.92)',
        };
      case 'bust':
        return {
          background: 'linear-gradient(180deg, rgba(60,12,16,0.95), rgba(26,6,8,0.96))',
          border: 'rgba(255, 122, 90, 0.8)',
          glow: 'rgba(255, 81, 81, 0.42)',
          text: '#fff4e8',
          accentA: 'rgba(255, 126, 86, 1)',
          accentB: 'rgba(255, 214, 120, 0.98)',
        };
      default:
        return {
          background: 'linear-gradient(180deg, rgba(11,32,70,0.95), rgba(7,17,38,0.96))',
          border: 'rgba(124, 222, 255, 0.78)',
          glow: 'rgba(78, 196, 255, 0.36)',
          text: '#ffffff',
          accentA: 'rgba(124, 222, 255, 1)',
          accentB: 'rgba(255, 214, 108, 0.98)',
        };
    }
  }

  function showBanner(text, options) {
    var node = createEffectNode();
    if (!node || !text) return false;

    var anchor = resolveAnchor(options, 'mySeat');
    var theme = getBannerTheme(options && options.variant);
    var isSelf = !!(options && options.isSelf);
    var viewportWidth = global.innerWidth || 390;
    var viewportHeight = global.innerHeight || 844;
    var posX = isSelf ? viewportWidth / 2 : clamp(anchor.x, 120, viewportWidth - 120);
    var posY = isSelf
      ? viewportHeight * (options && options.variant === 'crowd' ? 0.2 : 0.3)
      : clamp(anchor.y - Math.max(anchor.height || 90, 90) * 0.88, 92, viewportHeight * 0.46);

    node.style.left = posX + 'px';
    node.style.top = posY + 'px';
    node.style.transform = 'translate(-50%, -50%)';
    node.style.minWidth = isSelf ? '240px' : '180px';
    node.style.maxWidth = 'min(82vw, 520px)';
    node.style.padding = isSelf ? '20px 26px 28px' : '14px 20px 22px';
    node.style.borderRadius = isSelf ? '28px' : '22px';
    node.style.background = theme.background;
    node.style.border = '1px solid ' + theme.border;
    node.style.boxShadow = '0 16px 40px rgba(2, 7, 18, 0.62), 0 0 32px ' + theme.glow;
    node.style.backdropFilter = 'blur(12px)';
    node.style.webkitBackdropFilter = 'blur(12px)';
    node.style.overflow = 'hidden';
    node.style.opacity = '0';

    var beam = global.document.createElement('div');
    beam.style.position = 'absolute';
    beam.style.left = '-24%';
    beam.style.top = '-20%';
    beam.style.width = '64%';
    beam.style.height = '160%';
    beam.style.transform = 'skewX(-24deg)';
    beam.style.background = 'linear-gradient(180deg, rgba(160, 232, 255, 0.30), rgba(160, 232, 255, 0.02))';
    beam.style.opacity = '0.75';
    node.appendChild(beam);

    var title = global.document.createElement('div');
    title.textContent = String(text).toUpperCase();
    title.style.position = 'relative';
    title.style.fontWeight = '900';
    title.style.letterSpacing = options && options.variant === 'crowd' ? '0.12em' : '0.08em';
    title.style.fontSize = isSelf ? 'clamp(26px, 4vw, 52px)' : 'clamp(18px, 3vw, 30px)';
    title.style.lineHeight = '1';
    title.style.color = theme.text;
    title.style.textAlign = 'center';
    title.style.textShadow = '0 2px 0 rgba(0,0,0,0.3), 0 0 28px ' + theme.glow;
    node.appendChild(title);

    makeAccentBar(node, [theme.accentA, theme.accentB]);

    if (typeof beam.animate === 'function') {
      beam.animate(
        [
          { transform: 'translateX(-14%) skewX(-24deg)', opacity: 0.1 },
          { transform: 'translateX(112%) skewX(-24deg)', opacity: 0.58 },
        ],
        {
          duration: 900,
          easing: 'ease-out',
          delay: 100,
          iterations: 1,
        }
      );
    }

    animateNode(
      node,
      [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(0.78)' },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1.03)', offset: 0.18 },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(0.995)', offset: 0.82 },
        { opacity: 0, transform: 'translate(-50%, -68%) scale(0.96)' },
      ],
      {
        duration: (options && options.duration) || 1600,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    );

    return true;
  }

  function showFloatingStamp(text, anchor, options) {
    var node = createEffectNode();
    if (!node || !text || !anchor) return false;

    node.textContent = String(text).toUpperCase();
    node.style.left = anchor.x + 'px';
    node.style.top = clamp(anchor.y - Math.max(anchor.height, 86) * 0.78, 76, (global.innerHeight || 844) - 100) + 'px';
    node.style.transform = 'translate(-50%, -50%)';
    node.style.padding = '10px 16px';
    node.style.borderRadius = '999px';
    node.style.background = (options && options.background) || 'linear-gradient(180deg, rgba(74, 12, 18, 0.94), rgba(28, 4, 7, 0.94))';
    node.style.border = '1px solid ' + ((options && options.border) || 'rgba(255, 130, 94, 0.72)');
    node.style.boxShadow = '0 12px 26px rgba(0,0,0,0.36), 0 0 18px ' + ((options && options.glow) || 'rgba(255, 89, 89, 0.34)');
    node.style.color = (options && options.color) || '#fff4ea';
    node.style.fontWeight = '900';
    node.style.fontSize = 'clamp(14px, 2vw, 22px)';
    node.style.letterSpacing = '0.08em';
    node.style.textTransform = 'uppercase';

    animateNode(
      node,
      [
        { opacity: 0, transform: 'translate(-50%, 14%) scale(0.8)' },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1.04)', offset: 0.18 },
        { opacity: 1, transform: 'translate(-50%, -54%) scale(1)', offset: 0.7 },
        { opacity: 0, transform: 'translate(-50%, -94%) scale(0.94)' },
      ],
      {
        duration: (options && options.duration) || 1300,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    );

    return true;
  }

  function createCrownSvg() {
    return ''
      + '<svg viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
      + '<defs>'
      + '<linearGradient id="fx-crown-fill" x1="0%" y1="0%" x2="0%" y2="100%">'
      + '<stop offset="0%" stop-color="#fff2b8"/>'
      + '<stop offset="42%" stop-color="#ffd55b"/>'
      + '<stop offset="100%" stop-color="#c88900"/>'
      + '</linearGradient>'
      + '<linearGradient id="fx-crown-edge" x1="0%" y1="0%" x2="100%" y2="0%">'
      + '<stop offset="0%" stop-color="#ffeaa3"/>'
      + '<stop offset="100%" stop-color="#ffbe32"/>'
      + '</linearGradient>'
      + '</defs>'
      + '<path d="M28 126 L46 48 L88 86 L120 28 L152 84 L196 46 L212 126 Z" fill="url(#fx-crown-fill)" stroke="url(#fx-crown-edge)" stroke-width="10" stroke-linejoin="round"/>'
      + '<rect x="34" y="116" width="172" height="24" rx="12" fill="url(#fx-crown-fill)" stroke="url(#fx-crown-edge)" stroke-width="10"/>'
      + '<circle cx="46" cy="48" r="12" fill="#9ae8ff" stroke="#ffffff" stroke-width="6"/>'
      + '<circle cx="120" cy="28" r="13" fill="#5dbdff" stroke="#ffffff" stroke-width="6"/>'
      + '<circle cx="196" cy="46" r="12" fill="#9ae8ff" stroke="#ffffff" stroke-width="6"/>'
      + '</svg>';
  }

  function showCrown(options) {
    var anchor = resolveAnchor(options, 'activePlayer');
    var node = createEffectNode();
    if (!node || !anchor) return false;

    var size = clamp(Math.max(anchor.width || 84, 84) * 0.92, 72, 124);
    var crownHeight = size * 0.62;
    var y = anchor.y - Math.max(anchor.height || 0, 82) * 0.76;

    node.style.left = anchor.x - size / 2 + 'px';
    node.style.top = y - crownHeight / 2 + 'px';
    node.style.width = size + 'px';
    node.style.height = crownHeight + 'px';
    node.style.filter = 'drop-shadow(0 12px 18px rgba(0,0,0,0.26)) drop-shadow(0 0 18px rgba(255, 212, 86, 0.56))';
    node.style.opacity = '0';
    node.innerHTML = createCrownSvg();

    animateNode(
      node,
      [
        { opacity: 0, transform: 'translateY(18px) scale(0.48) rotate(-8deg)' },
        { opacity: 1, transform: 'translateY(-6px) scale(1.08) rotate(1deg)', offset: 0.28 },
        { opacity: 1, transform: 'translateY(0px) scale(1)', offset: 0.72 },
        { opacity: 0, transform: 'translateY(-14px) scale(0.94) rotate(0deg)' },
      ],
      {
        duration: (options && options.duration) || 2600,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    );

    return true;
  }

  function spawnStreamers(options) {
    var layer = getEffectLayer();
    if (!layer) return false;

    var colors = ['#6fe0ff', '#ffd66b', '#6bffc4', '#ffffff', '#62a7ff'];
    var count = clamp(Number(options && options.count) || 18, 8, 36);
    var viewportWidth = global.innerWidth || 390;
    var viewportHeight = global.innerHeight || 844;

    for (var i = 0; i < count; i += 1) {
      var ribbon = global.document.createElement('div');
      var width = random(6, 12);
      var height = random(72, 180);
      var startX = random(-24, viewportWidth + 24);
      var driftX = random(-120, 120);
      var colorA = colors[i % colors.length];
      var colorB = colors[(i + 2) % colors.length];

      ribbon.style.position = 'absolute';
      ribbon.style.left = startX + 'px';
      ribbon.style.top = '-180px';
      ribbon.style.width = width + 'px';
      ribbon.style.height = height + 'px';
      ribbon.style.borderRadius = '999px';
      ribbon.style.pointerEvents = 'none';
      ribbon.style.opacity = '0';
      ribbon.style.background = 'linear-gradient(180deg, ' + colorA + ', ' + colorB + ')';
      ribbon.style.boxShadow = '0 0 18px rgba(255,255,255,0.16)';
      layer.appendChild(ribbon);

      animateNode(
        ribbon,
        [
          { opacity: 0, transform: 'translate3d(0, -20px, 0) rotate(' + random(-14, 14) + 'deg)' },
          { opacity: 1, transform: 'translate3d(' + random(-20, 20) + 'px, 0px, 0) rotate(' + random(-42, 42) + 'deg)', offset: 0.1 },
          { opacity: 1, transform: 'translate3d(' + driftX + 'px, ' + (viewportHeight * random(0.58, 0.96)) + 'px, 0) rotate(' + random(180, 420) + 'deg)', offset: 0.84 },
          { opacity: 0, transform: 'translate3d(' + (driftX * 1.18) + 'px, ' + (viewportHeight + random(40, 160)) + 'px, 0) rotate(' + random(240, 520) + 'deg)' },
        ],
        {
          duration: random(1500, 2400),
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          delay: random(0, 240),
        }
      );
    }

    return true;
  }

  function spawnConfetti(options) {
    var layer = getEffectLayer();
    if (!layer) return false;

    var colors = ['#73ddff', '#ffe073', '#67ffcc', '#ffffff', '#689bff'];
    var count = clamp(Number(options && options.count) || 28, 12, 60);
    var viewportWidth = global.innerWidth || 390;
    var viewportHeight = global.innerHeight || 844;

    for (var i = 0; i < count; i += 1) {
      var piece = global.document.createElement('div');
      var width = random(8, 14);
      var height = random(10, 20);
      var startX = random(-18, viewportWidth + 18);
      var drift = random(-90, 90);
      var rotateStart = random(-80, 80);
      var rotateEnd = rotateStart + random(260, 680);

      piece.style.position = 'absolute';
      piece.style.left = startX + 'px';
      piece.style.top = '-60px';
      piece.style.width = width + 'px';
      piece.style.height = height + 'px';
      piece.style.borderRadius = random(2, 8) + 'px';
      piece.style.background = colors[i % colors.length];
      piece.style.opacity = '0';
      piece.style.boxShadow = '0 0 12px rgba(255,255,255,0.12)';
      layer.appendChild(piece);

      animateNode(
        piece,
        [
          { opacity: 0, transform: 'translate3d(0, -8px, 0) rotate(' + rotateStart + 'deg)' },
          { opacity: 1, transform: 'translate3d(0, 0px, 0) rotate(' + (rotateStart + 40) + 'deg)', offset: 0.08 },
          { opacity: 1, transform: 'translate3d(' + drift + 'px, ' + (viewportHeight * random(0.52, 0.94)) + 'px, 0) rotate(' + rotateEnd + 'deg)', offset: 0.86 },
          { opacity: 0, transform: 'translate3d(' + (drift * 1.18) + 'px, ' + (viewportHeight + random(24, 120)) + 'px, 0) rotate(' + (rotateEnd + 120) + 'deg)' },
        ],
        {
          duration: random(1500, 2300),
          easing: 'cubic-bezier(0.17, 0.84, 0.27, 1)',
          delay: random(0, 280),
        }
      );
    }

    return true;
  }

  function showWinnerCelebration(options) {
    var anchor = resolveAnchor(options, 'mySeat');
    showCrown({ anchor: anchor, duration: options && options.isSelf ? 3200 : 2400 });
    showShockwave(anchor, {
      color: 'rgba(108, 224, 255, 0.94)',
      glow: 'rgba(84, 205, 255, 0.46)',
      borderWidth: 5,
      scale: 1.34,
      duration: 820,
    });

    if (options && options.isSelf) {
      showScreenFlash('rgba(92, 208, 255, 0.24)', 640);
      showBanner((options && options.text) || 'You Win!', {
        variant: 'winner',
        isSelf: true,
        duration: 1800,
      });
    } else {
      showFloatingStamp((options && options.text) || 'Winner', anchor, {
        background: 'linear-gradient(180deg, rgba(10,31,69,0.94), rgba(6,14,32,0.96))',
        border: 'rgba(122, 222, 255, 0.72)',
        glow: 'rgba(71, 191, 255, 0.34)',
        color: '#ffffff',
        duration: 1500,
      });
    }

    return true;
  }

  function showBust(options) {
    var anchor = resolveAnchor(options, 'mySeat');
    showShockwave(anchor, {
      color: 'rgba(255, 110, 92, 0.94)',
      glow: 'rgba(255, 78, 78, 0.46)',
      borderWidth: 5,
      scale: 1.24,
      duration: 760,
    });

    if (options && options.isSelf) {
      showScreenFlash('rgba(255, 72, 72, 0.22)', 520);
      showBanner((options && options.text) || 'Bust!', {
        variant: 'bust',
        isSelf: true,
        duration: 1400,
      });
    } else {
      showFloatingStamp((options && options.text) || 'Bust', anchor, {
        duration: 1200,
      });
    }

    return true;
  }

  function showCrowdOoh(options) {
    var layer = getEffectLayer();
    if (!layer) return false;

    showBanner((options && options.text) || 'Oooohhhhh...', {
      variant: 'crowd',
      isSelf: true,
      duration: 1800,
    });

    var wave = global.document.createElement('div');
    wave.style.position = 'absolute';
    wave.style.left = '50%';
    wave.style.top = '17%';
    wave.style.transform = 'translate(-50%, -50%)';
    wave.style.width = 'min(72vw, 380px)';
    wave.style.height = '22px';
    wave.style.borderRadius = '999px';
    wave.style.background = 'linear-gradient(90deg, rgba(111, 225, 255, 0), rgba(111, 225, 255, 0.86), rgba(255, 240, 173, 0.94), rgba(111, 225, 255, 0.86), rgba(111, 225, 255, 0))';
    wave.style.boxShadow = '0 0 22px rgba(111, 225, 255, 0.34)';
    wave.style.opacity = '0';
    layer.appendChild(wave);

    animateNode(
      wave,
      [
        { opacity: 0, transform: 'translate(-50%, -50%) scaleX(0.4)' },
        { opacity: 1, transform: 'translate(-50%, -50%) scaleX(1)', offset: 0.2 },
        { opacity: 1, transform: 'translate(-50%, -50%) scaleX(0.96)', offset: 0.74 },
        { opacity: 0, transform: 'translate(-50%, -50%) scaleX(1.08)' },
      ],
      {
        duration: 1200,
        easing: 'ease-out',
      }
    );

    return true;
  }

  function showReaction(emoji, options) {
    var anchor = resolveAnchor(options, 'activePlayer');
    var node = createEffectNode();
    if (!node || !anchor || !emoji) return false;

    var size = clamp(Math.max(anchor.width || 68, 54), 48, 86);
    node.textContent = emoji;
    node.style.left = anchor.x - size / 2 + 'px';
    node.style.top = anchor.y - Math.max(anchor.height || 88, 88) * 0.82 + 'px';
    node.style.width = size + 'px';
    node.style.height = size + 'px';
    node.style.display = 'grid';
    node.style.placeItems = 'center';
    node.style.fontSize = size * 0.56 + 'px';
    node.style.borderRadius = '999px';
    node.style.background = 'linear-gradient(180deg, rgba(10,31,69,0.96), rgba(6,14,32,0.96))';
    node.style.border = '1px solid rgba(122, 222, 255, 0.62)';
    node.style.boxShadow = '0 14px 28px rgba(0,0,0,0.32), 0 0 18px rgba(71, 191, 255, 0.34)';

    animateNode(
      node,
      [
        { opacity: 0, transform: 'translateY(10px) scale(0.62)' },
        { opacity: 1, transform: 'translateY(0px) scale(1.04)', offset: 0.2 },
        { opacity: 1, transform: 'translateY(-8px) scale(1)', offset: 0.72 },
        { opacity: 0, transform: 'translateY(-22px) scale(0.92)' },
      ],
      {
        duration: (options && options.duration) || 1200,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    );

    return true;
  }

  function showActionText(text, options) {
    if (text && typeof text === 'object') {
      options = text;
      text = options && options.text ? options.text : 'Double Down!';
    }

    return showBanner(text, options || {});
  }

  global.__FXOverlayModules.overlayUI = {
    getRoot: getRoot,
    closeBugPanel: closeBugPanel,
    openBugPanel: openBugPanel,
    showActionText: showActionText,
    showBust: showBust,
    showCrown: showCrown,
    showCrowdOoh: showCrowdOoh,
    showReaction: showReaction,
    showWinner: showWinnerCelebration,
    showWinnerCelebration: showWinnerCelebration,
    toggleBugPanel: toggleBugPanel,
  };

  global.FXOverlayUI = global.FXOverlayUI || {};
  global.FXOverlayUI.openBugPanel = openBugPanel;
  global.FXOverlayUI.closeBugPanel = closeBugPanel;
  global.FXOverlayUI.toggleBugPanel = toggleBugPanel;

  ensureRoot();
})(window);
