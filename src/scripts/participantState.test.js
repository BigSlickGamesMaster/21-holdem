/* global describe, test, expect */
import {
    attachParticipantProfile,
    findParticipantForClient,
    findPlayerInMap,
    normalizeParticipants,
} from './participantState';

describe('participantState', () => {
    test('normalizes participant arrays', () => {
        expect(normalizeParticipants([{ iUserId: 'u1' }, null, undefined])).toEqual([{ iUserId: 'u1' }]);
        expect(normalizeParticipants(null)).toEqual([]);
    });

    test('finds current participant by socket first', () => {
        const participants = [
            { iUserId: 'old', sRootSocket: 'socket-old' },
            { iUserId: 'new', sRootSocket: 'socket-new' },
        ];

        expect(findParticipantForClient(participants, {
            sRootSocket: 'socket-new',
            iUserId: 'old',
        })).toEqual({ iUserId: 'new', sRootSocket: 'socket-new' });
    });

    test('falls back to existing user id for reconnect state', () => {
        const participants = [
            { iUserId: 123, sRootSocket: 'other' },
        ];

        expect(findParticipantForClient(participants, {
            sRootSocket: 'missing',
            iUserId: '123',
        })).toEqual({ iUserId: 123, sRootSocket: 'other' });
    });

    test('finds player in map by key or player id value', () => {
        const direct = { iUserId: 'direct' };
        const nested = { iUserId: 'nested' };
        const players = new Map([
            ['direct', direct],
            ['map-key', nested],
        ]);

        expect(findPlayerInMap(players, 'direct')).toBe(direct);
        expect(findPlayerInMap(players, 'nested')).toBe(nested);
        expect(findPlayerInMap(players, 'missing')).toBeNull();
    });

    test('attaches seat profile without overwriting existing profile', () => {
        const profiles = ['seat0', 'seat1'];
        const existingProfile = { id: 'existing' };

        expect(attachParticipantProfile({ iUserId: 'u1', nSeat: 1 }, profiles)).toMatchObject({
            iUserId: 'u1',
            playerProfile: 'seat1',
        });
        expect(attachParticipantProfile({ iUserId: 'u2', nSeat: 1, playerProfile: existingProfile }, profiles).playerProfile).toBe(existingProfile);
    });
});
