import axios from '../axios'

export async function getTransactions(params) {
    return await axios.get(`/api/v1/transaction?pageNumber=${params.pageNumber}&search=${params.search}&size=${params.limit}&order=${params.orderBy}&sort=${params.sort}${params.eMode && '&eMode=' + params.eMode}${params.eStatus && '&eStatus=' + params.eStatus}`)
}