import {
    CLIENT_GAME_STATE_ACTIONS,
    clientGameStateReducer,
} from './clientGameState';
import { SOCKET_RESPONSE_EVENTS } from './socketEvents';

export function reduceSocketEventToClientState(state, event = {}, options = {}) {
    const localUserId = options?.localUserId;
    const oData = event?.oData || {};

    switch (event?.sEventName) {
        case SOCKET_RESPONSE_EVENTS.BOARD_STATE:
        case SOCKET_RESPONSE_EVENTS.INITIALIZE_GAME:
            return clientGameStateReducer(state, {
                type: CLIENT_GAME_STATE_ACTIONS.APPLY_BOARD_SNAPSHOT,
                payload: oData,
            });
        case SOCKET_RESPONSE_EVENTS.USER_JOINED:
            return clientGameStateReducer(state, {
                type: CLIENT_GAME_STATE_ACTIONS.APPLY_PARTICIPANT_PATCH,
                payload: oData,
            });
        case SOCKET_RESPONSE_EVENTS.CARD_HAND:
            return clientGameStateReducer(state, {
                type: CLIENT_GAME_STATE_ACTIONS.SET_PARTICIPANT_HAND_SCORE,
                payload: {
                    iUserId: localUserId,
                    aCardHand: oData.aCardHand,
                    nCardScore: oData.nCardScore,
                },
            });
        case SOCKET_RESPONSE_EVENTS.COMMUNITY_CARD: {
            let nextState = clientGameStateReducer(state, {
                type: CLIENT_GAME_STATE_ACTIONS.SET_COMMUNITY_CARDS,
                payload: { aCommunityCard: oData.aCommunityCard },
            });
            if (Array.isArray(oData.aParticipant)) {
                oData.aParticipant.forEach((participant) => {
                    nextState = clientGameStateReducer(nextState, {
                        type: CLIENT_GAME_STATE_ACTIONS.APPLY_PARTICIPANT_PATCH,
                        payload: participant,
                    });
                    if (Array.isArray(participant?.aCardHand) || participant?.nCardScore !== undefined) {
                        nextState = clientGameStateReducer(nextState, {
                            type: CLIENT_GAME_STATE_ACTIONS.SET_PARTICIPANT_HAND_SCORE,
                            payload: participant,
                        });
                    }
                });
            }
            return nextState;
        }
        case SOCKET_RESPONSE_EVENTS.FOLD_PLAYER:
            return clientGameStateReducer(state, {
                type: CLIENT_GAME_STATE_ACTIONS.SET_PARTICIPANT_STATUS,
                payload: {
                    iUserId: oData.iUserId,
                    eState: 'fold',
                    eBehaviour: oData.oLeave?.eBehaviour,
                    sReason: oData.oLeave?.sReason,
                    bShowMessage: oData.oLeave?.bShowMessage,
                },
            });
        case SOCKET_RESPONSE_EVENTS.CALL:
        case SOCKET_RESPONSE_EVENTS.RAISE:
        case SOCKET_RESPONSE_EVENTS.CHECK:
        case SOCKET_RESPONSE_EVENTS.STAND:
        case SOCKET_RESPONSE_EVENTS.DOUBLE_DOWN: {
            let nextState = state;
            if (oData.iUserId !== undefined && oData.iUserId !== null) {
                nextState = clientGameStateReducer(nextState, {
                    type: CLIENT_GAME_STATE_ACTIONS.APPLY_PARTICIPANT_PATCH,
                    payload: oData,
                });
            }
            if (oData.nTableChips !== undefined) {
                nextState = clientGameStateReducer(nextState, {
                    type: CLIENT_GAME_STATE_ACTIONS.SET_TABLE_CHIPS,
                    payload: { nTableChips: oData.nTableChips },
                });
            }
            if (Array.isArray(oData.aCardHand) || oData.nCardScore !== undefined) {
                nextState = clientGameStateReducer(nextState, {
                    type: CLIENT_GAME_STATE_ACTIONS.SET_PARTICIPANT_HAND_SCORE,
                    payload: {
                        iUserId: oData.iUserId,
                        aCardHand: oData.aCardHand,
                        nCardScore: oData.nCardScore,
                    },
                });
            }
            return nextState;
        }
        default:
            return state;
    }
}

export function replaySocketEventsToClientState(initialState, events = [], options = {}) {
    const aEvents = Array.isArray(events) ? events : [];
    return aEvents.reduce(
        (state, event) => reduceSocketEventToClientState(state, event, options),
        initialState
    );
}
