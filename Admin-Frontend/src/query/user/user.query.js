import axios from '../../axios'

export async function getUserList(params) {
  return await axios.get(
    `/user/list?size=${params.size}&eStatus=${params.eStatus}&pageNumber=${params.pageNumber}&search=${params.search}&sort=${params.sort}&orderBy=${params.orderBy}`
  )
}

export async function addUser(data) {
  return await axios.post('/user/create', data)
}

export async function getAdminById(id) {
  return await axios.get('/admin/view/' + id)
}

export async function updateAdminById(data) {
  const id = data?.id
  delete data?.id
  return await axios.put('/admin/edit/' + id, data?.payload)
}

export async function deleteUser(id) {
  return await axios.post('/user/delete/' + id)
}

export async function changeUserStatus(data) {
  const id = data?.id
  delete data?.id
  return await axios.put('/user/edit/' + id, { eStatus: data?.eStatus })
}

export async function getUserById(id) {
  return await axios.get('/user/view/' + id)
}

export async function updateUserById(data) {
  return await axios.put('/user/edit/' + data?.id, data)
}

//* ADD BANK DETAILS
export async function addUserBankDetails(data) {
  return await axios.put('/user/edit/' + data?.id, data)
}
