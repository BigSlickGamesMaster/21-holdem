import { SOCKET_RESPONSE_EVENTS } from './socketEvents';

export function routeSocketEventToScene(oScene, data = {}) {
    if (!oScene || !data?.sEventName) return false;

    switch (data.sEventName) {
        case SOCKET_RESPONSE_EVENTS.INITIALIZE_GAME:
            oScene.waitingForGameStart(data.oData);
            return true;
        case SOCKET_RESPONSE_EVENTS.USER_JOINED:
            oScene.setUserJoined(data.oData);
            return true;
        case SOCKET_RESPONSE_EVENTS.BOARD_STATE:
            oScene.setBoardState(data.oData);
            return true;
        case SOCKET_RESPONSE_EVENTS.COLLECT_BOOT_AMOUNT:
            oScene.setCollectBootAmount(data.oData);
            return true;
        case SOCKET_RESPONSE_EVENTS.COMMUNITY_CARD:
            oScene.handleCommunityCard(data.oData);
            return true;
        case SOCKET_RESPONSE_EVENTS.CLEAR_BETTING_LABELS:
            oScene.handleClearBettingLabels();
            return true;
        case SOCKET_RESPONSE_EVENTS.CARD_HAND:
            oScene.setCardHand(data.oData);
            return true;
        case SOCKET_RESPONSE_EVENTS.PLAYER_TURN:
            oScene.setPlayerTurn(data.oData);
            return true;
        case SOCKET_RESPONSE_EVENTS.PLAYER_LEFT:
            oScene.setPlayerLeft(data.oData);
            return true;
        case SOCKET_RESPONSE_EVENTS.TURN_MISSED:
            oScene.resetTurnTimer();
            return true;
        case SOCKET_RESPONSE_EVENTS.FOLD_PLAYER:
            oScene.setFoldPlayer(
                data.oData.iUserId,
                data.oData.oLeave.eBehaviour,
                data.oData.oLeave.sReason,
                data.oData.oLeave.bShowMessage
            );
            return true;
        case SOCKET_RESPONSE_EVENTS.DECLARE_RESULT:
            oScene.setDeclareResult(data.oData);
            return true;
        case SOCKET_RESPONSE_EVENTS.KICK_OUT:
            oScene.kickOut({ title: 'LEAVE TABLE', message: 'Oops! Not enough players joined.' });
            return true;
        case SOCKET_RESPONSE_EVENTS.REFUND_ON_LONG_WAIT:
            oScene.setRefundOnLongWait(data.oData);
            return true;
        case SOCKET_RESPONSE_EVENTS.CALL:
        case SOCKET_RESPONSE_EVENTS.CHECK:
        case SOCKET_RESPONSE_EVENTS.RAISE:
        case SOCKET_RESPONSE_EVENTS.STAND:
            oScene.handlePlayerBet(data.oData, data.sEventName);
            return true;
        case SOCKET_RESPONSE_EVENTS.DOUBLE_DOWN:
            oScene.handleDoubleDown(data.oData, data.sEventName);
            return true;
        case SOCKET_RESPONSE_EVENTS.REACTION:
            oScene.handleResReaction?.(data.oData);
            return true;
        case SOCKET_RESPONSE_EVENTS.SIDE_BETS:
            oScene.handleSideBetsState?.(data.oData);
            return true;
        case SOCKET_RESPONSE_EVENTS.DISCONNECT:
            oScene.exitGame();
            return true;
        default:
            return false;
    }
}
