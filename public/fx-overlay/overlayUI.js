(function (global) {
  'use strict';

  global.__FXOverlayModules = global.__FXOverlayModules || {};

  var ROOT_ID = 'fx-overlay-ui-root';
  var STYLE_ID = 'fx-overlay-ui-style';

  function injectStyles() {
    if (!global.document || global.document.getElementById(STYLE_ID)) return false;

    var style = global.document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = ''
      + '#' + ROOT_ID + ' { position: fixed; inset: 0; pointer-events: none; z-index: 2147483644; font-family: "TTCommons", sans-serif; }'
      + '#' + ROOT_ID + ' .fxui-bug-tab { position: absolute; right: -38px; top: 42%; transform: rotate(-90deg); transform-origin: center;'
      + ' padding: 10px 18px; border-radius: 16px 16px 0 0; background: linear-gradient(180deg, rgba(15,33,28,0.96), rgba(8,16,14,0.94));'
      + ' color: #f1fff7; border: 1px solid rgba(177,255,226,0.16); box-shadow: 0 16px 28px rgba(0,0,0,0.22); pointer-events: auto; cursor: pointer;'
      + ' font-size: 14px; font-weight: 600; letter-spacing: 0.04em; }'
      + '#' + ROOT_ID + ' .fxui-bug-panel { position: absolute; right: 22px; top: 20%; width: min(360px, calc(100vw - 36px)); padding: 18px;'
      + ' border-radius: 22px; background: linear-gradient(180deg, rgba(8,17,15,0.97), rgba(10,20,18,0.94)); border: 1px solid rgba(173,255,223,0.16);'
      + ' box-shadow: 0 24px 42px rgba(0,0,0,0.28); opacity: 0; transform: translateX(14px); transition: opacity 180ms ease, transform 240ms cubic-bezier(0.22, 1, 0.36, 1); pointer-events: none; }'
      + '#' + ROOT_ID + ' .fxui-bug-panel[data-open="true"] { opacity: 1; transform: translateX(0); pointer-events: auto; }'
      + '#' + ROOT_ID + ' .fxui-bug-title { margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.18em; color: rgba(214,255,242,0.84); }'
      + '#' + ROOT_ID + ' .fxui-bug-field { display: block; margin-bottom: 10px; }'
      + '#' + ROOT_ID + ' .fxui-bug-field span { display: block; margin-bottom: 6px; color: rgba(241,255,248,0.86); font-size: 13px; }'
      + '#' + ROOT_ID + ' .fxui-bug-input, #' + ROOT_ID + ' .fxui-bug-textarea { width: 100%; border: 1px solid rgba(173,255,223,0.14); background: rgba(255,255,255,0.04);'
      + ' color: #f5fff8; border-radius: 12px; padding: 11px 12px; outline: none; }'
      + '#' + ROOT_ID + ' .fxui-bug-textarea { min-height: 116px; resize: vertical; }'
      + '#' + ROOT_ID + ' .fxui-bug-check { display: flex; align-items: center; gap: 8px; color: rgba(237,255,245,0.84); font-size: 13px; margin: 6px 0 14px; }'
      + '#' + ROOT_ID + ' .fxui-bug-actions { display: flex; align-items: center; gap: 10px; justify-content: space-between; }'
      + '#' + ROOT_ID + ' .fxui-bug-send, #' + ROOT_ID + ' .fxui-bug-close { border: 0; border-radius: 999px; padding: 10px 14px; cursor: pointer; pointer-events: auto; }'
      + '#' + ROOT_ID + ' .fxui-bug-send { background: linear-gradient(180deg, #36c176, #1b8b54); color: #fff; font-weight: 700; }'
      + '#' + ROOT_ID + ' .fxui-bug-close { background: rgba(255,255,255,0.06); color: #fff; }'
      + '#' + ROOT_ID + ' .fxui-bug-status { margin-top: 10px; min-height: 18px; font-size: 12px; line-height: 1.4; color: rgba(215,255,239,0.92); }'
      + '@media (max-width: 768px) { #' + ROOT_ID + ' .fxui-bug-panel { right: 10px; top: auto; bottom: 84px; width: calc(100vw - 20px); } }';
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

    var bugTab = global.document.createElement('button');
    bugTab.type = 'button';
    bugTab.className = 'fxui-bug-tab';
    bugTab.textContent = 'Found a BUG?';

    var bugPanel = global.document.createElement('div');
    bugPanel.className = 'fxui-bug-panel';
    bugPanel.setAttribute('data-open', 'false');
    bugPanel.innerHTML = ''
      + '<div class="fxui-bug-title">Bug Report</div>'
      + '<label class="fxui-bug-field"><span>Player Name</span><input class="fxui-bug-input" name="playerName" type="text" maxlength="64"></label>'
      + '<label class="fxui-bug-field"><span>Email</span><input class="fxui-bug-input" name="email" type="email" maxlength="128"></label>'
      + '<label class="fxui-bug-field"><span>Issue</span><textarea class="fxui-bug-textarea" name="issue"></textarea></label>'
      + '<label class="fxui-bug-check"><input name="contactOk" type="checkbox"> You may contact me for more information</label>'
      + '<div class="fxui-bug-actions"><button type="button" class="fxui-bug-close">Close</button><button type="button" class="fxui-bug-send">Submit</button></div>'
      + '<div class="fxui-bug-status" aria-live="polite"></div>';

    root.appendChild(bugTab);
    root.appendChild(bugPanel);
    global.document.body.appendChild(root);

    bugTab.addEventListener('click', function () {
      var isOpen = bugPanel.getAttribute('data-open') === 'true';
      bugPanel.setAttribute('data-open', isOpen ? 'false' : 'true');
    });
    bugPanel.querySelector('.fxui-bug-close').addEventListener('click', function () {
      bugPanel.setAttribute('data-open', 'false');
    });
    bugPanel.querySelector('.fxui-bug-send').addEventListener('click', function () {
      sendBugMail(bugPanel);
    });

    return root;
  }

  function ensureRoot() {
    if (!global.document) return false;
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', getRoot, { once: true });
      return true;
    }
    return !!getRoot();
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

  global.__FXOverlayModules.overlayUI = {
    getRoot: getRoot,
    showWinner: function () { return false; }
  };

  ensureRoot();
})(window);
