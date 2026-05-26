export function getClientBoard(state = {}) {
    return state?.board || {};
}

export function getClientCommunityCards(state = {}) {
    const cards = getClientBoard(state).aCommunityCard;
    return Array.isArray(cards) ? cards : [];
}

export function getClientTableChips(state = {}) {
    return Math.max(0, Number(getClientBoard(state).nTableChips) || 0);
}

export function getClientParticipantsById(state = {}) {
    return state?.participantsById || {};
}

export function getClientParticipant(state = {}, iUserId = '') {
    if (iUserId === undefined || iUserId === null || iUserId === '') return null;
    return getClientParticipantsById(state)[String(iUserId)] || null;
}

export function getClientParticipantChips(state = {}, iUserId = '') {
    const participant = getClientParticipant(state, iUserId);
    return Math.max(0, Number(participant?.nChips) || 0);
}

export function getClientParticipantScore(state = {}, iUserId = '') {
    const participant = getClientParticipant(state, iUserId);
    const score = Number(participant?.nCardScore);
    return Number.isFinite(score) ? score : 0;
}

export function getClientTurn(state = {}) {
    return state?.turn || {};
}

export function getClientTurnContext(state = {}) {
    return getClientTurn(state).context || {};
}

export function getClientTurnActionState(state = {}) {
    return getClientTurn(state).actionState || {};
}
