import axios from '../../axios'

export async function getWithdrawalData() {
  return await axios.get('/dashboard/userswithdrawal')
}

export async function getDepositData() {
  return await axios.get('/dashboard/depositoverall')
}
