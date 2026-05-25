/**
 * SocketManager — WebSocket bridge between client and game server.
 * - Connects on construction, joins the board, starts a ping loop.
 * - emit(): sends player actions (fold, call, raise, etc.).
 * - onReceive(): routes incoming server events to Level scene handlers.
 * - Event names and payload keys must match the server exactly.
 */

import io from 'socket.io-client';
import { getApiRoot } from '../axios';

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

        this.socket.on("connect", () => {
            this.sRootSocket = this.socket.id;
        });
        this.socket.on("disconnect", () => {});
        this.socket.on("reconnect", () => {});
        this.socket.on("connect_error", (error) => {
            console.error("Socket connect_error:", error?.message || error);
        });
        this.socket.on(this.iBoardId, (data) => {
            try {
                this.onReceive(data);
            } catch (error) {
                console.error("Error while receiving data:", error);
            }
        });

        this.socket.emit("reqJoinBoard", { iBoardId: this.iBoardId }, (data) => {
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
            case 'initializeGame':
                this.oScene.waitingForGameStart(data.oData);
                break;
            case 'resUserJoined':
                this.oScene.setUserJoined(data.oData);
                break;
            case 'resBoardState':
                this.oScene.setBoardState(data.oData);
                break;
            case 'resCollectBootAmount':
                this.oScene.setCollectBootAmount(data.oData);
                break;
            case 'resCommunityCard':
                this.oScene.handleCommunityCard(data.oData);
                break;
            case 'resClearBettingLabels':
                this.oScene.handleClearBettingLabels();
                break;
            case 'resCardHand':
                this.oScene.setCardHand(data.oData);
                break;
            case 'resPlayerTurn':
                this.oScene.setPlayerTurn(data.oData);
                break;
            case 'resPlayerLeft':
                this.oScene.setPlayerLeft(data.oData);
                break;
            case 'resTurnMissed':
                this.oScene.resetTurnTimer();
                break;
            case 'resFoldPlayer':
                this.oScene.setFoldPlayer(data.oData.iUserId, data.oData.oLeave.eBehaviour, data.oData.oLeave.sReason, data.oData.oLeave.bShowMessage);
                break;
            case 'resDeclareResult':
                this.oScene.setDeclareResult(data.oData);
                break;
            case 'resKickOut':
                this.oScene.kickOut({ title: 'LEAVE TABLE', message: 'Oops! Not enough players joined.' });
                break;
            case 'resRefundOnLongWait':
                this.oScene.setRefundOnLongWait(data.oData);
                break;
            case 'resCall':
            case 'resCheck':
            case 'resRaise':
            case 'resStand':
                this.oScene.handlePlayerBet(data.oData, data.sEventName);
                break;
            case 'resDoubledown':
                this.oScene.handleDoubleDown(data.oData, data.sEventName);
                break;
            case 'resReaction':
                this.oScene.handleResReaction?.(data.oData);
                break;
            case 'resSideBets':
                this.oScene.handleSideBetsState?.(data.oData);
                break;
            case 'disconnect':
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
            case 'reqLeave':
                this.oScene.prompt.showForSeconds(error.error);
                break;
            case 'reqCall':
                this.oScene.handleActionError?.('reqCall', error.error);
                break;
            case 'reqRaise':
                this.oScene.handleActionError?.('reqRaise', error.error);
                break;
            case 'reqDoubleDown':
                this.oScene.handleActionError?.('reqDoubleDown', error.error);
                break;
            case 'reqSideBets':
                if (error?.error) this.oScene.handleActionError?.('reqSideBets', error.error);
                break;
            default:
                break;
        }
    }
    reqPingCheck() {
        const startTime = Date.now();
        this.socket.emit("ping", {}, () => {
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
