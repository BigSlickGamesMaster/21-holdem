export const RULES_SECTIONS = [
    {
        title: 'Objective',
        paragraphs: [
            "21 Hold'em is a poker-inspired blackjack variant where players compete to form the highest hand without exceeding 21.",
            'The game features betting rounds, communal cards, and the option to double down in the first round.',
        ],
    },
    {
        title: 'Setup & Gameplay Structure',
        bullets: [
            "21 Hold'em is played with 2 to 9 players at the table.",
            "Players are not competing against a dealer's hand.",
            'The deck is shuffled after each hand.',
            'A rotating dealer determines the order of play.',
            "The player to the dealer's left posts the small blind (SB), and the next player posts the big blind (BB).",
            'The game uses a standard 52-card deck.',
        ],
    },
    {
        title: 'Initial Deal',
        bullets: [
            "Players are dealt one private card face down starting from the player left of the big blind in clockwise order.",
            'The first betting round begins immediately after the opening deal.',
        ],
    },
    {
        title: 'Betting Rounds & Community Cards',
        bullets: [
            'Pre-Action Round: players act based on their private card and may also double down.',
            'Action Round: the first communal card, called the Action Card, is dealt and revealed, followed by another round of betting.',
            'Stage Round: the second communal card, called the Stage Card, is dealt and revealed, followed by another round of betting.',
            'Show Round: the third communal card, called the Show Card, is dealt and revealed, followed by another round of betting.',
            'Caboose Round: the fourth communal card, called the Caboose Card, is dealt and revealed, followed by the final betting round.',
            'After the final betting round, any remaining players reveal their hands and the best hand closest to 21 without exceeding it wins.',
            'Community cards are only revealed when players request them.',
        ],
    },
    {
        title: 'Actions & Betting Options',
        bullets: [
            'Check: if no bet has been placed, the player may pass their turn.',
            'Bet: if no bet has been placed, the player may wager an amount.',
            'Call: if another player has bet, the player may match that bet.',
            'Raise: if another player has bet, the player may increase the bet.',
            'Fold: the player discards their card and forfeits their hand.',
            'Confirm: confirms the current bet and the player elects to receive an additional communal card.',
            'Stand: confirms the current bet and elects to stand, receiving no additional communal cards.',
            'Cancel: cancels the current bet selection before it is confirmed.',
        ],
    },
    {
        title: 'Double Down (DD)',
        bullets: [
            'Players can only double down in the first betting round.',
            'To double down, a player posts the current pot total as a one-off bet and receives a second private card from the deck, separate from the communal card.',
            'DD players are locked into their hand total and cannot raise in later rounds, but may still call or fold.',
            'If a DD player hits exactly 21, the round ends immediately and that player wins the pot.',
        ],
    },
    {
        title: 'Standing',
        bullets: [
            'Players may choose to stand at any time, locking in their current hand total.',
            'A standing player does not receive additional communal cards.',
            'Standing players can still call or fold if other players bet.',
        ],
    },
    {
        title: 'Min, Half Pot & Full Pot',
        bullets: [
            'Min: the table minimum bet.',
            'Half Pot: the player bets half of the current table pot.',
            'Full Pot: the player bets the full amount of the current table pot.',
        ],
    },
    {
        title: 'Winning & Hand Evaluation',
        paragraphs: [
            'The goal is to get as close to 21 as possible without exceeding it.',
        ],
        bullets: [
            'Number cards 2 through 10 are worth face value.',
            'Face cards J, Q and K are worth 10.',
            'Aces can be worth 1 or 11, depending on what benefits the player.',
        ],
    },
    {
        title: 'Instant Wins',
        bullets: [
            'Blackjack, meaning an Ace plus a 10-value card, wins immediately if it occurs in the first round.',
            'If a player who doubled down reaches exactly 21, that player wins the pot immediately.',
            'There are no additional adjustments based on risk or communal card usage.',
        ],
    },
    {
        title: 'Tiebreakers & Split Pots',
        bullets: [
            'If multiple players tie with the highest total, the pot is split equally between them.',
            'Standard poker payout rules apply.',
        ],
    },
];

