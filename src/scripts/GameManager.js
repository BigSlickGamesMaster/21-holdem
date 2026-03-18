/**
 * ==========================================================
 * GameManager.js — BEGINNER “CONTROL PANEL” + SAFE EDIT ZONES
 * ==========================================================
 *
 * Think of this file as your CLIENT-SIDE settings and layout blueprint.
 *
 * It mainly contains:
 * - Timers (how long phases last, delays between animations)
 * - Limits (max players, max community cards, max score)
 * - UI layout numbers (seat positions around the table)
 *
 * It does NOT:
 * - run server logic
 * - decide who wins
 * - validate poker rules (server should do that)
 *
 * ----------------------------------------------------------
 * Beginner editing rules
 * ----------------------------------------------------------
 * ✅ Change numbers in SAFE EDIT ZONES.
 * ❌ Do NOT rename keys inside oSetting (server/other code expects them).
 *
 * Expected outcomes:
 * - Change a timer → the pace feels faster/slower.
 * - Change seat x/y → players move on the table.
 * - Change nCardGap → cards spread out more/less.
 * ==========================================================
 */

export default class GameManager {
    constructor(oScene) {
        this.oScene = oScene;

        // ==========================================================
        // SAFE EDIT ZONE A: TIMERS + LIMITS
        // - Most values are milliseconds (ms): 1000ms = 1 second
        // - You can change NUMBER VALUES, but DO NOT rename the keys.
        // ==========================================================
        this.oSetting = {
            // How long the 'initializing' phase shows before the first action.
            "nInitializeTimer": 4000,
            // Bust limit (21). Change only if you intentionally want a different game.
            "nMaxScoreBoundary": 21,
            "nHighDroppedPenalty": 40,
            "nLowDroppedPenalty": 20,
            // Delay before cards are distributed (animation pacing).
            "nCardDistributionDelay": 3800,
            // How long the pre-game countdown lasts before the round begins.
            "nBeginCountdown": 25000,
            "nDistributeCardAnimationDelay": 2000,
            "nAnimationCountdown": 1000,
            // Core turn timer used by turn logic (UI countdown).
            "nAllocatedTurnTime": 20000,
            // Total time allowed for a turn (may include buffers).
            "nTurnTime": 30000,
            "nTurnBuffer": 1000,
            "nRoundStartsIn": 25000,
            // How long results/winner screens remain visible.
            "nDeclareTTL": 20000,
            "nFinishTTL": 30000,
            // Max number of card groups (UI grouping mechanic).
            "nMaxCardGroup": 5,
            "nMaxWaitingTime": 30000,
            "nMaxTurnMissAllowed": 3,
            "nMaxBot": 1,
            // Private table timeout (ms). 600000 = 10 minutes.
            "nPrivateTableWaitingTimeOut": 600000,
            "nRoundStartsIn": 10000,
            "oTax": {
                "nDeduction": 30,
                "nOffset": 1
            }
        };
        this.oGameInfo = {
            nTableEntryFee: 0,
            nMaxPlayer: 9,
            nSmallBlindAmount: 0,
            nBigBlindAmount: 0
        };
        this.nMaxPlayer = 9;
        this.nMaxCards = 1;
        this.nCardGap = 50;
        this.nGroupGap = 50;
        this.nCardY = 700;
        this.nMaxGroup = 6;
        this.isPractice = true;
        this.nCardDuration = 300;
        this.nMyPlayerChips = 0;
        this.nPotAmount = 0;
        this.aCommunityCards = [];
        this.aPlayerCards = [];
        this.aWinnerPlayers = [];
        this.exitMessage = 'Are you sure you want to quit?';
        // this.exitMessage = 'Are you sure you want to quit?\nIf you quit now, your hand will be folded automatically, and you’ll lose your chance to win this round.';
    }

    // ==========================================================
    // SAFE EDIT ZONE: SEAT POSITIONS (UI ONLY)
    // If a seat overlaps buttons/cards, adjust x/y here.
    // Expected outcome: ONLY visual movement of player HUDs.
    // ==========================================================
    getPlayerProfileSpecs(nPlayer) {
        const aPlayerProfile = [
            { x: 960, y: 860 }, // 0 (bottom center)
            { x: 600, y: 760 }, // 1 (bottom left)
            { x: 310, y: 600 }, // 2 (bottom middle left)
            { x: 310, y: 260 }, // 3 (middle right)
            { x: 640, y: 160 }, // 4 (top left)
            { x: 1280, y: 160 }, // 5 (top right)
            { x: 1610, y: 260 }, // 6 (middle right)
            { x: 1610, y: 600 }, // 7 (bottom middle right)
            { x: 1320, y: 760 }, // 8 (bottom right)
        ]
        return aPlayerProfile[nPlayer];
    }
    getHighCardSpecs(nPlayer) {
        const aHighCards = [
            [],
            [],
            [
                { x: 960, y: 695 },
                { x: 960, y: 410 },
            ],
            [],
            [],
            [],
            [
                { x: 960, y: 695 },
                { x: 360, y: 570 },
                { x: 550, y: 410 },
                { x: 960, y: 410 },
                { x: 1370, y: 410 },
                { x: 1560, y: 570 },
            ],
        ]
        return aHighCards[this.nMaxPlayer][nPlayer];
    }
    reorganizeHand(hand) {
        const groupedHand = [];
        const groupMap = new Map();

        // Group cards by nGroupId
        hand.forEach(card => {
            if (!groupMap.has(card.nGroupId)) {
                groupMap.set(card.nGroupId, []);
            }
            groupMap.get(card.nGroupId).push(card);
        });

        // Sort groups and reassign nGroupId if needed
        let newGroupId = 0;
        Array.from(groupMap.entries())
            .sort(([a], [b]) => a - b)
            .forEach(([_, group]) => {
                group.forEach(card => card.nGroupId = newGroupId);
                groupedHand.push(group);
                newGroupId++;
            });

        return groupedHand;
    }
    extractIds(hand) {
        return hand.map(card => ({ iCardId: card._id, nGroupId: card.nGroupId }));
    }
}
