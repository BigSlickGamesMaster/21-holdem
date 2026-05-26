/* global describe, test, expect */
import { createInitialClientGameState } from './clientGameState';
import { replaySocketEventsToClientState, reduceSocketEventToClientState } from './socketStateReducer';
import { SOCKET_RESPONSE_EVENTS } from './socketEvents';

describe('socketStateReducer', () => {
    test('applies board state socket event to client state', () => {
        const state = reduceSocketEventToClientState(createInitialClientGameState(), {
            sEventName: SOCKET_RESPONSE_EVENTS.BOARD_STATE,
            oData: {
                nTableChips: 1000,
                eState: 'playing',
                aParticipant: [{ iUserId: 'u1', nSeat: 0 }],
            },
        });

        expect(state.board.nTableChips).toBe(1000);
        expect(state.board.eState).toBe('playing');
        expect(state.participantsById.u1).toEqual({ iUserId: 'u1', nSeat: 0 });
    });

    test('applies user joined event to participants', () => {
        const state = reduceSocketEventToClientState(createInitialClientGameState(), {
            sEventName: SOCKET_RESPONSE_EVENTS.USER_JOINED,
            oData: { iUserId: 'u2', nSeat: 1 },
        });

        expect(state.participantsById.u2).toEqual({ iUserId: 'u2', nSeat: 1 });
        expect(state.participantOrder).toEqual(['u2']);
    });

    test('applies local card hand event using supplied local user id', () => {
        const state = reduceSocketEventToClientState(createInitialClientGameState(), {
            sEventName: SOCKET_RESPONSE_EVENTS.CARD_HAND,
            oData: {
                aCardHand: [{ _id: 'c1' }],
                nCardScore: 12,
            },
        }, { localUserId: 'me' });

        expect(state.participantsById.me).toEqual({
            iUserId: 'me',
            aCardHand: [{ _id: 'c1' }],
            nCardScore: 12,
        });
    });

    test('applies fold status event', () => {
        const state = reduceSocketEventToClientState(createInitialClientGameState(), {
            sEventName: SOCKET_RESPONSE_EVENTS.FOLD_PLAYER,
            oData: {
                iUserId: 'u1',
                oLeave: {
                    eBehaviour: 'manual',
                    sReason: 'folded',
                    bShowMessage: true,
                },
            },
        });

        expect(state.participantsById.u1).toEqual({
            iUserId: 'u1',
            eState: 'fold',
            eBehaviour: 'manual',
            sReason: 'folded',
            bShowMessage: true,
        });
    });

    test('applies community card event to board and participant patches', () => {
        const state = reduceSocketEventToClientState(createInitialClientGameState(), {
            sEventName: SOCKET_RESPONSE_EVENTS.COMMUNITY_CARD,
            oData: {
                aCommunityCard: [{ _id: 'community-1' }],
                aParticipant: [
                    { iUserId: 'u1', nChips: 800, nCardScore: 15, aCardHand: [{ _id: 'h1' }] },
                ],
            },
        });

        expect(state.board.aCommunityCard).toEqual([{ _id: 'community-1' }]);
        expect(state.participantsById.u1).toMatchObject({
            iUserId: 'u1',
            nChips: 800,
            nCardScore: 15,
            aCardHand: [{ _id: 'h1' }],
        });
    });

    test('replays mini hand flow into final client state', () => {
        const state = replaySocketEventsToClientState(createInitialClientGameState(), [
            {
                sEventName: SOCKET_RESPONSE_EVENTS.BOARD_STATE,
                oData: {
                    nTableChips: 0,
                    eState: 'playing',
                    aParticipant: [
                        { iUserId: 'me', nSeat: 0, nChips: 1000 },
                        { iUserId: 'villain', nSeat: 1, nChips: 1000 },
                    ],
                },
            },
            {
                sEventName: SOCKET_RESPONSE_EVENTS.CARD_HAND,
                oData: {
                    aCardHand: [{ _id: 'h1' }],
                    nCardScore: 10,
                },
            },
            {
                sEventName: SOCKET_RESPONSE_EVENTS.CALL,
                oData: {
                    iUserId: 'me',
                    nChips: 900,
                    nTableChips: 100,
                },
            },
            {
                sEventName: SOCKET_RESPONSE_EVENTS.FOLD_PLAYER,
                oData: {
                    iUserId: 'villain',
                    oLeave: { eBehaviour: 'fold' },
                },
            },
        ], { localUserId: 'me' });

        expect(state.board.nTableChips).toBe(100);
        expect(state.participantsById.me).toMatchObject({
            iUserId: 'me',
            nChips: 900,
            aCardHand: [{ _id: 'h1' }],
            nCardScore: 10,
        });
        expect(state.participantsById.villain).toMatchObject({
            iUserId: 'villain',
            eState: 'fold',
        });
    });

    test('ignores unknown events by returning original state', () => {
        const state = createInitialClientGameState();
        expect(reduceSocketEventToClientState(state, { sEventName: 'unknown' })).toBe(state);
    });
});
