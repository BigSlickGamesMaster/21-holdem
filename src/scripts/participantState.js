export function normalizeParticipants(aParticipant = []) {
    return Array.isArray(aParticipant) ? aParticipant.filter(Boolean) : [];
}

export function findParticipantForClient(aParticipant = [], { sRootSocket = '', iUserId = '' } = {}) {
    const participants = normalizeParticipants(aParticipant);

    if (sRootSocket) {
        const socketMatch = participants.find((participant) => participant?.sRootSocket === sRootSocket);
        if (socketMatch) return socketMatch;
    }

    if (iUserId) {
        return participants.find((participant) => String(participant?.iUserId) === String(iUserId));
    }

    return undefined;
}

export function findPlayerInMap(players, iUserId) {
    if (!players?.has || !players?.entries || iUserId === undefined || iUserId === null) return null;
    if (players.has(iUserId)) return players.get(iUserId);

    const sTargetUserId = String(iUserId);
    for (const [sPlayerId, player] of players.entries()) {
        if (String(sPlayerId) === sTargetUserId) return player;
        if (String(player?.iUserId) === sTargetUserId) return player;
    }

    return null;
}

export function attachParticipantProfile(participant, aPlayerProfiles = []) {
    if (!participant) return participant;
    return {
        ...participant,
        playerProfile: participant.playerProfile || aPlayerProfiles[participant.nSeat],
    };
}

export function buildParticipantUpdatePlan(aParticipant = [], players, aPlayerProfiles = []) {
    return normalizeParticipants(aParticipant).map((participant) => {
        const existingPlayer = players?.get?.(participant.iUserId) || null;
        const participantWithProfile = attachParticipantProfile({
            ...participant,
            playerProfile: existingPlayer?.playerProfile,
        }, aPlayerProfiles);

        return {
            iUserId: participant.iUserId,
            type: existingPlayer ? 'update' : 'create',
            participant: participantWithProfile,
            existingPlayer,
        };
    });
}
