# 21 Holdem Gameplay Checklist

Last updated: 2026-02-22

## Working Flow
1. You report issue.
2. We implement fix.
3. We verify behavior.
4. We create local version commit(s).
5. We check item off.

## Current Baseline Versions
- Frontend: `savepoint-local-2026-02-14` @ `fc3a634`
- Backend: `savepoint-local-2026-02-14` @ `05fba0f`

## Checklist

- [ ] 1. Gameplay Stability And UX Bug-Fix Pass (In Progress)
  - Known issue groups:
    - Action buttons disappearing randomly.
    - Sound sync timing is off.
    - Players/turns getting skipped.
    - Round/action timing inconsistencies.
  - Issue breakdown:
    - [ ] Stand behavior: stood players should only defend (call/fold on raise), otherwise be skipped.
    - [ ] Sound mapping: no deal/flip sound on button press; only on actual deal/flip events.
    - [x] Deck visibility at showdown stays on table.
  - Progress log:
    - 2026-02-14 Patch A (implemented, pending live gameplay validation):
      - Reduced unintended button hiding side-effects during turn-timer resets.
      - Hardened action-button rendering for turn transitions.
      - Fixed bet-label amount mapping to use server bid fields.
      - Added `toCallAmount` in turn payload for stable call button text.
      - Added all-bust flag compatibility (`bAllPlayerBust` + `bAllPlayersBust`).
      - Reduced timer beep overlap to improve audio sync.
    - 2026-02-14 Patch B (completed):
      - Kept deck visible during showdown card reveal flow.
      - File change: `Game-Frontend/src/scenes/Level.js`
      - Code note: removed forced `close_deck_card.setVisible(false)` during declare-result reveal.
  - Definition of done:
    - Repro steps documented per bug.
    - Fix implemented and verified against repro.
    - No regression in turn flow, action visibility, and audio cues.
  - Version when complete: `TBD`
  - 2026-02-22 logic triage queue (reported, pending order/fix):
    - [ ] Sound behavior issues (timing / event mapping needs review).
    - [ ] `Stand` action appears to charge `nMinBet` incorrectly.
    - [ ] Players who `Stand` can re-raise (should not happen; only defend raises if applicable).
    - [ ] Turn order appears out of sequence.
    - [ ] 5th card is not being played/dealt.
    - [ ] Same player can raise `Pot` twice in the same round.

- [ ] 2. Guest Mode Entry (Backlog, Depends On #1)
  - Goal: New users should not hit a registration wall first.
  - Required behavior:
    - A user can enter as guest without creating an account first.
    - Guest can access lobby/table discovery flow.
    - If guest attempts to actually play/join a table, route them to register/login.
  - Definition of done:
    - Landing flow includes clear `Play as Guest` option.
    - Guest can browse table list without auth failure loops.
    - Join/play action enforces auth and redirects cleanly to register/login.
    - No regression for existing registered user login flow.
  - Version when complete: `TBD`

- [ ] 3. Basic Bots For Guest Experience (Backlog)
  - Note: Deferred until after Guest Mode entry is stable.
  - Version when complete: `TBD`

- [ ] 4. Full Content Review And Rewrite (Backlog)
  - Scope: Review all player-facing copy and legal/info pages.
  - Includes:
    - Terms & Conditions
    - How To Play
    - Privacy Policy
    - Game Rules
    - Any onboarding/help text shown in auth/lobby/game
  - Definition of done:
    - Content is consistent with actual game behavior and payouts.
    - No conflicting or outdated wording remains.
    - Final copy approved and merged.
  - Version when complete: `TBD`

- [ ] 5. Interactive In-Game Tutorial (Backlog, Depends On #1)
  - Goal: Teach first-time players directly on the table UI.
  - Required behavior:
    - Step-by-step guided tutorial using real table elements.
    - Blackout overlay with focus circles/spotlights on current target UI.
    - Player can go next/back/skip/replay tutorial.
  - Definition of done:
    - Tutorial works on desktop and mobile layouts.
    - No interference with live gameplay state after tutorial exits.
    - Tutorial entry point is visible and reusable.
  - Version when complete: `TBD`

- [ ] 6. Shared Chip Wallet Across Game Ecosystem (Discovery + Build)
  - Goal: Let users use one chip balance across multiple games/sites.
  - Feasibility: Yes, this is achievable.
  - Delivery phases:
    - Phase A: Architecture + auth/session model + ledger design.
    - Phase B: Backend wallet service/API integration.
    - Phase C: Frontend integration and migration rules.
  - Definition of done:
    - One source of truth for balances and transactions.
    - Cross-game spend/earn is reflected consistently.
    - Audit trail exists for every chip movement.
  - Version when complete: `TBD`
