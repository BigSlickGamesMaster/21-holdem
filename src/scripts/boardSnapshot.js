import { normalizeParticipants } from './participantState';

export function normalizeBoardSnapshot(payload = {}, previousSnapshot = {}) {
    const source = payload && typeof payload === 'object' ? payload : {};
    const previous = previousSnapshot && typeof previousSnapshot === 'object' ? previousSnapshot : {};

    return {
        iDealerId: source.iDealerId,
        iBigBlindId: source.iBigBlindId,
        iSmallBlindId: source.iSmallBlindId,
        nTableChips: Number(source.nTableChips) || 0,
        nMaxPlayer: source.nMaxPlayer,
        nMinBet: source.nMinBet,
        nTableRound: Number(source.nTableRound) || 1,
        eState: source.eState,
        oSetting: source.oSetting || previous.oSetting,
        oGameInfo: source.oGameInfo || previous.oGameInfo,
        oTutorial: source.oTutorial || previous.oTutorial || null,
        aCommunityCard: Array.isArray(source.aCommunityCard) ? source.aCommunityCard : [],
        aParticipant: normalizeParticipants(source.aParticipant),
    };
}

export function shouldCancelResultForBoardState(eState) {
    return eState === 'playing';
}

export function shouldHideSideBetWindowForBoardState(eState) {
    return eState === 'playing';
}
