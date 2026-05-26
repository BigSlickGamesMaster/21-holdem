/* global describe, test, expect, jest */
import { routeSocketEventToScene } from './socketReceiveRouter';
import { SOCKET_RESPONSE_EVENTS } from './socketEvents';

const createScene = () => ({
    waitingForGameStart: jest.fn(),
    setUserJoined: jest.fn(),
    setBoardState: jest.fn(),
    setCollectBootAmount: jest.fn(),
    handleCommunityCard: jest.fn(),
    handleClearBettingLabels: jest.fn(),
    setCardHand: jest.fn(),
    setPlayerTurn: jest.fn(),
    setPlayerLeft: jest.fn(),
    resetTurnTimer: jest.fn(),
    setFoldPlayer: jest.fn(),
    setDeclareResult: jest.fn(),
    kickOut: jest.fn(),
    setRefundOnLongWait: jest.fn(),
    handlePlayerBet: jest.fn(),
    handleDoubleDown: jest.fn(),
    handleResReaction: jest.fn(),
    handleSideBetsState: jest.fn(),
    exitGame: jest.fn(),
});

describe('socketReceiveRouter', () => {
    test('routes simple payload events to matching scene methods', () => {
        const scene = createScene();
        const payload = { value: 1 };

        expect(routeSocketEventToScene(scene, { sEventName: SOCKET_RESPONSE_EVENTS.PLAYER_TURN, oData: payload })).toBe(true);
        expect(scene.setPlayerTurn).toHaveBeenCalledWith(payload);

        expect(routeSocketEventToScene(scene, { sEventName: SOCKET_RESPONSE_EVENTS.CARD_HAND, oData: payload })).toBe(true);
        expect(scene.setCardHand).toHaveBeenCalledWith(payload);
    });

    test('routes clear betting labels without payload', () => {
        const scene = createScene();

        expect(routeSocketEventToScene(scene, { sEventName: SOCKET_RESPONSE_EVENTS.CLEAR_BETTING_LABELS })).toBe(true);
        expect(scene.handleClearBettingLabels).toHaveBeenCalledWith();
    });

    test('normalizes fold-player payload arguments', () => {
        const scene = createScene();

        routeSocketEventToScene(scene, {
            sEventName: SOCKET_RESPONSE_EVENTS.FOLD_PLAYER,
            oData: {
                iUserId: 'u1',
                oLeave: {
                    eBehaviour: 'fold',
                    sReason: 'left',
                    bShowMessage: true,
                },
            },
        });

        expect(scene.setFoldPlayer).toHaveBeenCalledWith('u1', 'fold', 'left', true);
    });

    test('passes bet and double-down response name through to scene handlers', () => {
        const scene = createScene();
        const payload = { nChips: 100 };

        routeSocketEventToScene(scene, { sEventName: SOCKET_RESPONSE_EVENTS.RAISE, oData: payload });
        expect(scene.handlePlayerBet).toHaveBeenCalledWith(payload, SOCKET_RESPONSE_EVENTS.RAISE);

        routeSocketEventToScene(scene, { sEventName: SOCKET_RESPONSE_EVENTS.DOUBLE_DOWN, oData: payload });
        expect(scene.handleDoubleDown).toHaveBeenCalledWith(payload, SOCKET_RESPONSE_EVENTS.DOUBLE_DOWN);
    });

    test('routes optional reaction and side-bet handlers', () => {
        const scene = createScene();
        const payload = { sEmoji: 'x' };

        routeSocketEventToScene(scene, { sEventName: SOCKET_RESPONSE_EVENTS.REACTION, oData: payload });
        expect(scene.handleResReaction).toHaveBeenCalledWith(payload);

        routeSocketEventToScene(scene, { sEventName: SOCKET_RESPONSE_EVENTS.SIDE_BETS, oData: payload });
        expect(scene.handleSideBetsState).toHaveBeenCalledWith(payload);
    });

    test('returns false for unknown or invalid events', () => {
        expect(routeSocketEventToScene(createScene(), { sEventName: 'unknown' })).toBe(false);
        expect(routeSocketEventToScene(createScene(), null)).toBe(false);
        expect(routeSocketEventToScene(null, { sEventName: SOCKET_RESPONSE_EVENTS.PLAYER_TURN })).toBe(false);
    });
});
