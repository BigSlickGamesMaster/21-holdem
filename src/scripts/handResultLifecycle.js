export const HAND_RESULT_REVEAL_DELAY_MS = 500;
export const HAND_RESULT_CLEAR_DELAY_MS = 6000;

export function createHandResultToken(now = Date.now) {
    return Number(now()) || Date.now();
}

export function isActiveHandResultToken(currentToken, expectedToken, bShowingHandResult) {
    return currentToken === expectedToken && bShowingHandResult === true;
}

export function getHandResultSideBetSeconds(nRoundStartsIn, clearDelayMs = HAND_RESULT_CLEAR_DELAY_MS) {
    const remainingMs = Math.max(0, Number(nRoundStartsIn) || 0);
    const delayMs = Math.max(0, Number(clearDelayMs) || 0);
    return Math.floor(Math.max(0, remainingMs - delayMs) / 1000);
}

export function shouldShowNextRoundCountdown(nRoundStartsIn) {
    return Number(nRoundStartsIn) !== 4000;
}
