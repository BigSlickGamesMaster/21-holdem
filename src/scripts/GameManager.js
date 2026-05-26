import config from './config';

/**
 * GameManager — client-side settings and layout config.
 * - Holds timers, limits, and UI layout values (not game logic).
 * - oSetting keys must match server expectations — do not rename.
 * - Seat x/y positions are in getPlayerProfileSpecs().
 */

export default class GameManager {
    constructor(oScene) {
        this.oScene = oScene;

        // Timers and limits (ms). Keys must not be renamed — server expects them.
        this.oSetting = {
            "nInitializeTimer": 4000,       // delay before first action
            "nMaxScoreBoundary": 21,         // bust limit
            "nHighDroppedPenalty": 40,
            "nLowDroppedPenalty": 20,
            "nCardDistributionDelay": 3800,  // pause before dealing
            "nBeginCountdown": 25000,        // pre-game countdown
            "nDistributeCardAnimationDelay": 2000,
            "nAnimationCountdown": 1000,
            "nAllocatedTurnTime": 20000,     // UI turn countdown
            "nTurnTime": 30000,              // total turn window (with buffers)
            "nTurnBuffer": 1000,
            "nDeclareTTL": 20000,            // how long result screen shows
            "nFinishTTL": 30000,
            "nMaxCardGroup": 5,
            "nMaxWaitingTime": 30000,
            "nMaxTurnMissAllowed": 3,
            "nMaxBot": 1,
            "nPrivateTableWaitingTimeOut": 600000, // 10 min private table wait
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

    }

    // Seat x/y positions for desktop and mobile layouts.
    getPlayerProfileSpecs(nPlayer) {
        const aPlayerProfile = config.isDesktopLayout()
            ? [
                { x: 960, y: 860 }, // 0
                { x: 600, y: 760 }, // 1
                { x: 310, y: 600 }, // 2
                { x: 310, y: 260 }, // 3
                { x: 640, y: 160 }, // 4
                { x: 1280, y: 160 }, // 5
                { x: 1610, y: 260 }, // 6
                { x: 1610, y: 600 }, // 7
                { x: 1320, y: 760 }, // 8
            ]
            : [
                { x: 540, y: 1200 }, // 0
                { x: 332, y: 1142 }, // 1
                { x: 280, y: 944 },  // 2
                { x: 298, y: 734 },  // 3
                { x: 348, y: 594 },  // 4
                { x: 732, y: 594 },  // 5
                { x: 782, y: 734 },  // 6
                { x: 800, y: 944 },  // 7
                { x: 748, y: 1142 }, // 8
            ];
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
            .forEach(([, group]) => {
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
