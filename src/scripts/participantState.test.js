/* global describe, test, expect */
import {
    attachParticipantProfile,
    buildParticipantUpdatePlan,
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

    test('builds participant create/update plan with stable profiles', () => {
        const existingProfile = { id: 'existing-profile' };
        const existingPlayer = { iUserId: 'u1', playerProfile: existingProfile };
        const players = new Map([
            ['u1', existingPlayer],
        ]);
        const profiles = ['seat0', 'seat1'];

        expect(buildParticipantUpdatePlan([
            { iUserId: 'u1', nSeat: 0, nChips: 100 },
            { iUserId: 'u2', nSeat: 1, nChips: 200 },
        ], players, profiles)).toEqual([
            {
                iUserId: 'u1',
                type: 'update',
                participant: { iUserId: 'u1', nSeat: 0, nChips: 100, playerProfile: existingProfile },
                existingPlayer,
            },
            {
                iUserId: 'u2',
                type: 'create',
                participant: { iUserId: 'u2', nSeat: 1, nChips: 200, playerProfile: 'seat1' },
                existingPlayer: null,
            },
        ]);
    });
});
