export function getRenderedHandIds(player) {
    return (player?.playerProfile?.container_cards?.list || [])
        .map((card) => String(card?._id || ''))
        .filter(Boolean);
}

export function getIncomingHandIds(aCardHand = []) {
    return (Array.isArray(aCardHand) ? aCardHand : [])
        .map((card) => String(card?._id || ''))
        .filter(Boolean);
}

export function playerHasRenderedCard(player, sCardId) {
    const cardId = String(sCardId ?? '');
    if (!cardId) return false;
    return getRenderedHandIds(player).some((id) => id === cardId);
}

export function shouldShowPlayerScore(aCardHand = [], nCardScore = 0, playerProfile = null) {
    const nParsedScore = Number(nCardScore);
    if (!Number.isFinite(nParsedScore) || nParsedScore <= 0) return false;

    if (getIncomingHandIds(aCardHand).length > 0) return true;

    return (Number(playerProfile?.container_cards?.list?.length) || 0) > 0;
}

export function shouldRevealPlayerScore({
    player = null,
    aCardHand = [],
    nCardScore = 0,
    localUserId = '',
    forceReveal = false,
} = {}) {
    if (!player?.playerProfile) return false;
    if (!shouldShowPlayerScore(aCardHand, nCardScore, player.playerProfile)) return false;
    if (forceReveal) return true;

    return String(player.iUserId) === String(localUserId);
}

export function playerHandNeedsReset(player, aCardHand = []) {
    const renderedIds = getRenderedHandIds(player);
    const incomingIds = getIncomingHandIds(aCardHand);

    if (!renderedIds.length) return false;
    if (!incomingIds.length) return true;
    if (renderedIds.length > incomingIds.length) return true;

    const incomingIdSet = new Set(incomingIds);
    return renderedIds.some((id) => !incomingIdSet.has(id));
}
