# Change Request 002: Player Totals Displayed Before Showdown

Date: 2026-04-04

## Summary

Hide all non-local player card totals during an active hand.

Opponent totals are currently being shown before showdown. This exposes information that should remain hidden until the hand is resolved.

The local player may continue to see their own running total. Other players' numeric totals should stay hidden until showdown.

## Issue

Other players' totals are being displayed prior to showdown.

This creates two problems:

- it reveals hidden game information too early
- it makes the table state feel inconsistent with expected poker-style resolution flow

## Requested Change

During an active hand:

- show the local player's own total as normal
- hide all other players' numeric totals
- do not reveal opponent totals when they stand, call, double down, or receive community cards

At showdown / result resolution:

- reveal opponent totals when the hand is actually being resolved
- keep the totals visible only for the result phase as needed

When the next hand begins:

- clear all previous hand totals again before new dealing begins

## Current Behavior

- The local player total is shown.
- Other players' totals are also being shown before showdown.
- Stale totals have also previously carried between hands, which increases confusion.

## Expected Behavior

- The local player can see their own live total.
- Opponent totals remain hidden throughout the hand.
- Opponent totals are only revealed during showdown / hand resolution.
- All totals are reset cleanly before the next hand starts.

## Scope

This request is a UI / display rule only.

It does not request changes to:

- winner logic
- scoring logic
- betting logic
- community-card rules

## Likely Files To Change

- `src/scenes/Level.js`
  - Controls when score values are sent to seat/profile UI during active play and result flow.

- `src/prefabs/PlayerProfile.js`
  - Controls how per-player totals are rendered, shown, hidden, and cleared.

- `src/scripts/GameManager.js`
  - Review only if hand/reset state timing affects when score UI should be cleared or restored.

## Implementation Notes

- Treat opponent totals as hidden by default during any active hand state.
- Reveal opponent totals only from the showdown/result path.
- Ensure hand-reset logic clears every displayed total before the next deal starts.
- Do not rely on stale rendered card state to decide whether a score should still be visible.

## Acceptance Criteria

- Other players' totals are not visible during active play.
- Other players' totals do not appear early when they stand, call, double down, or receive community cards.
- Opponent totals become visible only during showdown / result resolution.
- Previous hand totals are cleared before the next hand begins.
- The local player's own total remains visible during play.

## Requirements Checklist

- [x] Hide numeric totals for all non-local players during active hands.
- [x] Keep the local player's own total visible during active hands.
- [x] Reveal opponent totals only in showdown / result state.
- [x] Clear all displayed totals before the next hand starts.
- [x] Confirm no opponent total is shown early from community-card updates or action-state updates.
