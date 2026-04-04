import { guestLogin } from 'query/guest.query';

const GUEST_DEVICE_STORAGE_KEY = 'guest-device-id';

export function getGuestDeviceId() {
    const existingId = window.localStorage.getItem(GUEST_DEVICE_STORAGE_KEY);
    if (existingId) return existingId;

    const nextId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(GUEST_DEVICE_STORAGE_KEY, nextId);
    return nextId;
}

export function resetGuestDeviceId() {
    window.localStorage.removeItem(GUEST_DEVICE_STORAGE_KEY);
    return getGuestDeviceId();
}

export async function loginGuestWithDeviceId(sDeviceId) {
    const loginResponse = await guestLogin({ sDeviceId });
    const sAuthToken = loginResponse?.headers?.authorization || loginResponse?.data?.data?.sToken;

    if (!sAuthToken) throw new Error('Guest token was not returned');

    return sAuthToken;
}
