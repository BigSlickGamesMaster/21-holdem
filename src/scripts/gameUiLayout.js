export const GAME_UI_LAYOUT_STORAGE_KEY = 'bsg:game-ui-layout';
export const GAME_UI_LAYOUT_EVENT = 'bsg:game-layout-update';

export const DEFAULT_GAME_UI_LAYOUT = Object.freeze({
    uiScale: 1.5,
    tableOffsetY: -200,
    tableScale: 1,
    headerOffsetY: 0,
    potOffsetY: 0,
    footerOffsetY: 0,
    playerProfilesOffsetY: 0,
    playerProfilesScale: 1,
});

const GAME_UI_LAYOUT_LIMITS = {
    uiScale: { min: 1, max: 1.8 },
    tableOffsetY: { min: -500, max: 240 },
    tableScale: { min: 0.7, max: 1.35 },
    headerOffsetY: { min: -220, max: 220 },
    potOffsetY: { min: -220, max: 220 },
    footerOffsetY: { min: -240, max: 260 },
    playerProfilesOffsetY: { min: -260, max: 260 },
    playerProfilesScale: { min: 0.75, max: 1.4 },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const sanitizeGameUiLayout = (input = {}) => {
    const source = input && typeof input === 'object' ? input : {};

    return Object.keys(DEFAULT_GAME_UI_LAYOUT).reduce((layout, key) => {
        const fallback = DEFAULT_GAME_UI_LAYOUT[key];
        const rawValue = Number(source[key]);
        const nextValue = Number.isFinite(rawValue) ? rawValue : fallback;
        const limits = GAME_UI_LAYOUT_LIMITS[key];

        layout[key] = limits ? clamp(nextValue, limits.min, limits.max) : nextValue;
        return layout;
    }, {});
};

export const readSavedGameUiLayout = () => {
    if (typeof window === 'undefined') return { ...DEFAULT_GAME_UI_LAYOUT };

    try {
        const savedLayout = window.localStorage.getItem(GAME_UI_LAYOUT_STORAGE_KEY);
        if (!savedLayout) return { ...DEFAULT_GAME_UI_LAYOUT };
        return sanitizeGameUiLayout(JSON.parse(savedLayout));
    } catch (_error) {
        return { ...DEFAULT_GAME_UI_LAYOUT };
    }
};

export const saveGameUiLayout = (layout = DEFAULT_GAME_UI_LAYOUT) => {
    const sanitizedLayout = sanitizeGameUiLayout(layout);

    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(GAME_UI_LAYOUT_STORAGE_KEY, JSON.stringify(sanitizedLayout));
        } catch (_error) {
            return sanitizedLayout;
        }
    }

    return sanitizedLayout;
};

export const clearSavedGameUiLayout = () => {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.removeItem(GAME_UI_LAYOUT_STORAGE_KEY);
        } catch (_error) {
            return { ...DEFAULT_GAME_UI_LAYOUT };
        }
    }

    return { ...DEFAULT_GAME_UI_LAYOUT };
};

export const dispatchGameUiLayoutUpdate = (layout = DEFAULT_GAME_UI_LAYOUT) => {
    const sanitizedLayout = sanitizeGameUiLayout(layout);

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent(GAME_UI_LAYOUT_EVENT, { detail: sanitizedLayout }));
    }

    return sanitizedLayout;
};
