# Big Slick Official Rules

This document is the implementation source of truth for game rules that affect client actions, server validation, and player state.

## All-In

All-in is a chip commitment state, not a hand-control lockout.

When a player goes all in, they commit all available chips to the hand and cannot make any later chip-funded action in that hand. They remain an active hand participant and must still be allowed to make non-wagering hand-play decisions that affect their chance to win the pot they are eligible for.

All-in is only presented as a direct main action when the player is facing a required call amount greater than their available stack. It is not an opening option and is not shown merely because the player has chips.

### All-In Player State

An all-in player must be treated as:

- Still in the hand.
- Not folded.
- Not automatically standing.
- Not automatically taking community cards.
- Not allowed to add more chips.
- Still eligible for their main pot or side-pot share.
- Still allowed to make available hand-play decisions, including standing or taking community cards, when those decisions do not require more chips.

Recommended state model:

```js
{
  bAllIn: true,
  bFolded: false,
  bCanBet: false,
  bCanPlayHand: true
}
```

### First-Round All-In

If a player goes all in during the first round:

1. Their chip commitment is locked immediately.
2. They cannot call, raise, double down, or perform any other action that requires additional chips.
3. They remain active for later hand-play decisions.
4. On later decision rounds, they may still stand or take community cards if those actions are normally available.
5. They are included in hand result evaluation unless they bust, fold through an explicit rule, or otherwise lose by normal hand rules.
6. They may only win the pot amount they are eligible to contest.

The server must not skip all future turns for an all-in player purely because they are all in. It must suppress chip actions only.

### All-In Confirm Choice

The existing raise confirmation flow carries the hand-play choice with `bTakeCard`.

- `Confirm` always means the player commits the chip action and takes another community card.
- `Stand` always means the player commits the chip action and stands.
- `bTakeCard: true` represents the `Confirm` path.
- `bTakeCard: false` represents the `Stand` path.

Confirm remains the player's responsibility. If the player is on 21 and chooses `Confirm`, they are choosing to take another community card and accept the bust risk. The UI must not hide `Confirm` purely because the current hand total is strong or risky.

All-in must use the same hand-play choice model when all-in is entered through a raise-style confirmation flow:

```js
// All-in and take a community card
reqRaise({
  nRaiseAmount,
  bAllIn: true,
  bTakeCard: true
});

// All-in and stand
reqRaise({
  nRaiseAmount,
  bAllIn: true,
  bTakeCard: false
});
```

If the player is facing a call and chooses the stand path, the existing call/stand convention applies:

```js
reqCall({ bTakeCard: false });
```

The default confirm path must be treated as taking a community card unless an explicit `bTakeCard: false` is supplied.

All-in from the main action row, when available because the player cannot cover the call, must open the same confirmation row:

```text
Confirm    Stand    Cancel
```

- `Confirm` submits all-in with `bTakeCard: true`.
- `Stand` submits all-in with `bTakeCard: false`.
- `Cancel` returns to the previous action set.

### High-Total Community Card Warning

When the player selects `Confirm` and their current hand total is high, show a warning before submitting the action.

Default trigger:

```text
current hand total >= 19
```

Suggested copy:

```text
You're on 19. Take another community card?
```

For 21:

```text
You're on 21. Taking another card may bust your hand. Continue?
```

Warning actions:

```text
Take Card    Cancel
```

Rules:

- Applies to normal raise confirm and all-in confirm.
- Does not apply to `Stand`.
- Does not remove the option to take a community card.
- If confirmed, submit with `bTakeCard: true`.
- If cancelled, return to the confirm/stand/cancel state.

## Facing A Bet

When a player is facing an existing bet, their primary decision is whether to continue, fold, or commit their stack. Raise presets must only appear when the player can make a legal raise.

Definitions:

```js
toCall = current amount required to continue
playerChips = chips available before acting
remainingAfterCall = playerChips - toCall
canCall = playerChips >= toCall
canLegalRaise = canCall && remainingAfterCall >= minRaise
canAllIn = playerChips > 0
```

### Button Presentation While Facing A Bet

If the player cannot cover the call:

```text
Fold    All In
```

If the player can call with chips remaining but cannot make a legal raise:

```text
Fold    Call <amount>
```

Do not show `All In` in this state. The player can call, but cannot make a legal raise.

If the player can call and can make a legal raise:

```text
Fold    Call <amount>    Raise
```

The `Raise` button may then open the raise flow.

### Raise Presets

`MIN`, `1/2`, and `POT` are raise-flow presets. They must not be shown directly to a player who is merely facing a call and cannot make a legal raise.

Inside the raise flow:

- Show `MIN` only if the player can cover the minimum legal raise after calling.
- Show `1/2` only if the player can cover the half-pot raise amount.
- Show `POT` only if the player can cover the pot raise amount.

Never show `POT` if clicking it will silently reduce the action to all-in. If the player cannot cover a pot raise, hide `POT`; do not substitute `All In`.

## Short-Stack All-In

A player may always commit their last chip on a valid turn to continue the hand, even when the amount is less than the minimum legal raise.

Minimum raise rules determine whether the action reopens betting for other players. They must not prevent a valid short-stack all-in.

Implementation rule:

```js
if (actionIsAllIn) {
  allowAmountBelowMinRaise = true;
}
```

The backend must distinguish a short all-in from a normal legal raise.
