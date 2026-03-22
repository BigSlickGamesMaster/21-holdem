import axios from '../../axios'

export async function getProtoList(params) {
  return await axios.get(
    `/table-prototype/list?size=${params.size}&eStatus=${params.eStatus}&pageNumber=${params.pageNumber}&search=${params.search}&sort=${params.sort}&orderBy=${params.orderBy}`
  )
}

export async function addProto(data) {
  return await axios.post('/table-prototype/create', data)
}

export async function getProtoById(id) {
  return await axios.get('/table-prototype/view/' + id)
}

export async function updateProtoById(data) {
  const id = data?.id
  delete data?.id
  return await axios.post('/table-prototype/update/' + id, data)
}

export async function deleteProto(id) {
  return await axios.delete('/table-prototype/delete/' + id)
}

export async function changeProtoStatus(data) {
  const id = data?.id
  delete data?.id
  return await axios.post('/table-prototype/update/' + id, { eStatus: data?.eStatus })
}
