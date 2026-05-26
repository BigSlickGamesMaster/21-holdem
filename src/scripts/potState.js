import { SOCKET_RESPONSE_EVENTS } from './socketEvents';

export function getPotIncrease(nextTableChips = 0, currentPotAmount = 0) {
    return Math.max(0, Number(nextTableChips || 0) - Number(currentPotAmount || 0));
}

export function getBetPotEffectName({ sEventName, nChips, potIncrease = 0 } = {}) {
    if (potIncrease <= 0) return null;

    const isAllInAction = (
        sEventName === SOCKET_RESPONSE_EVENTS.RAISE ||
        sEventName === SOCKET_RESPONSE_EVENTS.CALL
    ) && Number(nChips) === 0;

    if (isAllInAction) return 'allIn';
    if (sEventName === SOCKET_RESPONSE_EVENTS.RAISE) return 'bigBet';
    if (sEventName === SOCKET_RESPONSE_EVENTS.CALL) return 'smallBet';
    return null;
}

export function shouldCommitPotWithoutAnimation({ sEventName, potIncrease = 0 } = {}) {
    return potIncrease <= 0 && sEventName !== SOCKET_RESPONSE_EVENTS.CHECK;
}
