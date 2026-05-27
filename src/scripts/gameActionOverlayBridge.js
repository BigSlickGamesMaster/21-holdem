export const GAME_ACTION_OVERLAY_STATE_EVENT = 'bsg:game-action-overlay-state';
export const GAME_ACTION_OVERLAY_COMMAND_EVENT = 'bsg:game-action-overlay-command';

export const createHiddenGameActionOverlayState = () => ({
    visible: false,
    mode: 'hidden',
    rows: [],
    tableBankroll: null,
    smallBlind: null,
    bigBlind: null,
});

export const emitGameActionOverlayState = (detail = {}) => {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent(GAME_ACTION_OVERLAY_STATE_EVENT, {
        detail: {
            ...createHiddenGameActionOverlayState(),
            ...(detail || {}),
        },
    }));
};

export const hideGameActionOverlay = () => {
    emitGameActionOverlayState(createHiddenGameActionOverlayState());
};

export const emitGameActionOverlayCommand = (command, payload = {}) => {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent(GAME_ACTION_OVERLAY_COMMAND_EVENT, {
        detail: {
            command,
            ...(payload || {}),
        },
    }));
};
