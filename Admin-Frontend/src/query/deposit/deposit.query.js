import axios from '../../axios'

export async function getDepositList(params) {
  return await axios.get(`/transaction/deposit/list?size=${params.size}&eStatus=${params.eStatus}&pageNumber=${params.pageNumber}&search=${params.search}&sort=${params.sort}&orderBy=${params.orderBy}`)
}

export async function updateDepositById(data) {
    const { id, eStatus, nAmount } = data

    delete data?.id
    return await axios.put(`/transaction/update/deposit/${id}`, eStatus === 'Failed' ? { eStatus } : { eStatus, nAmount })
  }