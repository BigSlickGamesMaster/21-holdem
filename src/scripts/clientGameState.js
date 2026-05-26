import { normalizeBoardSnapshot } from './boardSnapshot';
import { normalizeParticipants } from './participantState';

export const CLIENT_GAME_STATE_ACTIONS = Object.freeze({
    APPLY_BOARD_SNAPSHOT: 'applyBoardSnapshot',
    APPLY_PARTICIPANT_PATCH: 'applyParticipantPatch',
    SET_TABLE_CHIPS: 'setTableChips',
    SET_TURN_ACTION_STATE: 'setTurnActionState',
    SET_PARTICIPANT_HAND_SCORE: 'setParticipantHandScore',
    SET_PARTICIPANT_STATUS: 'setParticipantStatus',
    SET_COMMUNITY_CARDS: 'setCommunityCards',
});

export function createInitialClientGameState() {
    return {
        board: {
            iDealerId: '',
            iBigBlindId: '',
            iSmallBlindId: '',
            nTableChips: 0,
            nMaxPlayer: 0,
            nMinBet: 0,
            nTableRound: 1,
            eState: '',
            oSetting: null,
            oGameInfo: null,
            oTutorial: null,
            aCommunityCard: [],
        },
        participantsById: {},
        participantOrder: [],
        turn: {
            iUserId: '',
            isLocalTurn: false,
            context: null,
            actionState: null,
        },
    };
}

export function applyBoardSnapshotToClientState(state = createInitialClientGameState(), payload = {}) {
    const snapshot = normalizeBoardSnapshot(payload, state.board);
    const participants = normalizeParticipants(snapshot.aParticipant);
    const participantsById = participants.reduce((nextParticipants, participant) => {
        if (participant?.iUserId === undefined || participant?.iUserId === null) return nextParticipants;
        nextParticipants[String(participant.iUserId)] = participant;
        return nextParticipants;
    }, {});

    return {
        ...state,
        board: {
            iDealerId: snapshot.iDealerId,
            iBigBlindId: snapshot.iBigBlindId,
            iSmallBlindId: snapshot.iSmallBlindId,
            nTableChips: snapshot.nTableChips,
            nMaxPlayer: snapshot.nMaxPlayer,
            nMinBet: snapshot.nMinBet,
            nTableRound: snapshot.nTableRound,
            eState: snapshot.eState,
            oSetting: snapshot.oSetting,
            oGameInfo: snapshot.oGameInfo,
            oTutorial: snapshot.oTutorial,
            aCommunityCard: snapshot.aCommunityCard,
        },
        participantsById,
        participantOrder: participants
            .map((participant) => participant?.iUserId)
            .filter((iUserId) => iUserId !== undefined && iUserId !== null)
            .map((iUserId) => String(iUserId)),
    };
}

export function applyParticipantPatchToClientState(state = createInitialClientGameState(), participantPatch = {}) {
    if (!participantPatch || participantPatch.iUserId === undefined || participantPatch.iUserId === null) {
        return state;
    }

    const participantId = String(participantPatch.iUserId);
    const previousParticipant = state.participantsById?.[participantId] || {};
    const participantsById = {
        ...(state.participantsById || {}),
        [participantId]: {
            ...previousParticipant,
            ...participantPatch,
        },
    };
    const participantOrder = Array.isArray(state.participantOrder) && state.participantOrder.includes(participantId)
        ? state.participantOrder
        : [...(state.participantOrder || []), participantId];

    return {
        ...state,
        participantsById,
        participantOrder,
    };
}

export function setTableChipsInClientState(state = createInitialClientGameState(), nTableChips = 0) {
    return {
        ...state,
        board: {
            ...(state.board || createInitialClientGameState().board),
            nTableChips: Math.max(0, Number(nTableChips) || 0),
        },
    };
}

export function setTurnActionStateInClientState(state = createInitialClientGameState(), payload = {}) {
    const source = payload && typeof payload === 'object' ? payload : {};

    return {
        ...state,
        turn: {
            iUserId: source.iUserId ?? state.turn?.iUserId ?? '',
            isLocalTurn: Boolean(source.isLocalTurn),
            context: source.context || null,
            actionState: source.actionState || null,
        },
    };
}

export function setParticipantHandScoreInClientState(state = createInitialClientGameState(), payload = {}) {
    const source = payload && typeof payload === 'object' ? payload : {};
    if (source.iUserId === undefined || source.iUserId === null) return state;

    const participantId = String(source.iUserId);
    const previousParticipant = state.participantsById?.[participantId] || { iUserId: source.iUserId };
    const nextParticipant = {
        ...previousParticipant,
    };

    if (Array.isArray(source.aCardHand)) nextParticipant.aCardHand = source.aCardHand;
    if (source.nCardScore !== undefined) nextParticipant.nCardScore = Number(source.nCardScore) || 0;

    return {
        ...state,
        participantsById: {
            ...(state.participantsById || {}),
            [participantId]: nextParticipant,
        },
        participantOrder: Array.isArray(state.participantOrder) && state.participantOrder.includes(participantId)
            ? state.participantOrder
            : [...(state.participantOrder || []), participantId],
    };
}

export function setParticipantStatusInClientState(state = createInitialClientGameState(), payload = {}) {
    const source = payload && typeof payload === 'object' ? payload : {};
    if (source.iUserId === undefined || source.iUserId === null) return state;

    return applyParticipantPatchToClientState(state, {
        iUserId: source.iUserId,
        eState: source.eState,
        eBehaviour: source.eBehaviour,
        sReason: source.sReason,
        bShowMessage: source.bShowMessage,
    });
}

export function setCommunityCardsInClientState(state = createInitialClientGameState(), aCommunityCard = []) {
    return {
        ...state,
        board: {
            ...(state.board || createInitialClientGameState().board),
            aCommunityCard: Array.isArray(aCommunityCard) ? aCommunityCard : [],
        },
    };
}

export function clientGameStateReducer(state = createInitialClientGameState(), action = {}) {
    switch (action.type) {
        case CLIENT_GAME_STATE_ACTIONS.APPLY_BOARD_SNAPSHOT:
            return applyBoardSnapshotToClientState(state, action.payload);
        case CLIENT_GAME_STATE_ACTIONS.APPLY_PARTICIPANT_PATCH:
            return applyParticipantPatchToClientState(state, action.payload);
        case CLIENT_GAME_STATE_ACTIONS.SET_TABLE_CHIPS:
            return setTableChipsInClientState(state, action.payload?.nTableChips);
        case CLIENT_GAME_STATE_ACTIONS.SET_TURN_ACTION_STATE:
            return setTurnActionStateInClientState(state, action.payload);
        case CLIENT_GAME_STATE_ACTIONS.SET_PARTICIPANT_HAND_SCORE:
            return setParticipantHandScoreInClientState(state, action.payload);
        case CLIENT_GAME_STATE_ACTIONS.SET_PARTICIPANT_STATUS:
            return setParticipantStatusInClientState(state, action.payload);
        case CLIENT_GAME_STATE_ACTIONS.SET_COMMUNITY_CARDS:
            return setCommunityCardsInClientState(state, action.payload?.aCommunityCard);
        default:
            return state;
    }
}
