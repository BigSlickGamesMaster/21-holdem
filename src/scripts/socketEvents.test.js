/* global describe, test, expect */
import emitter from './emitter';
import { SOCKET_REQUEST_EVENTS, SOCKET_RESPONSE_EVENTS, SOCKET_TRANSPORT_EVENTS } from './socketEvents';

describe('socketEvents', () => {
    test('preserves server-facing request names', () => {
        expect(SOCKET_REQUEST_EVENTS.JOIN_BOARD).toBe('reqJoinBoard');
        expect(SOCKET_REQUEST_EVENTS.CALL).toBe('reqCall');
        expect(SOCKET_REQUEST_EVENTS.RAISE).toBe('reqRaise');
        expect(SOCKET_REQUEST_EVENTS.DOUBLE_DOWN).toBe('reqDoubleDown');
        expect(SOCKET_REQUEST_EVENTS.SIDE_BETS).toBe('reqSideBets');
        expect(SOCKET_REQUEST_EVENTS.DISCARD_CARD).toBe('reqDiscardCard');
        expect(SOCKET_REQUEST_EVENTS.FINISH).toBe('reqFinish');
    });

    test('preserves server-facing response names', () => {
        expect(SOCKET_RESPONSE_EVENTS.INITIALIZE_GAME).toBe('initializeGame');
        expect(SOCKET_RESPONSE_EVENTS.PLAYER_TURN).toBe('resPlayerTurn');
        expect(SOCKET_RESPONSE_EVENTS.DOUBLE_DOWN).toBe('resDoubledown');
        expect(SOCKET_RESPONSE_EVENTS.SIDE_BETS).toBe('resSideBets');
    });

    test('preserves transport event names', () => {
        expect(SOCKET_TRANSPORT_EVENTS.CONNECT).toBe('connect');
        expect(SOCKET_TRANSPORT_EVENTS.CONNECT_ERROR).toBe('connect_error');
        expect(SOCKET_TRANSPORT_EVENTS.PING).toBe('ping');
    });

    test('keeps legacy emitter aliases compatible', () => {
        expect(emitter.reqCall).toBe(SOCKET_REQUEST_EVENTS.CALL);
        expect(emitter.reqRaise).toBe(SOCKET_REQUEST_EVENTS.RAISE);
        expect(emitter.reqDoubleDown).toBe(SOCKET_REQUEST_EVENTS.DOUBLE_DOWN);
        expect(emitter.reqSideBets).toBe(SOCKET_REQUEST_EVENTS.SIDE_BETS);
        expect(emitter.reqDiscardCard).toBe(SOCKET_REQUEST_EVENTS.DISCARD_CARD);
        expect(emitter.reqFinish).toBe(SOCKET_REQUEST_EVENTS.FINISH);
    });
});
