/* global describe, test, expect */
import {
    applyBoardSnapshotToClientState,
    applyParticipantPatchToClientState,
    clientGameStateReducer,
    CLIENT_GAME_STATE_ACTIONS,
    createInitialClientGameState,
    setCommunityCardsInClientState,
    setTableChipsInClientState,
    setParticipantHandScoreInClientState,
    setParticipantStatusInClientState,
    setTurnActionStateInClientState,
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

    test('sets table chips without changing other board fields', () => {
        const state = applyBoardSnapshotToClientState(createInitialClientGameState(), {
            iDealerId: 'dealer',
            nTableChips: 500,
        });
        const nextState = setTableChipsInClientState(state, 1250);

        expect(nextState.board.iDealerId).toBe('dealer');
        expect(nextState.board.nTableChips).toBe(1250);
    });

    test('reducer applies table chip update action', () => {
        const nextState = clientGameStateReducer(createInitialClientGameState(), {
            type: CLIENT_GAME_STATE_ACTIONS.SET_TABLE_CHIPS,
            payload: { nTableChips: '750' },
        });

        expect(nextState.board.nTableChips).toBe(750);
    });

    test('sets latest turn context and action state', () => {
        const actionState = { call: { visible: true, label: 'Call 100' } };
        const context = { aUserAction: ['c'], nMinBet: 100, toCallAmount: 100 };
        const nextState = setTurnActionStateInClientState(createInitialClientGameState(), {
            iUserId: 'u1',
            isLocalTurn: true,
            context,
            actionState,
        });

        expect(nextState.turn).toEqual({
            iUserId: 'u1',
            isLocalTurn: true,
            context,
            actionState,
        });
    });

    test('reducer applies turn action state action', () => {
        const nextState = clientGameStateReducer(createInitialClientGameState(), {
            type: CLIENT_GAME_STATE_ACTIONS.SET_TURN_ACTION_STATE,
            payload: {
                iUserId: 'u2',
                isLocalTurn: false,
                context: { aUserAction: [] },
                actionState: { fold: { visible: false } },
            },
        });

        expect(nextState.turn.iUserId).toBe('u2');
        expect(nextState.turn.isLocalTurn).toBe(false);
        expect(nextState.turn.context).toEqual({ aUserAction: [] });
        expect(nextState.turn.actionState).toEqual({ fold: { visible: false } });
    });

    test('sets participant hand and score while preserving participant fields', () => {
        const state = applyBoardSnapshotToClientState(createInitialClientGameState(), {
            aParticipant: [{ iUserId: 'u1', nChips: 100 }],
        });
        const hand = [{ _id: 'c1' }];
        const nextState = setParticipantHandScoreInClientState(state, {
            iUserId: 'u1',
            aCardHand: hand,
            nCardScore: '18',
        });

        expect(nextState.participantsById.u1).toEqual({
            iUserId: 'u1',
            nChips: 100,
            aCardHand: hand,
            nCardScore: 18,
        });
    });

    test('adds participant hand state for missing participant', () => {
        const nextState = setParticipantHandScoreInClientState(createInitialClientGameState(), {
            iUserId: 'u2',
            aCardHand: [{ _id: 'c2' }],
            nCardScore: 9,
        });

        expect(nextState.participantsById.u2).toEqual({
            iUserId: 'u2',
            aCardHand: [{ _id: 'c2' }],
            nCardScore: 9,
        });
        expect(nextState.participantOrder).toEqual(['u2']);
    });

    test('reducer applies participant hand score action', () => {
        const nextState = clientGameStateReducer(createInitialClientGameState(), {
            type: CLIENT_GAME_STATE_ACTIONS.SET_PARTICIPANT_HAND_SCORE,
            payload: { iUserId: 'u1', nCardScore: 21 },
        });

        expect(nextState.participantsById.u1).toEqual({ iUserId: 'u1', nCardScore: 21 });
    });

    test('sets participant lifecycle status fields', () => {
        const nextState = setParticipantStatusInClientState(createInitialClientGameState(), {
            iUserId: 'u1',
            eState: 'fold',
            eBehaviour: 'manual',
            sReason: 'folded',
            bShowMessage: true,
        });

        expect(nextState.participantsById.u1).toEqual({
            iUserId: 'u1',
            eState: 'fold',
            eBehaviour: 'manual',
            sReason: 'folded',
            bShowMessage: true,
        });
    });

    test('reducer applies participant status action', () => {
        const nextState = clientGameStateReducer(createInitialClientGameState(), {
            type: CLIENT_GAME_STATE_ACTIONS.SET_PARTICIPANT_STATUS,
            payload: { iUserId: 'u2', eState: 'leave' },
        });

        expect(nextState.participantsById.u2).toEqual({
            iUserId: 'u2',
            eState: 'leave',
            eBehaviour: undefined,
            sReason: undefined,
            bShowMessage: undefined,
        });
    });

    test('sets community cards without changing other board fields', () => {
        const state = applyBoardSnapshotToClientState(createInitialClientGameState(), {
            iDealerId: 'dealer',
            aCommunityCard: [{ _id: 'old' }],
        });
        const nextState = setCommunityCardsInClientState(state, [{ _id: 'new' }]);

        expect(nextState.board.iDealerId).toBe('dealer');
        expect(nextState.board.aCommunityCard).toEqual([{ _id: 'new' }]);
    });

    test('reducer applies community card action', () => {
        const nextState = clientGameStateReducer(createInitialClientGameState(), {
            type: CLIENT_GAME_STATE_ACTIONS.SET_COMMUNITY_CARDS,
            payload: { aCommunityCard: [{ _id: 'c1' }] },
        });

        expect(nextState.board.aCommunityCard).toEqual([{ _id: 'c1' }]);
    });
});
