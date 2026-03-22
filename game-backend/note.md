1. Poker Jack [ Rules ]

- First Turn Assign to Dealer, small blind and big blind.
- collect boot amount from all participant.
- distribute 1 card to all participant.
- take turn to dealer.
- Spectator can join the game after 3 participant joined.
- new round start after Complete the one round.

2. [Questions]

- When to show doubled down option, only first time or every time until user lock it?
- if i doubled down, then i can lock it once or every time when my turn come then i lock it?
- in which condition change the value of Ace (1 or 11)?
- Key Point: The value of the Ace (1 or 11) depends on the player's current hand total and strategy (need more details about the strategy).
- What if when player all in chips, then what will be the next action?

3. [Game Pot Split Amount Logic]
   mare ak game che pokerjack ana mate winning amout distribute mate function bnava nu che
   gameflow kaik aa mujab che total 9 participant che pela badha ne ak ak card aavse pachi user na turn aavse first turn ma user DD kri sake
   DD kre to player no score lock thay jase have jo user DD na kre to community card aavse total 3 card aavse ane round wise (matlab badha player no turn) aavi jay pachi ak ak community card khulse
   have community card open thaya pachi user no tuen aave tyare tene stand no opetion aavse jo a stand kre to ano score bhi lock thay jase
   dar ak card open thaya pachi user no risk vadhu 5% thi vadse jo user 1 card pachi stand kre to DD krta anu risk vadhu 5% thi vadse dar ak card deal pachi ris 5% thi vadhase
   and jo user ky bhi action na kre to ano risk badha krta vadhu k vay to a mujab ane paisa mase
   aa badha case fullfill thay avu function bnavanu che (nodejs ma function bnavanu che)

1. Logic Overview:
   Participants: Total 9 participants.
   User Actions:
   Double Down (DD) locks the player's score and increases risk by 5%.
   Stand locks the player's score.
   No Action increases risk higher than others.
   Community Cards:
   3 cards open sequentially, with rounds in between.
   Risk Factor:
   Each card deal increases risk by 5%.
   If the user performs no action, their risk increases more than others.
   Winning Amount Distribution:
   Based on risk and score.

<!--  -->

1. [Split Pot]

   - One player All then all player get's AllIn btn and fold.
   - what should happnen if player do allin and reach nMaxBet amount. for ex. 1 = 5000, nMaxBet = 500 => allin, what should i do consider allin = 500 or allin = 5000?
   - what should happnen if player reach nMaxTableAmount? => then showdown all player card and declare result right?
   - what if allin proccess starts in middle. for ex. => 6 player are playing and 3rd player->allin then all remaining player get's allin btn 3rd to 6th, and then 5th player is dealer so community card it will open and declare result.
   - 3 player allin then 4th is dealer so community card it will open and in this case previous three player are bust due to community card open then what sho;d we do?
