import axios from '../../axios'

export async function getFinanceList(params) {
  return await axios.get(`/transaction/list?size=${params.size}&eStatus=${params.eStatus}&pageNumber=${params.pageNumber}&search=${params.search}&sort=${params.sort}&orderBy=${params.orderBy}`)
}

export async function getFinanceById(id) {
  return await axios.get('/transaction/view/' + id)
}

export async function getWithdrawList(params) {
  return await axios.get(`/transaction/withdraw/list?size=${params.size}&eStatus=${params.eStatus}&pageNumber=${params.pageNumber}&search=${params.search}&sort=${params.sort}&orderBy=${params.orderBy}`)
}

export async function updateWithdrawById(data) {
  const { id, eStatus, sTransactionId } = data

  delete data?.id
  return await axios.put(`/transaction/update/withdraw/${id}`, eStatus === 'Failed' ? { eStatus } : { eStatus, sTransactionId })
}