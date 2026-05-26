/* global describe, test, expect */
import {
    createHandResultToken,
    getHandResultSideBetSeconds,
    HAND_RESULT_CLEAR_DELAY_MS,
    HAND_RESULT_REVEAL_DELAY_MS,
    isActiveHandResultToken,
    shouldShowNextRoundCountdown,
} from './handResultLifecycle';

describe('handResultLifecycle', () => {
    test('exports current result timing constants', () => {
        expect(HAND_RESULT_REVEAL_DELAY_MS).toBe(500);
        expect(HAND_RESULT_CLEAR_DELAY_MS).toBe(6000);
    });

    test('creates deterministic token when clock is injected', () => {
        expect(createHandResultToken(() => 12345)).toBe(12345);
    });

    test('validates only current visible hand result token', () => {
        expect(isActiveHandResultToken(10, 10, true)).toBe(true);
        expect(isActiveHandResultToken(11, 10, true)).toBe(false);
        expect(isActiveHandResultToken(10, 10, false)).toBe(false);
    });

    test('calculates side bet reopen seconds after result clear delay', () => {
        expect(getHandResultSideBetSeconds(10000)).toBe(4);
        expect(getHandResultSideBetSeconds(6000)).toBe(0);
        expect(getHandResultSideBetSeconds(5000)).toBe(0);
        expect(getHandResultSideBetSeconds(undefined)).toBe(0);
    });

    test('preserves existing next-round countdown exception', () => {
        expect(shouldShowNextRoundCountdown(4000)).toBe(false);
        expect(shouldShowNextRoundCountdown(10000)).toBe(true);
    });
});
