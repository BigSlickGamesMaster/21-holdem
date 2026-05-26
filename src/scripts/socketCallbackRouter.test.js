/* global describe, test, expect, jest */
import { routeSocketCallbackToScene } from './socketCallbackRouter';
import { SOCKET_REQUEST_EVENTS } from './socketEvents';

const createScene = () => ({
    handleActionError: jest.fn(),
    prompt: {
        showForSeconds: jest.fn(),
    },
});

describe('socketCallbackRouter', () => {
    test('routes response message to action error before event-specific handling', () => {
        const scene = createScene();

        expect(routeSocketCallbackToScene(scene, SOCKET_REQUEST_EVENTS.RAISE, { message: 'Too low' }, { error: 'ignored' })).toBe(true);
        expect(scene.handleActionError).toHaveBeenCalledWith(SOCKET_REQUEST_EVENTS.RAISE, 'Too low');
        expect(scene.prompt.showForSeconds).not.toHaveBeenCalled();
    });

    test('routes leave callback error to prompt', () => {
        const scene = createScene();

        expect(routeSocketCallbackToScene(scene, SOCKET_REQUEST_EVENTS.LEAVE, null, { error: 'Cannot leave' })).toBe(true);
        expect(scene.prompt.showForSeconds).toHaveBeenCalledWith('Cannot leave');
    });

    test('routes action callback errors to scene error handler', () => {
        const scene = createScene();

        routeSocketCallbackToScene(scene, SOCKET_REQUEST_EVENTS.CALL, null, { error: 'Call failed' });
        routeSocketCallbackToScene(scene, SOCKET_REQUEST_EVENTS.RAISE, null, { error: 'Raise failed' });
        routeSocketCallbackToScene(scene, SOCKET_REQUEST_EVENTS.DOUBLE_DOWN, null, { error: 'DD failed' });

        expect(scene.handleActionError).toHaveBeenCalledWith(SOCKET_REQUEST_EVENTS.CALL, 'Call failed');
        expect(scene.handleActionError).toHaveBeenCalledWith(SOCKET_REQUEST_EVENTS.RAISE, 'Raise failed');
        expect(scene.handleActionError).toHaveBeenCalledWith(SOCKET_REQUEST_EVENTS.DOUBLE_DOWN, 'DD failed');
    });

    test('routes side bet error only when error text exists', () => {
        const scene = createScene();

        expect(routeSocketCallbackToScene(scene, SOCKET_REQUEST_EVENTS.SIDE_BETS, null, {})).toBe(true);
        expect(scene.handleActionError).not.toHaveBeenCalled();

        routeSocketCallbackToScene(scene, SOCKET_REQUEST_EVENTS.SIDE_BETS, null, { error: 'Side bet failed' });
        expect(scene.handleActionError).toHaveBeenCalledWith(SOCKET_REQUEST_EVENTS.SIDE_BETS, 'Side bet failed');
    });

    test('returns false for unknown events or missing scene', () => {
        expect(routeSocketCallbackToScene(createScene(), 'unknown', null, {})).toBe(false);
        expect(routeSocketCallbackToScene(null, SOCKET_REQUEST_EVENTS.CALL, null, {})).toBe(false);
    });
});
