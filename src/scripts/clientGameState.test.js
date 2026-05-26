/* global describe, test, expect */
import {
    applyBoardSnapshotToClientState,
    clientGameStateReducer,
    CLIENT_GAME_STATE_ACTIONS,
    createInitialClientGameState,
} from './clientGameState';

describe('clientGameState', () => {
    test('creates stable initial state', () => {
        expect(createInitialClientGameState()).toMatchObject({
            board: {
                nTableChips: 0,
                nTableRound: 1,
                aCommunityCard: [],
            },
            participantsById: {},
            participantOrder: [],
        });
    });

    test('applies board snapshot and normalizes participants by id', () => {
        const state = applyBoardSnapshotToClientState(createInitialClientGameState(), {
            iDealerId: 'dealer',
            iBigBlindId: 'bb',
            iSmallBlindId: 'sb',
            nTableChips: 2500,
            nTableRound: 3,
            eState: 'playing',
            aCommunityCard: [{ _id: 'c1' }],
            aParticipant: [
                { iUserId: 'u1', nSeat: 0 },
                { iUserId: 2, nSeat: 1 },
                null,
            ],
        });

        expect(state.board).toMatchObject({
            iDealerId: 'dealer',
            iBigBlindId: 'bb',
            iSmallBlindId: 'sb',
            nTableChips: 2500,
            nTableRound: 3,
            eState: 'playing',
            aCommunityCard: [{ _id: 'c1' }],
        });
        expect(state.participantsById).toEqual({
            u1: { iUserId: 'u1', nSeat: 0 },
            2: { iUserId: 2, nSeat: 1 },
        });
        expect(state.participantOrder).toEqual(['u1', '2']);
    });

    test('reducer applies board snapshots and ignores unknown actions', () => {
        const initialState = createInitialClientGameState();
        const nextState = clientGameStateReducer(initialState, {
            type: CLIENT_GAME_STATE_ACTIONS.APPLY_BOARD_SNAPSHOT,
            payload: {
                nTableChips: 1000,
                aParticipant: [{ iUserId: 'u1' }],
            },
        });

        expect(nextState.board.nTableChips).toBe(1000);
        expect(nextState.participantOrder).toEqual(['u1']);
        expect(clientGameStateReducer(nextState, { type: 'unknown' })).toBe(nextState);
    });
});
