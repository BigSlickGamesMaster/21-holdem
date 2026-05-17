# 21 Hold'em Official Rules

Last updated: 2026-05-17

This document is the product source of truth for 21 Hold'em. Backend validation, frontend action buttons, bot logic, tutorials, and help copy should all follow these rules.

21 Hold'em is a blackjack and poker hybrid:

- Blackjack style hand totals decide each contested pot.
- Poker style betting decides how many chips are in each pot and which players are eligible to win each pot.
- Community cards are shared by all active hands.
- A player may stop taking cards by standing, but betting can still require them to defend their wager if another eligible player raises.

## 1. Core Objective

Each player is trying to make the best hand total of 21 or less.

At showdown, each pot is awarded to the eligible player or players with the highest total that does not exceed 21.

If all eligible players for a pot are bust, that pot is resolved by the configured house/table rule. The current preferred product rule is:

- If every eligible player in a pot is bust, no player wins that pot by hand strength.
- The backend must use one explicit configured fallback for that pot, not ad hoc behavior.

## 2. Cards And Hand Totals

Each player has private hole cards plus the shared community cards that apply to them.

Hand total is calculated from:

- The player's private card or cards.
- Any community cards the player has accepted before standing or being locked.

Aces may count as 11 or 1, using the value that gives the best non-busting total.

A hand is bust when its best possible total is greater than 21.

A bust player cannot win any pot by hand strength, but their earlier chip commitments remain in the pots.

## 3. Table Flow

A hand follows this high-level flow:

1. Seats are active and blinds/boot amounts are collected.
2. Private cards are dealt.
3. Players act in turn order.
4. Community cards are dealt when the betting/decision round is complete.
5. Players may confirm another community card, stand, call, raise, fold, double down, split, or go all-in when those actions are legal.
6. The hand reaches showdown when the final community-card limit is reached, all remaining players are locked, or no further legal progression exists.
7. Pots are built and awarded by eligibility and hand total.

## 4. Player States

### Active

The player is still contesting at least one pot and may receive turns.

### Folded

The player has given up their claim to all pots in the hand. Chips already committed remain in the pot.

### Standing

The player has chosen to stop accepting community cards for their hand. Standing does not automatically remove the player from betting obligations. If another eligible player raises after the stand, the standing player may still need to call or fold if they have chips and are eligible for that pot.

### All-In

The player has committed all remaining chips.

An all-in player:

- Remains active in the hand.
- Cannot add any more chips.
- Cannot call, raise, double down, or make any chip-funded action.
- May still confirm or stand on future community-card decisions when the rules allow it.
- May only win pots that include their committed chips.
- Must never be asked to call a later raise because they have no chips left.

### Bust

The player's total is over 21 after ace adjustment. A bust hand cannot win by score.

## 5. Confirm, Stand, And Community Cards

`Confirm` means:

- The player confirms their current wager/position.
- The player accepts another community card when the next community card is dealt.

`Stand` means:

- The player confirms their current wager/position.
- The player does not accept further community cards for that hand.

Important rule:

- If a player confirms they want another community card, and another player later raises in the same betting round, the confirming player must still respond to the additional raise if they have chips and are eligible for that pot.
- The earlier Confirm choice was a card decision, not a waiver of future betting.

For all-in players:

- Confirm still means they accept another community card.
- Stand still means they stop taking community cards.
- They are not asked to call later raises because they cannot add chips.
- Their future Confirm/Stand choice should only be presented once live betting players have settled the current bet.

## 6. Betting Fundamentals

Each betting round has a current required contribution, called `nMinBet` in the existing backend.

For each player:

```text
toCall = current required contribution - player's contribution this betting round
```

If `toCall` is 0, the player is not facing a bet.

If `toCall` is greater than 0, the player must choose one legal response:

- Call the amount.
- Fold.
- Raise, if they have enough chips to call and add a valid raise.
- Go all-in short, if they cannot cover the call or choose to commit all remaining chips where all-in is legal.

