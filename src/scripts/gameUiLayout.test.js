/* global afterEach, describe, expect, jest, test */
import {
    clearSavedGameUiLayout,
    DEFAULT_GAME_UI_LAYOUT,
    dispatchGameUiLayoutUpdate,
    GAME_UI_LAYOUT_EVENT,
    GAME_UI_LAYOUT_STORAGE_KEY,
    readSavedGameUiLayout,
    sanitizeGameUiLayout,
    saveGameUiLayout,
} from './gameUiLayout';

describe('gameUiLayout', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        window.localStorage.clear();
    });

    test('sanitizes missing, invalid, and out-of-range layout values', () => {
        expect(sanitizeGameUiLayout(null)).toEqual(DEFAULT_GAME_UI_LAYOUT);
        expect(sanitizeGameUiLayout({
            uiScale: 99,
            tableOffsetY: -999,
            footerOffsetY: '25',
        })).toMatchObject({
            uiScale: 1.8,
            tableOffsetY: -500,
            footerOffsetY: 25,
        });
    });

    test('reads and writes sanitized layout from local storage', () => {
        const saved = saveGameUiLayout({
            uiScale: 1.25,
            tableOffsetY: -160,
            playerProfilesScale: 2,
        });

        expect(saved).toMatchObject({
            uiScale: 1.25,
            tableOffsetY: -160,
            playerProfilesScale: 1.4,
        });
        expect(readSavedGameUiLayout()).toEqual(saved);
    });

    test('falls back safely when storage fails', () => {
        jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('storage unavailable');
        });
        expect(readSavedGameUiLayout()).toEqual(DEFAULT_GAME_UI_LAYOUT);

        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('storage unavailable');
        });
        expect(saveGameUiLayout({ uiScale: 1.2 })).toMatchObject({ uiScale: 1.2 });

        jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
            throw new Error('storage unavailable');
        });
        expect(clearSavedGameUiLayout()).toEqual(DEFAULT_GAME_UI_LAYOUT);
    });

    test('dispatches sanitized layout updates', () => {
        const listener = jest.fn();
        window.addEventListener(GAME_UI_LAYOUT_EVENT, listener);

        const layout = dispatchGameUiLayoutUpdate({ uiScale: 99 });

        expect(layout.uiScale).toBe(1.8);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener.mock.calls[0][0].detail.uiScale).toBe(1.8);

        window.removeEventListener(GAME_UI_LAYOUT_EVENT, listener);
        expect(window.localStorage.getItem(GAME_UI_LAYOUT_STORAGE_KEY)).toBeNull();
    });
});
