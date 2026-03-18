
import axios from "../axios";

export async function getTables() {
    return await axios.get('/api/v1/poker/board/list')
}

export async function joinTable(iTableId) {
    return await axios.post('/api/v1/poker/board/join', { iProtoId: iTableId })
}

export async function createPrivateTable(iTableId) {
    return await axios.post('/api/v1/poker/private/create', { iProtoId: iTableId })
}

export async function joinPrivateTable(sPrivateCode) {
    return await axios.post('/api/v1/poker/private/join', sPrivateCode)
}

export async function joinLeaveTable() {
    return await axios.get('/api/v1/poker/board/leave')
}

