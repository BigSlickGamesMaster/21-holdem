/* global describe, test, expect */
import { getBetPotEffectName, getPotIncrease, shouldCommitPotWithoutAnimation } from './potState';
import { SOCKET_RESPONSE_EVENTS } from './socketEvents';

describe('potState', () => {
    test('calculates positive pot increase only', () => {
        expect(getPotIncrease(1500, 1000)).toBe(500);
        expect(getPotIncrease(1000, 1500)).toBe(0);
        expect(getPotIncrease(undefined, 1500)).toBe(0);
    });

    test('selects pot effect for all-in, raise, and call', () => {
        expect(getBetPotEffectName({
            sEventName: SOCKET_RESPONSE_EVENTS.RAISE,
            nChips: 0,
            potIncrease: 500,
        })).toBe('allIn');
        expect(getBetPotEffectName({
            sEventName: SOCKET_RESPONSE_EVENTS.RAISE,
            nChips: 1000,
            potIncrease: 500,
        })).toBe('bigBet');
        expect(getBetPotEffectName({
            sEventName: SOCKET_RESPONSE_EVENTS.CALL,
            nChips: 1000,
            potIncrease: 500,
        })).toBe('smallBet');
    });

    test('does not select effect without pot increase or for unsupported events', () => {
        expect(getBetPotEffectName({
            sEventName: SOCKET_RESPONSE_EVENTS.CALL,
            nChips: 1000,
            potIncrease: 0,
        })).toBeNull();
        expect(getBetPotEffectName({
            sEventName: SOCKET_RESPONSE_EVENTS.STAND,
            nChips: 1000,
            potIncrease: 500,
        })).toBeNull();
    });

    test('commits pot without animation for non-check zero-increase events', () => {
        expect(shouldCommitPotWithoutAnimation({
            sEventName: SOCKET_RESPONSE_EVENTS.CALL,
            potIncrease: 0,
        })).toBe(true);
        expect(shouldCommitPotWithoutAnimation({
            sEventName: SOCKET_RESPONSE_EVENTS.CHECK,
            potIncrease: 0,
        })).toBe(false);
        expect(shouldCommitPotWithoutAnimation({
            sEventName: SOCKET_RESPONSE_EVENTS.RAISE,
            potIncrease: 100,
        })).toBe(false);
    });
});