export const HOW_TO_PLAY_SECTIONS = [
    {
        title: '1. Know the objective',
        bullets: [
            "Your goal is to make the highest total without going over 21.",
            "You are competing against the other players at the table, not against a dealer's hand.",
        ],
    },
    {
        title: '2. Understand the table setup',
        bullets: [
            "The game runs with 2 to 9 players and a rotating dealer button.",
            "The player to the dealer's left posts the small blind, and the next player posts the big blind.",
            'The deck is shuffled after every hand.',
        ],
    },
    {
        title: '3. Start with one private card',
        bullets: [
            'Each player receives one private card face down.',
            'Cards are dealt starting from the player left of the big blind and continue clockwise.',
            'The first betting round begins right after that opening deal.',
        ],
    },
    {
        title: '4. Play through the betting rounds',
        bullets: [
            'Pre-Action Round: act on your private card and decide whether to double down.',
            'Action Round: the first communal card is revealed if players request it, then betting resumes.',
            'Stage Round: the second communal card is revealed, then betting resumes.',
            'Show Round: the third communal card is revealed, then betting resumes.',
            'Caboose Round: the fourth communal card is revealed, followed by the final betting round.',
        ],
    },
    {
        title: '5. Use the core actions correctly',
        bullets: [
            'Check when no bet is open and you want to pass without adding chips.',
            'Bet when the action is open and you want to set the amount.',
            'Call when a bet is already open and you want to match it.',
            'Raise when a bet is already open and you want to increase the pressure.',
            'Fold when you want to leave the hand.',
            'Confirm when you accept the current bet and want another communal card.',
            'Stand when you confirm the current bet and stop receiving additional communal cards.',
            'Cancel when you want to clear the current bet selection before confirming.',
        ],
    },
    {
        title: '6. Understand Double Down',
        bullets: [
            'Double Down is only available in the first betting round.',
            'You post the current pot total as a one-off bet and receive a second private card.',
            'After doubling down, your hand total is locked and you cannot raise in later rounds, though you may still call or fold.',
            'If that Double Down hand reaches exactly 21, the hand ends immediately and you win the pot.',
        ],
    },
    {
        title: '7. Understand Standing',
        bullets: [
            'You may stand at any time.',
            'Standing locks your current total and stops you from receiving additional communal cards.',
            'If betting continues, you may still need to call or fold.',
        ],
    },
    {
        title: '8. Learn the bet-size shortcuts',
        bullets: [
            'Min means the table minimum bet.',
            'Half Pot means half of the current table pot.',
            'Full Pot means the full amount of the current table pot.',
        ],
    },
    {
        title: '9. Know how winning works',
        bullets: [
            'Number cards are face value, face cards are worth 10, and aces count as 1 or 11.',
            'Blackjack, meaning Ace plus a 10-value card, wins immediately if it happens in the first round.',
            'If multiple players tie for the best valid total, the pot is split equally.',
        ],
    },
];

export const GUEST_HELP_HOW_TO_PLAY_SECTIONS = [
    {
        title: 'Opening hand',
        bullets: [
            'Every player starts with one private card and the first betting round begins immediately.',
            "You are playing against the other players' totals, not against a dealer hand.",
        ],
    },
    {
        title: 'Board progression',
        bullets: [
            'The table can move through Action, Stage, Show and Caboose rounds.',
            'Each communal card is only revealed when players request it.',
        ],
    },
    {
        title: 'Decision flow',
        bullets: [
            'Check if no bet is open.',
            'Call or raise if betting is already open.',
            'Confirm to keep taking communal cards, or stand to lock your total.',
        ],
    },
    {
        title: 'Commitment moves',
        bullets: [
            'Double Down is only available in the first betting round and gives you a second private card.',
            'Standing can be used at any time and stops you from taking additional communal cards.',
        ],
    },
    {
        title: 'Winning',
        bullets: [
            'Closest to 21 without exceeding it wins.',
            'Blackjack in the first round wins immediately.',
            'Tied winning totals split the pot equally.',
        ],
    },
];

export const GUEST_HELP_RULES_SECTIONS = [
    {
        title: 'Table structure',
        bullets: [
            "The game runs with 2 to 9 players and a rotating dealer button.",
            "Small blind and big blind are posted by the two players to the dealer's left.",
            'The deck is shuffled after each hand.',
        ],
    },
    {
        title: 'Rounds',
        bullets: [
            'The hand moves from the Pre-Action round into Action, Stage, Show and Caboose rounds.',
            'Each round can reveal a new communal card if players request it.',
            'After the final betting round, remaining players reveal and compare totals.',
        ],
    },
    {
        title: 'Actions',
        bullets: [
            'Check if no bet is open.',
            'Bet, call or raise depending on the current action state.',
            'Confirm keeps you live for another communal card, while stand locks your current total.',
            'Cancel clears the current bet selection before you commit.',
        ],
    },
    {
        title: 'Special moves',
        bullets: [
            'Double Down is first-round only and costs the current pot total as a one-off bet.',
            'A doubled-down player receives a second private card and cannot raise later.',
            'A standing player receives no more communal cards, but can still call or fold if needed.',
        ],
    },
    {
        title: 'Scoring and payouts',
        bullets: [
            'Number cards are face value, face cards are worth 10, and aces count as 1 or 11.',
            'Blackjack in the first round wins immediately.',
            'A doubled-down player who hits exactly 21 wins immediately.',
            'Tied winning totals split the pot equally under standard poker payout rules.',
        ],
    },
];
