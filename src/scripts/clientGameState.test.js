/* global describe, test, expect */
import {
    applyBoardSnapshotToClientState,
    applyParticipantPatchToClientState,
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

    test('applies participant patch by merging existing participant data', () => {
        const state = applyBoardSnapshotToClientState(createInitialClientGameState(), {
            aParticipant: [{ iUserId: 'u1', nChips: 100, eState: 'playing' }],
        });
        const nextState = applyParticipantPatchToClientState(state, {
            iUserId: 'u1',
            nChips: 50,
        });

        expect(nextState.participantsById.u1).toEqual({
            iUserId: 'u1',
            nChips: 50,
            eState: 'playing',
        });
        expect(nextState.participantOrder).toEqual(['u1']);
    });

    test('adds participant patch for a new participant id', () => {
        const state = applyParticipantPatchToClientState(createInitialClientGameState(), {
            iUserId: 2,
            nSeat: 1,
        });

        expect(state.participantsById).toEqual({
            2: { iUserId: 2, nSeat: 1 },
        });
        expect(state.participantOrder).toEqual(['2']);
    });

    test('ignores participant patch without user id', () => {
        const state = createInitialClientGameState();

        expect(applyParticipantPatchToClientState(state, { nChips: 100 })).toBe(state);
    });

    test('reducer applies participant patch action', () => {
        const nextState = clientGameStateReducer(createInitialClientGameState(), {
            type: CLIENT_GAME_STATE_ACTIONS.APPLY_PARTICIPANT_PATCH,
            payload: { iUserId: 'u1', nChips: 100 },
        });

        expect(nextState.participantsById.u1).toEqual({ iUserId: 'u1', nChips: 100 });
    });
});
