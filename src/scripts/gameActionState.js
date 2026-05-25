const createHiddenAction = () => ({
    visible: false,
    enabled: true,
    label: '',
    amount: 0,
    bAllInMode: false,
    bCallStandMode: false,
    alpha: 1,
});

const createInitialActionState = () => ({
    fold: createHiddenAction(),
    call: createHiddenAction(),
    raise: createHiddenAction(),
    stand: createHiddenAction(),
    allInCommon: createHiddenAction(),
    check: createHiddenAction(),
    doubleDown: createHiddenAction(),
    raisedAfterCheck: false,
});

const getSafeNumber = (value, fallback = 0) => {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

export function getTurnCallAmount(toCallAmount, nMinBet) {
    return getSafeNumber(toCallAmount, getSafeNumber(nMinBet, 0));
}

export function buildGameActionState({
    aUserAction = [],
    nMinBet = 0,
    toCallAmount = 0,
    myChips = 0,
    maxRaiseAmount = 0,
    minRaise = 0,
    potAmount = 0,
    canStand = false,
    canDoubleDown = false,
    hasRaiseSinceCheck = false,
    bAllInStandChoice = false,
    formatAmount = (amount) => String(amount),
} = {}) {
    const state = createInitialActionState();
    const actions = Array.isArray(aUserAction) ? aUserAction : [];
    const callAmount = getTurnCallAmount(toCallAmount, nMinBet);
    const safeMyChips = Math.max(0, Math.round(getSafeNumber(myChips, 0)));
    const safeMaxRaiseAmount = Math.max(0, Math.round(getSafeNumber(maxRaiseAmount, 0)));
    const safeMinBet = getSafeNumber(nMinBet, 0);
    const safeMinRaise = Math.max(0, Math.round(getSafeNumber(minRaise, 0)));
    const safePotAmount = Math.max(0, Math.round(getSafeNumber(potAmount, 0)));
    const canAffordRaise = safeMaxRaiseAmount >= safeMinBet;
    const potRaiseTarget = Math.max(safeMinRaise, safePotAmount);
    const canAllInRaise = safeMyChips > 0 && safeMaxRaiseAmount > 0 && safeMaxRaiseAmount < potRaiseTarget;
    const raisedAfterCheck = Boolean(hasRaiseSinceCheck) && callAmount > 0 && !bAllInStandChoice;

    state.raisedAfterCheck = raisedAfterCheck;

    actions.forEach((action) => {
        switch (action) {
            case 'f':
                state.fold.visible = true;
                break;
            case 'c':
                state.call.visible = true;
                state.call.bAllInMode = false;
                state.call.label = bAllInStandChoice || raisedAfterCheck
                    ? 'Confirm'
                    : (callAmount > 0 ? `Call ${formatAmount(callAmount)}` : 'Call');
                break;
            case 'r':
                state.raise.visible = !raisedAfterCheck && (canAffordRaise || canAllInRaise);
                break;
            case 's':
                if (canStand && !raisedAfterCheck) {
                    state.stand.visible = true;
                    state.stand.bCallStandMode = actions.includes('c') && callAmount > 0;
                    state.stand.label = state.stand.bCallStandMode ? 'Call/Stand' : 'Stand';
                }
                break;
            case 'a':
                state.allInCommon.visible = true;
                state.allInCommon.amount = safeMyChips;
                break;
            case 'ck':
                state.check.visible = true;
                break;
            case 'd':
                state.doubleDown.visible = Boolean(canDoubleDown);
                state.doubleDown.enabled = Boolean(canDoubleDown);
                state.doubleDown.alpha = canDoubleDown ? 1 : 0.45;
                break;
            default:
                break;
        }
    });

    if (canStand && actions.includes('c') && callAmount > 0 && !actions.includes('s') && !raisedAfterCheck) {
        state.stand.visible = true;
        state.stand.bCallStandMode = true;
        state.stand.label = 'Stand';
    }

    return state;
}
