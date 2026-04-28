/**
 * ======================================================================
 * SocketManager.js - BEGINNER FRIENDLY GUIDE (CLIENT <-> SERVER)
 * ======================================================================
 *
 * This file is the "phone line" to your backend.
 *
 * Two main jobs:
 * 1) SEND requests when the player clicks buttons:
 *    - example: reqCall(), reqRaise(), reqDoubleDown()
 *
 * 2) RECEIVE server updates (socket.on):
 *    - example: server says "player X raised" -> update UI in Level
 *
 * --------------------------------------------------------------
 * How to safely edit as a beginner
 * --------------------------------------------------------------
 * You can:
 * - add console.log inside handlers to see payloads
 * - change which Level method is called (IF you know the method exists)
 *
 * Be careful:
 * - event names MUST match server exactly
 * - payload keys MUST match server (iUserId, nChips, etc.)
 *
 * If you break socket names, the game won't update, but it may not crash -
 * it'll just "feel stuck". That's why this file is important.
 * ======================================================================
 */

import io from 'socket.io-client';
import { getApiRoot } from '../axios';

export default class SocketManager {
    // --------------------------------------------------------------
    // constructor(scene, options)
    // - scene: the Level scene (so we can call scene.setX(...) on events)
    // - options: auth token / board id used to join the correct table
    // --------------------------------------------------------------
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
            case 'resSplit':
                this.oScene.handleSplit(data.oData);
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
