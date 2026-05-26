/* global describe, test, expect */
import {
    getClientBoard,
    getClientCommunityCards,
    getClientParticipant,
    getClientParticipantChips,
    getClientParticipantScore,
    getClientParticipantsById,
    getClientTableChips,
    getClientTurn,
    getClientTurnActionState,
    getClientTurnContext,
} from './clientGameSelectors';

describe('clientGameSelectors', () => {
    const state = {
        board: {
            nTableChips: '1500',
            aCommunityCard: [{ _id: 'c1' }],
        },
        participantsById: {
            u1: { iUserId: 'u1', nChips: '900', nCardScore: '18' },
        },
        turn: {
            context: { toCallAmount: 50 },
            actionState: { call: { visible: true } },
        },
    };

    test('selects board values with safe defaults', () => {
        expect(getClientBoard(state)).toBe(state.board);
        expect(getClientBoard(null)).toEqual({});
        expect(getClientTableChips(state)).toBe(1500);
        expect(getClientTableChips({})).toBe(0);
        expect(getClientCommunityCards(state)).toEqual([{ _id: 'c1' }]);
        expect(getClientCommunityCards({ board: { aCommunityCard: null } })).toEqual([]);
    });

    test('selects participants by id with safe defaults', () => {
        expect(getClientParticipantsById(state)).toBe(state.participantsById);
        expect(getClientParticipantsById(null)).toEqual({});
        expect(getClientParticipant(state, 'u1')).toBe(state.participantsById.u1);
        expect(getClientParticipant(state, 'missing')).toBeNull();
        expect(getClientParticipantChips(state, 'u1')).toBe(900);
        expect(getClientParticipantChips(state, 'missing')).toBe(0);
        expect(getClientParticipantScore(state, 'u1')).toBe(18);
        expect(getClientParticipantScore(state, 'missing')).toBe(0);
    });

    test('selects turn values with safe defaults', () => {
        expect(getClientTurn(state)).toBe(state.turn);
        expect(getClientTurn(null)).toEqual({});
        expect(getClientTurnContext(state)).toEqual({ toCallAmount: 50 });
        expect(getClientTurnContext({})).toEqual({});
        expect(getClientTurnActionState(state)).toEqual({ call: { visible: true } });
        expect(getClientTurnActionState({})).toEqual({});
    });
});
