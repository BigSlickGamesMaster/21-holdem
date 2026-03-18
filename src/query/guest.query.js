import axios from '../axios';

export async function guestLogin(payload) {
    return await axios.post('/api/v1/auth/guestLogin', payload);
}

export async function joinGuestTable({ sAuthToken, iProtoId }) {
    return await axios.post('/api/v1/poker/guest/board/join', { iProtoId }, {
        headers: {
            Authorization: sAuthToken,
        },
    });
}

export async function joinGuestTutorialTable({ sAuthToken, iProtoId }) {
    return await axios.post('/api/v1/poker/guest/tutorial/board/join', { iProtoId }, {
        headers: {
            Authorization: sAuthToken,
        },
    });
}
