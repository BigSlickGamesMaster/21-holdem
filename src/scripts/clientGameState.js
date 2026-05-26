import { normalizeBoardSnapshot } from './boardSnapshot';
import { normalizeParticipants } from './participantState';

export const CLIENT_GAME_STATE_ACTIONS = Object.freeze({
    APPLY_BOARD_SNAPSHOT: 'applyBoardSnapshot',
    APPLY_PARTICIPANT_PATCH: 'applyParticipantPatch',
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

export function clientGameStateReducer(state = createInitialClientGameState(), action = {}) {
    switch (action.type) {
        case CLIENT_GAME_STATE_ACTIONS.APPLY_BOARD_SNAPSHOT:
            return applyBoardSnapshotToClientState(state, action.payload);
        case CLIENT_GAME_STATE_ACTIONS.APPLY_PARTICIPANT_PATCH:
            return applyParticipantPatchToClientState(state, action.payload);
        default:
            return state;
    }
}
