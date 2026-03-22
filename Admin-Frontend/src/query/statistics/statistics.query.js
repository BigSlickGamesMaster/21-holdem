import axios from '../../axios'

// export async function getStatisticsData() {
//   return await axios.post('/dashboard/getData')
// }

// export async function getGameTransactions() {
//   return await axios.post('/dashboard/getTableTransaction')
// }

// export async function getProfit() {
//   return await axios.post('/dashboard/profit')
// }

export async function getTotalUserAndAdminWinning() {
  return await axios.get('/dashboard/')
}