## 7. Raising

Players may raise even when another player is all-in, as long as there is at least one other live player with chips who can contest the raise.

All-in status by itself must not freeze betting for everyone else.

A raise can create side pots. The all-in player remains eligible only for the pot levels they have contributed to.

### Overbet And Short-Stack Rule

If a player raises more than another player can cover, the short-stacked player may continue by going all-in for their remaining chips.

Example:

```text
Player A raises 500.
Player B has 400.
Player B may go all-in for 400.
```

The unmatched extra amount must not be trapped in a pot no one can contest.

Preferred rule:

- Do not silently reduce Player A's raise before action.
- Let Player A raise the intended amount if another live player can legally contest it.
- If no eligible opponent can cover the full extra amount, refund the uncalled excess to Player A when the betting sequence settles.

Example:

```text
Player A bets 500.
Player B all-in calls 400.
No other player can contest the extra 100.
The 100 is returned to Player A.
The main pot includes only the matched 400 level from Player B.
```

## 8. Pots And Side Pots

Pots are formed by contribution levels.

Each pot has:

- A chip amount.
- A list of eligible players.
- A highest contribution threshold.

Players are eligible for a pot only if they contributed to that pot level and did not fold.

An all-in player can win only the pots up to their all-in contribution level.

Side pots continue among players who contributed more chips.

Example:

```text
Player A all-in total contribution: 400
Player B total contribution: 900
Player C total contribution: 900
```

Pot structure:

```text
Main pot: 400 from A + 400 from B + 400 from C
Eligible: A, B, C

Side pot: 500 from B + 500 from C
Eligible: B, C
```

Player A may have the best hand overall, but can only win the main pot. The side pot is awarded between Player B and Player C.

This also means a later side pot can be won by a low total, such as 12, if all other eligible side-pot hands are worse or bust.

## 9. All-In Rules

All-in is a chip commitment state, not a fold, stand, or automatic hand lock.

All-in may happen by:

- Calling short.
- Raising all remaining chips.
- Calling exactly with the player's remaining chips.
- Blind/boot collection using the player's last chips.

When a player goes all-in:

1. Their available chips become 0.
2. Their current contribution is locked.
3. They remain in the hand.
4. They cannot perform chip-funded actions later.
5. They may still make Confirm/Stand card decisions.
6. Their pot eligibility is capped at their contribution.

All-in players must not be folded by timeout while waiting on a non-chip Confirm/Stand choice. If they time out on that choice, the default should be Confirm unless product configuration explicitly says otherwise.

## 10. Confirm After All-In

All-in players still need card-control decisions because community cards may change their hand total.

If an all-in player is offered:

```text
Confirm    Stand
```

Then:

- Confirm means they accept the next community card.
- Stand means they stop taking community cards.
- Neither action changes their chip contribution.

The backend must defer this all-in Confirm/Stand choice until live betting players have settled the current bet. This prevents an all-in player from being shown a card decision while other players are still raising/calling the current wager.

## 11. 21 Does Not Automatically End The Hand

Reaching 21 does not automatically end the full hand.

Reason:

- A player on 21 may only be eligible for one pot.
- Other players may still be contesting side pots.
- A later side pot may be won by another total, including a low total such as 12, depending on who is eligible and who busts.

The backend must not declare the whole hand finished only because one active player reaches 21.

Exception:

- A table-specific fast-win rule may exist only if it is explicitly documented and enabled for that table type.

## 12. Fold

Fold means the player gives up all eligibility in the current hand.

Folded players:

- Cannot win any pot.
- Do not receive further card decisions.
- Do not receive further betting decisions.
- Keep no claim on chips already committed.

All-in players should not be auto-folded merely because they cannot call a later raise.

## 13. Check

Check is available when the player is not facing a bet.

If a player checks or confirms with no additional chips required, and another player later raises, that player must act again if they:

