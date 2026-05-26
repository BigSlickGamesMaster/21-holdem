import { SOCKET_REQUEST_EVENTS } from './socketEvents';

export function routeSocketCallbackToScene(oScene, sEventName, response, error) {
    if (!oScene) return false;

    if (response?.message) {
        oScene.handleActionError?.(sEventName, response.message);
        return true;
    }

    switch (sEventName) {
        case SOCKET_REQUEST_EVENTS.LEAVE:
            oScene.prompt.showForSeconds(error.error);
            return true;
        case SOCKET_REQUEST_EVENTS.CALL:
            oScene.handleActionError?.(SOCKET_REQUEST_EVENTS.CALL, error.error);
            return true;
        case SOCKET_REQUEST_EVENTS.RAISE:
            oScene.handleActionError?.(SOCKET_REQUEST_EVENTS.RAISE, error.error);
            return true;
        case SOCKET_REQUEST_EVENTS.DOUBLE_DOWN:
            oScene.handleActionError?.(SOCKET_REQUEST_EVENTS.DOUBLE_DOWN, error.error);
            return true;
        case SOCKET_REQUEST_EVENTS.SIDE_BETS:
            if (error?.error) oScene.handleActionError?.(SOCKET_REQUEST_EVENTS.SIDE_BETS, error.error);
            return true;
        default:
            return false;
    }
}
