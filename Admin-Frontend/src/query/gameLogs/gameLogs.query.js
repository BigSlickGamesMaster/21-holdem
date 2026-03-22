import axios from '../../axios'

export const getGameLogs = params => {
  return axios.get(
    `game-logs/list?size=${params.size}&eBoardType=${params.eBoardType}&pageNumber=${params.pageNumber}&search=${params.search}&sort=${params.sort}&orderBy=${params.orderBy}`
  )
}

export const getGameLogById = id => {
  return axios.get(`game-logs/view/${id}`)
}
