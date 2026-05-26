/* global describe, test, expect, jest */
import CleanupRegistry from './CleanupRegistry';

describe('CleanupRegistry', () => {
    test('runs registered cleanups once in reverse order', () => {
        const registry = new CleanupRegistry();
        const calls = [];

        registry.add(() => calls.push('first'));
        registry.add(() => calls.push('second'));

        registry.cleanup();
        registry.cleanup();

        expect(calls).toEqual(['second', 'first']);
    });

    test('returned cleanup can unregister one callback early', () => {
        const registry = new CleanupRegistry();
        const cleanup = jest.fn();
        const runCleanup = registry.add(cleanup);

        runCleanup();
        registry.cleanup();

        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    test('continues cleanup when one callback throws', () => {
        const registry = new CleanupRegistry();
        const cleanup = jest.fn();

        registry.add(() => {
            throw new Error('fail');
        });
        registry.add(cleanup);

        registry.cleanup();

        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    test('runs added cleanup immediately after registry is already cleaned', () => {
        const registry = new CleanupRegistry();
        const cleanup = jest.fn();

        registry.cleanup();
        registry.add(cleanup);

        expect(cleanup).toHaveBeenCalledTimes(1);
    });
});
