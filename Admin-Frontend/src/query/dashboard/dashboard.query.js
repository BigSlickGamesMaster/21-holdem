import axios from '../../axios'

export async function getDashboardData() {
  return await axios.post('/dashboard/getdata')
}

export async function getDashboardRevenue() {
  return await axios.post('/dashboard/revenue')
}

export async function getAnalyticsData() {
  return await axios.get('/dashboard/analytics')
}
