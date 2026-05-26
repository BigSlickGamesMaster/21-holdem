/* global describe, test, expect */
import {
    getIncomingHandIds,
    getRenderedHandIds,
    playerHandNeedsReset,
    playerHasRenderedCard,
    shouldRevealPlayerScore,
    shouldShowPlayerScore,
} from './playerHandSync';

const createPlayer = ({ iUserId = 'u1', renderedIds = [] } = {}) => ({
    iUserId,
    playerProfile: {
        container_cards: {
            list: renderedIds.map((_id) => ({ _id })),
        },
    },
});

describe('playerHandSync', () => {
    test('extracts rendered and incoming card ids', () => {
        expect(getRenderedHandIds(createPlayer({ renderedIds: ['a', '', 'b'] }))).toEqual(['a', 'b']);
        expect(getIncomingHandIds([{ _id: 'x' }, { _id: null }, { _id: 'y' }])).toEqual(['x', 'y']);
    });

    test('detects rendered cards by normalized id', () => {
        const player = createPlayer({ renderedIds: [101, 202] });

        expect(playerHasRenderedCard(player, '101')).toBe(true);
        expect(playerHasRenderedCard(player, 202)).toBe(true);
        expect(playerHasRenderedCard(player, 303)).toBe(false);
    });

    test('decides when hand reset is needed', () => {
        const player = createPlayer({ renderedIds: ['a', 'b'] });

        expect(playerHandNeedsReset(createPlayer({ renderedIds: [] }), [{ _id: 'a' }])).toBe(false);
        expect(playerHandNeedsReset(player, [])).toBe(true);
        expect(playerHandNeedsReset(player, [{ _id: 'a' }])).toBe(true);
        expect(playerHandNeedsReset(player, [{ _id: 'a' }, { _id: 'b' }])).toBe(false);
        expect(playerHandNeedsReset(player, [{ _id: 'a' }, { _id: 'c' }])).toBe(true);
    });

    test('shows score only for positive score with incoming or rendered cards', () => {
        const player = createPlayer({ renderedIds: ['a'] });

        expect(shouldShowPlayerScore([{ _id: 'a' }], 10, null)).toBe(true);
        expect(shouldShowPlayerScore([], 10, player.playerProfile)).toBe(true);
        expect(shouldShowPlayerScore([], 0, player.playerProfile)).toBe(false);
        expect(shouldShowPlayerScore([], 10, createPlayer().playerProfile)).toBe(false);
    });

    test('reveals score for local player or forced reveal only', () => {
        const localPlayer = createPlayer({ iUserId: 'me', renderedIds: ['a'] });
        const otherPlayer = createPlayer({ iUserId: 'other', renderedIds: ['a'] });

        expect(shouldRevealPlayerScore({
            player: localPlayer,
            aCardHand: [{ _id: 'a' }],
            nCardScore: 18,
            localUserId: 'me',
        })).toBe(true);
        expect(shouldRevealPlayerScore({
            player: otherPlayer,
            aCardHand: [{ _id: 'a' }],
            nCardScore: 18,
            localUserId: 'me',
        })).toBe(false);
        expect(shouldRevealPlayerScore({
            player: otherPlayer,
            aCardHand: [{ _id: 'a' }],
            nCardScore: 18,
            localUserId: 'me',
            forceReveal: true,
        })).toBe(true);
    });
});
