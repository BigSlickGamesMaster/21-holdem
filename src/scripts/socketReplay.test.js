/* global describe, test, expect, jest */
import { getUnhandledReplayEvents, replaySocketEvents } from './socketReplay';
import { SOCKET_RESPONSE_EVENTS } from './socketEvents';

const createScene = () => ({
    waitingForGameStart: jest.fn(),
    setPlayerTurn: jest.fn(),
    setDeclareResult: jest.fn(),
});

describe('socketReplay', () => {
    test('replays ordered socket events through the receive router', () => {
        const scene = createScene();
        const events = [
            { sEventName: SOCKET_RESPONSE_EVENTS.INITIALIZE_GAME, oData: { nInitializeTimer: 1000 } },
            { sEventName: SOCKET_RESPONSE_EVENTS.PLAYER_TURN, oData: { iUserId: 'u1' } },
            { sEventName: SOCKET_RESPONSE_EVENTS.DECLARE_RESULT, oData: { nRoundStartsIn: 10000 } },
        ];

        const results = replaySocketEvents(scene, events);

        expect(results).toEqual([
            { index: 0, eventName: SOCKET_RESPONSE_EVENTS.INITIALIZE_GAME, handled: true },
            { index: 1, eventName: SOCKET_RESPONSE_EVENTS.PLAYER_TURN, handled: true },
            { index: 2, eventName: SOCKET_RESPONSE_EVENTS.DECLARE_RESULT, handled: true },
        ]);
        expect(scene.waitingForGameStart).toHaveBeenCalledWith({ nInitializeTimer: 1000 });
        expect(scene.setPlayerTurn).toHaveBeenCalledWith({ iUserId: 'u1' });
        expect(scene.setDeclareResult).toHaveBeenCalledWith({ nRoundStartsIn: 10000 });
    });

    test('records unhandled events for replay diagnostics', () => {
        const scene = createScene();
        const results = replaySocketEvents(scene, [
            { sEventName: SOCKET_RESPONSE_EVENTS.PLAYER_TURN, oData: {} },
            { sEventName: 'unknownEvent', oData: {} },
        ]);

        expect(getUnhandledReplayEvents(results)).toEqual([
            { index: 1, eventName: 'unknownEvent', handled: false },
        ]);
    });

    test('handles non-array replay input', () => {
        expect(replaySocketEvents(createScene(), null)).toEqual([]);
        expect(getUnhandledReplayEvents(null)).toEqual([]);
    });
});
