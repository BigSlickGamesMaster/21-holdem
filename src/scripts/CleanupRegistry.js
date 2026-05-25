export default class CleanupRegistry {
    constructor() {
        this.cleanups = [];
        this.isCleaned = false;
    }

    add(cleanup) {
        if (typeof cleanup !== 'function') return () => {};

        if (this.isCleaned) {
            cleanup();
            return () => {};
        }

        let isActive = true;
        const wrappedCleanup = () => {
            if (!isActive) return;
            isActive = false;
            cleanup();
        };

        this.cleanups.push(wrappedCleanup);
        return wrappedCleanup;
    }

    addWindowListener(target, eventName, handler, options) {
        if (!target?.addEventListener || !target?.removeEventListener || !eventName || typeof handler !== 'function') {
            return () => {};
        }

        target.addEventListener(eventName, handler, options);
        return this.add(() => target.removeEventListener(eventName, handler, options));
    }

    addPhaserListener(target, eventName, handler, context) {
        if (!target?.on || !target?.off || !eventName || typeof handler !== 'function') {
            return () => {};
        }

        target.on(eventName, handler, context);
        return this.add(() => target.off(eventName, handler, context));
    }

    addInterval(intervalId) {
        if (!intervalId) return () => {};
        return this.add(() => clearInterval(intervalId));
    }

    addTimeout(timeoutId) {
        if (!timeoutId) return () => {};
        return this.add(() => clearTimeout(timeoutId));
    }

    cleanup() {
        if (this.isCleaned) return;
        this.isCleaned = true;

        while (this.cleanups.length) {
            const cleanup = this.cleanups.pop();
            try {
                cleanup();
            } catch (_error) {
                // Cleanup must keep running even if one teardown callback fails.
            }
        }
    }
}