- Still have chips.
- Has not folded.
- Is eligible for the raised pot.
- Is not already all-in.

The returning action should be a real betting response, not just a card confirmation.

## 14. Call

Call is available when the player is facing a bet and has enough chips to match it.

Calling:

- Adds the required chips.
- Keeps the player eligible for the pot level they matched.
- Does not automatically mean the player stands.

If the call is paired with the stand path, the player also stops accepting more community cards for that hand.

## 15. Double Down

Double down is a special chip-funded action available only under the configured table conditions.

Current product intent:

- Double down is available only on the first community-card decision round.
- The player must have enough chips to pay the double-down amount.
- Double down adds the configured amount, gives/accepts the relevant card, and then locks the player from taking further cards.

Double down is not available to all-in players.

## 16. Split

Split is a special action available only when the player's private card and the relevant community card meet the split condition configured by the game.

Current product intent:

- Split is only available when exactly one community card has been dealt.
- The player's hole card must match the community card label.
- The player must have enough chips to fund the split wager.
- Split creates two hand tracks for that player.
- Pot eligibility and card decisions must be tracked per split hand where needed.

Split rules should be expanded in a separate split-specific spec before changing the implementation further.

## 17. Turn Timing

If a normal player misses a chip-funded decision, the configured timeout behavior applies.

For all-in Confirm/Stand decisions:

- Timeout must not fold the player.
- Default timeout action should be Confirm.
- The action should be logged clearly as an automatic all-in card decision.

For bots:

- Bots must follow the same legal action rules as humans.
- Bot shortcuts must not bypass pot eligibility, all-in, or side-pot rules.

## 18. Showdown

At showdown:

1. Build pots by contribution level.
2. For each pot, identify eligible non-folded players.
3. Remove bust hands from winning consideration for that pot.
4. Award the pot to the eligible player with the highest total at or below 21.
5. Split the pot evenly if multiple eligible players tie for best total.
6. Return or handle odd chips by the configured table rule.

Showdown display should show:

- Each revealed hand.
- Each player's final total.
- Each pot winner.
- The chip amount won by each winner.

## 19. UI Button Language

Button wording must match the actual rule meaning.

Use:

```text
Confirm
```

Only when the player is confirming a card decision or a pending action confirmation.

Use:

```text
Call <amount>
```

When the player must add chips to continue contesting a pot.

Do not show `Call <amount>` to an all-in player.

Do show `Call <amount>` to a player who previously confirmed/checked but now must respond to a later raise.

## 20. Implementation Gaps To Close

These are known gaps between the desired rules above and areas of the current implementation that need review or correction.

### Required

- Allow raises after one player is all-in when at least two non-folded players with chip capacity can still contest a side pot.
- Build side pots from contribution levels instead of relying only on a single table pot.
- Refund uncalled excess bets whenever no eligible opponent can contest the extra amount.
- Ensure a player who confirmed another community card is still asked to call/fold/raise if a later raise occurs and they have chips.
- Ensure all-in players are never asked to call later raises.
- Stop declaring the entire hand immediately just because one player reaches 21.

### Recommended

- Add automated scenario tests for main pot plus side pot payout.
- Add automated scenario tests for overbet refund.
- Add automated scenario tests for confirmed-then-raised player returning to a real betting decision.
- Add frontend tests or debug scenarios for button labels in all-in, call, confirm, and raise-after-confirm states.

## 21. Glossary

Community card:
Shared card dealt to the table that may affect active player hands.

Confirm:
Player accepts the next community card or confirms the current pending action.

Stand:
Player stops accepting further community cards for that hand.

To call:
The amount of chips needed to match the current required contribution.

Main pot:
The pot every remaining eligible player can contest up to the smallest all-in contribution level.

Side pot:
Additional pot contested only by players who contributed above a lower all-in player's level.

Uncalled excess:
Bet amount that no eligible opponent matched or could contest, which must be returned to the bettor.
