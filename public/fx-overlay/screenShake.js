(function (global) {
  'use strict';

  global.__FXOverlayModules = global.__FXOverlayModules || {};

  var activeAnimation = null;
  var activeFrame = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function prefersReducedMotion() {
    try {
      return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_error) {
      return false;
    }
  }

  function composeTransform(baseTransform, x, y) {
    var parts = [];
    if (baseTransform && baseTransform !== 'none') parts.push(baseTransform);
    parts.push('translate(' + x + 'px, ' + y + 'px)');
    return parts.join(' ').trim();
  }

  function stopFallback(body, originalTransform) {
    if (activeFrame) {
      global.cancelAnimationFrame(activeFrame);
      activeFrame = null;
    }
    if (body && typeof originalTransform === 'string') {
      body.style.transform = originalTransform;
      body.style.willChange = '';
    }
  }

  function shake(intensity, duration) {
    try {
      if (!global.document || !global.document.body) return false;
      if (prefersReducedMotion()) return false;

      var body = global.document.body;
      var maxOffset = clamp(Number(intensity) || 2, 0.5, 4);
      var ms = clamp(Number(duration) || 110, 80, 200);
      var inlineBaseTransform = body.style.transform || '';

      if (activeAnimation && typeof activeAnimation.cancel === 'function') {
        activeAnimation.cancel();
        activeAnimation = null;
      }

      stopFallback(body, inlineBaseTransform);

      if (typeof body.animate === 'function') {
        body.style.willChange = 'transform';

        activeAnimation = body.animate(
          [
            { transform: composeTransform(inlineBaseTransform, 0, 0), offset: 0 },
            { transform: composeTransform(inlineBaseTransform, -maxOffset, 1), offset: 0.12 },
            { transform: composeTransform(inlineBaseTransform, maxOffset, -2), offset: 0.24 },
            { transform: composeTransform(inlineBaseTransform, -maxOffset * 0.8, 2), offset: 0.38 },
            { transform: composeTransform(inlineBaseTransform, maxOffset * 0.7, -1), offset: 0.54 },
            { transform: composeTransform(inlineBaseTransform, -maxOffset * 0.45, 1), offset: 0.72 },
            { transform: composeTransform(inlineBaseTransform, maxOffset * 0.25, 0), offset: 0.88 },
            { transform: composeTransform(inlineBaseTransform, 0, 0), offset: 1 },
          ],
          {
            duration: ms,
            easing: 'ease-out',
            iterations: 1,
            fill: 'none',
          }
        );

        activeAnimation.onfinish = function () {
          body.style.willChange = '';
          activeAnimation = null;
        };

        activeAnimation.oncancel = function () {
          body.style.willChange = '';
          activeAnimation = null;
        };

        return true;
      }

      body.style.willChange = 'transform';

      var start = Date.now();

      function tick() {
        var elapsed = Date.now() - start;
        var progress = Math.min(elapsed / ms, 1);
        var decay = 1 - progress;
        var x = Math.sin(progress * 32) * maxOffset * decay;
        var y = Math.cos(progress * 28) * maxOffset * 0.5 * decay;

        body.style.transform = composeTransform(inlineBaseTransform, x, y);

        if (progress < 1) {
          activeFrame = global.requestAnimationFrame(tick);
          return;
        }

        stopFallback(body, inlineBaseTransform);
      }

      activeFrame = global.requestAnimationFrame(tick);
      return true;
    } catch (_error) {
      return false;
    }
  }

  global.__FXOverlayModules.screenShake = {
    shake: shake,
  };
})(window);
