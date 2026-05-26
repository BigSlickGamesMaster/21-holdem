/**
 * SocketManager — WebSocket bridge between client and game server.
 * - Connects on construction, joins the board, starts a ping loop.
 * - emit(): sends player actions (fold, call, raise, etc.).
 * - onReceive(): routes incoming server events to Level scene handlers.
 * - Event names and payload keys must match the server exactly.
 */

import io from 'socket.io-client';
import { getApiRoot } from '../axios';
import { SOCKET_REQUEST_EVENTS, SOCKET_TRANSPORT_EVENTS } from './socketEvents';
import { routeSocketEventToScene } from './socketReceiveRouter';
import { routeSocketCallbackToScene } from './socketCallbackRouter';
import CleanupRegistry from './CleanupRegistry';

export default class SocketManager {
    // scene: Level instance. options: { sAuthToken, iBoardId }.
    constructor(oScene, { sAuthToken, iBoardId }) {
        this.oScene = oScene;
        this.sRoot = getApiRoot();
        this.sAuthToken = sAuthToken;
        this.iBoardId = iBoardId;
        this.cleanupRegistry = new CleanupRegistry();
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
        this.cleanupRegistry.addInterval(this.pingInterval);
        this.cleanupRegistry.add(() => {
            if (!this.socket) return;
            this.socket.removeAllListeners();
            this.socket.disconnect();
        });
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
        routeSocketEventToScene(this.oScene, data);
    }
    onCallBackReceive(sEventName, response, error) {
        routeSocketCallbackToScene(this.oScene, sEventName, response, error);
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
        this.cleanupRegistry?.cleanup();
        this.pingInterval = null;
    }
}
