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

export default class SocketManager {
    // --------------------------------------------------------------
    // constructor(scene, options)
    // - scene: the Level scene (so we can call scene.setX(...) on events)
    // - options: auth token / board id used to join the correct table
    // --------------------------------------------------------------
    constructor(oScene, { sAuthToken, iBoardId }) {
        this.oScene = oScene;
        this.sRoot = process.env.REACT_APP_API_ENDPOINT;
        this.sAuthToken = sAuthToken;
        this.iBoardId = iBoardId;
        console.log(sAuthToken);
        this.socket = io(this.sRoot, {
            transports: ["websocket", "polling"],
            forceNew: true,
            query: {
                authorization: this.sAuthToken,
            },
        });

        this.socket.on("connect", () => {
            this.sRootSocket = this.socket.id;
            console.log("Connected to Socket :: ", this.socket.id);
        });
        this.socket.on("disconnect", () => {
            console.log("Disconnected from Socket");
        });
        this.socket.on("reconnect", () => {
            console.log("Reconnected to Socket");
        });
        this.socket.on("connect_error", () => {
            // console.error("Error while connecting to the server:", error);
        });
        this.socket.on(this.iBoardId, (data) => {
            try {
                this.onReceive(data);
            } catch (error) {
                console.error("Error while receiving data:", error);
            }
        });

        console.log(`%c reqJoinBoard`, 'color: #64C3EB', { iBoardId: this.iBoardId });
        this.socket.emit("reqJoinBoard", { iBoardId: this.iBoardId }, (data) => {
            if (data.error && data.error.code == 404) {
                console.log(data);
                this.oScene.exitGame();
            } else {
                this.onReqJoinBoard(data.oData);
            }
        });
        this.reqPingCheck();
        this.pingInterval = setInterval(() => this.reqPingCheck(), 1000);
    }
    emit(sEventName, oData = {}, callback) {
        console.log(`%c ${sEventName}`, 'color: #64C3EB', oData);
        this.socket.emit(this.iBoardId, { sEventName, oData }, (error, response) => {
            this.onCallBackReceive(sEventName, response, error);
        });
    };
    onReqJoinBoard(callback) {
        console.log(`%c callback`, 'color: #5BB381', callback);
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
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.waitingForGameStart(data.oData);
                break;

            case 'resUserJoined':
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.setUserJoined(data.oData);
                break;

            case 'resBoardState':
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.setBoardState(data.oData);
                break;

            case 'resCollectBootAmount':
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.setCollectBootAmount(data.oData);
                break;

            case 'resCommunityCard':
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.handleCommunityCard(data.oData);
                break;

            case 'resClearBettingLabels':
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.handleClearBettingLabels();
                break;

            case 'resCardHand':
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.setCardHand(data.oData);
                break;

            case 'resPlayerTurn':
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.setPlayerTurn(data.oData);
                break;

            case 'resPlayerLeft':
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.setPlayerLeft(data.oData);
                break;

            case 'resTurnMissed':
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.resetTurnTimer();
                break;

            case 'resFoldPlayer':
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.setFoldPlayer(data.oData.iUserId, data.oData.oLeave.eBehaviour, data.oData.oLeave.sReason, data.oData.oLeave.bShowMessage);
                break;

            case 'resDeclareResult':
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.setDeclareResult(data.oData);
                break;

            case 'resKickOut':
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.kickOut({ title: 'LEAVE TABLE', message: 'Oops! Not enough players joined.' });
                break;

            case 'resRefundOnLongWait':
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.setRefundOnLongWait(data.oData);
                break;

            case 'resCall':
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.handlePlayerBet(data.oData, data.sEventName);
                break;

            case 'resCheck':
                this.oScene.handlePlayerBet(data.oData, data.sEventName);
                break;

            case 'resRaise':
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.handlePlayerBet(data.oData, data.sEventName);
                break;

            case 'resDoubledown':
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.handleDoubleDown(data.oData, data.sEventName);
                break;

            case 'resStand':
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.handlePlayerBet(data.oData, data.sEventName);
                break;

            case 'disconnect':
                console.log(`%c ${data.sEventName}`, 'color: #5BB381', data);
                this.oScene.exitGame();
                break;

            default:
                console.log(`%c ${data.sEventName} :: `, 'color: #CE375C', data);
                break;
        }
    }
    onCallBackReceive(sEventName, response, error) {
        if (response && response.message) {
            console.log(`%c ${sEventName}`, 'color: #5BB381', response);
            this.oScene.prompt.showForSeconds(response.message);
            return;
        }
        switch (sEventName) {
            case 'reqLeave':
                console.log('%c reqLeave', 'color: #5BB381', response);
                this.oScene.prompt.showForSeconds(error.error);
                break;

            case 'reqCall':
                console.log('%c reqCall', 'color: #5BB381', response, error);
                this.oScene.prompt.showForSeconds(error.error);
                break;

            case 'reqRaise':
                console.log('%c reqRaise', 'color: #5BB381', response, error);
                this.oScene.prompt.showForSeconds(error.error);
                break;

            case 'reqDoubleDown':
                console.log('%c reqDoubleDown', 'color: #5BB381', response, error);
                this.oScene.prompt.showForSeconds(error.error);
                break;

            default:
                console.log(`%c ${sEventName} callback`, 'color: #CE375C', response, error);
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
