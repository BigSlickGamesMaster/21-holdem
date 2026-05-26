/* global describe, test, expect */
import {
    normalizeBoardSnapshot,
    shouldCancelResultForBoardState,
    shouldHideSideBetWindowForBoardState,
} from './boardSnapshot';

describe('boardSnapshot', () => {
    test('normalizes common board payload fields', () => {
        const snapshot = normalizeBoardSnapshot({
            iDealerId: 'dealer',
            iBigBlindId: 'bb',
            iSmallBlindId: 'sb',
            nTableChips: '1500',
            nMaxPlayer: 9,
            nMinBet: 100,
            nTableRound: '2',
            eState: 'playing',
            oSetting: { turn: 1 },
            oGameInfo: { buyIn: 1000 },
            oTutorial: { step: 1 },
            aCommunityCard: [{ _id: 'c1' }],
            aParticipant: [{ iUserId: 'u1' }, null],
        });

        expect(snapshot).toMatchObject({
            iDealerId: 'dealer',
            iBigBlindId: 'bb',
            iSmallBlindId: 'sb',
            nTableChips: 1500,
            nMaxPlayer: 9,
            nMinBet: 100,
            nTableRound: 2,
            eState: 'playing',
            oSetting: { turn: 1 },
            oGameInfo: { buyIn: 1000 },
            oTutorial: { step: 1 },
            aCommunityCard: [{ _id: 'c1' }],
            aParticipant: [{ iUserId: 'u1' }],
        });
    });

    test('falls back to previous snapshot for optional setting/info/tutorial objects', () => {
        const previous = {
            oSetting: { previous: 'setting' },
            oGameInfo: { previous: 'info' },
            oTutorial: { previous: 'tutorial' },
        };

        expect(normalizeBoardSnapshot({}, previous)).toMatchObject(previous);
    });

    test('uses stable defaults for missing arrays and numbers', () => {
        const snapshot = normalizeBoardSnapshot({
            nTableChips: 'bad',
            nTableRound: 'bad',
            aCommunityCard: null,
            aParticipant: null,
        });

        expect(snapshot.nTableChips).toBe(0);
        expect(snapshot.nTableRound).toBe(1);
        expect(snapshot.aCommunityCard).toEqual([]);
        expect(snapshot.aParticipant).toEqual([]);
    });

    test('keeps existing playing-state lifecycle decisions explicit', () => {
        expect(shouldCancelResultForBoardState('playing')).toBe(true);
        expect(shouldCancelResultForBoardState('waiting')).toBe(false);
        expect(shouldHideSideBetWindowForBoardState('playing')).toBe(true);
        expect(shouldHideSideBetWindowForBoardState('finished')).toBe(false);
    });
});
