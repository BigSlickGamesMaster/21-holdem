import axios from "../axios";

export async function register(data) {
    console.log('data', data)
    return await axios.post('/api/v1/auth/register', data)
}

export async function forgotPassword(data) {
    return await axios.post('/api/v1/auth/forgot-password', data)
}

export async function resetPassword(data) {
    return await axios.post(`/api/v1/auth/reset-password/${data.sToken}`, data)
}

export async function verifyToken(token) {
    return await axios.post(`/api/v1/auth/verify-forgotpassword-maillink/${token}`)
}

export async function login(data) {
    return await axios.post('/api/v1/auth/login', data)
}

export async function exchangeHandoff(data) {
    return await axios.post('/api/v1/auth/handoff/exchange', data)
}
