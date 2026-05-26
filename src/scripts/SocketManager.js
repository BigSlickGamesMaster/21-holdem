/**
 * SocketManager — WebSocket bridge between client and game server.
 * - Connects on construction, joins the board, starts a ping loop.
 * - emit(): sends player actions (fold, call, raise, etc.).
 * - onReceive(): routes incoming server events to Level scene handlers.
 * - Event names and payload keys must match the server exactly.
 */

import io from 'socket.io-client';
import { getApiRoot } from '../axios';
import { SOCKET_REQUEST_EVENTS, SOCKET_RESPONSE_EVENTS, SOCKET_TRANSPORT_EVENTS } from './socketEvents';

export default class SocketManager {
    // scene: Level instance. options: { sAuthToken, iBoardId }.
    constructor(oScene, { sAuthToken, iBoardId }) {
        this.oScene = oScene;
        this.sRoot = getApiRoot();
        this.sAuthToken = sAuthToken;
        this.iBoardId = iBoardId;
        this.socket = io(this.sRoot, {
            transports: ["websocket", "polling"],
            forceNew: true,
            query: {
                authorization: this.sAuthToken,
            },
        });

        this.socket.on(SOCKET_TRANSPORT_EVENTS.CONNECT, () => {
            this.sRootSocket = this.socket.id;
        });
        this.socket.on(SOCKET_TRANSPORT_EVENTS.DISCONNECT, () => {});
        this.socket.on(SOCKET_TRANSPORT_EVENTS.RECONNECT, () => {});
        this.socket.on(SOCKET_TRANSPORT_EVENTS.CONNECT_ERROR, (error) => {
            console.error("Socket connect_error:", error?.message || error);
        });
        this.socket.on(this.iBoardId, (data) => {
            try {
                this.onReceive(data);
            } catch (error) {
                console.error("Error while receiving data:", error);
            }
        });

        this.socket.emit(SOCKET_REQUEST_EVENTS.JOIN_BOARD, { iBoardId: this.iBoardId }, (data) => {
            if (data.error && data.error.code == 404) {
                this.oScene.exitGame();
            } else {
                this.onReqJoinBoard(data.oData);
            }
        });
        this.reqPingCheck();
        this.pingInterval = setInterval(() => this.reqPingCheck(), 1000);
    }
    emit(sEventName, oData = {}, callback) {
        this.socket.emit(this.iBoardId, { sEventName, oData }, (error, response) => {
            this.onCallBackReceive(sEventName, response, error);
            if (typeof callback === 'function') callback(error, response);
        });
    };
    onReqJoinBoard(callback) {
        if (callback.bGameIsFinished) {
            this.oScene.kickOut({ title: 'LEAVE TABLE', message: callback.messages });
            return;
        }
        this.oScene.oBoard = callback.oData;
        this.oScene.setGameData(callback);
    }
    onReceive(data) {
        switch (data.sEventName) {
            case SOCKET_RESPONSE_EVENTS.INITIALIZE_GAME:
                this.oScene.waitingForGameStart(data.oData);
                break;
            case SOCKET_RESPONSE_EVENTS.USER_JOINED:
                this.oScene.setUserJoined(data.oData);
                break;
            case SOCKET_RESPONSE_EVENTS.BOARD_STATE:
                this.oScene.setBoardState(data.oData);
                break;
            case SOCKET_RESPONSE_EVENTS.COLLECT_BOOT_AMOUNT:
                this.oScene.setCollectBootAmount(data.oData);
                break;
            case SOCKET_RESPONSE_EVENTS.COMMUNITY_CARD:
                this.oScene.handleCommunityCard(data.oData);
                break;
            case SOCKET_RESPONSE_EVENTS.CLEAR_BETTING_LABELS:
                this.oScene.handleClearBettingLabels();
                break;
            case SOCKET_RESPONSE_EVENTS.CARD_HAND:
                this.oScene.setCardHand(data.oData);
                break;
            case SOCKET_RESPONSE_EVENTS.PLAYER_TURN:
                this.oScene.setPlayerTurn(data.oData);
                break;
            case SOCKET_RESPONSE_EVENTS.PLAYER_LEFT:
                this.oScene.setPlayerLeft(data.oData);
                break;
            case SOCKET_RESPONSE_EVENTS.TURN_MISSED:
                this.oScene.resetTurnTimer();
                break;
            case SOCKET_RESPONSE_EVENTS.FOLD_PLAYER:
                this.oScene.setFoldPlayer(data.oData.iUserId, data.oData.oLeave.eBehaviour, data.oData.oLeave.sReason, data.oData.oLeave.bShowMessage);
                break;
            case SOCKET_RESPONSE_EVENTS.DECLARE_RESULT:
                this.oScene.setDeclareResult(data.oData);
                break;
            case SOCKET_RESPONSE_EVENTS.KICK_OUT:
                this.oScene.kickOut({ title: 'LEAVE TABLE', message: 'Oops! Not enough players joined.' });
                break;
            case SOCKET_RESPONSE_EVENTS.REFUND_ON_LONG_WAIT:
                this.oScene.setRefundOnLongWait(data.oData);
                break;
            case SOCKET_RESPONSE_EVENTS.CALL:
            case SOCKET_RESPONSE_EVENTS.CHECK:
            case SOCKET_RESPONSE_EVENTS.RAISE:
            case SOCKET_RESPONSE_EVENTS.STAND:
                this.oScene.handlePlayerBet(data.oData, data.sEventName);
                break;
            case SOCKET_RESPONSE_EVENTS.DOUBLE_DOWN:
                this.oScene.handleDoubleDown(data.oData, data.sEventName);
                break;
            case SOCKET_RESPONSE_EVENTS.REACTION:
                this.oScene.handleResReaction?.(data.oData);
                break;
            case SOCKET_RESPONSE_EVENTS.SIDE_BETS:
                this.oScene.handleSideBetsState?.(data.oData);
                break;
            case SOCKET_RESPONSE_EVENTS.DISCONNECT:
                this.oScene.exitGame();
                break;
            default:
                break;
        }
    }
    onCallBackReceive(sEventName, response, error) {
        if (response && response.message) {
            this.oScene.handleActionError?.(sEventName, response.message);
            return;
        }
        switch (sEventName) {
            case SOCKET_REQUEST_EVENTS.LEAVE:
                this.oScene.prompt.showForSeconds(error.error);
                break;
            case SOCKET_REQUEST_EVENTS.CALL:
                this.oScene.handleActionError?.(SOCKET_REQUEST_EVENTS.CALL, error.error);
                break;
            case SOCKET_REQUEST_EVENTS.RAISE:
                this.oScene.handleActionError?.(SOCKET_REQUEST_EVENTS.RAISE, error.error);
                break;
            case SOCKET_REQUEST_EVENTS.DOUBLE_DOWN:
                this.oScene.handleActionError?.(SOCKET_REQUEST_EVENTS.DOUBLE_DOWN, error.error);
                break;
            case SOCKET_REQUEST_EVENTS.SIDE_BETS:
                if (error?.error) this.oScene.handleActionError?.(SOCKET_REQUEST_EVENTS.SIDE_BETS, error.error);
                break;
            default:
                break;
        }
    }
    reqPingCheck() {
        const startTime = Date.now();
        this.socket.emit(SOCKET_TRANSPORT_EVENTS.PING, {}, () => {
            const endTime = Date.now();
            const pingTime = endTime - startTime;
            this.oScene.setPing(pingTime);
        });
    }
    destroy() {
        this.pingInterval && clearInterval(this.pingInterval);
        if (!this.socket) return;
        this.socket.removeAllListeners();
        this.socket.disconnect();
    }
}
