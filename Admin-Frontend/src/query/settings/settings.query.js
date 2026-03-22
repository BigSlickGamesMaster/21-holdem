import axios from '../../axios'

export async function getSetting() {
  return await axios.get('/setting')
}

export async function updateSetting(data) {
  return await axios.post(`/setting/edit`, data)
}
