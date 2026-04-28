import axios from '../../axios'

export async function getChangeRequestMeta() {
  return await axios.get('/change-requests/meta')
}

export async function getChangeRequests() {
  return await axios.get('/change-requests/list')
}

export async function createChangeRequest(data) {
  return await axios.post('/change-requests/create', data)
}

export async function updateChangeRequestStatus(data) {
  return await axios.put('/change-requests/status/' + data.id, { status: data.status })
}

export async function deleteChangeRequestById(id) {
  return await axios.post('/change-requests/delete/' + id)
}
